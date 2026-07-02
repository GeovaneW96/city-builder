import { describe, expect, it } from "vitest";
import {
  CITY_ASSET_REGISTRY,
  getAssetById,
  getBuildingAssets,
} from "./CityAssetRegistry";

describe("generated city asset registry", () => {
  it("registers the required building library by render category", () => {
    expect(getBuildingAssets("residential")).toHaveLength(17);
    expect(getBuildingAssets("commercial")).toHaveLength(15);
    expect(getBuildingAssets("industrial")).toHaveLength(9);
    expect(getBuildingAssets("civic")).toHaveLength(8);
  });

  it("points every entry to the generated public asset directory", () => {
    expect(CITY_ASSET_REGISTRY).toHaveLength(73);
    expect(getAssetById("residential_stucco_cottage_reference")?.path).toBe(
      "/assets/generated/buildings/residential/residential_stucco_cottage_reference.glb",
    );
    expect(getAssetById("road_4_way_intersection")?.path).toBe(
      "/assets/generated/roads/road_4_way_intersection.glb",
    );
    expect(getAssetById("tree_mature_oak")?.path).toBe(
      "/assets/generated/nature/tree_mature_oak.glb",
    );
    expect(getAssetById("water_tower")?.path).toBe(
      "/assets/generated/buildings/industrial/water_tower.glb",
    );
    expect(getAssetById("construction_highrise_shell")?.path).toBe(
      "/assets/generated/props/construction_highrise_shell.glb",
    );
    expect(getAssetById("construction_house_frame")?.path).toBe(
      "/assets/generated/props/construction_house_frame.glb",
    );
  });
});
