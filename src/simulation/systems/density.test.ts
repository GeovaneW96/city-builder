import { describe, expect, it } from "vitest";
import { processCityCommand } from "../commands/process";
import { createInitialCityState } from "../state";
import { calculateDemand, recomputeDemand } from "./demand";
import { calculateCityMetrics } from "./metrics";

describe("density and office zoning", () => {
  it("gates medium, high, and office zones by their documented thresholds", () => {
    const state = createInitialCityState();
    expect(
      processCityCommand(state, {
        type: "PAINT_ZONE",
        x: 1,
        y: 1,
        zoneType: "medium_residential",
      }).result.success,
    ).toBe(false);
    state.population.total = 2500;
    expect(
      processCityCommand(state, {
        type: "PAINT_ZONE",
        x: 1,
        y: 1,
        zoneType: "medium_residential",
      }).result.success,
    ).toBe(true);
    expect(
      processCityCommand(state, {
        type: "PAINT_ZONE",
        x: 2,
        y: 1,
        zoneType: "high_residential",
      }).result.success,
    ).toBe(false);
    state.population.total = 5000;
    state.services.workforceQuality = 40;
    expect(
      processCityCommand(state, { type: "PAINT_ZONE", x: 2, y: 1, zoneType: "office" })
        .result.success,
    ).toBe(true);
  });

  it("calculates office demand and state from workforce quality and capacity", () => {
    const state = createInitialCityState();
    state.population.total = 5000;
    state.services.workforceQuality = 40;
    recomputeDemand(state, calculateCityMetrics(state));

    expect(state.demand.office).toBe(40);
    expect(state.office.unlocked).toBe(true);
    expect(calculateDemand(state, calculateCityMetrics(state)).office).toBe(40);
  });
});
