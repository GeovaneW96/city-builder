import {
  CONSTRUCTION_COSTS,
  DISTRICT_BALANCE,
  getDistrictPolicy,
  TRAFFIC_BALANCE,
  TRANSPORT_BALANCE,
} from "../../data/balance";
import { getBuildingById } from "../../data/buildings";
import type {
  BuildingDefinition,
  BuildingInstance,
  CityState,
  CommandResult,
  GameCommand,
  GameEvent,
  Road,
  DistrictPolicyId,
  Tile,
  ZoneType,
} from "../../shared/types";
import { BUILDING_LOCK_TICKS, TAX_RATE_MAX, TAX_RATE_MIN } from "../constants";
import {
  cloneCityState,
  getBuildingFootprint,
  getFootprint,
  getOrthogonalNeighbors,
  getTile,
  hasAdjacentRoad,
  refreshAllRoadConnections,
} from "../grid/map";
import { advanceCommandObjectives } from "../systems/progression";
import { takeLoan } from "../systems/loans";
import { DISTRICT_COLORS, isPolicyRequirementMet } from "../systems/districts";
import { canSelectSpecialization } from "../systems/specialization";

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
  SET_ROAD_TIER: setRoadTier,
  PLACE_TRAFFIC_LIGHT: placeTrafficLight,
  SET_SPECIALIZATION: setSpecialization,
  CHANGE_ELEVATION: changeElevation,
  PAINT_ZONE: paintZone,
  REMOVE_ZONE: removeZone,
  PLACE_BUILDING: placeBuilding,
  DEMOLISH: demolish,
  SET_TAX_RATE: setTaxRate,
  TAKE_LOAN: takeLoanCommand,
  PLACE_BUS_STOP: placeBusStop,
  CREATE_BUS_ROUTE: createBusRoute,
  CREATE_DISTRICT: createDistrict,
  RENAME_DISTRICT: renameDistrict,
  DELETE_DISTRICT: deleteDistrict,
  APPLY_DISTRICT_POLICY: applyDistrictPolicy,
  REMOVE_DISTRICT_POLICY: removeDistrictPolicy,
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
  state.achievementProgress.roadsPlaced += 1;
  state.economy.money -= getRoadCost(command.roadType);
  state.traffic.roadNetworkDirty = true;
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
  state.traffic.roadNetworkDirty = true;
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
  if (
    definition.id.startsWith("landmark_") &&
    current.buildings.some((building) => building.definitionId === definition.id)
  ) {
    return failure(current, "Landmark already placed");
  }
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

function setRoadTier(
  current: CityState,
  command: Extract<GameCommand, { type: "SET_ROAD_TIER" }>,
): CommandApplication {
  const road = current.roads.find(
    (item) => item.position[0] === command.x && item.position[1] === command.y,
  );
  if (!road) return failure(current, "No road on this tile");
  const oldCost = getRoadCost(road.type);
  const newCost = getRoadCost(command.roadType);
  const change =
    newCost >= oldCost ? newCost - oldCost : -Math.floor((oldCost - newCost) / 2);
  if (change > current.economy.money) return failure(current, "Insufficient money");
  const state = cloneCityState(current);
  const target = state.roads.find((item) => item.id === road.id);
  if (target) target.type = command.roadType;
  state.economy.money -= change;
  state.traffic.roadNetworkDirty = true;
  return success(state, []);
}

function placeTrafficLight(
  current: CityState,
  command: Extract<GameCommand, { type: "PLACE_TRAFFIC_LIGHT" }>,
): CommandApplication {
  const road = current.roads.find(
    (item) => item.position[0] === command.x && item.position[1] === command.y,
  );
  if (!road || !current.traffic.intersections.includes(road.id)) {
    return failure(current, "Traffic lights require an intersection");
  }
  if (current.traffic.trafficLights.some((light) => light.roadId === road.id)) {
    return failure(current, "Traffic light already placed");
  }
  if (current.economy.money < TRAFFIC_BALANCE.TRAFFIC_LIGHT_COST) {
    return failure(current, "Insufficient money");
  }
  const state = cloneCityState(current);
  state.economy.money -= TRAFFIC_BALANCE.TRAFFIC_LIGHT_COST;
  state.traffic.trafficLights.push({
    roadId: road.id,
    tickPlaced: state.time.tick,
    phase: "green",
  });
  return success(state, []);
}

