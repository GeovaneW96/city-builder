import { describe, expect, it } from "vitest";
import { createInitialCityState } from "../state";
import type { BuildingInstance, CityState, Road } from "../../shared/types";
import { calculateMonthlyIncome } from "./economy";
import { calculateCityMetrics } from "./metrics";
import {
  findRoadPath,
  getBuildingTrips,
  getRoadCapacity,
  getRoadSpeed,
  recomputeTraffic,
} from "./traffic";
import { rebuildWarnings } from "./warnings";
import { processCityCommand } from "../commands/process";

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

describe("road hierarchy", () => {
  it("uses distinct capacity and speed values for all road tiers", () => {
    expect(getRoadCapacity(createRoad("local", 1, 1))).toBe(25);
    expect(getRoadCapacity(createRoad("collector", 1, 1))).toBe(50);
    expect(getRoadCapacity(createRoad("arterial", 1, 1))).toBe(100);
    expect(getRoadSpeed(createRoad("arterial", 1, 1))).toBeGreaterThan(
      getRoadSpeed(createRoad("local", 1, 1)),
    );
  });

  it("finds a connected road route and returns no route for disconnected roads", () => {
    const state = createInitialCityState();
    state.roads = [
      createRoad("local", 1, 1),
      createRoad("arterial", 2, 1),
      createRoad("arterial", 3, 1),
      createRoad("local", 8, 8),
    ];

    expect(findRoadPath(state, "local:1,1", "arterial:3,1")).toEqual([
      "local:1,1",
      "arterial:2,1",
      "arterial:3,1",
    ]);
    expect(findRoadPath(state, "local:1,1", "local:8,8")).toEqual([]);
  });

  it("charges road tier upgrades, refunds downgrades, and places intersection lights", () => {
    const state = createInitialCityState();
    state.roads = [
      createRoad("local", 1, 1),
      createRoad("local", 2, 1),
      createRoad("local", 1, 2),
    ];
    state.traffic.intersections = ["local:1,1"];
    const startingMoney = state.economy.money;
    const upgraded = processCityCommand(state, {
      type: "SET_ROAD_TIER",
      x: 1,
      y: 1,
      roadType: "collector",
    }).state;
    const downgraded = processCityCommand(upgraded, {
      type: "SET_ROAD_TIER",
      x: 1,
      y: 1,
      roadType: "local",
    }).state;
    const lit = processCityCommand(downgraded, {
      type: "PLACE_TRAFFIC_LIGHT",
      x: 1,
      y: 1,
    }).state;

    expect(upgraded.economy.money).toBe(startingMoney - 100);
    expect(downgraded.economy.money).toBe(startingMoney - 50);
    expect(lit.traffic.trafficLights).toHaveLength(1);
    expect(lit.economy.money).toBe(startingMoney - 1050);
  });
});

describe("agent traffic", () => {
  it("spawns travel agents on the four-tick schedule and detects intersections", () => {
    const state = createInitialCityState();
    state.roads = [
      createRoad("local", 1, 1),
      createRoad("local", 2, 1),
      createRoad("local", 3, 1),
      createRoad("local", 2, 0),
    ];
    addBuilding(state, "small_house", 1, 2);
    addBuilding(state, "small_shop", 3, 2);
    state.time.tick = 4;

    recomputeTraffic(state);

    expect(state.traffic.agents.some((agent) => agent.type === "commuter")).toBe(true);
    expect(state.traffic.agents.some((agent) => agent.type === "customer")).toBe(true);
    expect(state.traffic.intersections).toContain("local:2,1");
    const agents = state.traffic.agents.length;
    recomputeTraffic(state);
    expect(state.traffic.agents).toHaveLength(agents);
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
