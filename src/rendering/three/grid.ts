import * as THREE from "three";

const GRID_SIZE = 64;
const TILE_SIZE = 1;

const COLORS = {
  GROUND: 0x8bc34a,
  HOVER: 0xa5d66a,
  SELECTED: 0x42a5f5,
  GRID_LINE: 0x6a9c3a,
  INVALID: 0xef5350,
};

export interface GridContext {
  hoverHighlight: THREE.Mesh;
  selectionHighlight: THREE.Mesh;
  ground: THREE.Mesh;
  raycasterTarget: THREE.Mesh;
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

export function createGrid(scene: THREE.Scene): GridContext {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE),
    new THREE.MeshStandardMaterial({ color: COLORS.GROUND, roughness: 0.9 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(GRID_SIZE / 2, -0.01, GRID_SIZE / 2);
  ground.receiveShadow = true;
  scene.add(ground);

  const raycasterTarget = new THREE.Mesh(
    new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE),
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
  );
  raycasterTarget.rotation.x = -Math.PI / 2;
  raycasterTarget.position.set(GRID_SIZE / 2, 0, GRID_SIZE / 2);
  raycasterTarget.name = "grid";
  scene.add(raycasterTarget);

  const gridHelper = new THREE.GridHelper(
    GRID_SIZE,
    GRID_SIZE,
    COLORS.GRID_LINE,
    COLORS.GRID_LINE,
  );
  gridHelper.position.set(GRID_SIZE / 2, 0.001, GRID_SIZE / 2);
  scene.add(gridHelper);

  const hoverHighlight = createHighlightMesh(scene, COLORS.HOVER, 0.5, 0.002);

  const selectionHighlight = createHighlightMesh(scene, COLORS.SELECTED, 0.4, 0.003);

  return { hoverHighlight, selectionHighlight, ground, raycasterTarget };
}

export function screenToGrid(
  mouse: THREE.Vector2,
  camera: THREE.PerspectiveCamera,
  raycasterTarget: THREE.Mesh,
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

  if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) {
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
