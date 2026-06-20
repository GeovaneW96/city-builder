import { beforeEach, describe, expect, it } from "vitest";
import { createSaveData, deserializeSave, serializeSave } from "../save/serialization";
import type { BuildingInstance, CityState, GameCommand } from "../shared/types";
import { createInitialCityState, useSimulationStore } from "./store";

function resetStore(): void {
  useSimulationStore.getState().loadSave(createInitialCityState());
}

function command(command: GameCommand) {
  return useSimulationStore.getState().processCommand(command);
}

describe("createInitialCityState", () => {
  it("creates a 64x64 grass map", () => {
    const state = createInitialCityState();
    expect(state.map.length).toBe(64);
    expect(state.map[0]!.length).toBe(64);
    expect(state.map[12]![18]!.terrain).toBe("grass");
    expect(state.map[12]![18]!.roadId).toBeNull();
    expect(state.map[12]![18]!.zone).toBeNull();
    expect(state.map[12]![18]!.buildingId).toBeNull();
  });

  it("starts the first scenario with documented economy and demand values", () => {
    const state = createInitialCityState();
    expect(state.economy.money).toBe(50000);
    expect(state.economy.taxRates.residential).toBe(10);
    expect(state.demand).toEqual({
      residential: 50,
      commercial: 30,
      industrial: 30,
      office: 20,
    });
    expect(state.happiness.value).toBe(70);
    expect(state.progression.unlockedFeatures).toContain("dirt_road");
    expect(state.progression.unlockedFeatures).toContain("residential_zoning");
  });
});

describe("SimulationStore road and zone commands", () => {
  beforeEach(resetStore);

  it("places dirt roads, deducts money, and tracks orthogonal connections", () => {
    expect(command({ type: "PLACE_ROAD", x: 10, y: 10, roadType: "dirt" }).success).toBe(
      true,
    );
    expect(command({ type: "PLACE_ROAD", x: 11, y: 10, roadType: "dirt" }).success).toBe(
      true,
    );

    const state = useSimulationStore.getState().state;
    expect(state.map[10]![10]!.roadId).toBe("road:10,10");
    expect(state.economy.money).toBe(49900);
    expect(state.roads.find((road) => road.id === "road:10,10")?.connections.east).toBe(
      true,
    );
    expect(state.roads.find((road) => road.id === "road:11,10")?.connections.west).toBe(
      true,
    );
  });

  it("rejects invalid road placement", () => {
    expect(command({ type: "PLACE_ROAD", x: -1, y: 64, roadType: "dirt" })).toMatchObject(
      {
        success: false,
        error: "Out of bounds",
      },
    );
  });

  it("paints unlocked zones and rejects locked zone types", () => {
    expect(
      command({ type: "PAINT_ZONE", x: 12, y: 10, zoneType: "commercial" }),
    ).toMatchObject({
      success: false,
      error: "Zone type is locked",
    });
    expect(
      command({ type: "PAINT_ZONE", x: 12, y: 10, zoneType: "residential" }).success,
    ).toBe(true);
    expect(useSimulationStore.getState().state.map[10]![12]!.zone).toBe("residential");
  });
});

describe("SimulationStore building and tax commands", () => {
  beforeEach(resetStore);

  it("places manual buildings only on valid footprints with road access", () => {
    expect(
      command({ type: "PLACE_BUILDING", definitionId: "water_tower", x: 5, y: 5 }),
    ).toMatchObject({
      success: false,
      error: "Building requires adjacent road",
    });
    expect(command({ type: "PLACE_ROAD", x: 5, y: 4, roadType: "dirt" }).success).toBe(
      true,
    );
    expect(
      command({ type: "PLACE_BUILDING", definitionId: "water_tower", x: 5, y: 5 })
        .success,
    ).toBe(true);

    const state = useSimulationStore.getState().state;
    expect(state.buildings[0]?.definitionId).toBe("water_tower");
    expect(state.economy.money).toBe(44950);
    expect(state.map[5]![5]!.buildingId).toBe(state.buildings[0]?.id);
  });

  it("clamps tax rates", () => {
    command({ type: "SET_TAX_RATE", taxType: "residential", rate: 30 });
    expect(useSimulationStore.getState().state.economy.taxRates.residential).toBe(20);
    command({ type: "SET_TAX_RATE", taxType: "residential", rate: -3 });
    expect(useSimulationStore.getState().state.economy.taxRates.residential).toBe(0);
  });
});

