import { COMMERCIAL_BUILDINGS } from "../../data/buildings/commercial";
import { INDUSTRIAL_BUILDINGS } from "../../data/buildings/industrial";
import { RESIDENTIAL_BUILDINGS } from "../../data/buildings/residential";
import type {
  BuildingDefinition,
  BuildingInstance,
  CityState,
  GameEvent,
  ZoneType,
} from "../../shared/types";
import {
  BUILDING_CONSTRUCTION_TICKS,
  BUILDING_LOCK_TICKS,
  MAX_ZONE_GROWTH_PER_TICK,
  MIN_DEMAND_FOR_GROWTH,
} from "../constants";
import { getFootprint, getTile, hasAdjacentRoad } from "../grid/map";
import { getUtilityAvailability } from "./metrics";

export function updateConstructionStatuses(state: CityState): GameEvent[] {
  const events: GameEvent[] = [];
  state.buildings.forEach((building) => {
    const readyTick = building.createdAtTick + BUILDING_CONSTRUCTION_TICKS;
    if (building.status === "constructing" && state.time.tick >= readyTick) {
      building.status = "active";
      events.push({
        type: "BUILDING_STATUS_CHANGED",
        buildingId: building.id,
        status: "active",
      });
    }
  });
  return events;
}

export function growZonedBuildings(state: CityState): GameEvent[] {
  return ZONE_TYPES.flatMap((zoneType) => growZoneType(state, zoneType));
}

const ZONE_TYPES: ZoneType[] = [
  "residential",
  "commercial",
  "industrial",
  "medium_residential",
  "medium_commercial",
  "medium_industrial",
  "high_residential",
  "high_commercial",
  "office",
];

function growZoneType(state: CityState, zoneType: ZoneType): GameEvent[] {
  const definition = getZoneDefinition(zoneType);
  if (!definition || getZoneDemand(state, zoneType) < MIN_DEMAND_FOR_GROWTH) return [];
  if (!isZoneUnlocked(state, zoneType)) return [];

  const events: GameEvent[] = [];
  let spawned = 0;
  for (let y = 0; y < state.map.length && spawned < MAX_ZONE_GROWTH_PER_TICK; y++) {
    spawned += growZoneRow(state, y, zoneType, definition, events);
  }
  return events;
}

function growZoneRow(
  state: CityState,
  y: number,
  zoneType: ZoneType,
  definition: BuildingDefinition,
  events: GameEvent[],
): number {
  let spawned = 0;
  for (
    let x = 0;
    x < (state.map[y]?.length ?? 0) && spawned < MAX_ZONE_GROWTH_PER_TICK;
    x++
  ) {
    if (canGrowAt(state, x, y, zoneType, definition)) {
      spawnZoneBuilding(state, x, y, definition, events);
      spawned += 1;
    }
  }
  return spawned;
}

function canGrowAt(
  state: CityState,
  x: number,
  y: number,
  zoneType: ZoneType,
  definition: BuildingDefinition,
): boolean {
  const footprint = getFootprint(definition, x, y, 0);
  const fits = footprint.every((cell) => {
    const tile = getTile(state, cell.x, cell.y);
    return tile?.zone === zoneType && !tile.roadId && !tile.buildingId;
  });
  return (
    fits &&
    hasAdjacentRoad(state, footprint) &&
    hasUtilityCapacityForGrowth(state) &&
    meetsDensityRequirements(state, x, y, zoneType)
  );
}

function hasUtilityCapacityForGrowth(state: CityState): boolean {
  const hasActiveUtilityDemand =
    state.services.powerDemand > 0 || state.services.waterDemand > 0;
  return !hasActiveUtilityDemand || getUtilityAvailability(state) >= 1;
}

function meetsDensityRequirements(
  state: CityState,
  x: number,
  y: number,
  zoneType: ZoneType,
): boolean {
  const requirement = getDensityRequirement(zoneType);
  if (!requirement) return zoneType !== "office" || state.office.unlocked;
  const landValue = state.map[y]?.[x]?.landValue ?? 0;
  const coverage = (state.services.healthCoverage + state.services.educationCoverage) / 2;
  return (
    landValue >= requirement.landValue &&
    coverage >= 60 &&
    state.population.total >= requirement.population
  );
}

function getDensityRequirement(
  zoneType: ZoneType,
): { landValue: number; population: number } | null {
  if (zoneType.startsWith("medium")) return { landValue: 50, population: 2500 };
  if (zoneType.startsWith("high")) return { landValue: 75, population: 10000 };
  return null;
}

function spawnZoneBuilding(
  state: CityState,
  x: number,
  y: number,
  definition: BuildingDefinition,
  events: GameEvent[],
): void {
  const building = createZoneBuilding(state, x, y, definition);
  state.buildings.push(building);
  getFootprint(definition, x, y, 0).forEach((cell) => {
    const tile = getTile(state, cell.x, cell.y);
    if (!tile) return;
    tile.buildingId = building.id;
    events.push({ type: "TILE_CHANGED", x: cell.x, y: cell.y });
  });
  events.push({ type: "BUILDING_ADDED", buildingId: building.id, x, y });
}

function createZoneBuilding(
  state: CityState,
  x: number,
  y: number,
  definition: BuildingDefinition,
): BuildingInstance {
  return {
    id: `${definition.id}:${x},${y}:${state.time.tick}`,
    definitionId: definition.id,
    position: [x, y],
    rotation: 0,
    status: "constructing",
    warnings: [],
    createdAtTick: state.time.tick,
    lockedUntilTick: state.time.tick + BUILDING_LOCK_TICKS,
    unresolvedWarningTicks: 0,
    upgradeTier: definition.densityTier ?? 1,
    lastUpgradeTick: state.time.tick,
  };
}

function getZoneDefinition(zoneType: ZoneType): BuildingDefinition | null {
  if (zoneType === "residential") return getStarterZoneBuilding(RESIDENTIAL_BUILDINGS);
  if (zoneType === "commercial") return getStarterZoneBuilding(COMMERCIAL_BUILDINGS);
  if (zoneType === "industrial") return getStarterZoneBuilding(INDUSTRIAL_BUILDINGS);
  const definitions: Partial<Record<ZoneType, string>> = {
    medium_residential: "medium_house",
    high_residential: "high_apartment",
    medium_commercial: "medium_shop",
    high_commercial: "large_store",
    medium_industrial: "medium_factory",
    office: "small_office",
  };
  const id = definitions[zoneType];
  return id
    ? ([...RESIDENTIAL_BUILDINGS, ...COMMERCIAL_BUILDINGS, ...INDUSTRIAL_BUILDINGS].find(
        (building) => building.id === id,
      ) ?? null)
    : null;
}

function getStarterZoneBuilding(
  definitions: BuildingDefinition[],
): BuildingDefinition | null {
  return (
    definitions.find(
      (building) => building.placementType === "zone-grown" && building.densityTier === 1,
    ) ?? null
  );
}

function isZoneUnlocked(state: CityState, zoneType: ZoneType): boolean {
  if (zoneType.startsWith("medium")) return state.population.total >= 2500;
  if (zoneType.startsWith("high")) return state.population.total >= 10000;
  if (zoneType === "office") return state.office.unlocked;
  return state.progression.unlockedFeatures.includes(`${zoneType}_zoning`);
}

function getZoneDemand(state: CityState, zoneType: ZoneType): number {
  if (zoneType === "office") return state.demand.office;
  if (zoneType.endsWith("residential")) return state.demand.residential;
  if (zoneType.endsWith("commercial")) return state.demand.commercial;
  return state.demand.industrial;
}
