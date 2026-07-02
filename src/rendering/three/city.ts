import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { CityAssetSource } from "../../assets/AssetManager";
import type { GeneratedBuildingCategory } from "../../assets/CityAssetRegistry";
import type {
  BuildingCategory,
  BuildingDefinition,
  CityState,
  UIState,
  ZoneType,
} from "../../shared/types";
import { animateWater, renderTerrain, type AnimatedWaterMaterial } from "./environment";
import {
  createGeneratedAssetBatcher,
  GENERATED_OAK_RENDER_SCALE,
  type GeneratedAssetBatcher,
} from "./generated-assets";
import {
  getTiledTexture,
  getConcreteTexture,
  getBrickTexture,
  getAsphaltTexture,
  getFacadePanelTexture,
  getMetalTexture,
  getRoofTexture,
} from "./textures";

const TILE_SIZE = 1;
const RADIUS_OVERLAY_SEGMENTS = 96;
const DEFAULT_CONSTRUCTION_BUILDING_ASSET_ID = "construction_highrise_shell";
const RESIDENTIAL_CONSTRUCTION_BUILDING_ASSET_ID = "construction_house_frame";

const COLORS = {
  road: 0x20282e,
  sidewalk: 0x3a444a,
  laneMarking: 0xccccb0,
  residential: 0x4caf50,
  commercial: 0x42a5f5,
  industrial: 0xffb547,
  civic: 0xf1f3f4,
  utility: 0x9aa0a6,
  service: 0x8e6ad8,
  decoration: 0x43a047,
  warning: 0xffd54f,
  invalid: 0xef5350,
  preview: 0xe8f5e9,
  pollution: 0xd95f43,
  health: 0x26a69a,
  education: 0x5c6bc0,
  police: 0x4f7cff,
  fire: 0xff7043,
  garbage: 0x7cb342,
  powerFeedback: 0xffd54f,
  waterFeedback: 0x29b6f6,
  unemploymentFeedback: 0xffa726,
  district: 0x5bc0eb,
};

export interface CityRenderLayers {
  terrain: THREE.Group;
  roads: THREE.Group;
  zones: THREE.Group;
  buildings: THREE.Group;
  overlays: THREE.Group;
  warnings: THREE.Group;
  preview: THREE.Group;
  waterMaterials: AnimatedWaterMaterial[];
}

export type CityRenderLayerName =
  | "terrain"
  | "roads"
  | "zones"
  | "buildings"
  | "overlays"
  | "warnings";

type RadiusEffect =
  | "healthRadius"
  | "educationRadius"
  | "policeRadius"
  | "fireRadius"
  | "garbageCollectionRadius";

export interface BuildingRenderInfo {
  size: BuildingDefinition["size"];
  category: BuildingCategory;
  effects: Pick<BuildingDefinition["effects"], RadiusEffect | "populationCapacity">;
}

export interface CityRenderOptions {
  assetSource?: CityAssetSource;
  detailDensity?: number;
  refreshTerrain?: boolean;
  dirtyLayers?: readonly CityRenderLayerName[];
  selectedTile?: UIState["selectedTile"];
}

export type BuildingRenderInfoLookup = (
  definitionId: string,
) => BuildingRenderInfo | null;

interface CivicFacadeMeshes {
  entrance: THREE.InstancedMesh;
  windows: THREE.InstancedMesh;
  canopy: THREE.InstancedMesh;
}

interface CivicFacadeLayout {
  buildings: CityState["buildings"];
  width: number;
  depth: number;
  height: number;
}

interface DecorativeCar {
  x: number;
  z: number;
  rotation: number;
  color: number;
}

interface GeneratedBuildingSelection {
  category: GeneratedBuildingCategory;
  seed: number;
}

interface BuildingFeedbackMarker {
  type: "no-power" | "no-water" | "unemployment";
  building: CityState["buildings"][number];
  offsetIndex: number;
}

type StreetAxis = "horizontal" | "vertical";
type RoadType = CityState["roads"][number]["type"];

const STREET_AXES: StreetAxis[] = ["horizontal", "vertical"];
const ROAD_TYPES: RoadType[] = ["dirt", "local", "collector", "arterial", "paved"];
type BuildingVariantRanges = Record<string, [number, number]> & {
  default: [number, number];
};
const BUILDING_VARIANT_RANGES: Record<GeneratedBuildingCategory, BuildingVariantRanges> =
  {
    residential: {
      default: [0, 6],
      medium_house: [2, 7],
      high_apartment: [5, 10],
      residential_midriser_brick: [0, 5],
      residential_terrace_wide: [0, 5],
      residential_tower_wide: [8, 15],
      residential_small_apt: [0, 4],
      residential_balcony_tower: [6, 15],
    },
    commercial: {
      default: [0, 4],
      medium_shop: [1, 6],
      large_store: [3, 9],
      small_office: [4, 10],
      large_office: [4, 10],
      commercial_bank: [0, 4],
      commercial_retail_row: [0, 4],
      commercial_glass_low: [2, 6],
      commercial_tower_narrow: [8, 15],
      commercial_plaza_building: [3, 8],
    },
    industrial: {
      default: [0, 4],
      medium_factory: [1, 5],
      large_plant: [2, 5],
      industrial_workshop: [0, 4],
      industrial_factory_large: [2, 8],
      industrial_storage_yard: [0, 4],
      water_tower: [8, 9],
    },
    civic: { default: [0, 8] },
  };

interface StreetRun {
  axis: StreetAxis;
  x: number;
  y: number;
  length: number;
  roadType: CityState["roads"][number]["type"];
}

interface FacadeParams {
  group: THREE.Group;
  buildings: CityState["buildings"];
  width: number;
  depth: number;
  height: number;
  front: boolean;
  category: BuildingCategory;
  isTower: boolean;
}

export function createCityRenderLayers(scene: THREE.Scene): CityRenderLayers {
  const layers = {
    terrain: new THREE.Group(),
    roads: new THREE.Group(),
    zones: new THREE.Group(),
    buildings: new THREE.Group(),
    overlays: new THREE.Group(),
    warnings: new THREE.Group(),
    preview: new THREE.Group(),
    waterMaterials: [] as AnimatedWaterMaterial[],
  };
  [
    layers.terrain,
    layers.roads,
    layers.zones,
    layers.buildings,
    layers.overlays,
    layers.warnings,
    layers.preview,
  ].forEach((layer) => scene.add(layer));
  return layers;
}

export function syncCityRenderLayers(
  layers: CityRenderLayers,
  state: CityState,
  activeOverlay: UIState["activeOverlay"],
  getBuildingRenderInfo: BuildingRenderInfoLookup,
  options: CityRenderOptions = {},
): void {
  const detailDensity = options.detailDensity ?? 1;
  const dirtyLayers = getDirtyLayerSet(options.dirtyLayers);
  syncTerrainRenderLayer(layers, state, options, detailDensity, dirtyLayers);
  syncStaticRenderLayer(dirtyLayers, "zones", layers.zones, () =>
    renderZones(layers.zones, state),
  );
  syncStaticRenderLayer(dirtyLayers, "roads", layers.roads, () =>
    renderRoads(layers.roads, state, options.assetSource, detailDensity),
  );
  syncStaticRenderLayer(dirtyLayers, "buildings", layers.buildings, () =>
    renderBuildings(layers.buildings, state, getBuildingRenderInfo, options.assetSource),
  );
  syncStaticRenderLayer(dirtyLayers, "overlays", layers.overlays, () =>
    renderOverlay(
      layers.overlays,
      state,
      activeOverlay,
      getBuildingRenderInfo,
      options.selectedTile ?? null,
    ),
  );
  syncStaticRenderLayer(dirtyLayers, "warnings", layers.warnings, () =>
    renderWarnings(layers.warnings, state, getBuildingRenderInfo),
  );
}

export function animateCityRenderLayers(
  layers: CityRenderLayers,
  elapsedSeconds: number,
): void {
  animateWater(layers.waterMaterials, elapsedSeconds);
}

function getDirtyLayerSet(
  dirtyLayers: readonly CityRenderLayerName[] | undefined,
): ReadonlySet<CityRenderLayerName> {
  return new Set(
    dirtyLayers ?? ["terrain", "roads", "zones", "buildings", "overlays", "warnings"],
  );
}

function syncTerrainRenderLayer(
  layers: CityRenderLayers,
  state: CityState,
  options: CityRenderOptions,
  detailDensity: number,
  dirtyLayers: ReadonlySet<CityRenderLayerName>,
): void {
  if (!dirtyLayers.has("terrain") || !(options.refreshTerrain ?? true)) return;
  clearGroup(layers.terrain);
  layers.waterMaterials = [];
  renderTerrain(
    layers.terrain,
    state,
    layers.waterMaterials,
    options.assetSource,
    detailDensity,
  );
}

function syncStaticRenderLayer(
  dirtyLayers: ReadonlySet<CityRenderLayerName>,
  layerName: CityRenderLayerName,
  layer: THREE.Group,
  render: () => void,
): void {
  if (!dirtyLayers.has(layerName)) return;
  clearGroup(layer);
  render();
}

export function syncPlacementPreview(
  layer: THREE.Group,
  preview: UIState["placementPreview"],
  getBuildingRenderInfo?: BuildingRenderInfoLookup,
  assetSource?: CityAssetSource,
): void {
  clearGroup(layer);
  if (!preview) return;
  const color = preview.valid ? COLORS.preview : COLORS.invalid;
  preview.positions.forEach(([x, y]) => {
    const mesh = createPlane(color, 0.42, 0.045);
    mesh.position.set(x + 0.5, 0.045, y + 0.5);
    layer.add(mesh);
  });
  if (preview.definitionId && getBuildingRenderInfo) {
    addPlacementRadiusPreview(layer, preview, getBuildingRenderInfo);
  }
  if (preview.definitionId && getBuildingRenderInfo && assetSource) {
    addGeneratedPlacementPreview(layer, preview, getBuildingRenderInfo, assetSource);
  }
}

function addPlacementRadiusPreview(
  layer: THREE.Group,
  preview: NonNullable<UIState["placementPreview"]>,
  getBuildingRenderInfo: BuildingRenderInfoLookup,
): void {
  if (!preview.definitionId) return;
  const renderInfo = getBuildingRenderInfo(preview.definitionId);
  const origin = getPreviewOrigin(preview.positions);
  if (!renderInfo || !origin) return;
  addRadiusVisuals(layer, {
    origin,
    renderInfo,
    opacity: preview.valid ? 0.16 : 0.1,
    y: 0.07,
    namePrefix: "radius-preview",
  });
}

function addGeneratedPlacementPreview(
  layer: THREE.Group,
  preview: NonNullable<UIState["placementPreview"]>,
  getBuildingRenderInfo: BuildingRenderInfoLookup,
  assetSource: CityAssetSource,
): void {
  if (!preview.definitionId) return;
  const renderInfo = getBuildingRenderInfo(preview.definitionId);
  if (!renderInfo) return;
  const selection = getGeneratedBuildingSelection(renderInfo, preview.definitionId, 0);
  if (!selection) return;
  const asset = assetSource.createBuildingInstance(selection.category, selection.seed);
  const origin = getPreviewOrigin(preview.positions);
  if (!asset || !origin) return;
  placeGeneratedBuilding(
    asset.object,
    {
      id: `preview:${preview.definitionId}`,
      definitionId: preview.definitionId,
      position: origin,
      rotation: 0,
      status: "active",
      warnings: [],
      createdAtTick: 0,
      lockedUntilTick: 0,
      unresolvedWarningTicks: 0,
      upgradeTier: 1,
      lastUpgradeTick: 0,
    },
    renderInfo.size,
  );
  asset.object.name = `preview:${preview.definitionId}`;
  layer.add(asset.object);
}

function getPreviewOrigin(
  positions: readonly [number, number][],
): [number, number] | null {
  if (positions.length === 0) return null;
  const minX = Math.min(...positions.map(([x]) => x));
  const minY = Math.min(...positions.map(([, y]) => y));
  return [minX, minY];
}

function renderRoads(
  group: THREE.Group,
  state: CityState,
  assetSource?: CityAssetSource,
  detailDensity = 1,
): void {
  if (state.roads.length === 0) return;
  if (assetSource) {
    renderGeneratedRoads(group, state, assetSource, detailDensity);
    return;
  }
  const streetRuns = getStreetRuns(state.roads);
  group.add(createStreetCorridors(streetRuns));
  addContinuousLaneMarkings(group, streetRuns);
  addIntersectionDetails(group, state.roads);
  addStreetLights(group, state.roads);
  addDecorativeTraffic(group, state.roads);
}

