import type { BuildingDefinition } from "../shared/types";

export interface ContentPack {
  id: string;
  name: string;
  buildings: BuildingDefinition[];
}

export function validateContentPack(
  pack: ContentPack,
  existing: BuildingDefinition[],
): string[] {
  const ids = new Set(existing.map((building) => building.id));
  if (!pack.id || !pack.name) return ["Pack id and name are required"];
  return pack.buildings.flatMap((building) => {
    if (ids.has(building.id)) return [`Duplicate building id ${building.id}`];
    ids.add(building.id);
    return [];
  });
}

export function loadContentPack(
  pack: ContentPack,
  existing: BuildingDefinition[],
): BuildingDefinition[] {
  const errors = validateContentPack(pack, existing);
  if (errors.length > 0) throw new Error(errors.join("; "));
  return [...existing, ...pack.buildings];
}
