# Building Upgrades

## Purpose

Buildings visually and mechanically improve as the city develops. Upgrades represent density increases and wealth transitions, giving the player visible feedback that their city is progressing.

## Tier Overview

Each zone type has three tiers:

| Tier   | Label        | Visual Cue          |
| ------ | ------------ | ------------------- |
| Tier 1 | Low density  | Small, basic models |
| Tier 2 | Medium       | Mid-size, improved  |
| Tier 3 | High density | Large, premium      |

Zone-grown buildings start at Tier 1 when first spawned. Upgrades happen automatically when conditions are met, mirroring the zone-growth spawning system.

## Upgrade Conditions

A building upgrades from its current tier to the next when all of the following are met:

| Condition            | Tier 1 → 2              | Tier 2 → 3              |
| -------------------- | ----------------------- | ----------------------- |
| Min land value       | 30                      | 60                      |
| Min city happiness   | 50                      | 65                      |
| Health coverage      | Within radius of clinic | Within radius of clinic |
| Education coverage   | Not required            | Within radius of school |
| Population milestone | 200                     | 500                     |
| Cooldown (ticks)     | 12                      | 24                      |

If the building has any active warnings (no road access, abandoned status, etc.), upgrades are blocked until warnings are resolved.

## Cooldown

```txt
lastUpgradeTick + cooldownTicks <= currentTick
```

`cooldownTicks` is defined per tier transition in data. The cooldown prevents a building from upgrading multiple times in rapid succession.

## Building Definitions Per Tier

Each tier is a separate building definition in data files. Tier 1 definitions are the initial buildings from phase 1 (`docs/07_BUILDINGS_AND_ZONES.md`). Tier 2 and 3 entries add new definitions.

### Residential

| Field                | Tier 1 (small_house) | Tier 2 (medium_house) | Tier 3 (high_apartment) |
| -------------------- | :------------------: | :-------------------: | :---------------------: |
| `populationCapacity` |          8           |          20           |           50            |
| `jobs`               |          0           |           0           |            0            |
| `size`               |         1x1          |          2x1          |           2x2           |
| `upkeep`             |          0           |           5           |           15            |

### Commercial

| Field                | Tier 1 (small_shop) | Tier 2 (medium_shop) | Tier 3 (large_store) |
| -------------------- | :-----------------: | :------------------: | :------------------: |
| `populationCapacity` |          0          |          0           |          0           |
| `jobs`               |          6          |          15          |          35          |
| `size`               |         1x1         |         2x1          |         2x2          |
| `upkeep`             |          0          |          8           |          25          |

### Industrial

| Field                | Tier 1 (small_factory) | Tier 2 (medium_factory) | Tier 3 (large_plant) |
| -------------------- | :--------------------: | :---------------------: | :------------------: |
| `populationCapacity` |           0            |            0            |          0           |
| `jobs`               |           12           |           28            |          60          |
| `size`               |          2x2           |           3x2           |         3x3          |
| `upkeep`             |           0            |           12            |          40          |
| `pollution`          |         medium         |         medium          |         high         |

## State Tracking

Each building instance gains two additional fields:

```txt
BuildingInstance {
    ...
    upgradeTier: 1 | 2 | 3          // current tier level
    lastUpgradeTick: number          // tick when last upgrade occurred
}
```

On initial spawn, `upgradeTier = 1` and `lastUpgradeTick = currentTick`.

## Upgrade Behavior

When upgrade conditions are satisfied during the building growth step:

1. The current building instance is replaced with the tier+1 definition.
2. Position and rotation are preserved.
3. `upgradeTier` is incremented.
4. `lastUpgradeTick` is set to `currentTick`.
5. Status resets to `"constructing"` for 1 tick (same as initial placement).
6. Warnings are cleared and re-evaluated next tick.
7. Population capacity and jobs update immediately on the next economy tick.

If footprint size changes (e.g., 1x1 → 2x1), the upgrade is **blocked** if adjacent tiles are occupied or non-buildable. This is checked at upgrade time.

## Data Parameters

Stored in `src/data/balance/upgrades.ts`:

```txt
UPGRADE_COOLDOWN_T1_T2        = 12
UPGRADE_COOLDOWN_T2_T3        = 24
UPGRADE_LAND_VALUE_T1_T2      = 30
UPGRADE_LAND_VALUE_T2_T3      = 60
UPGRADE_HAPPINESS_T1_T2       = 50
UPGRADE_HAPPINESS_T2_T3       = 65
UPGRADE_POPULATION_T1_T2      = 200
UPGRADE_POPULATION_T2_T3      = 500
UPGRADE_REQUIRES_EDUCATION_T2 = false
UPGRADE_REQUIRES_EDUCATION_T3 = true
```

## Integration Points

| System      | Integration                                                    |
| ----------- | -------------------------------------------------------------- |
| Land Value  | Thresholds gate upgrade eligibility                            |
| Happiness   | City happiness minimum required per tier                       |
| Services    | Health and education coverage checked at building location     |
| Progression | Population milestones unlock higher tiers globally             |
| Warnings    | Active warnings block upgrades                                 |
| Economy     | Upgraded buildings have higher upkeep but more jobs/tax income |
| Rendering   | Each tier maps to a different visual asset                     |

## Tests

1. A tier-1 building upgrades to tier-2 when all conditions are met.
2. A tier-2 building upgrades to tier-3 when all conditions are met.
3. Upgrade is blocked if land value is below threshold.
4. Upgrade is blocked if city happiness is below threshold.
5. Upgrade is blocked if population milestone is not reached.
6. Upgrade is blocked if building has an active warning.
7. Upgrade is blocked during cooldown (ticks since last upgrade < cooldown).
8. Upgrade is blocked if footprint expansion would overlap an occupied tile.
9. Upgrade is blocked if footprint expansion would go out of bounds.
10. After upgrade, upgradeTier is incremented.
11. After upgrade, lastUpgradeTick is set to currentTick.
12. After upgrade, status transitions to "constructing" for 1 tick.
13. Population capacity updates correctly after residential upgrade.
14. Jobs update correctly after commercial upgrade.
15. Upkeep cost changes after upgrade.
16. Building at max tier (3) does not attempt further upgrades.
17. Multiple eligible buildings can upgrade in the same tick (capped per zone type).
18. Upgrade replaces building definition ID in instance data.
19. Upgrade preserves building position and rotation.
20. Upgrade does not occur if no higher tier definition exists for this building type.
