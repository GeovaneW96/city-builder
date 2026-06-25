export type TerrainType = "grass" | "water" | "blocked";
export type BiomeType = "temperate" | "desert" | "tropical" | "arctic" | "volcanic";
export type ZoneType =
  | "residential"
  | "commercial"
  | "industrial"
  | "medium_residential"
  | "medium_commercial"
  | "medium_industrial"
  | "high_residential"
  | "high_commercial"
  | "office";

export interface Tile {
  x: number;
  y: number;
  terrain: TerrainType;
  biome: BiomeType;
  elevation: number;
  resourceType: "ore" | "oil" | "fertile_soil" | null;
  richness: number;
  depleted: boolean;
  roadId: string | null;
  zone: ZoneType | null;
  buildingId: string | null;
  pollution: number;
  landValue: number | null;
  districtId: string | null;
}

export interface Road {
  id: string;
  type: "dirt" | "paved" | "local" | "collector" | "arterial";
  position: [number, number];
  connections: {
    north: boolean;
    east: boolean;
    south: boolean;
    west: boolean;
  };
}

export type PlacementType = "zone-grown" | "manual";
export type BuildingStatus = "constructing" | "active" | "inactive" | "abandoned";
export type BuildingCategory =
  | "residential"
  | "commercial"
  | "industrial"
  | "utility"
  | "service"
  | "security"
  | "transit"
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
  densityTier?: 1 | 2 | 3;
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
    healthCapacity?: number;
    healthTier?: 1 | 2 | 3;
    educationRadius?: number;
    educationCapacity?: number;
    educationTier?: 1 | 2 | 3;
    policeRadius?: number;
    fireRadius?: number;
    garbageCollectionRadius?: number;
    garbageCapacity?: number;
    happiness?: number;
    pollution?: number;
    office?: boolean;
    attractiveness?: number;
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
  lockedUntilTick: number;
  unresolvedWarningTicks: number;
  upgradeTier: 1 | 2 | 3;
  lastUpgradeTick: number;
  crime?: number;
  fireRisk?: number;
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
  loans: Loan[];
  lastLoanTick: number;
  tourismIncome: number;
}

export interface TourismState {
  income: number;
  attractiveness: {
    score: number;
    breakdown: {
      parks: number;
      landmarks: number;
      serviceCoverage: number;
      lowPollution: number;
      beaches: number;
    };
  };
}

export type SpecializationId =
  | "industrial_hub"
  | "commercial_hub"
  | "tourist_destination"
  | "education_center"
  | "green_city";
export interface SpecializationState {
  active: SpecializationId | null;
  lastSwitchTick: number;
}

export type CityEventType =
  | "economic_boom"
  | "economic_downturn"
  | "epidemic"
  | "festival"
  | "fire"
  | "flood";
export interface CityEvent {
  id: string;
  type: CityEventType;
  startTick: number;
  durationTicks: number;
}

export type LoanType = "small" | "medium" | "large";

export interface Loan {
  id: string;
  type: LoanType;
  principal: number;
  monthlyPayment: number;
  remainingMonths: number;
  missedPayments: number;
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
  office: number;
}

export interface OfficeState {
  unlocked: boolean;
  totalCapacity: number;
  filledJobs: number;
  taxIncome: number;
}

export interface ServicesState {
  powerCapacity: number;
  powerDemand: number;
  waterCapacity: number;
  waterDemand: number;
  healthCoverage: number;
  educationCoverage: number;
  healthQuality: number;
  educationQuality: number;
  workforceQuality: number;
}

export interface TrafficSegment {
  roadId: string;
  capacity: number;
  trips: number;
  congestion: number;
}

export type TrafficAgentType = "commuter" | "customer" | "cargo";

export interface TrafficAgent {
  id: string;
  type: TrafficAgentType;
  originBuildingId: string;
  destinationBuildingId: string;
  startTick: number;
  route: string[];
  currentEdgeIndex: number;
}

export interface TrafficLight {
  roadId: string;
  tickPlaced: number;
  phase: "green" | "yellow" | "red";
}