function renderGeneratedRoads(
  group: THREE.Group,
  state: CityState,
  assetSource: CityAssetSource,
  detailDensity: number,
): void {
  const assetBatcher = createGeneratedAssetBatcher(group, assetSource);
  const streetRuns = getStreetRuns(state.roads);
  group.add(createStreetCorridors(streetRuns));
  addContinuousLaneMarkings(group, streetRuns);
  addIntersectionDetails(group, state.roads);
  addGeneratedStreetlights(state.roads, assetBatcher, detailDensity);
  addGeneratedTrafficLights(state.roads, assetBatcher, detailDensity);
  addGeneratedTraffic(state.roads, assetBatcher, detailDensity);
  addGeneratedRoadProps(state.roads, assetBatcher, detailDensity);
  addGeneratedStreetFurniture(state.roads, assetBatcher, detailDensity);
  assetBatcher.flush();
}

function addGeneratedStreetlights(
  roads: CityState["roads"],
  assetBatcher: GeneratedAssetBatcher,
  detailDensity: number,
): void {
  roads
    .filter((road) => shouldPlaceRoadDetail(road, detailDensity, 9))
    .forEach((road) => {
      const [x, y] = road.position;
      const side = getVisualHash(x, y) % 2 === 0 ? -0.43 : 0.43;
      assetBatcher.add("streetlight", {
        position: [x + 0.5 + side, 0, y + 0.5],
        scale: 0.82,
      });
    });
}

function shouldPlaceRoadDetail(
  road: CityState["roads"][number],
  detailDensity: number,
  baseFrequency: number,
): boolean {
  if (road.type === "dirt" || getRoadConnectionCount(road) >= 3) return false;
  const frequency = Math.max(1, Math.round(baseFrequency / detailDensity));
  return getVisualHash(road.position[0], road.position[1]) % frequency === 0;
}

function addGeneratedTrafficLights(
  roads: CityState["roads"],
  assetBatcher: GeneratedAssetBatcher,
  detailDensity: number,
): void {
  if (detailDensity < 0.55) return;
  roads
    .filter((road) => getRoadConnectionCount(road) >= 3)
    .forEach((road) => {
      const [x, y] = road.position;
      (
        [
          [-0.36, -0.36],
          [0.36, 0.36],
        ] as const
      ).forEach(([offsetX, offsetY]) => {
        assetBatcher.add("traffic_light", {
          position: [x + 0.5 + offsetX, 0, y + 0.5 + offsetY],
          rotation: offsetX < 0 ? 0 : Math.PI,
          scale: 0.8,
        });
      });
    });
}

function addGeneratedTraffic(
  roads: CityState["roads"],
  assetBatcher: GeneratedAssetBatcher,
  detailDensity: number,
): void {
  if (detailDensity < 0.5) return;
  getDecorativeCars(roads).forEach((car, index) => {
    const id = index % 2 === 0 ? "car_compact" : "car_sedan";
    assetBatcher.add(id, {
      position: [car.x, 0, car.z],
      rotation: car.rotation,
      scale: 0.72,
    });
  });
}

function addGeneratedRoadProps(
  roads: CityState["roads"],
  assetBatcher: GeneratedAssetBatcher,
  detailDensity: number,
): void {
  if (detailDensity < 0.75) return;
  roads
    .filter((road) => shouldPlaceRoadDetail(road, detailDensity, 10))
    .forEach((road, index) => {
      const [x, y] = road.position;
      const assetId = index % 2 === 0 ? "road_sign" : "bus_stop";
      assetBatcher.add(assetId, {
        position: [x + 0.86, 0, y + 0.5],
        rotation: Math.PI / 2,
        scale: assetId === "bus_stop" ? 0.72 : 0.8,
      });
    });
}

function addGeneratedStreetFurniture(
  roads: CityState["roads"],
  assetBatcher: GeneratedAssetBatcher,
  detailDensity: number,
): void {
  if (detailDensity < 0.75) return;
  roads
    .filter((road) => shouldPlaceRoadDetail(road, detailDensity, 20))
    .forEach((road, index) => {
      const [x, y] = road.position;
      const side = getVisualHash(x, y) % 2 === 0 ? -0.6 : 0.6;
      if (index % 2 === 0) {
        assetBatcher.add("bench", {
          position: [x + 0.5 + side, 0, y + 0.5],
          rotation: side < 0 ? 0 : Math.PI,
          scale: 0.7,
        });
      } else {
        assetBatcher.add("trash_bin", {
          position: [x + 0.5 + side, 0, y + 0.5],
          scale: 0.75,
        });
      }
    });
}

function getStreetRuns(roads: CityState["roads"]): StreetRun[] {
  const index = new Map(
    roads.map((road) => [getRoadKey(road.position[0], road.position[1]), road]),
  );
  return STREET_AXES.flatMap((axis) =>
    roads
      .filter((road) => isStreetRunStart(road, axis, index))
      .map((road) => collectStreetRun(road, axis, index)),
  );
}

function isStreetRunStart(
  road: CityState["roads"][number],
  axis: StreetAxis,
  index: Map<string, CityState["roads"][number]>,
): boolean {
  if (!hasRoadDirection(road, axis)) return false;
  const [x, y] = road.position;
  const previous = index.get(
    getRoadKey(axis === "horizontal" ? x - 1 : x, axis === "vertical" ? y - 1 : y),
  );
  return !previous || previous.type !== road.type || !hasRoadDirection(previous, axis);
}

function collectStreetRun(
  start: CityState["roads"][number],
  axis: StreetAxis,
  index: Map<string, CityState["roads"][number]>,
): StreetRun {
  let length = 1;
  while (isSameStreetType(index, start, axis, length)) length += 1;
  return {
    axis,
    x: start.position[0],
    y: start.position[1],
    length,
    roadType: start.type,
  };
}

function isSameStreetType(
  index: Map<string, CityState["roads"][number]>,
  start: CityState["roads"][number],
  axis: StreetAxis,
  length: number,
): boolean {
  const [startX, startY] = start.position;
  const next = index.get(
    getRoadKey(
      axis === "horizontal" ? startX + length : startX,
      axis === "vertical" ? startY + length : startY,
    ),
  );
  return Boolean(next?.type === start.type && hasRoadDirection(next, axis));
}

function getRoadKey(x: number, y: number): string {
  return `${x},${y}`;
}

function createStreetCorridors(runs: StreetRun[]): THREE.Group {
  const group = new THREE.Group();
  ROAD_TYPES.forEach((roadType) => {
    const typeRuns = runs.filter((run) => run.roadType === roadType);
    if (typeRuns.length === 0) return;
    group.add(createStreetLayer(typeRuns, roadType, "sidewalk"));
    group.add(createStreetLayer(typeRuns, roadType, "surface"));
    group.add(createStreetLayer(typeRuns, roadType, "curb"));
  });
  return group;
}

function createStreetLayer(
  runs: StreetRun[],
  roadType: CityState["roads"][number]["type"],
  layer: "sidewalk" | "surface" | "curb",
): THREE.Group {
  if (layer === "curb") return createStreetCurbs(runs, roadType);
  const isSurface = layer === "surface";
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, isSurface ? 0.06 : 0.045, 1),
    new THREE.MeshStandardMaterial({
      color: getStreetLayerColor(roadType, layer),
      map: isSurface ? getAsphaltTexture(3, 3) : getConcreteTexture(2, 2),
      roughness: isSurface ? 0.85 : 0.88,
      metalness: isSurface ? 0.01 : 0,
    }),
    runs.length,
  );
  const object = new THREE.Object3D();
  runs.forEach((run, index) => {
    setStreetRunTransform(object, run, isSurface ? 0.07 : 0.022, layer);
    mesh.setMatrixAt(index, object.matrix);
  });
  mesh.receiveShadow = true;
  mesh.instanceMatrix.needsUpdate = true;
  return new THREE.Group().add(mesh);
}

function setStreetRunTransform(
  object: THREE.Object3D,
  run: StreetRun,
  y: number,
  layer: "sidewalk" | "surface",
): void {
  const width = getRoadWidth(run.roadType) + (layer === "sidewalk" ? 0.12 : 0);
  const isHorizontal = run.axis === "horizontal";
  object.position.set(
    run.x + (isHorizontal ? run.length / 2 : 0.5),
    y,
    run.y + (isHorizontal ? 0.5 : run.length / 2),
  );
  object.scale.set(
    isHorizontal ? run.length : width,
    1,
    isHorizontal ? width : run.length,
  );
  object.updateMatrix();
}

function getRoadWidth(roadType: CityState["roads"][number]["type"]): number {
  if (roadType === "arterial") return 1.1;
  if (roadType === "collector") return 0.96;
  if (roadType === "paved") return 0.84;
  return 0.78;
}

function getRoadColor(roadType: CityState["roads"][number]["type"]): number {
  if (roadType === "dirt") return 0x7e624b;
  if (roadType === "arterial") return 0x1e282e;
  if (roadType === "collector") return 0x242c32;
  return COLORS.road;
}

function getStreetLayerColor(
  roadType: CityState["roads"][number]["type"],
  layer: "sidewalk" | "surface",
): number {
  if (layer === "sidewalk") return 0x4a565a;
  if (roadType === "dirt") return getRoadColor(roadType);
  if (roadType === "arterial") return 0x1e282e;
  if (roadType === "collector") return 0x242c32;
  return 0x2a3238;
}

function createStreetCurbs(
  runs: StreetRun[],
  roadType: CityState["roads"][number]["type"],
): THREE.Group {
  const group = new THREE.Group();
  if (roadType === "dirt" || roadType === "local") return group;
  group.add(createContinuousCurbMesh(runs, roadType, 1));
  group.add(createContinuousCurbMesh(runs, roadType, -1));
  return group;
}

