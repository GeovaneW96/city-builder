import type { BuildingDefinition } from "../../shared/types";

export const CIVIC_BUILDINGS: BuildingDefinition[] = [
  {
    id: "city_hall",
    name: "City Hall",
    category: "civic",
    placementType: "manual",
    size: [3, 3],
    cost: 0,
    upkeep: 0,
    unlockPopulation: 0,
    requirements: { roadAccess: true },
    effects: {},
  },
  {
    id: "park",
    name: "Park",
    category: "decoration",
    placementType: "manual",
    size: [1, 1],
    cost: 2500,
    upkeep: 100,
    unlockPopulation: 250,
    requirements: { roadAccess: false },
    effects: { happiness: 5 },
  },
];
