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

const ROAD_COLUMNS = [16, 22, 28, 34, 40, 46, 52, 58];
const ROAD_ROWS = [12, 18, 24, 30, 36, 42, 48, 54];

const RESIDENTIAL_BLOCKS: [number, number][] = [
  [17, 13],
  [23, 13],
  [29, 13],
  [35, 13],
  [41, 13],
  [47, 13],
  [53, 13],
  [17, 19],
  [23, 19],
  [29, 19],
  [47, 19],
  [53, 19],
  [17, 25],
  [23, 25],
  [47, 25],
  [53, 25],
  [17, 31],
  [23, 31],
  [53, 31],
  [17, 37],
  [23, 37],
  [53, 37],
  [17, 43],
  [23, 43],
  [29, 43],
  [35, 43],
  [41, 43],
  [47, 43],
  [53, 49],
  [47, 49],
  [41, 49],
  [35, 49],
  [29, 49],
  [23, 49],
  [17, 49],
];

const COMMERCIAL_BLOCKS: [number, number][] = [
  [35, 25],
  [41, 25],
  [35, 31],
  [41, 31],
];

const DOWNTOWN_BLOCKS: [number, number][] = [
  [29, 25],
  [29, 31],
  [35, 19],
  [41, 19],
];

const INDUSTRIAL_BLOCKS: [number, number][] = [
  [53, 37],
  [53, 43],
  [47, 37],
  [53, 25],
  [53, 31],
];

const PARK_BLOCKS: [number, number][] = [
  [29, 37],
  [41, 37],
];

const LANDMARKS: [string, number, number][] = [
  ["city_hall", 34, 28],
  ["medical_center", 28, 43],
  ["university", 48, 30],
  ["power_plant", 55, 45],
  ["water_tower", 16, 32],
  ["park", 30, 38],
  ["park", 42, 38],
  ["landmark_clocktower", 40, 30],
  ["large_office", 33, 32],
  ["large_office", 31, 26],
  ["large_office", 32, 28],
  ["hotel", 33, 30],
  ["university", 48, 32],
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
  DOWNTOWN_BLOCKS.forEach(([x, y], index) =>
    fillBlock(state, getDowntownShowcaseBuilding(index), x, y),
  );
  INDUSTRIAL_BLOCKS.forEach(([x, y], index) =>
    fillBlock(state, getIndustrialShowcaseBuilding(index), x, y),
  );
  PARK_BLOCKS.forEach(([x, y]) => addPark(state, x, y));
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
  const buildings = [
    "high_apartment",
    "medium_house",
    "small_house",
    "high_apartment",
    "medium_house",
    "small_house",
    "townhouse",
    "duplex",
    "courtyard",
    "walkup_3",
    "walkup_5",
  ];
  return buildings[index % buildings.length] ?? "small_house";
}

function getCommercialShowcaseBuilding(index: number): string {
  const buildings = ["small_office", "large_store", "medium_shop", "bank", "retail_row"];
  return buildings[index % buildings.length] ?? "small_shop";
}

function getDowntownShowcaseBuilding(index: number): string {
  const buildings = ["large_office", "hotel", "large_office", "office_midrise", "mall"];
  return buildings[index % buildings.length] ?? "large_office";
}

function getIndustrialShowcaseBuilding(index: number): string {
  const buildings = ["large_plant", "medium_factory", "small_factory", "warehouse"];
  return buildings[index % buildings.length] ?? "small_factory";
}

function addRoadColumn(state: CityState, x: number): void {
  for (let y = 6; y <= 58; y += 1) addRoad(state, x, y);
}

function addRoadRow(state: CityState, y: number): void {
  for (let x = 10; x <= 62; x += 1) addRoad(state, x, y);
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
  if (x === 34 || y === 30) return "arterial";
  if (x === 28 || x === 40 || x === 52 || y === 18 || y === 36 || y === 48)
    return "collector";
  return "local";
}

function paintShowcaseZones(state: CityState): void {
  paintBlocks(state, RESIDENTIAL_BLOCKS, "high_residential");
  paintBlocks(state, COMMERCIAL_BLOCKS, "high_commercial");
  paintBlocks(state, DOWNTOWN_BLOCKS, "office");
  paintBlocks(state, INDUSTRIAL_BLOCKS, "medium_industrial");
  paintBlocks(state, PARK_BLOCKS, "high_residential");
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

function addPark(state: CityState, startX: number, startY: number): void {
  const park = getBuildingById("park");
  if (!park) return;
  addBuilding(state, park, startX, startY);
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