function createContinuousCurbMesh(
  runs: StreetRun[],
  roadType: CityState["roads"][number]["type"],
  side: 1 | -1,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.035, 0.045),
    new THREE.MeshStandardMaterial({
      color: 0x6a7272,
      map: getConcreteTexture(2, 1),
      roughness: 0.88,
    }),
    runs.length,
  );
  const object = new THREE.Object3D();
  runs.forEach((run, index) => {
    const width = getRoadWidth(roadType);
    const isHorizontal = run.axis === "horizontal";
    object.position.set(
      run.x + (isHorizontal ? run.length / 2 : 0.5),
      0.102,
      run.y + (isHorizontal ? 0.5 + side * (width / 2 + 0.03) : run.length / 2),
    );
    object.rotation.y = isHorizontal ? 0 : Math.PI / 2;
    if (!isHorizontal) object.position.x += side * (width / 2 + 0.03);
    object.scale.set(run.length, 1, 1);
    object.updateMatrix();
    mesh.setMatrixAt(index, object.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function addContinuousLaneMarkings(group: THREE.Group, runs: StreetRun[]): void {
  const arterialMarkings = getLaneMarkings(
    runs.filter((run) => run.roadType === "arterial"),
    0.5,
  );
  const collectorMarkings = getLaneMarkings(
    runs.filter((run) => run.roadType === "collector"),
    0.6,
  );
  const localMarkings = getLaneMarkings(
    runs.filter((run) => run.roadType === "local" || run.roadType === "paved"),
    0.7,
  );
  const allMarkings = [...arterialMarkings, ...collectorMarkings, ...localMarkings];
  if (allMarkings.length === 0) return;
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.035, 0.013, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x88887a, roughness: 0.65 }),
    allMarkings.length,
  );
  const object = new THREE.Object3D();
  allMarkings.forEach((marking, index) => {
    object.position.set(marking.x, 0.112, marking.z);
    object.rotation.y = marking.axis === "horizontal" ? Math.PI / 2 : 0;
    object.updateMatrix();
    mesh.setMatrixAt(index, object.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
}

function getLaneMarkings(
  runs: StreetRun[],
  dashGap: number,
): { x: number; z: number; axis: StreetAxis }[] {
  return runs.flatMap((run) =>
    Array.from(
      { length: Math.max(0, Math.floor(run.length / dashGap)) },
      (_value, index) => {
        const offset = index * dashGap + dashGap * 0.3;
        return {
          x: run.axis === "horizontal" ? run.x + offset : run.x + 0.5,
          z: run.axis === "vertical" ? run.y + offset : run.y + 0.5,
          axis: run.axis,
        };
      },
    ),
  );
}

function hasRoadDirection(
  road: CityState["roads"][number],
  direction: "vertical" | "horizontal",
): boolean {
  return direction === "vertical"
    ? road.connections.north || road.connections.south
    : road.connections.east || road.connections.west;
}

function addIntersectionDetails(group: THREE.Group, roads: CityState["roads"]): void {
  const arterialIntersections = roads.filter(
    (road) => getRoadConnectionCount(road) >= 3 && road.type !== "dirt",
  );
  if (arterialIntersections.length === 0) return;
  const plates = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.52, 24),
    new THREE.MeshStandardMaterial({
      color: 0x1e2428,
      map: getAsphaltTexture(1, 1),
      roughness: 0.82,
    }),
    arterialIntersections.length,
  );
  const matrix = new THREE.Matrix4();
  arterialIntersections.forEach((road, index) => {
    matrix.makeRotationX(-Math.PI / 2);
    matrix.setPosition(road.position[0] + 0.5, 0.11, road.position[1] + 0.5);
    plates.setMatrixAt(index, matrix);
  });
  plates.instanceMatrix.needsUpdate = true;
  group.add(plates);
  group.add(createCrosswalks(arterialIntersections));
  group.add(createStopBars(arterialIntersections));
}

function createStopBars(roads: CityState["roads"]): THREE.Group {
  const stops: { x: number; z: number; horizontal: boolean }[] = [];
  roads.forEach((road) => {
    const [x, y] = road.position;
    const cx = x + 0.5;
    const cy = y + 0.5;
    const { north, east, south, west } = road.connections;
    if (north) stops.push({ x: cx, z: cy - 0.42, horizontal: true });
    if (south) stops.push({ x: cx, z: cy + 0.42, horizontal: true });
    if (east) stops.push({ x: cx - 0.42, z: cy, horizontal: false });
    if (west) stops.push({ x: cx + 0.42, z: cy, horizontal: false });
  });
  const group = new THREE.Group();
  if (stops.length === 0) return group;
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.06, 0.014, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xccccb0, roughness: 0.6 }),
    stops.length,
  );
  const matrix = new THREE.Matrix4();
  stops.forEach((stop, index) => {
    if (stop.horizontal) {
      matrix.makeRotationY(Math.PI / 2);
      matrix.setPosition(stop.x, 0.118, stop.z);
    } else {
      matrix.setPosition(stop.x, 0.118, stop.z);
    }
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
  return group;
}

function getRoadConnectionCount(road: CityState["roads"][number]): number {
  return Object.values(road.connections).filter(Boolean).length;
}

function createCrosswalks(roads: CityState["roads"]): THREE.Group {
  const stripes: { x: number; z: number; rx: number }[] = [];
  roads.forEach((road) => {
    const [x, y] = road.position;
    const cx = x + 0.5;
    const cy = y + 0.5;
    const { north, east, south, west } = road.connections;
    if (north) {
      for (let s = -0.34; s <= 0.34; s += 0.17) {
        stripes.push({ x: cx + s, z: cy - 0.44, rx: 0 });
      }
    }
    if (south) {
      for (let s = -0.34; s <= 0.34; s += 0.17) {
        stripes.push({ x: cx + s, z: cy + 0.44, rx: 0 });
      }
    }
    if (east) {
      for (let s = -0.34; s <= 0.34; s += 0.17) {
        stripes.push({ x: cx + 0.44, z: cy + s, rx: Math.PI / 2 });
      }
    }
    if (west) {
      for (let s = -0.34; s <= 0.34; s += 0.17) {
        stripes.push({ x: cx - 0.44, z: cy + s, rx: Math.PI / 2 });
      }
    }
  });
  const group = new THREE.Group();
  if (stripes.length === 0) return group;
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.08, 0.014, 0.24),
    new THREE.MeshStandardMaterial({ color: 0xbbbbaa, roughness: 0.7 }),
    stripes.length,
  );
  const matrix = new THREE.Matrix4();
  stripes.forEach((stripe, index) => {
    matrix.makeRotationY(stripe.rx);
    matrix.setPosition(stripe.x, 0.118, stripe.z);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
  return group;
}

function addStreetLights(group: THREE.Group, roads: CityState["roads"]): void {
  const lights = roads.filter((road) => {
    const [x, y] = road.position;
    return (
      road.type !== "dirt" &&
      getRoadConnectionCount(road) < 3 &&
      getVisualHash(x, y) % 7 === 0
    );
  });
  if (lights.length === 0) return;
  const poles = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.018, 0.028, 0.52, 8),
    new THREE.MeshStandardMaterial({ color: 0x39434a, roughness: 0.56, metalness: 0.32 }),
    lights.length,
  );
  const arms = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.012, 0.015, 0.12, 6),
    new THREE.MeshStandardMaterial({ color: 0x39434a, roughness: 0.5, metalness: 0.3 }),
    lights.length,
  );
  const lamps = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.055, 10, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffddaa,
      emissive: 0xffaa55,
      emissiveIntensity: 0.35,
      roughness: 0.3,
    }),
    lights.length,
  );
  const cones = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.12, 0.08, 8, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    lights.length,
  );
  const matrix = new THREE.Matrix4();
  lights.forEach((road, index) => {
    const [x, y] = road.position;
    const side = getVisualHash(x, y) % 2 === 0 ? 0.49 : -0.49;
    const cx = x + 0.5 + side;
    const cz = y + 0.5;
    matrix.makeTranslation(cx, 0.35, cz);
    poles.setMatrixAt(index, matrix);
    matrix.makeTranslation(cx + side * 0.06, 0.55, cz);
    matrix.makeRotationZ(Math.PI / 2);
    arms.setMatrixAt(index, matrix);
    matrix.identity();
    matrix.makeTranslation(cx + side * 0.08, 0.58, cz);
    lamps.setMatrixAt(index, matrix);
    matrix.identity();
    matrix.makeTranslation(cx + side * 0.08, 0.54, cz);
    matrix.makeRotationX(side > 0 ? Math.PI : 0);
    cones.setMatrixAt(index, matrix);
  });
  poles.castShadow = true;
  poles.instanceMatrix.needsUpdate = true;
  arms.instanceMatrix.needsUpdate = true;
  lamps.instanceMatrix.needsUpdate = true;
  cones.instanceMatrix.needsUpdate = true;
  group.add(poles, arms, lamps, cones);
}

function addDecorativeTraffic(group: THREE.Group, roads: CityState["roads"]): void {
  const cars = getDecorativeCars(roads);
  if (cars.length === 0) return;
  const chassis = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.14, 0.075, 0.28),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, metalness: 0.35 }),
    cars.length,
  );
  const cabins = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.1, 0.065, 0.13),
    new THREE.MeshStandardMaterial({ color: 0x203542, roughness: 0.22, metalness: 0.42 }),
    cars.length,
  );
  const headlights = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.015, 6, 6),
    new THREE.MeshBasicMaterial({
      color: 0xffeecc,
      transparent: true,
      opacity: 0.7,
    }),
    cars.length * 2,
  );
  const taillights = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.012, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.6 }),
    cars.length * 2,
  );
  const object = new THREE.Object3D();
  cars.forEach((car, index) => {
    object.position.set(car.x, 0.145, car.z);
    object.rotation.set(0, car.rotation, 0);
    object.updateMatrix();
    chassis.setMatrixAt(index, object.matrix);
    chassis.setColorAt(index, new THREE.Color(car.color));
    object.position.y = 0.205;
    object.updateMatrix();
    cabins.setMatrixAt(index, object.matrix);

    const isVertical = car.rotation === 0 || car.rotation === Math.PI;
    const forward = car.rotation === 0 || car.rotation === Math.PI / 2 ? 1 : -1;
    const hlx = car.x + (isVertical ? forward * 0.14 : 0);
    const hlz = car.z + (isVertical ? 0 : forward * 0.14);
    const hlx2 = car.x + (isVertical ? -forward * 0.14 : 0);
    const hlz2 = car.z + (isVertical ? 0 : -forward * 0.14);
    const hlY = 0.15;

    object.position.set(hlx, hlY, hlz);
    object.rotation.set(0, car.rotation, 0);
    object.updateMatrix();
    headlights.setMatrixAt(index * 2, object.matrix);

    object.position.set(hlx2, hlY, hlz2);
    object.updateMatrix();
    taillights.setMatrixAt(index * 2, object.matrix);
  });
  chassis.castShadow = true;
  chassis.instanceMatrix.needsUpdate = true;
  cabins.instanceMatrix.needsUpdate = true;
  headlights.instanceMatrix.needsUpdate = true;
  taillights.instanceMatrix.needsUpdate = true;
  if (chassis.instanceColor) chassis.instanceColor.needsUpdate = true;
  group.add(chassis, cabins, headlights, taillights);
}

function getDecorativeCars(roads: CityState["roads"]): DecorativeCar[] {
  return roads.flatMap((road) => createRoadCar(road));
}

function createRoadCar(road: CityState["roads"][number]): DecorativeCar[] {
  const [x, y] = road.position;
  const hash = getVisualHash(x, y);
  if (road.type === "local" || getRoadConnectionCount(road) !== 2 || hash % 5 !== 0)
    return [];
  const vertical = road.connections.north || road.connections.south;
  const horizontal = road.connections.east || road.connections.west;
  if (vertical === horizontal) return [];
  const lane = hash % 2 === 0 ? -0.16 : 0.16;
  const colors = [0xd7dde0, 0x3d6f9d, 0xa3403d, 0x34383c];
  const color = colors[hash % colors.length] ?? 0xd7dde0;
  return [
    vertical
      ? { x: x + 0.5 + lane, z: y + 0.5, rotation: 0, color }
      : { x: x + 0.5, z: y + 0.5 + lane, rotation: Math.PI / 2, color },
  ];
}

function renderZones(group: THREE.Group, state: CityState): void {
  getZoneTiles(state, false).forEach(({ zone, tiles }) => {
    group.add(createZoneFillMesh(tiles, getZoneColor(zone), 0.16, 0.028));
  });
}

function renderBuildings(
  group: THREE.Group,
  state: CityState,
  getBuildingRenderInfo: BuildingRenderInfoLookup,
  assetSource?: CityAssetSource,
): void {
  if (assetSource) {
    renderGeneratedBuildings(group, state, getBuildingRenderInfo, assetSource);
    return;
  }
  getBuildingGroups(state).forEach((buildings) => {
    const first = buildings[0];
    if (!first) return;
    const renderInfo = getBuildingRenderInfo(first.definitionId);
    if (!renderInfo) return;
    group.add(
      createBuildingInstances(first.definitionId, renderInfo, first.status, buildings),
    );
    addBuildingDetails(group, first.definitionId, renderInfo, buildings);
  });
}

function renderGeneratedBuildings(
  group: THREE.Group,
  state: CityState,
  getBuildingRenderInfo: BuildingRenderInfoLookup,
  assetSource: CityAssetSource,
): void {
  const parkAssets = createGeneratedAssetBatcher(group, assetSource);
  state.buildings.forEach((building, index) => {
    const renderInfo = getBuildingRenderInfo(building.definitionId);
    if (!renderInfo) return;
    if (renderInfo.category === "decoration") {
      renderGeneratedPark(parkAssets, building, renderInfo.size);
      return;
    }
    if (building.status === "constructing") {
      const rendered = renderGeneratedConstructionBuilding(
        group,
        assetSource,
        building,
        renderInfo.size,
        renderInfo.category,
      );
      if (!rendered)
        renderProceduralBuilding(group, building.definitionId, renderInfo, building);
      return;
    }
    const selection = getGeneratedBuildingSelection(
      renderInfo,
      building.definitionId,
      index,
    );
    if (!selection) {
      renderProceduralBuilding(group, building.definitionId, renderInfo, building);
      return;
    }
    const asset = assetSource.createBuildingInstance(selection.category, selection.seed);
    if (!asset) {
      renderProceduralBuilding(group, building.definitionId, renderInfo, building);
      return;
    }
    placeGeneratedBuilding(asset.object, building, renderInfo.size);
    asset.object.name = `building:${building.definitionId}:${building.status}`;
    group.add(asset.object);
  });
  parkAssets.flush();
}

function renderGeneratedConstructionBuilding(
  group: THREE.Group,
  assetSource: CityAssetSource,
  building: CityState["buildings"][number],
  size: BuildingDefinition["size"],
  category: BuildingCategory,
): boolean {
  const assetId = getConstructionBuildingAssetId(category);
  const asset = assetSource.createAssetInstance(assetId);
  if (!asset) return false;
  placeGeneratedConstructionBuilding(asset.object, building, size);
  asset.object.name = `building:${building.definitionId}:${building.status}`;
  group.add(asset.object);
  return true;
}

