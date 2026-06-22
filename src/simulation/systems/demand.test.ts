import { describe, expect, it } from "vitest";
import { createInitialCityState } from "../state";
import { calculateDemand } from "./demand";
import type { CityMetrics } from "./metrics";

describe("residential demand", () => {
  it("keeps a positive early-game demand when unemployment is high", () => {
    const state = createInitialCityState();
    state.population.total = 1000;
    state.happiness.value = 54;
    const metrics = createMetrics();

    expect(calculateDemand(state, metrics).residential).toBe(18);
  });
});

function createMetrics(): CityMetrics {
  return {
    activeBuildings: [],
    residentialCapacity: 1000,
    commercialJobs: 0,
    industrialJobs: 0,
    serviceJobs: 0,
    totalJobs: 0,
    employedWorkers: 0,
    unemployedWorkers: 1000,
    commercialJobsFilled: 0,
    industrialJobsFilled: 0,
  };
}
