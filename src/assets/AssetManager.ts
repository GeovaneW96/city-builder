import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import {
  CITY_ASSET_REGISTRY,
  getAssetById,
  getBuildingAssets,
  type GeneratedBuildingCategory,
  type GeneratedCityAsset,
} from "./CityAssetRegistry";

export interface AssetPreloadResult {
  loaded: readonly string[];
  failed: readonly AssetLoadFailure[];
}

export interface AssetLoadFailure {
  id: string;
  error: Error;
}

export interface GeneratedAssetInstance {
  id: string;
  object: THREE.Object3D;
}

export interface GeneratedAssetPlacement {
  position: readonly [number, number, number];
  rotation?: number;
  scale?: number;
}

export interface CityAssetSource {
  createBuildingInstance(
    category: GeneratedBuildingCategory,
    seed: number,
  ): GeneratedAssetInstance | null;
  createAssetInstance(id: string): GeneratedAssetInstance | null;
  createInstancedAssetGroup?(
    id: string,
    placements: readonly GeneratedAssetPlacement[],
  ): GeneratedAssetInstance | null;
}

export class CityAssetManager implements CityAssetSource {
  private readonly loader = new GLTFLoader();
  private readonly scenes = new Map<string, THREE.Group>();
  private readonly failures = new Map<string, Error>();

  async preloadAll(): Promise<AssetPreloadResult> {
    return this.preload(CITY_ASSET_REGISTRY);
  }

  async preload(assets: readonly GeneratedCityAsset[]): Promise<AssetPreloadResult> {
    const results = await Promise.all(assets.map((asset) => this.loadAsset(asset)));
    return {
      loaded: results.filter((result): result is string => typeof result === "string"),
      failed: results.filter(
        (result): result is AssetLoadFailure => typeof result !== "string",
      ),
    };
  }

  createBuildingInstance(
    category: GeneratedBuildingCategory,
    seed: number,
  ): GeneratedAssetInstance | null {
    const options = getBuildingAssets(category);
    if (options.length === 0) return null;
    const index = Math.abs(seed) % options.length;
    const asset = options[index];
    return asset ? this.createInstance(asset) : null;
  }

  createAssetInstance(id: string): GeneratedAssetInstance | null {
    const asset = getAssetById(id);
    return asset ? this.createInstance(asset) : null;
  }

  createInstancedAssetGroup(
    id: string,
    placements: readonly GeneratedAssetPlacement[],
  ): GeneratedAssetInstance | null {
    const asset = getAssetById(id);
    if (!asset || placements.length === 0) return null;
    const scene = this.scenes.get(asset.id);
    if (!scene) return null;
    const object = createInstancedAssetObject(scene, asset, placements);
    return object ? { id: asset.id, object } : null;
  }

  getFailure(id: string): Error | undefined {
    return this.failures.get(id);
  }

  private async loadAsset(asset: GeneratedCityAsset): Promise<string | AssetLoadFailure> {
    if (this.scenes.has(asset.id)) return asset.id;
    try {
      const gltf = await this.loader.loadAsync(asset.path);
      this.scenes.set(asset.id, gltf.scene);
      return asset.id;
    } catch (cause) {
      const error = toError(cause, asset.path);
      this.failures.set(asset.id, error);
      return { id: asset.id, error };
    }
  }

  private createInstance(asset: GeneratedCityAsset): GeneratedAssetInstance | null {
    const scene = this.scenes.get(asset.id);
    if (!scene) return null;
    const object = clone(scene);
    configureRenderableObject(object, asset);
    return { id: asset.id, object };
  }
}

export function configureRenderableObject(
  object: THREE.Object3D,
  asset: GeneratedCityAsset,
): void {
  object.userData.generatedAssetInstance = true;
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    configureRenderableMesh(child, asset);
  });
}

export function createInstancedAssetObject(
  source: THREE.Object3D,
  asset: GeneratedCityAsset,
  placements: readonly GeneratedAssetPlacement[],
): THREE.Group | null {
  source.updateMatrixWorld(true);
  const meshes = getStaticMeshes(source);
  if (meshes.length === 0) return null;

  const group = new THREE.Group();
  group.name = `asset-batch:${asset.id}`;
  group.userData.generatedAssetInstance = true;
  meshes.forEach((mesh, meshIndex) => {
    group.add(createInstancedMeshBatch(mesh, asset, placements, meshIndex));
  });
  return group;
}

function getStaticMeshes(source: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  source.traverse((child) => {
    if (child instanceof THREE.Mesh && !(child instanceof THREE.SkinnedMesh)) {
      meshes.push(child);
    }
  });
  return meshes;
}

function createInstancedMeshBatch(
  source: THREE.Mesh,
  asset: GeneratedCityAsset,
  placements: readonly GeneratedAssetPlacement[],
  meshIndex: number,
): THREE.InstancedMesh {
  const batch = new THREE.InstancedMesh(
    source.geometry,
    source.material,
    placements.length,
  );
  batch.name = `${asset.id}:${source.name || `mesh_${meshIndex}`}:batch`;
  batch.userData.generatedAssetInstance = true;
  batch.matrixAutoUpdate = false;
  configureRenderableMesh(batch, asset);
  setInstancedAssetMatrices(batch, source.matrixWorld, placements);
  return batch;
}

function setInstancedAssetMatrices(
  batch: THREE.InstancedMesh,
  sourceMatrix: THREE.Matrix4,
  placements: readonly GeneratedAssetPlacement[],
): void {
  const placementMatrix = new THREE.Matrix4();
  const instanceMatrix = new THREE.Matrix4();
  placements.forEach((placement, index) => {
    setPlacementMatrix(placementMatrix, placement);
    instanceMatrix.multiplyMatrices(placementMatrix, sourceMatrix);
    batch.setMatrixAt(index, instanceMatrix);
  });
  batch.instanceMatrix.needsUpdate = true;
  batch.computeBoundingBox();
  batch.computeBoundingSphere();
}

function setPlacementMatrix(
  matrix: THREE.Matrix4,
  placement: GeneratedAssetPlacement,
): void {
  const position = new THREE.Vector3(...placement.position);
  const rotation = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, placement.rotation ?? 0, 0),
  );
  const scale = new THREE.Vector3().setScalar(placement.scale ?? 1);
  matrix.compose(position, rotation, scale);
}

function configureRenderableMesh(mesh: THREE.Mesh, asset: GeneratedCityAsset): void {
  mesh.castShadow = shouldCastGeneratedAssetShadow(asset, mesh);
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
}

function shouldCastGeneratedAssetShadow(
  asset: GeneratedCityAsset,
  mesh: THREE.Mesh,
): boolean {
  void mesh;
  if (asset.id === "tree_mature_oak") return false;
  return true;
}

function toError(cause: unknown, path: string): Error {
  if (cause instanceof Error) return cause;
  return new Error(`Could not load generated asset ${path}`);
}
