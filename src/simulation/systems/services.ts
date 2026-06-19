import { SERVICE_DEMAND } from "../../data/balance";
import { getBuildingById } from "../../data/buildings";
import type { BuildingInstance, CityState } from "../../shared/types";
import { getDefinition } from "./metrics";

export function recomputeServices(state: CityState): void {
  const activeBuildings = state.buildings.filter(
    (building) => building.status === "active",
  );
  state.services = {
    powerCapacity: sumCapacity(activeBuildings, "powerCapacity"),
    powerDemand: sumDemand(activeBuildings, "power"),
    waterCapacity: sumCapacity(activeBuildings, "waterCapacity"),
    waterDemand: sumDemand(activeBuildings, "water"),
    healthCoverage: calculateCoverage(activeBuildings, "healthRadius"),
    educationCoverage: calculateCoverage(activeBuildings, "educationRadius"),
  };
}

function sumCapacity(
  buildings: BuildingInstance[],
  effect: "powerCapacity" | "waterCapacity",
): number {
  return buildings.reduce((total, building) => {
    const definition = getBuildingById(building.definitionId);
    return total + (definition?.effects[effect] ?? 0);
  }, 0);
}

function sumDemand(buildings: BuildingInstance[], utility: "power" | "water"): number {
  return buildings.reduce(
    (total, building) => total + getUtilityDemand(building, utility),
    0,
  );
}

function getUtilityDemand(
  building: BuildingInstance,
  utility: "power" | "water",
): number {
  const definition = getDefinition(building);
  if (!definition) return 0;
  if (definition.category === "civic" || definition.category === "decoration") return 0;
  if (definition.category === "residential")
    return getDemandValue(utility, "RESIDENTIAL");
  if (definition.category === "commercial") return getDemandValue(utility, "COMMERCIAL");
  if (definition.category === "industrial") return getDemandValue(utility, "INDUSTRIAL");
  if (definition.category === "utility") return getDemandValue(utility, "UTILITY");
  return getDemandValue(utility, "SERVICE");
}

function getDemandValue(
  utility: "power" | "water",
  category: "RESIDENTIAL" | "COMMERCIAL" | "INDUSTRIAL" | "SERVICE" | "UTILITY",
): number {
  const key = `${category}_${utility.toUpperCase()}` as keyof typeof SERVICE_DEMAND;
  return SERVICE_DEMAND[key];
}

function calculateCoverage(
  buildings: BuildingInstance[],
  radiusEffect: "healthRadius" | "educationRadius",
): number {
  const residential = buildings.filter(hasResidents);
  if (residential.length === 0) return 0;
  const providers = buildings.filter((building) => {
    const definition = getDefinition(building);
    return (definition?.effects[radiusEffect] ?? 0) > 0;
  });
  const covered = residential.filter((building) =>
    isCovered(building, providers, radiusEffect),
  );
  return Math.round((covered.length / residential.length) * 100);
}

function hasResidents(building: BuildingInstance): boolean {
  const definition = getDefinition(building);
  return (definition?.effects.populationCapacity ?? 0) > 0;
}

function isCovered(
  building: BuildingInstance,
  providers: BuildingInstance[],
  radiusEffect: "healthRadius" | "educationRadius",
): boolean {
  return providers.some((provider) => {
    const definition = getDefinition(provider);
    const radius = definition?.effects[radiusEffect] ?? 0;
    return getManhattanDistance(building, provider) <= radius;
  });
}

function getManhattanDistance(a: BuildingInstance, b: BuildingInstance): number {
  return (
    Math.abs(a.position[0] - b.position[0]) + Math.abs(a.position[1] - b.position[1])
  );
}
