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
import { getTiledTexture } from "./textures";

const TILE_SIZE = 1;

const COLORS = {
  road: 0x303a40,
  sidewalk: 0x465158,
  laneMarking: 0xf4dfae,
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

export interface BuildingRenderInfo {
  size: BuildingDefinition["size"];
  category: BuildingCategory;
  effects: Pick<BuildingDefinition["effects"], "healthRadius" | "educationRadius">;
}

export interface CityRenderOptions {
  assetSource?: CityAssetSource;
  detailDensity?: number;
}

export type BuildingRenderInfoLookup = (
  definitionId: string,
) => BuildingRenderInfo | null;

interface FacadeWindowParams {
  building: CityState["buildings"][number];
  buildingIndex: number;
  width: number;
  depth: number;
  height: number;
  floors: number;
  columns: number;
  front: boolean;
}

interface FacadeWindowConfig {
  width: number;
  depth: number;
  height: number;
  floors: number;
  columns: number;
  front: boolean;
}

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

interface GeneratedAssetPlacement {
  position: [number, number, number];
  rotation?: number;
  scale?: number;
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
      default: [0, 5],
      medium_house: [2, 7],
      high_apartment: [5, 10],
    },
    commercial: {
      default: [0, 4],
      medium_shop: [1, 6],
      large_store: [3, 9],
      small_office: [4, 10],
      large_office: [4, 10],
    },
    industrial: {
      default: [0, 4],
      medium_factory: [1, 5],
      large_plant: [2, 5],
    },
    civic: { default: [0, 5] },
  };

interface StreetRun {
  axis: StreetAxis;
  x: number;
  y: number;
  length: number;
  roadType: CityState["roads"][number]["type"];
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
  clearGroup(layers.roads);
  clearGroup(layers.terrain);
  clearGroup(layers.zones);
  clearGroup(layers.buildings);
  clearGroup(layers.overlays);
  clearGroup(layers.warnings);
  layers.waterMaterials = [];
  renderTerrain(
    layers.terrain,
    state,
    layers.waterMaterials,
    options.assetSource,
    detailDensity,
  );
  renderZones(layers.zones, state);
  renderRoads(layers.roads, state, options.assetSource, detailDensity);
  renderBuildings(layers.buildings, state, getBuildingRenderInfo, options.assetSource);
  renderOverlay(layers.overlays, state, activeOverlay, getBuildingRenderInfo);
  renderWarnings(layers.warnings, state);
}

export function animateCityRenderLayers(
  layers: CityRenderLayers,
  elapsedSeconds: number,
): void {
  animateWater(layers.waterMaterials, elapsedSeconds);
}

export function syncPlacementPreview(
  layer: THREE.Group,
  preview: UIState["placementPreview"],
): void {
  clearGroup(layer);
  if (!preview) return;
  const color = preview.valid ? COLORS.preview : COLORS.invalid;
  preview.positions.forEach(([x, y]) => {
    const mesh = createPlane(color, 0.42, 0.045);
    mesh.position.set(x + 0.5, 0.045, y + 0.5);
    layer.add(mesh);
  });
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
  state.roads.forEach((road) => addGeneratedRoad(group, assetSource, road));
  addGeneratedStreetlights(group, state.roads, assetSource, detailDensity);
  addGeneratedTrafficLights(group, state.roads, assetSource, detailDensity);
  addGeneratedTraffic(group, state.roads, assetSource, detailDensity);
  addGeneratedRoadProps(group, state.roads, assetSource, detailDensity);
}

function addGeneratedRoad(
  group: THREE.Group,
  assetSource: CityAssetSource,
  road: CityState["roads"][number],
): void {
  addGeneratedAsset(group, assetSource, getRoadAssetId(road), {
    position: [road.position[0] + 0.5, 0, road.position[1] + 0.5],
    rotation: getRoadRotation(road),
  });
}

function getRoadAssetId(road: CityState["roads"][number]): string {
  const connections = getRoadConnectionCount(road);
  if (connections >= 4) return "road_4_way_intersection";
  if (connections === 3) return "road_t_intersection";
  if (road.type === "arterial" || road.type === "collector")
    return "road_4_lane_straight";
  if (road.type === "paved") return "road_with_sidewalks";
  return "road_2_lane_straight";
}

function getRoadRotation(road: CityState["roads"][number]): number {
  const { north, east, south, west } = road.connections;
  if (north || south) return 0;
  if (east || west) return Math.PI / 2;
  return 0;
}

