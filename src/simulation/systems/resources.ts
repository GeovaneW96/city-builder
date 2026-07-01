import type { CityState, Tile } from "../../shared/types";
import { isLastDayOfYear } from "./time";

export function depleteResources(state: CityState): void {
  if (!isLastDayOfYear(state.time)) return;
  state.buildings.forEach((building) => {
    if (building.status !== "active") return;
    const tile = state.map[building.position[1]]?.[building.position[0]];
    if (tile?.resourceType) deplete(tile);
  });
}

function deplete(tile: Tile): void {
  tile.richness = Math.max(0, tile.richness - 1);
  tile.depleted = tile.richness === 0;
}

export function getResourceMultiplier(tile: Tile | undefined): number {
  if (!tile?.resourceType || tile.depleted) return 1;
  if (tile.resourceType === "oil") return 1 + tile.richness / 100;
  if (tile.resourceType === "fertile_soil") return 1 + tile.richness / 150;
  return 1 + tile.richness / 200;
}
