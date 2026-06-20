import { POLLUTION_BALANCE } from "../../data/balance";
import { getBuildingById } from "../../data/buildings";
import type { BuildingInstance, CityState } from "../../shared/types";
import { GRID_SIZE } from "../constants";
import { getGreenInitiativeMultiplier } from "./districts";

interface PollutionSource {
  x: number;
  y: number;
  amount: number;
}

export function recomputePollution(state: CityState): void {
  resetTileEnvironment(state);
  state.buildings
    .filter((building) => building.status === "active")
    .forEach((building) => applyBuildingPollution(state, building));
}

function resetTileEnvironment(state: CityState): void {
  state.map.flat().forEach((tile) => {
    tile.pollution = 0;
  });
}

function applyBuildingPollution(state: CityState, building: BuildingInstance): void {
  const definition = getBuildingById(building.definitionId);
  const pollution =
    (definition?.effects.pollution ?? 0) * getGreenInitiativeMultiplier(state, building);
  if (pollution <= 0) return;

  const [originX, originY] = building.position;
  const radius = POLLUTION_BALANCE.INDUSTRIAL_RADIUS;
  for (
    let y = Math.max(0, originY - radius);
    y <= Math.min(GRID_SIZE - 1, originY + radius);
    y++
  ) {
    for (
      let x = Math.max(0, originX - radius);
      x <= Math.min(GRID_SIZE - 1, originX + radius);
      x++
    ) {
      applyTilePollution(state, x, y, { x: originX, y: originY, amount: pollution });
    }
  }
}

function applyTilePollution(
  state: CityState,
  x: number,
  y: number,
  source: PollutionSource,
): void {
  const distance = Math.abs(x - source.x) + Math.abs(y - source.y);
  const radius = POLLUTION_BALANCE.INDUSTRIAL_RADIUS;
  if (distance > radius) return;

  const tile = state.map[y]?.[x];
  if (!tile) return;
  const falloff = 1 - distance / (radius + 1);
  const added = source.amount * falloff;
  tile.pollution = clamp(tile.pollution + added);
}

function clamp(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}
