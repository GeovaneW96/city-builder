import {
  HAPPINESS_DEFAULTS,
  SERVICE_HAPPINESS,
  getTaxHappinessModifier,
} from "../../data/balance";
import { getBuildingById } from "../../data/buildings";
import type {
  BuildingInstance,
  CityState,
  Neighborhood,
  NeighborhoodHappinessComponents,
  Tile,
} from "../../shared/types";
import { getOrthogonalNeighbors, getTile } from "../grid/map";

export function recomputeNeighborhoods(state: CityState): Neighborhood[] {
  const neighborhoods = findRegions(state)
    .map((tiles, index) => createNeighborhood(state, tiles, index))
    .filter((neighborhood): neighborhood is Neighborhood => neighborhood !== null);
  state.neighborhoods = neighborhoods;
  return neighborhoods;
}

function findRegions(state: CityState): Tile[][] {
  const visited = new Set<string>();
  return state.map.flat().flatMap((tile) => {
    if (!isUnvisitedBuildableTile(tile, visited)) return [];
    return [expandRegion(state, tile, visited)];
  });
}

function isUnvisitedBuildableTile(tile: Tile, visited: Set<string>): boolean {
  return (
    tile.terrain === "grass" && !tile.roadId && !visited.has(getTileKey(tile.x, tile.y))
  );
}

function expandRegion(state: CityState, first: Tile, visited: Set<string>): Tile[] {
  const region: Tile[] = [];
  const queue: Tile[] = [first];
  visited.add(getTileKey(first.x, first.y));
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    region.push(current);
    getOrthogonalNeighbors(current.x, current.y).forEach((neighbor) => {
      const tile = getTile(state, neighbor.x, neighbor.y);
      if (tile && isUnvisitedBuildableTile(tile, visited)) {
        visited.add(getTileKey(tile.x, tile.y));
        queue.push(tile);
      }
    });
  }
  return region;
}

function createNeighborhood(
  state: CityState,
  tiles: Tile[],
  index: number,
): Neighborhood | null {
  const buildings = getRegionBuildings(state, tiles);
  if (buildings.length === 0) return null;
  const components = calculateComponents(state, tiles, buildings);
  return {
    id: `neighborhood:${index}`,
    label: `Neighborhood ${index + 1}`,
    bounds: getBounds(tiles),
    tileCount: tiles.length,
    population: getPopulation(buildings),
    happiness: clampHappiness(sumComponents(components)),
    components,
    buildings: buildings.map((building) => building.id),
  };
}

function getRegionBuildings(state: CityState, tiles: Tile[]): BuildingInstance[] {
  const tileKeys = new Set(tiles.map((tile) => getTileKey(tile.x, tile.y)));
  return state.buildings.filter((building) => tileKeys.has(getBuildingKey(building)));
}

function calculateComponents(
  state: CityState,
  tiles: Tile[],
  buildings: BuildingInstance[],
): NeighborhoodHappinessComponents {
  return {
    base: HAPPINESS_DEFAULTS.BASE,
    tax: getTaxComponent(state),
    unemployment: getUnemploymentComponent(buildings),
    services: getServiceComponent(state, buildings),
    pollution: getPollutionComponent(tiles),
    parks: getParkComponent(buildings),
    utility: getUtilityComponent(state),
    traffic: -state.traffic.happinessPenalty,
    goods: -state.goods.happinessPenalty,
    crime: state.extendedServices.crimeHappinessPenalty,
    garbage: state.extendedServices.garbageHappinessPenalty,
    transit: state.publicTransport.happinessBonus,
  };
}

function getTaxComponent(state: CityState): number {
  const rates = state.economy.taxRates;
  const total =
    getTaxHappinessModifier(rates.residential) +
    getTaxHappinessModifier(rates.commercial) +
    getTaxHappinessModifier(rates.industrial);
  return Math.round(total / 3);
}

function getUnemploymentComponent(buildings: BuildingInstance[]): number {
  const population = getPopulation(buildings);
  if (population === 0) return 0;
  const jobs = sumBuildingEffect(buildings, "jobs");
  const unemploymentRate = Math.max(0, population - jobs) / population;
  return -Math.round(
    Math.min(
      HAPPINESS_DEFAULTS.UNEMPLOYMENT_PENALTY_CAP,
      unemploymentRate * HAPPINESS_DEFAULTS.UNEMPLOYMENT_FULL_RATE_PENALTY,
    ),
  );
}

