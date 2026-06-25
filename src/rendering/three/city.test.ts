import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import type { BuildingInstance } from "../../shared/types";
import { createInitialCityState } from "../../simulation/state";
import {
  createCityRenderLayers,
  syncCityRenderLayers,
  syncPlacementPreview,
  type BuildingRenderInfoLookup,
} from "./city";
import type { CityAssetSource } from "../../assets/AssetManager";

describe("city render layers", () => {
  it("uses one instanced mesh for repeated building definitions", () => {
    const state = createInitialCityState();
    state.buildings.push(createHouse("house:1", 4, 5), createHouse("house:2", 6, 5));
    const layers = createCityRenderLayers(new THREE.Scene());

    syncCityRenderLayers(layers, state, null, getBuildingRenderInfo);

    const buildingMesh = layers.buildings.children[0];
    expect(buildingMesh).toBeInstanceOf(THREE.InstancedMesh);
    expect((buildingMesh as THREE.InstancedMesh).count).toBe(2);
  });

  it("synchronizes removals, status changes, and zoning overlays", () => {
    const state = createInitialCityState();
    state.roads.push({
      id: "road:4,4",
      type: "dirt",
      position: [4, 4],
      connections: { north: false, east: false, south: false, west: false },
    });
    state.map[4]![4]!.roadId = "road:4,4";
    state.map[5]![4]!.zone = "residential";
    state.buildings.push(createHouse("house:1", 4, 5));
    const layers = createCityRenderLayers(new THREE.Scene());

    syncCityRenderLayers(layers, state, "zoning", getBuildingRenderInfo);
    expect(layers.roads.children.length).toBeGreaterThan(0);
    expect(layers.overlays.children).toHaveLength(1);

    state.roads = [];
    state.buildings[0]!.status = "constructing";
    syncCityRenderLayers(layers, state, null, getBuildingRenderInfo);

    expect(layers.roads.children).toHaveLength(0);
    expect(layers.overlays.children).toHaveLength(0);
    expect(layers.buildings.children[0]?.name).toBe("building:small_house:constructing");
  });

  it("keeps unchanged layer objects when only one layer is dirty", () => {
    const state = createInitialCityState();
    state.roads.push({
      id: "road:4,4",
      type: "local",
      position: [4, 4],
      connections: { north: false, east: true, south: false, west: true },
    });
    state.map[4]![4]!.roadId = "road:4,4";
    state.map[5]![4]!.zone = "residential";
    state.buildings.push(createHouse("house:1", 4, 5));
    const layers = createCityRenderLayers(new THREE.Scene());

    syncCityRenderLayers(layers, state, null, getBuildingRenderInfo);
    const roadLayer = layers.roads.children[0];
    const zoneLayer = layers.zones.children[0];
    const buildingLayer = layers.buildings.children[0];

    state.roads[0]!.type = "collector";
    syncCityRenderLayers(layers, state, null, getBuildingRenderInfo, {
      dirtyLayers: ["roads"],
      refreshTerrain: false,
    });

    expect(layers.roads.children[0]).not.toBe(roadLayer);
    expect(layers.zones.children[0]).toBe(zoneLayer);
    expect(layers.buildings.children[0]).toBe(buildingLayer);
  });
});

describe("generated city assets", () => {
  it("uses preloaded generated asset instances when a source is provided", () => {
    const state = createInitialCityState();
    state.buildings.push(createHouse("house:1", 4, 5));
    const layers = createCityRenderLayers(new THREE.Scene());
    const { source, createBuildingInstance } = createAssetSource();

    syncCityRenderLayers(layers, state, null, getBuildingRenderInfo, {
      assetSource: source,
    });

    expect(layers.buildings.children[0]?.name).toBe("building:small_house:active");
    expect(createBuildingInstance).toHaveBeenCalledOnce();
  });

  it("uses continuous road corridors when generated assets are ready", () => {
    const state = createInitialCityState();
    state.roads.push({
      id: "road:4,4",
      type: "paved",
      position: [4, 4],
      connections: { north: false, east: true, south: false, west: true },
    });
    const layers = createCityRenderLayers(new THREE.Scene());
    const { source, createAssetInstance } = createAssetSource();

    syncCityRenderLayers(layers, state, null, getBuildingRenderInfo, {
      assetSource: source,
    });

    expect(layers.roads.children.length).toBeGreaterThan(0);
    expect(createAssetInstance).not.toHaveBeenCalledWith("road_with_sidewalks");
  });

  it("renders generated-mode T intersections without modular road seams", () => {
    const state = createInitialCityState();
    state.roads.push({
      id: "road:4,4",
      type: "paved",
      position: [4, 4],
      connections: { north: true, east: false, south: true, west: true },
    });
    const layers = createCityRenderLayers(new THREE.Scene());
    const { source, createAssetInstance } = createAssetSource();

    syncCityRenderLayers(layers, state, null, getBuildingRenderInfo, {
      assetSource: source,
    });

    expect(layers.roads.children.length).toBeGreaterThan(1);
    expect(createAssetInstance).not.toHaveBeenCalledWith("road_t_intersection");
  });

  it("uses the mature oak asset for generated street trees", () => {
    const state = createInitialCityState();
    state.roads.push({
      id: "road:17,1",
      type: "local",
      position: [17, 1],
      connections: { north: false, east: true, south: false, west: true },
    });
    const layers = createCityRenderLayers(new THREE.Scene());
    const { source, createAssetInstance } = createAssetSource();

    syncCityRenderLayers(layers, state, null, getBuildingRenderInfo, {
      assetSource: source,
      refreshTerrain: false,
    });

    expect(createAssetInstance).toHaveBeenCalledWith("tree_mature_oak");
    expect(createAssetInstance).not.toHaveBeenCalledWith("tree_oak");
    expect(createAssetInstance).not.toHaveBeenCalledWith("tree_maple");
    expect(createAssetInstance).not.toHaveBeenCalledWith("tree_conifer");
    const streetTree = layers.roads.children.find(
      (child) => child.name === "asset:tree_mature_oak",
    );
    expect(streetTree?.scale.x).toBeGreaterThanOrEqual(1.04);
  });
});

