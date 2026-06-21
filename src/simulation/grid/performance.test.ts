import { describe, expect, it } from "vitest";
import { getMapPerformanceBudget } from "./performance";

describe("map performance budgets", () => {
  it("scales state and chunk guidance with map size", () => {
    expect(getMapPerformanceBudget(128)).toMatchObject({
      tileCount: 16384,
      estimatedStateMb: 2,
    });
    expect(getMapPerformanceBudget(256).recommendedChunkSize).toBeLessThan(64);
  });
});
