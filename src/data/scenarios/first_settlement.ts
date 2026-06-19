import type { ZoneType } from "../../shared/types";

export interface ObjectiveStep {
  id: string;
  label: string;
  condition:
    | "place_road"
    | "paint_zone"
    | "reach_population"
    | "build_building"
    | "maintain_money";
  target?: number;
  zoneType?: ZoneType;
  buildingId?: string;
}

export const FIRST_SETTLEMENT = {
  id: "first_settlement",
  name: "First Settlement",
  description: "Reach 1,000 population without going bankrupt.",
  startingMoney: 50000,
  mapSize: 64,
  winCondition: {
    populationMin: 1000,
    moneyMin: 0,
    happinessMin: 50,
  },
  lossCondition: {
    monthsBelowZeroMax: 5,
  },
  initialUnlocks: ["dirt_road", "residential_zoning", "city_hall"],
  objectives: [
    { id: "obj_01", label: "Place a road", condition: "place_road" as const },
    {
      id: "obj_02",
      label: "Zone residential",
      condition: "paint_zone" as const,
      zoneType: "residential" as const,
    },
    {
      id: "obj_03",
      label: "Reach 50 population",
      condition: "reach_population" as const,
      target: 50,
    },
    {
      id: "obj_04",
      label: "Zone commercial",
      condition: "paint_zone" as const,
      zoneType: "commercial" as const,
    },
    {
      id: "obj_05",
      label: "Reach 100 population",
      condition: "reach_population" as const,
      target: 100,
    },
    {
      id: "obj_06",
      label: "Zone industrial",
      condition: "paint_zone" as const,
      zoneType: "industrial" as const,
    },
    {
      id: "obj_07",
      label: "Reach 250 population",
      condition: "reach_population" as const,
      target: 250,
    },
    {
      id: "obj_08",
      label: "Build a park",
      condition: "build_building" as const,
      buildingId: "park",
    },
    {
      id: "obj_09",
      label: "Reach 500 population",
      condition: "reach_population" as const,
      target: 500,
    },
    {
      id: "obj_10",
      label: "Build a clinic",
      condition: "build_building" as const,
      buildingId: "clinic",
    },
    {
      id: "obj_11",
      label: "Reach 750 population",
      condition: "reach_population" as const,
      target: 750,
    },
    {
      id: "obj_12",
      label: "Build a school",
      condition: "build_building" as const,
      buildingId: "school",
    },
    {
      id: "obj_13",
      label: "Reach 1,000 population",
      condition: "reach_population" as const,
      target: 1000,
    },
  ],
};
