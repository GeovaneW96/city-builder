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

describe("scene camera bounds", () => {
  it("adapts max/min distance to grid size", async () => {
    const { createScene } = await import("./scene");
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 800 });
    Object.defineProperty(container, "clientHeight", { value: 600 });

    const small = createScene(container, 64);
    expect(small.controls.maxDistance).toBeCloseTo(115.2, 1);
    expect(small.controls.minDistance).toBeCloseTo(10, 1);

    const large = createScene(container, 128);
    expect(large.controls.maxDistance).toBeCloseTo(230.4, 1);
    expect(large.controls.minDistance).toBeCloseTo(19.2, 1);
  });

  it("starts camera centered on the map", async () => {
    const { createScene } = await import("./scene");
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 800 });
    Object.defineProperty(container, "clientHeight", { value: 600 });

    const ctx = createScene(container, 100);
    expect(ctx.controls.target.x).toBeCloseTo(50, 5);
    expect(ctx.controls.target.z).toBeCloseTo(50, 5);
  });

  it("uses terrain-stable directional shadow bias", async () => {
    const { createScene } = await import("./scene");
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 800 });
    Object.defineProperty(container, "clientHeight", { value: 600 });

    const ctx = createScene(container, 64);
    const sunlight = ctx.scene.children.find(
      (child): child is THREE.DirectionalLight =>
        child instanceof THREE.DirectionalLight && child.castShadow,
    );

    expect(sunlight?.shadow.bias).toBeCloseTo(-0.00002, 7);
    expect(sunlight?.shadow.normalBias).toBeCloseTo(0.04, 3);
  });
});
