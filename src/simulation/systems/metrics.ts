import { getBuildingById } from "../../data/buildings";
import { UTILITY_AVAILABILITY } from "../../data/balance";
import type {
  BuildingCategory,
  BuildingDefinition,
  BuildingInstance,
  CityState,
} from "../../shared/types";
import { getIndustrialLandValueMultiplier } from "./land-productivity";
import { getResourceMultiplier } from "./resources";

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
  const utilityAvailability = getUtilityAvailability(state);
  const capacity = scaleForUtilities(
    sumEffect(state, activeBuildings, "residential", "populationCapacity"),
    utilityAvailability,
  );
  const commercialJobs = scaleForUtilities(
    sumEffect(state, activeBuildings, "commercial", "jobs"),
    utilityAvailability,
  );
  const industrialJobs = scaleForUtilities(
    sumEffect(state, activeBuildings, "industrial", "jobs"),
    utilityAvailability,
  );
  const serviceJobs = scaleForUtilities(
    activeBuildings.reduce(sumServiceJobs, 0),
    utilityAvailability,
  );
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

export function getUtilityAvailability(state: CityState): number {
  return Math.min(
    getUtilityRatio(state.services.powerCapacity, state.services.powerDemand),
    getUtilityRatio(state.services.waterCapacity, state.services.waterDemand),
  );
}

function getUtilityRatio(capacity: number, demand: number): number {
  if (demand === 0) return UTILITY_AVAILABILITY.MAX_PRODUCTIVITY;
  return Math.max(
    UTILITY_AVAILABILITY.MIN_PRODUCTIVITY,
    Math.min(UTILITY_AVAILABILITY.MAX_PRODUCTIVITY, capacity / demand),
  );
}

function scaleForUtilities(value: number, availability: number): number {
  return Math.floor(value * availability);
}

export function getAvailableJobs(metrics: CityMetrics, population: number): number {
  return Math.max(0, metrics.totalJobs - population);
}

export function getAvailableHousing(metrics: CityMetrics, population: number): number {
  return Math.max(0, metrics.residentialCapacity - population);
}

function sumEffect(
  state: CityState,
  buildings: BuildingInstance[],
  category: BuildingCategory,
  effect: "populationCapacity" | "jobs",
): number {
  return buildings.reduce((total, building) => {
    const definition = getDefinition(building);
    if (!definition || definition.category !== category) return total;
    const value = definition.effects[effect] ?? 0;
    const landValueMultiplier =
      category === "industrial" && effect === "jobs"
        ? getIndustrialLandValueMultiplier(state, building)
        : 1;
    const resourceMultiplier =
      category === "industrial" && effect === "jobs"
        ? getResourceMultiplier(state.map[building.position[1]]?.[building.position[0]])
        : 1;
    return total + value * landValueMultiplier * resourceMultiplier;
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
