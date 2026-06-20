import type { CityState } from "../shared/types";
import { cloneCityState } from "../simulation/grid/map";

export interface CitySnapshot {
  cityName: string;
  population: number;
  rating: string;
  state: CityState;
}

export function exportCitySnapshot(state: CityState, cityName: string): string {
  const snapshot: CitySnapshot = {
    cityName,
    population: state.population.total,
    rating: state.rating.grade,
    state: cloneCityState(state),
  };
  return btoa(encodeURIComponent(JSON.stringify(snapshot)));
}

export function importCitySnapshot(serialized: string): CitySnapshot {
  const snapshot = JSON.parse(decodeURIComponent(atob(serialized))) as CitySnapshot;
  if (!snapshot.cityName || !snapshot.state) throw new Error("Invalid city snapshot");
  return { ...snapshot, state: cloneCityState(snapshot.state) };
}
