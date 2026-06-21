import { getBuildingById } from "../../data/buildings";
import type {
  BuildingDefinition,
  BuildingInstance,
  CityState,
  Road,
  ZoneType,
} from "../../shared/types";
import { getFootprint, refreshAllRoadConnections } from "../grid/map";
import { createInitialCityState } from "../state";

const ROAD_COLUMNS = [18, 25, 32, 39, 46, 53];
const ROAD_ROWS = [14, 21, 28, 35, 42, 49];

const RESIDENTIAL_BLOCKS: [number, number][] = [
  [19, 15],
  [26, 15],
  [33, 15],
  [40, 15],
  [47, 15],
  [19, 22],
  [26, 22],
  [47, 22],
  [19, 29],
  [26, 29],
  [19, 36],
  [26, 36],
];

const COMMERCIAL_BLOCKS: [number, number][] = [
  [33, 22],
  [40, 22],
  [33, 36],
  [40, 36],
];

const INDUSTRIAL_BLOCKS: [number, number][] = [
  [47, 43],
  [40, 43],
  [33, 43],
  [47, 36],
];

const LANDMARKS: [string, number, number][] = [
  ["city_hall", 33, 29],
  ["medical_center", 19, 43],
  ["university", 47, 29],
  ["power_plant", 55, 44],
  ["water_tower", 16, 31],
  ["park", 30, 37],
  ["park", 45, 30],
  ["landmark_clocktower", 40, 30],
];

export function createNovavistaShowcaseState(): CityState {
  const state = createInitialCityState();
  paintCoastline(state);
  createRoadGrid(state);
  paintShowcaseZones(state);
  RESIDENTIAL_BLOCKS.forEach(([x, y], index) =>
    fillBlock(state, getResidentialShowcaseBuilding(index), x, y),
  );
  COMMERCIAL_BLOCKS.forEach(([x, y], index) =>
    fillBlock(state, getCommercialShowcaseBuilding(index), x, y),
  );
  INDUSTRIAL_BLOCKS.forEach(([x, y], index) =>
    fillBlock(state, getIndustrialShowcaseBuilding(index), x, y),
  );
  addLandmarks(state);
  configureShowcaseMetrics(state);
  return state;
}

function paintCoastline(state: CityState): void {
  state.map.flat().forEach((tile) => {
    if (isWaterTile(tile.x, tile.y)) {
      tile.terrain = "water";
      tile.elevation = 0;
    }
  });
}

function isWaterTile(x: number, y: number): boolean {
  const lake = (x - 9) ** 2 / 150 + (y - 17) ** 2 / 230 < 1;
  const inlet = x < 8 && y > 30 && y < 58;
  return lake || inlet;
}

function createRoadGrid(state: CityState): void {
  ROAD_COLUMNS.forEach((x) => addRoadColumn(state, x));
  ROAD_ROWS.forEach((y) => addRoadRow(state, y));
  refreshAllRoadConnections(state);
}

function getResidentialShowcaseBuilding(index: number): string {
  const buildings = ["high_apartment", "high_apartment", "medium_house", "small_house"];
  return buildings[index % buildings.length] ?? "small_house";
}

function getCommercialShowcaseBuilding(index: number): string {
  const buildings = ["small_office", "large_store", "medium_shop"];
  return buildings[index % buildings.length] ?? "small_shop";
}

function getIndustrialShowcaseBuilding(index: number): string {
  const buildings = ["large_plant", "medium_factory", "small_factory"];
  return buildings[index % buildings.length] ?? "small_factory";
}

function addRoadColumn(state: CityState, x: number): void {
  for (let y = 7; y <= 56; y += 1) addRoad(state, x, y);
}

function addRoadRow(state: CityState, y: number): void {
  for (let x = 14; x <= 58; x += 1) addRoad(state, x, y);
}

function addRoad(state: CityState, x: number, y: number): void {
  const tile = state.map[y]?.[x];
  if (!tile || tile.terrain !== "grass" || tile.roadId) return;
  const id = `showcase-road:${x},${y}`;
  const road: Road = {
    id,
    type: getShowcaseRoadType(x, y),
    position: [x, y],
    connections: { north: false, east: false, south: false, west: false },
  };
  tile.roadId = id;
  state.roads.push(road);
}

