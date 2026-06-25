import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import type { GraphicsQuality } from "../../shared/types";
import { getRenderQualityProfile } from "./quality";

const DEFAULT_GRID_SIZE = 64;
const CAMERA_BOUNDS_PADDING = 4;
const CAMERA_KEYBOARD_PAN_RATIO = 0.035;

export interface CameraPanInput {
  forward: number;
  right: number;
}

export interface SceneContext {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  composer: EffectComposer;
  bloomPass: UnrealBloomPass;
  container: HTMLElement;
  gridSize: number;
  quality: GraphicsQuality;
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

function getCameraPanStep(gridSize: number): number {
  return Math.max(1, gridSize * CAMERA_KEYBOARD_PAN_RATIO);
}

function getCameraPanVector(
  camera: THREE.PerspectiveCamera,
  input: CameraPanInput,
  distance: number,
): THREE.Vector3 {
  const normalizedInput = new THREE.Vector2(input.right, input.forward);
  if (normalizedInput.lengthSq() === 0) return new THREE.Vector3();
  if (normalizedInput.lengthSq() > 1) normalizedInput.normalize();

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() === 0) forward.set(0, 0, -1);
  forward.normalize();

  const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
  return forward
    .multiplyScalar(normalizedInput.y)
    .add(right.multiplyScalar(normalizedInput.x))
    .multiplyScalar(distance);
}

export function panSceneCamera(
  context: SceneContext,
  input: CameraPanInput,
  distance = getCameraPanStep(context.gridSize),
): void {
  const startTarget = context.controls.target.clone();
  const nextTarget = startTarget
    .clone()
    .add(getCameraPanVector(context.camera, input, distance));
  clampCameraTarget(nextTarget, context.gridSize);

  const delta = nextTarget.sub(startTarget);
  if (delta.lengthSq() === 0) return;

  context.controls.target.add(delta);
  context.camera.position.add(delta);
  context.controls.update();
}

function addLighting(scene: THREE.Scene, gridSize: number): void {
  const ambient = new THREE.AmbientLight(0xcfe6ff, 0.72);
  scene.add(ambient);

  const shadowSize = Math.max(50, gridSize * 0.8);
  const dirLight = new THREE.DirectionalLight(0xfff4d8, 1.75);
  dirLight.position.set(gridSize * 0.32, 64, gridSize * 0.22);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 160;
  dirLight.shadow.camera.left = -shadowSize;
  dirLight.shadow.camera.right = shadowSize;
  dirLight.shadow.camera.top = shadowSize;
  dirLight.shadow.camera.bottom = -shadowSize;
  dirLight.shadow.bias = -0.00002;
  dirLight.shadow.normalBias = 0.04;
  scene.add(dirLight);

  const moonFill = new THREE.DirectionalLight(0x9fc3ff, 0.75);
  moonFill.position.set(-gridSize * 0.15, 40, -gridSize * 0.1);
  scene.add(moonFill);

  const blueFill = new THREE.DirectionalLight(0x7aa0d8, 0.32);
  blueFill.position.set(-gridSize * 0.1, 20, gridSize * 0.3);
  scene.add(blueFill);

  const hemi = new THREE.HemisphereLight(0xc8ecff, 0x627746, 1.05);
  scene.add(hemi);

  const warmFill = new THREE.DirectionalLight(0xffb86c, 0.22);
  warmFill.position.set(gridSize * -0.2, 10, gridSize * 0.15);
  scene.add(warmFill);
}

export function createScene(
  container: HTMLElement,
  gridSize = DEFAULT_GRID_SIZE,
  quality: GraphicsQuality = "high",
): SceneContext {
  const scene = createNightScene(gridSize);
  const camera = createCamera(container, gridSize);
  const renderer = createRenderer(container);
  const { composer, bloomPass } = createPostProcessing(renderer, scene, camera);
  const controls = createControls(camera, renderer, gridSize);
  addLighting(scene, gridSize);
  const context: SceneContext = {
    scene,
    renderer,
    camera,
    controls,
    composer,
    bloomPass,
    container,
    gridSize,
    quality,
  };
  setSceneQuality(context, quality);
  attachResizeHandler(context);
  return context;
}

