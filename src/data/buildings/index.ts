import type { BuildingDefinition } from "../../shared/types";
import { RESIDENTIAL_BUILDINGS } from "./residential";
import { COMMERCIAL_BUILDINGS } from "./commercial";
import { INDUSTRIAL_BUILDINGS } from "./industrial";
import { SERVICE_BUILDINGS } from "./services";
import { UTILITY_BUILDINGS } from "./utilities";
import { CIVIC_BUILDINGS } from "./civic";

export const ALL_BUILDINGS: BuildingDefinition[] = [
  ...RESIDENTIAL_BUILDINGS,
  ...COMMERCIAL_BUILDINGS,
  ...INDUSTRIAL_BUILDINGS,
  ...SERVICE_BUILDINGS,
  ...UTILITY_BUILDINGS,
  ...CIVIC_BUILDINGS,
];

export function getBuildingById(id: string): BuildingDefinition | undefined {
  return ALL_BUILDINGS.find((b) => b.id === id);
}

export function getBuildingsByCategory(category: string): BuildingDefinition[] {
  return ALL_BUILDINGS.filter((b) => b.category === category);
}

export function getManualBuildings(): BuildingDefinition[] {
  return ALL_BUILDINGS.filter((b) => b.placementType === "manual");
}