function getServiceComponent(state: CityState, buildings: BuildingInstance[]): number {
  const targets = buildings.filter((building) => getPopulation([building]) > 0);
  if (targets.length === 0) return 0;
  const health = getCoverage(targets, state, "healthRadius");
  const education = getCoverage(targets, state, "educationRadius");
  return Math.round(
    (health * HAPPINESS_DEFAULTS.NEIGHBORHOOD_HEALTH_WEIGHT +
      education * HAPPINESS_DEFAULTS.NEIGHBORHOOD_EDUCATION_WEIGHT) /
      2,
  );
}

function getCoverage(
  targets: BuildingInstance[],
  state: CityState,
  effect: "healthRadius" | "educationRadius",
): number {
  const providers = state.buildings.filter((building) => getEffect(building, effect) > 0);
  const covered = targets.filter((target) =>
    providers.some((provider) => isCoveredBy(target, provider, effect)),
  );
  return covered.length / targets.length;
}

function isCoveredBy(
  target: BuildingInstance,
  provider: BuildingInstance,
  effect: "healthRadius" | "educationRadius",
): boolean {
  if (provider.status !== "active") return false;
  return getManhattanDistance(target, provider) <= getEffect(provider, effect);
}

function getPollutionComponent(tiles: Tile[]): number {
  const total = tiles.reduce((sum, tile) => sum + tile.pollution, 0);
  if (total === 0) return 0;
  return -Math.round(
    total / tiles.length / HAPPINESS_DEFAULTS.NEIGHBORHOOD_POLLUTION_DIVISOR,
  );
}

function getParkComponent(buildings: BuildingInstance[]): number {
  const total = buildings.reduce((sum, building) => {
    const definition = getBuildingById(building.definitionId);
    return definition?.id === "park" && building.status === "active"
      ? sum + (definition.effects.happiness ?? 0)
      : sum;
  }, 0);
  return Math.min(HAPPINESS_DEFAULTS.NEIGHBORHOOD_PARK_BONUS_CAP, total);
}

function getUtilityComponent(state: CityState): number {
  const isShort =
    state.services.powerDemand > state.services.powerCapacity ||
    state.services.waterDemand > state.services.waterCapacity;
  return isShort ? SERVICE_HAPPINESS.UTILITY_SHORTAGE_PENALTY : 0;
}

function getPopulation(buildings: BuildingInstance[]): number {
  return sumBuildingEffect(buildings, "populationCapacity");
}

function sumBuildingEffect(
  buildings: BuildingInstance[],
  effect: "populationCapacity" | "jobs",
): number {
  return buildings.reduce((sum, building) => {
    if (building.status !== "active") return sum;
    return sum + getEffect(building, effect);
  }, 0);
}

function getEffect(
  building: BuildingInstance,
  effect: "populationCapacity" | "jobs" | "healthRadius" | "educationRadius",
): number {
  return getBuildingById(building.definitionId)?.effects[effect] ?? 0;
}

function getBounds(tiles: Tile[]): Neighborhood["bounds"] {
  return tiles.reduce(
    (bounds, tile) => ({
      minX: Math.min(bounds.minX, tile.x),
      minY: Math.min(bounds.minY, tile.y),
      maxX: Math.max(bounds.maxX, tile.x),
      maxY: Math.max(bounds.maxY, tile.y),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
}

function sumComponents(components: NeighborhoodHappinessComponents): number {
  return (
    components.base +
    components.tax +
    components.unemployment +
    components.services +
    components.pollution +
    components.parks +
    components.utility +
    components.traffic +
    components.goods +
    components.crime +
    components.garbage +
    components.transit
  );
}

function getTileKey(x: number, y: number): string {
  return `${x},${y}`;
}

function getBuildingKey(building: BuildingInstance): string {
  return getTileKey(building.position[0], building.position[1]);
}

function getManhattanDistance(a: BuildingInstance, b: BuildingInstance): number {
  return (
    Math.abs(a.position[0] - b.position[0]) + Math.abs(a.position[1] - b.position[1])
  );
}

function clampHappiness(value: number): number {
  return Math.round(
    Math.max(HAPPINESS_DEFAULTS.MIN, Math.min(HAPPINESS_DEFAULTS.MAX, value)),
  );
}
