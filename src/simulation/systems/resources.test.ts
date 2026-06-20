import { describe, expect, it } from "vitest";
import { createInitialCityState } from "../state";
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
});