export interface TrafficState {
  cityCongestion: number;
  totalTrips: number;
  happinessPenalty: number;
  commercialMultiplier: number;
  industrialMultiplier: number;
  segments: TrafficSegment[];
  agents: TrafficAgent[];
  queuedAgents: TrafficAgent[];
  intersections: string[];
  trafficLights: TrafficLight[];
  roadNetworkDirty: boolean;
  nextAgentId: number;
  lastAgentTick: number;
}

export interface GoodsState {
  demand: number;
  supply: number;
  balance: number;
  shortagePercentage: number;
  happinessPenalty: number;
  commercialMultiplier: number;
}

export interface ExtendedServicesState {
  policeCoverage: number;
  fireCoverage: number;
  crimeRate: number;
  crimeHappinessPenalty: number;
  totalUncollectedGarbage: number;
  monthlyGarbageProduction: number;
  monthlyGarbageCollected: number;
  garbageCoverage: number;
  garbageHappinessPenalty: number;
}

export interface BusStop {
  id: string;
  position: [number, number];
}

export interface BusRoute {
  id: string;
  name: string;
  stops: string[];
  depotId: string;
  active: boolean;
}

export interface PublicTransportState {
  stops: BusStop[];
  routes: BusRoute[];
  coveredBuildingIds: string[];
  ridership: number;
  activeRouteCount: number;
  happinessBonus: number;
}

export type CityGrade = "A" | "B" | "C" | "D" | "F";

export interface CityRatingState {
  score: number;
  grade: CityGrade;
  immigrationModifier: number;
  components: {
    economy: number;
    happiness: number;
    services: number;
    environment: number;
    growth: number;
  };
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: AchievementCondition;
  reward: number;
}

export type AchievementCondition =
  | "population_100"
  | "no_debt_1000"
  | "green_start_500"
  | "happy_streak"
  | "efficient_planner_1000"
  | "positive_income_streak"
  | "all_milestones"
  | "roads_placed";

export interface AchievementState {
  id: string;
  unlockedAt: number | null;
}

export interface AchievementProgress {
  moneyEverNegative: boolean;
  pollutionStayedLow: boolean;
  happyTickStreak: number;
  positiveIncomeMonthStreak: number;
  roadsPlaced: number;
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
    utility: number;
    traffic: number;
    goods: number;
    crime: number;
    garbage: number;
    transit: number;
    policies: number;
  };
}

export type NeighborhoodHappinessComponents = HappinessState["components"] & {
  traffic: number;
};

export interface Neighborhood {
  id: string;
  label: string;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  tileCount: number;
  population: number;
  happiness: number;
  components: NeighborhoodHappinessComponents;
  buildings: string[];
}

export type DistrictPolicyId =
  | "tax_break"
  | "service_priority"
  | "smoking_ban"
  | "nightlife"
  | "green_initiative";

export interface District {
  id: string;
  name: string;
  color: string;
  tiles: [number, number][];
  policies: DistrictPolicyId[];
}

export interface DistrictPolicyDefinition {
  id: DistrictPolicyId;
  name: string;
  description: string;
  monthlyCost: number;
  requirement:
    | "businesses_10"
    | "service_building"
    | "population_500"
    | "population_1000"
    | "industrial_building";
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
  scenarioStatus: "active" | "won" | "lost";
}

export interface Warning {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  targetTile?: [number, number];
  targetBuilding?: string;
  suggestedFix: string;
}

export interface TimeState {
  tick: number;
  day: number;
  hour: number;
  month: number;
  year: number;
  speed: 0 | 1 | 2 | 3;
}

export interface CityState {
  premium: boolean;
  map: Tile[][];
  buildings: BuildingInstance[];
  roads: Road[];
  economy: EconomyState;
  population: PopulationState;
  demand: DemandState;
  office: OfficeState;
  tourism: TourismState;
  specialization: SpecializationState;
  events: CityEvent[];
  services: ServicesState;
  traffic: TrafficState;
  goods: GoodsState;
  extendedServices: ExtendedServicesState;
  publicTransport: PublicTransportState;
  rating: CityRatingState;
  achievements: AchievementState[];
  achievementProgress: AchievementProgress;
  happiness: HappinessState;
  neighborhoods: Neighborhood[];
  neighborhoodMode: "auto" | "manual";
  districts: District[];
  progression: ProgressionState;
  warnings: Warning[];
  time: TimeState;
}

