import {
  EXTENDED_SERVICE_BALANCE,
  GOODS_BALANCE,
  LOAN_BALANCE,
  POLLUTION_BALANCE,
  TRAFFIC_BALANCE,
} from "../../data/balance";
import { getBuildingById } from "../../data/buildings";
import type {
  BuildingDefinition,
  BuildingInstance,
  CityState,
  GameEvent,
  Warning,
} from "../../shared/types";
import { ABANDONED_WARNING_TICKS } from "../constants";
import { getBuildingFootprint, getTile, hasAdjacentRoad } from "../grid/map";
import { monthsToTicks } from "./time";

export function rebuildWarnings(state: CityState): GameEvent[] {
  const previousWarnings = state.warnings;
  const warnings: Warning[] = [];
  state.buildings.forEach((building) => {
    const buildingWarnings = getBuildingWarnings(state, building);
    updateBuildingWarnings(building, buildingWarnings);
    warnings.push(...buildingWarnings);
  });
  warnings.push(...getCityWarnings(state));
  state.warnings = warnings;
  return getWarningEvents(previousWarnings, warnings);
}

function getWarningEvents(previous: Warning[], next: Warning[]): GameEvent[] {
  const previousIds = new Set(previous.map((warning) => warning.id));
  const nextIds = new Set(next.map((warning) => warning.id));
  return [
    ...next
      .filter((warning) => !previousIds.has(warning.id))
      .map((warning) => ({ type: "WARNING_ADDED" as const, warning })),
    ...previous
      .filter((warning) => !nextIds.has(warning.id))
      .map((warning) => ({ type: "WARNING_REMOVED" as const, warningId: warning.id })),
  ];
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
  if (state.traffic.cityCongestion > TRAFFIC_BALANCE.WARNING_THRESHOLD) {
    warnings.push({
      id: "city:traffic-congestion",
      severity: "high",
      message: `Traffic congestion is ${state.traffic.cityCongestion}%.`,
      suggestedFix: "Upgrade roads or add alternative routes.",
    });
  }
  if (
    state.traffic.segments.some(
      (segment) => segment.congestion >= TRAFFIC_BALANCE.SEGMENT_WARNING_THRESHOLD,
    )
  ) {
    warnings.push({
      id: "city:road-segment-capacity",
      severity: "medium",
      message: "A road segment is at capacity.",
      suggestedFix: "Upgrade the saturated road or distribute traffic.",
    });
  }
  warnings.push(...getGoodsWarnings(state));
  warnings.push(...getLoanWarnings(state));
  warnings.push(...getExtendedServiceWarnings(state));
  return warnings;
}

function getExtendedServiceWarnings(state: CityState): Warning[] {
  const warnings: Warning[] = [];
  if (
    isServiceUnlocked(state, "police_station") &&
    hasPoliceTargets(state) &&
    state.extendedServices.policeCoverage < 50
  ) {
    warnings.push({
      id: "city:high-crime",
      severity: "medium",
      message: "Police coverage is low.",
      suggestedFix: "Build a police station near homes and shops.",
    });
  }
  if (
    isServiceUnlocked(state, "fire_station") &&
    hasFireTargets(state) &&
    state.extendedServices.fireCoverage < 50
  ) {
    warnings.push({
      id: "city:fire-risk",
      severity: "medium",
      message: "Fire coverage is low.",
      suggestedFix: "Build a fire station near homes and industry.",
    });
  }
  if (
    state.extendedServices.totalUncollectedGarbage >
    EXTENDED_SERVICE_BALANCE.GARBAGE_WARNING_THRESHOLD
  ) {
    warnings.push({
      id: "city:garbage-buildup",
      severity: "medium",
      message: "Uncollected garbage is building up.",
      suggestedFix: getGarbageFix(state),
    });
  }
  return warnings;
}

function getGarbageFix(state: CityState): string {
  if (state.extendedServices.garbageCoverage === 0)
    return "Place a landfill within range of homes, shops, or industry.";
  if (state.extendedServices.garbageCoverage < 100)
    return `Only ${state.extendedServices.garbageCoverage}% is covered. Add or move a landfill closer.`;
  return "Landfill crews are clearing the backlog; keep it funded and allow a month to pass.";
}

function hasPoliceTargets(state: CityState): boolean {
  return state.buildings.some((building) => {
    const category = getBuildingById(building.definitionId)?.category;
    return category === "residential" || category === "commercial";
  });
}

function hasFireTargets(state: CityState): boolean {
  return state.buildings.some((building) => {
    const category = getBuildingById(building.definitionId)?.category;
    return category === "residential" || category === "industrial";
  });
}

function isServiceUnlocked(state: CityState, buildingId: string): boolean {
  const definition = getBuildingById(buildingId);
  if (!definition) return false;
  return (
    state.population.total >= definition.unlockPopulation ||
    state.progression.unlockedFeatures.includes(definition.id)
  );
}

function getGoodsWarnings(state: CityState): Warning[] {
  const shortage = state.goods.shortagePercentage;
  if (shortage > GOODS_BALANCE.SEVERE_WARNING_THRESHOLD) {
    return [
      {
        id: "city:severe-goods-shortage",
        severity: "high",
        message: `Severe goods shortage: ${shortage}%.`,
        suggestedFix: "Zone more industry or improve industrial traffic.",
      },
    ];
  }
  if (shortage > GOODS_BALANCE.WARNING_THRESHOLD) {
    return [
      {
        id: "city:goods-shortage",
        severity: "medium",
        message: `Goods shortage: ${shortage}%.`,
        suggestedFix: "Zone more industry or improve industrial traffic.",
      },
    ];
  }
  return [];
}

function getLoanWarnings(state: CityState): Warning[] {
  const loans = state.economy.loans;
  const highestMissedPayments = Math.max(0, ...loans.map((loan) => loan.missedPayments));
  if (highestMissedPayments >= 2) return [createLoanWarning("critical")];
  if (highestMissedPayments >= 1) return [createLoanWarning("high")];
  if (loans.length > 0) return [createLoanWarning("low")];
  if (isEligibleForLoan(state)) {
    return [
      {
        id: "city:low-funds",
        severity: "medium",
        message: "City funds are running low.",
        suggestedFix: "Take a loan or reduce expenses.",
      },
    ];
  }
  return [];
}

function createLoanWarning(severity: Warning["severity"]): Warning {
  const missedLabel =
    severity === "critical" ? "Loan default imminent." : "Loan payment due.";
  return {
    id: severity === "low" ? "city:outstanding-loans" : "city:loan-payment-due",
    severity,
    message:
      severity === "low" ? "Outstanding loans require monthly payments." : missedLabel,
    suggestedFix: "Raise funds before the next economy tick.",
  };
}

function isEligibleForLoan(state: CityState): boolean {
  return (
    state.economy.money < LOAN_BALANCE.ELIGIBILITY_THRESHOLD &&
    state.economy.loans.length < LOAN_BALANCE.MAX_LOANS &&
    state.time.tick - state.economy.lastLoanTick >=
      monthsToTicks(LOAN_BALANCE.COOLDOWN_TICKS)
  );
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
