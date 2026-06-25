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

export interface CityAssetSource {
  createBuildingInstance(
    category: GeneratedBuildingCategory,
    seed: number,
  ): GeneratedAssetInstance | null;
  createAssetInstance(id: string): GeneratedAssetInstance | null;
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
    child.castShadow = shouldCastGeneratedAssetShadow(asset, child);
    child.receiveShadow = true;
    child.frustumCulled = true;
  });
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
