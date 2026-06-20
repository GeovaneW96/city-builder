import {
  BASE_LAND_VALUE,
  INDUSTRIAL_PRODUCTIVITY_THRESHOLD,
  LAND_VALUE_MAX,
  LOW_LAND_VALUE_INDUSTRIAL_PRODUCTIVITY_MULTIPLIER,
} from "../../data/balance";
import type { BuildingInstance, CityState } from "../../shared/types";
import { getTile } from "../grid/map";

export function getCommercialLandValueMultiplier(
  state: CityState,
  building: BuildingInstance,
): number {
  return getBuildingLandValue(state, building) / LAND_VALUE_MAX;
}

export function getIndustrialLandValueMultiplier(
  state: CityState,
  building: BuildingInstance,
): number {
  return getBuildingLandValue(state, building) < INDUSTRIAL_PRODUCTIVITY_THRESHOLD
    ? LOW_LAND_VALUE_INDUSTRIAL_PRODUCTIVITY_MULTIPLIER
    : 1;
}

function getBuildingLandValue(state: CityState, building: BuildingInstance): number {
  const [x, y] = building.position;
  return getTile(state, x, y)?.landValue ?? BASE_LAND_VALUE;
}
