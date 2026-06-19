import type { BuildingDefinition } from "../../shared/types";

export const INDUSTRIAL_BUILDINGS: BuildingDefinition[] = [
  {
    id: "small_factory",
    name: "Small Factory",
    category: "industrial",
    placementType: "zone-grown",
    size: [2, 2],
    cost: 0,
    upkeep: 0,
    unlockPopulation: 0,
    requirements: { roadAccess: true },
    effects: { jobs: 12, taxType: "industrial", pollution: 10 },
  },
];
