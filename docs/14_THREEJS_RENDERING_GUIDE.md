# Three.js Rendering Guide

## Purpose

This document defines rendering practices for the Three.js layer.

## Rendering Goals

- clear grid;
- readable city;
- smooth camera;
- responsive placement;
- acceptable browser performance.

## Scene Structure

Suggested objects:

```txt
Scene
  GridLayer
  TerrainLayer
  RoadLayer
  ZoneOverlayLayer
  BuildingLayer
  ServiceOverlayLayer
  WarningIconLayer
  EffectsLayer
```

## Camera

Recommended camera:

- orthographic or perspective with city-builder angle;
- pan;
- zoom;
- optional rotation;
- constrained bounds.

Orthographic camera improves readability and city-builder feel.

## Picking

Use raycasting to convert mouse position to grid tile.

Picking should output a tile coordinate (grid x, y) and optionally an object id if a mesh was hit.

Do not put simulation logic inside picking.

## Grid Rendering

Can use:

- grid helper;
- custom plane with grid material;
- tile hover highlight mesh.

Avoid rendering thousands of individual tile meshes if unnecessary.

## Roads

Roads can initially be simple plane/box meshes.

Road rendering variants:

- road variants based on neighboring connections;
- intersections;
- curves;
- lanes.

## Buildings

Buildings can be:

- simple low-poly boxes;
- procedural meshes;
- placeholder models.

Use instancing for repeated building types when practical.

The Foundation renderer groups buildings by definition and status, then draws each group
with a Three.js `InstancedMesh`. This keeps repeated homes and future repeated zone-grown
buildings efficient while still updating the visual when a building changes status.
Density upgrades replace the instance's definition ID, so the next renderer synchronization
automatically moves it into the appropriate mesh group and visual dimensions.

### Data Decoupling

Rendering code must not import from `src/data/` or `src/simulation/` directly. To access
building definition fields needed for rendering (size, category, service radii), the
`syncCityRenderLayers` function accepts a `BuildingRenderInfoLookup` callback. The
application layer (`src/main.ts`) provides this callback, bridging data access while
keeping the renderer agnostic of the data module. The lookup signature is:

```ts
type BuildingRenderInfoLookup = (definitionId: string) => BuildingRenderInfo | null;
```

## Placement Preview

Build mode should show:

- ghost object;
- footprint;
- valid/invalid indication;
- cost preview in UI.

## Overlays

Overlays should be separate visual modes.

Examples:

- zoning overlay;
- pollution overlay;
- service coverage;
- traffic.

Only one or two overlays should be active at once.

The Foundation toolbar provides zoning, pollution, health, education, and district overlay modes.
The zoning overlay draws the active zone color over every zoned tile, including tiles that
already contain a building. The UI keeps the active overlay mutually exclusive.

The district overlay renders the saved color for each district-owned tile. It never assigns
tiles, validates policies, or computes policy effects; those responsibilities remain in the
simulation layer.

## Render State Cache

Maintain a mapping of `buildingId → mesh/object` and `roadCoord → mesh/object` so rendering can update changed objects without rebuilding everything.

This lets rendering update changed objects without rebuilding everything.

## Debug Rendering

Useful debug tools:

- show tile coordinates;
- show road graph;
- show building ids;
- show service radius;
- show simulation tick time;
- show draw calls/FPS.
