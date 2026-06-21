import * as THREE from "three";
import type { CityAssetSource } from "../../assets/AssetManager";
import type { CityState, Tile } from "../../shared/types";
import { getTiledTexture } from "./textures";

const WATER_COLORS = {
  deep: 0x041a2e,
  shallow: 0x0c2a48,
  foam: 0x9ab8c4,
  rock: 0x5a6870,
  trunk: 0x5a3c22,
  foliage: 0x1a4a2a,
  foliageLight: 0x2a6a38,
  grassPatch: 0x3a5e28,
};

export interface AnimatedWaterMaterial extends THREE.ShaderMaterial {
  uniforms: {
    time: { value: number };
  };
}

interface ShoreEdge {
  x: number;
  y: number;
  horizontal: boolean;
}

interface ShoreDirection {
  offsetX: number;
  offsetY: number;
  positionX: number;
  positionY: number;
  horizontal: boolean;
}

interface NaturePlacement {
  x: number;
  y: number;
  scale: number;
  color: number;
  evergreen: boolean;
}

export function renderTerrain(
  group: THREE.Group,
  state: CityState,
  waterMaterials: AnimatedWaterMaterial[],
  assetSource?: CityAssetSource,
  detailDensity = 1,
): void {
  const waterTiles = state.map.flat().filter((tile) => tile.terrain === "water");
  if (waterTiles.length > 0) {
    const material = createWaterMaterial();
    const shoreEdges = getShoreEdges(state, waterTiles);
    group.add(createWaterMesh(waterTiles, material));
    group.add(createFoamMesh(shoreEdges));
    group.add(createShoreCliffs(shoreEdges));
    waterMaterials.push(material);
  }
  renderGroundCover(group, state);
  if (assetSource) {
    renderGeneratedShoreRocks(group, state, assetSource, detailDensity);
  } else {
    renderShoreRocks(group, state);
  }
  renderNaturalDetails(group, state, assetSource, detailDensity);
}

export function animateWater(
  waterMaterials: AnimatedWaterMaterial[],
  elapsedSeconds: number,
): void {
  waterMaterials.forEach((material) => {
    material.uniforms.time.value = elapsedSeconds;
  });
}

function createWaterMaterial(): AnimatedWaterMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { time: { value: 0 } },
    vertexShader: `
      uniform float time;
      varying float vWave;
      varying vec3 vWorldPosition;
      void main() {
        vec4 transformed = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          transformed = instanceMatrix * transformed;
        #endif
        vec4 worldPosition = modelMatrix * transformed;
        float wave = sin(worldPosition.x * 1.8 + time * 0.8) * 0.015;
        wave += cos(worldPosition.z * 2.4 + time * 1.1) * 0.01;
        wave += sin(worldPosition.x * 0.7 + worldPosition.z * 0.5 + time * 0.4) * 0.008;
        worldPosition.y += wave;
        vWave = wave;
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float time;
      varying float vWave;
      varying vec3 vWorldPosition;
      void main() {
        vec3 deepWater = vec3(0.015, 0.06, 0.16);
        vec3 shallowWater = vec3(0.04, 0.14, 0.28);
        float ripple = sin(vWorldPosition.x * 2.8 + vWorldPosition.z * 1.6 + time * 1.4);
        float highlight = smoothstep(0.012, 0.025, abs(vWave) + ripple * 0.003);
        float fresnel = 1.0 - abs(vWave) * 2.0;
        vec3 specular = vec3(0.05, 0.08, 0.15) * pow(max(0.0, fresnel), 3.0) * 0.3;
        vec3 color = mix(deepWater, shallowWater, 0.3 + highlight * 0.25);
        color += specular;
        gl_FragColor = vec4(color, 0.95);
      }
    `,
  }) as AnimatedWaterMaterial;
}

