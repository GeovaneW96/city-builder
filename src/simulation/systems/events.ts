import type { CityEventType, CityState } from "../../shared/types";

export function updateEvents(state: CityState): void {
  state.events = state.events.filter(
    (event) =>
      event.durationTicks === 0 ||
      state.time.tick < event.startTick + event.durationTicks,
  );
  if (state.services.healthCoverage >= 30)
    state.events = state.events.filter((event) => event.type !== "epidemic");
  refreshFestival(state);
  if (state.events.some((event) => event.type !== "festival")) return;
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
  const epidemic = state.events.some((event) => event.type === "epidemic") ? -20 : 0;
  const festival = state.events.some((event) => event.type === "festival") ? 10 : 0;
  return epidemic + festival;
}

function refreshFestival(state: CityState): void {
  const landmarkPlaced = state.buildings.some(
    (building) =>
      building.createdAtTick === state.time.tick &&
      building.definitionId.startsWith("landmark_"),
  );
  if (!landmarkPlaced) return;
  state.events = state.events.filter((event) => event.type !== "festival");
  state.events.push({
    id: `festival:${state.time.tick}`,
    type: "festival",
    startTick: state.time.tick,
    durationTicks: 3,
  });
}