describe("Simulation growth", () => {
  beforeEach(resetStore);

  it("suppresses growth on the first tick and grows residential buildings after that", () => {
    command({ type: "PLACE_ROAD", x: 8, y: 8, roadType: "dirt" });
    command({ type: "PAINT_ZONE", x: 8, y: 9, zoneType: "residential" });

    useSimulationStore.getState().tick();
    expect(useSimulationStore.getState().state.buildings).toHaveLength(0);

    useSimulationStore.getState().tick();
    expect(useSimulationStore.getState().state.buildings[0]?.status).toBe("constructing");

    useSimulationStore.getState().tick();
    expect(useSimulationStore.getState().state.buildings[0]?.status).toBe("active");
    expect(useSimulationStore.getState().state.population.total).toBe(8);
  });

  it("can reach the 50 population milestone before jobs are unlocked", () => {
    for (let x = 8; x < 15; x += 1) {
      command({ type: "PLACE_ROAD", x, y: 8, roadType: "dirt" });
      command({ type: "PAINT_ZONE", x, y: 9, zoneType: "residential" });
    }

    for (let index = 0; index < 8; index += 1) {
      useSimulationStore.getState().tick();
    }

    const state = useSimulationStore.getState().state;
    expect(state.population.total).toBeGreaterThanOrEqual(50);
    expect(state.progression.unlockedFeatures).toContain("commercial_zoning");
  });
});

describe("Simulation economy", () => {
  beforeEach(resetStore);

  it("computes utility capacity, demand, warnings, and monthly expenses", () => {
    const state = createInitialCityState();
    addActiveBuilding(state, "small_house", 8, 9);
    addActiveBuilding(state, "water_tower", 7, 9);
    state.roads.push({
      id: "road:8,8",
      type: "dirt",
      position: [8, 8],
      connections: { north: false, east: false, south: false, west: false },
    });
    state.map[8]![8]!.roadId = "road:8,8";
    useSimulationStore.getState().loadSave(state);

    useSimulationStore.getState().tick();
    const next = useSimulationStore.getState().state;
    expect(next.population.total).toBe(8);
    expect(next.services.waterCapacity).toBe(50);
    expect(next.services.powerDemand).toBeGreaterThan(0);
    expect(next.economy.monthlyExpenses).toBe(0);

    useSimulationStore.getState().tick();
    expect(useSimulationStore.getState().state.economy.monthlyExpenses).toBeGreaterThan(
      0,
    );
    expect(
      useSimulationStore
        .getState()
        .state.warnings.some((warning) => warning.id.includes("no-power")),
    ).toBe(true);
  });

  it("does not abandon homes from utility shortage warnings alone", () => {
    const state = createInitialCityState();
    addActiveBuilding(state, "small_house", 8, 9);
    state.roads.push({
      id: "road:8,8",
      type: "dirt",
      position: [8, 8],
      connections: { north: false, east: false, south: false, west: false },
    });
    state.map[8]![8]!.roadId = "road:8,8";
    useSimulationStore.getState().loadSave(state);

    for (let index = 0; index < 15; index += 1) {
      useSimulationStore.getState().tick();
    }

    expect(useSimulationStore.getState().state.buildings[0]?.status).toBe("active");
    expect(useSimulationStore.getState().state.population.total).toBe(8);
  });
});

describe("Simulation warning events", () => {
  beforeEach(resetStore);

  it("emits warning events only when a warning first appears", () => {
    const state = createInitialCityState();
    addActiveBuilding(state, "small_house", 8, 9);
    useSimulationStore.getState().loadSave(state);

    const firstTick = useSimulationStore.getState().tick();
    expect(firstTick.events.some((event) => event.type === "WARNING_ADDED")).toBe(true);

    const secondTick = useSimulationStore.getState().tick();
    expect(secondTick.events.some((event) => event.type === "WARNING_ADDED")).toBe(false);
  });
});

describe("Simulation progression", () => {
  beforeEach(resetStore);

  it("unlocks milestones and applies rewards once", () => {
    const state = createInitialCityState();
    for (let index = 0; index < 7; index += 1) {
      addActiveBuilding(state, "small_house", index, 1);
    }
    useSimulationStore.getState().loadSave(state);
    useSimulationStore.getState().tick();

    const next = useSimulationStore.getState().state;
    expect(next.population.total).toBe(56);
    expect(next.progression.currentMilestone).toBe(50);
    expect(next.progression.unlockedFeatures).toContain("commercial_zoning");
    expect(next.economy.money).toBe(52000);

    useSimulationStore.getState().tick();
    expect(useSimulationStore.getState().state.economy.money).not.toBe(54000);
  });
});

describe("save serialization", () => {
  it("round-trips city state as JSON and continues ticking", () => {
    const state = createInitialCityState();
    state.economy.money = 12345;
    const restored = deserializeSave(serializeSave(createSaveData(state)));
    expect(restored.version).toBe(1);
    expect(restored.state.economy.money).toBe(12345);

    useSimulationStore.getState().loadSave(restored.state);
    expect(() => useSimulationStore.getState().tick()).not.toThrow();
  });
});

function addActiveBuilding(
  state: CityState,
  definitionId: string,
  x: number,
  y: number,
): void {
  const id = `${definitionId}:${x},${y}:test`;
  const building: BuildingInstance = {
    id,
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
  state.map[y]![x]!.buildingId = id;
}
