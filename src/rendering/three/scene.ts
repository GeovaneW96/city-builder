import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const DEFAULT_GRID_SIZE = 64;
const CAMERA_BOUNDS_PADDING = 4;

export interface SceneContext {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  container: HTMLElement;
  gridSize: number;
}

function clampCameraTarget(target: THREE.Vector3, gridSize: number): void {
  target.x = Math.max(
    -CAMERA_BOUNDS_PADDING,
    Math.min(gridSize + CAMERA_BOUNDS_PADDING, target.x),
  );
  target.z = Math.max(
    -CAMERA_BOUNDS_PADDING,
    Math.min(gridSize + CAMERA_BOUNDS_PADDING, target.z),
  );
}

function addLighting(scene: THREE.Scene, gridSize: number): void {
  const ambient = new THREE.AmbientLight(0x404060, 0.5);
  scene.add(ambient);

  const shadowSize = Math.max(50, gridSize * 0.8);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(gridSize * 0.6, 60, gridSize * 0.45);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 150;
  dirLight.shadow.camera.left = -shadowSize;
  dirLight.shadow.camera.right = shadowSize;
  dirLight.shadow.camera.top = shadowSize;
  dirLight.shadow.camera.bottom = -shadowSize;
  scene.add(dirLight);

  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.4);
  scene.add(hemi);
}

export function createScene(
  container: HTMLElement,
  gridSize = DEFAULT_GRID_SIZE,
): SceneContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    500,
  );
  const center = gridSize / 2;
  camera.position.set(center - 0.5, 45, center + 23);
  camera.lookAt(center, 0, center);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(center, 0, center);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.minDistance = Math.max(10, gridSize * 0.15);
  controls.maxDistance = gridSize * 1.8;
  controls.maxPolarAngle = Math.PI / 2.2;
  controls.update();

  controls.addEventListener("change", () => {
    clampCameraTarget(controls.target, gridSize);
  });

  addLighting(scene, gridSize);

  const onResize = (): void => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  };
  window.addEventListener("resize", onResize);

  return { scene, renderer, camera, controls, container, gridSize };
}

export function renderFrame(ctx: SceneContext): void {
  ctx.controls.update();
  ctx.renderer.render(ctx.scene, ctx.camera);
}
