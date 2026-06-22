import { describe, expect, it } from "vitest";
import type { BuildingInstance } from "../../shared/types";
import { createInitialCityState } from "../state";
import { recomputeTourism } from "./tourism";

describe("tourism", () => {
  it("does not create passive income for an empty city", () => {
    const state = createInitialCityState();
    recomputeTourism(state);
    expect(state.tourism.attractiveness.score).toBe(0);
    expect(state.tourism.income).toBe(0);
  });

  it("combines parks, landmarks, services, and low pollution into income", () => {
    const state = createInitialCityState();
    state.buildings = [building("park"), building("landmark_statue")];
    state.services.healthCoverage = 60;
    state.services.educationCoverage = 60;
    recomputeTourism(state);
    expect(state.tourism.attractiveness.score).toBe(40);
    expect(state.tourism.income).toBe(2000);
  });
});

function building(definitionId: string): BuildingInstance {
  return {
    id: definitionId,
    definitionId,
    position: [1, 1],
    rotation: 0,
    status: "active",
    warnings: [],
    createdAtTick: 0,
    lockedUntilTick: 0,
    unresolvedWarningTicks: 0,
    upgradeTier: 1,
    lastUpgradeTick: 0,
  };
}
