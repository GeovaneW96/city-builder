# Save Management

## Purpose

This document defines the save slot system, autosave behavior, and export/import of save files. It covers the storage layer, slot metadata, migration on load, and the player-facing UI for managing their cities.

## Save Slots

### Slot Layout

| #   | Slot ID    | Type     | Description               |
| --- | ---------- | -------- | ------------------------- |
| 0   | `autosave` | Autosave | Overwritten automatically |
| 1   | `manual_0` | Manual   | Player-named slot         |
| 2   | `manual_1` | Manual   | Player-named slot         |
| 3   | `manual_2` | Manual   | Player-named slot         |
| 4   | `manual_3` | Manual   | Player-named slot         |
| 5   | `manual_4` | Manual   | Player-named slot         |

Total: 1 autosave + 5 manual slots.

### Slot Metadata

Each slot has associated metadata stored separately from the full save blob for efficient listing without deserializing the entire city state.

```ts
interface SlotMetadata {
  id: string; // "autosave" | "manual_0" .. "manual_4"
  name: string; // player-chosen name (empty for autosave)
  cityName: string; // city name from save
  population: number;
  money: number;
  happiness: number; // 0–100 average happiness
  playTime: number; // total ticks elapsed
  date: string; // ISO 8601 real timestamp of last save
  saveVersion: number; // schema version used when saving
  scenarioId: string; // scenario identifier, if applicable
}
```

Metadata is updated on every save.

### Storage Keys (localStorage)

| Key Pattern          | Content           |
| -------------------- | ----------------- |
| `save_slot_{id}`     | Full save blob    |
| `save_metadata_{id}` | `SlotMetadata`    |
| `save_index`         | Array of slot IDs |

### Autosave Behavior

- Triggers every 5 minutes of real time (configurable).
- Only triggers while the game is unpaused.
- Does not trigger if the game is paused or in menu.
- Overwrites the `autosave` slot silently.
- Does not fire achievement unlocks or events.
- Autosave interval pauses during save/load operations.

### Slot Selection UI

The slot selection screen displays:

- List of all 6 slots (autosave + 5 manual).
- Each slot shows: city name, population, money, happiness, play time, last save date, save version.
- Empty slots show "Empty" with a new-game prompt.
- Actions: Load, Save (overwrite), Delete, Export.
- Autosave slot has a distinct visual indicator (e.g. clock icon).

## Export/Import

### Export

Export serializes the current save slot to a downloadable `.json` file.

**Flow:**

1. Player clicks "Export" on a slot in the save management UI.
2. System reads the full save blob from `save_slot_{id}`.
3. Wraps it in the export envelope (see schema below).
4. Triggers a browser download via `URL.createObjectURL` + `<a>` click.
5. Default filename: `{cityName}_{timestamp}.json`.

**Export File Format:**

```ts
interface ExportFile {
  meta: {
    exportVersion: number; // export format version (starts at 1)
    exportedAt: string; // ISO 8601
    sourceSlotId: string;
    gameVersion: string; // game build version
  };
  save: {
    version: number; // save schema version
    cityName: string;
    state: unknown; // the full CityState object
  };
  achievements: {
    achievements: AchievementState[];
  };
}
```

### Import

Import loads a `.json` file from disk and either replaces an existing slot or creates a new one.

**Flow:**

1. Player clicks "Import" in the save management UI.
2. A file picker opens, restricted to `.json`.
3. File is read and parsed.
4. Validation is performed against a JSON schema.
5. If valid, the player chooses a destination slot.
6. If the destination slot is occupied, a confirmation prompt appears.
7. On confirm, the slot is overwritten with the imported data.
8. Migration pipeline runs if `save.version < currentVersion`.

**Drag-and-drop:**

A drop zone is available on the slot selection screen. Dropping a `.json` file triggers the same import flow.

### Validation

On import, the system validates:

- File is valid JSON.
- `meta.exportVersion` is a supported export format version.
- `save.version` is a known save schema version.
- `save.state` is present and non-null.
- `save.cityName` is a non-empty string.
- All required fields in the export envelope exist.

