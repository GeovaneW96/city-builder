# Performance Guide

## Purpose

Browser 3D games need performance discipline from the beginning.

Avoid expensive architecture choices that prevent scaling.

## Performance Targets

Initial targets:

- 60 FPS ideal;
- 30 FPS minimum acceptable;
- no noticeable freeze during placement;
- simulation tick under a few milliseconds;
- map capped at 64x64.

## Main Risks

- too many draw calls;
- one mesh per tile;
- recreating meshes every frame;
- expensive raycasting;
- large React re-renders;
- simulation running every animation frame;
- pathfinding too often;
- memory leaks from undisposed Three.js resources.

## Rendering Guidelines

- Use instanced meshes for repeated simple objects and reuse loaded GLTF geometry/materials for
  generated models.
- Batch static geometry when possible.
- Avoid rendering every tile as a separate mesh.
- Update only changed objects.
- Use simple materials.
- Gate bloom and other post-processing behind quality settings.
- Dispose geometries/materials/textures when removed.

## Simulation Guidelines

- Do not run full simulation every render frame.
- Use fixed ticks.
- Cache derived data where useful.
- Avoid recalculating the entire city unnecessarily.
- Keep pathfinding limited and staged.
- Use dirty flags for changed regions.

## UI Guidelines

- Avoid re-rendering the whole UI on every simulation tick.
- Use selectors to subscribe to specific state.
- Debounce expensive panels/overlays if needed.

## Profiling

Debug tools:

- FPS counter;
- draw call count;
- mesh count;
- simulation tick time;
- memory usage estimates;
- slow system warnings.

## Current Implementation

The inspector includes a toggleable debug overlay. It reports an averaged frames-per-second
sample, the current Three.js draw-call count, and the duration of the most recent simulation
tick. These diagnostics read rendering and clock data only; they do not feed back into the city
simulation.

The renderer exposes `low`, `medium`, `high`, and `ultra` profiles. They cap device pixel ratio,
choose shadow-map resolution, enable bloom only at high or ultra, and reduce generated street,
vehicle, and nature detail at lower settings. The generated GLB manager preloads each asset once
and clones cached scenes, avoiding repeat fetches and source-geometry recreation.

The game starts at the `medium` profile. This keeps bloom disabled and caps pixel ratio at 1.5 so
the initial scenario remains responsive on integrated GPUs; `high` and `ultra` remain available
for higher-end hardware.

City rendering is synchronized from simulation or UI changes rather than every animation frame.
Static terrain is rebuilt only when terrain data changes; ordinary road, zoning, and building
updates leave it intact.

## Initial Limits

Initial limits:

- 64x64 map;
- simple building geometry;
- no individual citizen simulation;
- no advanced traffic pathfinding;
- limited active overlays.

These limits can be expanded after profiling.
