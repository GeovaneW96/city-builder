import type { BuildingDefinition } from "../shared/types";
import { validateContentPack } from "./content-packs";

export interface GameMod {
  id: string;
  buildings?: BuildingDefinition[];
  balance?: Record<string, number>;
  scenarios?: { id: string }[];
}

export function validateMod(
  mod: GameMod,
  existingBuildings: BuildingDefinition[],
): string[] {
  if (!mod.id) return ["Mod id is required"];
  const errors = mod.buildings
    ? validateContentPack(
        { id: mod.id, name: mod.id, buildings: mod.buildings },
        existingBuildings,
      )
    : [];
  if (mod.balance && Object.values(mod.balance).some((value) => !Number.isFinite(value)))
    errors.push("Balance values must be finite numbers");
  if (mod.scenarios && mod.scenarios.some((scenario) => !scenario.id))
    errors.push("Scenarios require ids");
  return errors;
}

export function parseMod(
  serialized: string,
  existingBuildings: BuildingDefinition[],
): GameMod {
  const mod = JSON.parse(serialized) as GameMod;
  const errors = validateMod(mod, existingBuildings);
  if (errors.length > 0) throw new Error(errors.join("; "));
  return mod;
}
