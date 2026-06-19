import type { BuildingDefinition } from "../../shared/types";

export const COMMERCIAL_BUILDINGS: BuildingDefinition[] = [
  {
    id: "small_shop",
    name: "Small Shop",
    category: "commercial",
    placementType: "zone-grown",
    size: [1, 1],
    cost: 0,
    upkeep: 0,
    unlockPopulation: 0,
    requirements: { roadAccess: true },
    effects: { jobs: 6, taxType: "commercial" },
  },
];
