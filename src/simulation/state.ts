import {
  DEFAULT_TAX_RATE,
  HAPPINESS_DEFAULTS,
  LOAN_BALANCE,
  STARTING_MONEY,
} from "../data/balance";
import { FIRST_SETTLEMENT } from "../data/scenarios/first_settlement";
import type { BiomeType, CityState } from "../shared/types";
import { createMap } from "./grid/map";

export function createInitialCityState(
  biome: BiomeType = (FIRST_SETTLEMENT.biome as BiomeType) ?? "temperate",
): CityState {
  return {
    premium: false,
    map: createMap(FIRST_SETTLEMENT.mapSize, biome),
    buildings: [],
    roads: [],
    economy: createInitialEconomy(),
    population: {
      total: 0,
      residentialCapacity: 0,
      employedWorkers: 0,
      unemployedWorkers: 0,
      growthRate: 0,
    },
    demand: { residential: 50, commercial: 30, industrial: 30, office: 20 },
    office: { unlocked: false, totalCapacity: 0, filledJobs: 0, taxIncome: 0 },
    tourism: createInitialTourism(),
    specialization: { active: null, lastSwitchTick: -12 },
    events: [],
    services: {
      powerCapacity: 0,
      powerDemand: 0,
      waterCapacity: 0,
      waterDemand: 0,
      healthCoverage: 0,
      educationCoverage: 0,
      healthQuality: 0,
      educationQuality: 0,
      workforceQuality: 0,
    },
    traffic: createInitialTrafficState(),
    goods: createInitialGoodsState(),
    extendedServices: createInitialExtendedServicesState(),
    publicTransport: createInitialPublicTransportState(),
    rating: createInitialRatingState(),
    achievements: [],
    achievementProgress: createInitialAchievementProgress(),
    happiness: createInitialHappinessState(),
    neighborhoods: [],
    neighborhoodMode: "auto",
    districts: [],
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

function createInitialEconomy() {
  return {
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
    loans: [],
    lastLoanTick: -LOAN_BALANCE.COOLDOWN_TICKS,
    tourismIncome: 0,
  };
}

function createInitialTourism() {
  return {
    income: 0,
    attractiveness: {
      score: 0,
      breakdown: {
        parks: 0,
        landmarks: 0,
        serviceCoverage: 0,
        lowPollution: 0,
        beaches: 0,
      },
    },
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
    agents: [],
    queuedAgents: [],
    intersections: [],
    trafficLights: [],
    roadNetworkDirty: true,
    nextAgentId: 1,
    lastAgentTick: -1,
  };
}

function createInitialAchievementProgress() {
  return {
    moneyEverNegative: false,
    pollutionStayedLow: true,
    happyTickStreak: 0,
    positiveIncomeMonthStreak: 0,
    roadsPlaced: 0,
  };
}

function createInitialGoodsState() {
  return {
    demand: 0,
    supply: 0,
    balance: 0,
    shortagePercentage: 0,
    happinessPenalty: 0,
    commercialMultiplier: 1,
  };
}

function createInitialHappinessState() {
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

function createInitialExtendedServicesState() {
  return {
    policeCoverage: 0,
    fireCoverage: 0,
    crimeRate: 0,
    crimeHappinessPenalty: 0,
    totalUncollectedGarbage: 0,
    monthlyGarbageProduction: 0,
    monthlyGarbageCollected: 0,
    garbageHappinessPenalty: 0,
  };
}

function createInitialPublicTransportState() {
  return {
    stops: [],
    routes: [],
    coveredBuildingIds: [],
    ridership: 0,
    activeRouteCount: 0,
    happinessBonus: 0,
  };
}

function createInitialRatingState() {
  return {
    score: 0,
    grade: "F" as const,
    immigrationModifier: -0.2,
    components: { economy: 0, happiness: 0, services: 0, environment: 0, growth: 0 },
  };
}
