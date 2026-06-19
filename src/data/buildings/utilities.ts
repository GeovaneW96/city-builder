import type { BuildingDefinition } from "../../shared/types";

export const UTILITY_BUILDINGS: BuildingDefinition[] = [
  {
    id: "power_plant",
    name: "Power Plant",
    category: "utility",
    placementType: "manual",
    size: [3, 3],
    cost: 10000,
    upkeep: 500,
    unlockPopulation: 0,
    requirements: { roadAccess: true },
    effects: { jobs: 10, powerCapacity: 100 },
  },
  {
    id: "water_tower",
    name: "Water Tower",
    category: "utility",
    placementType: "manual",
    size: [1, 1],
    cost: 5000,
    upkeep: 250,
    unlockPopulation: 0,
    requirements: { roadAccess: true },
    effects: { jobs: 2, waterCapacity: 50 },
  },
];
