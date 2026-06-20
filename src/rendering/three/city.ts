import * as THREE from "three";
import type {
  BuildingCategory,
  BuildingDefinition,
  CityState,
  UIState,
  ZoneType,
} from "../../shared/types";

const TILE_SIZE = 1;

const COLORS = {
  road: 0x4b4f55,
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
  roads: THREE.Group;
  zones: THREE.Group;
  buildings: THREE.Group;
  overlays: THREE.Group;
  warnings: THREE.Group;
  preview: THREE.Group;
}

export interface BuildingRenderInfo {
  size: BuildingDefinition["size"];
  category: BuildingCategory;
  effects: Pick<BuildingDefinition["effects"], "healthRadius" | "educationRadius">;
}

export type BuildingRenderInfoLookup = (
  definitionId: string,
) => BuildingRenderInfo | null;

export function createCityRenderLayers(scene: THREE.Scene): CityRenderLayers {
  const layers = {
    roads: new THREE.Group(),
    zones: new THREE.Group(),
    buildings: new THREE.Group(),
    overlays: new THREE.Group(),
    warnings: new THREE.Group(),
    preview: new THREE.Group(),
  };
  Object.values(layers).forEach((layer) => scene.add(layer));
  return layers;
}

export function syncCityRenderLayers(
  layers: CityRenderLayers,
  state: CityState,
  activeOverlay: UIState["activeOverlay"],
  getBuildingRenderInfo: BuildingRenderInfoLookup,
): void {
  clearGroup(layers.roads);
  clearGroup(layers.zones);
  clearGroup(layers.buildings);
  clearGroup(layers.overlays);
  clearGroup(layers.warnings);
  renderZones(layers.zones, state);
  renderRoads(layers.roads, state);
  renderBuildings(layers.buildings, state, getBuildingRenderInfo);
  renderOverlay(layers.overlays, state, activeOverlay, getBuildingRenderInfo);
  renderWarnings(layers.warnings, state);
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

function renderRoads(group: THREE.Group, state: CityState): void {
  state.roads.forEach((road) => {
    const [x, y] = road.position;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(TILE_SIZE, 0.06, TILE_SIZE),
      new THREE.MeshStandardMaterial({ color: COLORS.road, roughness: 0.8 }),
    );
    mesh.position.set(x + 0.5, 0.035, y + 0.5);
    group.add(mesh);
  });
}

function renderZones(group: THREE.Group, state: CityState): void {
  state.map.flat().forEach((tile) => {
    if (!tile.zone || tile.buildingId || tile.roadId) return;
    const mesh = createPlane(getZoneColor(tile.zone), 0.28, 0.012);
    mesh.position.set(tile.x + 0.5, 0.012, tile.y + 0.5);
    group.add(mesh);
  });
}

function renderBuildings(
  group: THREE.Group,
  state: CityState,
  getBuildingRenderInfo: BuildingRenderInfoLookup,
): void {
  getBuildingGroups(state).forEach((buildings) => {
    const first = buildings[0];
    if (!first) return;
    const renderInfo = getBuildingRenderInfo(first.definitionId);
    if (!renderInfo) return;
    group.add(
      createBuildingInstances(first.definitionId, renderInfo, first.status, buildings),
    );
  });
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
  state.map.flat().forEach((tile) => {
    if (!tile.zone) return;
    const mesh = createPlane(getZoneColor(tile.zone), 0.5, 0.055);
    mesh.position.set(tile.x + 0.5, 0.055, tile.y + 0.5);
    group.add(mesh);
  });
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
  const height = getBuildingHeight(renderInfo.category, status === "constructing");
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(renderInfo.size[0] * 0.82, height, renderInfo.size[1] * 0.82),
    new THREE.MeshStandardMaterial({
      color: getBuildingColor(renderInfo.category, status),
      roughness: 0.7,
    }),
    buildings.length,
  );
  const matrix = new THREE.Matrix4();
  buildings.forEach((building, index) => {
    matrix.makeTranslation(
      building.position[0] + renderInfo.size[0] / 2,
      height / 2,
      building.position[1] + renderInfo.size[1] / 2,
    );
    mesh.setMatrixAt(index, matrix);
  });
  mesh.name = `building:${definitionId}:${status}`;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  return mesh;
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
  if (zone === "residential") return COLORS.residential;
  if (zone === "commercial") return COLORS.commercial;
  return COLORS.industrial;
}

function getBuildingColor(category: BuildingCategory, status: string): number {
  if (status === "constructing") return 0xb0bec5;
  if (status === "abandoned") return 0x5f6368;
  if (category === "residential") return COLORS.residential;
  if (category === "commercial") return COLORS.commercial;
  if (category === "industrial") return COLORS.industrial;
  if (category === "utility") return COLORS.utility;
  if (category === "service") return COLORS.service;
  if (category === "decoration") return COLORS.decoration;
  return COLORS.civic;
}

function getBuildingHeight(category: BuildingCategory, constructing: boolean): number {
  if (constructing) return 0.35;
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
  if (object instanceof THREE.Mesh) {
    object.geometry.dispose();
    disposeMaterial(object.material);
  }
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    material.forEach((entry) => entry.dispose());
    return;
  }
  material.dispose();
}
