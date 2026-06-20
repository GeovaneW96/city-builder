import { CONSTRUCTION_COSTS, TRANSPORT_BALANCE } from "../../data/balance";
import { getBuildingById } from "../../data/buildings";
import type {
  BuildingDefinition,
  BuildingInstance,
  CityState,
  CommandResult,
  GameCommand,
  GameEvent,
  Road,
  Tile,
  ZoneType,
} from "../../shared/types";
import { BUILDING_LOCK_TICKS, TAX_RATE_MAX, TAX_RATE_MIN } from "../constants";
import {
  cloneCityState,
  getBuildingFootprint,
  getFootprint,
  getTile,
  hasAdjacentRoad,
  isInBounds,
  refreshAllRoadConnections,
} from "../grid/map";
import { advanceCommandObjectives } from "../systems/progression";
import { takeLoan } from "../systems/loans";

interface CommandApplication {
  state: CityState;
  result: CommandResult;
}

type CommandHandler<T extends GameCommand> = (
  state: CityState,
  command: T,
) => CommandApplication;

export function processCityCommand(
  current: CityState,
  command: GameCommand,
): CommandApplication {
  const handler = COMMAND_HANDLERS[command.type] as CommandHandler<GameCommand>;
  const application = handler(current, command);
  if (application.result.success) {
    advanceCommandObjectives(application.state, command);
  }
  return application;
}

const COMMAND_HANDLERS = {
  PLACE_ROAD: placeRoad,
  REMOVE_ROAD: removeRoad,
  PAINT_ZONE: paintZone,
  REMOVE_ZONE: removeZone,
  PLACE_BUILDING: placeBuilding,
  DEMOLISH: demolish,
  SET_TAX_RATE: setTaxRate,
  TAKE_LOAN: takeLoanCommand,
  PLACE_BUS_STOP: placeBusStop,
  CREATE_BUS_ROUTE: createBusRoute,
  SET_SPEED: setSpeed,
} satisfies {
  [K in GameCommand["type"]]: CommandHandler<Extract<GameCommand, { type: K }>>;
};

function placeRoad(
  current: CityState,
  command: Extract<GameCommand, { type: "PLACE_ROAD" }>,
): CommandApplication {
  const validation = validateRoadPlacement(
    current,
    command.x,
    command.y,
    command.roadType,
  );
  if (validation) return failure(current, validation);

  const state = cloneCityState(current);
  const id = `road:${command.x},${command.y}`;
  const tile = getRequiredTile(state, command.x, command.y);
  tile.roadId = id;
  tile.zone = null;
  state.roads.push(createRoad(id, command));
  state.economy.money -= getRoadCost(command.roadType);
  refreshAllRoadConnections(state);
  return success(state, [
    { type: "ROAD_PLACED", x: command.x, y: command.y, roadId: id },
    { type: "TILE_CHANGED", x: command.x, y: command.y },
  ]);
}

function removeRoad(
  current: CityState,
  command: Extract<GameCommand, { type: "REMOVE_ROAD" }>,
): CommandApplication {
  const tile = getTile(current, command.x, command.y);
  if (!tile) return failure(current, "Out of bounds");
  if (!tile.roadId) return failure(current, "No road on this tile");

  const state = cloneCityState(current);
  const nextTile = getRequiredTile(state, command.x, command.y);
  const roadId = nextTile.roadId;
  nextTile.roadId = null;
  state.roads = state.roads.filter((road) => road.id !== roadId);
  refreshAllRoadConnections(state);
  return success(state, [
    { type: "ROAD_REMOVED", x: command.x, y: command.y },
    { type: "TILE_CHANGED", x: command.x, y: command.y },
  ]);
}

function paintZone(
  current: CityState,
  command: Extract<GameCommand, { type: "PAINT_ZONE" }>,
): CommandApplication {
  const validation = validateZonePaint(current, command.x, command.y, command.zoneType);
  if (validation) return failure(current, validation);

  const state = cloneCityState(current);
  getRequiredTile(state, command.x, command.y).zone = command.zoneType;
  return success(state, [
    { type: "ZONE_PAINTED", x: command.x, y: command.y, zoneType: command.zoneType },
    { type: "TILE_CHANGED", x: command.x, y: command.y },
  ]);
}

function removeZone(
  current: CityState,
  command: Extract<GameCommand, { type: "REMOVE_ZONE" }>,
): CommandApplication {
  const tile = getTile(current, command.x, command.y);
  if (!tile) return failure(current, "Out of bounds");
  if (!tile.zone) return failure(current, "No zone on this tile");

  const state = cloneCityState(current);
  getRequiredTile(state, command.x, command.y).zone = null;
  return success(state, [
    { type: "ZONE_REMOVED", x: command.x, y: command.y },
    { type: "TILE_CHANGED", x: command.x, y: command.y },
  ]);
}

