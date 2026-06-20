import { TRAFFIC_BALANCE, TRANSPORT_BALANCE } from "../../data/balance";
import { getBuildingById } from "../../data/buildings";
import type {
  BuildingInstance,
  CityState,
  Road,
  TrafficAgent,
  TrafficAgentType,
  TrafficSegment,
  TrafficState,
} from "../../shared/types";
import { isTransitCovered } from "./public-transport";

export function recomputeTraffic(state: CityState): void {
  const previousTraffic = state.traffic;
  const segments = state.roads.map(createSegment);
  const segmentByRoad = new Map(segments.map((segment) => [segment.roadId, segment]));
  const totalTrips = state.buildings.reduce(
    (total, building) => total + assignBuildingTrips(building, state, segmentByRoad),
    0,
  );
  state.traffic = {
    ...createTrafficState(segments, totalTrips),
    agents: previousTraffic.agents ?? [],
    queuedAgents: previousTraffic.queuedAgents ?? [],
    intersections: previousTraffic.intersections ?? [],
    trafficLights: previousTraffic.trafficLights ?? [],
    roadNetworkDirty: previousTraffic.roadNetworkDirty ?? true,
    nextAgentId: previousTraffic.nextAgentId ?? 1,
    lastAgentTick: previousTraffic.lastAgentTick ?? -1,
  };
  updateAgentTraffic(state);
}

export function getRoadCapacity(road: Road): number {
  return getRoadTierValue(road.type, "capacity");
}

export function getRoadSpeed(road: Road): number {
  return getRoadTierValue(road.type, "speed");
}

function getRoadTierValue(roadType: Road["type"], value: "capacity" | "speed"): number {
  if (value === "capacity" && roadType === "dirt")
    return TRAFFIC_BALANCE.DIRT_ROAD_CAPACITY;
  if (value === "capacity" && roadType === "paved")
    return TRAFFIC_BALANCE.PAVED_ROAD_CAPACITY;
  const tier =
    roadType === "dirt" ? "local" : roadType === "paved" ? "collector" : roadType;
  const values = {
    local: {
      capacity: TRAFFIC_BALANCE.LOCAL_ROAD_CAPACITY,
      speed: TRAFFIC_BALANCE.LOCAL_ROAD_SPEED,
    },
    collector: {
      capacity: TRAFFIC_BALANCE.COLLECTOR_ROAD_CAPACITY,
      speed: TRAFFIC_BALANCE.COLLECTOR_ROAD_SPEED,
    },
    arterial: {
      capacity: TRAFFIC_BALANCE.ARTERIAL_ROAD_CAPACITY,
      speed: TRAFFIC_BALANCE.ARTERIAL_ROAD_SPEED,
    },
  };
  return values[tier][value];
}

export function findRoadPath(
  state: CityState,
  startRoadId: string,
  endRoadId: string,
): string[] {
  const roads = new Map(state.roads.map((road) => [road.id, road]));
  if (!roads.has(startRoadId) || !roads.has(endRoadId)) return [];
  const frontier = [{ id: startRoadId, cost: 0, route: [startRoadId] }];
  const visited = new Map<string, number>();
  while (frontier.length > 0) {
    frontier.sort((left, right) => left.cost - right.cost);
    const current = frontier.shift();
    if (!current) break;
    if (current.id === endRoadId) return current.route;
    if (current.route.length >= TRAFFIC_BALANCE.MAX_PATH_STEPS) continue;
    if ((visited.get(current.id) ?? Infinity) <= current.cost) continue;
    visited.set(current.id, current.cost);
    getConnectedRoads(roads, current.id).forEach((road) => {
      frontier.push({
        id: road.id,
        cost: current.cost + getPathCost(state, road),
        route: [...current.route, road.id],
      });
    });
  }
  return [];
}

function getConnectedRoads(roads: Map<string, Road>, roadId: string): Road[] {
  const road = roads.get(roadId);
  if (!road) return [];
  return [...roads.values()].filter(
    (candidate) =>
      Math.abs(candidate.position[0] - road.position[0]) +
        Math.abs(candidate.position[1] - road.position[1]) ===
      1,
  );
}

function getPathCost(state: CityState, road: Road): number {
  const congestion =
    state.traffic.segments.find((segment) => segment.roadId === road.id)?.congestion ?? 0;
  return (1 / getRoadSpeed(road)) * (1 + congestion * 2);
}

