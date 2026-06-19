# Codex Task: Project Scaffolding and Foundation

## Goal

Initialize the Vite + TypeScript + Three.js project. Create the canonical shared types file, all data files, the simulation state skeleton, the event bus, and the Zustand stores. Add a Three.js scene with a flat 64×64 grid and a city-builder camera.

No game simulation logic yet (no economy, demand, building growth, etc.).

## Read First

- `AGENTS.md`
- `docs/04_SIMULATION_SYSTEMS.md` (especially the Game Loop Timing section)
- `docs/08_MAP_GRID_AND_TERRAIN.md`
- `docs/13_TECHNICAL_ARCHITECTURE.md` (especially State Management and Event Bus sections)
- `docs/14_THREEJS_RENDERING_GUIDE.md`

## Scope

### Implement

1. **Project setup**
   - Initialize npm project with: `typescript`, `vite`, `three`, `@types/three`, `zustand`, `vitest`
   - `tsconfig.json` with strict mode, ES2022 target
   - `vite.config.ts` for a vanilla TS app
   - `vitest.config.ts` (can share vite config)
   - Basic `index.html` with a full-viewport canvas container
   - Entry point `src/main.ts` that bootstraps the app

2. **Shared types** (`src/shared/types.ts`)
   - All types consumed from `docs/13_TECHNICAL_ARCHITECTURE.md` (including `CityState`, `GameEvent`, `GameCommand`, and all related types)
   - No extra types
   - No game logic

3. **Data files** (`src/data/`)
   - All files and values from `docs/05_ECONOMY_AND_BALANCING.md`, `docs/07_BUILDINGS_AND_ZONES.md`, `docs/06_PROGRESSION_AND_UNLOCKS.md`, and `docs/22_SCENARIOS.md`
   - Every file exports a named constant matching the spec
   - No game logic inside data files

4. **Event bus** (`src/shared/event-bus.ts`)
   - Typed `EventBus` interface
   - Concrete `createEventBus()` factory
   - `GameEvent` type imported from `types.ts`

5. **Simulation store** (`src/simulation/store.ts`)
   - Zustand store holding `CityState`
   - Initial state factory: `createInitialCityState(): CityState`
   - `processCommand` stub (validates bounds, returns `CommandResult`, no side effects)
   - `tick` stub (accepts state, returns state, no side effects)
   - All state fields initialized to defaults

6. **UI store** (`src/ui/store.ts`)
   - Zustand store for camera, selection, hover, build mode
   - All fields defaulted as specified in `docs/13_TECHNICAL_ARCHITECTURE.md`

7. **Three.js scene** (`src/rendering/three/scene.ts`)
   - Scene, renderer, camera setup
   - Perspective camera at a city-builder angle
   - Camera controls (pan, zoom, orbit) — use `three/addons/OrbitControls`
   - Camera bounds: prevent going below the map or beyond map edges

8. **Grid rendering** (`src/rendering/three/grid.ts`)
   - 64×64 flat grid on the XZ plane
   - Each tile is a visible square (wireframe or material)
   - Tile hover highlight (change color on hover)
   - Tile selection highlight (different color on click)

9. **Placement preview** (`src/ui/build-mode.ts`)
   - Functions to compute `PlacementPreview` from mouse position + active tool
   - Grid-snapped coordinates
   - No placement mutation — preview only

10. **Package.json scripts**
    - `dev` — `vite`
    - `build` — `vite build`
    - `test` — `vitest run`
    - `typecheck` — `tsc --noEmit`
    - `lint` — (basic eslint or skip for now)

### Do NOT Implement

- Road placement logic (cost deduction, state mutation)
- Zone painting logic
- Building growth or definitions usage
- Economy tick
- Demand calculation
- Happiness calculation
- Service coverage
- Warnings
- Progression or milestones
- Save/load
- UI components (no React yet — use simple HTML overlays if needed for debugging)
- Audio
- Any game "systems" — only scaffolding and types

## Acceptance Criteria

- [ ] `npm install` completes without errors.
- [ ] `npm run dev` opens a browser with a visible 64×64 grid.
- [ ] Camera pans, zooms, and orbits around the grid.
- [ ] Moving the mouse over a tile changes its color.
- [ ] Clicking a tile changes its selection color.
- [ ] Grid does not go out of bounds; camera cannot get lost.
- [ ] `npm run typecheck` passes with zero errors.
- [ ] `npm run test` runs (no tests yet, but vitest is configured).
- [ ] `npm run build` produces a valid dist folder.

## Testing Requirements

- [ ] Add a smoke test: `src/simulation/store.test.ts` verifies `createInitialCityState()` produces the correct default shapes.
- [ ] Add a smoke test: `src/shared/event-bus.test.ts` verifies subscribe/emit/unsubscribe.
- [ ] Add a smoke test: `src/ui/store.test.ts` verifies initial state values.
- [ ] Run `npm run typecheck` and confirm zero errors.
- [ ] Run `npm run test` and confirm all smoke tests pass.

## Architecture Requirements

- Simulation code (`src/simulation/`) must not import Three.js.
- Shared types (`src/shared/types.ts`) must not import simulation, rendering, or UI code.
- Data files (`src/data/`) must not import simulation logic — only use for static definitions.
- Zustand stores should be minimal (no middleware like Immer unless needed).
- Keep the event bus simple — a typed subscriber list, no dependencies.

## File Manifest

The task should produce exactly these files (directories and files):

```
package.json
tsconfig.json
vite.config.ts
vitest.config.ts
index.html

src/
  main.ts

  shared/
    types.ts
    event-bus.ts
    event-bus.test.ts

  simulation/
    store.ts
    store.test.ts

  ui/
    store.ts
    store.test.ts

  rendering/
    three/
      scene.ts
      grid.ts

  data/
    buildings/
      index.ts
      residential.ts
      commercial.ts
      industrial.ts
      services.ts
      utilities.ts
      civic.ts
    balance/
      index.ts
      construction.ts
      upkeep.ts
      taxes.ts
      income.ts
      happiness.ts
      demand.ts
    unlocks/
      index.ts
      milestones.ts
    scenarios/
      index.ts
      first_settlement.ts
```

Do not create files outside this list.

## Notes

- Use `GridHelper` for the initial grid or a custom plane — whichever is simpler and renders clearly.
- Hover/selection can use a simple highlight mesh that follows the cursor.
- Camera should start centered on the middle of the map (tile 32, 32 in world space).
- Default tile color: light green (#8BC34A or similar). Hover: lighter green. Selected: blue.
- The event bus implementation should be ~30 lines of code. Do not over-engineer it.
- Import data files and shared types using relative paths only.
