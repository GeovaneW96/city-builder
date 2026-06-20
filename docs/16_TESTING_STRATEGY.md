# Testing Strategy

## Purpose

Testing is critical because city-builder simulations are interconnected.

A small rule change can break many systems.

## Testing Priorities

Highest priority:

- simulation logic;
- placement validation;
- economy calculations;
- demand formulas;
- progression unlocks;
- save/load.

Lower priority early:

- visual rendering;
- exact UI layout;
- animation.

## Unit Tests

Use unit tests for pure simulation functions.

Examples:

### Road Placement

- cannot place outside map;
- cannot place over building;
- deducts money;
- connects neighboring road tiles.

### Zoning

- can paint empty tiles;
- cannot zone occupied tiles;
- removing zone works;
- buildings grow only on valid zones.

### Economy

- income calculated correctly;
- expenses calculated correctly;
- monthly money updates;
- bankruptcy timer starts below zero;
- bankruptcy timer resets above zero.

### Demand

- residential demand increases with available jobs;
- commercial demand increases with population;
- industrial demand responds to unemployment;
- demand is clamped between 0 and 100.

### Services

- service capacity is calculated;
- coverage radius affects nearby buildings;
- no power warning appears when capacity is insufficient.

### Progression

- unlocks happen at correct population;
- milestone rewards are applied once;
- scenario win condition triggers correctly.

### Save/Load

- state serializes and deserializes;
- save version is preserved;
- loaded state can continue simulation.

## Integration Tests

Useful integration tests:

- start new city;
- place roads/zones;
- run simulation;
- verify houses grow;
- verify population/income changes.

## E2E Tests (Playwright)

Use Playwright for full-browser scenario tests:

### Foundation Browser Suite

`npm run test:e2e` starts the Vite app and runs the Chromium suite in `e2e/`. The suite runs
serially because each scenario renders a WebGL city, avoiding GPU contention between browser
workers. It covers app loading without page errors, road placement, drag zoning, HUD growth,
manual save/load, the sound setting, and mutually exclusive overlay controls.

### App Load

- App loads without console errors
- Three.js canvas is rendered
- HUD shows default state (money, population, date)
- City hall building is visible on the grid
- Toolbar buttons are present

### Road Placement

- Click road tool, click tile → road appears
- Drag across multiple tiles → all tiles become roads
- Road cost is deducted from money
- Invalid placement (outside bounds) shows error and does not place
- Hover preview shows valid/invalid state

### Zone Painting

- Select zone type (residential), paint on empty tiles → zone appears
- Zone on road tile → rejected
- Zone on existing building → rejected
- Remove zone → tile returns to empty

### HUD Updates

- Zone residential → houses grow → population increases
- Population change reflects in HUD within expected tick count
- Money changes after road placement
- Demand bars move in response to zoning

### Save/Load Round-Trip

- Save game to a manual slot
- Reload page
- Load from the saved slot
- Verify city state matches (population, money, buildings, roads)
- Verify rating and achievements state are restored
- Simulation continues from loaded state without errors

### Milestone Unlock

- Reach milestone population threshold → unlock notification appears
- New building/tool becomes available in toolbar
- Money bonus is awarded
- Milestone is persisted after save/load

### Slot Management

- Slot list shows all 6 slots
- Save to an empty slot → slot shows metadata
- Save to an occupied slot → slot is overwritten
- Delete slot → slot returns to empty
- Autosave slot is populated after 5 minutes of unpaused play

### Export/Import

- Export a save → file is downloaded as `.json`
- Import the downloaded file → city state matches original
- Import invalid file → error message shown

Debug tool specifications and overlay details are defined in `17_PERFORMANCE_GUIDE.md`.

## Performance Regression Tests

Performance tests measure critical metrics to catch regressions:

- Simulation tick with 1,000+ buildings completes in under 16 ms
- Initial load time under 3 seconds (cold cache)
- Save serialization for a 1,000-building city under 500 ms
- Load deserialization for a 1,000-building city under 500 ms
- Road drag across 50 tiles renders preview without frame drops
- Zone painting across 100 tiles processes in under 1 tick

Test thresholds are defined in a config file and run against a reference build. Use Vitest benchmarks (`vitest bench`) for repeatable perf comparisons.

## Docs Validation

Documentation must stay consistent with the implemented code:

- A `npm run docs:check` script verifies:
  - Every feature in `MASTER_FEATURE_LIST.md` has a corresponding docs file referenced.
  - Every docs file referenced in `MASTER_FEATURE_LIST.md` exists on disk.
  - No dangling references to nonexistent document sections.
  - All `Status` fields in `MASTER_FEATURE_LIST.md` are marked (empty, WIP, or done).
- The check runs as part of CI.
- Docs changes must not break `docs:check` — this is a pre-commit gate.

## How to Write Tests for New Features

When implementing a new feature, follow this checklist:

1. **Read `MASTER_FEATURE_LIST.md`** — locate the feature's section and understand its testable logic entries.
2. **Add/update unit tests** — every testable logic row should map to at least one unit test. Tests live in `src/` co-located with the implementation file (`.test.ts`).
3. **Add/update integration tests** — if the feature spans multiple systems (e.g. economy + services + happiness), write a test that exercises the combined behavior.
4. **Add/update E2E tests** — if the feature has a visible UI result, add a Playwright test in `e2e/` that validates the user-visible behavior.
5. **Update `MASTER_FEATURE_LIST.md`** — mark the feature's status as implemented once tests pass.
6. **Run the full test suite** — `npm test` must pass.
7. **Run `npm run docs:check`** — ensure documentation references are consistent.

### Per-Feature Test Coverage Template

```txt
For any feature in MASTER_FEATURE_LIST.md:

Unit tests:
  - [ ] Core logic (pure function tests)
  - [ ] Edge cases (empty state, max values, invalid input)
  - [ ] Error paths (validation rejection, boundary conditions)

Integration tests (if applicable):
  - [ ] Cross-system interaction (e.g. new economy rule + demand)
  - [ ] Save/load with new state fields

E2E tests (if UI-visible):
  - [ ] Player can perform the action
  - [ ] HUD/UI reflects the action
  - [ ] State persists after reload
```

## Manual Playtest Checklist

For each milestone:

- Can the player understand the goal?
- Did the city respond visibly?
- Did warnings make sense?
- Did money feel fair?
- Did the next step feel obvious?
- Was anything boring or confusing?

## Regression Rule

When fixing a bug, add a test that would have caught it unless the bug is purely visual.