function getShowcaseRoadType(x: number, y: number): Road["type"] {
  if (x === 32 || y === 35) return "arterial";
  if (x === 18 || x === 53 || y === 14 || y === 49) return "collector";
  return "local";
}

function paintShowcaseZones(state: CityState): void {
  paintBlocks(state, RESIDENTIAL_BLOCKS, "high_residential");
  paintBlocks(state, COMMERCIAL_BLOCKS, "high_commercial");
  paintBlocks(state, INDUSTRIAL_BLOCKS, "medium_industrial");
}

function paintBlocks(state: CityState, blocks: [number, number][], zone: ZoneType): void {
  blocks.forEach(([x, y]) => paintBlock(state, x, y, zone));
}

function paintBlock(
  state: CityState,
  startX: number,
  startY: number,
  zone: ZoneType,
): void {
  for (let y = startY; y < startY + 6; y += 1) {
    for (let x = startX; x < startX + 6; x += 1) {
      const tile = state.map[y]?.[x];
      if (tile?.terrain === "grass" && !tile.roadId) tile.zone = zone;
    }
  }
}

function fillBlock(
  state: CityState,
  definitionId: string,
  startX: number,
  startY: number,
): void {
  const definition = getBuildingById(definitionId);
  if (!definition) return;
  const [buildingWidth, buildingHeight] = definition.size;
  for (let y = startY; y <= startY + 6 - buildingHeight; y += buildingHeight) {
    for (let x = startX; x <= startX + 6 - buildingWidth; x += buildingWidth) {
      addBuilding(state, definition, x, y);
    }
  }
}

function addLandmarks(state: CityState): void {
  LANDMARKS.forEach(([definitionId, x, y]) => {
    const definition = getBuildingById(definitionId);
    if (definition) addBuilding(state, definition, x, y);
  });
}

function addBuilding(
  state: CityState,
  definition: BuildingDefinition,
  x: number,
  y: number,
): void {
  const footprint = getFootprint(definition, x, y, 0);
  if (!footprint.every((cell) => isVacantGrass(state, cell.x, cell.y))) return;
  const id = `showcase:${definition.id}:${x},${y}`;
  const building: BuildingInstance = {
    id,
    definitionId: definition.id,
    position: [x, y],
    rotation: 0,
    status: "active",
    warnings: [],
    createdAtTick: 0,
    lockedUntilTick: 0,
    unresolvedWarningTicks: 0,
    upgradeTier: definition.densityTier ?? 1,
    lastUpgradeTick: 0,
  };
  footprint.forEach((cell) => {
    const tile = state.map[cell.y]?.[cell.x];
    if (tile) {
      tile.buildingId = id;
      tile.zone = null;
    }
  });
  state.buildings.push(building);
}

function isVacantGrass(state: CityState, x: number, y: number): boolean {
  const tile = state.map[y]?.[x];
  return Boolean(tile && tile.terrain === "grass" && !tile.roadId && !tile.buildingId);
}

function configureShowcaseMetrics(state: CityState): void {
  state.economy.money = 2_345_678;
  state.economy.monthlyIncome = 12_540;
  state.economy.monthlyExpenses = 5_210;
  state.population = {
    total: 5040,
    residentialCapacity: 5040,
    employedWorkers: 2052,
    unemployedWorkers: 2988,
    growthRate: 156,
  };
  state.happiness.value = 82;
  state.services.powerCapacity = 342;
  state.services.powerDemand = 324;
  state.services.waterCapacity = 500;
  state.services.waterDemand = 310;
  state.time = { tick: 0, month: 5, year: 2025, speed: 0 };
  state.progression.currentMilestone = 12;
  state.progression.unlockedFeatures = [
    "dirt_road",
    "paved_road",
    "residential_zoning",
    "commercial_zoning",
    "industrial_zoning",
    "city_hall",
    "clinic",
    "school",
    "park",
    "power_plant",
    "water_tower",
    "university",
    "medical_center",
    "landmark_clocktower",
  ];
}
