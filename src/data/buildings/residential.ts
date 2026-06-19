import type { BuildingDefinition } from "../../shared/types";

export const RESIDENTIAL_BUILDINGS: BuildingDefinition[] = [
  {
    id: "small_house",
    name: "Small House",
    category: "residential",
    placementType: "zone-grown",
    size: [1, 1],
    cost: 0,
    upkeep: 0,
    unlockPopulation: 0,
    requirements: { roadAccess: true },
    effects: { populationCapacity: 8, taxType: "residential" },
  },
];
