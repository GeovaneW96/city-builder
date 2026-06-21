import { getBuildingById } from "../../data/buildings";
import type { CityState, SpecializationId } from "../../shared/types";

export function canSelectSpecialization(state: CityState, id: SpecializationId): boolean {
  if (state.population.total < 5000) return false;
  const count = (category: string) =>
    state.buildings.filter(
      (building) =>
        building.status === "active" &&
        getBuildingById(building.definitionId)?.category === category,
    ).length;
  if (id === "industrial_hub") return count("industrial") >= 5;
  if (id === "commercial_hub") return count("commercial") >= 5;
  if (id === "tourist_destination")
    return (
      state.population.total >= 10000 &&
      state.buildings.some((building) => building.definitionId.startsWith("landmark_"))
    );
  if (id === "education_center")
    return (
      state.buildings.filter(
        (building) =>
          (getBuildingById(building.definitionId)?.effects.educationCapacity ?? 0) > 0,
      ).length >= 2
    );
  return count("decoration") >= 3;
}

export function getSpecializationMultiplier(
  state: CityState,
  target: "industrial" | "commercial" | "tourism",
): number {
  const effects: Record<string, Partial<Record<typeof target, number>>> = {
    industrial_hub: { industrial: 1.5 },
    commercial_hub: { commercial: 1.5 },
    tourist_destination: { tourism: 2, commercial: 0.8 },
    green_city: { industrial: 0.7 },
  };
  return effects[state.specialization.active ?? ""]?.[target] ?? 1;
}

export function getEducationSpecializationMultiplier(state: CityState): number {
  return state.specialization.active === "education_center" ? 1.5 : 1;
}

export function getPollutionSpecializationMultiplier(state: CityState): number {
  if (state.specialization.active === "industrial_hub") return 1.5;
  if (state.specialization.active === "green_city") return 0.5;
  return 1;
}

export function getSpecializationHappinessModifier(state: CityState): number {
  return state.specialization.active === "green_city" ? 10 : 0;
}
