import * as THREE from "three";
import { getTiledTexture } from "./textures";

const DEFAULT_GRID_SIZE = 64;
const TILE_SIZE = 1;

const COLORS = {
  GROUND: 0x2a4522,
  GROUND_DARK: 0x1a2e18,
  HOVER: 0x6b9a50,
  SELECTED: 0x4a8fc0,
  GRID_LINE: 0x80a060,
  INVALID: 0xef5350,
};

export interface GridContext {
  hoverHighlight: THREE.Mesh;
  selectionHighlight: THREE.Mesh;
  ground: THREE.Mesh;
  raycasterTarget: THREE.Mesh;
  gridHelper: THREE.GridHelper;
  gridSize: number;
}

function createHighlightMesh(
  scene: THREE.Scene,
  color: number,
  opacity: number,
  yPos: number,
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = yPos;
  mesh.visible = false;
  scene.add(mesh);
  return mesh;
}

export function createGrid(
  scene: THREE.Scene,
  gridSize = DEFAULT_GRID_SIZE,
): GridContext {
  const half = gridSize / 2;
  addTerrainBase(scene, gridSize, half);
  const ground = new THREE.Mesh(
    createTerrainGeometry(gridSize),
    createGroundMaterial(gridSize),
  );
  ground.position.set(half, -0.015, half);
  ground.receiveShadow = true;
  scene.add(ground);

  const raycasterTarget = new THREE.Mesh(
    new THREE.PlaneGeometry(gridSize, gridSize),
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
  );
  raycasterTarget.rotation.x = -Math.PI / 2;
  raycasterTarget.position.set(half, 0, half);
  raycasterTarget.name = "grid";
  scene.add(raycasterTarget);

  const gridHelper = new THREE.GridHelper(
    gridSize,
    gridSize,
    COLORS.GRID_LINE,
    COLORS.GRID_LINE,
  );
  gridHelper.position.set(half, 0.001, half);
  const gridMaterial = gridHelper.material as THREE.LineBasicMaterial;
  gridMaterial.transparent = true;
  gridMaterial.opacity = 0.13;
  gridHelper.visible = false;
  scene.add(gridHelper);

  const hoverHighlight = createHighlightMesh(scene, COLORS.HOVER, 0.5, 0.002);

  const selectionHighlight = createHighlightMesh(scene, COLORS.SELECTED, 0.4, 0.003);

  return {
    hoverHighlight,
    selectionHighlight,
    ground,
    raycasterTarget,
    gridHelper,
    gridSize,
  };
}

function createGroundMaterial(gridSize: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: getTiledTexture(
      "/textures/temperate-grass-albedo.jpg",
      gridSize / 4,
      gridSize / 4,
    ),
    roughness: 0.94,
    metalness: 0,
    vertexColors: false,
  });
}

function addTerrainBase(scene: THREE.Scene, gridSize: number, half: number): void {
  const terrainBase = new THREE.Mesh(
    new THREE.BoxGeometry(gridSize + 0.5, 0.48, gridSize + 0.5),
    new THREE.MeshStandardMaterial({ color: COLORS.GROUND_DARK, roughness: 1 }),
  );
  terrainBase.position.set(half, -0.28, half);
  terrainBase.receiveShadow = true;
  scene.add(terrainBase);
}

export function setGridVisibility(context: GridContext, visible: boolean): void {
  context.gridHelper.visible = visible;
}

function createTerrainGeometry(gridSize: number): THREE.PlaneGeometry {
  const segments = Math.min(gridSize, 48);
  const geometry = new THREE.PlaneGeometry(gridSize, gridSize, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  const color = new THREE.Color();
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    positions.setY(index, getTerrainHeight(x, z));
    color.setHex(getGrassColor(x, z));
    color.toArray(colors, index * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function getTerrainHeight(x: number, z: number): number {
  const wide = Math.sin(x * 0.16) * Math.cos(z * 0.12) * 0.045;
  const small = Math.sin((x + z) * 0.7) * 0.012;
  return wide + small;
}

function getGrassColor(x: number, z: number): number {
  const variation = Math.sin(x * 0.27 + z * 0.43) * 0.5 + 0.5;
  const v2 = Math.sin(x * 0.13 + z * 0.22) * 0.5 + 0.5;
  if (v2 > 0.7) return 0x204018;
  if (variation > 0.62) return 0x3a5e28;
  if (variation < 0.28) return 0x2a4a1e;
  return COLORS.GROUND;
}

export function screenToGrid(
  mouse: THREE.Vector2,
  camera: THREE.PerspectiveCamera,
  raycasterTarget: THREE.Mesh,
  gridSize = DEFAULT_GRID_SIZE,
): [number, number] | null {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(raycasterTarget);
  if (intersects.length === 0) return null;

  const first = intersects[0];
  if (!first) return null;
  const point = first.point;
  const gridX = Math.floor(point.x);
  const gridY = Math.floor(point.z);

  if (gridX < 0 || gridX >= gridSize || gridY < 0 || gridY >= gridSize) {
    return null;
  }

  return [gridX, gridY];
}

export function updateHoverHighlight(
  highlight: THREE.Mesh,
  gridPos: [number, number] | null,
  valid: boolean,
): void {
  if (!gridPos) {
    highlight.visible = false;
    return;
  }
  highlight.visible = true;
  highlight.position.x = gridPos[0] + 0.5;
  highlight.position.z = gridPos[1] + 0.5;
  (highlight.material as THREE.MeshBasicMaterial).color.setHex(
    valid ? COLORS.HOVER : COLORS.INVALID,
  );
}

export function updateSelectionHighlight(
  highlight: THREE.Mesh,
  gridPos: [number, number] | null,
): void {
  if (!gridPos) {
    highlight.visible = false;
    return;
  }
  highlight.visible = true;
  highlight.position.x = gridPos[0] + 0.5;
  highlight.position.z = gridPos[1] + 0.5;
}
