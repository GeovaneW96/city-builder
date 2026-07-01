import * as THREE from "three";
import type { CityAssetSource, GeneratedAssetPlacement } from "../../assets/AssetManager";

export const GENERATED_OAK_RENDER_SCALE = 0.24;

export interface GeneratedAssetBatcher {
  add(id: string, placement: GeneratedAssetPlacement): void;
  flush(): void;
}

export function addGeneratedAsset(
  group: THREE.Group,
  assetSource: CityAssetSource,
  id: string,
  placement: GeneratedAssetPlacement,
): void {
  const asset = assetSource.createAssetInstance(id);
  if (!asset) return;
  asset.object.position.set(...placement.position);
  asset.object.rotation.y = placement.rotation ?? 0;
  asset.object.scale.setScalar(placement.scale ?? 1);
  asset.object.name = `asset:${asset.id}`;
  group.add(asset.object);
}

export function addGeneratedAssetBatch(
  group: THREE.Group,
  assetSource: CityAssetSource,
  id: string,
  placements: readonly GeneratedAssetPlacement[],
): void {
  if (placements.length === 0) return;
  const batch = assetSource.createInstancedAssetGroup?.(id, placements);
  if (batch) {
    batch.object.name = `asset-batch:${batch.id}`;
    group.add(batch.object);
    return;
  }
  placements.forEach((placement) => addGeneratedAsset(group, assetSource, id, placement));
}

export function createGeneratedAssetBatcher(
  group: THREE.Group,
  assetSource: CityAssetSource,
): GeneratedAssetBatcher {
  const placementsByAsset = new Map<string, GeneratedAssetPlacement[]>();
  return {
    add(id, placement) {
      const placements = placementsByAsset.get(id) ?? [];
      placements.push(placement);
      placementsByAsset.set(id, placements);
    },
    flush() {
      placementsByAsset.forEach((placements, id) => {
        addGeneratedAssetBatch(group, assetSource, id, placements);
      });
      placementsByAsset.clear();
    },
  };
}
