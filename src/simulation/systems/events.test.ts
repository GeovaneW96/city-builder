import { describe, expect, it } from "vitest";
import { createInitialCityState } from "../state";
import type { BuildingInstance } from "../../shared/types";
import {
  getEventFireSpreadMultiplier,
  getEventHappinessModifier,
  getEventTaxMultiplier,
  updateEvents,
} from "./events";

describe("core events", () => {
  it("triggers and resolves an epidemic from health coverage", () => {
    const state = createInitialCityState();
    state.population.total = 100;
    updateEvents(state);
    expect(state.events[0]?.type).toBe("epidemic");
    expect(getEventHappinessModifier(state)).toBe(-20);
    state.services.healthCoverage = 30;
    updateEvents(state);
    expect(state.events).toHaveLength(0);
  });

  it("triggers finite boom and downturn events with tax modifiers", () => {
    const boom = createInitialCityState();
    boom.population.total = 600;
    boom.services.healthCoverage = 100;
    boom.happiness.value = 80;
    updateEvents(boom);
    expect(getEventTaxMultiplier(boom)).toBe(1.5);
    boom.time.tick = 6;
    boom.happiness.value = 70;
    updateEvents(boom);
    expect(boom.events).toHaveLength(0);

    const downturn = createInitialCityState();
    downturn.population.total = 100;
    downturn.services.healthCoverage = 100;
    downturn.happiness.value = 30;
    updateEvents(downturn);
    expect(getEventTaxMultiplier(downturn)).toBe(0.7);
  });

  it("starts and refreshes a landmark festival", () => {
    const state = createInitialCityState();
    state.buildings = [building("landmark_statue")];
    updateEvents(state);
    expect(state.events.find((event) => event.type === "festival")).toBeDefined();
    expect(getEventHappinessModifier(state)).toBe(10);
  });
});

describe("disaster events", () => {
  it("triggers and resolves a fire event with happiness penalty", () => {
    const state = createInitialCityState();
    state.population.total = 100;
    state.services.healthCoverage = 100;
    state.buildings = [building("small_factory")];
    state.extendedServices.fireCoverage = 20;
    updateEvents(state);
    expect(state.events.some((event) => event.type === "fire")).toBe(true);
    expect(getEventHappinessModifier(state)).toBe(-15);
    expect(getEventFireSpreadMultiplier(state)).toBe(2);
    state.extendedServices.fireCoverage = 40;
    updateEvents(state);
    expect(state.events.some((event) => event.type === "fire")).toBe(false);
  });

  it("triggers and resolves a flood event with happiness penalty", () => {
    const state = createInitialCityState();
    state.population.total = 200;
    state.services.healthCoverage = 100;
    state.map[0]![0]!.terrain = "water";
    state.map[0]![0]!.elevation = 0;
    state.services.waterCapacity = 50;
    state.services.waterDemand = 100;
    updateEvents(state);
    expect(state.events.some((event) => event.type === "flood")).toBe(true);
    expect(getEventHappinessModifier(state)).toBe(-10);
    state.services.waterCapacity = 200;
    updateEvents(state);
    expect(state.events.some((event) => event.type === "flood")).toBe(false);
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
