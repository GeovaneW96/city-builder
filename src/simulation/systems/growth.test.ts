import { describe, expect, it } from "vitest";
import { createInitialCityState } from "../state";
import { growZonedBuildings } from "./growth";

describe("zoned building growth", () => {
  it("grows zone-grown commercial shops instead of manual hotels", () => {
    const state = createInitialCityState();
    state.progression.unlockedFeatures.push("commercial_zoning");
    state.demand.commercial = 30;
    state.map[5]![5]!.roadId = "road:5,5";
    state.roads.push({
      id: "road:5,5",
      type: "dirt",
      position: [5, 5],
      connections: { north: false, east: false, south: false, west: false },
    });
    state.map[6]![5]!.zone = "commercial";

    growZonedBuildings(state);

    expect(state.buildings).toHaveLength(1);
    expect(state.buildings[0]?.definitionId).toBe("small_shop");
  });

  it("pauses zoning growth while active utility demand exceeds supply", () => {
    const state = createInitialCityState();
    state.progression.unlockedFeatures.push("commercial_zoning");
    state.demand.commercial = 30;
    state.services.powerDemand = 1;
    state.services.waterDemand = 1;
    state.map[5]![5]!.roadId = "road:5,5";
    state.map[6]![5]!.zone = "commercial";

    growZonedBuildings(state);

    expect(state.buildings).toHaveLength(0);
  });
});
