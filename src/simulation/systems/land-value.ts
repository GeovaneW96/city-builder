import {
  BASE_LAND_VALUE,
  EDUCATION_BONUS,
  EDUCATION_RADIUS,
  HEALTH_BONUS,
  HEALTH_RADIUS,
  INDUSTRIAL_PENALTY,
  INDUSTRIAL_RADIUS,
  LAND_VALUE_MAX,
  LAND_VALUE_MIN,
  NOISE_PENALTY,
  NOISE_RADIUS,
  PARK_BONUS,
  PARK_RADIUS,
  ROAD_ACCESS_BONUS,
  WATERFRONT_BONUS,
  WATERFRONT_RADIUS,
} from "../../data/balance";
import { getBuildingById } from "../../data/buildings";
import type { BuildingInstance, CityState, Tile } from "../../shared/types";
import { getTile } from "../grid/map";

interface ModifierSource {
  x: number;
  y: number;
  amount: number;
  radius: number;
}

export function recomputeLandValue(state: CityState): void {
  const sources = getModifierSources(state);
  const waterTiles = state.map.flat().filter((tile) => tile.terrain === "water");
  state.map.flat().forEach((tile) => {
    const value = calculateTileLandValue(state, tile, sources, waterTiles);
    tile.landValue = value;
  });
}

export function calculateLandValueAt(
  state: CityState,
  x: number,
  y: number,
): number | null {
  const tile = getTile(state, x, y);
  if (!tile || tile.terrain !== "grass") return null;
  const sources = getModifierSources(state);
  const waterTiles = state.map
    .flat()
    .filter((candidate) => candidate.terrain === "water");
  return calculateTileLandValue(state, tile, sources, waterTiles);
}

function calculateTileLandValue(
  state: CityState,
  tile: Tile,
  sources: ModifierSource[],
  waterTiles: Tile[],
): number | null {
  if (tile.terrain !== "grass") return null;
  const { x, y } = tile;
  const roadBonus = hasAdjacentRoad(state, x, y) ? ROAD_ACCESS_BONUS : 0;
  const waterfrontBonus = getWaterfrontBonus(waterTiles, x, y);
  const modifier = sources.reduce(
    (total, source) => total + getFalloffModifier(source, x, y),
    roadBonus + waterfrontBonus,
  );
  return clampLandValue(BASE_LAND_VALUE + modifier);
}

function getModifierSources(state: CityState): ModifierSource[] {
  return state.buildings
    .filter((building) => building.status === "active")
    .flatMap((building) => getBuildingModifierSources(building));
}

function getBuildingModifierSources(building: BuildingInstance): ModifierSource[] {
  const definition = getBuildingById(building.definitionId);
  if (!definition) return [];
  const [x, y] = building.position;
  const sources: ModifierSource[] = [];
  if (definition.id === "park") sources.push(createSource(x, y, PARK_BONUS, PARK_RADIUS));
  if (definition.effects.healthRadius) {
    sources.push(createSource(x, y, HEALTH_BONUS, HEALTH_RADIUS));
  }
  if (definition.effects.educationRadius) {
    sources.push(createSource(x, y, EDUCATION_BONUS, EDUCATION_RADIUS));
  }
  if (definition.category === "industrial") {
    sources.push(createSource(x, y, INDUSTRIAL_PENALTY, INDUSTRIAL_RADIUS));
    sources.push(createSource(x, y, NOISE_PENALTY, NOISE_RADIUS));
  }
  return sources;
}

function createSource(
  x: number,
  y: number,
  amount: number,
  radius: number,
): ModifierSource {
  return { x, y, amount, radius };
}

function getFalloffModifier(source: ModifierSource, x: number, y: number): number {
  const distance = Math.max(Math.abs(x - source.x), Math.abs(y - source.y));
  if (distance >= source.radius) return 0;
  return source.amount * ((source.radius - distance) / source.radius);
}

function hasAdjacentRoad(state: CityState, x: number, y: number): boolean {
  return [
    getTile(state, x, y - 1),
    getTile(state, x + 1, y),
    getTile(state, x, y + 1),
    getTile(state, x - 1, y),
  ].some((tile) => Boolean(tile?.roadId));
}

function getWaterfrontBonus(waterTiles: Tile[], x: number, y: number): number {
  const hasWater = waterTiles.some((tile) => {
    const distance = Math.max(Math.abs(x - tile.x), Math.abs(y - tile.y));
    return tile.terrain === "water" && distance < WATERFRONT_RADIUS;
  });
  return hasWater ? WATERFRONT_BONUS : 0;
}

function clampLandValue(value: number): number {
  return Math.round(Math.max(LAND_VALUE_MIN, Math.min(LAND_VALUE_MAX, value)));
}
