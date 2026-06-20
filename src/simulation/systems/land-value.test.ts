import { describe, expect, it } from "vitest";
import type { BuildingInstance, CityState } from "../../shared/types";
import { createInitialCityState } from "../state";
import { calculateLandValueAt, recomputeLandValue } from "./land-value";

describe("land value", () => {
  it("keeps an unmodified buildable tile at the base value", () => {
    const state = createInitialCityState();

    expect(calculateLandValueAt(state, 10, 10)).toBe(50);
    recomputeLandValue(state);
    expect(state.map[10]![10]!.landValue).toBe(50);
  });

  it("applies park proximity with Chebyshev-distance falloff", () => {
    const state = createInitialCityState();
    addActiveBuilding(state, "park", 10, 10);

    expect(calculateLandValueAt(state, 12, 10)).toBe(53);
    expect(calculateLandValueAt(state, 14, 10)).toBe(50);
    expect(calculateLandValueAt(state, 12, 12)).toBe(53);
  });

  it("stacks service and adjacent-road bonuses", () => {
    const state = createInitialCityState();
    addActiveBuilding(state, "clinic", 10, 10);
    addActiveBuilding(state, "school", 10, 10);
    state.map[9]![10]!.roadId = "road:10,9";

    expect(calculateLandValueAt(state, 10, 10)).toBe(66);
  });

  it("stacks industrial pollution and noise penalties with falloff", () => {
    const state = createInitialCityState();
    addActiveBuilding(state, "small_factory", 10, 10);

    expect(calculateLandValueAt(state, 10, 10)).toBe(37);
    expect(calculateLandValueAt(state, 14, 10)).toBe(48);
    expect(calculateLandValueAt(state, 15, 10)).toBe(50);
  });

  it("clamps stacked modifiers and rejects unbuildable tiles", () => {
    const highState = createInitialCityState();
    const lowState = createInitialCityState();
    for (let index = 0; index < 20; index += 1) {
      addActiveBuilding(highState, "park", 10, 10, index);
      addActiveBuilding(lowState, "small_factory", 10, 10, index);
    }
    lowState.map[4]![4]!.terrain = "water";

    expect(calculateLandValueAt(highState, 10, 10)).toBe(100);
    expect(calculateLandValueAt(lowState, 10, 10)).toBe(0);
    expect(calculateLandValueAt(lowState, 4, 4)).toBeNull();
    recomputeLandValue(lowState);
    expect(lowState.map[4]![4]!.landValue).toBeNull();
  });
});

function addActiveBuilding(
  state: CityState,
  definitionId: string,
  x: number,
  y: number,
  index = 0,
): void {
  const building: BuildingInstance = {
    id: `${definitionId}:${x},${y}:${index}`,
    definitionId,
    position: [x, y],
    rotation: 0,
    status: "active",
    warnings: [],
    createdAtTick: 0,
    lockedUntilTick: 0,
    unresolvedWarningTicks: 0,
  };
  state.buildings.push(building);
}
