import type { CityState } from "../shared/types";
import { cloneCityState } from "../simulation/grid/map";

export const SAVE_VERSION = 1;

export interface SaveSlotMetadata {
  id: string;
  name: string;
  cityName: string;
  population: number;
  money: number;
  happiness: number;
  playTime: number;
  date: string;
  saveVersion: number;
  scenarioId: string;
}

export interface CitySaveData {
  version: number;
  createdAt: string;
  updatedAt: string;
  cityName: string;
  state: CityState;
  slotMetadata: SaveSlotMetadata;
}

export function createSaveData(
  state: CityState,
  cityName = "First Settlement",
): CitySaveData {
  const timestamp = new Date().toISOString();
  return {
    version: SAVE_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    cityName,
    state: cloneCityState(state),
    slotMetadata: createSlotMetadata(state, cityName),
  };
}

export function serializeSave(data: CitySaveData): string {
  return JSON.stringify(data);
}

export function deserializeSave(serialized: string): CitySaveData {
  const parsed = JSON.parse(serialized) as Partial<CitySaveData>;
  if (parsed.version !== SAVE_VERSION || !parsed.state) {
    throw new Error("Unsupported or invalid save data");
  }
  return {
    version: SAVE_VERSION,
    createdAt: parsed.createdAt ?? new Date().toISOString(),
    updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    cityName: parsed.cityName ?? "First Settlement",
    state: cloneCityState(parsed.state),
    slotMetadata:
      parsed.slotMetadata ??
      createSlotMetadata(parsed.state, parsed.cityName ?? "First Settlement"),
  };
}

function createSlotMetadata(state: CityState, cityName: string): SaveSlotMetadata {
  const date = new Date().toISOString();
  return {
    id: "manual_0",
    name: "Manual Save",
    cityName,
    population: state.population.total,
    money: state.economy.money,
    happiness: state.happiness.value,
    playTime: state.time.tick,
    date,
    saveVersion: SAVE_VERSION,
    scenarioId: "first_settlement",
  };
}
