# Data Model and Save System

Standalone save helpers also support city snapshots, local leaderboard records, and supporter-entitlement persistence.
The `premium` city-state field is cloned and serialized with every standard save.

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
- building upgrade tier and last-upgrade tick;
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

Legacy building instances without density fields are normalized to tier 1 with their creation
tick as the initial upgrade tick when loaded.

`CityState` also saves `neighborhoods` and `neighborhoodMode`. Neighborhood data is derived and
rebuilt on ticks, while the mode preserves the future manual-district override choice. Older
saves missing either field default to an empty neighborhood list and `"auto"` mode.

Traffic save data includes city congestion, assigned-trip totals, productivity multipliers, and
per-road-segment congestion. Older saves initialize an empty traffic state with neutral
multipliers, then rebuild it on the next simulation tick.

Goods save data records citywide supply, demand, balance, shortage percentage, and its derived
happiness and commercial-income effects. Missing legacy data defaults to a neutral zero-demand
state and is rebuilt on the next tick.

Economy save data includes active loans and the last-loan tick. Each loan stores its principal,
fixed monthly payment, remaining term, and missed-payment count so repayment and default state
round-trip exactly.

Extended-service save data stores citywide coverage, crime, garbage, and derived happiness
effects. Building instances retain crime and fire-risk values so their per-tick progression also
survives a save/load round trip.

Public-transport save data includes stop positions, routes, covered-building identifiers,
ridership, and active-route derived values. It is cloned as plain JSON-safe arrays and rebuilt
on each tick.

City rating and achievement state are part of `CityState`. Rating stores its score, grade,
immigration modifier, and component breakdown; achievements store each unlocked ID and tick so
one-time rewards cannot repeat after loading a save.

Districts are also part of `CityState`: each district has a stable ID, name, color, tile list,
and active policies, while each tile stores only its owning district ID. Achievement progress
stores historical budget and pollution flags plus streak and cumulative-road counters. Legacy
saves default missing district data to no districts and initialize achievement progress safely.

Save slots add storage-only metadata for the slot ID, display name, scenario ID, simulation
play time, and save timestamp. The metadata is derived when a slot is written, rather than being
used as an input to simulation state.

Cloud saves are not in scope for the initial version.
