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
    "residential_house_detached",
    "residential_stucco_cottage_reference",
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
    "residential_midriser_brick",
    "residential_terrace_wide",
    "residential_tower_wide",
    "residential_small_apt",
    "residential_balcony_tower",
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
    "commercial_bank",
    "commercial_retail_row",
    "commercial_glass_low",
    "commercial_tower_narrow",
    "commercial_plaza_building",
  ]),
  ...createBuildingAssets("industrial", [
    "industrial_small_warehouse",
    "industrial_long_warehouse",
    "industrial_sawtooth_factory",
    "industrial_logistics_depot",
    "industrial_processing_plant",
    "industrial_workshop",
    "industrial_factory_large",
    "industrial_storage_yard",
    "water_tower",
  ]),
  ...createBuildingAssets("civic", [
    "civic_clinic",
    "civic_fire_station",
    "civic_school",
    "civic_library",
    "civic_city_hall",
    "civic_police_station",
    "civic_post_office",
    "civic_community_center",
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
    "construction_highrise_shell",
    "construction_house_frame",
  ]),
  ...createAssets("vehicles", ["car_compact", "car_sedan", "bus_city", "truck_delivery"]),
  ...createAssets("nature", [
    "tree_mature_oak",
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
