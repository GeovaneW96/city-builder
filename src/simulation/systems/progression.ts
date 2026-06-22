import { MILESTONES } from "../../data/unlocks/milestones";
import { FIRST_SETTLEMENT } from "../../data/scenarios/first_settlement";
import type { CityState, GameCommand, GameEvent } from "../../shared/types";

export function updateProgression(state: CityState): GameEvent[] {
  const events = applyMilestones(state);
  advancePopulationObjectives(state);
  events.push(...updateScenarioStatus(state));
  return events;
}

export function advanceCommandObjectives(state: CityState, command: GameCommand): void {
  const objective = getCurrentObjective(state);
  if (!objective) return;
  if (objective.condition === "place_road" && command.type === "PLACE_ROAD") {
    completeObjective(state, objective.id);
  }
  if (objective.condition === "paint_zone" && command.type === "PAINT_ZONE") {
    if (objective.zoneType === command.zoneType) completeObjective(state, objective.id);
  }
  if (objective.condition === "build_building" && command.type === "PLACE_BUILDING") {
    if (objective.buildingId === command.definitionId)
      completeObjective(state, objective.id);
  }
}

function applyMilestones(state: CityState): GameEvent[] {
  const events: GameEvent[] = [];
  MILESTONES.forEach((milestone) => {
    if (milestone.population <= state.progression.currentMilestone) return;
    if (state.population.total < milestone.population) return;
    state.progression.currentMilestone = milestone.population;
    state.progression.unlockedFeatures = mergeUnique(
      state.progression.unlockedFeatures,
      milestone.unlocks,
    );
    state.economy.money += milestone.bonus;
    events.push({
      type: "MILESTONE_REACHED",
      milestone: milestone.name,
      population: milestone.population,
    });
  });
  return events;
}

function advancePopulationObjectives(state: CityState): void {
  let objective = getCurrentObjective(state);
  while (objective?.condition === "reach_population") {
    if (state.population.total < (objective.target ?? 0)) return;
    completeObjective(state, objective.id);
    objective = getCurrentObjective(state);
  }
}

function updateScenarioStatus(state: CityState): GameEvent[] {
  if (state.progression.scenarioStatus !== "active") return [];
  if (
    state.economy.monthsBelowZero >= FIRST_SETTLEMENT.lossCondition.monthsBelowZeroMax
  ) {
    state.progression.scenarioStatus = "lost";
    return [{ type: "SCENARIO_LOSE" }];
  }
  if (hasWonScenario(state)) {
    state.progression.scenarioStatus = "won";
    return [{ type: "SCENARIO_WIN" }];
  }
  return [];
}

function hasWonScenario(state: CityState): boolean {
  const win = FIRST_SETTLEMENT.winCondition;
  return (
    state.population.total >= win.populationMin &&
    state.economy.money >= win.moneyMin &&
    state.happiness.value >= win.happinessMin
  );
}

function getCurrentObjective(state: CityState) {
  return FIRST_SETTLEMENT.objectives.find(
    (objective) => !state.progression.completedObjectives.includes(objective.id),
  );
}

function completeObjective(state: CityState, objectiveId: string): void {
  if (state.progression.completedObjectives.includes(objectiveId)) return;
  state.progression.completedObjectives.push(objectiveId);
}

function mergeUnique(current: string[], additions: string[]): string[] {
  return [...new Set([...current, ...additions])];
}
