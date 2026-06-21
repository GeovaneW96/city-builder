import { getBuildingById } from "../../data/buildings";
import type { BiomeType, ZoneType } from "../../shared/types";

export type ScenarioCondition =
  | "population"
  | "money"
  | "happiness"
  | "build_building"
  | "place_roads"
  | "zone_residential"
  | "zone_commercial"
  | "zone_industrial"
  | "has_building_count";
export interface ScenarioObjective {
  id: string;
  order: number;
  description: string;
  condition: ScenarioCondition;
  value: number;
  buildingId?: string;
  optional?: boolean;
}
export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  mapWidth: number;
  mapHeight: number;
  biome: BiomeType;
  startingMoney: number;
  startingPopulation: number;
  startingHappiness: number;
  initialUnlocks: string[];
  objectives: ScenarioObjective[];
  winCondition: { populationMin: number; moneyMin: number; happinessMin: number };
  lossCondition: { monthsBelowZeroMax: number };
  initialZones: { x: number; y: number; zone: ZoneType }[];
}

export function createScenario(): ScenarioDefinition {
  return {
    id: "custom_scenario",
    name: "Custom Scenario",
    description: "",
    mapWidth: 64,
    mapHeight: 64,
    biome: "temperate",
    startingMoney: 50000,
    startingPopulation: 0,
    startingHappiness: 70,
    initialUnlocks: [],
    objectives: [],
    winCondition: { populationMin: 1000, moneyMin: 0, happinessMin: 50 },
    lossCondition: { monthsBelowZeroMax: 5 },
    initialZones: [],
  };
}

export function validateScenario(scenario: ScenarioDefinition): string[] {
  const errors: string[] = [];
  validateHeader(scenario, errors);
  validateObjectives(scenario.objectives, errors);
  return errors;
}

function validateHeader(scenario: ScenarioDefinition, errors: string[]): void {
  if (!scenario.id || !scenario.name) errors.push("Scenario id and name are required");
  if (!hasValidDimensions(scenario))
    errors.push("Map dimensions must be positive integers");
  if (!hasValidStartingConditions(scenario))
    errors.push("Starting conditions are invalid");
  if (scenario.winCondition.populationMin < 0)
    errors.push("A valid win condition is required");
}

function hasValidDimensions(scenario: ScenarioDefinition): boolean {
  return (
    Number.isInteger(scenario.mapWidth) &&
    scenario.mapWidth > 0 &&
    Number.isInteger(scenario.mapHeight) &&
    scenario.mapHeight > 0
  );
}

function hasValidStartingConditions(scenario: ScenarioDefinition): boolean {
  return (
    scenario.startingMoney >= 0 &&
    scenario.startingPopulation >= 0 &&
    scenario.startingHappiness >= 0 &&
    scenario.startingHappiness <= 100
  );
}

function validateObjectives(objectives: ScenarioObjective[], errors: string[]): void {
  const ids = new Set<string>();
  objectives.forEach((objective) => {
    if (ids.has(objective.id)) errors.push("Objective ids must be unique");
    ids.add(objective.id);
    if (objective.value < 0) errors.push(`Objective ${objective.id} has invalid value`);
    if (objective.buildingId && !getBuildingById(objective.buildingId))
      errors.push(`Unknown building ${objective.buildingId}`);
  });
}

export function exportScenario(scenario: ScenarioDefinition): string {
  const errors = validateScenario(scenario);
  if (errors.length > 0) throw new Error(errors.join("; "));
  return JSON.stringify(scenario);
}

export function importScenario(serialized: string): ScenarioDefinition {
  const scenario = JSON.parse(serialized) as ScenarioDefinition;
  const errors = validateScenario(scenario);
  if (errors.length > 0) throw new Error(errors.join("; "));
  return scenario;
}
