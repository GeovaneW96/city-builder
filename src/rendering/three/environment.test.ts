import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import type { CityAssetSource } from "../../assets/AssetManager";
import { createInitialCityState } from "../../simulation/state";
import { renderTerrain } from "./environment";

describe("terrain rendering", () => {
  it("does not use road adjacency to place generated trees", () => {
    const state = createInitialCityState();
    state.map.flat().forEach((tile) => {
      tile.terrain = "blocked";
      tile.roadId = null;
      tile.zone = null;
      tile.buildingId = null;
    });
    state.map[12]![13]!.terrain = "grass";
    state.map[13]![13]!.terrain = "grass";
    state.map[13]![13]!.roadId = "road:13,13";
    state.roads.push({
      id: "road:13,13",
      type: "local",
      position: [13, 13],
      connections: { north: false, east: true, south: false, west: true },
    });
    const createInstancedAssetGroup = vi.fn((id: string) => ({
      id,
      object: new THREE.Group(),
    }));
    const source: CityAssetSource = {
      createBuildingInstance: vi.fn(),
      createAssetInstance: vi.fn(),
      createInstancedAssetGroup,
    };

    renderTerrain(new THREE.Group(), state, [], source, 1);

    expect(createInstancedAssetGroup).not.toHaveBeenCalledWith(
      "tree_mature_oak",
      expect.any(Array),
    );
  });
});
