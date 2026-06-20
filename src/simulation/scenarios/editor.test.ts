import { describe, expect, it } from "vitest";
import {
  createScenario,
  exportScenario,
  importScenario,
  validateScenario,
} from "./editor";

describe("scenario editor contract", () => {
  it("creates and round-trips a valid custom scenario", () => {
    const scenario = createScenario();
    scenario.objectives.push({
      id: "population",
      order: 0,
      description: "Grow",
      condition: "population",
      value: 500,
    });
    expect(importScenario(exportScenario(scenario))).toEqual(scenario);
  });

  it("reports invalid dimensions and building references", () => {
    const scenario = createScenario();
    scenario.mapWidth = 0;
    scenario.objectives.push({
      id: "build",
      order: 0,
      description: "Build",
      condition: "build_building",
      value: 1,
      buildingId: "missing",
    });
    expect(validateScenario(scenario)).toHaveLength(2);
  });
});
