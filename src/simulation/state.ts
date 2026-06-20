import { DEFAULT_TAX_RATE, HAPPINESS_DEFAULTS, STARTING_MONEY } from "../data/balance";
import { FIRST_SETTLEMENT } from "../data/scenarios/first_settlement";
import type { CityState } from "../shared/types";
import { createMap } from "./grid/map";

export function createInitialCityState(): CityState {
  return {
    map: createMap(),
    buildings: [],
    roads: [],
    economy: {
      money: STARTING_MONEY,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      taxRates: {
        residential: DEFAULT_TAX_RATE,
        commercial: DEFAULT_TAX_RATE,
        industrial: DEFAULT_TAX_RATE,
      },
      isBankrupt: false,
      monthsBelowZero: 0,
    },
    population: {
      total: 0,
      residentialCapacity: 0,
      employedWorkers: 0,
      unemployedWorkers: 0,
      growthRate: 0,
    },
    demand: { residential: 50, commercial: 30, industrial: 30 },
    services: {
      powerCapacity: 0,
      powerDemand: 0,
      waterCapacity: 0,
      waterDemand: 0,
      healthCoverage: 0,
      educationCoverage: 0,
    },
    traffic: createInitialTrafficState(),
    happiness: {
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
      },
    },
    neighborhoods: [],
    neighborhoodMode: "auto",
    progression: {
      currentMilestone: 0,
      unlockedFeatures: [...FIRST_SETTLEMENT.initialUnlocks],
      completedObjectives: [],
      scenarioStatus: "active",
    },
    warnings: [],
    time: { tick: 0, month: 1, year: 1, speed: 1 },
  };
}

function createInitialTrafficState() {
  return {
    cityCongestion: 0,
    totalTrips: 0,
    happinessPenalty: 0,
    commercialMultiplier: 1,
    industrialMultiplier: 1,
    segments: [],
  };
}
