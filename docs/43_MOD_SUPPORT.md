# Mod Support

## Purpose

This document defines the modding system, loading pipeline, API surface, and safety constraints.

Mod support allows players to extend the game with custom content and scripts.

## Mod Loading

At game start, the engine scans the `mods/` directory relative to the game root. Each subdirectory or `.zip` file with a valid `manifest.json` is loaded.

### Load Order

1. Scan `mods/` for manifests.
2. Validate each manifest against the schema.
3. Sort by dependency order (dependencies load first).
4. Load data mods first, then script mods.
5. Apply data merging: mod values override base game values, last loaded mod wins for conflicts.

```txt
loadingPipeline:
  scan -> validate -> sort -> loadDataMods -> loadScriptMods -> initMods
```

## Mod Manifest

Every mod must have a `manifest.json` in its root directory.

```txt
{
  "id": "my_cool_mod",
  "name": "My Cool Mod",
  "version": "1.0.0",
  "author": "PlayerName",
  "description": "Adds 5 new buildings and a scenario.",
  "type": "data" | "script",
  "dependencies": ["base_game"],
  "entryPoint": "mod.js",        // required for script mods
  "minGameVersion": "0.4.0"
}
```

| Field          | Required | Description                                         |
| -------------- | -------- | --------------------------------------------------- |
| `id`           | Yes      | Unique mod identifier, lowercase with underscores    |
| `name`         | Yes      | Display name                                         |
| `version`      | Yes      | Semantic version string                              |
| `author`       | No       | Creator name                                         |
| `description`  | No       | Short description for mod list UI                    |
| `type`         | Yes      | `"data"` or `"script"`                               |
| `dependencies` | No       | Array of mod IDs this mod depends on                 |
| `entryPoint`   | For script| Relative path to JS entry file                       |
| `minGameVersion`| No      | Minimum game version this mod supports               |

## Data Mods

Data mods provide `.json` files that override or extend game data. They cannot contain executable code.

### Supported Data Overrides

- Building definitions
- Balance values (costs, upkeep, tax rates)
- Milestone definitions
- Scenario definitions
- Zone definitions
- Service definitions

### Data Merging

Data merging uses a deep merge strategy:

- Scalars: mod value replaces base value.
- Arrays: mod array replaces base array (use `"_append": true` to append).
- Objects: mod keys merge into base object; base keys not present in mod are kept.

```txt
base:   { "cost": 100, "upkeep": 5, "jobs": 10 }
mod:    { "cost": 150, "jobs": 12 }
result: { "cost": 150, "upkeep": 5, "jobs": 12 }
```

## Script Mods

Script mods provide JavaScript files with access to a limited API.

### API Surface

```txt
modAPI:
  read:
    getState()          // returns a read-only snapshot of game state
    getBuildings()      // returns array of building instances
    getTile(x, y)       // returns tile data at coordinates
    getMoney()          // returns current money
    getPopulation()     // returns current population

  hooks:
    onTick(tickData)    // called every simulation tick
    onCommand(cmd)      // called when a player issues a command
    onMilestone(m)      // called when a milestone is reached

  utilities:
    log(message)        // writes to mod log (visible in dev panel)
    getModData(id)      // access another mod's stored data
    setModData(id, obj) // store persistent data for this mod
```

### Sandbox Restrictions

Script mods run in a sandbox with no access to:

- DOM APIs (`document`, `window`, `Node`);
- `fs`, `require`, `import`;
- network APIs (`fetch`, `WebSocket`);
- `eval`, `Function` constructor;
- game internal objects (simulation engine, renderer, store internals).

### Error Handling

If a script mod throws an error:

1. The error is caught by the mod runner.
2. The mod is disabled for the remainder of the session.
3. A warning is shown in the mod list: `"Mod X encountered an error and was disabled."`.
4. Other mods continue to run normally.
5. The error is logged to the developer console.

A single failing mod never crashes the game.

## Mod UI

### Mod List

The settings panel includes a mod list with:

| Column       | Description                    |
| ------------ | ------------------------------ |
| Name         | Display name                   |
| Author       | Creator                        |
| Version      | Version string                 |
| Status       | Enabled / Disabled / Error     |
| Toggle       | Enable/disable switch          |

Players can enable or disable mods from this list. Changes take effect on next game start. The mod list is stored in localStorage.

### Error Display

Mods with errors show:

- status: "Error";
- error message on hover or expand;
- option to disable or reload.

## Schema Validation

Mod manifests and data overrides are validated against JSON schemas.

- Invalid manifests: rejected with a console error message listing the missing or invalid fields.
- Invalid data overrides: the specific override is skipped; the rest of the mod loads normally.
- Unknown fields: ignored (forward compatibility).

## Tests

- Mod with valid manifest loads successfully.
- Mod with missing `id` in manifest is rejected.
- Mod with invalid `type` value is rejected.
- Data mod with building override correctly replaces cost value.
- Data mod with `"_append": true` appends to array instead of replacing.
- Deep merge preserves base keys not present in mod.
- Script mod `onTick` hook is called every simulation tick.
- Script mod `onCommand` hook receives command data.
- Script mod `onMilestone` hook fires when a milestone is reached.
- Script mod cannot access `document` or `window`.
- Script mod error disables only that mod, not other mods.
- Script mod error does not crash the game.
- Mod with unmet dependency is rejected.
- Dependency sorting loads parent before child.
- Enabling/disabling a mod in the list persists to localStorage.
- Disabled mod is not loaded on game start.
- Invalid data override is skipped but mod continues loading.
- `getState()` returns a read-only snapshot (mutations do not affect game state).
