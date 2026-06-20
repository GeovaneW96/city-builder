import { describe, expect, it } from "vitest";
import { createInitialCityState } from "../state";
import { getEventTaxMultiplier, updateEvents } from "./events";

describe("city events", () => {
  it("triggers and resolves an epidemic from health coverage", () => {
    const state = createInitialCityState();
    state.population.total = 100;
    updateEvents(state);
    expect(state.events[0]?.type).toBe("epidemic");
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
});
