import { FIRST_SETTLEMENT } from "../../data/scenarios/first_settlement";
import { MILESTONES } from "../../data/unlocks/milestones";
import type { CityState } from "../../shared/types";

export interface ObjectivePanelElements {
  root: HTMLElement;
  objective: HTMLElement;
  progress: HTMLElement;
  hint: HTMLElement;
  unlock: HTMLElement;
  happiness: HTMLElement;
}

export function createObjectivePanel(): ObjectivePanelElements {
  const root = document.createElement("aside");
  root.className = "objective-panel";
  root.dataset.ui = "objective";
  root.innerHTML = `
    <div class="objective-panel-title">Current objective</div>
    <div class="objective-panel-label" data-ui="objective-label"></div>
    <div class="objective-panel-progress" data-ui="objective-progress"></div>
    <div class="objective-panel-hint" data-ui="objective-hint"></div>
    <div class="objective-panel-unlock" data-ui="objective-unlock"></div>
    <div class="objective-panel-happiness" data-ui="objective-happiness"></div>
  `;
  return {
    root,
    objective: findEl(root, "objective-label"),
    progress: findEl(root, "objective-progress"),
    hint: findEl(root, "objective-hint"),
    unlock: findEl(root, "objective-unlock"),
    happiness: findEl(root, "objective-happiness"),
  };
}

export function updateObjectivePanel(
  els: ObjectivePanelElements,
  state: CityState,
): void {
  const objective = FIRST_SETTLEMENT.objectives.find(
    (item) => !state.progression.completedObjectives.includes(item.id),
  );
  els.objective.textContent = objective?.label ?? getScenarioStatusLabel(state);
  els.progress.textContent = getObjectiveProgress(objective, state);
  els.hint.textContent = getObjectiveHint(objective, state);
  els.unlock.textContent = getNextUnlock(state);
  els.happiness.textContent = getHappinessFeedback(state);
}

function findEl(root: HTMLElement, key: string): HTMLElement {
  return root.querySelector(`[data-ui='${key}']`) ?? document.createElement("div");
}

function getObjectiveProgress(
  objective: (typeof FIRST_SETTLEMENT.objectives)[number] | undefined,
  state: CityState,
): string {
  if (objective?.condition !== "reach_population" || !objective.target) return "";
  return `${Math.min(state.population.total, objective.target)} / ${objective.target} population`;
}

function getNextUnlock(state: CityState): string {
  const milestone = MILESTONES.find(
    (item) => item.population > state.population.total && item.unlocks.length > 0,
  );
  if (!milestone) return "Final goal: reach 1,000 population";
  return `Next unlock: ${formatUnlock(milestone.unlocks[0] ?? "")} at ${milestone.population} population`;
}

function getObjectiveHint(
  objective: (typeof FIRST_SETTLEMENT.objectives)[number] | undefined,
  state: CityState,
): string {
  if (!objective) return "";
  if (objective.condition === "place_road")
    return "How: Roads → Dirt Road, then click grass.";
  if (objective.condition === "paint_zone") {
    return `How: Zones → ${formatUnlock(objective.zoneType ?? "")} beside a road.`;
  }
  if (objective.condition === "reach_population") {
    return getPopulationObjectiveHint(objective.target, state.population.total);
  }
  const tab = objective.buildingId === "landfill" ? "Utilities" : "Services";
  return `How: ${tab} → ${formatUnlock(objective.buildingId ?? "building")}.`;
}

function getPopulationObjectiveHint(
  target: number | undefined,
  population: number,
): string {
  if (target === 50)
    return "How: build power and water utilities, then zone homes beside roads.";
  if (target === 100)
    return "How: paint commercial zones beside roads; shops need residents.";
  if (target === 250)
    return "How: add commercial and industrial jobs, then grow more homes.";
  if (target === 500) return "How: balance homes with jobs and keep utilities supplied.";
  if (target === 750)
    return "How: expand housing and add jobs to support more residents.";
  if (target === 1000) return "How: grow a balanced city while protecting happiness.";
  return `How: grow homes and jobs beyond ${population} residents.`;
}

function getHappinessFeedback(state: CityState): string {
  if (state.happiness.value >= 70) return "Happiness: stable";
  const penalty = Object.entries(state.happiness.components)
    .filter(([, value]) => value < 0)
    .sort(([, left], [, right]) => left - right)[0];
  if (!penalty) return "Happiness: review taxes and city warnings.";
  const [component, value] = penalty;
  return `Happiness: ${formatUnlock(component)} ${value}. ${getHappinessRemedy(
    component,
    state,
  )}`;
}

function getHappinessRemedy(component: string, state: CityState): string {
  if (component === "utility") return getUtilityRemedy(state);
  if (component === "unemployment")
    return "Reach 50 population, then zone commercial jobs.";
  if (component === "pollution") return "Keep industry away from homes.";
  if (component === "traffic") return "Add routes or upgrade busy roads.";
  if (component === "goods") return "Zone industry to supply shops.";
  if (component === "crime") return "Build a police station when unlocked.";
  if (component === "garbage") return "Build a landfill when garbage builds up.";
  return "Adjust taxes or add services.";
}

function getUtilityRemedy(state: CityState): string {
  const needsPower = state.services.powerDemand > state.services.powerCapacity;
  const needsWater = state.services.waterDemand > state.services.waterCapacity;
  if (needsPower && needsWater) return "Build a power plant and water tower.";
  if (needsPower) return "Build a power plant.";
  return "Build a water tower.";
}

function formatUnlock(feature: string): string {
  return feature.replace("_zoning", " zoning").replace(/_/g, " ");
}

function getScenarioStatusLabel(state: CityState): string {
  if (state.progression.scenarioStatus === "won") return "First Settlement complete";
  if (state.progression.scenarioStatus === "lost") return "City bankrupt";
  return "Scenario complete";
}
