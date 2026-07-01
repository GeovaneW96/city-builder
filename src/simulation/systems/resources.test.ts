import { describe, expect, it } from "vitest";
import { createInitialCityState } from "../state";
import { createMap } from "../grid/map";
import { depleteResources, getResourceMultiplier } from "./resources";
import { calculateCityMetrics } from "./metrics";
import type { BuildingInstance } from "../../shared/types";
import { DAYS_PER_MONTH } from "./time";

describe("resources", () => {
  it("stores resource richness and calculates deposit productivity", () => {
    const state = createInitialCityState();
    const tile = state.map[1]?.[1];
    if (!tile) throw new Error("Missing tile");
    tile.resourceType = "ore";
    tile.richness = 100;
    expect(getResourceMultiplier(tile)).toBe(1.5);
    tile.resourceType = "oil";
    expect(getResourceMultiplier(tile)).toBe(2);
    tile.resourceType = "fertile_soil";
    expect(getResourceMultiplier(tile)).toBeCloseTo(1.667);
  });

  it("generates deterministic biome-specific deposits", () => {
    const desert = createMap(64, "desert").flat();
    const tropical = createMap(64, "tropical").flat();
    expect(desert.some((tile) => tile.resourceType === "oil")).toBe(true);
    expect(tropical.some((tile) => tile.resourceType === "fertile_soil")).toBe(true);
    expect(tropical.some((tile) => tile.resourceType === "ore")).toBe(false);
  });

  it("boosts industrial jobs on ore, oil, and fertile soil deposits", () => {
    const state = createInitialCityState();
    state.buildings = [building("small_factory", 2, 2)];
    state.map[2]![2]!.resourceType = "ore";
    state.map[2]![2]!.richness = 100;
    expect(calculateCityMetrics(state).industrialJobs).toBe(18);
    state.map[2]![2]!.resourceType = "oil";
    expect(calculateCityMetrics(state).industrialJobs).toBe(24);
    state.map[2]![2]!.resourceType = "fertile_soil";
    state.map[2]![2]!.richness = 75;
    expect(calculateCityMetrics(state).industrialJobs).toBe(18);
  });

  it("depletes active resource tiles only on the last day of the year", () => {
    const state = createInitialCityState();
    state.buildings = [building("small_factory", 2, 2)];
    state.map[2]![2]!.resourceType = "ore";
    state.map[2]![2]!.richness = 10;
    state.time.month = 12;
    state.time.day = 12;

    depleteResources(state);
    expect(state.map[2]![2]!.richness).toBe(10);

    state.time.day = DAYS_PER_MONTH;
    depleteResources(state);
    expect(state.map[2]![2]!.richness).toBe(9);
  });
});

function building(definitionId: string, x: number, y: number): BuildingInstance {
  return {
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
}
