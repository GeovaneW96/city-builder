import { describe, it, expect } from "vitest";
import { createInitialCityState, useSimulationStore } from "./store";

describe("createInitialCityState", () => {
  it("creates a 64x64 map", () => {
    const state = createInitialCityState();
    expect(state.map.length).toBe(64);
    expect(state.map[0]!.length).toBe(64);
  });

  it("defaults all tiles to grass", () => {
    const state = createInitialCityState();
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const tile = state.map[y]![x]!;
        expect(tile.terrain).toBe("grass");
        expect(tile.roadId).toBeNull();
        expect(tile.zone).toBeNull();
        expect(tile.buildingId).toBeNull();
      }
    }
  });

  it("starts with 50000 money", () => {
    const state = createInitialCityState();
    expect(state.economy.money).toBe(50000);
  });

  it("starts with demand at 50/30/30", () => {
    const state = createInitialCityState();
    expect(state.demand.residential).toBe(50);
    expect(state.demand.commercial).toBe(30);
    expect(state.demand.industrial).toBe(30);
  });

  it("starts with happiness at 70", () => {
    const state = createInitialCityState();
    expect(state.happiness.value).toBe(70);
  });

  it("has no buildings or roads", () => {
    const state = createInitialCityState();
    expect(state.buildings).toHaveLength(0);
    expect(state.roads).toHaveLength(0);
  });
});

describe("SimulationStore", () => {
  it("processes a valid PLACE_ROAD command", () => {
    const result = useSimulationStore.getState().processCommand({
      type: "PLACE_ROAD",
      x: 10,
      y: 10,
      roadType: "dirt",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an out-of-bounds PLACE_ROAD command", () => {
    const result = useSimulationStore.getState().processCommand({
      type: "PLACE_ROAD",
      x: -1,
      y: 64,
      roadType: "dirt",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Out of bounds");
  });

  it("handles save/load round-trip", () => {
    const store = useSimulationStore.getState();
    const save = store.getSaveData();
    save.economy.money = 12345;
    store.loadSave(save);
    expect(useSimulationStore.getState().state.economy.money).toBe(12345);
  });

  it("tick returns current state with correct shape", () => {
    const state = useSimulationStore.getState().tick();
    expect(state.map.length).toBe(64);
    expect(state.demand.residential).toBe(50);
    expect(state.population.total).toBe(0);
  });
});
