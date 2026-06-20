import { TRANSPORT_BALANCE } from "../../data/balance";
import { getBuildingById } from "../../data/buildings";
import type { BusRoute, CityState } from "../../shared/types";

export function recomputePublicTransport(state: CityState): void {
  const activeRoutes = state.publicTransport.routes.filter((route) =>
    isRouteActive(state, route),
  );
  state.publicTransport.routes.forEach((route) => {
    route.active = activeRoutes.some((activeRoute) => activeRoute.id === route.id);
  });
  const activeStopIds = new Set(activeRoutes.flatMap((route) => route.stops));
  const activeStops = state.publicTransport.stops.filter((stop) =>
    activeStopIds.has(stop.id),
  );
  const coveredBuildings = state.buildings.filter((building) =>
    isBuildingCovered(building, activeStops),
  );
  state.publicTransport = {
    ...state.publicTransport,
    coveredBuildingIds: coveredBuildings.map((building) => building.id),
    ridership: getRidership(coveredBuildings),
    activeRouteCount: activeRoutes.length,
    happinessBonus: getHappinessBonus(coveredBuildings),
  };
}

export function isTransitCovered(state: CityState, buildingId: string): boolean {
  return state.publicTransport.coveredBuildingIds.includes(buildingId);
}

function isRouteActive(state: CityState, route: BusRoute): boolean {
  if (route.stops.length < TRANSPORT_BALANCE.MIN_STOPS_PER_ROUTE) return false;
  const hasStops = route.stops.every((stopId) =>
    state.publicTransport.stops.some((stop) => stop.id === stopId),
  );
  const depot = state.buildings.find((building) => building.id === route.depotId);
  return Boolean(
    hasStops && depot?.status === "active" && depot.definitionId === "bus_depot",
  );
}

function isBuildingCovered(
  building: CityState["buildings"][number],
  stops: CityState["publicTransport"]["stops"],
): boolean {
  if (building.status !== "active") return false;
  return stops.some(
    (stop) =>
      Math.abs(building.position[0] - stop.position[0]) +
        Math.abs(building.position[1] - stop.position[1]) <=
      TRANSPORT_BALANCE.COVERAGE_RADIUS,
  );
}

function getRidership(buildings: CityState["buildings"]): number {
  const coveredPopulation = buildings.reduce((total, building) => {
    const definition = getBuildingById(building.definitionId);
    return total + (definition?.effects.populationCapacity ?? 0);
  }, 0);
  return Math.min(
    TRANSPORT_BALANCE.MAX_RIDERSHIP,
    Math.round(coveredPopulation * TRANSPORT_BALANCE.RIDERSHIP_PERCENT),
  );
}

function getHappinessBonus(buildings: CityState["buildings"]): number {
  const bonuses = buildings.reduce(
    (total, building) => total + getBuildingHappinessBonus(building.definitionId),
    0,
  );
  return Math.round(bonuses / Math.max(1, buildings.length));
}

function getBuildingHappinessBonus(definitionId: string): number {
  const category = getBuildingById(definitionId)?.category;
  if (category === "residential") return TRANSPORT_BALANCE.RESIDENTIAL_HAPPINESS_BONUS;
  if (category === "commercial") return TRANSPORT_BALANCE.COMMERCIAL_HAPPINESS_BONUS;
  return 0;
}
