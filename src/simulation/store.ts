import { create } from "zustand";
import type {
  CityState,
  Tile,
  GameCommand,
  GameEvent,
  CommandResult,
  SimulationStore,
} from "../shared/types";

const GRID_SIZE = 64;

function createMap(): Tile[][] {
  return Array.from({ length: GRID_SIZE }, (_, y) =>
    Array.from({ length: GRID_SIZE }, (_, x) => ({
      x,
      y,
      terrain: "grass" as const,
      roadId: null,
      zone: null,
      buildingId: null,
      pollution: 0,
      landValue: 0,
    })),
  );
}

export function createInitialCityState(): CityState {
  return {
    map: createMap(),
    buildings: [],
    roads: [],
    economy: {
      money: 50000,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      taxRates: { residential: 10, commercial: 10, industrial: 10 },
      isBankrupt: false,
      monthsBelowZero: 0,
    },
    population: {
      total: 0,
      residentialCapacity: 0,
      employedWorkers: 0,
      unemployedWorkers: 0,
      growthRate: 0,
    },
    demand: { residential: 50, commercial: 30, industrial: 30 },
    services: {
      powerCapacity: 0,
      powerDemand: 0,
      waterCapacity: 0,
      waterDemand: 0,
      healthCoverage: 0,
      educationCoverage: 0,
    },
    happiness: {
      value: 70,
      components: {
        base: 70,
        tax: 0,
        unemployment: 0,
        services: 0,
        pollution: 0,
        parks: 0,
      },
    },
    progression: {
      currentMilestone: 0,
      unlockedFeatures: [],
      completedObjectives: [],
    },
    warnings: [],
    time: { tick: 0, month: 1, year: 1, speed: 1 },
  };
}

function isInBounds(x: number, y: number): boolean {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

function spatialResult(cmd: { x: number; y: number }, event: GameEvent): CommandResult {
  if (!isInBounds(cmd.x, cmd.y)) {
    return { success: false, error: "Out of bounds", events: [] };
  }
  return { success: true, events: [event] };
}

type HandlerMap = {
  [K in GameCommand as K["type"]]: (
    cmd: Extract<GameCommand, { type: K["type"] }>,
  ) => CommandResult;
};

const COMMAND_HANDLERS: HandlerMap = {
  PLACE_ROAD: (cmd) =>
    spatialResult(cmd, {
      type: "ROAD_PLACED",
      x: cmd.x,
      y: cmd.y,
      roadId: "temp",
    }),
  REMOVE_ROAD: (cmd) => spatialResult(cmd, { type: "ROAD_REMOVED", x: cmd.x, y: cmd.y }),
  PAINT_ZONE: (cmd) =>
    spatialResult(cmd, {
      type: "ZONE_PAINTED",
      x: cmd.x,
      y: cmd.y,
      zoneType: cmd.zoneType,
    }),
  REMOVE_ZONE: (cmd) => spatialResult(cmd, { type: "ZONE_REMOVED", x: cmd.x, y: cmd.y }),
  PLACE_BUILDING: (cmd) =>
    spatialResult(cmd, {
      type: "BUILDING_ADDED",
      buildingId: "temp",
      x: cmd.x,
      y: cmd.y,
    }),
  DEMOLISH: (cmd) => spatialResult(cmd, { type: "TILE_CHANGED", x: cmd.x, y: cmd.y }),
  SET_TAX_RATE: () => ({ success: true, events: [] }),
  SET_SPEED: () => ({ success: true, events: [] }),
};

export const useSimulationStore = create<SimulationStore>()((set, get) => ({
  state: createInitialCityState(),

  tick(): CityState {
    return get().state;
  },

  processCommand(command: GameCommand): CommandResult {
    const handler = COMMAND_HANDLERS[command.type] as (cmd: GameCommand) => CommandResult;
    return handler(command);
  },

  loadSave(save: CityState): void {
    set({ state: save });
  },

  getSaveData(): CityState {
    return get().state;
  },
}));
