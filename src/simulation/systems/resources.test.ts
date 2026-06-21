import { describe, expect, it } from "vitest";
import { createInitialCityState } from "../state";
import { createMap } from "../grid/map";
import { getResourceMultiplier } from "./resources";

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
  });

  it("generates deterministic biome-specific deposits", () => {
    const desert = createMap(64, "desert").flat();
    const tropical = createMap(64, "tropical").flat();
    expect(desert.some((tile) => tile.resourceType === "oil")).toBe(true);
    expect(tropical.some((tile) => tile.resourceType === "fertile_soil")).toBe(true);
    expect(tropical.some((tile) => tile.resourceType === "ore")).toBe(false);
  });
});