function createWaterMesh(
  waterTiles: Tile[],
  material: AnimatedWaterMaterial,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1.04, 1.04),
    material,
    waterTiles.length,
  );
  const matrix = new THREE.Matrix4();
  waterTiles.forEach((tile, index) => {
    matrix.makeRotationX(-Math.PI / 2);
    matrix.setPosition(tile.x + 0.5, 0.026, tile.y + 0.5);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.name = "terrain:water";
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function getShoreEdges(state: CityState, waterTiles: Tile[]): ShoreEdge[] {
  return waterTiles
    .flatMap((tile) =>
      SHORE_DIRECTIONS.map((direction) => createShoreEdge(state, tile, direction)),
    )
    .filter((edge): edge is ShoreEdge => edge !== null);
}

function createShoreEdge(
  state: CityState,
  tile: Tile,
  direction: ShoreDirection,
): ShoreEdge | null {
  const neighbor = state.map[tile.y + direction.offsetY]?.[tile.x + direction.offsetX];
  if (neighbor?.terrain === "water") return null;
  return {
    x: tile.x + 0.5 + direction.positionX,
    y: tile.y + 0.5 + direction.positionY,
    horizontal: direction.horizontal,
  };
}

const SHORE_DIRECTIONS: ShoreDirection[] = [
  { offsetX: 0, offsetY: -1, positionX: 0, positionY: -0.48, horizontal: true },
  { offsetX: 0, offsetY: 1, positionX: 0, positionY: 0.48, horizontal: true },
  { offsetX: -1, offsetY: 0, positionX: -0.48, positionY: 0, horizontal: false },
  { offsetX: 1, offsetY: 0, positionX: 0.48, positionY: 0, horizontal: false },
];

function createFoamMesh(edges: ShoreEdge[]): THREE.Group {
  const group = new THREE.Group();
  const horizontal = edges.filter((edge) => edge.horizontal);
  const vertical = edges.filter((edge) => !edge.horizontal);
  if (horizontal.length > 0) group.add(createFoamInstances(horizontal, true));
  if (vertical.length > 0) group.add(createFoamInstances(vertical, false));
  return group;
}

function createShoreCliffs(edges: ShoreEdge[]): THREE.InstancedMesh {
  const rocks = edges.filter(
    (edge) => getTerrainHash(Math.round(edge.x * 10), Math.round(edge.y * 10)) % 2 === 0,
  );
  const mesh = new THREE.InstancedMesh(
    createRockGeometry(0.28),
    createRockMaterial(),
    rocks.length,
  );
  const object = new THREE.Object3D();
  rocks.forEach((edge, index) => {
    const hash = getTerrainHash(Math.round(edge.x * 10), Math.round(edge.y * 10));
    const scale = 0.7 + (hash % 4) * 0.14;
    object.position.set(edge.x, 0.14, edge.y);
    object.rotation.set(0.12, (hash % 314) / 100, 0.2);
    object.scale.set(scale, 0.72 + scale * 0.35, scale);
    object.updateMatrix();
    mesh.setMatrixAt(index, object.matrix);
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function createFoamInstances(
  edges: ShoreEdge[],
  horizontal: boolean,
): THREE.InstancedMesh {
  const geometry = horizontal
    ? new THREE.BoxGeometry(0.76, 0.012, 0.042)
    : new THREE.BoxGeometry(0.042, 0.012, 0.76);
  const mesh = new THREE.InstancedMesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: WATER_COLORS.foam,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    }),
    edges.length,
  );
  const matrix = new THREE.Matrix4();
  edges.forEach((edge, index) => {
    matrix.makeTranslation(edge.x, 0.053, edge.y);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function renderGroundCover(group: THREE.Group, state: CityState): void {
  const tiles = state.map
    .flat()
    .filter((tile) => isVacantGrassTile(state, tile.x, tile.y))
    .filter((tile) => getTerrainHash(tile.x, tile.y) % 5 === 0);
  if (tiles.length === 0) return;
  const mesh = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.32, 6),
    new THREE.MeshBasicMaterial({
      color: WATER_COLORS.grassPatch,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
    }),
    tiles.length,
  );
  const matrix = new THREE.Matrix4();
  tiles.forEach((tile, index) => {
    const offset = getTerrainOffset(tile.x, tile.y);
    matrix.makeRotationX(-Math.PI / 2);
    matrix.setPosition(tile.x + offset.x, 0.008, tile.y + offset.y);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
}

function renderShoreRocks(group: THREE.Group, state: CityState): void {
  const tiles = state.map
    .flat()
    .filter((tile) => isVacantGrassTile(state, tile.x, tile.y))
    .filter((tile) => isNearWater(state, tile.x, tile.y))
    .filter((tile) => getTerrainHash(tile.x, tile.y) % 2 === 0);
  if (tiles.length === 0) return;
  const mesh = new THREE.InstancedMesh(
    createRockGeometry(0.3),
    createRockMaterial(),
    tiles.length,
  );
  const object = new THREE.Object3D();
  tiles.forEach((tile, index) => {
    const offset = getTerrainOffset(tile.x + 3, tile.y + 11);
    const scale = 0.58 + (getTerrainHash(tile.x, tile.y) % 4) * 0.2;
    object.position.set(tile.x + offset.x, 0.1, tile.y + offset.y);
    object.rotation.set(0.2, getTerrainHash(tile.x, tile.y) % Math.PI, 0.1);
    object.scale.set(scale, 0.65 + scale * 0.4, scale);
    object.updateMatrix();
    mesh.setMatrixAt(index, object.matrix);
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
}

function renderNaturalDetails(
  group: THREE.Group,
  state: CityState,
  assetSource?: CityAssetSource,
  detailDensity = 1,
): void {
  if (assetSource) {
    renderGeneratedNaturalDetails(group, state, assetSource, detailDensity);
    return;
  }
  const trees = getTreePlacements(state);
  if (trees.length === 0) return;
  group.add(
    createTreeTrunks(trees),
    createLowerCanopies(trees.filter((tree) => tree.evergreen)),
    createUpperCanopies(trees.filter((tree) => tree.evergreen)),
    createDeciduousCanopies(trees.filter((tree) => !tree.evergreen)),
  );
}

function renderGeneratedNaturalDetails(
  group: THREE.Group,
  state: CityState,
  assetSource: CityAssetSource,
  detailDensity: number,
): void {
  getTreePlacements(state)
    .filter((_tree, index) => shouldPlaceGeneratedNature(index, detailDensity))
    .forEach((tree, index) => {
      const asset = assetSource.createAssetInstance(getTreeAssetId(tree, index));
      if (!asset) return;
      asset.object.position.set(tree.x, 0, tree.y);
      asset.object.rotation.y =
        getTerrainHash(Math.round(tree.x * 10), Math.round(tree.y * 10)) % (Math.PI * 2);
      asset.object.scale.setScalar(tree.scale);
      asset.object.name = `asset:${asset.id}`;
      group.add(asset.object);
    });
}

function getTreeAssetId(tree: NaturePlacement, index: number): string {
  if (tree.evergreen) return "tree_conifer";
  return index % 2 === 0 ? "tree_oak" : "tree_maple";
}

function renderGeneratedShoreRocks(
  group: THREE.Group,
  state: CityState,
  assetSource: CityAssetSource,
  detailDensity: number,
): void {
  const frequency = Math.max(3, Math.round(8 / detailDensity));
  state.map
    .flat()
    .filter((tile) => isVacantGrassTile(state, tile.x, tile.y))
    .filter((tile) => isNearWater(state, tile.x, tile.y))
    .filter((tile) => getTerrainHash(tile.x, tile.y) % frequency === 0)
    .forEach((tile) => {
      const asset = assetSource.createAssetInstance("rock_cluster");
      if (!asset) return;
      const offset = getTerrainOffset(tile.x + 3, tile.y + 11);
      asset.object.position.set(tile.x + offset.x, 0, tile.y + offset.y);
      asset.object.rotation.y = getTerrainHash(tile.x, tile.y) % Math.PI;
      asset.object.scale.setScalar(0.48);
      asset.object.name = `asset:${asset.id}`;
      group.add(asset.object);
    });
}

function shouldPlaceGeneratedNature(index: number, detailDensity: number): boolean {
  const frequency = Math.max(2, Math.round(6 / detailDensity));
  return index % frequency === 0;
}

function createRockGeometry(radius: number): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(radius, 2);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index += 1) {
    const variation = 0.78 + ((index * 37) % 19) / 40;
    positions.setXYZ(
      index,
      positions.getX(index) * variation,
      positions.getY(index) * (0.72 + variation * 0.22),
      positions.getZ(index) * variation,
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}

function createRockMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xc7d0d1,
    map: getTiledTexture("/textures/granite-rock-albedo.jpg", 1, 1),
    roughness: 0.88,
    metalness: 0.02,
  });
}

function getTreePlacements(state: CityState): NaturePlacement[] {
  return state.map.flat().flatMap((tile) => getTreesForTile(state, tile));
}

function getTreesForTile(state: CityState, tile: Tile): NaturePlacement[] {
  if (!shouldRenderTree(state, tile.x, tile.y)) return [];
  const hash = getTerrainHash(tile.x, tile.y);
  const offset = getTerrainOffset(tile.x, tile.y);
  const placement = {
    x: tile.x + offset.x,
    y: tile.y + offset.y,
    scale: 1.02 + (hash % 5) * 0.08,
    color: hash % 4 === 0 ? WATER_COLORS.foliageLight : WATER_COLORS.foliage,
    evergreen: hash % 5 !== 0,
  };
  const cluster = [placement];
  if (hash % 4 < 2) {
    cluster.push({
      x: tile.x + 0.1 + ((hash >> 5) % 62) / 100,
      y: tile.y + 0.12 + ((hash >> 11) % 58) / 100,
      scale: 0.46 + (hash % 3) * 0.08,
      color: WATER_COLORS.foliageLight,
      evergreen: hash % 5 !== 0,
    });
  }
  if (hash % 11 === 0) {
    cluster.push({
      x: tile.x + 0.16 + ((hash >> 3) % 52) / 100,
      y: tile.y + 0.2 + ((hash >> 9) % 46) / 100,
      scale: 0.36,
      color: WATER_COLORS.foliage,
      evergreen: false,
    });
  }
  return cluster;
}

function createTreeTrunks(trees: NaturePlacement[]): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.038, 0.065, 0.42, 6),
    new THREE.MeshStandardMaterial({ color: WATER_COLORS.trunk, roughness: 0.92 }),
    trees.length,
  );
  setTreeMatrices(mesh, trees, 0.21, 1);
  return mesh;
}

function createLowerCanopies(trees: NaturePlacement[]): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.34, 0.66, 12, 3),
    new THREE.MeshStandardMaterial({ color: WATER_COLORS.foliage, roughness: 0.9 }),
    trees.length,
  );
  setTreeMatrices(mesh, trees, 0.54, 1.12, true);
  return mesh;
}

