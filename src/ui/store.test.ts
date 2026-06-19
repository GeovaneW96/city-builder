import { describe, it, expect } from "vitest";
import { useUIStore } from "./store";

describe("UIStore", () => {
  it("starts with default camera position", () => {
    const state = useUIStore.getState();
    expect(state.camera.position).toEqual([32, 40, 32]);
    expect(state.camera.target).toEqual([32, 0, 32]);
  });

  it("starts with no selection or hover", () => {
    const state = useUIStore.getState();
    expect(state.selectedTile).toBeNull();
    expect(state.hoveredTile).toBeNull();
  });

  it("starts with no build mode", () => {
    const state = useUIStore.getState();
    expect(state.buildMode).toBeNull();
    expect(state.selectedRoadType).toBe("dirt");
    expect(state.selectedZoneType).toBe("residential");
    expect(state.selectedBuildingId).toBeNull();
  });

  it("sets build mode and clears preview", () => {
    const store = useUIStore.getState();
    store.setBuildMode("road");
    expect(useUIStore.getState().buildMode).toBe("road");
    expect(useUIStore.getState().placementPreview).toBeNull();
  });

  it("sets concrete build tools", () => {
    const store = useUIStore.getState();
    store.setZoneTool("commercial");
    expect(useUIStore.getState().buildMode).toBe("zone");
    expect(useUIStore.getState().selectedZoneType).toBe("commercial");

    store.setBuildingTool("clinic");
    expect(useUIStore.getState().buildMode).toBe("building");
    expect(useUIStore.getState().selectedBuildingId).toBe("clinic");
  });

  it("sets selected tile", () => {
    useUIStore.getState().setSelectedTile([5, 5]);
    expect(useUIStore.getState().selectedTile).toEqual([5, 5]);
  });

  it("updates camera partially", () => {
    useUIStore.getState().updateCamera({ zoom: 2 });
    expect(useUIStore.getState().camera.zoom).toBe(2);
    expect(useUIStore.getState().camera.position).toEqual([32, 40, 32]);
  });
});
