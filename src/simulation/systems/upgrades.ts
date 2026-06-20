import {
  UPGRADE_COOLDOWN_T1_T2,
  UPGRADE_COOLDOWN_T2_T3,
  UPGRADE_HAPPINESS_T1_T2,
  UPGRADE_HAPPINESS_T2_T3,
  UPGRADE_LAND_VALUE_T1_T2,
  UPGRADE_LAND_VALUE_T2_T3,
  UPGRADE_POPULATION_T1_T2,
  UPGRADE_POPULATION_T2_T3,
  UPGRADE_REQUIRES_EDUCATION_T1_T2,
  UPGRADE_REQUIRES_EDUCATION_T2_T3,
} from "../../data/balance";
import { getBuildingById, getNextDensityBuilding } from "../../data/buildings";
import type {
  BuildingDefinition,
  BuildingInstance,
  CityState,
  GameEvent,
} from "../../shared/types";
import { getBuildingFootprint, getFootprint, getTile, isInBounds } from "../grid/map";

interface UpgradeRequirements {
  cooldown: number;
  landValue: number;
  happiness: number;
  population: number;
  requiresEducation: boolean;
}

export function updateBuildingUpgrades(state: CityState): GameEvent[] {
  return state.buildings.flatMap((building) => tryUpgradeBuilding(state, building));
}

function tryUpgradeBuilding(state: CityState, building: BuildingInstance): GameEvent[] {
  const current = getBuildingById(building.definitionId);
  const next = getNextDensityBuilding(building.definitionId);
  if (!current || !next || !canUpgrade(state, building, next)) return [];
  return applyUpgrade(state, building, current, next);
}

function canUpgrade(
  state: CityState,
  building: BuildingInstance,
  next: BuildingDefinition,
): boolean {
  const requirements = getRequirements(building.upgradeTier);
  if (!requirements) return false;
  if (!meetsCityRequirements(state, building, requirements)) return false;
  if (!hasRequiredServices(state, building, requirements)) return false;
  return hasAvailableFootprint(state, building, next);
}

function meetsCityRequirements(
  state: CityState,
  building: BuildingInstance,
  requirements: UpgradeRequirements,
): boolean {
  if (building.status !== "active" || building.warnings.length > 0) return false;
  if (state.time.tick < building.lastUpgradeTick + requirements.cooldown) return false;
  if (state.happiness.value < requirements.happiness) return false;
  if (state.population.total < requirements.population) return false;
  return getLandValue(state, building) >= requirements.landValue;
}

function hasRequiredServices(
  state: CityState,
  building: BuildingInstance,
  requirements: UpgradeRequirements,
): boolean {
  if (!hasRequiredService(state, building, "healthRadius")) return false;
  return (
    !requirements.requiresEducation ||
    hasRequiredService(state, building, "educationRadius")
  );
}

function getRequirements(
  tier: BuildingInstance["upgradeTier"],
): UpgradeRequirements | null {
  if (tier === 1) {
    return {
      cooldown: UPGRADE_COOLDOWN_T1_T2,
      landValue: UPGRADE_LAND_VALUE_T1_T2,
      happiness: UPGRADE_HAPPINESS_T1_T2,
      population: UPGRADE_POPULATION_T1_T2,
      requiresEducation: UPGRADE_REQUIRES_EDUCATION_T1_T2,
    };
  }
  if (tier === 2) {
    return {
      cooldown: UPGRADE_COOLDOWN_T2_T3,
      landValue: UPGRADE_LAND_VALUE_T2_T3,
      happiness: UPGRADE_HAPPINESS_T2_T3,
      population: UPGRADE_POPULATION_T2_T3,
      requiresEducation: UPGRADE_REQUIRES_EDUCATION_T2_T3,
    };
  }
  return null;
}

function getLandValue(state: CityState, building: BuildingInstance): number {
  const [x, y] = building.position;
  return getTile(state, x, y)?.landValue ?? 0;
}

function hasRequiredService(
  state: CityState,
  building: BuildingInstance,
  effect: "healthRadius" | "educationRadius",
): boolean {
  return state.buildings.some((provider) =>
    isServiceProvider(provider, building, effect),
  );
}

function isServiceProvider(
  provider: BuildingInstance,
  building: BuildingInstance,
  effect: "healthRadius" | "educationRadius",
): boolean {
  if (provider.status !== "active") return false;
  const radius = getBuildingById(provider.definitionId)?.effects[effect] ?? 0;
  return radius > 0 && getManhattanDistance(provider, building) <= radius;
}

function getManhattanDistance(a: BuildingInstance, b: BuildingInstance): number {
  return (
    Math.abs(a.position[0] - b.position[0]) + Math.abs(a.position[1] - b.position[1])
  );
}

function hasAvailableFootprint(
  state: CityState,
  building: BuildingInstance,
  next: BuildingDefinition,
): boolean {
  const [x, y] = building.position;
  return getFootprint(next, x, y, building.rotation).every((cell) => {
    if (!isInBounds(cell.x, cell.y)) return false;
    const tile = getTile(state, cell.x, cell.y);
    return (
      tile?.terrain === "grass" &&
      !tile.roadId &&
      (!tile.buildingId || tile.buildingId === building.id)
    );
  });
}

function applyUpgrade(
  state: CityState,
  building: BuildingInstance,
  current: BuildingDefinition,
  next: BuildingDefinition,
): GameEvent[] {
  const events = clearFootprint(state, building, current);
  building.definitionId = next.id;
  building.upgradeTier = next.densityTier ?? building.upgradeTier;
  building.lastUpgradeTick = state.time.tick;
  building.createdAtTick = state.time.tick;
  building.status = "constructing";
  building.warnings = [];
  events.push(...occupyFootprint(state, building, next));
  events.push({
    type: "BUILDING_STATUS_CHANGED",
    buildingId: building.id,
    status: "constructing",
  });
  return events;
}

function clearFootprint(
  state: CityState,
  building: BuildingInstance,
  definition: BuildingDefinition,
): GameEvent[] {
  return getBuildingFootprint(building, definition).map((cell) => {
    const tile = getTile(state, cell.x, cell.y);
    if (tile) tile.buildingId = null;
    return { type: "TILE_CHANGED", x: cell.x, y: cell.y };
  });
}

function occupyFootprint(
  state: CityState,
  building: BuildingInstance,
  definition: BuildingDefinition,
): GameEvent[] {
  return getBuildingFootprint(building, definition).map((cell) => {
    const tile = getTile(state, cell.x, cell.y);
    if (tile) tile.buildingId = building.id;
    return { type: "TILE_CHANGED", x: cell.x, y: cell.y };
  });
}
