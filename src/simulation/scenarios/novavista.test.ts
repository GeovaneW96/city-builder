import { describe, expect, it } from "vitest";
import { createNovavistaShowcaseState } from "./novavista";

describe("Novavista showcase scenario", () => {
  it("creates a populated coastal city with connected roads and mixed districts", () => {
    const state = createNovavistaShowcaseState();
    const tiles = state.map.flat();

    expect(tiles.filter((tile) => tile.terrain === "water").length).toBeGreaterThan(100);
    expect(state.roads.length).toBeGreaterThan(450);
    expect(
      state.roads.some((road) => road.connections.east && road.connections.south),
    ).toBe(true);
    expect(state.buildings.length).toBeGreaterThan(150);
    expect(
      state.buildings.some((building) => building.definitionId === "high_apartment"),
    ).toBe(true);
    expect(
      state.buildings.some((building) => building.definitionId === "large_plant"),
    ).toBe(true);
    expect(state.population.total).toBe(5040);
    expect(state.time.speed).toBe(0);
  });
});
