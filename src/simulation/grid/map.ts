import type {
  BiomeType,
  BuildingDefinition,
  BuildingInstance,
  CityState,
  Road,
  Tile,
  TrafficState,
} from "../../shared/types";
import { LOAN_BALANCE } from "../../data/balance";
import { GRID_SIZE } from "../constants";

export interface FootprintCell {
  x: number;
  y: number;
}

export function createMap(biome: BiomeType = "temperate"): Tile[][] {
  return Array.from({ length: GRID_SIZE }, (_, y) =>
    Array.from({ length: GRID_SIZE }, (_, x) => ({
      x,
      y,
      terrain: "grass" as const,
      biome,
      elevation: 1,
      resourceType: null,
      richness: 0,
      depleted: false,
      roadId: null,
      zone: null,
      buildingId: null,
      pollution: 0,
      landValue: 50,
      districtId: null,
    })),
  );
}

export function isInBounds(x: number, y: number): boolean {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

export function getTile(state: CityState, x: number, y: number): Tile | null {
  if (!isInBounds(x, y)) return null;
  return state.map[y]?.[x] ?? null;
}

export function cloneCityState(state: CityState): CityState {
  return {
    map: cloneMap(state.map),
    buildings: state.buildings.map((building) => ({
      ...building,
      position: [...building.position],
      warnings: [...building.warnings],
      upgradeTier: building.upgradeTier ?? 1,
      lastUpgradeTick: building.lastUpgradeTick ?? building.createdAtTick,
    })),
    roads: state.roads.map(cloneRoad),
    economy: {
      ...state.economy,
      taxRates: { ...state.economy.taxRates },
      loans: (state.economy.loans ?? []).map((loan) => ({ ...loan })),
      lastLoanTick: state.economy.lastLoanTick ?? -LOAN_BALANCE.COOLDOWN_TICKS,
      tourismIncome: state.economy.tourismIncome ?? 0,
    },
    population: { ...state.population },
    demand: { ...state.demand, office: state.demand.office ?? 20 },
    office: { ...state.office },
    tourism: cloneTourism(state),
    specialization: {
      ...(state.specialization ?? { active: null, lastSwitchTick: -12 }),
    },
    events: state.events.map((event) => ({ ...event })),
    services: {
      ...state.services,
      healthQuality: state.services.healthQuality ?? 0,
      educationQuality: state.services.educationQuality ?? 0,
      workforceQuality: state.services.workforceQuality ?? 0,
    },
    traffic: cloneTrafficState(state.traffic),
    goods: cloneGoodsState(state.goods),
    extendedServices: cloneExtendedServicesState(state.extendedServices),
    publicTransport: clonePublicTransportState(state.publicTransport),
    rating: cloneRating(state.rating),
    achievements: cloneAchievements(state),
    achievementProgress: cloneAchievementProgress(state),
    happiness: cloneHappiness(state),
    neighborhoods: cloneNeighborhoods(state),
    neighborhoodMode: state.neighborhoodMode ?? "auto",
    districts: cloneDistricts(state),
    progression: {
      ...state.progression,
      unlockedFeatures: [...state.progression.unlockedFeatures],
      completedObjectives: [...state.progression.completedObjectives],
    },
    warnings: state.warnings.map((warning) => ({ ...warning })),
    time: { ...state.time },
  };
}

function cloneTourism(state: CityState): CityState["tourism"] {
  const tourism = state.tourism;
  if (!tourism)
    return {
      income: 0,
      attractiveness: {
        score: 0,
        breakdown: {
          parks: 0,
          landmarks: 0,
          serviceCoverage: 0,
          lowPollution: 0,
          beaches: 0,
        },
      },
    };
  return {
    ...tourism,
    attractiveness: {
      ...tourism.attractiveness,
      breakdown: { ...tourism.attractiveness.breakdown },
    },
  };
}

function cloneMap(map: CityState["map"]): CityState["map"] {
  return map.map((row) =>
    row.map((tile) => ({ ...tile, districtId: tile.districtId ?? null })),
  );
}

function cloneAchievements(state: CityState): CityState["achievements"] {
  return (state.achievements ?? []).map((achievement) => ({ ...achievement }));
}

function cloneAchievementProgress(state: CityState): CityState["achievementProgress"] {
  const progress = state.achievementProgress;
  return {
    ...DEFAULT_ACHIEVEMENT_PROGRESS,
    ...progress,
    roadsPlaced: progress?.roadsPlaced ?? state.roads.length,
  };
}

const DEFAULT_ACHIEVEMENT_PROGRESS = {
  moneyEverNegative: false,
  pollutionStayedLow: true,
  happyTickStreak: 0,
  positiveIncomeMonthStreak: 0,
  roadsPlaced: 0,
};

function cloneHappiness(state: CityState): CityState["happiness"] {
  return {
    value: state.happiness.value,
    components: {
      ...state.happiness.components,
      policies: state.happiness.components.policies ?? 0,
    },
  };
}

function cloneNeighborhoods(state: CityState): CityState["neighborhoods"] {
  return (state.neighborhoods ?? []).map((neighborhood) => ({
    ...neighborhood,
    bounds: { ...neighborhood.bounds },
    components: {
      ...neighborhood.components,
      policies: neighborhood.components.policies ?? 0,
    },
    buildings: [...neighborhood.buildings],
  }));
}

function cloneDistricts(state: CityState): CityState["districts"] {
  return (state.districts ?? []).map((district) => ({
    ...district,
    tiles: district.tiles.map((tile) => [...tile] as [number, number]),
    policies: [...district.policies],
  }));
}

export function getFootprint(
  definition: BuildingDefinition,
  x: number,
  y: number,
  rotation: 0 | 90 | 180 | 270,
): FootprintCell[] {
  const [width, height] = getRotatedSize(definition, rotation);
  return Array.from({ length: height }, (_, dy) =>
    Array.from({ length: width }, (_, dx) => ({ x: x + dx, y: y + dy })),
  ).flat();
}

export function getBuildingFootprint(
  building: BuildingInstance,
  definition: BuildingDefinition,
): FootprintCell[] {
  const [x, y] = building.position;
  return getFootprint(definition, x, y, building.rotation);
}

export function hasAdjacentRoad(state: CityState, footprint: FootprintCell[]): boolean {
  return footprint.some((cell) =>
    getOrthogonalNeighbors(cell.x, cell.y).some((neighbor) => {
      const tile = getTile(state, neighbor.x, neighbor.y);
      return tile?.roadId !== null && tile?.roadId !== undefined;
    }),
  );
}

export function getOrthogonalNeighbors(x: number, y: number): FootprintCell[] {
  return [
    { x, y: y - 1 },
    { x: x + 1, y },
    { x, y: y + 1 },
    { x: x - 1, y },
  ].filter((cell) => isInBounds(cell.x, cell.y));
}

export function refreshAllRoadConnections(state: CityState): void {
  state.roads = state.roads.map((road) => {
    const [x, y] = road.position;
    return { ...road, connections: getRoadConnections(state, x, y) };
  });
}

export function getRoadConnections(
  state: CityState,
  x: number,
  y: number,
): Road["connections"] {
  return {
    north: hasRoadAt(state, x, y - 1),
    east: hasRoadAt(state, x + 1, y),
    south: hasRoadAt(state, x, y + 1),
    west: hasRoadAt(state, x - 1, y),
  };
}

function hasRoadAt(state: CityState, x: number, y: number): boolean {
  const tile = getTile(state, x, y);
  return tile?.roadId !== null && tile?.roadId !== undefined;
}

function getRotatedSize(
  definition: BuildingDefinition,
  rotation: 0 | 90 | 180 | 270,
): [number, number] {
  const [width, height] = definition.size;
  return rotation === 90 || rotation === 270 ? [height, width] : [width, height];
}

function cloneRoad(road: Road): Road {
  return {
    ...road,
    position: [...road.position],
    connections: { ...road.connections },
  };
}

function cloneTrafficState(traffic: TrafficState | undefined): TrafficState {
  if (!traffic) {
    return {
      cityCongestion: 0,
      totalTrips: 0,
      happinessPenalty: 0,
      commercialMultiplier: 1,
      industrialMultiplier: 1,
      segments: [],
      agents: [],
      queuedAgents: [],
      intersections: [],
      trafficLights: [],
      roadNetworkDirty: true,
      nextAgentId: 1,
      lastAgentTick: -1,
    };
  }
  return {
    ...traffic,
    segments: traffic.segments.map((segment) => ({ ...segment })),
    agents: (traffic.agents ?? []).map((agent) => ({
      ...agent,
      route: [...agent.route],
    })),
    queuedAgents: (traffic.queuedAgents ?? []).map((agent) => ({
      ...agent,
      route: [...agent.route],
    })),
    intersections: [...(traffic.intersections ?? [])],
    trafficLights: (traffic.trafficLights ?? []).map((light) => ({ ...light })),
    roadNetworkDirty: traffic.roadNetworkDirty ?? true,
    nextAgentId: traffic.nextAgentId ?? 1,
    lastAgentTick: traffic.lastAgentTick ?? -1,
  };
}

function cloneGoodsState(goods: CityState["goods"] | undefined): CityState["goods"] {
  if (!goods) {
    return {
      demand: 0,
      supply: 0,
      balance: 0,
      shortagePercentage: 0,
      happinessPenalty: 0,
      commercialMultiplier: 1,
    };
  }
  return { ...goods };
}

function cloneExtendedServicesState(
  extendedServices: CityState["extendedServices"] | undefined,
): CityState["extendedServices"] {
  if (!extendedServices) return createEmptyExtendedServicesState();
  return { ...extendedServices };
}

function createEmptyExtendedServicesState(): CityState["extendedServices"] {
  return {
    policeCoverage: 0,
    fireCoverage: 0,
    crimeRate: 0,
    crimeHappinessPenalty: 0,
    totalUncollectedGarbage: 0,
    monthlyGarbageProduction: 0,
    monthlyGarbageCollected: 0,
    garbageHappinessPenalty: 0,
  };
}

function clonePublicTransportState(
  publicTransport: CityState["publicTransport"] | undefined,
): CityState["publicTransport"] {
  if (!publicTransport) {
    return {
      stops: [],
      routes: [],
      coveredBuildingIds: [],
      ridership: 0,
      activeRouteCount: 0,
      happinessBonus: 0,
    };
  }
  return {
    ...publicTransport,
    stops: publicTransport.stops.map((stop) => ({
      ...stop,
      position: [...stop.position],
    })),
    routes: publicTransport.routes.map((route) => ({
      ...route,
      stops: [...route.stops],
    })),
    coveredBuildingIds: [...publicTransport.coveredBuildingIds],
  };
}

function cloneRating(rating: CityState["rating"] | undefined): CityState["rating"] {
  if (!rating) {
    return {
      score: 0,
      grade: "F",
      immigrationModifier: -0.2,
      components: { economy: 0, happiness: 0, services: 0, environment: 0, growth: 0 },
    };
  }
  return { ...rating, components: { ...rating.components } };
}