function addGeneratedStreetlights(
  group: THREE.Group,
  roads: CityState["roads"],
  assetSource: CityAssetSource,
  detailDensity: number,
): void {
  roads
    .filter((road) => shouldPlaceRoadDetail(road, detailDensity, 9))
    .forEach((road) => {
      const [x, y] = road.position;
      const side = getVisualHash(x, y) % 2 === 0 ? -0.43 : 0.43;
      addGeneratedAsset(group, assetSource, "streetlight", {
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
  group: THREE.Group,
  roads: CityState["roads"],
  assetSource: CityAssetSource,
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
        addGeneratedAsset(group, assetSource, "traffic_light", {
          position: [x + 0.5 + offsetX, 0, y + 0.5 + offsetY],
          rotation: offsetX < 0 ? 0 : Math.PI,
          scale: 0.8,
        });
      });
    });
}

function addGeneratedTraffic(
  group: THREE.Group,
  roads: CityState["roads"],
  assetSource: CityAssetSource,
  detailDensity: number,
): void {
  if (detailDensity < 0.5) return;
  getDecorativeCars(roads).forEach((car, index) => {
    const id = index % 2 === 0 ? "car_compact" : "car_sedan";
    addGeneratedAsset(group, assetSource, id, {
      position: [car.x, 0, car.z],
      rotation: car.rotation,
      scale: 0.72,
    });
  });
}

function addGeneratedRoadProps(
  group: THREE.Group,
  roads: CityState["roads"],
  assetSource: CityAssetSource,
  detailDensity: number,
): void {
  if (detailDensity < 0.75) return;
  roads
    .filter((road) => shouldPlaceRoadDetail(road, detailDensity, 10))
    .forEach((road, index) => {
      const [x, y] = road.position;
      const assetId = index % 2 === 0 ? "road_sign" : "bus_stop";
      addGeneratedAsset(group, assetSource, assetId, {
        position: [x + 0.86, 0, y + 0.5],
        rotation: Math.PI / 2,
        scale: assetId === "bus_stop" ? 0.72 : 0.8,
      });
    });
}

