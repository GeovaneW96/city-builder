import type { CityState, GameEvent, SimulationTickResult } from "../../shared/types";
import { cloneCityState } from "../grid/map";
import { runEconomy } from "./economy";
import { recomputeDemand } from "./demand";
import { growZonedBuildings, updateConstructionStatuses } from "./growth";
import { calculateCityMetrics } from "./metrics";
import { recomputePopulation } from "./population";
import { recomputeServices } from "./services";
import { recomputeHappiness } from "./happiness";
import { recomputePollution } from "./pollution";
import { recomputeLandValue } from "./land-value";
import { rebuildWarnings } from "./warnings";
import { updateProgression } from "./progression";
import { updateBuildingUpgrades } from "./upgrades";
import { advanceTime } from "./time";

export type TickResult = SimulationTickResult;

export function tickCity(current: CityState): TickResult {
  if (current.time.speed === 0) return { state: current, events: [] };

  const state = cloneCityState(current);
  const events: GameEvent[] = [];
  const firstTick = state.time.tick === 0;
  const initialMetrics = calculateCityMetrics(state);
  if (!firstTick) runEconomy(state, initialMetrics);

  recomputeDemand(state, initialMetrics);
  events.push(...updateConstructionStatuses(state));
  events.push(...updateBuildingUpgrades(state));
  if (!firstTick) events.push(...growZonedBuildings(state));

  recomputePollution(state);
  recomputeLandValue(state);
  const grownMetrics = calculateCityMetrics(state);
  recomputePopulation(state, grownMetrics);
  recomputeServices(state);
  recomputeHappiness(state);
  events.push(...rebuildWarnings(state));
  events.push(...updateProgression(state));
  emitSummaryEvents(state, events);
  advanceTime(state);
  return { state, events };
}

function emitSummaryEvents(state: CityState, events: GameEvent[]): void {
  events.push({
    type: "ECONOMY_TICK",
    money: state.economy.money,
    income: state.economy.monthlyIncome,
    expenses: state.economy.monthlyExpenses,
  });
  events.push({ type: "DEMAND_CHANGED", demand: state.demand });
  events.push({ type: "POPULATION_CHANGED", total: state.population.total });
  events.push({ type: "HAPPINESS_CHANGED", value: state.happiness.value });
}
