import {
  BANKRUPTCY_GRACE_MONTHS,
  MONTHLY_UPKEEP,
  TAX_INCOME_FORMULAS,
  TRANSPORT_BALANCE,
  TRAFFIC_BALANCE,
  DISTRICT_BALANCE,
  calculateTaxIncome,
} from "../../data/balance";
import { getBuildingById } from "../../data/buildings";
import type { CityState } from "../../shared/types";
import type { CityMetrics } from "./metrics";
import { processLoanPayments } from "./loans";
import { getDistrictPolicyCost, getTaxBreakShare } from "./districts";
import { getCommercialLandValueMultiplier } from "./land-productivity";
import { getSpecializationMultiplier } from "./specialization";
import { getEventTaxMultiplier } from "./events";

export function runEconomy(state: CityState, metrics: CityMetrics): void {
  const income = calculateMonthlyIncome(state, metrics);
  const expenses = calculateMonthlyExpenses(state);
  state.economy.monthlyIncome = income;
  state.economy.monthlyExpenses = expenses;
  state.economy.money += income - expenses;
  state.economy.monthlyExpenses += processLoanPayments(state);
  if (state.progression.scenarioStatus === "lost") return;
  updateBankruptcyState(state);
}

export function calculateMonthlyIncome(state: CityState, metrics: CityMetrics): number {
  const residentialBase =
    state.population.total * TAX_INCOME_FORMULAS.RESIDENTIAL_BASE_PER_PERSON;
  const commercialBase = calculateCommercialTaxBase(state, metrics);
  const industrialBase =
    metrics.industrialJobsFilled * TAX_INCOME_FORMULAS.INDUSTRIAL_BASE_PER_JOB;

  const residentialIncome = calculateTaxIncome(
    residentialBase,
    state.economy.taxRates.residential,
  );
  const commercialIncome = calculateTaxIncome(
    commercialBase *
      state.traffic.commercialMultiplier *
      state.goods.commercialMultiplier *
      (1 + state.services.educationQuality * 0.002) *
      getSpecializationMultiplier(state, "commercial"),
    state.economy.taxRates.commercial,
  );
  const industrialIncome = calculateTaxIncome(
    industrialBase *
      state.traffic.industrialMultiplier *
      (1 + state.services.educationQuality * 0.001) *
      getSpecializationMultiplier(state, "industrial"),
    state.economy.taxRates.industrial,
  );
  return (
    Math.round(
      applyTaxBreak(state, "residential", residentialIncome) +
        applyTaxBreak(state, "commercial", commercialIncome) +
        applyTaxBreak(state, "industrial", industrialIncome),
    ) *
      getEventTaxMultiplier(state) +
    state.office.taxIncome +
    state.tourism.income * getSpecializationMultiplier(state, "tourism")
  );
}

function calculateCommercialTaxBase(state: CityState, metrics: CityMetrics): number {
  if (metrics.commercialJobs === 0) return 0;
  const employmentRate = metrics.commercialJobsFilled / metrics.commercialJobs;
  return state.buildings.reduce((total, building) => {
    const definition = getBuildingById(building.definitionId);
    if (building.status !== "active" || definition?.category !== "commercial") {
      return total;
    }
    const jobs = definition.effects.jobs ?? 0;
    return (
      total +
      jobs *
        employmentRate *
        TAX_INCOME_FORMULAS.COMMERCIAL_BASE_PER_JOB *
        getCommercialLandValueMultiplier(state, building)
    );
  }, 0);
}

export function calculateMonthlyExpenses(state: CityState): number {
  return (
    calculateRoadUpkeep(state) +
    calculateBuildingUpkeep(state) +
    calculateTransportUpkeep(state) +
    state.traffic.trafficLights.length * TRAFFIC_BALANCE.TRAFFIC_LIGHT_UPKEEP +
    getDistrictPolicyCost(state)
  );
}

function applyTaxBreak(
  state: CityState,
  category: "residential" | "commercial" | "industrial",
  income: number,
): number {
  const share = getTaxBreakShare(state, category);
  return income * (1 - share * DISTRICT_BALANCE.TAX_BREAK_REDUCTION);
}

function calculateTransportUpkeep(state: CityState): number {
  return (
    state.publicTransport.stops.length * TRANSPORT_BALANCE.BUS_STOP_UPKEEP +
    state.publicTransport.routes.length * TRANSPORT_BALANCE.BUS_ROUTE_UPKEEP
  );
}

function calculateRoadUpkeep(state: CityState): number {
  return state.roads.reduce((total, road) => {
    const upkeep = getRoadUpkeep(road.type);
    return total + upkeep;
  }, 0);
}

function getRoadUpkeep(type: CityState["roads"][number]["type"]): number {
  if (type === "dirt") return MONTHLY_UPKEEP.DIRT_ROAD_PER_TILE;
  if (type === "paved") return MONTHLY_UPKEEP.PAVED_ROAD_PER_TILE;
  return type === "local"
    ? TRAFFIC_BALANCE.LOCAL_ROAD_UPKEEP
    : type === "collector"
      ? TRAFFIC_BALANCE.COLLECTOR_ROAD_UPKEEP
      : TRAFFIC_BALANCE.ARTERIAL_ROAD_UPKEEP;
}

function calculateBuildingUpkeep(state: CityState): number {
  return state.buildings.reduce((total, building) => {
    const definition = getBuildingById(building.definitionId);
    return total + (definition?.upkeep ?? 0);
  }, 0);
}

function updateBankruptcyState(state: CityState): void {
  if (state.economy.money >= 0) {
    state.economy.monthsBelowZero = 0;
    state.economy.isBankrupt = false;
    return;
  }

  state.economy.monthsBelowZero += 1;
  state.economy.isBankrupt = state.economy.monthsBelowZero >= BANKRUPTCY_GRACE_MONTHS;
}