function getConstructionBuildingAssetId(category: BuildingCategory): string {
  if (category === "residential") return RESIDENTIAL_CONSTRUCTION_BUILDING_ASSET_ID;
  return DEFAULT_CONSTRUCTION_BUILDING_ASSET_ID;
}

function renderProceduralBuilding(
  group: THREE.Group,
  definitionId: string,
  renderInfo: BuildingRenderInfo,
  building: CityState["buildings"][number],
): void {
  const buildings = [building];
  group.add(
    createBuildingInstances(definitionId, renderInfo, building.status, buildings),
  );
  addBuildingDetails(group, definitionId, renderInfo, buildings);
}

function getGeneratedBuildingSeed(
  category: GeneratedBuildingCategory,
  definitionId: string,
  index: number,
): number {
  const [start, end] = getBuildingVariantRange(category, definitionId);
  const variation = getVisualHash(index, definitionId.length);
  return start + (variation % (end - start));
}

function getBuildingVariantRange(
  category: GeneratedBuildingCategory,
  definitionId: string,
): [number, number] {
  const ranges = BUILDING_VARIANT_RANGES[category];
  return ranges[definitionId] ?? ranges.default;
}

function getGeneratedBuildingSelection(
  renderInfo: BuildingRenderInfo,
  definitionId: string,
  index: number,
): GeneratedBuildingSelection | null {
  const override = getExplicitGeneratedBuildingSelection(definitionId);
  if (override) return override;
  const category = getGeneratedBuildingCategory(renderInfo.category);
  if (!category) return null;
  return {
    category,
    seed: getGeneratedBuildingSeed(category, definitionId, index),
  };
}

function getExplicitGeneratedBuildingSelection(
  definitionId: string,
): GeneratedBuildingSelection | null {
  if (definitionId === "water_tower") return { category: "industrial", seed: 8 };
  if (definitionId === "power_plant") return { category: "industrial", seed: 9 };
  return null;
}

function renderGeneratedPark(
  assetBatcher: GeneratedAssetBatcher,
  building: CityState["buildings"][number],
  size: BuildingDefinition["size"],
): void {
  const centerX = building.position[0] + size[0] / 2;
  const centerZ = building.position[1] + size[1] / 2;
  const treeScale =
    Math.max(1.08, Math.min(size[0], size[1]) * 0.5) * GENERATED_OAK_RENDER_SCALE;
  assetBatcher.add("tree_mature_oak", {
    position: [centerX - size[0] * 0.18, 0, centerZ],
    scale: treeScale,
  });
  assetBatcher.add("plaza_planter", {
    position: [centerX + size[0] * 0.2, 0, centerZ - size[1] * 0.18],
    scale: 0.7,
  });
  assetBatcher.add("bench", {
    position: [centerX + size[0] * 0.2, 0, centerZ + size[1] * 0.2],
    rotation: Math.PI / 2,
    scale: 0.78,
  });
}

function getGeneratedBuildingCategory(
  category: BuildingCategory,
): GeneratedBuildingCategory | null {
  if (category === "residential") return "residential";
  if (category === "commercial") return "commercial";
  if (category === "industrial") return "industrial";
  if (["service", "security", "transit", "civic"].includes(category)) return "civic";
  return null;
}

function placeGeneratedBuilding(
  object: THREE.Object3D,
  building: CityState["buildings"][number],
  size: BuildingDefinition["size"],
): void {
  const scale = getFootprintFitScale(object, size);
  object.scale.setScalar(scale);
  if (building.status === "constructing") object.scale.y *= 0.42;
  object.position.set(
    building.position[0] + size[0] / 2,
    0,
    building.position[1] + size[1] / 2,
  );
  object.rotation.y = (building.rotation * Math.PI) / 180;
}

function placeGeneratedConstructionBuilding(
  object: THREE.Object3D,
  building: CityState["buildings"][number],
  size: BuildingDefinition["size"],
): void {
  const scale = getFootprintFitScale(object, size);
  object.scale.setScalar(scale);
  object.position.set(
    building.position[0] + size[0] / 2,
    0,
    building.position[1] + size[1] / 2,
  );
  object.rotation.y = (building.rotation * Math.PI) / 180;
}

function getFootprintFitScale(
  object: THREE.Object3D,
  size: BuildingDefinition["size"],
): number {
  const bounds = new THREE.Box3().setFromObject(object);
  const width = Math.max(bounds.max.x - bounds.min.x, 0.01);
  const depth = Math.max(bounds.max.z - bounds.min.z, 0.01);
  return Math.min((size[0] * 0.84) / width, (size[1] * 0.84) / depth);
}

function renderOverlay(
  group: THREE.Group,
  state: CityState,
  activeOverlay: UIState["activeOverlay"],
  getBuildingRenderInfo: BuildingRenderInfoLookup,
  selectedTile: UIState["selectedTile"],
): void {
  if (activeOverlay === "zoning") renderZoningOverlay(group, state);
  if (activeOverlay === "pollution") renderPollutionOverlay(group, state);
  if (activeOverlay === "health")
    renderRadiusOverlay(
      group,
      state,
      "healthRadius",
      COLORS.health,
      getBuildingRenderInfo,
    );
  if (activeOverlay === "education") {
    renderRadiusOverlay(
      group,
      state,
      "educationRadius",
      COLORS.education,
      getBuildingRenderInfo,
    );
  }
  if (activeOverlay === "districts") renderDistrictOverlay(group, state);
  renderSelectedBuildingRadius(group, state, selectedTile, getBuildingRenderInfo);
}

function renderZoningOverlay(group: THREE.Group, state: CityState): void {
  const overlay = new THREE.Group();
  getZoneTiles(state, true).forEach(({ zone, tiles }) => {
    overlay.add(createZoneFillMesh(tiles, getZoneColor(zone), 0.38, 0.062));
    overlay.add(createZoneBorders(tiles, getZoneColor(zone), 0.066));
  });
  group.add(overlay);
}

function getZoneTiles(
  state: CityState,
  includeOccupied: boolean,
): { zone: ZoneType; tiles: CityState["map"][number][number][] }[] {
  const groups = new Map<ZoneType, CityState["map"][number][number][]>();
  state.map.flat().forEach((tile) => {
    if (!tile.zone || (!includeOccupied && (tile.buildingId || tile.roadId))) return;
    const tiles = groups.get(tile.zone) ?? [];
    tiles.push(tile);
    groups.set(tile.zone, tiles);
  });
  return [...groups].map(([zone, tiles]) => ({ zone, tiles }));
}

function createZoneFillMesh(
  tiles: CityState["map"][number][number][],
  color: number,
  opacity: number,
  height: number,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.94, 0.94),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    tiles.length,
  );
  const matrix = new THREE.Matrix4();
  tiles.forEach((tile, index) => {
    matrix.makeRotationX(-Math.PI / 2);
    matrix.setPosition(tile.x + 0.5, height, tile.y + 0.5);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.renderOrder = 1;
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function createZoneBorders(
  tiles: CityState["map"][number][number][],
  color: number,
  height: number,
): THREE.LineSegments {
  const positions = tiles.flatMap((tile) =>
    getZoneBorderPositions(tile.x, tile.y, height),
  );
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.renderOrder = 2;
  return lines;
}

function getZoneBorderPositions(x: number, y: number, height: number): number[] {
  const left = x + 0.035;
  const right = x + 0.965;
  const top = y + 0.035;
  const bottom = y + 0.965;
  return [
    left,
    height,
    top,
    right,
    height,
    top,
    right,
    height,
    top,
    right,
    height,
    bottom,
    right,
    height,
    bottom,
    left,
    height,
    bottom,
    left,
    height,
    bottom,
    left,
    height,
    top,
  ];
}

function renderDistrictOverlay(group: THREE.Group, state: CityState): void {
  state.map.flat().forEach((tile) => {
    if (!tile.districtId) return;
    const district = state.districts.find(
      (candidate) => candidate.id === tile.districtId,
    );
    const color = district
      ? Number.parseInt(district.color.slice(1), 16)
      : COLORS.district;
    const mesh = createPlane(color, 0.32, 0.058);
    mesh.position.set(tile.x + 0.5, 0.058, tile.y + 0.5);
    group.add(mesh);
  });
}

function getBuildingGroups(state: CityState): Map<string, CityState["buildings"]> {
  return state.buildings.reduce((groups, building) => {
    const key = `${building.definitionId}:${building.status}`;
    const grouped = groups.get(key) ?? [];
    grouped.push(building);
    groups.set(key, grouped);
    return groups;
  }, new Map<string, CityState["buildings"]>());
}

function createBuildingInstances(
  definitionId: string,
  renderInfo: BuildingRenderInfo,
  status: string,
  buildings: CityState["buildings"],
): THREE.InstancedMesh {
  const height = getBuildingHeight(
    renderInfo.category,
    status === "constructing",
    definitionId,
  );
  const mesh = new THREE.InstancedMesh(
    new RoundedBoxGeometry(
      renderInfo.size[0] * 0.82,
      height,
      renderInfo.size[1] * 0.82,
      3,
      Math.min(0.08, Math.min(...renderInfo.size) * 0.06),
    ),
    createBuildingBaseMaterial(renderInfo.category, definitionId),
    buildings.length,
  );
  const instance = new THREE.Object3D();
  buildings.forEach((building, index) => {
    const scale = getBuildingFootprintScale(definitionId, index);
    instance.position.set(
      building.position[0] + renderInfo.size[0] / 2,
      height / 2,
      building.position[1] + renderInfo.size[1] / 2,
    );
    instance.scale.set(scale, 1, scale);
    instance.updateMatrix();
    mesh.setMatrixAt(index, instance.matrix);
    mesh.setColorAt(
      index,
      getBuildingInstanceColor(renderInfo.category, status, definitionId, index),
    );
  });
  mesh.name = `building:${definitionId}:${status}`;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  return mesh;
}

function createBuildingBaseMaterial(
  category: BuildingCategory,
  definitionId: string,
): THREE.MeshStandardMaterial[] {
  const wallMap = getBuildingWallMap(category, definitionId);
  const procMap = getBuildingProceduralMap(category, definitionId);
  const wallColor = getBuildingWallColor(category, definitionId);
  const wallMat = new THREE.MeshStandardMaterial({
    color: wallMap ? 0xffffff : wallColor,
    map: wallMap ?? procMap,
    roughness: getBuildingWallRoughness(category),
    metalness: getBuildingWallMetalness(category),
    bumpMap: wallMap ? undefined : procMap,
    bumpScale: 0.025,
    envMapIntensity: 0.3,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: getBuildingRoofColor(category, definitionId),
    map: getRoofTexture(3, 3),
    roughness: 0.78,
    metalness: category === "industrial" || category === "utility" ? 0.15 : 0.04,
  });
  const foundation = new THREE.MeshStandardMaterial({
    color: 0x5a6268,
    map: getConcreteTexture(1, 1),
    roughness: 0.85,
    metalness: 0.05,
  });
  return [wallMat, wallMat, roofMat, foundation, wallMat, wallMat];
}

function getBuildingWallMap(
  category: BuildingCategory,
  definitionId: string,
): THREE.Texture | null {
  if (isTower(definitionId))
    return getTiledTexture("/textures/commercial-wall-albedo.jpg", 2, 5);
  if (category === "residential")
    return getTiledTexture("/textures/residential-wall-albedo.jpg", 1, 2);
  if (category === "industrial" || category === "utility")
    return getTiledTexture("/textures/industrial-cladding-albedo.jpg", 2, 2);
  if (category === "commercial" || isCivicBuilding(category))
    return getTiledTexture("/textures/commercial-wall-albedo.jpg", 2, 3);
  return null;
}

function getBuildingProceduralMap(
  category: BuildingCategory,
  definitionId: string,
): THREE.Texture | null {
  if (category === "residential") {
    if (definitionId.includes("brick")) return getBrickTexture(2, 4);
    if (definitionId.includes("stucco")) return getConcreteTexture(2, 2);
    if (definitionId.includes("tower")) return getFacadePanelTexture(3, 6);
    return getBrickTexture(2, 3);
  }
  if (category === "commercial") {
    if (definitionId.includes("tower")) return getFacadePanelTexture(4, 8);
    return getConcreteTexture(3, 4);
  }
  if (category === "industrial" || category === "utility") {
    return getMetalTexture(4, 4);
  }
  if (isCivicBuilding(category)) {
    return getConcreteTexture(3, 4);
  }
  return getConcreteTexture(2, 2);
}

function getBuildingWallColor(category: BuildingCategory, definitionId: string): number {
  if (isTower(definitionId)) return 0x8a9aa6;
  if (category === "residential") return getResidentialWallColor(definitionId);
  if (category === "commercial") return getCommercialWallColor(definitionId);
  if (category === "industrial" || category === "utility")
    return definitionId.includes("warehouse") ? 0x7a8288 : 0x8a9296;
  if (isCivicBuilding(category)) return 0xc8c4ba;
  return getCategoryColor(category);
}

function getResidentialWallColor(definitionId: string): number {
  if (definitionId.includes("brick")) return 0xb8957a;
  if (definitionId.includes("stucco")) return 0xd4ccbc;
  if (definitionId.includes("tower")) return 0x8a9aaa;
  return 0xc8bca8;
}

function getCommercialWallColor(definitionId: string): number {
  if (definitionId.includes("tower")) return 0x7a8a96;
  if (definitionId.includes("glass")) return 0x6a8a9a;
  return 0x8a9aa0;
}

function isCivicBuilding(category: BuildingCategory): boolean {
  return ["service", "security", "transit", "civic"].includes(category);
}

function getBuildingWallRoughness(category: BuildingCategory): number {
  if (category === "commercial") return 0.45;
  if (category === "industrial" || category === "utility") return 0.72;
  if (category === "residential") return 0.62;
  return 0.55;
}

function getBuildingWallMetalness(category: BuildingCategory): number {
  if (category === "commercial") return 0.15;
  if (category === "industrial" || category === "utility") return 0.2;
  if (category === "residential") return 0.02;
  return 0.05;
}

function getBuildingRoofColor(category: BuildingCategory, definitionId: string): number {
  if (isTower(definitionId)) return 0x3a484e;
  if (category === "residential") return 0x5a4e4a;
  if (category === "commercial") return 0x4a565a;
  if (category === "industrial" || category === "utility") return 0x5a6a72;
  return 0x5a6268;
}

function getBuildingInstanceColor(
  category: BuildingCategory,
  status: string,
  definitionId: string,
  index: number,
): THREE.Color {
  if (status === "constructing" || status === "abandoned")
    return getBuildingVariation(category, status, definitionId, index);
  const base = 0.92;
  const variation = (getVisualHash(index, definitionId.length) % 7) * 0.018;
  const b = base + variation;
  const hueShift = ((index * 7 + definitionId.length) % 11) * 0.003 - 0.015;
  const color = new THREE.Color(b, b, b);
  color.offsetHSL(hueShift, 0, 0);
  return color;
}

function addBuildingDetails(
  group: THREE.Group,
  definitionId: string,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
): void {
  if (renderInfo.category === "decoration") {
    addParkTrees(group, renderInfo, buildings);
    return;
  }
  const height = getBuildingHeight(renderInfo.category, false, definitionId);
  addArchitecturalMassing(group, renderInfo, buildings, height);
  if (renderInfo.category === "residential")
    addResidentialDetails(group, renderInfo, buildings, height, definitionId);
  if (renderInfo.category === "commercial")
    addCommercialDetails(group, renderInfo, buildings, height, definitionId);
  if (
    renderInfo.category === "industrial" ||
    renderInfo.category === "utility" ||
    definitionId === "power_plant"
  ) {
    addIndustrialDetails(group, renderInfo, buildings, height);
  }
  if (isCivicBuilding(renderInfo.category))
    addCivicFacade(group, renderInfo, buildings, height);
  if (renderInfo.category === "utility" || isCivicBuilding(renderInfo.category))
    addCivicRoofProps(group, renderInfo, buildings, height);
}

function addArchitecturalMassing(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
  height: number,
): void {
  if (height < 1.4) return;
  const [width, depth] = renderInfo.size;
  const floors = Math.min(8, Math.max(2, Math.round(height / 0.85)));
  const frontBands = createFacadeBands(buildings.length * floors, width, true);
  const sideBands = createFacadeBands(buildings.length * floors, depth, false);
  const matrix = new THREE.Matrix4();
  buildings.forEach((building, buildingIndex) => {
    for (let floor = 0; floor < floors; floor += 1) {
      const y = height * ((floor + 1) / (floors + 1));
      const index = buildingIndex * floors + floor;
      matrix.makeTranslation(
        building.position[0] + width * 0.5,
        y,
        building.position[1] + depth * 0.914,
      );
      frontBands.setMatrixAt(index, matrix);
      matrix.makeTranslation(
        building.position[0] + width * 0.086,
        y,
        building.position[1] + depth * 0.5,
      );
      sideBands.setMatrixAt(index, matrix);
    }
  });
  frontBands.instanceMatrix.needsUpdate = true;
  sideBands.instanceMatrix.needsUpdate = true;
  group.add(frontBands, sideBands);
}

function createFacadeBands(
  count: number,
  span: number,
  front: boolean,
): THREE.InstancedMesh {
  const geometry = front
    ? new THREE.BoxGeometry(span * 0.76, 0.025, 0.034)
    : new THREE.BoxGeometry(0.034, 0.025, span * 0.76);
  return new THREE.InstancedMesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: 0x2a363c,
      roughness: 0.52,
      metalness: 0.18,
    }),
    count,
  );
}

