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

## Performance Rules

- Do not recreate all meshes every simulation tick.
- Diff state changes and update only changed objects.
- Use object pools where useful.
- Use instanced meshes for repeated objects.
- Merge static geometries.
- Avoid expensive raycasts against every object if grid picking is enough.
- Dispose of removed geometries and materials.

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
