# Performance Guide

## Purpose

Browser 3D games need performance discipline from the beginning.

The MVP should avoid expensive architecture choices that prevent scaling.

## Performance Targets

Initial targets:

- 60 FPS ideal;
- 30 FPS minimum acceptable;
- no noticeable freeze during placement;
- simulation tick under a few milliseconds for MVP city;
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

- Use instanced meshes for repeated objects.
- Batch static geometry when possible.
- Avoid rendering every tile as a separate mesh.
- Update only changed objects.
- Use simple materials.
- Avoid heavy post-processing in MVP.
- Dispose geometries/materials/textures when removed.

## Simulation Guidelines

- Do not run full simulation every render frame.
- Use fixed ticks.
- Cache derived data where useful.
- Avoid recalculating the entire city unnecessarily.
- Keep pathfinding limited and staged.
- Use dirty flags for changed regions later.

## UI Guidelines

- Avoid re-rendering the whole UI on every simulation tick.
- Use selectors to subscribe to specific state.
- Debounce expensive panels/overlays if needed.

## Profiling

Add debug tools later:

- FPS counter;
- draw call count;
- mesh count;
- simulation tick time;
- memory usage estimates;
- slow system warnings.

## MVP Limits

Initial limits:

- 64x64 map;
- simple building geometry;
- no individual citizen simulation;
- no advanced traffic pathfinding;
- limited active overlays.

These limits can be expanded after profiling.
