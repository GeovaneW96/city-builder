# Shared Types Specification

## Purpose

This document consolidates every TypeScript type definition referenced across the design docs into a single source of truth.

When implementation begins, these types must be produced as `src/shared/types.ts` and must not be duplicated elsewhere.

## Core Coordinates

```ts
// Integer grid coordinates.
type Coord = {
  x: number; // 0..63
  y: number; // 0..63
};

// Cardinal directions for road adjacency, future pathfinding.
type Direction = "north" | "east" | "south" | "west";

type Rotation = 0 | 90 | 180 | 270;
```

## Tile

Canonical per-tile state. This is the single source of truth for the map.

```ts
type Tile = {
  x: number;
  y: number;
  terrain: "grass" | "water" | "blocked";
  roadId?: string;          // set if this tile is a road
  zone?: ZoneType;          // set if this tile has a zone painted
  buildingId?: string;      // set if a building occupies this tile
  pollution: number;        // 0..100
  landValue: number;        // 0..100, not used in MVP
};
```

For MVP every tile is `terrain: "grass"` unless manually blocked.

## Zones

```ts
type ZoneType = "residential" | "commercial" | "industrial";

type ZoneState = {
  // Flat list of all zoned tiles keyed by "x,y".
  tiles: Record<string, ZoneType>;
};
```

## Roads

```ts
type RoadTile = {
  id: string;             // unique road segment id
  x: number;
  y: number;
  roadType: "dirt" | "paved";
  connections: Direction[];  // orthogonal connections to neighbor road tiles
};

// Not used in MVP. Placeholder for future graph structure.
type RoadNetwork = {
  tiles: Record<string, RoadTile>;
  connectedComponents: string[][];  // grouped by connectivity
};
```

## Buildings

### Building Definition (data-driven, static)

```ts
type BuildingCategory =
  | "residential"
  | "commercial"
  | "industrial"
  | "utility"
  | "service"
  | "civic"
  | "decoration";

type PlacementType = "zone-grown" | "manual";

type BuildingRequirement =
  | { type: "roadAccess" }
  | { type: "demand"; zone: ZoneType }
  | { type: "unlock"; population: number }
  | { type: "service"; service: ServiceType }
  | { type: "workers"; count: number };

type BuildingEffect =
  | { type: "power"; capacity: number }
  | { type: "water"; capacity: number }
  | { type: "health"; radius: number; strength: number }
  | { type: "education"; radius: number; strength: number }
  | { type: "happiness"; radius: number; strength: number }
  | { type: "pollution"; radius: number; strength: number }
  | { type: "park"; radius: number; strength: number }
  | { type: "jobs"; count: number }
  | { type: "population"; capacity: number }
  | { type: "tax"; taxType: TaxType };

type BuildingDefinition = {
  id: string;                         // e.g. "small_house"
  name: string;                       // e.g. "Small House"
  category: BuildingCategory;
  placementType: PlacementType;
  size: { width: number; height: number };
  cost: number;                       // construction cost
  upkeep: number;                     // monthly maintenance
  unlockPopulation?: number;          // population milestone to unlock
  requirements: BuildingRequirement[];
  effects: BuildingEffect[];
  visual: {
    modelId: string;                  // maps to a mesh id
    footprintColor?: string;          // hex color for zone overlay
  };
};
```

### Building Instance (runtime, mutable)

```ts
type BuildingStatus = "constructing" | "active" | "inactive" | "abandoned";

type BuildingInstance = {
  id: string;                         // unique runtime id
  definitionId: string;               // references BuildingDefinition.id
  position: Coord;
  rotation: Rotation;
  status: BuildingStatus;
  warnings: string[];
  createdAtTick: number;
  occupants: number;                  // current residents
  workers: number;                    // current filled jobs
};
```

## Economy

```ts
type TaxType = "residential" | "commercial" | "industrial";

type TaxRates = Record<TaxType, number>;  // percentage, 0-20

type EconomyState = {
  money: number;
  monthlyIncome: number;      // cached, recomputed each economy tick
  monthlyExpenses: number;    // cached, recomputed each economy tick
  taxRates: TaxRates;
  isBankrupt: boolean;
  monthsBelowZero: number;    // consecutive months with money < 0
};
```

## Population

```ts
type PopulationState = {
  total: number;                // current population
  residentialCapacity: number;  // total available housing slots
  employedWorkers: number;
  unemployedWorkers: number;
  availableJobs: number;
  growthRate: number;           // per-month delta
};
```

## Demand

```ts
type DemandState = {
  residential: number;    // 0..100
  commercial: number;     // 0..100
  industrial: number;     // 0..100
};
```

## Services

```ts
type ServiceType = "power" | "water" | "health" | "education" | "police" | "fire";

type ServiceState = {
  // Capacity-based (power, water for MVP)
  power: { capacity: number; demand: number; coverage: number };
  water: { capacity: number; demand: number; coverage: number };

  // Radius-based (health, education for MVP)
  health: { buildingsInRange: number; totalBuildings: number; upkeep: number };
  education: { buildingsInRange: number; totalBuildings: number; upkeep: number };
};
```

## Happiness

```ts
type HappinessState = {
  cityHappiness: number;        // 0..100, used in MVP
  components: {
    base: number;
    tax: number;                // negative or positive modifier
    unemployment: number;
    services: number;
    pollution: number;
    parks: number;
    utility: number;
  };
};
```

## Warnings

```ts
type WarningSeverity = "info" | "warning" | "critical";

type Warning = {
  severity: WarningSeverity;
  message: string;
  targetBuildingId?: string;
  targetCoord?: Coord;
  suggestedFix?: string;
  acknowledged: boolean;
};

type WarningState = {
  active: Warning[];
};
```