function addResidentialDetails(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
  height: number,
  definitionId: string,
): void {
  if (isTower(definitionId)) {
    addTowerPodiums(group, renderInfo, buildings);
    addWindowBand(group, renderInfo, buildings, height);
    addTowerCaps(group, renderInfo, buildings, height);
    addTowerSetbacks(group, renderInfo, buildings, height, definitionId);
    addTowerBalconies(group, renderInfo, buildings, height);
    addResidentialEntrances(group, renderInfo, buildings, height);
    addRooftopProps(group, renderInfo, buildings, height, true);
    return;
  }
  addResidentialYards(group, renderInfo, buildings);
  addPyramidRoofs(group, renderInfo, buildings, height);
  addFlatHouseRoofs(group, renderInfo, buildings, height);
  addResidentialFacade(group, renderInfo, buildings, height);
  addResidentialEntrances(group, renderInfo, buildings, height);
  addRooftopProps(group, renderInfo, buildings, height, false);
}

function addCommercialDetails(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
  height: number,
  definitionId: string,
): void {
  addWindowBand(group, renderInfo, buildings, height);
  if (isTower(definitionId)) {
    addTowerPodiums(group, renderInfo, buildings);
    addTowerCaps(group, renderInfo, buildings, height);
    addTowerSetbacks(group, renderInfo, buildings, height, definitionId);
    addTowerBalconies(group, renderInfo, buildings, height);
    addRooftopProps(group, renderInfo, buildings, height, false);
    return;
  }
  addStorefronts(group, renderInfo, buildings, height);
  addRooftopProps(group, renderInfo, buildings, height, false);
}

function addIndustrialDetails(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
  height: number,
): void {
  addIndustrialWindows(group, renderInfo, buildings, height);
  addChimneys(group, renderInfo, buildings, height);
  addLoadingDocks(group, renderInfo, buildings);
  addIndustrialRoofVents(group, renderInfo, buildings, height);
}

function addIndustrialWindows(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
  height: number,
): void {
  const [width, depth] = renderInfo.size;
  const floors = Math.max(2, Math.round(height / 0.65));
  const columns = Math.max(2, Math.round(width * 1.5));
  const total = buildings.length * floors * columns;
  if (total === 0) return;

  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x88999a,
    roughness: 0.3,
    metalness: 0.25,
    emissive: 0x223a44,
    emissiveIntensity: 0.03,
  });
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(
      Math.min(0.06, width * 0.1),
      Math.min(0.05, height * 0.08),
      0.02,
    ),
    windowMat,
    total,
  );
  const m = new THREE.Matrix4();
  buildings.forEach((building, buildingIndex) => {
    for (let floor = 0; floor < floors; floor += 1) {
      for (let col = 0; col < columns; col += 1) {
        const idx = buildingIndex * floors * columns + floor * columns + col;
        const y = height * (0.1 + ((floor + 0.5) / floors) * 0.7);
        const hPos = (col + 1) / (columns + 1);
        const lit = getVisualHash(idx, 17) % 100 < 40;
        m.makeTranslation(
          building.position[0] + width * hPos,
          y,
          building.position[1] + depth * 0.915,
        );
        mesh.setMatrixAt(idx, m);
        mesh.setColorAt(idx, lit ? new THREE.Color(0xaabbcc) : new THREE.Color(0x080c12));
      }
    }
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  group.add(mesh);
}

function addCivicFacade(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
  height: number,
): void {
  const [width, depth] = renderInfo.size;
  const entrance = createCivicEntranceMesh(buildings.length, width, height);
  const windows = createCivicWindowsMesh(buildings.length, width, height);
  const canopy = new THREE.InstancedMesh(
    new THREE.BoxGeometry(width * 0.48, 0.06, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x39454a, roughness: 0.58, metalness: 0.28 }),
    buildings.length,
  );
  populateCivicFacade({ entrance, windows, canopy }, { buildings, width, depth, height });
  group.add(entrance, windows, canopy);
}

function createCivicEntranceMesh(
  count: number,
  width: number,
  height: number,
): THREE.InstancedMesh {
  return new THREE.InstancedMesh(
    new THREE.BoxGeometry(Math.max(0.14, width * 0.18), height * 0.34, 0.035),
    new THREE.MeshStandardMaterial({ color: 0x263b43, roughness: 0.3, metalness: 0.32 }),
    count,
  );
}

function createCivicWindowsMesh(
  count: number,
  width: number,
  height: number,
): THREE.InstancedMesh {
  return new THREE.InstancedMesh(
    new THREE.BoxGeometry(Math.max(0.12, width * 0.16), height * 0.22, 0.03),
    new THREE.MeshStandardMaterial({
      color: 0xaac0cc,
      emissive: 0x0a1a2a,
      emissiveIntensity: 0.04,
      roughness: 0.3,
      metalness: 0.25,
    }),
    count * 2,
  );
}

function populateCivicFacade(meshes: CivicFacadeMeshes, layout: CivicFacadeLayout): void {
  const { entrance, windows, canopy } = meshes;
  const { buildings, width, depth, height } = layout;
  const matrix = new THREE.Matrix4();
  buildings.forEach((building, index) => {
    const front = building.position[1] + depth * 0.085;
    matrix.makeTranslation(building.position[0] + width * 0.5, height * 0.18, front);
    entrance.setMatrixAt(index, matrix);
    matrix.makeTranslation(
      building.position[0] + width * 0.5,
      height * 0.4,
      front - 0.04,
    );
    canopy.setMatrixAt(index, matrix);
    [0.24, 0.76].forEach((offset, windowIndex) => {
      matrix.makeTranslation(building.position[0] + width * offset, height * 0.56, front);
      windows.setMatrixAt(index * 2 + windowIndex, matrix);
    });
  });
  entrance.instanceMatrix.needsUpdate = true;
  windows.instanceMatrix.needsUpdate = true;
  canopy.instanceMatrix.needsUpdate = true;
}

function addWindowBand(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
  height: number,
): void {
  const [width, depth] = renderInfo.size;
  const category = renderInfo.category;
  const definitionId = buildings[0]?.definitionId ?? "";
  const isTowerBuilding = isTower(definitionId);
  const fp = {
    group,
    buildings,
    width,
    depth,
    height,
    category,
    isTower: isTowerBuilding,
  };

  addIndividualWindowLayer({ ...fp, front: true });
  addIndividualWindowLayer({ ...fp, front: false });
  addFacadeSeparators({ ...fp, front: true });
  addFacadeSeparators({ ...fp, front: false });
  addWindowFrames({ ...fp, front: true });
  addWindowFrames({ ...fp, front: false });
}

function getWindowFloors(
  height: number,
  category: BuildingCategory,
  isTower: boolean,
): number {
  if (isTower) return Math.max(6, Math.round(height / 0.7));
  if (category === "commercial") return Math.max(3, Math.round(height / 0.55));
  if (category === "industrial") return Math.max(2, Math.round(height / 0.65));
  return Math.max(2, Math.round(height / 0.5));
}

function getWindowColumns(
  facadeWidth: number,
  category: BuildingCategory,
  isTower: boolean,
): number {
  if (isTower) return Math.max(5, Math.round(facadeWidth * 3.5));
  if (category === "commercial") return Math.max(4, Math.round(facadeWidth * 3));
  if (category === "industrial") return Math.max(2, Math.round(facadeWidth * 2));
  return Math.max(3, Math.round(facadeWidth * 2.5));
}

