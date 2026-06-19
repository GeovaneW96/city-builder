import type { BuildingDefinition } from "../../shared/types";

export const SERVICE_BUILDINGS: BuildingDefinition[] = [
  {
    id: "clinic",
    name: "Clinic",
    category: "service",
    placementType: "manual",
    size: [2, 2],
    cost: 8000,
    upkeep: 400,
    unlockPopulation: 500,
    requirements: { roadAccess: true },
    effects: { jobs: 8, healthRadius: 8, happiness: 3 },
  },
  {
    id: "school",
    name: "School",
    category: "service",
    placementType: "manual",
    size: [3, 3],
    cost: 12000,
    upkeep: 600,
    unlockPopulation: 750,
    requirements: { roadAccess: true },
    effects: { jobs: 12, educationRadius: 10, happiness: 3 },
  },
];
