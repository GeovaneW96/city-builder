import { DISTRICT_BALANCE, getDistrictPolicy } from "../../data/balance";
import { getBuildingById } from "../../data/buildings";
import type {
  BuildingInstance,
  CityState,
  District,
  DistrictPolicyId,
} from "../../shared/types";

export function hasDistrictPolicy(
  state: CityState,
  x: number,
  y: number,
  policyId: DistrictPolicyId,
): boolean {
  const districtId = state.map[y]?.[x]?.districtId;
  return Boolean(
    districtId &&
    state.districts
      .find((district) => district.id === districtId)
      ?.policies.includes(policyId),
  );
}

export function getDistrictPolicyCost(state: CityState): number {
  return state.districts.reduce(
    (total, district) =>
      total +
      district.policies.reduce(
        (districtTotal, policyId) =>
          districtTotal + (getDistrictPolicy(policyId)?.monthlyCost ?? 0),
        0,
      ),
    0,
  );
}

export function getNightlifeDemandBonus(state: CityState): number {
  return (
    state.districts.filter((district) => district.policies.includes("nightlife")).length *
    DISTRICT_BALANCE.NIGHTLIFE_COMMERCIAL_DEMAND
  );
}

export function getBuildingPolicyHappiness(
  state: CityState,
  building: BuildingInstance,
): number {
  const category = getBuildingById(building.definitionId)?.category;
  if (category !== "residential") return 0;
  const [x, y] = building.position;
  const smokingBan = hasDistrictPolicy(state, x, y, "smoking_ban")
    ? DISTRICT_BALANCE.SMOKING_BAN_HAPPINESS
    : 0;
  const nightlife = hasDistrictPolicy(state, x, y, "nightlife")
    ? DISTRICT_BALANCE.NIGHTLIFE_HAPPINESS
    : 0;
  return smokingBan + nightlife;
}

export function getGreenInitiativeMultiplier(
  state: CityState,
  building: BuildingInstance,
): number {
  const [x, y] = building.position;
  return hasDistrictPolicy(state, x, y, "green_initiative")
    ? DISTRICT_BALANCE.GREEN_INITIATIVE_POLLUTION_MULTIPLIER
    : 1;
}

export function isPolicyRequirementMet(
  state: CityState,
  district: District,
  policyId: DistrictPolicyId,
): boolean {
  const requirement = getDistrictPolicy(policyId)?.requirement;
  if (requirement === "population_500") return state.population.total >= 500;
  if (requirement === "population_1000") return state.population.total >= 1000;
  if (requirement === "service_building") return hasServiceBuilding(state);
  if (requirement === "businesses_10")
    return getDistrictBusinesses(state, district) >= 10;
  return requirement === "industrial_building" && hasDistrictIndustry(state, district);
}

export function getDistrictBuildings(
  state: CityState,
  district: District,
): BuildingInstance[] {
  return state.buildings.filter((building) => {
    const [x, y] = building.position;
    return state.map[y]?.[x]?.districtId === district.id;
  });
}

export function getTaxBreakShare(
  state: CityState,
  category: "residential" | "commercial" | "industrial",
): number {
  const buildings = state.buildings.filter(
    (building) => getBuildingById(building.definitionId)?.category === category,
  );
  if (buildings.length === 0) return 0;
  const taxBreakBuildings = buildings.filter((building) => {
    const [x, y] = building.position;
    return hasDistrictPolicy(state, x, y, "tax_break");
  });
  return taxBreakBuildings.length / buildings.length;
}

export function getServicePriorityBuildings(
  state: CityState,
  buildings: BuildingInstance[],
): BuildingInstance[] {
  return [...buildings].sort(
    (left, right) => Number(isPriority(state, right)) - Number(isPriority(state, left)),
  );
}

function isPriority(state: CityState, building: BuildingInstance): boolean {
  const [x, y] = building.position;
  return hasDistrictPolicy(state, x, y, "service_priority");
}

function getDistrictBusinesses(state: CityState, district: District): number {
  return getDistrictBuildings(state, district).filter((building) => {
    const category = getBuildingById(building.definitionId)?.category;
    return category === "commercial" || category === "industrial";
  }).length;
}

function hasDistrictIndustry(state: CityState, district: District): boolean {
  return getDistrictBuildings(state, district).some(
    (building) => getBuildingById(building.definitionId)?.category === "industrial",
  );
}

function hasServiceBuilding(state: CityState): boolean {
  return state.buildings.some((building) => {
    const category = getBuildingById(building.definitionId)?.category;
    return category === "service" || category === "utility" || category === "security";
  });
}

export const DISTRICT_COLORS = ["#5bc0eb", "#9bc53d", "#e55934", "#fa7921"];
