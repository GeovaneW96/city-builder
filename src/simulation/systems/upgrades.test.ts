import { describe, expect, it } from "vitest";
import { calculateCityMetrics } from "./metrics";
import { updateBuildingUpgrades } from "./upgrades";
import { createInitialCityState } from "../state";
import type { BuildingInstance, CityState } from "../../shared/types";

describe("building upgrades", () => {
  it("upgrades a residential building through every density tier", () => {
    const { state, building } = createEligibleState("small_house");

    updateBuildingUpgrades(state);
    expect(building.definitionId).toBe("medium_house");
    expect(building.upgradeTier).toBe(2);
    expect(building.status).toBe("constructing");
    expect(building.lastUpgradeTick).toBe(20);

    building.status = "active";
    state.time.tick = 50;
    updateBuildingUpgrades(state);
    expect(building.definitionId).toBe("high_apartment");
    expect(building.upgradeTier).toBe(3);

    building.status = "active";
    expect(calculateCityMetrics(state).residentialCapacity).toBe(50);
  });

  it("replaces commercial definitions and increases available jobs", () => {
    const { state, building } = createEligibleState("small_shop");

    updateBuildingUpgrades(state);
    building.status = "active";

    expect(building.definitionId).toBe("medium_shop");
    expect(calculateCityMetrics(state).commercialJobs).toBe(15);
  });
});

describe("upgrade restrictions", () => {
  it("requires land value, happiness, population, and health coverage", () => {
    expectUpgradeBlocked((state) => setLandValue(state, 29));
    expectUpgradeBlocked((state) => {
      state.happiness.value = 49;
    });
    expectUpgradeBlocked((state) => {
      state.population.total = 199;
    });
    expectUpgradeBlocked((state) => removeBuilding(state, "clinic"));
  });

  it("requires education for a high-density upgrade", () => {
    const { state, building } = createEligibleState("small_house");
    updateBuildingUpgrades(state);
    building.status = "active";
    state.time.tick = 50;
    removeBuilding(state, "school");

    updateBuildingUpgrades(state);

    expect(building.definitionId).toBe("medium_house");
    expect(building.upgradeTier).toBe(2);
  });

  it("blocks upgrades for warnings, cooldowns, and unavailable footprints", () => {
    const warningState = createEligibleState("small_house");
    warningState.building.warnings = ["no-road"];
    expectNoUpgrade(warningState.state, warningState.building);

    const cooldownState = createEligibleState("small_house");
    cooldownState.building.lastUpgradeTick = 15;
    expectNoUpgrade(cooldownState.state, cooldownState.building);

    const footprintState = createEligibleState("small_house", 63, 10);
    expectNoUpgrade(footprintState.state, footprintState.building);
  });
});

function createEligibleState(definitionId: string, x = 10, y = 10) {
  const state = createInitialCityState();
  state.time.tick = 20;
  state.population.total = 600;
  state.happiness.value = 70;
  setLandValue(state, 70, x, y);
  const building = addBuilding(state, definitionId, x, y);
  addBuilding(state, "clinic", x, y);
  addBuilding(state, "school", x, y);
  state.map[y]![x]!.buildingId = building.id;
  return { state, building };
}

function expectUpgradeBlocked(mutate: (state: CityState) => void): void {
  const { state, building } = createEligibleState("small_house");
  mutate(state);
  expectNoUpgrade(state, building);
}

function expectNoUpgrade(state: CityState, building: BuildingInstance): void {
  updateBuildingUpgrades(state);
  expect(building.definitionId).toBe("small_house");
  expect(building.upgradeTier).toBe(1);
}

function setLandValue(state: CityState, value: number, x = 10, y = 10): void {
  state.map[y]![x]!.landValue = value;
}

function removeBuilding(state: CityState, definitionId: string): void {
  state.buildings = state.buildings.filter(
    (building) => building.definitionId !== definitionId,
  );
}

function addBuilding(
  state: CityState,
  definitionId: string,
  x: number,
  y: number,
): BuildingInstance {
  const building: BuildingInstance = {
    id: `${definitionId}:${x},${y}`,
    definitionId,
    position: [x, y],
    rotation: 0,
    status: "active",
    warnings: [],
    createdAtTick: 0,
    lockedUntilTick: 0,
    unresolvedWarningTicks: 0,
    upgradeTier: getUpgradeTier(definitionId),
    lastUpgradeTick: 0,
  };
  state.buildings.push(building);
  return building;
}

function getUpgradeTier(definitionId: string): 1 | 2 | 3 {
  if (definitionId.startsWith("medium_")) return 2;
  if (definitionId.startsWith("high_") || definitionId.startsWith("large_")) return 3;
  return 1;
}
