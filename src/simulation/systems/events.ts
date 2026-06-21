import type { CityEventType, CityState } from "../../shared/types";

export function updateEvents(state: CityState): void {
  state.events = state.events.filter(
    (event) =>
      event.durationTicks === 0 ||
      state.time.tick < event.startTick + event.durationTicks,
  );
  if (state.services.healthCoverage >= 30)
    state.events = state.events.filter((event) => event.type !== "epidemic");
  if (state.events.length > 0) return;
  const type = getTriggeredEvent(state);
  if (type)
    state.events.push({
      id: `${type}:${state.time.tick}`,
      type,
      startTick: state.time.tick,
      durationTicks: type === "epidemic" ? 0 : 6,
    });
}

function getTriggeredEvent(state: CityState): CityEventType | null {
  if (state.population.total > 0 && state.services.healthCoverage < 30) return "epidemic";
  if (state.happiness.value > 70 && state.population.total > 500) return "economic_boom";
  if (state.happiness.value < 40 && state.population.total > 0)
    return "economic_downturn";
  return null;
}

export function getEventTaxMultiplier(state: CityState): number {
  if (state.events.some((event) => event.type === "economic_boom")) return 1.5;
  if (state.events.some((event) => event.type === "economic_downturn")) return 0.7;
  return 1;
}

export function getEventHappinessModifier(state: CityState): number {
  if (state.events.some((event) => event.type === "epidemic")) return -20;
  return 0;
}
