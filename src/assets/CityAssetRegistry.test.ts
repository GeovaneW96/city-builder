import { describe, expect, it } from "vitest";
import {
  CITY_ASSET_REGISTRY,
  getAssetById,
  getBuildingAssets,
} from "./CityAssetRegistry";

describe("generated city asset registry", () => {
  it("registers the required building library by render category", () => {
    expect(getBuildingAssets("residential")).toHaveLength(15);
    expect(getBuildingAssets("commercial")).toHaveLength(15);
    expect(getBuildingAssets("industrial")).toHaveLength(8);
    expect(getBuildingAssets("civic")).toHaveLength(8);
  });

  it("points every entry to the generated public asset directory", () => {
    expect(CITY_ASSET_REGISTRY).toHaveLength(70);
    expect(getAssetById("road_4_way_intersection")?.path).toBe(
      "/assets/generated/roads/road_4_way_intersection.glb",
    );
    expect(getAssetById("tree_conifer")?.path).toBe(
      "/assets/generated/nature/tree_conifer.glb",
    );
  });
});
