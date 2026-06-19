# Technical Architecture

## Purpose

This document defines the engineering architecture for the city builder.

The most important rule:

> Simulation must be independent from rendering.

## Recommended Stack

Initial proposal:

- TypeScript;
- Vite;
- Three.js;
- React for UI;
- Zustand for UI/game state orchestration;
- Vitest for unit tests;
- Playwright for E2E;
- IndexedDB/localStorage for saves.

## High-Level Architecture

```txt
src/
  simulation/
  rendering/
  ui/
  data/
  save/
  shared/
```

## Simulation Layer

Responsible for:

- map grid;
- roads;
- zones;
- buildings;
- demand;
- economy;
- services;
- happiness;
- progression;
- warnings;
- scenarios.

Must not import:

- Three.js;
- React;
- browser-specific rendering APIs.

Simulation should expose:

- state types;
- commands/actions;
- tick/update functions;
- selectors;
- validation functions.

## Rendering Layer

Responsible for:

- Three.js scene;
- camera;
- meshes;
- materials;
- grid visualization;
- building visualization;
- road visualization;
- picking/raycasting;
- animation.

Rendering reads simulation state and renders it.

It should not own city rules.

## UI Layer

Responsible for:

- HUD;
- toolbar;
- panels;
- overlays;
- objective display;
- settings;
- warnings;
- build mode controls.

UI sends commands to simulation and rendering orchestration.

## Data Layer

Responsible for definitions:

- buildings;
- roads;
- zones;
- services;
- balance values;
- unlocks;
- scenarios.

Data should be easily editable.

## Save Layer

Responsible for:

- serialization;
- deserialization;
- versioning;
- migrations;
- browser storage.

## Command Pattern

Player actions should be represented as commands.

Examples:

- `PLACE_ROAD` — place road at (x, y) with a road type;
- `PAINT_ZONE` — paint zone type on a set of tiles;
- `PLACE_BUILDING` — place a building by id at (x, y);
- `DEMOLISH` — remove whatever is at (x, y).

Benefits:

- validation;
- undo/redo later;
- replay/debugging;
- testing.

## Game Loop

Separate:

- render loop;
- simulation loop;
- input handling.

Example:

```txt
requestAnimationFrame -> render current state
fixed interval/tick -> update simulation
input events -> dispatch commands
```

## State Ownership

Avoid multiple sources of truth.

Simulation state should be authoritative for:

- map;
- buildings;
- economy;
- population;
- services;
- warnings;
- progression.

Rendering state should store only visual objects and cached representations.

## Testing Strategy

Unit test simulation heavily.

Examples:

- road validation;
- building placement;
- economy tick;
- demand calculation;
- progression unlocks;
- save/load round trip.

Rendering tests can be lighter and mostly integration/manual early.

## State Management

### Two-Store Architecture

The application uses two independent Zustand stores to enforce the simulation/rendering boundary:

```
+---------------------+       +---------------------+
|  SimulationStore    |       |  UIClientStore       |
|                     |       |                      |
| - CityState (root)  |       | - CameraState        |
| - tick()            |       | - selectedTile        |
| - processCommand()  |       | - buildMode           |
|                     |       | - placementPreview    |
|   No Three.js       |       | - hoveredTile         |
|   No React          |       | - uiScale             |
+---------------------+       +---------------------+
        |                              |
        |  Events (GameEvent)          |
        +------------------------------+
                       |
                       v
               Render Layer reads
               SimulationStore.state
               but never writes to it.
```

### Simulation Store

- Holds the single `CityState` object.
- Written to only by:
  - `processCommand(command)` — validates and applies a player command.
  - `tick()` — advances the simulation by one tick.
- Never imported by Three.js code.
- UI reads from it via selectors (described below).

```
SimulationStore:
  - state: CityState
  - tick() — advance simulation one step
  - processCommand(cmd) — validate and apply a command, return events or error
  - loadSave(save) — restore state from save data
  - getSaveData() — serialize current state
```

### UI / Client Store

- Holds transient UI state only.
- Resets on reload / new game.
- Written to by UI interactions.

```
UIClientStore:
  - camera — position, target, zoom, pitch, rotation
  - selectedTile — currently selected grid tile or null
  - hoveredTile — tile under cursor or null
  - buildMode — active tool (road, zone, building, demolish) or null
  - placementPreview — ghost preview during build mode
  - activeOverlay — current overlay mode (zoning, power, water, etc.)
  - settings — graphics, audio, controls settings
```

### Selector Pattern

To prevent unnecessary re-renders, UI components subscribe to specific slices of simulation state:

```
Good — subscribes to a specific value, e.g. s.state.population.total
Bad — subscribes to entire state object, e.g. s.state
```

Selectors should be defined once per component or slice, e.g. subscribing only to `economy.money` instead of the entire state.

### Command Dispatch Flow

```
UI Toolbar Click
  → UIClientStore sets buildMode
  → Player clicks tile
  → UI calls simulationStore.processCommand(PLACE_ROAD {x, y, roadType})
  → Simulation store:
      1. Validates command (bounds, conflicts, money)
      2. Mutates CityState
      3. Returns CommandResult with events
  → If rendering is subscribed to events, it updates meshes
  → If UI is subscribed to state, it re-renders affected panels
```

## Event Bus

### Purpose

The event bus decouples simulation state changes from rendering and UI updates. Rather than polling every frame, rendering subscribes to specific events and reacts only when needed.

### Implementation

A lightweight typed event emitter with no external dependencies.

```
EventBus:
  - subscribe(handler) — register listener, returns unsubscribe function
  - emit(event) — dispatch an event to all subscribers
```

### Subscription Patterns

Rendering subscribes to spatial events (`TILE_CHANGED`, `BUILDING_ADDED`, `BUILDING_REMOVED`) to update meshes. UI subscribes to summary events (`ECONOMY_TICK`, `MILESTONE_REACHED`, `SCENARIO_WIN`) to update panels and notifications.

### Event Types

The full `GameEvent` union is defined in `src/shared/types.ts`.

### Batch Events

When a single command changes multiple tiles (e.g., drag-painting a zone), the simulation should emit one `GameEvent` per changed tile rather than a single batch event. The event bus implementation must handle bursts efficiently (microtask batching or RAF coalescing can be added later if profiling shows it matters).

## Performance Principles

- Use instanced meshes for repeated objects.
- Avoid one draw call per tile where possible.
- Batch static geometry.
- Avoid recreating meshes every frame.
- Dispose geometries/materials when removed.
- Keep map small initially.
- Profile before optimizing heavily.
