import { describe, expect, it } from "vitest";
import { processCityCommand } from "../commands/process";
import { createInitialCityState } from "../state";
import { createMap } from "../grid/map";

describe("biome map generation", () => {
  it("creates maps with the requested biome via createInitialCityState", () => {
    const desert = createInitialCityState("desert");
    expect(desert.map[0]?.[0]?.biome).toBe("desert");
    const allDesert = desert.map.flat().every((tile) => tile.biome === "desert");
    expect(allDesert).toBe(true);
  });

  it("defaults to temperate biome from first settlement scenario", () => {
    const state = createInitialCityState();
    expect(state.map[0]?.[0]?.biome).toBe("temperate");
  });
});

describe("terrain elevation", () => {
  it("starts flat and changes elevation at the documented cost", () => {
    const state = createInitialCityState();
    const raised = processCityCommand(state, {
      type: "CHANGE_ELEVATION",
      x: 2,
      y: 2,
      delta: 1,
    }).state;
    expect(state.map[2]?.[2]?.elevation).toBe(1);
    expect(raised.map[2]?.[2]?.elevation).toBe(2);
    expect(raised.economy.money).toBe(state.economy.money - 100);
  });

  it("creates maps with a selected biome", () => {
    expect(createMap(64, "desert")[0]?.[0]?.biome).toBe("desert");
    expect(createMap(128)).toHaveLength(128);
    expect(createMap(256)[0]).toHaveLength(256);
  });

  it("turns lowered sea-level tiles into water and rejects invalid positions", () => {
    const state = createInitialCityState();
    const water = processCityCommand(state, {
      type: "CHANGE_ELEVATION",
      x: 2,
      y: 2,
      delta: -1,
    }).state;
    expect(water.map[2]?.[2]).toMatchObject({ elevation: 0, terrain: "water" });
    expect(
      processCityCommand(state, { type: "CHANGE_ELEVATION", x: -1, y: 2, delta: 1 })
        .result.success,
    ).toBe(false);
  });

  it("prevents roads on water and excessive slopes", () => {
    const state = createInitialCityState();
    state.map[2]![2]!.terrain = "water";
    state.map[2]![2]!.elevation = 0;
    expect(
      processCityCommand(state, { type: "PLACE_ROAD", x: 2, y: 2, roadType: "dirt" })
        .result.success,
    ).toBe(false);
    state.map[3]![2]!.elevation = 4;
    const withRoad = processCityCommand(state, {
      type: "PLACE_ROAD",
      x: 2,
      y: 3,
      roadType: "dirt",
    }).state;
    withRoad.map[3]![3]!.elevation = 6;
    expect(
      processCityCommand(withRoad, { type: "PLACE_ROAD", x: 3, y: 3, roadType: "dirt" })
        .result.success,
    ).toBe(false);
  });
});
