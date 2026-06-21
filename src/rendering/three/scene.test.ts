// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

vi.mock("three/src/renderers/WebGLRenderer.js", () => ({}));
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
});
