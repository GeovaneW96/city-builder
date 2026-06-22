import { EXTENDED_SERVICE_BALANCE } from "../../data/balance";
import { getBuildingById } from "../../data/buildings";
import type { BuildingInstance, CityState, GameEvent } from "../../shared/types";
import { getBuildingFootprint, getTile } from "../grid/map";

type RadiusEffect = "policeRadius" | "fireRadius" | "garbageCollectionRadius";

export function recomputeExtendedServices(state: CityState): GameEvent[] {
  const active = state.buildings.filter((building) => building.status === "active");
  const policeTargets = active.filter(isPoliceTarget);
  const fireTargets = active.filter(isFireTarget);
  const policeProviders = getProviders(active, "policeRadius");
  const fireProviders = getProviders(active, "fireRadius");
  updateCrime(policeTargets, policeProviders);
  const fireSpreadMultiplier = getSpreadMultiplier(state);
  const burned = updateFireRisk(fireTargets, fireProviders, fireSpreadMultiplier);
  const garbage = collectGarbage(state, active);
  state.extendedServices = {
    policeCoverage: getCoverage(policeTargets, policeProviders, "policeRadius"),
    fireCoverage: getCoverage(fireTargets, fireProviders, "fireRadius"),
    crimeRate: getCrimeRate(policeTargets),
    crimeHappinessPenalty: getCrimeHappinessPenalty(policeTargets),
    ...garbage,
  };
  return removeBurnedBuildings(state, burned);
}

function getSpreadMultiplier(state: CityState): number {
  return state.events.some((event) => event.type === "fire") ? 2 : 1;
}

function isPoliceTarget(building: BuildingInstance): boolean {
  const category = getBuildingById(building.definitionId)?.category;
  return category === "residential" || category === "commercial";
}

function isFireTarget(building: BuildingInstance): boolean {
  const category = getBuildingById(building.definitionId)?.category;
  return category === "residential" || category === "industrial";
}

function getProviders(
  buildings: BuildingInstance[],
  effect: RadiusEffect,
): BuildingInstance[] {
  return buildings.filter((building) => getEffect(building, effect) > 0);
}

function updateCrime(targets: BuildingInstance[], providers: BuildingInstance[]): void {
  targets.forEach((target) => {
    const current = target.crime ?? EXTENDED_SERVICE_BALANCE.BASE_CRIME;
    target.crime = isCovered(target, providers, "policeRadius")
      ? Math.max(0, current - EXTENDED_SERVICE_BALANCE.CRIME_SUPPRESSION)
      : Math.min(100, current + EXTENDED_SERVICE_BALANCE.CRIME_GROWTH);
  });
}

function updateFireRisk(
  targets: BuildingInstance[],
  providers: BuildingInstance[],
  spreadMultiplier: number,
): Set<string> {
  const burned = new Set<string>();
  targets.forEach((target) => {
    const current = target.fireRisk ?? getBaseFireRisk(target);
    target.fireRisk = isCovered(target, providers, "fireRadius")
      ? Math.max(0, current - EXTENDED_SERVICE_BALANCE.FIRE_SUPPRESSION)
      : Math.min(100, current + EXTENDED_SERVICE_BALANCE.FIRE_RISK_GROWTH);
    if (target.fireRisk >= EXTENDED_SERVICE_BALANCE.FIRE_RISK_THRESHOLD)
      burned.add(target.id);
  });
  spreadFire(targets, providers, burned, spreadMultiplier);
  return burned;
}

function spreadFire(
  targets: BuildingInstance[],
  providers: BuildingInstance[],
  burned: Set<string>,
  spreadMultiplier: number,
): void {
  const maxSpread = Math.max(1, burned.size * spreadMultiplier);
  let spread = 0;
  for (const source of targets) {
    if (!burned.has(source.id)) continue;
    for (const target of targets) {
      if (burned.has(target.id)) continue;
      if (getDistance(source, target) !== 1) continue;
      if (isCovered(target, providers, "fireRadius")) continue;
      if (spread >= maxSpread) return;
      burned.add(target.id);
      spread++;
    }
  }
}

function collectGarbage(
  state: CityState,
  active: BuildingInstance[],
): Pick<
  CityState["extendedServices"],
  | "totalUncollectedGarbage"
  | "monthlyGarbageProduction"
  | "monthlyGarbageCollected"
  | "garbageCoverage"
  | "garbageHappinessPenalty"