function createNightScene(gridSize: number): THREE.Scene {
  const scene = new THREE.Scene();
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, "#9fc9f3");
    gradient.addColorStop(0.25, "#b8d9f5");
    gradient.addColorStop(0.58, "#d4e7f1");
    gradient.addColorStop(1, "#f1d0a0");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 28; i++) {
      const sx = Math.random() * 512;
      const sy = 42 + Math.random() * 240;
      const rad = 18 + Math.random() * 44;
      const alpha = 0.08 + Math.random() * 0.12;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    scene.background = texture;
    scene.backgroundIntensity = 1.0;
  } else {
    scene.background = new THREE.Color(0xb8d9f5);
  }
  scene.fog = new THREE.Fog(0xc8dceb, gridSize * 2.4, gridSize * 5.5);
  return scene;
}

function createCamera(container: HTMLElement, gridSize: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(
    46,
    container.clientWidth / container.clientHeight,
    0.1,
    500,
  );
  const center = gridSize / 2;
  camera.position.set(center - gridSize * 0.25, gridSize * 0.5, center + gridSize * 0.35);
  camera.lookAt(center, 0, center);
  return camera;
}

function createRenderer(container: HTMLElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  container.appendChild(renderer.domElement);
  return renderer;
}

function createControls(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  gridSize: number,
): OrbitControls {
  const controls = new OrbitControls(camera, renderer.domElement);
  const center = gridSize / 2;
  controls.target.set(center, 0, center);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.minDistance = Math.max(10, gridSize * 0.15);
  controls.maxDistance = gridSize * 1.8;
  controls.maxPolarAngle = Math.PI / 2.2;
  controls.update();
  controls.addEventListener("change", () => clampCameraTarget(controls.target, gridSize));
  return controls;
}

function attachResizeHandler(context: SceneContext): void {
  window.addEventListener("resize", () => {
    context.camera.aspect =
      context.container.clientWidth / context.container.clientHeight;
    context.camera.updateProjectionMatrix();
    context.renderer.setSize(
      context.container.clientWidth,
      context.container.clientHeight,
    );
    context.composer.setSize(
      context.container.clientWidth,
      context.container.clientHeight,
    );
  });
}

export function renderFrame(ctx: SceneContext): void {
  ctx.controls.update();
  if (ctx.bloomPass.enabled) {
    ctx.composer.render();
    return;
  }
  ctx.renderer.render(ctx.scene, ctx.camera);
}

export function setSceneQuality(context: SceneContext, quality: GraphicsQuality): void {
  const profile = getRenderQualityProfile(quality);
  const pixelRatio = Math.min(window.devicePixelRatio, profile.pixelRatioCap);
  context.quality = quality;
  context.renderer.setPixelRatio(pixelRatio);
  context.composer.setPixelRatio(pixelRatio);
  context.composer.setSize(context.container.clientWidth, context.container.clientHeight);
  context.bloomPass.enabled = profile.bloom;
  context.bloomPass.strength = profile.bloomStrength;
  context.bloomPass.radius = profile.bloomRadius;
  context.bloomPass.threshold = profile.bloomThreshold;
  setShadowMapSize(context.scene, profile.shadowMapSize);
}

function createPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): { composer: EffectComposer; bloomPass: UnrealBloomPass } {
  const composer = new EffectComposer(renderer);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(renderer.domElement.width, renderer.domElement.height),
    0.15,
    0.08,
    0.92,
  );
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
  return { composer, bloomPass };
}

function setShadowMapSize(scene: THREE.Scene, size: number): void {
  scene.traverse((object) => {
    if (
      !(object instanceof THREE.DirectionalLight) ||
      object.shadow.mapSize.width === size
    )
      return;
    object.shadow.mapSize.set(size, size);
    object.shadow.map?.dispose();
    object.shadow.map = null;
  });
}
