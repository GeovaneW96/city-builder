import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { configureRenderableObject, createInstancedAssetObject } from "./AssetManager";
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

  it("batches static generated assets with shared geometry and materials", () => {
    const root = new THREE.Group();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x226644 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "oak_leaf_batch";
    mesh.position.set(0.2, 0.4, 0.1);
    root.add(mesh);

    const batch = createInstancedAssetObject(root, createAsset("tree_mature_oak"), [
      { position: [1, 0, 2], scale: 0.24 },
      { position: [3, 0, 4], rotation: Math.PI / 2, scale: 0.28 },
    ]);
    const instanced = batch?.children[0];

    expect(batch?.userData.generatedAssetInstance).toBe(true);
    expect(instanced).toBeInstanceOf(THREE.InstancedMesh);
    expect((instanced as THREE.InstancedMesh).count).toBe(2);
    expect((instanced as THREE.InstancedMesh).geometry).toBe(geometry);
    expect((instanced as THREE.InstancedMesh).material).toBe(material);
    expect((instanced as THREE.InstancedMesh).castShadow).toBe(false);
  });
});

function createAsset(id: string): GeneratedCityAsset {
  return {
    id,
    category: "nature",
    path: `/assets/generated/nature/${id}.glb`,
  };
}