interface WindowInstance {
  x: number;
  z: number;
  y: number;
  color: number;
}

function addIndividualWindowLayer(p: FacadeParams): void {
  const facadeW = p.front ? p.width : p.depth;
  const columns = getWindowColumns(facadeW, p.category, p.isTower);
  const floors = getWindowFloors(p.height, p.category, p.isTower);
  if (columns === 0 || floors === 0) return;

  const windowW = Math.min(0.065, (facadeW * 0.5) / columns);
  const windowH = Math.min(0.07, (p.height * 0.48) / floors);
  const geo = new THREE.BoxGeometry(windowW, windowH, 0.015);
  const allWindows = collectWindowInstances(p, floors, columns);

  const litWindows = allWindows.filter((w) => w.color !== 0);
  const darkWindows = allWindows.filter((w) => w.color === 0);

  if (litWindows.length > 0) {
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.12,
      metalness: 0.3,
      emissive: 0xffffff,
      emissiveIntensity: 0.06,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, litWindows.length);
    const m = new THREE.Matrix4();
    litWindows.forEach((w, idx) => {
      m.makeTranslation(w.x, w.y, w.z);
      mesh.setMatrixAt(idx, m);
      mesh.setColorAt(idx, new THREE.Color(w.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.name = p.front ? "windows:front:lit" : "windows:side:lit";
    p.group.add(mesh);
  }
  if (darkWindows.length > 0) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x080c14,
      roughness: 0.08,
      metalness: 0.45,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, darkWindows.length);
    const m = new THREE.Matrix4();
    darkWindows.forEach((w, idx) => {
      m.makeTranslation(w.x, w.y, w.z);
      mesh.setMatrixAt(idx, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = p.front ? "windows:front:dark" : "windows:side:dark";
    p.group.add(mesh);
  }
}

function collectWindowInstances(
  p: Pick<FacadeParams, "buildings" | "width" | "depth" | "height" | "front">,
  floors: number,
  columns: number,
): WindowInstance[] {
  const first = p.buildings[0];
  const seed = first ? getVisualHash(first.position[0], first.position[1]) : 0;
  const litRatio = 0.28 + (seed % 5) * 0.05;
  const result: WindowInstance[] = [];

  p.buildings.forEach((building, buildingIndex) => {
    const bx = building.position[0];
    const bz = building.position[1];
    for (let floor = 0; floor < floors; floor += 1) {
      for (let col = 0; col < columns; col += 1) {
        const hash = getVisualHash(buildingIndex * 1000 + floor * 50 + col, 7);
        const lit = hash % 100 < litRatio * 100;
        const y = p.height * (0.12 + ((floor + 0.5) / floors) * 0.72);
        const hPos = (col + 1) / (columns + 1);
        const x = p.front ? bx + p.width * hPos : bx + p.width * 0.07;
        const z = p.front ? bz + p.depth * 0.915 : bz + p.depth * hPos;
        result.push({ x, z, y, color: getIndividualWindowColor(hash, lit) });
      }
    }
  });
  return result;
}

const WINDOW_COLORS: number[] = [
  0xffdd99, 0x88bbdd, 0xddccaa, 0x6688aa, 0xeeddaa, 0xaaccdd, 0xffaa66, 0xbbddff,
  0xffcc88, 0xdde8ee,
];

function getIndividualWindowColor(hash: number, lit: boolean): number {
  if (!lit) return 0;
  return WINDOW_COLORS[hash % WINDOW_COLORS.length] ?? 0xdde8ee;
}

function addFacadeSeparators(p: FacadeParams): void {
  const facadeW = p.front ? p.width : p.depth;
  const floors = Math.max(2, Math.round(p.height / 0.75));
  if (floors < 2) return;

  const separatorD = 0.025;
  const separatorH = 0.012;
  const span = facadeW * 0.72;
  const cols = Math.max(2, Math.round(facadeW * 2));
  const totalCount = p.buildings.length * (floors - 1 + cols);

  const sepGeo = p.front
    ? new THREE.BoxGeometry(span, separatorH, separatorD)
    : new THREE.BoxGeometry(separatorD, separatorH, span);

  const mesh = new THREE.InstancedMesh(
    sepGeo,
    new THREE.MeshStandardMaterial({
      color: 0x2a363c,
      roughness: 0.5,
      metalness: 0.15,
    }),
    totalCount,
  );

  const m = new THREE.Matrix4();
  p.buildings.forEach((building, buildingIndex) => {
    let idx = 0;
    const bx = building.position[0];
    const bz = building.position[1];
    for (let floor = 1; floor < floors; floor += 1) {
      const y = p.height * (0.12 + (floor / floors) * 0.72);
      m.makeTranslation(
        p.front ? bx + p.width / 2 : bx + p.width * 0.07,
        y,
        p.front ? bz + p.depth * 0.915 : bz + p.depth / 2,
      );
      mesh.setMatrixAt(buildingIndex * (floors - 1 + cols) + idx, m);
      idx += 1;
    }
    for (let col = 0; col < cols; col += 1) {
      const hPos = (col + 1) / (cols + 1);
      const y = p.height * 0.48;
      m.makeTranslation(
        p.front ? bx + p.width * hPos : bx + p.width * 0.07,
        y,
        p.front ? bz + p.depth * 0.915 : bz + p.depth * hPos,
      );
      mesh.setMatrixAt(buildingIndex * (floors - 1 + cols) + (floors - 1) + col, m);
    }
  });

  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = p.front ? "separators:front" : "separators:side";
  p.group.add(mesh);
}

function addWindowFrames(p: FacadeParams): void {
  const facadeW = p.front ? p.width : p.depth;
  const floors = getWindowFloors(p.height, p.category, p.isTower);
  const columns = getWindowColumns(facadeW, p.category, p.isTower);
  if (columns === 0 || floors === 0) return;

  const windowW = Math.min(0.065, (facadeW * 0.5) / columns);
  const windowH = Math.min(0.07, (p.height * 0.48) / floors);
  const frameGeo = p.front
    ? new THREE.BoxGeometry(windowW + 0.004, 0.004, 0.005)
    : new THREE.BoxGeometry(0.005, 0.004, windowW + 0.004);
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x3a464c,
    roughness: 0.5,
    metalness: 0.2,
  });

  const totalCount = p.buildings.length * floors * columns;
  const hFrames = new THREE.InstancedMesh(frameGeo, frameMat, totalCount * 2);
  const m = new THREE.Matrix4();
  const inset = 0.002;

  p.buildings.forEach((building, buildingIndex) => {
    const bx = building.position[0];
    const bz = building.position[1];
    for (let floor = 0; floor < floors; floor += 1) {
      for (let col = 0; col < columns; col += 1) {
        const baseIdx = (buildingIndex * floors * columns + floor * columns + col) * 2;
        const y = p.height * (0.12 + ((floor + 0.5) / floors) * 0.72);
        const hPos = (col + 1) / (columns + 1);
        const wx = p.front ? bx + p.width * hPos : bx + p.width * 0.068;
        const wz = p.front ? bz + p.depth * 0.913 : bz + p.depth * hPos;
        m.makeTranslation(wx, y - windowH / 2 - inset, wz);
        hFrames.setMatrixAt(baseIdx, m);
        m.makeTranslation(wx, y + windowH / 2 + inset, wz);
        hFrames.setMatrixAt(baseIdx + 1, m);
      }
    }
  });

  hFrames.instanceMatrix.needsUpdate = true;
  hFrames.name = p.front ? "frames:front" : "frames:side";
  hFrames.receiveShadow = true;
  p.group.add(hFrames);
}

function addTowerCaps(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
  height: number,
): void {
  const [width, depth] = renderInfo.size;
  const mesh = new THREE.InstancedMesh(
    new RoundedBoxGeometry(width * 0.44, 0.08, depth * 0.44, 2, 0.025),
    new THREE.MeshStandardMaterial({ color: 0x3d4a4d, roughness: 0.62, metalness: 0.16 }),
    buildings.length,
  );
  const matrix = new THREE.Matrix4();
  buildings.forEach((building, index) => {
    matrix.makeTranslation(
      building.position[0] + width / 2,
      height + 0.06,
      building.position[1] + depth / 2,
    );
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
}

function addTowerSetbacks(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
  height: number,
  definitionId: string,
): void {
  const selected = buildings.filter(
    (_building, index) => getVisualHash(index, definitionId.length) % 4 === 0,
  );
  if (selected.length === 0) return;
  const [width, depth] = renderInfo.size;
  const upperHeight = height * 0.17;
  const mesh = new THREE.InstancedMesh(
    new RoundedBoxGeometry(width * 0.5, upperHeight, depth * 0.5, 2, 0.035),
    new THREE.MeshStandardMaterial({
      color: 0x536c78,
      roughness: 0.38,
      metalness: 0.2,
    }),
    selected.length,
  );
  const matrix = new THREE.Matrix4();
  selected.forEach((building, index) => {
    matrix.makeTranslation(
      building.position[0] + width * 0.5,
      height + upperHeight * 0.5,
      building.position[1] + depth * 0.5,
    );
    mesh.setMatrixAt(index, matrix);
  });
  mesh.castShadow = true;
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
}

function addTowerPodiums(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
): void {
  const [width, depth] = renderInfo.size;
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(width * 0.9, 0.22, depth * 0.9),
    new THREE.MeshStandardMaterial({ color: 0x657073, roughness: 0.7 }),
    buildings.length,
  );
  const matrix = new THREE.Matrix4();
  buildings.forEach((building, index) => {
    matrix.makeTranslation(
      building.position[0] + width * 0.5,
      0.11,
      building.position[1] + depth * 0.5,
    );
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
}

function addTowerBalconies(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
  height: number,
): void {
  const [width, depth] = renderInfo.size;
  const floors = Math.min(5, Math.max(3, Math.round(height / 1.2)));
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(width * 0.62, 0.035, 0.07),
    new THREE.MeshStandardMaterial({
      color: 0x4c5b60,
      roughness: 0.42,
      metalness: 0.38,
    }),
    buildings.length * floors,
  );
  const matrix = new THREE.Matrix4();
  buildings.forEach((building, buildingIndex) => {
    for (let floor = 0; floor < floors; floor += 1) {
      matrix.makeTranslation(
        building.position[0] + width * 0.5,
        height * (0.24 + ((floor + 1) / floors) * 0.62),
        building.position[1] + depth * 0.95,
      );
      mesh.setMatrixAt(buildingIndex * floors + floor, matrix);
    }
  });
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
}

function addPyramidRoofs(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
  height: number,
): void {
  const [width, depth] = renderInfo.size;
  const pitchedBuildings = buildings.filter(
    (_building, index) => getVisualHash(index, width + depth) % 3 !== 0,
  );
  if (pitchedBuildings.length === 0) return;
  const mesh = new THREE.InstancedMesh(
    new THREE.ConeGeometry(Math.max(width, depth) * 0.56, 0.42, 4),
    new THREE.MeshStandardMaterial({ color: 0x6e3933, roughness: 0.8 }),
    pitchedBuildings.length,
  );
  const matrix = new THREE.Matrix4();
  pitchedBuildings.forEach((building, index) => {
    const roofColor = new THREE.Color(0x6e3933);
    roofColor.offsetHSL(0, 0, ((index % 5) - 2) * 0.035);
    matrix.makeTranslation(
      building.position[0] + width / 2,
      height + 0.19,
      building.position[1] + depth / 2,
    );
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, roofColor);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  group.add(mesh);
}

function addFlatHouseRoofs(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
  height: number,
): void {
  const [width, depth] = renderInfo.size;
  const flatBuildings = buildings.filter(
    (_building, index) => getVisualHash(index, width + depth) % 3 === 0,
  );
  if (flatBuildings.length === 0) return;
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(width * 0.7, 0.1, depth * 0.7),
    new THREE.MeshStandardMaterial({ color: 0x4e5960, roughness: 0.62 }),
    flatBuildings.length,
  );
  const matrix = new THREE.Matrix4();
  flatBuildings.forEach((building, index) => {
    matrix.makeTranslation(
      building.position[0] + width * 0.5,
      height + 0.05,
      building.position[1] + depth * 0.5,
    );
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
}

function addResidentialFacade(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
  height: number,
): void {
  const [width, depth] = renderInfo.size;
  const doors = new THREE.InstancedMesh(
    new THREE.BoxGeometry(Math.max(0.13, width * 0.16), height * 0.36, 0.028),
    new THREE.MeshStandardMaterial({ color: 0x493226, roughness: 0.72 }),
    buildings.length,
  );
  const windows = new THREE.InstancedMesh(
    new THREE.BoxGeometry(Math.max(0.12, width * 0.17), height * 0.22, 0.025),
    new THREE.MeshStandardMaterial({
      color: 0xd0e2e6,
      emissive: 0x1a3038,
      emissiveIntensity: 0.07,
      roughness: 0.28,
    }),
    buildings.length * 2,
  );
  const matrix = new THREE.Matrix4();
  buildings.forEach((building, index) => {
    const front = building.position[1] + depth * 0.085;
    matrix.makeTranslation(building.position[0] + width * 0.5, height * 0.18, front);
    doors.setMatrixAt(index, matrix);
    [0.27, 0.73].forEach((offset, windowIndex) => {
      matrix.makeTranslation(building.position[0] + width * offset, height * 0.53, front);
      windows.setMatrixAt(index * 2 + windowIndex, matrix);
    });
  });
  doors.instanceMatrix.needsUpdate = true;
  windows.instanceMatrix.needsUpdate = true;
  group.add(doors, windows);
}

function addResidentialYards(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
): void {
  const [width, depth] = renderInfo.size;
  const lawns = new THREE.InstancedMesh(
    new THREE.BoxGeometry(width * 0.92, 0.018, depth * 0.92),
    new THREE.MeshStandardMaterial({ color: 0x507f3a, roughness: 0.96 }),
    buildings.length,
  );
  const fences = new THREE.InstancedMesh(
    new THREE.BoxGeometry(Math.max(0.2, width * 0.54), 0.12, 0.025),
    new THREE.MeshStandardMaterial({ color: 0xd6d0be, roughness: 0.82 }),
    buildings.length,
  );
  const matrix = new THREE.Matrix4();
  buildings.forEach((building, index) => {
    matrix.makeTranslation(
      building.position[0] + width * 0.5,
      0.012,
      building.position[1] + depth * 0.5,
    );
    lawns.setMatrixAt(index, matrix);
    matrix.makeTranslation(
      building.position[0] + width * 0.5,
      0.06,
      building.position[1] + depth * 0.94,
    );
    fences.setMatrixAt(index, matrix);
  });
  lawns.instanceMatrix.needsUpdate = true;
  fences.instanceMatrix.needsUpdate = true;
  group.add(lawns, fences);
}

function addStorefronts(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
  height: number,
): void {
  const [width, depth] = renderInfo.size;
  const windows = new THREE.InstancedMesh(
    new THREE.BoxGeometry(width * 0.24, Math.max(0.18, height * 0.28), 0.028),
    createStorefrontWindowMaterial(),
    buildings.length * 2,
  );
  const doors = new THREE.InstancedMesh(
    new THREE.BoxGeometry(
      Math.max(0.13, width * 0.16),
      Math.max(0.2, height * 0.3),
      0.035,
    ),
    new THREE.MeshStandardMaterial({
      color: 0x213740,
      emissive: 0x10262e,
      emissiveIntensity: 0.16,
      roughness: 0.28,
      metalness: 0.32,
    }),
    buildings.length,
  );
  const signs = new THREE.InstancedMesh(
    new THREE.BoxGeometry(width * 0.5, 0.1, 0.045),
    new THREE.MeshStandardMaterial({
      color: 0x1a3a4a,
      emissive: 0x0e2230,
      emissiveIntensity: 0.12,
      roughness: 0.52,
    }),
    buildings.length,
  );
  const matrix = new THREE.Matrix4();
  buildings.forEach((building, index) => {
    const front = building.position[1] + depth * 0.085;
    [0.27, 0.73].forEach((offset, windowIndex) => {
      matrix.makeTranslation(building.position[0] + width * offset, height * 0.28, front);
      windows.setMatrixAt(index * 2 + windowIndex, matrix);
    });
    matrix.makeTranslation(
      building.position[0] + width * 0.5,
      height * 0.22,
      front - 0.006,
    );
    doors.setMatrixAt(index, matrix);
    matrix.makeTranslation(building.position[0] + width * 0.5, height * 0.63, front);
    signs.setMatrixAt(index, matrix);
  });
  windows.instanceMatrix.needsUpdate = true;
  doors.instanceMatrix.needsUpdate = true;
  signs.instanceMatrix.needsUpdate = true;
  group.add(windows, doors, signs);
}

function createStorefrontWindowMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x88b5c4,
    emissive: 0x183038,
    emissiveIntensity: 0.1,
    roughness: 0.28,
    metalness: 0.3,
  });
}

function addChimneys(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
  height: number,
): void {
  const [width, depth] = renderInfo.size;
  const mesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.11, 0.15, 0.65, 8),
    new THREE.MeshStandardMaterial({ color: 0x7e6355, roughness: 0.9 }),
    buildings.length,
  );
  const matrix = new THREE.Matrix4();
  buildings.forEach((building, index) => {
    matrix.makeTranslation(
      building.position[0] + width * 0.32,
      height + 0.325,
      building.position[1] + depth * 0.32,
    );
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
}

function addLoadingDocks(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
): void {
  const [width, depth] = renderInfo.size;
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(Math.max(0.3, width * 0.28), 0.22, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x29343a, roughness: 0.76 }),
    buildings.length,
  );
  const matrix = new THREE.Matrix4();
  buildings.forEach((building, index) => {
    matrix.makeTranslation(
      building.position[0] + width * 0.5,
      0.16,
      building.position[1] + depth * 0.085,
    );
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
}

function addIndustrialRoofVents(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
  height: number,
): void {
  const [width, depth] = renderInfo.size;
  const mesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.11, 0.15, 0.18, 10),
    new THREE.MeshStandardMaterial({ color: 0x536168, roughness: 0.64, metalness: 0.24 }),
    buildings.length * 2,
  );
  const matrix = new THREE.Matrix4();
  const ventPositions: [number, number][] = [
    [0.62, 0.34],
    [0.38, 0.65],
  ];
  buildings.forEach((building, index) => {
    ventPositions.forEach(([x, y], offset) => {
      matrix.makeTranslation(
        building.position[0] + width * x,
        height + 0.09,
        building.position[1] + depth * y,
      );
      mesh.setMatrixAt(index * 2 + offset, matrix);
    });
  });
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
}

function addCivicRoofProps(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
  height: number,
): void {
  const [width, depth] = renderInfo.size;
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(
      Math.max(0.16, width * 0.19),
      0.16,
      Math.max(0.16, depth * 0.19),
    ),
    new THREE.MeshStandardMaterial({ color: 0x657177, roughness: 0.64, metalness: 0.18 }),
    buildings.length,
  );
  const matrix = new THREE.Matrix4();
  buildings.forEach((building, index) => {
    matrix.makeTranslation(
      building.position[0] + width * 0.68,
      height + 0.08,
      building.position[1] + depth * 0.35,
    );
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
}

function addResidentialEntrances(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
  height: number,
): void {
  const [width, depth] = renderInfo.size;
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(Math.max(0.14, width * 0.18), height * 0.32, 0.035),
    new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 0.72 }),
    buildings.length,
  );
  const glow = new THREE.InstancedMesh(
    new THREE.BoxGeometry(Math.max(0.1, width * 0.12), height * 0.12, 0.01),
    new THREE.MeshStandardMaterial({
      color: 0xeeddaa,
      emissive: 0xffdd99,
      emissiveIntensity: 0.04,
      roughness: 0.3,
      metalness: 0.2,
    }),
    buildings.length,
  );
  const matrix = new THREE.Matrix4();
  buildings.forEach((building, index) => {
    const front = building.position[1] + depth * 0.085;
    matrix.makeTranslation(building.position[0] + width * 0.5, height * 0.16, front);
    mesh.setMatrixAt(index, matrix);
    matrix.makeTranslation(
      building.position[0] + width * 0.5,
      height * 0.22,
      front + 0.005,
    );
    glow.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  glow.instanceMatrix.needsUpdate = true;
  group.add(mesh, glow);
}

function addRooftopProps(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
  height: number,
  includeWaterTank: boolean,
): void {
  const [width, depth] = renderInfo.size;
  const selected = buildings.filter(
    (_building, index) => getVisualHash(index, Math.round(height * 10)) % 2 === 0,
  );
  if (selected.length === 0) return;

  const tankMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.16, 0.18, 0.22, 12),
    new THREE.MeshStandardMaterial({ color: 0x4a5a60, roughness: 0.6, metalness: 0.2 }),
    selected.length,
  );
  const antennaMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.006, 0.008, 0.35, 4),
    new THREE.MeshStandardMaterial({ color: 0x5a6870, roughness: 0.5, metalness: 0.3 }),
    selected.length,
  );
  const hvacMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.12, 0.08, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x6a7a80, roughness: 0.5, metalness: 0.3 }),
    selected.length,
  );
  const matrix = new THREE.Matrix4();
  selected.forEach((building, index) => {
    const bx = building.position[0] + width * 0.5;
    const bz = building.position[1] + depth * 0.5;
    if (includeWaterTank) {
      matrix.makeTranslation(bx + width * 0.2, height + 0.11, bz);
      tankMesh.setMatrixAt(index, matrix);
    }
    matrix.makeTranslation(bx - width * 0.2, height + 0.18, bz);
    antennaMesh.setMatrixAt(index, matrix);
    matrix.makeTranslation(bx + width * 0.15, height + 0.04, bz + depth * 0.2);
    hvacMesh.setMatrixAt(index, matrix);
  });
  tankMesh.instanceMatrix.needsUpdate = true;
  antennaMesh.instanceMatrix.needsUpdate = true;
  hvacMesh.instanceMatrix.needsUpdate = true;
  group.add(tankMesh, antennaMesh, hvacMesh);
}

