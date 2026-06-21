import type { DistrictPolicyDefinition } from "../../shared/types";

export { CONSTRUCTION_COSTS } from "./construction";
export { MONTHLY_UPKEEP } from "./upkeep";
export { TAX_HAPPINESS_EFFECT, DEFAULT_TAX_RATE, getTaxHappinessModifier } from "./taxes";
export { TAX_INCOME_FORMULAS, calculateTaxIncome } from "./income";
export { HAPPINESS_DEFAULTS, STARTING_MONEY, BANKRUPTCY_GRACE_MONTHS } from "./happiness";
export { DEMAND_PARAMS } from "./demand";
export { SERVICE_DEMAND, SERVICE_HAPPINESS } from "./services";
export { POLLUTION_BALANCE } from "./pollution";
export { TRAFFIC_BALANCE } from "./traffic";
export { GOODS_BALANCE } from "./goods";
export { LOAN_BALANCE, LOAN_PRINCIPALS } from "./loans";
export { EXTENDED_SERVICE_BALANCE } from "./extendedServices";
export { TRANSPORT_BALANCE } from "./transport";
export { RATING_BALANCE } from "./rating";

export const DISTRICT_BALANCE = {
  MIN_WIDTH: 2,
  MIN_HEIGHT: 2,
  MAX_POLICIES: 3,
  TAX_BREAK_REDUCTION: 0.05,
  SMOKING_BAN_HAPPINESS: 5,
  NIGHTLIFE_HAPPINESS: -3,
  NIGHTLIFE_COMMERCIAL_DEMAND: 15,
  GREEN_INITIATIVE_POLLUTION_MULTIPLIER: 0.5,
} as const;

export const DISTRICT_POLICIES: DistrictPolicyDefinition[] = [
  {
    id: "tax_break",
    name: "Tax Break",
    description: "Reduces district taxes by 5%.",
    monthlyCost: 200,
    requirement: "businesses_10",
  },
  {
    id: "service_priority",
    name: "Service Priority",
    description: "Prioritizes service coverage.",
    monthlyCost: 150,
    requirement: "service_building",
  },
  {
    id: "smoking_ban",
    name: "Smoking Ban",
    description: "Improves local residential happiness.",
    monthlyCost: 100,
    requirement: "population_500",
  },
  {
    id: "nightlife",
    name: "Nightlife",
    description: "Boosts commercial demand with a local happiness tradeoff.",
    monthlyCost: 150,
    requirement: "population_1000",
  },
  {
    id: "green_initiative",
    name: "Green Initiative",
    description: "Halves local industrial pollution.",
    monthlyCost: 200,
    requirement: "industrial_building",
  },
];

export function getDistrictPolicy(policyId: string): DistrictPolicyDefinition | null {
  return DISTRICT_POLICIES.find((policy) => policy.id === policyId) ?? null;
}
export {
  BASE_LAND_VALUE,
  PARK_BONUS,
  PARK_RADIUS,
  HEALTH_BONUS,
  HEALTH_RADIUS,
  EDUCATION_BONUS,
  EDUCATION_RADIUS,
  ROAD_ACCESS_BONUS,
  WATERFRONT_BONUS,
  WATERFRONT_RADIUS,
  INDUSTRIAL_PENALTY,
  INDUSTRIAL_RADIUS,
  NOISE_PENALTY,
  NOISE_RADIUS,
  LAND_VALUE_MIN,
  LAND_VALUE_MAX,
  INDUSTRIAL_PRODUCTIVITY_THRESHOLD,
  LOW_LAND_VALUE_INDUSTRIAL_PRODUCTIVITY_MULTIPLIER,
} from "./landValue";
export {
  UPGRADE_COOLDOWN_T1_T2,
  UPGRADE_COOLDOWN_T2_T3,
  UPGRADE_LAND_VALUE_T1_T2,
  UPGRADE_LAND_VALUE_T2_T3,
  UPGRADE_HAPPINESS_T1_T2,
  UPGRADE_HAPPINESS_T2_T3,
  UPGRADE_POPULATION_T1_T2,
  UPGRADE_POPULATION_T2_T3,
  UPGRADE_REQUIRES_EDUCATION_T1_T2,
  UPGRADE_REQUIRES_EDUCATION_T2_T3,
  UPGRADE_REQUIRED_EDUCATION_TIER_T1_T2,
  UPGRADE_REQUIRED_EDUCATION_TIER_T2_T3,
} from "./upgrades";