function addGeneratedAsset(
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
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, layer === "surface" ? 0.055 : 0.04, 1),
    new THREE.MeshStandardMaterial({
      color: getStreetLayerColor(roadType, layer),
      map:
        layer === "surface"
          ? getTiledTexture("/textures/urban-asphalt-albedo.jpg", 2, 2)
          : null,
      roughness: layer === "surface" ? 0.72 : 0.84,
    }),
    runs.length,
  );
  const object = new THREE.Object3D();
  runs.forEach((run, index) => {
    setStreetRunTransform(object, run, layer === "surface" ? 0.065 : 0.02, layer);
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
  if (roadType === "arterial") return 0.96;
  if (roadType === "collector") return 0.88;
  return 0.78;
}

function getRoadColor(roadType: CityState["roads"][number]["type"]): number {
  if (roadType === "dirt") return 0x7e624b;
  if (roadType === "arterial") return 0x273035;
  if (roadType === "collector") return 0x30383d;
  return COLORS.road;
}

function getStreetLayerColor(
  roadType: CityState["roads"][number]["type"],
  layer: "sidewalk" | "surface",
): number {
  if (layer === "sidewalk") return COLORS.sidewalk;
  return roadType === "dirt" ? getRoadColor(roadType) : 0xa0a5a3;
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
    new THREE.MeshStandardMaterial({ color: 0x747c7c, roughness: 0.86 }),
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
  const markings = getLaneMarkings(runs.filter((run) => run.roadType === "arterial"));
  if (markings.length === 0) return;
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.05, 0.012, 0.3),
    new THREE.MeshStandardMaterial({ color: COLORS.laneMarking, roughness: 0.6 }),
    markings.length,
  );
  const object = new THREE.Object3D();
  markings.forEach((marking, index) => {
    object.position.set(marking.x, 0.108, marking.z);
    object.rotation.y = marking.axis === "horizontal" ? Math.PI / 2 : 0;
    object.updateMatrix();
    mesh.setMatrixAt(index, object.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
}

function getLaneMarkings(
  runs: StreetRun[],
): { x: number; z: number; axis: StreetAxis }[] {
  return runs.flatMap((run) =>
    Array.from(
      { length: Math.max(0, Math.floor(run.length / 0.72)) },
      (_value, index) => {
        const offset = index * 0.72 + 0.36;
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
  const intersections = roads.filter(
    (road) => road.type === "arterial" && getRoadConnectionCount(road) >= 3,
  );
  if (intersections.length === 0) return;
  const plates = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.48, 24),
    new THREE.MeshStandardMaterial({ color: 0x2b3439, roughness: 0.73 }),
    intersections.length,
  );
  const matrix = new THREE.Matrix4();
  intersections.forEach((road, index) => {
    matrix.makeRotationX(-Math.PI / 2);
    matrix.setPosition(road.position[0] + 0.5, 0.106, road.position[1] + 0.5);
    plates.setMatrixAt(index, matrix);
  });
  plates.instanceMatrix.needsUpdate = true;
  group.add(plates, createCrosswalks(intersections));
}

function getRoadConnectionCount(road: CityState["roads"][number]): number {
  return Object.values(road.connections).filter(Boolean).length;
}

function createCrosswalks(roads: CityState["roads"]): THREE.InstancedMesh {
  const count = roads.length * 8;
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.055, 0.013, 0.19),
    new THREE.MeshStandardMaterial({ color: 0xe4dfcf, roughness: 0.7 }),
    count,
  );
  const matrix = new THREE.Matrix4();
  roads.forEach((road, roadIndex) => {
    const [x, y] = road.position;
    [-0.31, -0.19, 0.19, 0.31].forEach((offset, index) => {
      matrix.makeTranslation(x + 0.5 + offset, 0.114, y + 0.76);
      mesh.setMatrixAt(roadIndex * 8 + index, matrix);
      matrix.makeRotationY(Math.PI / 2);
      matrix.setPosition(x + 0.24, 0.114, y + 0.5 + offset);
      mesh.setMatrixAt(roadIndex * 8 + 4 + index, matrix);
    });
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
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
  const lamps = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.055, 10, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffdeb0,
      emissive: 0xffbf68,
      emissiveIntensity: 0.45,
      roughness: 0.4,
    }),
    lights.length,
  );
  const matrix = new THREE.Matrix4();
  lights.forEach((road, index) => {
    const [x, y] = road.position;
    const offset = getVisualHash(x, y) % 2 === 0 ? 0.49 : -0.49;
    matrix.makeTranslation(x + 0.5 + offset, 0.35, y + 0.5);
    poles.setMatrixAt(index, matrix);
    matrix.makeTranslation(x + 0.5 + offset, 0.64, y + 0.5);
    lamps.setMatrixAt(index, matrix);
  });
  poles.castShadow = true;
  poles.instanceMatrix.needsUpdate = true;
  lamps.instanceMatrix.needsUpdate = true;
  group.add(poles, lamps);
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
  });
  chassis.castShadow = true;
  chassis.instanceMatrix.needsUpdate = true;
  cabins.instanceMatrix.needsUpdate = true;
  if (chassis.instanceColor) chassis.instanceColor.needsUpdate = true;
  group.add(chassis, cabins);
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
  state.buildings.forEach((building, index) => {
    const renderInfo = getBuildingRenderInfo(building.definitionId);
    if (!renderInfo) return;
    if (renderInfo.category === "decoration") {
      renderGeneratedPark(group, assetSource, building, renderInfo.size, index);
      return;
    }
    const category = getGeneratedBuildingCategory(renderInfo.category);
    if (!category) return;
    const asset = assetSource.createBuildingInstance(
      category,
      getGeneratedBuildingSeed(category, building.definitionId, index),
    );
    if (!asset) return;
    placeGeneratedBuilding(asset.object, building, renderInfo.size);
    asset.object.name = `building:${building.definitionId}:${building.status}`;
    group.add(asset.object);
  });
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

