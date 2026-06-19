import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const GRID_SIZE = 64;
const CAMERA_BOUNDS_PADDING = 4;

export interface SceneContext {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  container: HTMLElement;
}

function clampCameraTarget(target: THREE.Vector3): void {
  target.x = Math.max(
    -CAMERA_BOUNDS_PADDING,
    Math.min(GRID_SIZE + CAMERA_BOUNDS_PADDING, target.x),
  );
  target.z = Math.max(
    -CAMERA_BOUNDS_PADDING,
    Math.min(GRID_SIZE + CAMERA_BOUNDS_PADDING, target.z),
  );
}

function addLighting(scene: THREE.Scene): void {
  const ambient = new THREE.AmbientLight(0x404060, 0.5);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(40, 60, 30);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 150;
  dirLight.shadow.camera.left = -50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  scene.add(dirLight);

  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.4);
  scene.add(hemi);
}

export function createScene(container: HTMLElement): SceneContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    500,
  );
  camera.position.set(32, 45, 55);
  camera.lookAt(GRID_SIZE / 2, 0, GRID_SIZE / 2);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(GRID_SIZE / 2, 0, GRID_SIZE / 2);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.minDistance = 10;
  controls.maxDistance = 120;
  controls.maxPolarAngle = Math.PI / 2.2;
  controls.update();

  controls.addEventListener("change", () => {
    clampCameraTarget(controls.target);
  });

  addLighting(scene);

  const onResize = (): void => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  };
  window.addEventListener("resize", onResize);

  return { scene, renderer, camera, controls, container };
}

export function renderFrame(ctx: SceneContext): void {
  ctx.controls.update();
  ctx.renderer.render(ctx.scene, ctx.camera);
}
