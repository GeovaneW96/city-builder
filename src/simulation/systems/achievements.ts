import { ACHIEVEMENTS } from "../../data/achievements";
import type { CityState } from "../../shared/types";

export function updateAchievements(state: CityState): void {
  ACHIEVEMENTS.forEach((achievement) => {
    if (state.achievements.some((saved) => saved.id === achievement.id)) return;
    if (isUnlocked(state, achievement.id)) {
      state.achievements.push({ id: achievement.id, unlockedAt: state.time.tick });
      state.economy.money += achievement.reward;
    }
  });
}

function isUnlocked(state: CityState, achievementId: string): boolean {
  if (achievementId === "first_steps") return state.population.total >= 100;
  if (achievementId === "happy_town") return state.happiness.value >= 80;
  return achievementId === "road_builder" && state.roads.length >= 100;
}