> {
  const sources = active.map((building) => ({
    building,
    amount: getGarbageAmount(building),
  }));
  const collectors = getProviders(active, "garbageCollectionRadius");
  const capacity = new Map(
    collectors.map((collector) => [
      collector.id,
      getEffect(collector, "garbageCapacity"),
    ]),
  );
  const monthlyGarbageProduction = sources.reduce(
    (total, source) => total + source.amount,
    0,
  );
  const currentWasteCollected = sources.reduce(
    (total, source) =>
      total + collectSource(source.building, source.amount, collectors, capacity),
    0,
  );
  const garbageCoverage = getCoverage(
    sources.filter((source) => source.amount > 0).map((source) => source.building),
    collectors,
    "garbageCollectionRadius",
  );
  const backlog = Math.max(
    0,
    state.extendedServices.totalUncollectedGarbage +
      monthlyGarbageProduction -
      currentWasteCollected,
  );
  const backlogCollected = collectGarbageBacklog(backlog, garbageCoverage, capacity);
  const monthlyGarbageCollected = currentWasteCollected + backlogCollected;
  const totalUncollectedGarbage = Math.max(
    0,
    backlog - backlogCollected - EXTENDED_SERVICE_BALANCE.GARBAGE_DECAY,
  );
  return {
    totalUncollectedGarbage,
    monthlyGarbageProduction,
    monthlyGarbageCollected,
    garbageCoverage,
    garbageHappinessPenalty: -Math.floor(totalUncollectedGarbage / 10),
  };
}

function collectGarbageBacklog(
  backlog: number,
  garbageCoverage: number,
  capacity: Map<string, number>,
): number {
  const availableCapacity = [...capacity.values()].reduce(
    (total, value) => total + value,
    0,
  );
  return Math.min(backlog * (garbageCoverage / 100), availableCapacity);
}

function collectSource(
  source: BuildingInstance,
  amount: number,
  collectors: BuildingInstance[],
  capacity: Map<string, number>,
): number {
  const collector = collectors.find(
    (candidate) =>
      isCovered(source, [candidate], "garbageCollectionRadius") &&
      (capacity.get(candidate.id) ?? 0) > 0,
  );
  if (!collector) return 0;
  const available = capacity.get(collector.id) ?? 0;
  const collected = Math.min(amount, available);
  capacity.set(collector.id, available - collected);
  return collected;
}

function getGarbageAmount(building: BuildingInstance): number {
  const definition = getBuildingById(building.definitionId);
  if (!definition) return 0;
  const { category, effects } = definition;
  if (category === "residential") {
    return Math.ceil(
      (effects.populationCapacity ?? 0) /
        EXTENDED_SERVICE_BALANCE.GARBAGE_RESIDENTIAL_PER_10_POPULATION /
        10,
    );
  }
  if (category === "commercial") {
    return Math.ceil((effects.jobs ?? 0) / 5);
  }
  if (category === "industrial") {
    return Math.ceil((effects.jobs ?? 0) / 10) * 2;
  }
  return 0;
}

function getCoverage(
  targets: BuildingInstance[],
  providers: BuildingInstance[],
  effect: RadiusEffect,
): number {
  if (targets.length === 0) return 100;
  const covered = targets.filter((target) => isCovered(target, providers, effect));
  return Math.round((covered.length / targets.length) * 100);
}

function isCovered(
  target: BuildingInstance,
  providers: BuildingInstance[],
  effect: RadiusEffect,
): boolean {
  return providers.some(
    (provider) => getDistance(target, provider) <= getEffect(provider, effect),
  );
}

function getEffect(
  building: BuildingInstance,
  effect: RadiusEffect | "garbageCapacity",
): number {
  return getBuildingById(building.definitionId)?.effects[effect] ?? 0;
}

function getDistance(first: BuildingInstance, second: BuildingInstance): number {
  return (
    Math.abs(first.position[0] - second.position[0]) +
    Math.abs(first.position[1] - second.position[1])
  );
}

function getBaseFireRisk(building: BuildingInstance): number {
  return getBuildingById(building.definitionId)?.category === "industrial"
    ? EXTENDED_SERVICE_BALANCE.FIRE_BASE_RISK_INDUSTRIAL
    : EXTENDED_SERVICE_BALANCE.FIRE_BASE_RISK_RESIDENTIAL;
}

function getCrimeRate(targets: BuildingInstance[]): number {
  if (targets.length === 0) return 0;
  return (
    targets.reduce((total, target) => total + (target.crime ?? 0), 0) / targets.length
  );
}

function getCrimeHappinessPenalty(targets: BuildingInstance[]): number {
  const crimeRate = getCrimeRate(targets);
  if (crimeRate <= 10) return 0;
  if (crimeRate <= 25) return -3;
  if (crimeRate <= 50) return -8;
  return -15;
}

function removeBurnedBuildings(state: CityState, burned: Set<string>): GameEvent[] {
  const events = [...burned].flatMap((buildingId) =>
    removeBurnedBuilding(state, buildingId),
  );
  state.buildings = state.buildings.filter((building) => !burned.has(building.id));
  return events;
}

function removeBurnedBuilding(state: CityState, buildingId: string): GameEvent[] {
  const building = state.buildings.find((candidate) => candidate.id === buildingId);
  const definition = building && getBuildingById(building.definitionId);
  if (!building || !definition) return [];
  const tileEvents: GameEvent[] = getBuildingFootprint(building, definition).flatMap(
    (cell) => {
      const tile = getTile(state, cell.x, cell.y);
      if (tile) tile.buildingId = null;
      return tile ? [{ type: "TILE_CHANGED" as const, x: cell.x, y: cell.y }] : [];
    },
  );
  return [
    ...tileEvents,
    {
      type: "BUILDING_REMOVED",
      buildingId,
      x: building.position[0],
      y: building.position[1],
    },
  ];
}