function addParkTrees(
  group: THREE.Group,
  renderInfo: BuildingRenderInfo,
  buildings: CityState["buildings"],
): void {
  const [width, depth] = renderInfo.size;
  const trunk = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.04, 0.06, 0.32, 6),
    new THREE.MeshStandardMaterial({ color: 0x724e2d, roughness: 0.9 }),
    buildings.length * 3,
  );
  const canopy = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.22, 0.55, 7),
    new THREE.MeshStandardMaterial({ color: 0x2e713b, roughness: 0.92 }),
    buildings.length * 3,
  );
  const matrix = new THREE.Matrix4();
  buildings.forEach((building, index) => {
    [
      [0.28, 0.28],
      [0.7, 0.42],
      [0.46, 0.72],
    ].forEach(([x = 0, y = 0], offset) => {
      const treeIndex = index * 3 + offset;
      matrix.makeTranslation(
        building.position[0] + width * x,
        0.16,
        building.position[1] + depth * y,
      );
      trunk.setMatrixAt(treeIndex, matrix);
      matrix.makeTranslation(
        building.position[0] + width * x,
        0.59,
        building.position[1] + depth * y,
      );
      canopy.setMatrixAt(treeIndex, matrix);
    });
  });
  trunk.instanceMatrix.needsUpdate = true;
  canopy.instanceMatrix.needsUpdate = true;
  group.add(trunk, canopy);
}

function isTower(definitionId: string): boolean {
  return definitionId.includes("apartment") || definitionId.includes("office");
}

function renderPollutionOverlay(group: THREE.Group, state: CityState): void {
  state.map.flat().forEach((tile) => {
    if (tile.pollution <= 0) return;
    const mesh = createPlane(
      COLORS.pollution,
      Math.min(0.55, tile.pollution / 120),
      0.03,
    );
    mesh.position.set(tile.x + 0.5, 0.03, tile.y + 0.5);
    group.add(mesh);
  });
}

function renderRadiusOverlay(
  group: THREE.Group,
  state: CityState,
  effect: RadiusEffect,
  color: number,
  getBuildingRenderInfo: BuildingRenderInfoLookup,
): void {
  state.buildings.forEach((building) => {
    const radius = getBuildingRenderInfo(building.definitionId)?.effects[effect] ?? 0;
    if (radius <= 0) return;
    const visual = createRadiusArea(color, 0.12, 0.028, radius);
    visual.name = `radius-overlay:${building.id}:${effect}`;
    visual.position.set(building.position[0] + 0.5, 0, building.position[1] + 0.5);
    group.add(visual);
  });
}

