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
  GRID_SIZE,
  MAX_ZONE_GROWTH_PER_TICK,
  MIN_DEMAND_FOR_GROWTH,
} from "../constants";
import { getFootprint, getTile, hasAdjacentRoad } from "../grid/map";

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
  return (["residential", "commercial", "industrial"] as const).flatMap((zoneType) =>
    growZoneType(state, zoneType),
  );
}

function growZoneType(state: CityState, zoneType: ZoneType): GameEvent[] {
  const definition = getZoneDefinition(zoneType);
  if (!definition || state.demand[zoneType] < MIN_DEMAND_FOR_GROWTH) return [];
  if (!isZoneUnlocked(state, zoneType)) return [];

  const events: GameEvent[] = [];
  let spawned = 0;
  for (let y = 0; y < GRID_SIZE && spawned < MAX_ZONE_GROWTH_PER_TICK; y++) {
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
  for (let x = 0; x < GRID_SIZE && spawned < MAX_ZONE_GROWTH_PER_TICK; x++) {
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
  return fits && hasAdjacentRoad(state, footprint);
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
  };
}

function getZoneDefinition(zoneType: ZoneType): BuildingDefinition | null {
  if (zoneType === "residential") return RESIDENTIAL_BUILDINGS[0] ?? null;
  if (zoneType === "commercial") return COMMERCIAL_BUILDINGS[0] ?? null;
  return INDUSTRIAL_BUILDINGS[0] ?? null;
}

function isZoneUnlocked(state: CityState, zoneType: ZoneType): boolean {
  return state.progression.unlockedFeatures.includes(`${zoneType}_zoning`);
}
