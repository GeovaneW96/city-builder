// @vitest-environment jsdom
import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

vi.mock("three/src/renderers/WebGLRenderer.js", () => ({}));
vi.mock("three/addons/postprocessing/EffectComposer.js", () => ({
  EffectComposer: vi.fn().mockImplementation(() => ({
    addPass: vi.fn(),
    render: vi.fn(),
    setPixelRatio: vi.fn(),
    setSize: vi.fn(),
  })),
}));
vi.mock("three/addons/postprocessing/OutputPass.js", () => ({
  OutputPass: vi.fn(),
}));
vi.mock("three/addons/postprocessing/RenderPass.js", () => ({
  RenderPass: vi.fn(),
}));
vi.mock("three/addons/postprocessing/UnrealBloomPass.js", () => ({
  UnrealBloomPass: vi.fn().mockImplementation(() => ({
    enabled: true,
    radius: 0,
    strength: 0,
    threshold: 0,
  })),
}));
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return {
    ...actual,
    WebGLRenderer: vi.fn().mockImplementation(() => ({
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      domElement: document.createElement("canvas"),
      info: { render: { calls: 0 } },
      shadowMap: { enabled: false, type: 0 },
    })),
  };
});

function createTestContainer(): HTMLDivElement {
  const container = document.createElement("div");
  Object.defineProperty(container, "clientWidth", { value: 800 });
  Object.defineProperty(container, "clientHeight", { value: 600 });
  return container;
}

describe("scene camera bounds", () => {
  it("adapts max/min distance to grid size", async () => {
    const { createScene } = await import("./scene");
    const container = createTestContainer();

    const small = createScene(container, 64);
    expect(small.controls.maxDistance).toBeCloseTo(115.2, 1);
    expect(small.controls.minDistance).toBeCloseTo(10, 1);

    const large = createScene(container, 128);
    expect(large.controls.maxDistance).toBeCloseTo(230.4, 1);
    expect(large.controls.minDistance).toBeCloseTo(19.2, 1);
  });

  it("starts camera centered on the map", async () => {
    const { createScene } = await import("./scene");

    const ctx = createScene(createTestContainer(), 100);
    expect(ctx.controls.target.x).toBeCloseTo(50, 5);
    expect(ctx.controls.target.z).toBeCloseTo(50, 5);
  });

  it("uses terrain-stable directional shadow bias", async () => {
    const { createScene } = await import("./scene");

    const ctx = createScene(createTestContainer(), 64);
    const sunlight = ctx.scene.children.find(
      (child): child is THREE.DirectionalLight =>
        child instanceof THREE.DirectionalLight && child.castShadow,
    );

    expect(sunlight?.shadow.bias).toBeCloseTo(-0.00002, 7);
    expect(sunlight?.shadow.normalBias).toBeCloseTo(0.04, 3);
  });
});

describe("scene camera panning", () => {
  it("pans camera and target together", async () => {
    const { createScene, panSceneCamera } = await import("./scene");

    const ctx = createScene(createTestContainer(), 100);
    const startPosition = ctx.camera.position.clone();
    const startTarget = ctx.controls.target.clone();

    panSceneCamera(ctx, { forward: 1, right: 0 }, 4);

    const cameraDelta = ctx.camera.position.clone().sub(startPosition);
    const targetDelta = ctx.controls.target.clone().sub(startTarget);
    expect(targetDelta.length()).toBeGreaterThan(0);
    expect(cameraDelta.x).toBeCloseTo(targetDelta.x, 5);
    expect(cameraDelta.y).toBeCloseTo(targetDelta.y, 5);
    expect(cameraDelta.z).toBeCloseTo(targetDelta.z, 5);
  });

  it("keeps keyboard panning inside camera bounds", async () => {
    const { createScene, panSceneCamera } = await import("./scene");

    const ctx = createScene(createTestContainer(), 100);

    panSceneCamera(ctx, { forward: -1, right: 0 }, 200);

    expect(ctx.controls.target.x).toBeGreaterThanOrEqual(-4);
    expect(ctx.controls.target.x).toBeLessThanOrEqual(104);
    expect(ctx.controls.target.z).toBeGreaterThanOrEqual(-4);
    expect(ctx.controls.target.z).toBeLessThanOrEqual(104);
  });

  it("normalizes diagonal camera panning", async () => {
    const { createScene, panSceneCamera } = await import("./scene");

    const forward = createScene(createTestContainer(), 100);
    const diagonal = createScene(createTestContainer(), 100);
    const forwardStart = forward.controls.target.clone();
    const diagonalStart = diagonal.controls.target.clone();

    panSceneCamera(forward, { forward: 1, right: 0 }, 4);
    panSceneCamera(diagonal, { forward: 1, right: 1 }, 4);

    expect(diagonal.controls.target.distanceTo(diagonalStart)).toBeCloseTo(
      forward.controls.target.distanceTo(forwardStart),
      5,
    );
  });
});
