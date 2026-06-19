import type {
  BuildingDefinition,
  BuildingInstance,
  CityState,
  Road,
  Tile,
} from "../../shared/types";
import { GRID_SIZE } from "../constants";

export interface FootprintCell {
  x: number;
  y: number;
}

export function createMap(): Tile[][] {
  return Array.from({ length: GRID_SIZE }, (_, y) =>
    Array.from({ length: GRID_SIZE }, (_, x) => ({
      x,
      y,
      terrain: "grass" as const,
      roadId: null,
      zone: null,
      buildingId: null,
      pollution: 0,
      landValue: 50,
    })),
  );
}

export function isInBounds(x: number, y: number): boolean {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

export function getTile(state: CityState, x: number, y: number): Tile | null {
  if (!isInBounds(x, y)) return null;
  return state.map[y]?.[x] ?? null;
}

export function cloneCityState(state: CityState): CityState {
  return {
    map: state.map.map((row) => row.map((tile) => ({ ...tile }))),
    buildings: state.buildings.map((building) => ({
      ...building,
      position: [...building.position],
      warnings: [...building.warnings],
    })),
    roads: state.roads.map(cloneRoad),
    economy: {
      ...state.economy,
      taxRates: { ...state.economy.taxRates },
    },
    population: { ...state.population },
    demand: { ...state.demand },
    services: { ...state.services },
    happiness: {
      value: state.happiness.value,
      components: { ...state.happiness.components },
    },
    progression: {
      ...state.progression,
      unlockedFeatures: [...state.progression.unlockedFeatures],
      completedObjectives: [...state.progression.completedObjectives],
    },
    warnings: state.warnings.map((warning) => ({ ...warning })),
    time: { ...state.time },
  };
}

export function getFootprint(
  definition: BuildingDefinition,
  x: number,
  y: number,
  rotation: 0 | 90 | 180 | 270,
): FootprintCell[] {
  const [width, height] = getRotatedSize(definition, rotation);
  return Array.from({ length: height }, (_, dy) =>
    Array.from({ length: width }, (_, dx) => ({ x: x + dx, y: y + dy })),
  ).flat();
}

export function getBuildingFootprint(
  building: BuildingInstance,
  definition: BuildingDefinition,
): FootprintCell[] {
  const [x, y] = building.position;
  return getFootprint(definition, x, y, building.rotation);
}

export function hasAdjacentRoad(state: CityState, footprint: FootprintCell[]): boolean {
  return footprint.some((cell) =>
    getOrthogonalNeighbors(cell.x, cell.y).some((neighbor) => {
      const tile = getTile(state, neighbor.x, neighbor.y);
      return tile?.roadId !== null && tile?.roadId !== undefined;
    }),
  );
}

export function getOrthogonalNeighbors(x: number, y: number): FootprintCell[] {
  return [
    { x, y: y - 1 },
    { x: x + 1, y },
    { x, y: y + 1 },
    { x: x - 1, y },
  ].filter((cell) => isInBounds(cell.x, cell.y));
}

export function refreshAllRoadConnections(state: CityState): void {
  state.roads = state.roads.map((road) => {
    const [x, y] = road.position;
    return { ...road, connections: getRoadConnections(state, x, y) };
  });
}

export function getRoadConnections(
  state: CityState,
  x: number,
  y: number,
): Road["connections"] {
  return {
    north: hasRoadAt(state, x, y - 1),
    east: hasRoadAt(state, x + 1, y),
    south: hasRoadAt(state, x, y + 1),
    west: hasRoadAt(state, x - 1, y),
  };
}

function hasRoadAt(state: CityState, x: number, y: number): boolean {
  const tile = getTile(state, x, y);
  return tile?.roadId !== null && tile?.roadId !== undefined;
}

function getRotatedSize(
  definition: BuildingDefinition,
  rotation: 0 | 90 | 180 | 270,
): [number, number] {
  const [width, height] = definition.size;
  return rotation === 90 || rotation === 270 ? [height, width] : [width, height];
}

function cloneRoad(road: Road): Road {
  return {
    ...road,
    position: [...road.position],
    connections: { ...road.connections },
  };
}
