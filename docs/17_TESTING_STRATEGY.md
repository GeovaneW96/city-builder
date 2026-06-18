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

## E2E Tests Later

Use Playwright later for:

- app loads;
- player can place road;
- player can zone area;
- HUD updates;
- save/load works.

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
