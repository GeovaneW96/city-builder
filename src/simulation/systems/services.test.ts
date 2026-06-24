import { describe, expect, it } from "vitest";
import { getBuildingById } from "../../data/buildings";
import type { BuildingInstance } from "../../shared/types";
import { createInitialCityState } from "../state";
import { recomputeServices } from "./services";
import { calculateCityMetrics } from "./metrics";

describe("tiered education and healthcare", () => {
  it("defines the documented education and healthcare buildings", () => {
    expect(getBuildingById("elementary_school")).toMatchObject({
      cost: 15000,
      upkeep: 600,
      effects: { educationCapacity: 200, educationTier: 1 },
    });
    expect(getBuildingById("university")?.effects.educationTier).toBe(3);
    expect(getBuildingById("hospital")?.effects.healthCapacity).toBe(500);
    expect(getBuildingById("medical_center")?.effects.healthTier).toBe(3);
  });

  it("derives coverage, quality, and workforce quality from nearby tiered services", () => {
    const state = createInitialCityState();
    state.buildings = [
      building("small_house", 5, 5),
      building("elementary_school", 5, 6),
      building("clinic", 6, 5),
    ];

    recomputeServices(state);

    expect(state.services.educationCoverage).toBe(100);
    expect(state.services.healthCoverage).toBe(100);
    expect(state.services.educationQuality).toBeGreaterThan(0);
    expect(state.services.healthQuality).toBeGreaterThan(0);
    expect(state.services.workforceQuality).toBe(state.services.educationQuality);
  });

  it("gives higher service tiers a stronger quality contribution", () => {
    const elementary = createInitialCityState();
    elementary.buildings = [
      building("small_house", 5, 5),
      building("elementary_school", 5, 6),
    ];
    const university = createInitialCityState();
    university.buildings = [building("small_house", 5, 5), building("university", 5, 6)];

    recomputeServices(elementary);
    recomputeServices(university);

    expect(university.services.educationQuality).toBeGreaterThan(
      elementary.services.educationQuality,
    );
  });
});

describe("utility shortages", () => {
  it("reduces occupied homes and available jobs by the limiting utility ratio", () => {
    const state = createInitialCityState();
    state.buildings = [
      building("small_house", 5, 5),
      building("small_shop", 6, 5),
      building("small_factory", 7, 5),
    ];
    state.services.powerCapacity = 50;
    state.services.powerDemand = 100;
    state.services.waterCapacity = 100;
    state.services.waterDemand = 100;

    const metrics = calculateCityMetrics(state);

    expect(metrics.residentialCapacity).toBe(4);
    expect(metrics.commercialJobs).toBe(3);
    expect(metrics.industrialJobs).toBe(6);
  });
});

function building(definitionId: string, x: number, y: number): BuildingInstance {
  return {
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
}
