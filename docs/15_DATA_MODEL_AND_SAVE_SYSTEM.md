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
- RNG seed if used.

Do not save:

- Three.js meshes;
- materials;
- camera animation internals;
- transient hover state;
- temporary UI panels.

## Save Schema

Suggested fields:

- `version` — schema version number;
- `createdAt` — ISO date string of creation;
- `updatedAt` — ISO date string of last save;
- `cityName` — player-chosen or default name;
- `state` — the full `CityState` object.

## Versioning

Start with:

```txt
saveVersion = 1
```

When breaking schema changes occur, add migrations.

A migration function accepts an unknown save blob and returns a typed `SaveGame`, migrating from older versions to the current schema.

## Storage

Options:

- localStorage for quick prototype;
- IndexedDB for larger saves.

Recommended:

- start with localStorage if state is small;
- move to IndexedDB when needed.

## Save Slots

Initial:

- one autosave;
- one manual save.

Additional save features:

- multiple save slots;
- named cities;
- export/import save file.

## Serialization Requirements

Save data must be:

- JSON serializable;
- deterministic;
- no class instances unless converted;
- no functions;
- no circular references.

## Round-Trip Tests

Every save schema change should include tests:

1. create city state;
2. serialize;
3. deserialize;
4. compare important values;
5. run a simulation tick successfully.

## Migration Policy

When changing save schema:

- add migration;
- update docs;
- add test for old save fixture;
- avoid breaking existing player saves after release.

Cloud saves are not in scope for the initial version.
