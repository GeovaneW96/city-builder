import { describe, expect, it } from "vitest";
import { createInitialCityState } from "../state";
import { updateAchievements } from "./achievements";
import { calculateDemand } from "./demand";
import { calculateCityMetrics } from "./metrics";
import { recomputeRating } from "./rating";

describe("city rating", () => {
  it("computes an A grade and positive immigration modifier for a healthy city", () => {
    const state = createInitialCityState();
    state.economy.monthlyIncome = 1000;
    state.economy.monthlyExpenses = 100;
    state.happiness.value = 100;
    state.services = {
      powerCapacity: 100,
      powerDemand: 100,
      waterCapacity: 100,
      waterDemand: 100,
      healthCoverage: 100,
      educationCoverage: 100,
    };
    state.population.total = 100;
    state.population.growthRate = 10;

    recomputeRating(state);

    expect(state.rating.grade).toBe("A");
    expect(state.rating.immigrationModifier).toBe(0.1);
    expect(state.rating.components).toMatchObject({ happiness: 100, services: 100 });
  });

  it("uses the rating immigration modifier in residential demand", () => {
    const state = createInitialCityState();
    const metrics = calculateCityMetrics(state);
    state.rating.immigrationModifier = 0.1;
    const highDemand = calculateDemand(state, metrics).residential;
    state.rating.immigrationModifier = -0.2;

    expect(highDemand).toBeGreaterThan(calculateDemand(state, metrics).residential);
  });
});

describe("achievements", () => {
  it("unlocks data-driven achievements only once and applies their reward", () => {
    const state = createInitialCityState();
    state.population.total = 100;

    updateAchievements(state);
    updateAchievements(state);

    expect(state.achievements).toEqual([{ id: "first_steps", unlockedAt: 0 }]);
    expect(state.economy.money).toBe(51000);
  });
});
