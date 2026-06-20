import { describe, expect, it } from "vitest";
import { createInitialCityState } from "../state";
import type { BuildingInstance, CityState, Road } from "../../shared/types";
import { calculateMonthlyIncome } from "./economy";
import { calculateCityMetrics } from "./metrics";
import { getBuildingTrips, getRoadCapacity, recomputeTraffic } from "./traffic";
import { rebuildWarnings } from "./warnings";

describe("traffic capacity and trip demand", () => {
  it("uses higher capacity for paved roads", () => {
    expect(getRoadCapacity(createRoad("dirt", 1, 1))).toBe(10);
    expect(getRoadCapacity(createRoad("paved", 1, 1))).toBe(25);
  });

  it("calculates trips from each active building category", () => {
    const state = createInitialCityState();

    expect(getBuildingTrips(addBuilding(state, "small_house", 1, 1))).toBe(2);
    expect(getBuildingTrips(addBuilding(state, "small_shop", 2, 1))).toBe(12);
    expect(getBuildingTrips(addBuilding(state, "small_factory", 3, 1))).toBe(36);
    expect(getBuildingTrips(addBuilding(state, "clinic", 4, 1))).toBe(8);
  });

  it("assigns trips to the nearest roads and conserves split trips", () => {
    const state = createInitialCityState();
    state.roads = [createRoad("dirt", 9, 10), createRoad("dirt", 11, 10)];
    addBuilding(state, "small_house", 10, 10);

    recomputeTraffic(state);

    expect(state.traffic.totalTrips).toBe(2);
    expect(state.traffic.segments.map((segment) => segment.trips)).toEqual([1, 1]);
  });

  it("does not assign trips from buildings outside the road range", () => {
    const state = createInitialCityState();
    state.roads = [createRoad("dirt", 0, 0)];
    addBuilding(state, "small_factory", 40, 40);

    recomputeTraffic(state);

    expect(state.traffic.totalTrips).toBe(0);
    expect(state.traffic.cityCongestion).toBe(0);
  });
});

describe("traffic effects", () => {
  it("clamps saturated road congestion and applies its city effects", () => {
    const state = createStateWithBuildingAndRoad("dirt");

    recomputeTraffic(state);

    expect(state.traffic.segments[0]?.congestion).toBe(1);
    expect(state.traffic.cityCongestion).toBe(100);
    expect(state.traffic.happinessPenalty).toBe(15);
    expect(state.traffic.commercialMultiplier).toBe(0.75);
    expect(state.traffic.industrialMultiplier).toBe(0.7);
  });

  it("reduces congestion when a road is paved", () => {
    const dirt = createStateWithBuildingAndRoad("dirt");
    const paved = createStateWithBuildingAndRoad("paved");

    recomputeTraffic(dirt);
    recomputeTraffic(paved);

    expect(paved.traffic.cityCongestion).toBeLessThan(dirt.traffic.cityCongestion);
    expect(paved.traffic.commercialMultiplier).toBeGreaterThan(
      dirt.traffic.commercialMultiplier,
    );
  });

  it("reduces commercial and industrial tax income when roads are congested", () => {
    const state = createStateWithBuildingAndRoad("dirt");
    addBuilding(state, "small_shop", 11, 10);
    addBuilding(state, "small_factory", 12, 10);
    state.population.total = 100;
    recomputeTraffic(state);
    const congestedIncome = calculateMonthlyIncome(state, calculateCityMetrics(state));
    state.traffic.commercialMultiplier = 1;
    state.traffic.industrialMultiplier = 1;

    expect(congestedIncome).toBeLessThan(
      calculateMonthlyIncome(state, calculateCityMetrics(state)),
    );
  });

  it("adds traffic warnings for a congested city and saturated segment", () => {
    const state = createStateWithBuildingAndRoad("dirt");
    recomputeTraffic(state);

    rebuildWarnings(state);

    expect(state.warnings.map((warning) => warning.id)).toEqual(
      expect.arrayContaining(["city:traffic-congestion", "city:road-segment-capacity"]),
    );
  });
});

function createStateWithBuildingAndRoad(type: Road["type"]): CityState {
  const state = createInitialCityState();
  state.roads = [createRoad(type, 10, 10)];
  addBuilding(state, "high_apartment", 11, 10);
  return state;
}

function createRoad(type: Road["type"], x: number, y: number): Road {
  return {
    id: `${type}:${x},${y}`,
    type,
    position: [x, y],
    connections: { north: false, east: false, south: false, west: false },
  };
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
    upgradeTier: 1,
    lastUpgradeTick: 0,
  };
  state.buildings.push(building);
  return building;
}
