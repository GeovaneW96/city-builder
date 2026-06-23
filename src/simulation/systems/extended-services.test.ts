import { describe, expect, it } from "vitest";
import { createInitialCityState } from "../state";
import type { BuildingInstance, CityState } from "../../shared/types";
import { recomputeExtendedServices } from "./extended-services";
import { recomputeHappiness } from "./happiness";
import { rebuildWarnings } from "./warnings";

describe("police and fire services", () => {
  it("suppresses nearby crime and reports low police coverage", () => {
    const state = createInitialCityState();
    const house = addBuilding(state, "small_house", 10, 10);

    recomputeExtendedServices(state);
    expect(house.crime).toBe(10.5);
    expect(state.extendedServices.policeCoverage).toBe(0);

    addBuilding(state, "police_station", 11, 10);
    recomputeExtendedServices(state);
    expect(house.crime).toBe(5.5);
    expect(state.extendedServices.policeCoverage).toBe(100);
  });

  it("destroys an uncovered building when its fire risk reaches the threshold", () => {
    const state = createInitialCityState();
    const factory = addBuilding(state, "small_factory", 10, 10);
    factory.fireRisk = 99;

    const events = recomputeExtendedServices(state);

    expect(state.buildings).toHaveLength(0);
    expect(events.some((event) => event.type === "BUILDING_REMOVED")).toBe(true);
  });

  it("spreads to one adjacent uncovered building per tick under normal conditions", () => {
    const state = createInitialCityState();
    const factory = addBuilding(state, "small_factory", 10, 10);
    addBuilding(state, "small_house", 11, 10);
    addBuilding(state, "small_house", 9, 10);
    factory.fireRisk = 99;

    recomputeExtendedServices(state);

    expect(state.buildings).toHaveLength(1);
    expect(state.buildings[0]?.definitionId).toBe("small_house");
  });

  it("spreads to all adjacent uncovered buildings during a fire event", () => {
    const state = createInitialCityState();
    const factory = addBuilding(state, "small_factory", 10, 10);
    addBuilding(state, "small_house", 11, 10);
    addBuilding(state, "small_house", 9, 10);
    factory.fireRisk = 99;
    state.events = [{ id: "fire:0", type: "fire", startTick: 0, durationTicks: 6 }];

    recomputeExtendedServices(state);

    expect(state.buildings).toHaveLength(0);
  });
});

describe("garbage service", () => {
  it("collects garbage only when a landfill covers its producer", () => {
    const uncovered = createInitialCityState();
    addBuilding(uncovered, "large_plant", 10, 10);
    recomputeExtendedServices(uncovered);

    const covered = createInitialCityState();
    addBuilding(covered, "large_plant", 10, 10);
    addBuilding(covered, "landfill", 11, 10);
    recomputeExtendedServices(covered);

    expect(uncovered.extendedServices.totalUncollectedGarbage).toBeGreaterThan(0);
    expect(covered.extendedServices.monthlyGarbageCollected).toBe(12);
    expect(covered.extendedServices.totalUncollectedGarbage).toBe(0);
  });

  it("uses spare landfill capacity to clear accumulated garbage", () => {
    const state = createInitialCityState();
    addBuilding(state, "large_plant", 10, 10);
    addBuilding(state, "landfill", 11, 10);
    state.extendedServices.totalUncollectedGarbage = 100;

    recomputeExtendedServices(state);

    expect(state.extendedServices.garbageCoverage).toBe(100);
    expect(state.extendedServices.monthlyGarbageCollected).toBeGreaterThan(12);
    expect(state.extendedServices.totalUncollectedGarbage).toBe(0);
  });

  it("keeps garbage totals as whole units under partial coverage", () => {
    const state = createInitialCityState();
    addBuilding(state, "large_plant", 0, 0);
    addBuilding(state, "large_plant", 40, 40);
    addBuilding(state, "large_plant", 50, 50);
    addBuilding(state, "landfill", 0, 0);
    state.extendedServices.totalUncollectedGarbage = 40;
    recomputeExtendedServices(state);
    expect(Number.isInteger(state.extendedServices.monthlyGarbageCollected)).toBe(true);
    expect(Number.isInteger(state.extendedServices.totalUncollectedGarbage)).toBe(true);
  });

  it("applies garbage happiness penalties and related warnings", () => {
    const state = createInitialCityState();
    addBuilding(state, "large_plant", 10, 10);
    addBuilding(state, "small_house", 12, 10);
    state.population.total = 8;
    state.extendedServices.totalUncollectedGarbage = 60;

    recomputeExtendedServices(state);
    recomputeHappiness(state);
    rebuildWarnings(state);

    expect(state.extendedServices.garbageHappinessPenalty).toBeLessThan(0);
    expect(state.happiness.components.garbage).toBe(
      state.extendedServices.garbageHappinessPenalty,
    );
    expect(state.warnings.map((warning) => warning.id)).toContain("city:garbage-buildup");
  });
});

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
    upgradeTier: 1,
    lastUpgradeTick: 0,
  };
  state.buildings.push(building);
  return building;
}
