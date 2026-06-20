import { describe, expect, it } from "vitest";
import { processCityCommand } from "../commands/process";
import { createInitialCityState } from "../state";
import type { BuildingInstance, CityState, Road } from "../../shared/types";
import { calculateMonthlyExpenses } from "./economy";
import { recomputePublicTransport } from "./public-transport";
import { recomputeTraffic } from "./traffic";

describe("bus placement and routes", () => {
  it("places unlocked bus stops only on roads and deducts their cost", () => {
    const state = createInitialCityState();
    state.population.total = 2500;
    state.map[10]![10]!.roadId = "road:10,10";

    const result = processCityCommand(state, { type: "PLACE_BUS_STOP", x: 10, y: 10 });

    expect(result.result.success).toBe(true);
    expect(result.state.publicTransport.stops).toHaveLength(1);
    expect(result.state.economy.money).toBe(49500);
    expect(
      processCityCommand(state, { type: "PLACE_BUS_STOP", x: 11, y: 10 }).result.success,
    ).toBe(false);
  });

  it("requires two known stops and a depot before a route operates", () => {
    const state = createTransportState();
    const stopIds = state.publicTransport.stops.map((stop) => stop.id);

    expect(
      processCityCommand(state, {
        type: "CREATE_BUS_ROUTE",
        name: "Short",
        stopIds: [stopIds[0]!],
        depotId: "bus_depot:12,10",
      }).result.success,
    ).toBe(false);

    const result = processCityCommand(state, {
      type: "CREATE_BUS_ROUTE",
      name: "Main",
      stopIds,
      depotId: "bus_depot:12,10",
    });
    recomputePublicTransport(result.state);

    expect(result.state.publicTransport.activeRouteCount).toBe(1);
    expect(result.state.publicTransport.ridership).toBeGreaterThan(0);
  });
});

describe("bus effects", () => {
  it("reduces covered traffic demand and adds transit upkeep", () => {
    const state = createTransportState();
    state.publicTransport.routes.push({
      id: "route:main",
      name: "Main",
      stops: state.publicTransport.stops.map((stop) => stop.id),
      depotId: "bus_depot:12,10",
      active: true,
    });
    recomputePublicTransport(state);
    recomputeTraffic(state);

    expect(state.traffic.totalTrips).toBe(11);
    expect(state.publicTransport.happinessBonus).toBeGreaterThan(0);
    expect(calculateMonthlyExpenses(state)).toBe(1016);
  });

  it("deactivates a route when its depot is unavailable", () => {
    const state = createTransportState();
    state.publicTransport.routes.push({
      id: "route:main",
      name: "Main",
      stops: state.publicTransport.stops.map((stop) => stop.id),
      depotId: "missing",
      active: true,
    });

    recomputePublicTransport(state);

    expect(state.publicTransport.activeRouteCount).toBe(0);
    expect(state.publicTransport.routes[0]?.active).toBe(false);
  });
});

function createTransportState(): CityState {
  const state = createInitialCityState();
  state.population.total = 2500;
  state.roads = [createRoad(10, 10)];
  addBuilding(state, "high_apartment", 11, 10);
  addBuilding(state, "bus_depot", 12, 10);
  state.publicTransport.stops = [
    { id: "stop:a", position: [10, 10] },
    { id: "stop:b", position: [12, 10] },
  ];
  return state;
}

function createRoad(x: number, y: number): Road {
  return {
    id: `road:${x},${y}`,
    type: "dirt",
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
