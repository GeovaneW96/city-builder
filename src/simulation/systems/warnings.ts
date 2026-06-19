import { POLLUTION_BALANCE } from "../../data/balance";
import { getBuildingById } from "../../data/buildings";
import type {
  BuildingDefinition,
  BuildingInstance,
  CityState,
  Warning,
} from "../../shared/types";
import { ABANDONED_WARNING_TICKS } from "../constants";
import { getBuildingFootprint, getTile, hasAdjacentRoad } from "../grid/map";

export function rebuildWarnings(state: CityState): void {
  const warnings: Warning[] = [];
  state.buildings.forEach((building) => {
    const buildingWarnings = getBuildingWarnings(state, building);
    updateBuildingWarnings(building, buildingWarnings);
    warnings.push(...buildingWarnings);
  });
  warnings.push(...getCityWarnings(state));
  state.warnings = warnings;
}

function getBuildingWarnings(state: CityState, building: BuildingInstance): Warning[] {
  const definition = getBuildingById(building.definitionId);
  if (!definition || building.status === "abandoned") return [];
  return [
    getRoadWarning(state, building, definition),
    getPowerWarning(state, building, definition),
    getWaterWarning(state, building, definition),
    getPollutionWarning(state, building),
    getWorkerWarning(state, building),
  ].filter(isWarning);
}

function getRoadWarning(
  state: CityState,
  building: BuildingInstance,
  definition: BuildingDefinition,
): Warning | null {
  const hasRoad = hasAdjacentRoad(state, getBuildingFootprint(building, definition));
  if (!definition.requirements.roadAccess || hasRoad) return null;
  return createWarning(
    "no-road",
    "high",
    "No road access.",
    building,
    "Build a road next to this building.",
  );
}

function getPowerWarning(
  state: CityState,
  building: BuildingInstance,
  definition: BuildingDefinition,
): Warning | null {
  if (!needsPowerWarning(state, definition.id)) return null;
  return createWarning(
    "no-power",
    "medium",
    "Not enough power.",
    building,
    "Build a power plant.",
  );
}

function getWaterWarning(
  state: CityState,
  building: BuildingInstance,
  definition: BuildingDefinition,
): Warning | null {
  if (!needsWaterWarning(state, definition.id)) return null;
  return createWarning(
    "no-water",
    "medium",
    "Not enough water.",
    building,
    "Build a water tower.",
  );
}

function getPollutionWarning(
  state: CityState,
  building: BuildingInstance,
): Warning | null {
  if (!hasHighPollution(state, building)) return null;
  return createWarning(
    "pollution",
    "medium",
    "High pollution nearby.",
    building,
    "Move industry away from homes.",
  );
}

function getWorkerWarning(state: CityState, building: BuildingInstance): Warning | null {
  if (!needsWorkerWarning(state, building)) return null;
  return createWarning(
    "workers",
    "low",
    "Not enough workers.",
    building,
    "Zone more residential areas.",
  );
}

function isWarning(warning: Warning | null): warning is Warning {
  return warning !== null;
}

function updateBuildingWarnings(building: BuildingInstance, warnings: Warning[]): void {
  building.warnings = warnings.map((warning) => warning.id);
  const abandonmentWarnings = warnings.filter(countsTowardAbandonment);
  if (abandonmentWarnings.length === 0) {
    building.unresolvedWarningTicks = 0;
    return;
  }
  building.unresolvedWarningTicks += 1;
  if (building.unresolvedWarningTicks >= ABANDONED_WARNING_TICKS) {
    building.status = "abandoned";
  }
}

function countsTowardAbandonment(warning: Warning): boolean {
  return (
    warning.id.includes(":no-road") ||
    warning.id.includes(":workers") ||
    warning.id.includes(":pollution")
  );
}

function getCityWarnings(state: CityState): Warning[] {
  const warnings: Warning[] = [];
  if (state.economy.monthlyExpenses > state.economy.monthlyIncome) {
    warnings.push({
      id: "city:losing-money",
      severity: "medium",
      message: "City is losing money.",
      suggestedFix: "Grow taxable zones or reduce service spending.",
    });
  }
  if (state.economy.money < 0) {
    warnings.push({
      id: "city:bankruptcy",
      severity: "high",
      message: "City is bankrupt.",
      suggestedFix: "Return money above zero before the grace period ends.",
    });
  }
  if (state.happiness.value < 50) {
    warnings.push({
      id: "city:low-happiness",
      severity: "medium",
      message: "Happiness is low.",
      suggestedFix: "Lower taxes, add services, or reduce pollution.",
    });
  }
  return warnings;
}

function createWarning(
  reason: string,
  severity: Warning["severity"],
  message: string,
  building: BuildingInstance,
  suggestedFix: string,
): Warning {
  return {
    id: `${building.id}:${reason}`,
    severity,
    message,
    targetBuilding: building.id,
    targetTile: building.position,
    suggestedFix,
  };
}

function needsPowerWarning(state: CityState, definitionId: string): boolean {
  if (definitionId === "park" || definitionId === "city_hall") return false;
  return state.services.powerDemand > state.services.powerCapacity;
}

function needsWaterWarning(state: CityState, definitionId: string): boolean {
  if (definitionId === "park" || definitionId === "city_hall") return false;
  return state.services.waterDemand > state.services.waterCapacity;
}

function hasHighPollution(state: CityState, building: BuildingInstance): boolean {
  const tile = getTile(state, building.position[0], building.position[1]);
  return (tile?.pollution ?? 0) >= POLLUTION_BALANCE.WARNING_THRESHOLD;
}

function needsWorkerWarning(state: CityState, building: BuildingInstance): boolean {
  const definition = getBuildingById(building.definitionId);
  if (!definition || !definition.effects.jobs) return false;
  if (definition.category !== "commercial" && definition.category !== "industrial")
    return false;
  return (
    state.population.total < state.population.employedWorkers + definition.effects.jobs
  );
}
