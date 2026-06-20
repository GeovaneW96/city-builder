import { describe, expect, it } from "vitest";
import { ALL_BUILDINGS } from "./buildings";
import { loadContentPack, validateContentPack } from "./content-packs";

describe("content packs", () => {
  it("loads unique building definitions and rejects conflicts", () => {
    const pack = {
      id: "test",
      name: "Test",
      buildings: [{ ...ALL_BUILDINGS[0]!, id: "pack_house" }],
    };
    expect(loadContentPack(pack, ALL_BUILDINGS)).toHaveLength(ALL_BUILDINGS.length + 1);
    expect(
      validateContentPack(
        { ...pack, buildings: [{ ...pack.buildings[0]!, id: "small_house" }] },
        ALL_BUILDINGS,
      ),
    ).toHaveLength(1);
  });
});
