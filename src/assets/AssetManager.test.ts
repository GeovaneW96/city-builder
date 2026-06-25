import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { configureRenderableObject } from "./AssetManager";
import type { GeneratedCityAsset } from "./CityAssetRegistry";

describe("generated asset render configuration", () => {
  it("keeps mature oak batches out of dynamic shadow casting", () => {
    const root = new THREE.Group();
    const bark = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    bark.name = "oak_bark_batch";
    const leaves = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    leaves.name = "oak_leaf_batch_mid_green";
    root.add(bark, leaves);

    configureRenderableObject(root, createAsset("tree_mature_oak"));

    expect(bark.castShadow).toBe(false);
    expect(leaves.castShadow).toBe(false);
    expect(leaves.receiveShadow).toBe(true);
    expect(leaves.frustumCulled).toBe(true);
  });

  it("keeps non-tree generated assets shadow casting by default", () => {
    const root = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    mesh.name = "bench_leaf_label_should_not_matter";
    root.add(mesh);

    configureRenderableObject(root, createAsset("bench"));

    expect(mesh.castShadow).toBe(true);
  });
});

function createAsset(id: string): GeneratedCityAsset {
  return {
    id,
    category: "nature",
    path: `/assets/generated/nature/${id}.glb`,
  };
}
