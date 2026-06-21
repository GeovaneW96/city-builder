export type GeneratedBuildingCategory =
  | "residential"
  | "commercial"
  | "industrial"
  | "civic";

export type GeneratedAssetCategory =
  | GeneratedBuildingCategory
  | "roads"
  | "props"
  | "vehicles"
  | "nature";

export interface GeneratedCityAsset {
  id: string;
  category: GeneratedAssetCategory;
  path: string;
  footprint?: readonly [number, number];
}

const ASSET_ROOT = "/assets/generated";

function createBuildingAssets(
  category: GeneratedBuildingCategory,
  ids: readonly string[],
): GeneratedCityAsset[] {
  return ids.map((id) => ({
    id,
    category,
    path: `${ASSET_ROOT}/buildings/${category}/${id}.glb`,
  }));
}

function createAssets(
  category: Exclude<GeneratedAssetCategory, GeneratedBuildingCategory>,
  ids: readonly string[],
): GeneratedCityAsset[] {
  return ids.map((id) => ({
    id,
    category,
    path: `${ASSET_ROOT}/${category}/${id}.glb`,
  }));
}

export const CITY_ASSET_REGISTRY: readonly GeneratedCityAsset[] = [
  ...createBuildingAssets("residential", [
    "residential_rowhouse_brick",
    "residential_rowhouse_stucco",
    "residential_cottage_corner",
    "residential_duplex",
    "residential_townhouse",
    "residential_walkup_3",
    "residential_walkup_5",
    "residential_apartment_balcony",
    "residential_courtyard",
    "residential_tower_slim",
  ]),
  ...createBuildingAssets("commercial", [
    "commercial_corner_shop",
    "commercial_market",
    "commercial_cafe",
    "commercial_office_lowrise",
    "commercial_office_midrise",
    "commercial_glass_tower",
    "commercial_stepped_tower",
    "commercial_hotel",
    "commercial_mall",
    "commercial_office_slab",
  ]),
  ...createBuildingAssets("industrial", [
    "industrial_small_warehouse",
    "industrial_long_warehouse",
    "industrial_sawtooth_factory",
    "industrial_logistics_depot",
    "industrial_processing_plant",
  ]),
  ...createBuildingAssets("civic", [
    "civic_clinic",
    "civic_fire_station",
    "civic_school",
    "civic_library",
    "civic_city_hall",
  ]),
  ...createAssets("roads", [
    "road_2_lane_straight",
    "road_4_lane_straight",
    "road_4_way_intersection",
    "road_t_intersection",
    "road_with_sidewalks",
  ]),
  ...createAssets("props", [
    "streetlight",
    "traffic_light",
    "bench",
    "trash_bin",
    "bus_stop",
    "billboard",
    "road_sign",
    "plaza_planter",
    "rooftop_hvac",
  ]),
  ...createAssets("vehicles", ["car_compact", "car_sedan", "bus_city", "truck_delivery"]),
  ...createAssets("nature", [
    "tree_oak",
    "tree_maple",
    "tree_conifer",
    "bush_cluster",
    "rock_cluster",
    "park_lamp",
  ]),
];

export function getAssetById(id: string): GeneratedCityAsset | undefined {
  return CITY_ASSET_REGISTRY.find((asset) => asset.id === id);
}

export function getAssetsByCategory(
  category: GeneratedAssetCategory,
): readonly GeneratedCityAsset[] {
  return CITY_ASSET_REGISTRY.filter((asset) => asset.category === category);
}

export function getBuildingAssets(
  category: GeneratedBuildingCategory,
): readonly GeneratedCityAsset[] {
  return getAssetsByCategory(category);
}