function setSpecialization(
  current: CityState,
  command: Extract<GameCommand, { type: "SET_SPECIALIZATION" }>,
): CommandApplication {
  if (!canSelectSpecialization(current, command.specializationId))
    return failure(current, "Specialization requirements are not met");
  if (current.time.tick - current.specialization.lastSwitchTick < 12)
    return failure(current, "Specialization is on cooldown");
  const cost = current.specialization.active
    ? Math.floor(current.economy.monthlyIncome * 0.5)
    : 0;
  if (current.economy.money < cost) return failure(current, "Insufficient money");
  const state = cloneCityState(current);
  state.economy.money -= cost;
  state.specialization = {
    active: command.specializationId,
    lastSwitchTick: state.time.tick,
  };
  return success(state, []);
}

function changeElevation(
  current: CityState,
  command: Extract<GameCommand, { type: "CHANGE_ELEVATION" }>,
): CommandApplication {
  const tile = getTile(current, command.x, command.y);
  if (!tile) return failure(current, "Out of bounds");
  const elevation = Math.max(0, Math.min(10, tile.elevation + command.delta));
  if (elevation === tile.elevation || current.economy.money < 100)
    return failure(current, "Elevation change is not available");
  const state = cloneCityState(current);
  const next = getRequiredTile(state, command.x, command.y);
  next.elevation = elevation;
  next.terrain = elevation === 0 ? "water" : "grass";
  state.economy.money -= 100;
  return success(state, [{ type: "TILE_CHANGED", x: command.x, y: command.y }]);
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

function createDistrict(
  current: CityState,
  command: Extract<GameCommand, { type: "CREATE_DISTRICT" }>,
): CommandApplication {
  const cells = getDistrictCells(command);
  const error = validateDistrictCells(current, cells, command.name);
  if (error) return failure(current, error);
  const state = cloneCityState(current);
  const id = `district:${state.districts.length + 1}:${state.time.tick}`;
  cells.forEach(({ x, y }) => {
    getRequiredTile(state, x, y).districtId = id;
  });
  state.districts.push({
    id,
    name: command.name.trim(),
    color: command.color ?? getDistrictColor(state.districts.length),
    tiles: cells.map(({ x, y }) => [x, y]),
    policies: [],
  });
  return success(state, [{ type: "DISTRICT_CREATED", districtId: id }]);
}

function renameDistrict(
  current: CityState,
  command: Extract<GameCommand, { type: "RENAME_DISTRICT" }>,
): CommandApplication {
  if (!command.name.trim()) return failure(current, "District name is required");
  const state = cloneCityState(current);
  const district = state.districts.find((item) => item.id === command.districtId);
  if (!district) return failure(current, "Unknown district");
  district.name = command.name.trim();
  return success(state, []);
}

function deleteDistrict(
  current: CityState,
  command: Extract<GameCommand, { type: "DELETE_DISTRICT" }>,
): CommandApplication {
  const district = current.districts.find((item) => item.id === command.districtId);
  if (!district) return failure(current, "Unknown district");
  const state = cloneCityState(current);
  district.tiles.forEach(([x, y]) => {
    getRequiredTile(state, x, y).districtId = null;
  });
  state.districts = state.districts.filter((item) => item.id !== district.id);
  return success(state, [{ type: "DISTRICT_DELETED", districtId: district.id }]);
}

function applyDistrictPolicy(
  current: CityState,
  command: Extract<GameCommand, { type: "APPLY_DISTRICT_POLICY" }>,
): CommandApplication {
  const district = current.districts.find((item) => item.id === command.districtId);
  const error = validateDistrictPolicy(current, district, command.policyId);
  if (error) return failure(current, error);
  const state = cloneCityState(current);
  state.districts
    .find((item) => item.id === command.districtId)
    ?.policies.push(command.policyId);
  return success(state, [
    {
      type: "DISTRICT_POLICY_APPLIED",
      districtId: command.districtId,
      policyId: command.policyId,
    },
  ]);
}

function removeDistrictPolicy(
  current: CityState,
  command: Extract<GameCommand, { type: "REMOVE_DISTRICT_POLICY" }>,
): CommandApplication {
  const district = current.districts.find((item) => item.id === command.districtId);
  if (!district?.policies.includes(command.policyId))
    return failure(current, "Policy is not active");
  const state = cloneCityState(current);
  const next = state.districts.find((item) => item.id === command.districtId);
  if (next)
    next.policies = next.policies.filter((policyId) => policyId !== command.policyId);
  return success(state, []);
}

function getDistrictCells(
  command: Extract<GameCommand, { type: "CREATE_DISTRICT" }>,
): { x: number; y: number }[] {
  const minX = Math.min(command.x1, command.x2);
  const maxX = Math.max(command.x1, command.x2);
  const minY = Math.min(command.y1, command.y2);
  const maxY = Math.max(command.y1, command.y2);
  return Array.from({ length: maxY - minY + 1 }, (_, y) =>
    Array.from({ length: maxX - minX + 1 }, (_, x) => ({ x: minX + x, y: minY + y })),
  ).flat();
}

function validateDistrictCells(
  state: CityState,
  cells: { x: number; y: number }[],
  name: string,
): string | null {
  if (!name.trim()) return "District name is required";
  const width = new Set(cells.map((cell) => cell.x)).size;
  const height = new Set(cells.map((cell) => cell.y)).size;
  if (width < DISTRICT_BALANCE.MIN_WIDTH || height < DISTRICT_BALANCE.MIN_HEIGHT) {
    return "Districts must be at least 2 by 2 tiles";
  }
  if (!cells.every((cell) => getTile(state, cell.x, cell.y)))
    return "District is out of bounds";
  return cells.some((cell) => getRequiredTile(state, cell.x, cell.y).districtId)
    ? "District overlaps an existing district"
    : null;
}

function validateDistrictPolicy(
  state: CityState,
  district: CityState["districts"][number] | undefined,
  policyId: DistrictPolicyId,
): string | null {
  if (!district) return "Unknown district";
  if (!getDistrictPolicy(policyId)) return "Unknown policy";
  if (district.policies.includes(policyId)) return "Policy is already active";
  if (district.policies.length >= DISTRICT_BALANCE.MAX_POLICIES)
    return "District policy limit reached";
  return isPolicyRequirementMet(state, district, policyId)
    ? null
    : "Policy requirements are not met";
}

function getDistrictColor(index: number): string {
  return DISTRICT_COLORS[index % DISTRICT_COLORS.length] ?? "#5bc0eb";
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
  if (tile.elevation > 5) return "Road elevation is too high";
  if (!hasValidRoadSlope(state, x, y, tile.elevation)) return "Road slope is too steep";
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
  if (!isZonePaintUnlocked(state, zoneType)) {
    return "Zone type is locked";
  }
  if (tile.roadId) return "Cannot zone a road";
  if (tile.buildingId) return "Cannot zone a building";
  if (tile.terrain !== "grass") return "Zone requires buildable terrain";
  return null;
}

function isZonePaintUnlocked(state: CityState, zoneType: ZoneType): boolean {
  if (zoneType.startsWith("medium")) return state.population.total >= 2500;
  if (zoneType.startsWith("high")) return state.population.total >= 10000;
  if (zoneType === "office") {
    return state.population.total >= 5000 && state.services.workforceQuality >= 40;
  }
  return state.progression.unlockedFeatures.includes(`${zoneType}_zoning`);
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
  if (!footprint.every((cell) => getTile(state, cell.x, cell.y))) return "Out of bounds";
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
  return (
    tile.terrain === "grass" && tile.elevation <= 3 && !tile.roadId && !tile.buildingId
  );
}

function hasValidRoadSlope(
  state: CityState,
  x: number,
  y: number,
  elevation: number,
): boolean {
  return getOrthogonalNeighbors(x, y).every((neighbor) => {
    const tile = getTile(state, neighbor.x, neighbor.y);
    return !tile?.roadId || Math.abs(tile.elevation - elevation) <= 1;
  });
}

function getRoadCost(roadType: Road["type"]): number {
  if (roadType === "dirt") return CONSTRUCTION_COSTS.DIRT_ROAD;
  if (roadType === "paved") return CONSTRUCTION_COSTS.PAVED_ROAD;
  return roadType === "local"
    ? TRAFFIC_BALANCE.LOCAL_ROAD_COST
    : roadType === "collector"
      ? TRAFFIC_BALANCE.COLLECTOR_ROAD_COST
      : TRAFFIC_BALANCE.ARTERIAL_ROAD_COST;
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