function placeBuilding(
  current: CityState,
  command: Extract<GameCommand, { type: "PLACE_BUILDING" }>,
): CommandApplication {
  const definition = getBuildingById(command.definitionId);
  if (!definition) return failure(current, "Unknown building");
  const rotation = command.rotation ?? 0;
  const validation = validateBuildingPlacement(
    current,
    definition,
    command.x,
    command.y,
    rotation,
  );
  if (validation) return failure(current, validation);

  const state = cloneCityState(current);
  const building = createManualBuilding(
    state,
    definition,
    command.x,
    command.y,
    rotation,
  );
  state.buildings.push(building);
  state.economy.money -= definition.cost;
  const events = occupyBuildingFootprint(state, building, definition);
  events.push({
    type: "BUILDING_ADDED",
    buildingId: building.id,
    x: command.x,
    y: command.y,
  });
  return success(state, events);
}

function demolish(
  current: CityState,
  command: Extract<GameCommand, { type: "DEMOLISH" }>,
): CommandApplication {
  const tile = getTile(current, command.x, command.y);
  if (!tile) return failure(current, "Out of bounds");
  if (tile.buildingId) return demolishBuilding(current, tile.buildingId);
  if (tile.roadId)
    return removeRoad(current, { type: "REMOVE_ROAD", x: command.x, y: command.y });
  if (tile.zone)
    return removeZone(current, { type: "REMOVE_ZONE", x: command.x, y: command.y });
  return failure(current, "Nothing to demolish");
}

function setTaxRate(
  current: CityState,
  command: Extract<GameCommand, { type: "SET_TAX_RATE" }>,
): CommandApplication {
  const state = cloneCityState(current);
  state.economy.taxRates[command.taxType] = clamp(
    command.rate,
    TAX_RATE_MIN,
    TAX_RATE_MAX,
  );
  return success(state, []);
}

function setSpeed(
  current: CityState,
  command: Extract<GameCommand, { type: "SET_SPEED" }>,
): CommandApplication {
  const state = cloneCityState(current);
  state.time.speed = command.speed;
  return success(state, []);
}

function takeLoanCommand(
  current: CityState,
  command: Extract<GameCommand, { type: "TAKE_LOAN" }>,
): CommandApplication {
  const state = cloneCityState(current);
  const error = takeLoan(state, command.loanType);
  return error ? failure(current, error) : success(state, []);
}

function placeBusStop(
  current: CityState,
  command: Extract<GameCommand, { type: "PLACE_BUS_STOP" }>,
): CommandApplication {
  const tile = getTile(current, command.x, command.y);
  if (!tile) return failure(current, "Out of bounds");
  if (current.population.total < TRANSPORT_BALANCE.UNLOCK_POPULATION) {
    return failure(current, "Bus stops are locked");
  }
  if (!tile.roadId) return failure(current, "Bus stops require a road tile");
  if (current.economy.money < TRANSPORT_BALANCE.BUS_STOP_COST) {
    return failure(current, "Insufficient money");
  }
  const state = cloneCityState(current);
  state.publicTransport.stops.push({
    id: `bus-stop:${command.x},${command.y}:${state.time.tick}`,
    position: [command.x, command.y],
  });
  state.economy.money -= TRANSPORT_BALANCE.BUS_STOP_COST;
  return success(state, []);
}

function createBusRoute(
  current: CityState,
  command: Extract<GameCommand, { type: "CREATE_BUS_ROUTE" }>,
): CommandApplication {
  const validation = validateBusRoute(current, command);
  if (validation) return failure(current, validation);
  const state = cloneCityState(current);
  state.publicTransport.routes.push({
    id: `bus-route:${state.publicTransport.routes.length + 1}`,
    name: command.name,
    stops: [...command.stopIds],
    depotId: command.depotId,
    active: true,
  });
  return success(state, []);
}

function validateBusRoute(
  state: CityState,
  command: Extract<GameCommand, { type: "CREATE_BUS_ROUTE" }>,
): string | null {
  if (command.stopIds.length < TRANSPORT_BALANCE.MIN_STOPS_PER_ROUTE) {
    return "Bus routes require at least two stops";
  }
  if (
    !command.stopIds.every((stopId) =>
      state.publicTransport.stops.some((stop) => stop.id === stopId),
    )
  ) {
    return "Bus route contains an unknown stop";
  }
  const depot = state.buildings.find((building) => building.id === command.depotId);
  if (depot?.definitionId !== "bus_depot") return "Bus route requires a bus depot";
  return null;
}

function demolishBuilding(current: CityState, buildingId: string): CommandApplication {
  const building = current.buildings.find((candidate) => candidate.id === buildingId);
  if (!building) return failure(current, "Building not found");
  if (current.time.tick < building.lockedUntilTick)
    return failure(current, "Building is still settling");

  const definition = getBuildingById(building.definitionId);
  if (!definition) return failure(current, "Building definition missing");
  const state = cloneCityState(current);
  const nextBuilding = state.buildings.find((candidate) => candidate.id === buildingId);
  if (!nextBuilding) return failure(current, "Building not found");
  const events = clearBuildingFootprint(state, nextBuilding, definition);
  state.buildings = state.buildings.filter((candidate) => candidate.id !== buildingId);
  events.push({
    type: "BUILDING_REMOVED",
    buildingId,
    x: nextBuilding.position[0],
    y: nextBuilding.position[1],
  });
  return success(state, events);
}

