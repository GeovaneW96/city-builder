import type { CityState } from "../../shared/types";
import type { CityMetrics } from "./metrics";

export function recomputePopulation(state: CityState, metrics: CityMetrics): void {
  const previousTotal = state.population.total;
  state.population = {
    total: metrics.residentialCapacity,
    residentialCapacity: metrics.residentialCapacity,
    employedWorkers: metrics.employedWorkers,
    unemployedWorkers: metrics.unemployedWorkers,
    growthRate: metrics.residentialCapacity - previousTotal,
  };
}
