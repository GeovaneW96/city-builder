import { describe, expect, it } from "vitest";
import { processCityCommand } from "../commands/process";
import { createInitialCityState } from "../state";

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
});
