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

## Initial Scope

The first release is a guided city-builder scenario where the player reaches 1,000 population without bankruptcy.

Initial scope includes:

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

Excluded from initial scope:

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

## Quality Gates (Enforced Automatically)

### Pre-commit (husky + lint-staged)

Every commit runs:

1. `eslint --fix` on staged `.ts`/`.js` files
2. `prettier --write` on all staged files
3. `tsc --noEmit` via `npm run build`

Rejected commits must be fixed before they land.

### Commit Messages

Must follow [Conventional Commits](https://www.conventionalcommits.org/):
`type(scope): description`

Examples:

- `feat(simulation): add economy tick`
- `fix(rendering): correct tile highlight z-fighting`
- `test(demand): add demand calculation tests`

Enforced by `commitlint`.

### Import Restrictions (ESLint)

- `src/simulation/` — cannot import `three`, `@types/three`, or `three/*`
- `src/data/` — cannot import `../simulation`, `../rendering`, or `../ui`
- `src/shared/` — cannot import `../simulation`, `../rendering`, or `../ui`

These are lint errors, not warnings. CI fails if violated.

### Code Complexity (ESLint)

- Cyclomatic complexity capped at **10** per function
- Nesting depth capped at **4** levels
- Max **60 lines** per function (warning)
- Max **5 parameters** per function
- Max **3 nested callbacks**

Functions exceeding these limits must be refactored or split.

### Formatting

Prettier is the single source of truth. Run `npm run format` before commits (automatic with lint-staged).

## Suggested Commands

```bash
npm install              # install dependencies + initialize husky
npm run dev              # start Vite dev server
npm run test             # run vitest
npm run test:watch       # run vitest in watch mode
npm run lint             # ESLint check
npm run lint:fix         # ESLint check + auto-fix
npm run format           # Prettier format all files
npm run format:check     # Prettier check only
npm run typecheck        # tsc --noEmit
npm run build            # typecheck + vite build
```

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
    happiness: 3,
  },
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

- economy behavior -> `docs/05_ECONOMY_AND_BALANCING.md`
- new unlock -> `docs/06_PROGRESSION_AND_UNLOCKS.md`
- rendering pattern -> `docs/14_THREEJS_RENDERING_GUIDE.md`
- new save field -> `docs/15_DATA_MODEL_AND_SAVE_SYSTEM.md`
- balance change -> `docs/05_ECONOMY_AND_BALANCING.md`
- game loop timing change -> `docs/04_SIMULATION_SYSTEMS.md`
- store or event bus change -> `docs/13_TECHNICAL_ARCHITECTURE.md`