function renderGeneratedPark(
  group: THREE.Group,
  assetSource: CityAssetSource,
  building: CityState["buildings"][number],
  size: BuildingDefinition["size"],
  index: number,
): void {
  const centerX = building.position[0] + size[0] / 2;
  const centerZ = building.position[1] + size[1] / 2;
  const treeId = index % 2 === 0 ? "tree_oak" : "tree_maple";
  addGeneratedAsset(group, assetSource, treeId, {
    position: [centerX - size[0] * 0.18, 0, centerZ],
    scale: Math.max(0.55, Math.min(size[0], size[1]) * 0.44),
  });
  addGeneratedAsset(group, assetSource, "plaza_planter", {
    position: [centerX + size[0] * 0.2, 0, centerZ - size[1] * 0.18],
    scale: 0.7,
  });
  addGeneratedAsset(group, assetSource, "bench", {
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
  if (category === "industrial" || category === "utility") return "industrial";
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
  const walls = new THREE.MeshStandardMaterial({
    color: wallMap ? 0xffffff : getBuildingWallColor(category, definitionId),
    map: wallMap,
    roughness: getBuildingWallRoughness(category),
    metalness: getBuildingWallMetalness(category),
  });
  const roof = new THREE.MeshStandardMaterial({
    color: getBuildingRoofColor(category, definitionId),
    roughness: 0.68,
    metalness: category === "industrial" || category === "utility" ? 0.24 : 0.08,
  });
  const foundation = new THREE.MeshStandardMaterial({
    color: 0x596166,
    roughness: 0.88,
  });
  return [walls, walls, roof, foundation, walls, walls];
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

function getBuildingWallColor(category: BuildingCategory, definitionId: string): number {
  if (isTower(definitionId)) return 0x71808a;
  if (category === "residential") return 0xc7b69b;
  if (category === "commercial") return 0x667981;
  if (category === "industrial" || category === "utility") return 0x81898d;
  if (isCivicBuilding(category)) return 0xbdb7aa;
  return getCategoryColor(category);
}

function isCivicBuilding(category: BuildingCategory): boolean {
  return ["service", "security", "transit", "civic"].includes(category);
}

function getBuildingWallRoughness(category: BuildingCategory): number {
  if (category === "commercial") return 0.36;
  if (category === "industrial" || category === "utility") return 0.72;
  return 0.54;
}

function getBuildingWallMetalness(category: BuildingCategory): number {
  if (category === "commercial") return 0.22;
  if (category === "industrial" || category === "utility") return 0.26;
  return 0.04;
}

function getBuildingRoofColor(category: BuildingCategory, definitionId: string): number {
  if (isTower(definitionId)) return 0x2b353b;
  if (category === "residential") return 0x4a3d3a;
  if (category === "commercial") return 0x3b474c;
  if (category === "industrial" || category === "utility") return 0x536067;
  return 0x4e5658;
}

function getBuildingInstanceColor(
  category: BuildingCategory,
  status: string,
  definitionId: string,
  index: number,
): THREE.Color {
  if (status === "constructing" || status === "abandoned")
    return getBuildingVariation(category, status, definitionId, index);
  const brightness = 0.91 + (getVisualHash(index, definitionId.length) % 5) * 0.022;
  return new THREE.Color(brightness, brightness, brightness);
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
    new THREE.MeshStandardMaterial({ color: 0x35434a, roughness: 0.48, metalness: 0.22 }),
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
    addCivicRoofProps(group, renderInfo, buildings, height);
    return;
  }
  addResidentialYards(group, renderInfo, buildings);
  addPyramidRoofs(group, renderInfo, buildings, height);
  addFlatHouseRoofs(group, renderInfo, buildings, height);
  addResidentialFacade(group, renderInfo, buildings, height);
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
    addCivicRoofProps(group, renderInfo, buildings, height);
    return;
  }
  addStorefronts(group, renderInfo, buildings, height);
  addCivicRoofProps(group, renderInfo, buildings, height);
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
  const windows = new THREE.InstancedMesh(
    new THREE.BoxGeometry(Math.max(0.12, width * 0.18), height * 0.13, 0.026),
    createWindowMaterial(true),
    buildings.length * 2,
  );
  const matrix = new THREE.Matrix4();
  buildings.forEach((building, index) => {
    [0.25, 0.75].forEach((offset, windowIndex) => {
      matrix.makeTranslation(
        building.position[0] + width * offset,
        height * 0.68,
        building.position[1] + depth * 0.915,
      );
      windows.setMatrixAt(index * 2 + windowIndex, matrix);
    });
  });
  windows.instanceMatrix.needsUpdate = true;
  group.add(windows);
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
    createWindowMaterial(true),
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
  const floors = Math.min(7, Math.max(2, Math.round(height / 0.78)));
  const frontConfig: FacadeWindowConfig = {
    width,
    depth,
    height,
    floors,
    columns: width >= 3 ? 4 : width >= 2 ? 3 : 2,
    front: true,
  };
  const sideConfig: FacadeWindowConfig = {
    ...frontConfig,
    columns: depth >= 3 ? 4 : depth >= 2 ? 3 : 2,
    front: false,
  };
  const frontWindows = createFacadeWindowMesh(buildings, frontConfig);
  const sideWindows = createFacadeWindowMesh(buildings, sideConfig);
  populateFacadeWindows(frontWindows, buildings, frontConfig);
  populateFacadeWindows(sideWindows, buildings, sideConfig);
  group.add(frontWindows, sideWindows);
}

function createFacadeWindowMesh(
  buildings: CityState["buildings"],
  config: FacadeWindowConfig,
): THREE.InstancedMesh {
  const { width, depth, height, floors, columns, front } = config;
  const geometry = front
    ? new THREE.BoxGeometry(
        Math.max(0.1, (width * 0.58) / columns),
        Math.max(0.12, height / (floors * 1.8)),
        0.035,
      )
    : new THREE.BoxGeometry(
        0.035,
        Math.max(0.12, height / (floors * 1.8)),
        Math.max(0.1, (depth * 0.58) / columns),
      );
  return new THREE.InstancedMesh(
    geometry,
    createWindowMaterial(front),
    buildings.length * floors * columns,
  );
}

function createWindowMaterial(front: boolean): THREE.MeshStandardMaterial {
  const curtainWall = getTiledTexture("/textures/curtain-wall-albedo.jpg", 4, 4);
  return new THREE.MeshStandardMaterial({
    color: curtainWall ? 0xffffff : front ? 0xa4c9d5 : 0x86b7c6,
    map: curtainWall,
    emissive: front ? 0x2f5261 : 0x234855,
    emissiveIntensity: front ? 0.18 : 0.14,
    roughness: front ? 0.28 : 0.3,
    metalness: front ? 0.24 : 0.22,
  });
}

function populateFacadeWindows(
  mesh: THREE.InstancedMesh,
  buildings: CityState["buildings"],
  config: FacadeWindowConfig,
): void {
  const matrix = new THREE.Matrix4();
  buildings.forEach((building, index) => {
    setFacadeWindows(mesh, matrix, { ...config, building, buildingIndex: index });
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

function setFacadeWindows(
  mesh: THREE.InstancedMesh,
  matrix: THREE.Matrix4,
  params: FacadeWindowParams,
): void {
  const { building, buildingIndex, width, depth, height, floors, columns, front } =
    params;
  for (let floor = 0; floor < floors; floor += 1) {
    for (let column = 0; column < columns; column += 1) {
      const vertical = height * (0.16 + ((floor + 0.5) / floors) * 0.68);
      const horizontal = (column + 1) / (columns + 1);
      const x = front
        ? building.position[0] + width * horizontal
        : building.position[0] + width * 0.085;
      const z = front
        ? building.position[1] + depth * 0.915
        : building.position[1] + depth * horizontal;
      matrix.makeTranslation(x, vertical, z);
      const index = buildingIndex * floors * columns + floor * columns + column;
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, getWindowColor(buildingIndex, floor, column, front));
    }
  }
}

function getWindowColor(
  buildingIndex: number,
  floor: number,
  column: number,
  front: boolean,
): THREE.Color {
  const variation = getVisualHash(buildingIndex * 17 + floor, column + 3) % 11;
  if (variation === 0) return new THREE.Color(0xe8c16d);
  if (variation === 1) return new THREE.Color(0x6f9eae);
  return new THREE.Color(front ? 0xb7d5df : 0x92bdca);
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
      color: 0xc1d8db,
      emissive: 0x38575a,
      emissiveIntensity: 0.12,
      roughness: 0.24,
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
      color: 0x244b59,
      emissive: 0x17313b,
      emissiveIntensity: 0.28,
      roughness: 0.48,
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
    color: 0x78aab8,
    emissive: 0x203b42,
    emissiveIntensity: 0.24,
    roughness: 0.24,
    metalness: 0.28,
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
  effect: "healthRadius" | "educationRadius",
  color: number,
  getBuildingRenderInfo: BuildingRenderInfoLookup,
): void {
  state.buildings.forEach((building) => {
    const radius = getBuildingRenderInfo(building.definitionId)?.effects[effect] ?? 0;
    if (radius <= 0) return;
    const mesh = createPlane(color, 0.12, 0.028, radius * 2 + 1);
    mesh.position.set(building.position[0] + 0.5, 0.028, building.position[1] + 0.5);
    group.add(mesh);
  });
}

function renderWarnings(group: THREE.Group, state: CityState): void {
  state.warnings.slice(0, 60).forEach((warning) => {
    if (!warning.targetTile) return;
    const mesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.45, 3),
      new THREE.MeshBasicMaterial({ color: COLORS.warning }),
    );
    mesh.position.set(warning.targetTile[0] + 0.5, 1.25, warning.targetTile[1] + 0.5);
    group.add(mesh);
  });
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
