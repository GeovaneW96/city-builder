# AGENTS.md

This file contains instructions for AI coding agents working in this repository.

## Project Type

This is a browser-based 3D city builder game built with TypeScript and Three.js.

The game is simulation-heavy. The most important engineering rule is:

> Keep simulation independent from rendering.

Three.js should visualize game state. It should not own core city simulation logic.

## Agent Behavior Rules

When making changes:

1. Read relevant docs before implementing.
2. Keep changes small and scoped.
3. Do not implement unrelated features.
4. Update docs when behavior changes.
5. Add or update tests for simulation logic.
6. Do not hardcode balance values inside systems if they belong in data files.
7. Do not mix UI, rendering, and simulation logic.
8. Prefer clear, boring code over clever code.
9. Avoid large rewrites unless explicitly requested.
10. Leave TODOs only when they are specific and linked to backlog items.

## Required Architecture Boundaries

Expected high-level structure once code exists:

```txt
src/
  simulation/
    grid/
    economy/
    demand/
    buildings/
    services/
    traffic/
    progression/
    scenarios/

  rendering/
    three/
    camera/
    meshes/
    materials/
    picking/

  ui/
    components/
    panels/
    overlays/
    hud/

  data/
    buildings/
    balance/
    unlocks/
    scenarios/

  save/
    serialization/
    migrations/

  shared/
    types/
    math/
    events/
```

## Simulation Rules

Simulation code:

- must not import from Three.js;
- must be deterministic where possible;
- must be testable without a browser;
- should use explicit state input/output;
- should avoid hidden global state;
- should separate tick/update logic from data definitions.

Rendering code:

- may read simulation state;
- may create meshes, materials, cameras, and scene objects;
- should not calculate economy, demand, happiness, or growth rules.

UI code:

- should present state and send player commands;
- should not directly mutate low-level simulation structures unless through defined actions/commands.

## Game Design Priorities

Prioritize:

1. Clear player feedback.
2. Fun core loop.
3. Visible city growth.
4. Meaningful tradeoffs.
5. Smooth interaction.
6. Performance.
7. Content variety.

Do not prioritize:

- large maps before the prototype is fun;
- realistic graphics before strong readability;
- complex traffic before basic city systems;
- multiplayer before single-player is complete;
- modding before stable data schemas.

## MVP Scope

The MVP is a guided city-builder scenario where the player reaches 1,000 population without bankruptcy.

MVP includes:

- grid map;
- road placement;
- zoning;
- auto-growing buildings;
- money;
- population;
- demand;
- happiness;
- basic services;
- milestones/unlocks;
- warnings;
- save/load;
- basic tutorial objectives.

MVP excludes:

- multiplayer;
- terrain editing;
- full citizen agent simulation;
- advanced traffic simulation;
- realistic asset pipeline;
- mod support;
- procedural map generation;
- mobile-specific controls;
- disasters, unless used as a later event system.

## Testing Expectations

For every simulation feature, include tests where practical.

Examples:

- road placement validity;
- zone painting;
- building growth rules;
- economy tick;
- demand calculation;
- service coverage;
- unlock milestones;
- save/load round-trip;
- bankruptcy condition.

Do not rely only on visual testing for simulation behavior.

## Suggested Commands

These commands should be updated after the project is initialized.

```bash
npm install
npm run dev
npm run test
npm run lint
npm run typecheck
npm run build
```

If commands do not exist yet, add them when project scaffolding is created.

## Data-Driven Design

Buildings, zones, services, unlocks, scenarios, balance values, and tutorials should be data-driven.

Prefer:

```ts
const buildingDefinition = {
  id: "small_clinic",
  category: "health",
  cost: 12000,
  upkeep: 300,
  size: [2, 2],
  effects: {
    healthCoverageRadius: 8,
    happiness: 3
  }
};
```

Avoid scattering magic values across simulation systems.

## Codex Task Style

Good task:

> Implement road placement only. Add drag placement, cost calculation, invalid preview, and unit tests. Do not implement zoning yet.

Bad task:

> Build the whole city builder.

## Pull Request Expectations

Every meaningful change should explain:

- what changed;
- why it changed;
- how it was tested;
- what docs were updated;
- what tradeoffs were made.

## Documentation Update Rule

If a change affects game rules, update the corresponding design doc.

Examples:

- economy behavior -> `docs/06_ECONOMY_AND_BALANCING.md`
- new unlock -> `docs/07_PROGRESSION_AND_UNLOCKS.md`
- rendering pattern -> `docs/15_THREEJS_RENDERING_GUIDE.md`
- new save field -> `docs/16_DATA_MODEL_AND_SAVE_SYSTEM.md`
- shared type change -> `docs/26_SHARED_TYPES_SPEC.md`
- data file change -> `docs/27_DATA_FILES_SPEC.md`
- game loop timing change -> `docs/05_SIMULATION_SYSTEMS.md`
- store or event bus change -> `docs/14_TECHNICAL_ARCHITECTURE.md`

## First Implementation Task

Start with `docs/28_TASK_00_SCAFFOLDING.md`.

That task scaffolds the project, shared types, data files, stores, event bus, grid rendering, and camera. Do not skip it or combine it with later tasks.
