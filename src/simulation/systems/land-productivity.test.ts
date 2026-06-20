import { describe, expect, it } from "vitest";
import type { BuildingInstance, CityState } from "../../shared/types";
import { createInitialCityState } from "../state";
import { calculateMonthlyIncome } from "./economy";
import { calculateGoodsState } from "./goods";
import { calculateCityMetrics } from "./metrics";

describe("land value productivity", () => {
  it("scales commercial tax income by the building tile's land value", () => {
    const state = createInitialCityState();
    addActiveBuilding(state, "small_shop", 10, 10);
    state.population.total = 6;
    state.map[10]![10]!.landValue = 80;

    const highLandIncome = calculateMonthlyIncome(state, calculateCityMetrics(state));
    state.map[10]![10]!.landValue = 30;

    expect(highLandIncome).toBe(36);
    expect(calculateMonthlyIncome(state, calculateCityMetrics(state))).toBe(21);
  });

  it("halves industrial jobs, tax income, and goods output below the threshold", () => {
    const state = createInitialCityState();
    addActiveBuilding(state, "small_factory", 10, 10);
    state.population.total = 12;
    state.map[10]![10]!.landValue = 10;

    const lowLandMetrics = calculateCityMetrics(state);
    const lowLandIncome = calculateMonthlyIncome(state, lowLandMetrics);
    expect(lowLandMetrics.industrialJobs).toBe(6);
    expect(calculateGoodsState(lowLandMetrics, 1).supply).toBe(18);

    state.map[10]![10]!.landValue = 20;
    const normalLandMetrics = calculateCityMetrics(state);

    expect(normalLandMetrics.industrialJobs).toBe(12);
    expect(calculateGoodsState(normalLandMetrics, 1).supply).toBe(36);
    expect(lowLandIncome).toBeLessThan(calculateMonthlyIncome(state, normalLandMetrics));
  });
});

function addActiveBuilding(
  state: CityState,
  definitionId: string,
  x: number,
  y: number,
): void {
  const building: BuildingInstance = {
    id: `${definitionId}:${x},${y}`,
    definitionId,
    position: [x, y],
    rotation: 0,
    status: "active",
    warnings: [],
    createdAtTick: 0,
    lockedUntilTick: 0,
    unresolvedWarningTicks: 0,
    upgradeTier: 1,
    lastUpgradeTick: 0,
  };
  state.buildings.push(building);
}
