import { TRAFFIC_BALANCE, TRANSPORT_BALANCE } from "../../data/balance";
import { getBuildingById } from "../../data/buildings";
import type {
  BuildingInstance,
  CityState,
  Road,
  TrafficSegment,
  TrafficState,
} from "../../shared/types";
import { isTransitCovered } from "./public-transport";

export function recomputeTraffic(state: CityState): void {
  const segments = state.roads.map(createSegment);
  const segmentByRoad = new Map(segments.map((segment) => [segment.roadId, segment]));
  const totalTrips = state.buildings.reduce(
    (total, building) => total + assignBuildingTrips(building, state, segmentByRoad),
    0,
  );
  state.traffic = createTrafficState(segments, totalTrips);
}

export function getRoadCapacity(road: Road): number {
  return road.type === "paved"
    ? TRAFFIC_BALANCE.PAVED_ROAD_CAPACITY
    : TRAFFIC_BALANCE.DIRT_ROAD_CAPACITY;
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
