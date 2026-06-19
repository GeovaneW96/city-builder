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

Suggested fields:

- `version` — schema version number;
- `createdAt` — ISO date string of creation;
- `updatedAt` — ISO date string of last save;
- `cityName` — player-chosen or default name;
- `state` — the full `CityState` object.
- `achievements` — array of achievement state objects.
- `slotMetadata` — save slot metadata (name, cityName, population, money, happiness, playTime, date, saveVersion).

## Save Slot Schema

Each save slot stores two keys in localStorage:

```ts
// Key: `save_slot_{id}`
interface SlotSaveBlob {
  version: number;
  createdAt: string;          // ISO date string
  updatedAt: string;          // ISO date string
  cityName: string;
  state: CityState;           // the full simulation state
  achievements: AchievementState[];
  slotMetadata: SlotMetadata;
}

// Key: `save_metadata_{id}`
interface SlotMetadata {
  id: string;                 // "autosave" | "manual_0" .. "manual_4"
  name: string;
  cityName: string;
  population: number;
  money: number;
  happiness: number;
  playTime: number;           // ticks
  date: string;               // ISO 8601
  saveVersion: number;
  scenarioId: string | null;
}
```

A `save_index` key stores the array of all slot IDs for efficient listing.

## Export/Import File Format

Exported files use a `.json` envelope:

```ts
interface ExportFile {
  meta: {
    exportVersion: number;
    exportedAt: string;       // ISO 8601
    sourceSlotId: string;
    gameVersion: string;
  };
  save: {
    version: number;
    cityName: string;
    state: unknown;
  };
  achievements: {
    achievements: AchievementState[];
  };
}
```

See `33_SAVE_MANAGEMENT.md` for full import validation, drag-and-drop, and migration-on-import details.

## Migration Pipeline

When a save is loaded with a `version` less than `CURRENT_SAVE_VERSION`, migrations are applied in sequence:

```ts
type MigrationFn = (save: unknown) => unknown;

const migrations: Record<number, MigrationFn> = {
  1: migrateV1ToV2,  // e.g. add achievements state
  2: migrateV2ToV3,  // e.g. add district policies
  // ...
};
```

### Rules

- Each migration transforms version N → N+1.
- Migrations are applied sequentially from `save.version` to `CURRENT_SAVE_VERSION - 1`.
- Migration failures abort the load and show an error; original blob is preserved.
- Every schema change must add a migration, update this doc, and include a test with an old save fixture.

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

Layout:

- one autosave slot (overwritten every 5 minutes while unpaused);
- five manual slots (player-named).

Slot metadata is stored separately for efficient slot listing without deserializing the full city state.

See `33_SAVE_MANAGEMENT.md` for complete slot management design, autosave rules, slot selection UI, export/import flow, and migration pipeline details.

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

## Migration Policy

When changing save schema:

- add a migration function to the migration registry;
- update this doc and `33_SAVE_MANAGEMENT.md`;
- add a test using an old save fixture (prevents silent breakage);
- increment `CURRENT_SAVE_VERSION`;
- avoid breaking existing player saves after release;
- add achievement and slot metadata fields if applicable.

Cloud saves are not in scope for the initial version.
