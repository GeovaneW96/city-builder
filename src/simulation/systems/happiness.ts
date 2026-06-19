import {
  HAPPINESS_DEFAULTS,
  POLLUTION_BALANCE,
  SERVICE_HAPPINESS,
  getTaxHappinessModifier,
} from "../../data/balance";
import { getBuildingById } from "../../data/buildings";
import type { CityState } from "../../shared/types";

export function recomputeHappiness(state: CityState): void {
  const tax = calculateTaxComponent(state);
  const unemployment = calculateUnemploymentPenalty(state);
  const services = calculateServicesBonus(state);
  const pollution = calculatePollutionPenalty(state);
  const parks = calculateParkBonus(state);
  const utility = calculateUtilityPenalty(state);
  const value = clamp(
    HAPPINESS_DEFAULTS.BASE + tax + unemployment + services + pollution + parks + utility,
  );

  state.happiness = {
    value,
    components: {
      base: HAPPINESS_DEFAULTS.BASE,
      tax,
      unemployment,
      services,
      pollution,
      parks,
      utility,
    },
  };
}

function calculateTaxComponent(state: CityState): number {
  const rates = state.economy.taxRates;
  const total =
    getTaxHappinessModifier(rates.residential) +
    getTaxHappinessModifier(rates.commercial) +
    getTaxHappinessModifier(rates.industrial);
  return Math.round(total / 3);
}

function calculateUnemploymentPenalty(state: CityState): number {
  if (state.population.total === 0) return 0;
  const rate = state.population.unemployedWorkers / state.population.total;
  return -Math.round(
    Math.min(
      HAPPINESS_DEFAULTS.UNEMPLOYMENT_PENALTY_CAP,
      rate * HAPPINESS_DEFAULTS.UNEMPLOYMENT_FULL_RATE_PENALTY,
    ),
  );
}

function calculateServicesBonus(state: CityState): number {
  const health =
    (state.services.healthCoverage / 100) * SERVICE_HAPPINESS.FULL_HEALTH_COVERAGE_BONUS;
  const education =
    (state.services.educationCoverage / 100) *
    SERVICE_HAPPINESS.FULL_EDUCATION_COVERAGE_BONUS;
  return Math.round(health + education);
}

function calculatePollutionPenalty(state: CityState): number {
  const pollutedHomes = state.buildings.filter((building) => {
    const definition = getBuildingById(building.definitionId);
    return definition?.category === "residential" && building.status === "active";
  });
  if (pollutedHomes.length === 0) return 0;
  const totalPollution = pollutedHomes.reduce((total, building) => {
    const [x, y] = building.position;
    return total + (state.map[y]?.[x]?.pollution ?? 0);
  }, 0);
  return -Math.round(
    totalPollution / pollutedHomes.length / POLLUTION_BALANCE.HAPPINESS_DIVISOR,
  );
}

function calculateParkBonus(state: CityState): number {
  const bonus = state.buildings.reduce((total, building) => {
    const definition = getBuildingById(building.definitionId);
    if (building.status !== "active" || definition?.id !== "park") return total;
    return total + (definition.effects.happiness ?? 0);
  }, 0);
  return Math.min(SERVICE_HAPPINESS.PARK_BONUS_CAP, bonus);
}

function calculateUtilityPenalty(state: CityState): number {
  const powerShortage = state.services.powerDemand > state.services.powerCapacity;
  const waterShortage = state.services.waterDemand > state.services.waterCapacity;
  if (!powerShortage && !waterShortage) return 0;
  return SERVICE_HAPPINESS.UTILITY_SHORTAGE_PENALTY;
}

function clamp(value: number): number {
  return Math.round(
    Math.max(HAPPINESS_DEFAULTS.MIN, Math.min(HAPPINESS_DEFAULTS.MAX, value)),
  );
}
