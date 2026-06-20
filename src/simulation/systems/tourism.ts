import { getBuildingById } from "../../data/buildings";
import type { CityState } from "../../shared/types";

export function recomputeTourism(state: CityState): void {
  const parks = state.buildings.reduce((total, building) => {
    const definition = getBuildingById(building.definitionId);
    return (
      total +
      (building.status === "active" && definition?.id === "park"
        ? (definition.effects.happiness ?? 0) * 2
        : 0)
    );
  }, 0);
  const landmarks = state.buildings.reduce((total, building) => {
    const definition = getBuildingById(building.definitionId);
    return (
      total +
      (building.status === "active" && definition?.id.startsWith("landmark_")
        ? (definition.effects.attractiveness ?? 0)
        : 0)
    );
  }, 0);
  const hotelBonus = state.buildings.reduce((total, building) => {
    const definition = getBuildingById(building.definitionId);
    return (
      total +
      (building.status === "active" && definition?.id === "hotel"
        ? (definition.effects.attractiveness ?? 0)
        : 0)
    );
  }, 0);
  const serviceCoverage =
    state.services.healthCoverage > 50 && state.services.educationCoverage > 50 ? 5 : 0;
  const pollution =
    state.map.flat().reduce((total, tile) => total + tile.pollution, 0) /
    state.map.flat().length;
  const lowPollution = pollution < 20 ? 10 : 0;
  const score = Math.min(
    100,
    parks + landmarks + hotelBonus + serviceCoverage + lowPollution,
  );
  state.tourism = {
    income: score * 50,
    attractiveness: {
      score,
      breakdown: { parks, landmarks, serviceCoverage, lowPollution, beaches: 0 },
    },
  };
  state.economy.tourismIncome = state.tourism.income;
}