function createUpperCanopies(trees: NaturePlacement[]): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.24, 0.52, 12, 2),
    new THREE.MeshStandardMaterial({ color: WATER_COLORS.foliageLight, roughness: 0.92 }),
    trees.length,
  );
  setTreeMatrices(mesh, trees, 0.9, 0.9, true);
  return mesh;
}

function createDeciduousCanopies(trees: NaturePlacement[]): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.31, 16, 12),
    new THREE.MeshStandardMaterial({ color: WATER_COLORS.foliageLight, roughness: 0.9 }),
    trees.length * 3,
  );
  const object = new THREE.Object3D();
  const offsets: [number, number, number][] = [
    [-0.12, 0.56, -0.05],
    [0.13, 0.62, 0.07],
    [0, 0.84, 0],
  ];
  trees.forEach((tree, treeIndex) => {
    offsets.forEach(([x, y, z], canopyIndex) => {
      const scale = tree.scale * (canopyIndex === 2 ? 0.76 : 0.88);
      object.position.set(
        tree.x + x * tree.scale,
        y * tree.scale,
        tree.y + z * tree.scale,
      );
      object.scale.set(scale, scale * 0.86, scale);
      object.updateMatrix();
      const index = treeIndex * offsets.length + canopyIndex;
      mesh.setMatrixAt(index, object.matrix);
      mesh.setColorAt(index, new THREE.Color(tree.color));
    });
  });
  mesh.castShadow = true;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function setTreeMatrices(
  mesh: THREE.InstancedMesh,
  trees: NaturePlacement[],
  height: number,
  scaleMultiplier: number,
  useColors = false,
): void {
  const object = new THREE.Object3D();
  trees.forEach((tree, index) => {
    const scale = tree.scale * scaleMultiplier;
    object.position.set(tree.x, height * tree.scale, tree.y);
    object.rotation.y =
      getTerrainHash(Math.round(tree.x * 10), Math.round(tree.y * 10)) % Math.PI;
    object.scale.set(scale, scale, scale);
    object.updateMatrix();
    mesh.setMatrixAt(index, object.matrix);
    if (useColors) mesh.setColorAt(index, new THREE.Color(tree.color));
  });
  mesh.castShadow = true;
  mesh.instanceMatrix.needsUpdate = true;
  if (useColors && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

function shouldRenderTree(state: CityState, x: number, y: number): boolean {
  return (
    isVacantGrassTile(state, x, y) &&
    (isNearWater(state, x, y) ||
      isMapEdge(state, x, y) ||
      isStreetTreeSpot(state, x, y)) &&
    getTerrainHash(x, y) % 3 !== 0
  );
}

function isStreetTreeSpot(state: CityState, x: number, y: number): boolean {
  const tile = state.map[y]?.[x];
  if (!tile || tile.zone) return false;
  return [
    state.map[y - 1]?.[x],
    state.map[y]?.[x + 1],
    state.map[y + 1]?.[x],
    state.map[y]?.[x - 1],
  ].some((neighbor) => Boolean(neighbor?.roadId));
}

function isVacantGrassTile(state: CityState, x: number, y: number): boolean {
  const tile = state.map[y]?.[x];
  return Boolean(tile?.terrain === "grass" && !tile.roadId && !tile.buildingId);
}

function isNearWater(state: CityState, x: number, y: number): boolean {
  return getOrthogonalTerrain(state, x, y).includes("water");
}

function isMapEdge(state: CityState, x: number, y: number): boolean {
  const width = state.map[0]?.length ?? 0;
  const height = state.map.length;
  return x < 10 || y < 8 || x > width - 9 || y > height - 9;
}

function getOrthogonalTerrain(state: CityState, x: number, y: number): string[] {
  return [
    state.map[y - 1]?.[x]?.terrain,
    state.map[y]?.[x + 1]?.terrain,
    state.map[y + 1]?.[x]?.terrain,
    state.map[y]?.[x - 1]?.terrain,
  ].map((terrain) => terrain ?? "blocked");
}

function getTerrainOffset(x: number, y: number): { x: number; y: number } {
  const hash = getTerrainHash(x, y);
  return { x: 0.22 + (hash % 48) / 100, y: 0.22 + ((hash >> 4) % 48) / 100 };
}

function getTerrainHash(x: number, y: number): number {
  return Math.abs((x * 73856093) ^ (y * 19349663));
}
