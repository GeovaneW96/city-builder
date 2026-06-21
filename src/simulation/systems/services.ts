import { SERVICE_DEMAND } from "../../data/balance";
import { getBuildingById } from "../../data/buildings";
import type { BuildingInstance, CityState } from "../../shared/types";
import { getDefinition } from "./metrics";
import { getServicePriorityBuildings } from "./districts";
import { getEducationSpecializationMultiplier } from "./specialization";

export function recomputeServices(state: CityState): void {
  const activeBuildings = state.buildings.filter(
    (building) => building.status === "active",
  );
  state.services = {
    powerCapacity: sumCapacity(activeBuildings, "powerCapacity"),
    powerDemand: sumDemand(activeBuildings, "power"),
    waterCapacity: sumCapacity(activeBuildings, "waterCapacity"),
    waterDemand: sumDemand(activeBuildings, "water"),
    healthCoverage: calculateCoverage(state, activeBuildings, "healthRadius"),
    educationCoverage: calculateCoverage(state, activeBuildings, "educationRadius"),
    healthQuality: calculateQuality(activeBuildings, "health"),
    educationQuality: calculateQuality(activeBuildings, "education"),
    workforceQuality: getWorkforceQuality(state, activeBuildings),
  };
}

function getWorkforceQuality(state: CityState, buildings: BuildingInstance[]): number {
  return Math.min(
    100,
    Math.round(
      calculateQuality(buildings, "education") *
        getEducationSpecializationMultiplier(state),
    ),
  );
}

function calculateQuality(
  buildings: BuildingInstance[],
  service: "health" | "education",
): number {
  const capacityKey = service === "health" ? "healthCapacity" : "educationCapacity";
  const tierKey = service === "health" ? "healthTier" : "educationTier";
  const radiusKey = service === "health" ? "healthRadius" : "educationRadius";
  const residents = buildings.filter(hasResidents);
  const weightedCapacity = buildings.reduce((total, building) => {
    const effects = getDefinition(building)?.effects;
    return total + (effects?.[capacityKey] ?? 0) * (effects?.[tierKey] ?? 0);
  }, 0);
  if (residents.length === 0 || weightedCapacity === 0) return 0;
  const served = residents.reduce((total, resident) => {
    return total + getQualityCoverage(resident, buildings, radiusKey, tierKey);
  }, 0);
  return Math.min(100, Math.round((served / (residents.length * 3)) * 100));
}

function getQualityCoverage(
  resident: BuildingInstance,
  providers: BuildingInstance[],
  radiusKey: "healthRadius" | "educationRadius",
  tierKey: "healthTier" | "educationTier",
): number {
  return providers.reduce((total, provider) => {
    const effects = getDefinition(provider)?.effects;
    const covered =
      getManhattanDistance(resident, provider) <= (effects?.[radiusKey] ?? 0);
    return total + (covered ? (effects?.[tierKey] ?? 0) : 0);
  }, 0);
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
  state: CityState,
  buildings: BuildingInstance[],
  radiusEffect: "healthRadius" | "educationRadius",
): number {
  const residential = buildings.filter(hasResidents);
  if (residential.length === 0) return 0;
  const providers = buildings.filter((building) => {
    const definition = getDefinition(building);
    return (definition?.effects[radiusEffect] ?? 0) > 0;
  });
  const covered = getServicePriorityBuildings(state, residential).filter((building) =>
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
