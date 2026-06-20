import { describe, expect, it } from "vitest";
import { createInitialCityState } from "../state";
import type { BuildingInstance, CityState, Neighborhood } from "../../shared/types";
import { recomputeHappiness } from "./happiness";
import { recomputeNeighborhoods } from "./neighborhoods";

describe("neighborhood happiness", () => {
  it("auto-detects road-bounded regions with buildings", () => {
    const state = createStateWithRoadBoundary();
    addBuilding(state, "small_house", 8, 8);
    addBuilding(state, "small_house", 56, 8);

    const neighborhoods = recomputeNeighborhoods(state);

    expect(neighborhoods).toHaveLength(2);
    expect(neighborhoods.map((neighborhood) => neighborhood.bounds)).toEqual([
      { minX: 0, minY: 0, maxX: 31, maxY: 63 },
      { minX: 33, minY: 0, maxX: 63, maxY: 63 },
    ]);
  });

  it("derives independent local scores from pollution and services", () => {
    const state = createStateWithRoadBoundary();
    addBuilding(state, "small_house", 8, 8);
    addBuilding(state, "small_house", 56, 8);
    addBuilding(state, "clinic", 54, 8);
    addBuilding(state, "school", 54, 8);
    setRightSidePollution(state, 100);

    const [clean, polluted] = recomputeNeighborhoods(state);

    expect(clean?.components.pollution).toBe(0);
    expect(polluted?.components.pollution).toBe(-13);
    expect(polluted?.components.services).toBe(10);
    expect(clean?.happiness).not.toBe(polluted?.happiness);
  });

  it("uses a population-weighted neighborhood average for city happiness", () => {
    const state = createStateWithRoadBoundary();
    addBuilding(state, "small_house", 8, 8);
    addBuilding(state, "high_apartment", 56, 8);
    setRightSidePollution(state, 100);
    state.population.total = 58;

    recomputeHappiness(state);

    const [smallNeighborhood, denseNeighborhood] = state.neighborhoods;
    expect(smallNeighborhood).toBeDefined();
    expect(denseNeighborhood).toBeDefined();
    const expected = getWeightedHappiness(smallNeighborhood, denseNeighborhood);
    expect(state.happiness.value).toBe(expected);
    expect(state.happiness.value).toBeLessThan(smallNeighborhood?.happiness ?? 0);
  });

  it("keeps empty cities at the base happiness value", () => {
    const state = createInitialCityState();
    addBuilding(state, "small_house", 8, 8);

    recomputeHappiness(state);

    expect(state.happiness.value).toBe(70);
  });
});

function createStateWithRoadBoundary(): CityState {
  const state = createInitialCityState();
  for (let y = 0; y < 64; y += 1) {
    state.map[y]![32]!.roadId = "divider";
  }
  return state;
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

function setRightSidePollution(state: CityState, pollution: number): void {
  state.map.forEach((row) => {
    row.slice(33).forEach((tile) => {
      tile.pollution = pollution;
    });
  });
}

function getWeightedHappiness(
  first: Neighborhood | undefined,
  second: Neighborhood | undefined,
): number {
  if (!first || !second) throw new Error("Expected two neighborhoods");
  const totalPopulation = first.population + second.population;
  const totalHappiness =
    first.happiness * first.population + second.happiness * second.population;
  return Math.round(totalHappiness / totalPopulation);
}
