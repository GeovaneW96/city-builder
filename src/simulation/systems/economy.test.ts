import { describe, expect, it } from "vitest";
import { createInitialCityState } from "../state";
import { calculateCityMetrics } from "./metrics";
import { runEconomy } from "./economy";

describe("daily economy accrual", () => {
  it("updates money by one day of monthly net income", () => {
    const state = createInitialCityState();
    state.population.total = 300;
    state.time.day = 2;

    runEconomy(state, calculateCityMetrics(state));

    expect(state.economy.monthlyIncome).toBe(600);
    expect(state.economy.monthlyExpenses).toBe(0);
    expect(state.economy.money).toBe(50020);
  });

  it("increments bankruptcy grace only at month end", () => {
    const state = createInitialCityState();
    state.economy.money = -1;
    state.time.day = 12;

    runEconomy(state, calculateCityMetrics(state));
    expect(state.economy.monthsBelowZero).toBe(0);

    state.time.day = 30;
    runEconomy(state, calculateCityMetrics(state));
    expect(state.economy.monthsBelowZero).toBe(1);
  });
});
