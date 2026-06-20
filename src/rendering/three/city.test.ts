import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { BuildingInstance } from "../../shared/types";
import { createInitialCityState } from "../../simulation/state";
import { createCityRenderLayers, syncCityRenderLayers } from "./city";

describe("city render layers", () => {
  it("uses one instanced mesh for repeated building definitions", () => {
    const state = createInitialCityState();
    state.buildings.push(createHouse("house:1", 4, 5), createHouse("house:2", 6, 5));
    const layers = createCityRenderLayers(new THREE.Scene());

    syncCityRenderLayers(layers, state, null);

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

    syncCityRenderLayers(layers, state, "zoning");
    expect(layers.roads.children).toHaveLength(1);
    expect(layers.overlays.children).toHaveLength(1);

    state.roads = [];
    state.buildings[0]!.status = "constructing";
    syncCityRenderLayers(layers, state, null);

    expect(layers.roads.children).toHaveLength(0);
    expect(layers.overlays.children).toHaveLength(0);
    expect(layers.buildings.children[0]?.name).toBe("building:small_house:constructing");
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
