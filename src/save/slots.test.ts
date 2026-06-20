import { describe, expect, it } from "vitest";
import { createInitialCityState } from "../simulation/state";
import { AUTOSAVE_SLOT_ID, SaveSlotManager, type SaveStorage } from "./slots";

describe("SaveSlotManager", () => {
  it("saves slot metadata and loads the original city state", () => {
    const manager = createManager();
    const state = createInitialCityState();
    state.population.total = 125;

    manager.save("manual_0", state, { cityName: "Willow Bay", name: "Town One" });

    expect(manager.getMetadata("manual_0")).toMatchObject({
      id: "manual_0",
      name: "Town One",
      cityName: "Willow Bay",
      population: 125,
    });
    expect(manager.load("manual_0")?.state.population.total).toBe(125);
  });

  it("overwrites a slot, deletes it, and keeps an accurate index", () => {
    const storage = createMemoryStorage();
    const manager = new SaveSlotManager(storage, fixedNow);
    const state = createInitialCityState();
    manager.save("manual_0", state);
    state.economy.money = 12_345;
    manager.save("manual_0", state);

    expect(manager.load("manual_0")?.state.economy.money).toBe(12_345);
    expect(JSON.parse(storage.getItem("save_index") ?? "[]")).toEqual(["manual_0"]);
    expect(manager.delete("manual_0")).toBe(true);
    expect(manager.load("manual_0")).toBeNull();
    expect(JSON.parse(storage.getItem("save_index") ?? "[]")).toEqual([]);
  });

  it("exports and imports a save into an autosave or manual slot", () => {
    const source = createManager();
    const state = createInitialCityState();
    state.happiness.value = 88;
    source.save("manual_0", state, { cityName: "Sundale" });
    const exported = source.export("manual_0");
    const destination = createManager();

    destination.import(AUTOSAVE_SLOT_ID, exported);

    expect(destination.load(AUTOSAVE_SLOT_ID)?.cityName).toBe("Sundale");
    expect(destination.load(AUTOSAVE_SLOT_ID)?.state.happiness.value).toBe(88);
  });

  it("rejects malformed and incomplete imports", () => {
    const manager = createManager();

    expect(() => manager.import("manual_0", "not json")).toThrow("malformed JSON");
    expect(() =>
      manager.import("manual_0", JSON.stringify({ meta: { exportVersion: 1 } })),
    ).toThrow("missing city name");
  });
});

function createManager(): SaveSlotManager {
  return new SaveSlotManager(createMemoryStorage(), fixedNow);
}

function fixedNow(): Date {
  return new Date("2026-06-20T00:00:00.000Z");
}

function createMemoryStorage(): SaveStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
