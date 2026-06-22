import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import type { BuildingInstance } from "../../shared/types";
import { createInitialCityState } from "../../simulation/state";
import {
  createCityRenderLayers,
  syncCityRenderLayers,
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
});

function createHouse(id: string, x: number, y: number): BuildingInstance {
  return {
    id,
    definitionId: "small_house",
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