function renderSelectedBuildingRadius(
  group: THREE.Group,
  state: CityState,
  selectedTile: UIState["selectedTile"],
  getBuildingRenderInfo: BuildingRenderInfoLookup,
): void {
  if (!selectedTile) return;
  const tile = state.map[selectedTile[1]]?.[selectedTile[0]];
  if (!tile?.buildingId) return;
  const building = state.buildings.find((item) => item.id === tile.buildingId);
  const renderInfo = building ? getBuildingRenderInfo(building.definitionId) : null;
  if (!building || !renderInfo) return;
  addRadiusVisuals(group, {
    origin: building.position,
    renderInfo,
    opacity: 0.2,
    y: 0.082,
    namePrefix: `radius-selected:${building.id}`,
  });
}

function addRadiusVisuals(
  group: THREE.Group,
  options: {
    origin: [number, number];
    renderInfo: BuildingRenderInfo;
    opacity: number;
    y: number;
    namePrefix: string;
  },
): void {
  getRadiusEffects(options.renderInfo).forEach(({ effect, radius }, index) => {
    const visual = createRadiusArea(
      getRadiusColor(effect),
      options.opacity,
      options.y + index * 0.006,
      radius,
    );
    visual.name = `${options.namePrefix}:${effect}`;
    visual.position.set(options.origin[0] + 0.5, 0, options.origin[1] + 0.5);
    group.add(visual);
  });
}

function getRadiusEffects(
  renderInfo: BuildingRenderInfo,
): { effect: RadiusEffect; radius: number }[] {
  const effects: RadiusEffect[] = [
    "healthRadius",
    "educationRadius",
    "policeRadius",
    "fireRadius",
    "garbageCollectionRadius",
  ];
  return effects
    .map((effect) => ({ effect, radius: renderInfo.effects[effect] ?? 0 }))
    .filter(({ radius }) => radius > 0);
}

function getRadiusColor(effect: RadiusEffect): number {
  if (effect === "healthRadius") return COLORS.health;
  if (effect === "educationRadius") return COLORS.education;
  if (effect === "policeRadius") return COLORS.police;
  if (effect === "fireRadius") return COLORS.fire;
  return COLORS.garbage;
}

function createRadiusArea(
  color: number,
  opacity: number,
  yPosition: number,
  radius: number,
): THREE.Group {
  const group = new THREE.Group();
  group.add(createRadiusDisc(color, opacity, yPosition, radius));
  group.add(createRadiusBorder(color, Math.min(0.9, opacity + 0.34), yPosition, radius));
  return group;
}

function createRadiusDisc(
  color: number,
  opacity: number,
  yPosition: number,
  radius: number,
): THREE.Mesh {
  const extent = radius + 0.5;
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(extent, RADIUS_OVERLAY_SEGMENTS),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = yPosition;
  mesh.name = "radius-fill";
  mesh.renderOrder = 3;
  return mesh;
}

function createRadiusBorder(
  color: number,
  opacity: number,
  yPosition: number,
  radius: number,
): THREE.LineLoop {
  const extent = radius + 0.5;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(getCircleBorderPositions(extent, yPosition), 3),
  );
  const line = new THREE.LineLoop(
    geometry,
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    }),
  );
  line.name = "radius-border";
  line.renderOrder = 4;
  return line;
}

function getCircleBorderPositions(radius: number, yPosition: number): number[] {
  return Array.from({ length: RADIUS_OVERLAY_SEGMENTS }, (_unused, index) => {
    const angle = (index / RADIUS_OVERLAY_SEGMENTS) * Math.PI * 2;
    return [Math.cos(angle) * radius, yPosition, Math.sin(angle) * radius];
  }).flat();
}

function renderWarnings(
  group: THREE.Group,
  state: CityState,
  getBuildingRenderInfo: BuildingRenderInfoLookup,
): void {
  collectBuildingFeedbackMarkers(state, getBuildingRenderInfo).forEach((marker) =>
    group.add(createBuildingFeedbackMarker(marker, getBuildingRenderInfo)),
  );
  state.warnings.slice(0, 60).forEach((warning) => {
    if (!warning.targetTile || isTypedBuildingWarning(warning.id)) return;
    const mesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.45, 3),
      new THREE.MeshBasicMaterial({ color: COLORS.warning }),
    );
    mesh.position.set(warning.targetTile[0] + 0.5, 1.25, warning.targetTile[1] + 0.5);
    group.add(mesh);
  });
}

function collectBuildingFeedbackMarkers(
  state: CityState,
  getBuildingRenderInfo: BuildingRenderInfoLookup,
): BuildingFeedbackMarker[] {
  return [
    ...collectUtilityFeedbackMarkers(state),
    ...collectUnemploymentFeedbackMarkers(state, getBuildingRenderInfo),
  ].map((marker, index, markers) => ({
    ...marker,
    offsetIndex: getMarkerOffsetIndex(marker, markers.slice(0, index)),
  }));
}

function collectUtilityFeedbackMarkers(state: CityState): BuildingFeedbackMarker[] {
  return state.warnings.flatMap((warning) => {
    const type = getUtilityFeedbackType(warning.id);
    if (!type || !warning.targetBuilding) return [];
    const building = state.buildings.find((item) => item.id === warning.targetBuilding);
    return building ? [{ type, building, offsetIndex: 0 }] : [];
  });
}

function collectUnemploymentFeedbackMarkers(
  state: CityState,
  getBuildingRenderInfo: BuildingRenderInfoLookup,
): BuildingFeedbackMarker[] {
  let remainingUnemployed = state.population.unemployedWorkers;
  if (remainingUnemployed <= 0) return [];
  return state.buildings.flatMap((building) => {
    if (remainingUnemployed <= 0 || building.status !== "active") return [];
    const renderInfo = getBuildingRenderInfo(building.definitionId);
    const capacity = renderInfo?.effects.populationCapacity ?? 0;
    if (renderInfo?.category !== "residential" || capacity <= 0) return [];
    remainingUnemployed -= capacity;
    return [{ type: "unemployment" as const, building, offsetIndex: 0 }];
  });
}

function getUtilityFeedbackType(
  warningId: string,
): BuildingFeedbackMarker["type"] | null {
  if (warningId.endsWith(":no-power")) return "no-power";
  if (warningId.endsWith(":no-water")) return "no-water";
  return null;
}

function getMarkerOffsetIndex(
  marker: BuildingFeedbackMarker,
  previous: BuildingFeedbackMarker[],
): number {
  return previous.filter((item) => item.building.id === marker.building.id).length;
}

function isTypedBuildingWarning(warningId: string): boolean {
  return getUtilityFeedbackType(warningId) !== null;
}

function createBuildingFeedbackMarker(
  marker: BuildingFeedbackMarker,
  getBuildingRenderInfo: BuildingRenderInfoLookup,
): THREE.Group {
  const renderInfo = getBuildingRenderInfo(marker.building.definitionId);
  const height = renderInfo
    ? getBuildingHeight(
        renderInfo.category,
        marker.building.status === "constructing",
        marker.building.definitionId,
      )
    : 1;
  const group = createFeedbackSymbol(marker.type);
  group.name = `feedback:${marker.type}:${marker.building.id}`;
  group.position.set(
    marker.building.position[0] + 0.5,
    height + 0.56 + marker.offsetIndex * 0.3,
    marker.building.position[1] + 0.5,
  );
  return group;
}

function createFeedbackSymbol(type: BuildingFeedbackMarker["type"]): THREE.Group {
  if (type === "no-power") return createPowerFeedbackSymbol();
  if (type === "no-water") return createWaterFeedbackSymbol();
  return createUnemploymentFeedbackSymbol();
}

function createPowerFeedbackSymbol(): THREE.Group {
  const group = createFeedbackBase(COLORS.powerFeedback);
  const bolt = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.32, 3),
    new THREE.MeshBasicMaterial({ color: 0x252017 }),
  );
  bolt.rotation.z = Math.PI;
  bolt.position.y = 0.08;
  group.add(bolt);
  return group;
}

function createWaterFeedbackSymbol(): THREE.Group {
  const group = createFeedbackBase(COLORS.waterFeedback);
  const drop = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xe9f8ff }),
  );
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 0.14, 10),
    new THREE.MeshBasicMaterial({ color: 0xe9f8ff }),
  );
  drop.position.y = 0.055;
  tip.position.y = 0.18;
  group.add(drop, tip);
  return group;
}

function createUnemploymentFeedbackSymbol(): THREE.Group {
  const group = createFeedbackBase(COLORS.unemploymentFeedback);
  const caseBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.19, 0.1, 0.08),
    new THREE.MeshBasicMaterial({ color: 0x2d2419 }),
  );
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.035, 0.06),
    new THREE.MeshBasicMaterial({ color: 0x2d2419 }),
  );
  caseBody.position.y = 0.08;
  handle.position.y = 0.16;
  group.add(caseBody, handle);
  return group;
}

function createFeedbackBase(color: number): THREE.Group {
  const group = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.24, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  const badge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.045, 18),
    new THREE.MeshBasicMaterial({ color }),
  );
  stem.position.y = -0.12;
  badge.position.y = 0.02;
  group.add(stem, badge);
  return group;
}

function createPlane(
  color: number,
  opacity: number,
  yPosition: number,
  size = TILE_SIZE,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = yPosition;
  return mesh;
}

function getZoneColor(zone: ZoneType): number {
  if (zone.includes("residential")) return COLORS.residential;
  if (zone.includes("commercial") || zone === "office") return COLORS.commercial;
  return COLORS.industrial;
}

function getBuildingColor(
  category: BuildingCategory,
  status: string,
  definitionId = "",
): number {
  if (status === "constructing") return 0xb0bec5;
  if (status === "abandoned") return 0x5f6368;
  return getDefinitionColor(definitionId) ?? getCategoryColor(category);
}

function getDefinitionColor(definitionId: string): number | null {
  if (definitionId.includes("house")) return 0xc58f71;
  if (definitionId.includes("apartment")) return 0x929294;
  if (definitionId.includes("office")) return 0x5b7180;
  if (definitionId.includes("shop") || definitionId.includes("store")) return 0x9a7254;
  if (definitionId.includes("factory") || definitionId.includes("plant")) return 0x786e63;
  if (definitionId.includes("hotel")) return 0x9a8f7b;
  if (definitionId.includes("city_hall")) return 0xc4b49c;
  return null;
}

function getCategoryColor(category: BuildingCategory): number {
  if (category === "residential") return COLORS.residential;
  if (category === "commercial") return COLORS.commercial;
  if (category === "industrial") return COLORS.industrial;
  if (category === "utility") return COLORS.utility;
  if (category === "service") return COLORS.service;
  if (category === "decoration") return COLORS.decoration;
  return COLORS.civic;
}

function getBuildingVariation(
  category: BuildingCategory,
  status: string,
  definitionId: string,
  index: number,
): THREE.Color {
  const color = new THREE.Color(getBuildingColor(category, status, definitionId));
  const variation = ((index * 17 + definitionId.length * 7) % 9) - 4;
  color.offsetHSL(0, 0, variation * 0.012);
  return color;
}

function getBuildingFootprintScale(definitionId: string, index: number): number {
  const variation = (getVisualHash(index, definitionId.length) % 5) * 0.012;
  return 0.96 - variation;
}

function getVisualHash(x: number, y: number): number {
  return Math.abs((x * 92837111) ^ (y * 689287499));
}

function getBuildingHeight(
  category: BuildingCategory,
  constructing: boolean,
  definitionId = "",
): number {
  if (constructing) return 0.35;
  return getDefinitionHeight(definitionId) ?? getCategoryHeight(category);
}

function getDefinitionHeight(definitionId: string): number | null {
  if (definitionId.includes("apartment")) return 5.6;
  if (definitionId.includes("large_office")) return 8.2;
  if (definitionId.includes("office")) return 6.8;
  if (definitionId.includes("clocktower")) return 5.8;
  if (definitionId.includes("university") || definitionId.includes("medical_center"))
    return 2.2;
  return null;
}

function getCategoryHeight(category: BuildingCategory): number {
  if (category === "residential") return 0.85;
  if (category === "commercial") return 1.15;
  if (category === "industrial") return 1.35;
  if (category === "utility") return 1.6;
  if (category === "service") return 1.25;
  return 0.55;
}

function clearGroup(group: THREE.Group): void {
  group.children.forEach(disposeObject);
  group.clear();
}

function disposeObject(object: THREE.Object3D): void {
  if (object.userData.generatedAssetInstance) return;
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
      child.geometry.dispose();
      disposeMaterial(child.material);
    }
  });
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    material.forEach((entry) => entry.dispose());
    return;
  }
  material.dispose();
}