If validation fails, a specific error message is shown (e.g. "Invalid save file: missing city name").

## Migration Pipeline

### Overview

When a save is loaded (either from localStorage or imported file), the migration pipeline runs if the save's `version` is less than `CURRENT_SAVE_VERSION`.

### Migration Functions

```ts
type MigrationFn = (save: unknown) => unknown;
```

Each migration function accepts the save blob at version N and returns it at version N+1.

### Pipeline Execution

1. Read save blob and extract `version`.
2. For each version from `save.version` to `CURRENT_SAVE_VERSION - 1`:
   a. Look up migration function for that version.
   b. Apply migration.
3. Return the fully migrated save blob.

Migrations are applied sequentially and must preserve forward-compatibility (older saves always migrate forward).

### Migration Registry

```ts
const migrations: Record<number, MigrationFn> = {
  1: migrateV1ToV2,
  2: migrateV2ToV3,
  // ...
};
```

### Migration Examples

| From | To  | Change                       |
| ---- | --- | ---------------------------- |
| 1    | 2   | Add achievements state field |
| 2    | 3   | Add district policies state  |

### Error Handling

If a migration fails, the load is aborted and an error is shown ("Save file could not be loaded. It may be corrupted or from a newer version."). The original save blob is preserved to prevent data loss.

## IndexedDB Migration Path

Initial implementation uses localStorage. For future scale:

- When a save blob exceeds 5 MB (localStorage per-key limit warning), migrate to IndexedDB automatically.
- IndexedDB stores saves under the same slot ID keys but as structured objects.
- A compatibility layer abstracts storage behind a `SaveStorage` interface:

```ts
interface SaveStorage {
  getSlot(id: string): Promise<SlotData | null>;
  setSlot(id: string, data: SlotData, meta: SlotMetadata): Promise<void>;
  deleteSlot(id: string): Promise<void>;
  listSlots(): Promise<SlotMetadata[]>;
}
```

- localStorage implementation wraps `localStorage.getItem/setItem/removeItem`.
- IndexedDB implementation uses object stores with the same interface.

## Data Constants

```ts
interface SaveManagementConfig {
  autosaveIntervalMs: number; // default: 300000 (5 min)
  maxManualSlots: number; // default: 5
  exportVersion: number; // default: 1
  saveVersion: number; // current schema version
  localStorageKeyPrefix: string; // default: "save_"
  maxSaveBlobSizeBytes: number; // default: 4194304 (4 MB warning threshold)
}
```

## Tests

- [ ] Save to slot writes blob and metadata to localStorage
- [ ] Load from slot returns correct blob
- [ ] Load from empty slot returns null
- [ ] Delete slot clears blob and metadata
- [ ] Overwrite slot replaces existing data
- [ ] Slot metadata is updated on every save
- [ ] Slot metadata reflects current city state (population, money, happiness)
- [ ] Autosave triggers at correct interval when unpaused
- [ ] Autosave does not trigger while paused
- [ ] Autosave interval resets after manual save
- [ ] Export produces valid JSON with correct envelope structure
- [ ] Export filename matches pattern `{cityName}_{timestamp}.json`
- [ ] Import accepts valid export file and loads into slot
- [ ] Import rejects invalid JSON with error message
- [ ] Import rejects missing required fields
- [ ] Import validates `exportVersion` is supported
- [ ] Import validates `save.version` is known
- [ ] Import sends save through migration pipeline if version < current
- [ ] Migration function transforms V1 state to V2 correctly
- [ ] Migration pipeline runs all migrations in sequence
- [ ] Migration failure shows error and preserves original blob
- [ ] Full round-trip: save → export → import → load produces identical state
- [ ] Drag-and-drop import works (Playwright test)
- [ ] Slot list UI shows correct metadata for populated slots
- [ ] Slot list UI shows "Empty" for unpopulated slots
- [ ] Delete with confirmation removes slot
- [ ] Slot index (`save_index`) correctly tracks created slots
- [ ] localStorage key constraints do not overflow (key length test)
- [ ] Save storage interface works with both localStorage and IndexedDB fakes
