import { RATING_BALANCE } from "../../data/balance";
import { getBuildingById } from "../../data/buildings";
import type { CityGrade, CityState } from "../../shared/types";

export function recomputeRating(state: CityState): void {
  const components = {
    economy: getEconomyScore(state),
    happiness: state.happiness.value,
    services: getServicesScore(state),
    environment: getEnvironmentScore(state),
    growth: getGrowthScore(state),
  };
  const score = Math.round(
    components.economy * RATING_BALANCE.ECONOMY_WEIGHT +
      components.happiness * RATING_BALANCE.HAPPINESS_WEIGHT +
      components.services * RATING_BALANCE.SERVICES_WEIGHT +
      components.environment * RATING_BALANCE.ENVIRONMENT_WEIGHT +
      components.growth * RATING_BALANCE.GROWTH_WEIGHT,
  );
  const grade = getGrade(score);
  state.rating = {
    score,
    grade,
    immigrationModifier: getImmigrationModifier(grade),
    components,
  };
}

function getEconomyScore(state: CityState): number {
  if (state.economy.isBankrupt) return 0;
  const netIncome = state.economy.monthlyIncome - state.economy.monthlyExpenses;
  const reserve = state.economy.money >= 10000 ? 20 : state.economy.money >= 0 ? 10 : 0;
  const incomeScore = netIncome > 0 ? 70 : netIncome === 0 ? 45 : 20;
  return incomeScore + reserve - Math.min(20, state.economy.loans.length * 7);
}

function getServicesScore(state: CityState): number {
  const utility =
    state.services.powerDemand === 0
      ? 100
      : Math.min(100, (state.services.powerCapacity / state.services.powerDemand) * 100);
  return Math.round(
    (utility + state.services.healthCoverage + state.services.educationCoverage) / 3,
  );
}

function getEnvironmentScore(state: CityState): number {
  const pollution =
    state.map.flat().reduce((total, tile) => total + tile.pollution, 0) / (64 * 64);
  const parks = state.buildings.filter(
    (building) => getBuildingById(building.definitionId)?.id === "park",
  ).length;
  return Math.max(
    0,
    Math.min(100, Math.round(100 - pollution * 2 + Math.min(20, parks * 4))),
  );
}

function getGrowthScore(state: CityState): number {
  if (state.population.total === 0) return 0;
  const percentage = (state.population.growthRate / state.population.total) * 100;
  if (percentage > 5) return 90;
  if (percentage > 2) return 70;
  if (percentage >= -1) return 50;
  if (percentage >= -5) return 30;
  return 10;
}

function getGrade(score: number): CityGrade {
  if (score >= RATING_BALANCE.A_THRESHOLD) return "A";
  if (score >= RATING_BALANCE.B_THRESHOLD) return "B";
  if (score >= RATING_BALANCE.C_THRESHOLD) return "C";
  return score >= RATING_BALANCE.D_THRESHOLD ? "D" : "F";
}

function getImmigrationModifier(grade: CityGrade): number {
  if (grade === "A") return RATING_BALANCE.A_IMMIGRATION;
  if (grade === "B") return RATING_BALANCE.B_IMMIGRATION;
  if (grade === "C") return RATING_BALANCE.C_IMMIGRATION;
  return grade === "D" ? RATING_BALANCE.D_IMMIGRATION : RATING_BALANCE.F_IMMIGRATION;
}
