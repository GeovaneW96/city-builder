export type TerrainType = "grass" | "water" | "blocked";
export type ZoneType = "residential" | "commercial" | "industrial";

export interface Tile {
  x: number;
  y: number;
  terrain: TerrainType;
  roadId: string | null;
  zone: ZoneType | null;
  buildingId: string | null;
  pollution: number;
  landValue: number;
}

export interface Road {
  id: string;
  type: "dirt" | "paved";
}

export type PlacementType = "zone-grown" | "manual";
export type BuildingStatus = "constructing" | "active" | "inactive" | "abandoned";
export type BuildingCategory =
  | "residential"
  | "commercial"
  | "industrial"
  | "utility"
  | "service"
  | "civic"
  | "decoration";

export interface BuildingDefinition {
  id: string;
  name: string;
  category: BuildingCategory;
  placementType: PlacementType;
  size: [number, number];
  cost: number;
  upkeep: number;
  unlockPopulation: number;
  requirements: {
    roadAccess: boolean;
  };
  effects: {
    populationCapacity?: number;
    jobs?: number;
    taxType?: "residential" | "commercial" | "industrial";
    powerCapacity?: number;
    waterCapacity?: number;
    healthRadius?: number;
    educationRadius?: number;
    happiness?: number;
    pollution?: number;
  };
}

export interface BuildingInstance {
  id: string;
  definitionId: string;
  position: [number, number];
  rotation: 0 | 90 | 180 | 270;
  status: BuildingStatus;
  warnings: string[];
  createdAtTick: number;
}

export interface EconomyState {
  money: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  taxRates: {
    residential: number;
    commercial: number;
    industrial: number;
  };
  isBankrupt: boolean;
  monthsBelowZero: number;
}

export interface PopulationState {
  total: number;
  residentialCapacity: number;
  employedWorkers: number;
  unemployedWorkers: number;
  growthRate: number;
}

export interface DemandState {
  residential: number;
  commercial: number;
  industrial: number;
}

export interface ServicesState {
  powerCapacity: number;
  powerDemand: number;
  waterCapacity: number;
  waterDemand: number;
  healthCoverage: number;
  educationCoverage: number;
}

export interface HappinessState {
  value: number;
  components: {
    base: number;
    tax: number;
    unemployment: number;
    services: number;
    pollution: number;
    parks: number;
  };
}

export interface Milestone {
  population: number;
  name: string;
  unlocks: string[];
  bonus: number;
}

export interface ProgressionState {
  currentMilestone: number;
  unlockedFeatures: string[];
  completedObjectives: string[];
}

export interface Warning {
  severity: "low" | "medium" | "high";
  message: string;
  targetTile?: [number, number];
  targetBuilding?: string;
  suggestedFix: string;
}

export interface TimeState {
  tick: number;
  month: number;
  year: number;
  speed: 0 | 1 | 2 | 3;
}

export interface CityState {
  map: Tile[][];
  buildings: BuildingInstance[];
  roads: Road[];
  economy: EconomyState;
  population: PopulationState;
  demand: DemandState;
  services: ServicesState;
  happiness: HappinessState;
  progression: ProgressionState;
  warnings: Warning[];
  time: TimeState;
}

export type GameCommand =
  | { type: "PLACE_ROAD"; x: number; y: number; roadType: "dirt" | "paved" }
  | { type: "REMOVE_ROAD"; x: number; y: number }
  | { type: "PAINT_ZONE"; x: number; y: number; zoneType: ZoneType }
  | { type: "REMOVE_ZONE"; x: number; y: number }
  | { type: "PLACE_BUILDING"; definitionId: string; x: number; y: number }
  | { type: "DEMOLISH"; x: number; y: number }
  | {
      type: "SET_TAX_RATE";
      taxType: "residential" | "commercial" | "industrial";
      rate: number;
    }
  | { type: "SET_SPEED"; speed: 0 | 1 | 2 | 3 };

export interface CommandResult {
  success: boolean;
  error?: string;
  events: GameEvent[];
}

export type GameEvent =
  | { type: "TILE_CHANGED"; x: number; y: number }
  | { type: "ROAD_PLACED"; x: number; y: number; roadId: string }
  | { type: "ROAD_REMOVED"; x: number; y: number }
  | { type: "ZONE_PAINTED"; x: number; y: number; zoneType: ZoneType }
  | { type: "ZONE_REMOVED"; x: number; y: number }
  | { type: "BUILDING_ADDED"; buildingId: string; x: number; y: number }
  | { type: "BUILDING_REMOVED"; buildingId: string; x: number; y: number }
  | { type: "BUILDING_STATUS_CHANGED"; buildingId: string; status: BuildingStatus }
  | { type: "ECONOMY_TICK"; money: number; income: number; expenses: number }
  | { type: "DEMAND_CHANGED"; demand: DemandState }
  | { type: "POPULATION_CHANGED"; total: number }
  | { type: "HAPPINESS_CHANGED"; value: number }
  | { type: "MILESTONE_REACHED"; milestone: string; population: number }
  | { type: "SCENARIO_WIN" }
  | { type: "SCENARIO_LOSE" }
  | { type: "WARNING_ADDED"; warning: Warning }
  | { type: "WARNING_REMOVED"; warningId: string };

export type BuildMode = "road" | "zone" | "building" | "demolish" | null;

export interface PlacementPreview {
  positions: [number, number][];
  valid: boolean;
  cost: number;
  label?: string;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
  pitch: number;
  rotation: number;
}

export interface UISettings {
  graphicsQuality: "low" | "medium" | "high";
  soundEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
}

export interface UIState {
  camera: CameraState;
  selectedTile: [number, number] | null;
  hoveredTile: [number, number] | null;
  buildMode: BuildMode;
  placementPreview: PlacementPreview | null;
  activeOverlay: "zoning" | "power" | "water" | "pollution" | null;
  settings: UISettings;
}

export interface SimulationStore {
  state: CityState;
  tick: () => CityState;
  processCommand: (command: GameCommand) => CommandResult;
  loadSave: (save: CityState) => void;
  getSaveData: () => CityState;
}
