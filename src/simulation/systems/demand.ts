import { DEMAND_PARAMS, HAPPINESS_DEFAULTS } from "../../data/balance";
import type { CityState, DemandState } from "../../shared/types";
import type { CityMetrics } from "./metrics";
import { getAvailableHousing, getAvailableJobs, getDefinition } from "./metrics";
import { getNightlifeDemandBonus } from "./districts";

export function recomputeDemand(state: CityState, metrics: CityMetrics): void {
  state.demand = calculateDemand(state, metrics);
  const totalCapacity = getOfficeCapacity(state);
  const workforceRatio = Math.min(1, state.services.workforceQuality / 100);
  state.office = {
    unlocked: state.population.total >= 5000 && state.services.workforceQuality >= 40,
    totalCapacity,
    filledJobs: Math.round(totalCapacity * workforceRatio),
    taxIncome: Math.round(
      totalCapacity * workforceRatio * 10 * (state.economy.taxRates.commercial / 10),
    ),
  };
}

export function calculateDemand(state: CityState, metrics: CityMetrics): DemandState {
  const happinessModifier = state.happiness.value - HAPPINESS_DEFAULTS.BASE;
  const population = state.population.total;
  const availableJobs = getAvailableJobs(metrics, population);
  const availableHousing = getAvailableHousing(metrics, population);
  const workerShortagePenalty = Math.max(0, metrics.totalJobs - population) * 0.2;
  const pollutionPenalty = getAveragePollution(state) * 0.1;

  return {
    residential: clampDemand(
      DEMAND_PARAMS.RESIDENTIAL_BASE +
        availableJobs * DEMAND_PARAMS.RESIDENTIAL_JOB_WEIGHT +
        happinessModifier +
        state.rating.immigrationModifier * 20 +
        availableHousing * Math.abs(DEMAND_PARAMS.RESIDENTIAL_HOUSING_WEIGHT) -
        getResidentialUnemploymentPenalty(metrics.unemployedWorkers),
    ),
    commercial: clampDemand(
      DEMAND_PARAMS.COMMERCIAL_BASE +
        population / DEMAND_PARAMS.COMMERCIAL_POPULATION_DIVISOR +
        metrics.commercialJobs * DEMAND_PARAMS.COMMERCIAL_CAP_WEIGHT -
        workerShortagePenalty +
        getNightlifeDemandBonus(state),
    ),
    industrial: clampDemand(
      DEMAND_PARAMS.INDUSTRIAL_BASE +
        metrics.unemployedWorkers * DEMAND_PARAMS.INDUSTRIAL_UNEMPLOYMENT_WEIGHT +
        metrics.industrialJobs * DEMAND_PARAMS.INDUSTRIAL_CAP_WEIGHT -
        pollutionPenalty,
    ),
    office: clampDemand(
      20 + state.services.workforceQuality * 0.5 - getOfficeCapacity(state) * 0.3,
    ),
  };
}

function getResidentialUnemploymentPenalty(unemployedWorkers: number): number {
  const rawPenalty =
    unemployedWorkers * Math.abs(DEMAND_PARAMS.RESIDENTIAL_UNEMPLOYMENT_WEIGHT);
  return Math.min(rawPenalty, DEMAND_PARAMS.RESIDENTIAL_UNEMPLOYMENT_PENALTY_CAP);
}

function getOfficeCapacity(state: CityState): number {
  return state.buildings.reduce((total, building) => {
    const definition = getDefinition(building);
    return (
      total +
      (building.status === "active" && definition?.effects.office
        ? (definition.effects.jobs ?? 0)
        : 0)
    );
  }, 0);
}

function clampDemand(value: number): number {
  return Math.round(Math.max(DEMAND_PARAMS.MIN, Math.min(DEMAND_PARAMS.MAX, value)));
}

function getAveragePollution(state: CityState): number {
  const pollution = state.map.flat().reduce((total, tile) => total + tile.pollution, 0);
  return pollution / state.map.flat().length;
}