function updateAgentTraffic(state: CityState): void {
  const traffic = state.traffic;
  traffic.intersections = state.roads
    .filter(
      (road) =>
        getConnectedRoads(new Map(state.roads.map((item) => [item.id, item])), road.id)
          .length >= 2,
    )
    .map((road) => road.id);
  if (
    traffic.lastAgentTick === state.time.tick ||
    state.time.tick % TRAFFIC_BALANCE.AGENT_TICK_INTERVAL !== 0
  )
    return;
  traffic.lastAgentTick = state.time.tick;
  advanceAgents(traffic.agents);
  traffic.agents = traffic.agents.filter(
    (agent) => agent.currentEdgeIndex < agent.route.length - 1,
  );
  spawnAgents(state);
  applyAgentCongestion(state);
}

function advanceAgents(agents: TrafficAgent[]): void {
  agents.forEach((agent) => {
    agent.currentEdgeIndex += 1;
  });
}

function spawnAgents(state: CityState): void {
  const candidates = getAgentCandidates(state);
  const pool = state.traffic;
  const pending = [...pool.queuedAgents, ...candidates];
  pool.queuedAgents = [];
  while (
    pool.agents.length < TRAFFIC_BALANCE.MAX_AGENTS &&
    pending.length > 0 &&
    pool.agents.length < TRAFFIC_BALANCE.AGENT_SPAWNS_PER_TICK
  ) {
    const candidate = pending.shift();
    if (candidate) pool.agents.push(candidate);
  }
  pool.queuedAgents = pending.slice(0, TRAFFIC_BALANCE.MAX_AGENTS);
}

function getAgentCandidates(state: CityState): TrafficAgent[] {
  const active = state.buildings.filter((building) => building.status === "active");
  const homes = active.filter(
    (building) => getBuildingById(building.definitionId)?.category === "residential",
  );
  const candidates: TrafficAgent[] = [];
  const targets: [TrafficAgentType, BuildingInstance[]][] = [
    [
      "commuter",
      active.filter((building) =>
        ["commercial", "industrial", "service"].includes(
          getBuildingById(building.definitionId)?.category ?? "",
        ),
      ),
    ],
    [
      "customer",
      active.filter(
        (building) => getBuildingById(building.definitionId)?.category === "commercial",
      ),
    ],
    [
      "cargo",
      active.filter(
        (building) => getBuildingById(building.definitionId)?.category === "commercial",
      ),
    ],
  ];
  targets.forEach(([type, destinations]) => {
    const origins =
      type === "cargo"
        ? active.filter(
            (building) =>
              getBuildingById(building.definitionId)?.category === "industrial",
          )
        : homes;
    origins.forEach((origin, index) => {
      const destination = destinations[index % destinations.length];
      const agent = destination ? createAgent(state, type, origin, destination) : null;
      if (agent) candidates.push(agent);
    });
  });
  return candidates;
}

function createAgent(
  state: CityState,
  type: TrafficAgentType,
  origin: BuildingInstance,
  destination: BuildingInstance,
): TrafficAgent | null {
  const start = getNearestRoads(origin, state.roads)[0];
  const end = getNearestRoads(destination, state.roads)[0];
  const route = start && end ? findRoadPath(state, start.id, end.id) : [];
  if (route.length === 0) return null;
  return {
    id: `agent:${state.traffic.nextAgentId++}`,
    type,
    originBuildingId: origin.id,
    destinationBuildingId: destination.id,
    startTick: state.time.tick,
    route,
    currentEdgeIndex: 0,
  };
}

function applyAgentCongestion(state: CityState): void {
  if (state.traffic.agents.length === 0) return;
  state.traffic.segments.forEach((segment) => {
    const agents = state.traffic.agents.filter(
      (agent) => agent.route[agent.currentEdgeIndex] === segment.roadId,
    ).length;
    const light = state.traffic.trafficLights.some(
      (item) => item.roadId === segment.roadId,
    );
    segment.congestion = Math.min(1, agents / segment.capacity) * (light ? 0.5 : 1);
  });
  state.traffic.trafficLights.forEach((light) => {
    const congestion =
      state.traffic.segments.find((segment) => segment.roadId === light.roadId)
        ?.congestion ?? 0;
    light.phase = congestion < 0.3 ? "green" : congestion <= 0.6 ? "yellow" : "red";
  });
}

export function getBuildingTrips(building: BuildingInstance): number {
  if (building.status !== "active") return 0;
  const definition = getBuildingById(building.definitionId);
  if (!definition) return 0;
  return getDefinitionTrips(definition.category, definition.effects);
}

function getDefinitionTrips(
  category: string,
  effects: { populationCapacity?: number; jobs?: number },
): number {
  switch (category) {
    case "residential":
      return Math.ceil(
        (effects.populationCapacity ?? 0) * TRAFFIC_BALANCE.RESIDENTIAL_TRIPS_PER_POP,
      );
    case "commercial":
      return (effects.jobs ?? 0) * TRAFFIC_BALANCE.COMMERCIAL_TRIPS_PER_JOB;
    case "industrial":
      return (effects.jobs ?? 0) * TRAFFIC_BALANCE.INDUSTRIAL_TRIPS_PER_JOB;
    case "service":
      return (effects.jobs ?? 0) * TRAFFIC_BALANCE.SERVICE_TRIPS_PER_JOB;
    default:
      return 0;
  }
}