## Progression

```ts
type ProgressionState = {
  currentMilestone: string;         // milestone id, e.g. "hamlet"
  unlockedFeatures: string[];       // feature ids that are unlocked
  completedObjectives: string[];    // objective ids completed
  scenarioState: ScenarioState;
};
```

## Game Time

```ts
type GameSpeed = 0 | 1 | 2 | 3;    // 0 = paused

type GameTimeState = {
  tick: number;                     // total simulation ticks elapsed
  month: number;                    // current in-game month (1-based)
  year: number;                     // current in-game year
  speed: GameSpeed;
  ticksThisMonth: number;           // ticks since last month rollover
};
```

## City State (Root)

```ts
type CityState = {
  map: MapState;                    // grid + tiles
  buildings: Record<string, BuildingInstance>;  // buildingId -> instance
  roads: RoadNetwork;
  zones: ZoneState;
  economy: EconomyState;
  population: PopulationState;
  demand: DemandState;
  services: ServiceState;
  happiness: HappinessState;
  progression: ProgressionState;
  warnings: WarningState;
  time: GameTimeState;
};
```

Where `MapState` is:

```ts
type MapState = {
  width: number;       // 64
  height: number;      // 64
  tiles: Tile[][];     // indexed as tiles[y][x]
};
```

## Commands

Every player action is a command. Commands are the only way to mutate simulation state.

```ts
type GameCommand =
  | { type: "PLACE_ROAD"; x: number; y: number; roadType: "dirt" | "paved" }
  | { type: "REMOVE_ROAD"; x: number; y: number }
  | { type: "PAINT_ZONE"; tiles: Coord[]; zoneType: ZoneType }
  | { type: "REMOVE_ZONE"; tiles: Coord[] }
  | { type: "PLACE_BUILDING"; x: number; y: number; buildingId: string; rotation?: Rotation }
  | { type: "DEMOLISH"; x: number; y: number }
  | { type: "SET_TAX_RATE"; taxType: TaxType; rate: number }
  | { type: "SET_SPEED"; speed: GameSpeed }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "SAVE_GAME"; slot: string }
  | { type: "LOAD_GAME"; slot: string };
```

## Save Data

```ts
type SaveGame = {
  version: number;          // starts at 1
  createdAt: string;        // ISO date
  updatedAt: string;        // ISO date
  cityName: string;         // player-chosen or default
  state: CityState;
};
```

## Rendering-only Types (not simulation)

```ts
// Camera config stored in a separate rendering store.
type CameraState = {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  zoom: number;
  pitch: number;
  rotation: number;
};

// Placement preview during build mode.
type PlacementPreview = {
  type: "road" | "zone" | "building";
  coords: Coord[];
  valid: boolean;
  cost: number;
  buildingId?: string;
  zoneType?: ZoneType;
  roadType?: "dirt" | "paved";
};

// A tile pick result from raycasting.
type PickResult = {
  tile?: Coord;
  objectId?: string;        // building or road mesh id
};
```

## Event Bus (simulation → rendering/UI)

Events are emitted by the simulation after state changes. Rendering and UI subscribe to relevant events.

```ts
type GameEvent =
  | { type: "TILE_CHANGED"; coord: Coord }
  | { type: "BUILDING_ADDED"; buildingId: string }
  | { type: "BUILDING_REMOVED"; buildingId: string }
  | { type: "BUILDING_STATUS_CHANGED"; buildingId: string; status: BuildingStatus }
  | { type: "ECONOMY_TICK"; state: EconomyState }
  | { type: "POPULATION_CHANGED"; total: number }
  | { type: "DEMAND_CHANGED"; demand: DemandState }
  | { type: "MILESTONE_REACHED"; milestoneId: string; population: number }
  | { type: "WARNING_ADDED"; warning: Warning }
  | { type: "WARNING_REMOVED"; warningId: string }
  | { type: "SCENARIO_WIN" }
  | { type: "SCENARIO_LOSS"; reason: string }
  | { type: "BANKRUPTCY_WARNING"; monthsLeft: number };
```

## Data-Driven Configuration Shapes

These are the shapes that data files must conform to. See `docs/27_DATA_FILES_SPEC.md` for actual values.

```ts
type BuildingDataFile = {
  buildings: BuildingDefinition[];
};

type BalanceDataFile = {
  startingMoney: number;
  bankruptcyGraceMonths: number;
  defaultTaxRates: TaxRates;
  baseHappiness: number;
  constructionCosts: Record<string, number>;
  monthlyUpkeep: Record<string, number>;
  incomeFormulas: {
    residential: string;      // description or code reference
    commercial: string;
    industrial: string;
  };
  taxHappinessEffects: { minRate: number; maxRate: number; effect: number }[];
};

type MilestoneDataFile = {
  milestones: {
    id: string;
    name: string;
    populationRequired: number;
    unlocks: string[];          // feature/building ids
    rewardMoney: number;
    rewardTitle?: string;
  }[];
};

type ScenarioDataFile = {
  scenarios: {
    id: string;
    name: string;
    description: string;
    startingConditions: {
      mapSize: Coord;
      startingMoney: number;
      unlocks: string[];
    };
    objectives: {
      id: string;
      title: string;
      description: string;
      condition: { type: string; target: number };
    }[];
    winCondition: {
      population: number;
      minMoney: number;
      minHappiness: number;
    };
    lossCondition: {
      type: "bankruptcy";
      graceMonths: number;
    };
  }[];
};
```
