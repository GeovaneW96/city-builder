import { ACHIEVEMENTS } from "../../data/achievements";
import { MILESTONES } from "../../data/unlocks/milestones";
import type { AchievementDefinition, CityState, GameEvent } from "../../shared/types";
import { isLastDayOfMonth } from "./time";

export function updateAchievementProgress(state: CityState): void {
  const progress = state.achievementProgress;
  progress.moneyEverNegative ||= state.economy.money < 0;
  progress.pollutionStayedLow &&= getAveragePollution(state) < 10;
  progress.happyTickStreak =
    state.happiness.value > 80 ? progress.happyTickStreak + 1 : 0;
  if (!isLastDayOfMonth(state.time)) return;
  const netIncome = state.economy.monthlyIncome - state.economy.monthlyExpenses;
  progress.positiveIncomeMonthStreak =
    netIncome > 0 ? progress.positiveIncomeMonthStreak + 1 : 0;
}

export function updateAchievements(state: CityState): GameEvent[] {
  const events: GameEvent[] = [];
  ACHIEVEMENTS.forEach((achievement) => {
    if (state.achievements.some((saved) => saved.id === achievement.id)) return;
    if (isUnlocked(state, achievement)) {
      state.achievements.push({ id: achievement.id, unlockedAt: state.time.tick });
      state.economy.money += achievement.reward;
      events.push({
        type: "ACHIEVEMENT_UNLOCKED",
        achievementId: achievement.id,
        reward: achievement.reward,
      });
    }
  });
  return events;
}

function isUnlocked(state: CityState, achievement: AchievementDefinition): boolean {
  return ACHIEVEMENT_CONDITIONS[achievement.condition](state);
}

const ACHIEVEMENT_CONDITIONS: Record<
  AchievementDefinition["condition"],
  (state: CityState) => boolean
> = {
  population_100: (state) => state.population.total >= 100,
  no_debt_1000: (state) =>
    state.population.total >= 1000 && !state.achievementProgress.moneyEverNegative,
  green_start_500: (state) =>
    state.population.total >= 500 && state.achievementProgress.pollutionStayedLow,
  happy_streak: (state) => state.achievementProgress.happyTickStreak >= 10,
  efficient_planner_1000: (state) =>
    state.population.total >= 1000 && state.roads.length < 100,
  positive_income_streak: (state) =>
    state.achievementProgress.positiveIncomeMonthStreak >= 12,
  all_milestones: (state) => hasAllMilestones(state),
  roads_placed: (state) => state.achievementProgress.roadsPlaced >= 500,
};

function hasAllMilestones(state: CityState): boolean {
  const finalMilestone = MILESTONES[MILESTONES.length - 1];
  return Boolean(
    finalMilestone && state.progression.currentMilestone >= finalMilestone.population,
  );
}

function getAveragePollution(state: CityState): number {
  const tiles = state.map.flat();
  return tiles.reduce((total, tile) => total + tile.pollution, 0) / tiles.length;
}
