import type { Milestone } from "../../shared/types";

export const MILESTONES: Milestone[] = [
  {
    population: 0,
    name: "Settlement Site",
    unlocks: ["dirt_road", "residential_zoning", "city_hall"],
    bonus: 0,
  },
  { population: 50, name: "Hamlet", unlocks: ["commercial_zoning"], bonus: 2000 },
  {
    population: 100,
    name: "Village",
    unlocks: ["industrial_zoning", "landfill"],
    bonus: 3000,
  },
  { population: 250, name: "Small Town", unlocks: ["park", "clinic"], bonus: 5000 },
  { population: 500, name: "Growing Town", unlocks: ["school"], bonus: 7500 },
  { population: 750, name: "Local Center", unlocks: [], bonus: 10000 },
  { population: 1000, name: "First City", unlocks: [], bonus: 0 },
];
