import { describe, expect, it } from "vitest";
import { createInitialCityState } from "../state";
import { updateAchievementProgress, updateAchievements } from "./achievements";
import { DAYS_PER_MONTH } from "./time";

describe("achievement system", () => {
  it("unlocks a reward once and emits an event", () => {
    const state = createInitialCityState();
    state.population.total = 100;

    const first = updateAchievements(state);
    const second = updateAchievements(state);

    expect(first).toEqual([
      { type: "ACHIEVEMENT_UNLOCKED", achievementId: "first_steps", reward: 1000 },
    ]);
    expect(second).toEqual([]);
    expect(state.economy.money).toBe(51000);
  });

  it("tracks and resets consecutive happiness and income achievements", () => {
    const state = createInitialCityState();
    state.happiness.value = 81;
    state.economy.monthlyIncome = 10;
    for (let index = 0; index < 10; index += 1) updateAchievementProgress(state);
    expect(
      updateAchievements(state).some(
        (event) =>
          event.type === "ACHIEVEMENT_UNLOCKED" && event.achievementId === "happy_town",
      ),
    ).toBe(true);

    state.happiness.value = 80;
    state.economy.monthlyIncome = 0;
    state.time.day = DAYS_PER_MONTH;
    updateAchievementProgress(state);
    expect(state.achievementProgress.happyTickStreak).toBe(0);
    expect(state.achievementProgress.positiveIncomeMonthStreak).toBe(0);
  });

  it("counts positive income streaks by month instead of by day", () => {
    const state = createInitialCityState();
    state.economy.monthlyIncome = 10;

    updateAchievementProgress(state);
    expect(state.achievementProgress.positiveIncomeMonthStreak).toBe(0);

    state.time.day = DAYS_PER_MONTH;
    updateAchievementProgress(state);
    expect(state.achievementProgress.positiveIncomeMonthStreak).toBe(1);
  });

  it("preserves a negative-money history for the no-debt achievement", () => {
    const state = createInitialCityState();
    state.economy.money = -1;
    updateAchievementProgress(state);
    state.economy.money = 100;
    state.population.total = 1000;

    expect(
      updateAchievements(state).some(
        (event) =>
          event.type === "ACHIEVEMENT_UNLOCKED" && event.achievementId === "no_debt",
      ),
    ).toBe(false);
  });
});
