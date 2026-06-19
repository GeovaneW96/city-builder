import { getBuildingById } from "../../data/buildings";
import type {
  BuildingCategory,
  BuildingDefinition,
  BuildingInstance,
  CityState,
} from "../../shared/types";

export interface CityMetrics {
  activeBuildings: BuildingInstance[];
  residentialCapacity: number;
  commercialJobs: number;
  industrialJobs: number;
  serviceJobs: number;
  totalJobs: number;
  employedWorkers: number;
  unemployedWorkers: number;
  commercialJobsFilled: number;
  industrialJobsFilled: number;
}

export function getDefinition(building: BuildingInstance): BuildingDefinition | null {
  return getBuildingById(building.definitionId) ?? null;
}

export function calculateCityMetrics(state: CityState): CityMetrics {
  const activeBuildings = state.buildings.filter(
    (building) => building.status === "active",
  );
  const capacity = sumEffect(activeBuildings, "residential", "populationCapacity");
  const commercialJobs = sumEffect(activeBuildings, "commercial", "jobs");
  const industrialJobs = sumEffect(activeBuildings, "industrial", "jobs");
  const serviceJobs = activeBuildings.reduce(sumServiceJobs, 0);
  const totalJobs = commercialJobs + industrialJobs + serviceJobs;
  const allocations = allocateWorkers(
    state.population.total,
    serviceJobs,
    commercialJobs,
    industrialJobs,
  );

  return {
    activeBuildings,
    residentialCapacity: capacity,
    commercialJobs,
    industrialJobs,
    serviceJobs,
    totalJobs,
    employedWorkers: allocations.employedWorkers,
    unemployedWorkers: allocations.unemployedWorkers,
    commercialJobsFilled: allocations.commercialJobsFilled,
    industrialJobsFilled: allocations.industrialJobsFilled,
  };
}

export function getAvailableJobs(metrics: CityMetrics, population: number): number {
  return Math.max(0, metrics.totalJobs - population);
}

export function getAvailableHousing(metrics: CityMetrics, population: number): number {
  return Math.max(0, metrics.residentialCapacity - population);
}

function sumEffect(
  buildings: BuildingInstance[],
  category: BuildingCategory,
  effect: "populationCapacity" | "jobs",
): number {
  return buildings.reduce((total, building) => {
    const definition = getDefinition(building);
    if (!definition || definition.category !== category) return total;
    return total + (definition.effects[effect] ?? 0);
  }, 0);
}

function sumServiceJobs(total: number, building: BuildingInstance): number {
  const definition = getDefinition(building);
  if (!definition || isTaxedJobCategory(definition.category)) return total;
  return total + (definition.effects.jobs ?? 0);
}

function allocateWorkers(
  population: number,
  serviceJobs: number,
  commercialJobs: number,
  industrialJobs: number,
) {
  const serviceFilled = Math.min(population, serviceJobs);
  const afterService = population - serviceFilled;
  const commercialJobsFilled = Math.min(afterService, commercialJobs);
  const afterCommercial = afterService - commercialJobsFilled;
  const industrialJobsFilled = Math.min(afterCommercial, industrialJobs);
  const employedWorkers = serviceFilled + commercialJobsFilled + industrialJobsFilled;

  return {
    employedWorkers,
    unemployedWorkers: Math.max(0, population - employedWorkers),
    commercialJobsFilled,
    industrialJobsFilled,
  };
}

function isTaxedJobCategory(category: BuildingCategory): boolean {
  return category === "commercial" || category === "industrial";
}
