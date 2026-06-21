import {
  HAPPINESS_DEFAULTS,
  POLLUTION_BALANCE,
  SERVICE_HAPPINESS,
  getTaxHappinessModifier,
} from "../../data/balance";
import { getBuildingById } from "../../data/buildings";
import type { CityState, HappinessState, Neighborhood } from "../../shared/types";
import { recomputeNeighborhoods } from "./neighborhoods";
import { getBuildingPolicyHappiness } from "./districts";
import { getEventHappinessModifier } from "./events";

export function recomputeHappiness(state: CityState): void {
  const neighborhoods = recomputeNeighborhoods(state);
  if (state.population.total === 0) {
    state.happiness = createBaseHappiness();
    return;
  }
  if (neighborhoods.length > 0) {
    state.happiness = calculateCityHappiness(neighborhoods);
    return;
  }
  state.happiness = calculateGlobalHappiness(state);
}

function createBaseHappiness(): HappinessState {
  return {
    value: HAPPINESS_DEFAULTS.BASE,
    components: {
      base: HAPPINESS_DEFAULTS.BASE,
      tax: 0,
      unemployment: 0,
      services: 0,
      pollution: 0,
      parks: 0,
      utility: 0,
      traffic: 0,
      goods: 0,
      crime: 0,
      garbage: 0,
      transit: 0,
      policies: 0,
    },
  };
}

function calculateCityHappiness(neighborhoods: Neighborhood[]): HappinessState {
  const totalPopulation = neighborhoods.reduce(
    (total, neighborhood) => total + neighborhood.population,
    0,
  );
  if (totalPopulation === 0) return createBaseHappiness();
  return {
    value: getWeightedValue(neighborhoods, totalPopulation, "happiness"),
    components: {
      base: getWeightedComponent(neighborhoods, totalPopulation, "base"),
      tax: getWeightedComponent(neighborhoods, totalPopulation, "tax"),
      unemployment: getWeightedComponent(neighborhoods, totalPopulation, "unemployment"),
      services: getWeightedComponent(neighborhoods, totalPopulation, "services"),
      pollution: getWeightedComponent(neighborhoods, totalPopulation, "pollution"),
      parks: getWeightedComponent(neighborhoods, totalPopulation, "parks"),
      utility: getWeightedComponent(neighborhoods, totalPopulation, "utility"),
      traffic: getWeightedComponent(neighborhoods, totalPopulation, "traffic"),
      goods: getWeightedComponent(neighborhoods, totalPopulation, "goods"),
      crime: getWeightedComponent(neighborhoods, totalPopulation, "crime"),
      garbage: getWeightedComponent(neighborhoods, totalPopulation, "garbage"),
      transit: getWeightedComponent(neighborhoods, totalPopulation, "transit"),
      policies: getWeightedComponent(neighborhoods, totalPopulation, "policies"),
    },
  };
}

function getWeightedValue(
  neighborhoods: Neighborhood[],
  totalPopulation: number,
  field: "happiness",
): number {
  return Math.round(
    neighborhoods.reduce(
      (total, neighborhood) => total + neighborhood[field] * neighborhood.population,
      0,
    ) / totalPopulation,
  );
}

function getWeightedComponent(
  neighborhoods: Neighborhood[],
  totalPopulation: number,
  component: keyof HappinessState["components"],
): number {
  return Math.round(
    neighborhoods.reduce(
      (total, neighborhood) =>
        total + neighborhood.components[component] * neighborhood.population,
      0,
    ) / totalPopulation,
  );
}

function calculateGlobalHappiness(state: CityState): HappinessState {
  const tax = calculateTaxComponent(state);
  const unemployment = calculateUnemploymentPenalty(state);
  const services = calculateServicesBonus(state);
  const pollution = calculatePollutionPenalty(state);
  const parks = calculateParkBonus(state);
  const utility = calculateUtilityPenalty(state);
  const traffic = -state.traffic.happinessPenalty;
  const goods = -state.goods.happinessPenalty;
  const crime = state.extendedServices.crimeHappinessPenalty;
  const garbage = state.extendedServices.garbageHappinessPenalty;
  const transit = state.publicTransport.happinessBonus;
  const policies = calculatePolicyHappiness(state);
  const events = getEventHappinessModifier(state);
  const value = clamp(
    HAPPINESS_DEFAULTS.BASE +
      tax +
      unemployment +
      services +
      pollution +
      parks +
      utility +
      traffic +
      goods +
      crime +
      garbage +
      transit +
      policies +
      events,
  );

  return {
    value,
    components: {
      base: HAPPINESS_DEFAULTS.BASE,
      tax,
      unemployment,
      services,
      pollution,
      parks,
      utility,
      traffic,
      goods,
      crime,
      garbage,
      transit,
      policies,
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
  return Math.round(health + education + state.services.healthQuality / 10);
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

function calculatePolicyHappiness(state: CityState): number {
  const residential = state.buildings.filter((building) => {
    const definition = getBuildingById(building.definitionId);
    return definition?.category === "residential" && building.status === "active";
  });
  if (residential.length === 0) return 0;
  return Math.round(
    residential.reduce(
      (total, building) => total + getBuildingPolicyHappiness(state, building),
      0,
    ) / residential.length,
  );
}

function clamp(value: number): number {
  return Math.round(
    Math.max(HAPPINESS_DEFAULTS.MIN, Math.min(HAPPINESS_DEFAULTS.MAX, value)),
  );
}