function validateRoadPlacement(
  state: CityState,
  x: number,
  y: number,
  roadType: Road["type"],
): string | null {
  const tile = getTile(state, x, y);
  if (!tile) return "Out of bounds";
  if (tile.terrain !== "grass") return "Road requires buildable terrain";
  if (tile.buildingId) return "Cannot place road on a building";
  if (tile.roadId) return "Road already exists";
  if (state.economy.money < getRoadCost(roadType)) return "Insufficient money";
  return null;
}

function validateZonePaint(
  state: CityState,
  x: number,
  y: number,
  zoneType: ZoneType,
): string | null {
  const tile = getTile(state, x, y);
  if (!tile) return "Out of bounds";
  if (!state.progression.unlockedFeatures.includes(`${zoneType}_zoning`)) {
    return "Zone type is locked";
  }
  if (tile.roadId) return "Cannot zone a road";
  if (tile.buildingId) return "Cannot zone a building";
  if (tile.terrain !== "grass") return "Zone requires buildable terrain";
  return null;
}

function validateBuildingPlacement(
  state: CityState,
  definition: BuildingDefinition,
  x: number,
  y: number,
  rotation: 0 | 90 | 180 | 270,
): string | null {
  if (definition.placementType !== "manual") return "Building is zone-grown";
  if (!isBuildingUnlocked(state, definition)) return "Building is locked";
  if (state.economy.money < definition.cost) return "Insufficient money";
  const footprint = getFootprint(definition, x, y, rotation);
  if (!footprint.every((cell) => isInBounds(cell.x, cell.y))) return "Out of bounds";
  if (
    !footprint.every((cell) => isBuildableTile(getRequiredTile(state, cell.x, cell.y)))
  ) {
    return "Building footprint is blocked";
  }
  if (definition.requirements.roadAccess && !hasAdjacentRoad(state, footprint)) {
    return "Building requires adjacent road";
  }
  return null;
}

function occupyBuildingFootprint(
  state: CityState,
  building: BuildingInstance,
  definition: BuildingDefinition,
): GameEvent[] {
  return getBuildingFootprint(building, definition).map((cell) => {
    const tile = getRequiredTile(state, cell.x, cell.y);
    tile.buildingId = building.id;
    tile.zone = null;
    return { type: "TILE_CHANGED", x: cell.x, y: cell.y };
  });
}

function clearBuildingFootprint(
  state: CityState,
  building: BuildingInstance,
  definition: BuildingDefinition,
): GameEvent[] {
  return getBuildingFootprint(building, definition).map((cell) => {
    getRequiredTile(state, cell.x, cell.y).buildingId = null;
    return { type: "TILE_CHANGED", x: cell.x, y: cell.y };
  });
}

function createManualBuilding(
  state: CityState,
  definition: BuildingDefinition,
  x: number,
  y: number,
  rotation: 0 | 90 | 180 | 270,
): BuildingInstance {
  return {
    id: `${definition.id}:${x},${y}:${state.time.tick}`,
    definitionId: definition.id,
    position: [x, y],
    rotation,
    status: "active",
    warnings: [],
    createdAtTick: state.time.tick,
    lockedUntilTick: state.time.tick + BUILDING_LOCK_TICKS,
    unresolvedWarningTicks: 0,
    upgradeTier: definition.densityTier ?? 1,
    lastUpgradeTick: state.time.tick,
  };
}

function createRoad(
  id: string,
  command: Extract<GameCommand, { type: "PLACE_ROAD" }>,
): Road {
  return {
    id,
    type: command.roadType,
    position: [command.x, command.y],
    connections: { north: false, east: false, south: false, west: false },
  };
}

function isBuildingUnlocked(state: CityState, definition: BuildingDefinition): boolean {
  return (
    state.population.total >= definition.unlockPopulation ||
    state.progression.unlockedFeatures.includes(definition.id)
  );
}

function isBuildableTile(tile: Tile): boolean {
  return tile.terrain === "grass" && !tile.roadId && !tile.buildingId;
}

function getRoadCost(roadType: Road["type"]): number {
  return roadType === "dirt"
    ? CONSTRUCTION_COSTS.DIRT_ROAD
    : CONSTRUCTION_COSTS.PAVED_ROAD;
}

function getRequiredTile(state: CityState, x: number, y: number): Tile {
  const tile = getTile(state, x, y);
  if (!tile) throw new Error(`Tile ${x},${y} is out of bounds`);
  return tile;
}

function success(state: CityState, events: GameEvent[]): CommandApplication {
  return { state, result: { success: true, events } };
}

function failure(state: CityState, error: string): CommandApplication {
  return { state, result: { success: false, error, events: [] } };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
