import type { AchievementDefinition } from "../../shared/types";

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "first_steps",
    name: "First Steps",
    description: "Reach 100 population.",
    reward: 1000,
  },
  {
    id: "happy_town",
    name: "Happy Town",
    description: "Reach 80 happiness.",
    reward: 2000,
  },
  {
    id: "road_builder",
    name: "Road Builder",
    description: "Build 100 roads.",
    reward: 1000,
  },
];
