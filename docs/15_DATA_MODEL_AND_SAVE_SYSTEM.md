# Data Model and Save System

## Purpose

This document defines how game data should be represented and saved.

## Save Goals

The save system should:

- preserve the city state;
- support versioning;
- be local-first;
- be easy to migrate;
- avoid saving unnecessary rendering data.

## What to Save

Save simulation state, not rendering state.

Save:

- map tiles;
- roads;
- zones;
- buildings;
- economy;
- population;
- demand;
- services;
- happiness;
- progression;
- scenario state;
- game time;
- RNG seed if used;
- achievements state;
- slot metadata (name, cityName, population, money, happiness, playTime, saveVersion);
- accumulated stats for achievement conditions (money ever negative flag, consecutive happy ticks, cumulative road tiles, consecutive positive income months).

Do not save:

- Three.js meshes;
- materials;
- camera animation internals;
- transient hover state;
- temporary UI panels.

## Save Schema

Each save contains:

- `version` — schema version number;
- `createdAt` — ISO date string of creation;
- `updatedAt` — ISO date string of last save;
- `cityName` — player-chosen or default name;
- `state` — the full `CityState` object;
- `achievements` — array of achievement state objects;
- `slotMetadata` — save slot metadata.

See `33_SAVE_MANAGEMENT.md` for the storage layer, slot layout, export/import format, migration pipeline, and operational details.

## Serialization Requirements

Save data must be:

- JSON serializable;
- deterministic;
- no class instances unless converted;
- no functions;
- no circular references.

## Round-Trip Tests

Every save schema change should include tests:

1. create full city state (including achievements, slot metadata);
2. serialize to JSON;
3. deserialize from JSON;
4. compare important values (population, money, happiness, achievement states);
5. run a simulation tick successfully on the deserialized state;
6. verify save slot metadata is preserved.

Cloud saves are not in scope for the initial version.