describe("generated water tower asset", () => {
  it("selects the authored generated model for water towers", () => {
    const state = createInitialCityState();
    state.buildings.push(createBuilding("water-tower:1", "water_tower", 4, 5));
    const layers = createCityRenderLayers(new THREE.Scene());
    const { source, createBuildingInstance } = createAssetSource();

    syncCityRenderLayers(layers, state, null, getBuildingRenderInfo, {
      assetSource: source,
    });

    expect(layers.buildings.children[0]?.name).toBe("building:water_tower:active");
    expect(createBuildingInstance).toHaveBeenCalledWith("industrial", 8);
  });

  it("uses the authored generated model for water tower placement previews", () => {
    const layers = createCityRenderLayers(new THREE.Scene());
    const { source, createBuildingInstance } = createAssetSource();

    syncPlacementPreview(
      layers.preview,
      {
        positions: [[4, 5]],
        valid: true,
        cost: 5000,
        label: "Water Tower",
        definitionId: "water_tower",
      },
      getBuildingRenderInfo,
      source,
    );

    expect(layers.preview.children.at(-1)?.name).toBe("preview:water_tower");
    expect(createBuildingInstance).toHaveBeenCalledWith("industrial", 8);
  });
});

describe("generated landfill rendering", () => {
  it("does not select industrial generated models for landfill buildings", () => {
    const state = createInitialCityState();
    state.buildings.push(createBuilding("landfill:1", "landfill", 4, 5));
    const layers = createCityRenderLayers(new THREE.Scene());
    const { source, createBuildingInstance } = createAssetSource();

    syncCityRenderLayers(layers, state, null, getBuildingRenderInfo, {
      assetSource: source,
    });

    expect(createBuildingInstance).not.toHaveBeenCalled();
    expect(layers.buildings.children[0]?.name).toBe("building:landfill:active");
    expect(layers.buildings.children[0]).toBeInstanceOf(THREE.InstancedMesh);
  });

  it("keeps landfill placement previews on tile feedback instead of industrial models", () => {
    const layers = createCityRenderLayers(new THREE.Scene());
    const { source, createBuildingInstance } = createAssetSource();

    syncPlacementPreview(
      layers.preview,
      {
        positions: [[4, 5]],
        valid: true,
        cost: 8000,
        label: "Landfill",
        definitionId: "landfill",
      },
      getBuildingRenderInfo,
      source,
    );

    expect(createBuildingInstance).not.toHaveBeenCalled();
    expect(layers.preview.children).toHaveLength(1);
  });
});

function createHouse(id: string, x: number, y: number): BuildingInstance {
  return createBuilding(id, "small_house", x, y);
}

function createBuilding(
  id: string,
  definitionId: string,
  x: number,
  y: number,
): BuildingInstance {
  return {
    id,
    definitionId,
    position: [x, y],
    rotation: 0,
    status: "active",
    warnings: [],
    createdAtTick: 0,
    lockedUntilTick: 0,
    unresolvedWarningTicks: 0,
    upgradeTier: 1,
    lastUpgradeTick: 0,
  };
}

const getBuildingRenderInfo: BuildingRenderInfoLookup = (definitionId) => {
  if (definitionId === "water_tower") {
    return {
      size: [1, 1],
      category: "utility",
      effects: {},
    };
  }
  if (definitionId === "landfill") {
    return {
      size: [3, 3],
      category: "utility",
      effects: {},
    };
  }
  if (definitionId !== "small_house") return null;
  return {
    size: [1, 1],
    category: "residential",
    effects: {},
  };
};

function createAssetSource(): {
  source: CityAssetSource;
  createBuildingInstance: ReturnType<typeof vi.fn>;
  createAssetInstance: ReturnType<typeof vi.fn>;
} {
  const createBuildingInstance = vi.fn(() => ({
    id: "residential_rowhouse_brick",
    object: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)),
  }));
  const createAssetInstance = vi.fn((id: string) => ({
    id,
    object: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)),
  }));
  return {
    source: {
      createBuildingInstance,
      createAssetInstance,
    },
    createBuildingInstance,
    createAssetInstance,
  };
}
