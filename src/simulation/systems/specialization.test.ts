import { describe, expect, it } from "vitest";
import { processCityCommand } from "../commands/process";
import { createInitialCityState } from "../state";
import { getSpecializationMultiplier } from "./specialization";
import {
  getEducationSpecializationMultiplier,
  getPollutionSpecializationMultiplier,
  getSpecializationHappinessModifier,
} from "./specialization";

describe("city specialization", () => {
  it("starts inactive and enforces industrial hub requirements", () => {
    const state = createInitialCityState();
    expect(state.specialization.active).toBeNull();
    expect(
      processCityCommand(state, {
        type: "SET_SPECIALIZATION",
        specializationId: "industrial_hub",
      }).result.success,
    ).toBe(false);
  });

  it("switches when requirements are met, charges switches, and applies modifiers", () => {
    const state = createInitialCityState();
    state.population.total = 5000;
    state.buildings = Array.from({ length: 5 }, (_, index) =>
      building(`factory:${index}`, "small_factory"),
    );
    const first = processCityCommand(state, {
      type: "SET_SPECIALIZATION",
      specializationId: "industrial_hub",
    }).state;
    first.time.tick = 12;
    first.economy.monthlyIncome = 1000;
    first.buildings = Array.from({ length: 5 }, (_, index) =>
      building(`shop:${index}`, "small_shop"),
    );
    const second = processCityCommand(first, {
      type: "SET_SPECIALIZATION",
      specializationId: "commercial_hub",
    }).state;

    expect(getSpecializationMultiplier(first, "industrial")).toBe(1.5);
    expect(second.economy.money).toBe(first.economy.money - 500);
    expect(getSpecializationMultiplier(second, "commercial")).toBe(1.5);
    expect(
      processCityCommand(second, {
        type: "SET_SPECIALIZATION",
        specializationId: "commercial_hub",
      }).result.success,
    ).toBe(false);
  });

  it("amplifies education effectiveness for an education center", () => {
    const state = createInitialCityState();
    state.specialization.active = "education_center";
    expect(getEducationSpecializationMultiplier(state)).toBe(1.5);
  });

  it("applies tradeoffs for all specializations", () => {
    const state = createInitialCityState();

    state.specialization.active = "industrial_hub";
    expect(getSpecializationMultiplier(state, "industrial")).toBe(1.5);
    expect(getSpecializationMultiplier(state, "commercial")).toBe(0.8);
    expect(getPollutionSpecializationMultiplier(state)).toBe(1.5);
    expect(getSpecializationHappinessModifier(state)).toBe(-5);

    state.specialization.active = "commercial_hub";
    expect(getSpecializationMultiplier(state, "commercial")).toBe(1.5);
    expect(getSpecializationMultiplier(state, "industrial")).toBe(0.8);

    state.specialization.active = "education_center";
    expect(getEducationSpecializationMultiplier(state)).toBe(1.5);
    expect(getSpecializationMultiplier(state, "commercial")).toBe(0.9);
    expect(getSpecializationMultiplier(state, "industrial")).toBe(0.9);
    expect(getPollutionSpecializationMultiplier(state)).toBe(0.8);

    state.specialization.active = "green_city";
    expect(getPollutionSpecializationMultiplier(state)).toBe(0.5);
    expect(getSpecializationHappinessModifier(state)).toBe(10);
  });
});

function building(id: string, definitionId: string) {
  return {
    id,
    definitionId,
    position: [1, 1] as [number, number],
    rotation: 0 as const,
    status: "active" as const,
    warnings: [],
    createdAtTick: 0,
    lockedUntilTick: 0,
    unresolvedWarningTicks: 0,
    upgradeTier: 1 as const,
    lastUpgradeTick: 0,
  };
}