function createSegment(road: Road): TrafficSegment {
  return { roadId: road.id, capacity: getRoadCapacity(road), trips: 0, congestion: 0 };
}

function assignBuildingTrips(
  building: BuildingInstance,
  state: CityState,
  segmentByRoad: Map<string, TrafficSegment>,
): number {
  const trips = getAdjustedBuildingTrips(building, state);
  const nearestRoads = getNearestRoads(building, state.roads);
  if (trips === 0 || nearestRoads.length === 0) return 0;
  nearestRoads.forEach((road, index) => {
    const segment = segmentByRoad.get(road.id);
    if (segment) segment.trips += getTripShare(trips, nearestRoads.length, index);
  });
  return trips;
}

function getAdjustedBuildingTrips(building: BuildingInstance, state: CityState): number {
  const trips = getBuildingTrips(building);
  const category = getBuildingById(building.definitionId)?.category;
  const isTrafficSource =
    category === "residential" || category === "commercial" || category === "industrial";
  if (!isTrafficSource || !isTransitCovered(state, building.id)) return trips;
  return Math.ceil(trips * (1 - TRANSPORT_BALANCE.TRAFFIC_REDUCTION));
}

function getNearestRoads(building: BuildingInstance, roads: Road[]): Road[] {
  const distances = roads.map((road) => ({
    road,
    distance: getDistance(building, road),
  }));
  const closest = Math.min(...distances.map(({ distance }) => distance));
  if (!Number.isFinite(closest) || closest > TRAFFIC_BALANCE.MAX_ROAD_DISTANCE) return [];
  return distances
    .filter(({ distance }) => distance === closest)
    .map(({ road }) => road)
    .sort((left, right) => left.id.localeCompare(right.id));
}

function getTripShare(totalTrips: number, roadCount: number, index: number): number {
  const baseShare = Math.floor(totalTrips / roadCount);
  return baseShare + (index < totalTrips % roadCount ? 1 : 0);
}

function getDistance(building: BuildingInstance, road: Road): number {
  return Math.max(
    Math.abs(building.position[0] - road.position[0]),
    Math.abs(building.position[1] - road.position[1]),
  );
}

function createTrafficState(
  segments: TrafficSegment[],
  totalTrips: number,
): TrafficState {
  const usedSegments = segments.filter((segment) => segment.trips > 0);
  usedSegments.forEach((segment) => {
    segment.congestion = Math.min(1, segment.trips / segment.capacity);
  });
  const cityCongestion = getCityCongestion(usedSegments);
  return {
    cityCongestion,
    totalTrips,
    happinessPenalty: getHappinessPenalty(cityCongestion),
    commercialMultiplier: getProductivityMultiplier(
      cityCongestion,
      TRAFFIC_BALANCE.COMMERCIAL_TRAFFIC_PENALTY,
      TRAFFIC_BALANCE.COMMERCIAL_MIN_MULTIPLIER,
    ),
    industrialMultiplier: getProductivityMultiplier(
      cityCongestion,
      TRAFFIC_BALANCE.INDUSTRIAL_TRAFFIC_PENALTY,
      TRAFFIC_BALANCE.INDUSTRIAL_MIN_MULTIPLIER,
    ),
    segments,
    agents: [],
    queuedAgents: [],
    intersections: [],
    trafficLights: [],
    roadNetworkDirty: false,
    nextAgentId: 1,
    lastAgentTick: -1,
  };
}

function getCityCongestion(segments: TrafficSegment[]): number {
  if (segments.length === 0) return 0;
  const total = segments.reduce((sum, segment) => sum + segment.congestion, 0);
  return Math.round((total / segments.length) * 1000) / 10;
}

function getHappinessPenalty(cityCongestion: number): number {
  const penalty =
    Math.max(0, cityCongestion - TRAFFIC_BALANCE.HAPPINESS_THRESHOLD) *
    TRAFFIC_BALANCE.TRAFFIC_HAPPINESS_WEIGHT;
  return Math.round(penalty * 10) / 10;
}

function getProductivityMultiplier(
  cityCongestion: number,
  penalty: number,
  minimum: number,
): number {
  const reduction =
    Math.max(0, cityCongestion - TRAFFIC_BALANCE.HAPPINESS_THRESHOLD) * penalty;
  return Math.max(minimum, 1 - reduction);
}