export type GameCommand =
  | {
      type: "PLACE_ROAD";
      x: number;
      y: number;
      roadType: "dirt" | "paved" | "local" | "collector" | "arterial";
    }
  | { type: "REMOVE_ROAD"; x: number; y: number }
  | {
      type: "SET_ROAD_TIER";
      x: number;
      y: number;
      roadType: "local" | "collector" | "arterial";
    }
  | { type: "PLACE_TRAFFIC_LIGHT"; x: number; y: number }
  | { type: "SET_SPECIALIZATION"; specializationId: SpecializationId }
  | { type: "CHANGE_ELEVATION"; x: number; y: number; delta: -1 | 1 }
  | { type: "PAINT_ZONE"; x: number; y: number; zoneType: ZoneType }
  | { type: "REMOVE_ZONE"; x: number; y: number }
  | {
      type: "PLACE_BUILDING";
      definitionId: string;
      x: number;
      y: number;
      rotation?: 0 | 90 | 180 | 270;
    }
  | { type: "DEMOLISH"; x: number; y: number }
  | {
      type: "SET_TAX_RATE";
      taxType: "residential" | "commercial" | "industrial";
      rate: number;
    }
  | { type: "TAKE_LOAN"; loanType: LoanType }
  | { type: "PLACE_BUS_STOP"; x: number; y: number }
  | { type: "CREATE_BUS_ROUTE"; name: string; stopIds: string[]; depotId: string }
  | {
      type: "CREATE_DISTRICT";
      name: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color?: string;
    }
  | { type: "RENAME_DISTRICT"; districtId: string; name: string }
  | { type: "DELETE_DISTRICT"; districtId: string }
  | { type: "APPLY_DISTRICT_POLICY"; districtId: string; policyId: DistrictPolicyId }
  | { type: "REMOVE_DISTRICT_POLICY"; districtId: string; policyId: DistrictPolicyId }
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
  | { type: "DISTRICT_CREATED"; districtId: string }
  | { type: "DISTRICT_DELETED"; districtId: string }
  | { type: "DISTRICT_POLICY_APPLIED"; districtId: string; policyId: DistrictPolicyId }
  | { type: "ACHIEVEMENT_UNLOCKED"; achievementId: string; reward: number }
  | { type: "MILESTONE_REACHED"; milestone: string; population: number }
  | { type: "SCENARIO_WIN" }
  | { type: "SCENARIO_LOSE" }
  | { type: "WARNING_ADDED"; warning: Warning }
  | { type: "WARNING_REMOVED"; warningId: string };

export interface SimulationTickResult {
  state: CityState;
  events: GameEvent[];
}

export type BuildMode = "road" | "zone" | "building" | "demolish" | null;

export interface PlacementPreview {
  positions: [number, number][];
  valid: boolean;
  cost: number;
  label?: string;
  definitionId?: string;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
  pitch: number;
  rotation: number;
}

export type GraphicsQuality = "low" | "medium" | "high" | "ultra";

export interface UISettings {
  graphicsQuality: GraphicsQuality;
  soundEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
}

export interface UIState {
  camera: CameraState;
  selectedTile: [number, number] | null;
  hoveredTile: [number, number] | null;
  buildMode: BuildMode;
  selectedRoadType: "dirt" | "paved";
  selectedZoneType: ZoneType | null;
  selectedBuildingId: string | null;
  placementPreview: PlacementPreview | null;
  activeOverlay:
    | "zoning"
    | "power"
    | "water"
    | "pollution"
    | "health"
    | "education"
    | "districts"
    | null;
  settings: UISettings;
}

export interface SimulationStore {
  state: CityState;
  tick: () => SimulationTickResult;
  processCommand: (command: GameCommand) => CommandResult;
  processCommands: (commands: GameCommand[]) => CommandResult;
  loadSave: (save: CityState) => void;
  getSaveData: () => CityState;
}
