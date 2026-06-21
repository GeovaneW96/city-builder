# Events and Disasters

## Purpose

This document defines the event and disaster system for Phase 3.

Events add dynamic gameplay by introducing temporary bonuses, penalties, and crises. Fire is the only disaster in Phase 3 scope.

## Architecture

Events are data-driven and emitted by the simulation tick pipeline. The event system runs after all other simulation systems (see doc 04 tick pipeline).

### Event Lifecycle

An active epidemic applies a -20 modifier through the standard happiness calculation until healthcare coverage resolves it.
Landmark placement starts or refreshes a three-tick festival, adding +10 happiness without stacking.
The fire-risk simulation spreads an unresolved fire to one adjacent uncovered building.

```
Tick N:  event triggered → state created → effects applied
Tick N+1..N+duration: effects persist
Tick N+duration+1: event expires → effects removed → cleanup
```

### Event State

```ts
interface EventState {
  id: string; // unique runtime id
  type: EventType;
  startTick: number;
  durationTicks: number;
  affectedTiles?: GridPosition[]; // for area events like fire
  affectedBuildingIds?: string[]; // for building-targeted events
  effects: EventEffects;
}

interface EventEffects {
  taxIncomeMultiplier?: number; // e.g., 1.5 for boom
  happinessModifier?: number; // e.g., -20 for epidemic
  buildingDamage?: boolean; // fire destroys buildings
}

type EventType = "fire" | "economic_boom" | "economic_downturn" | "epidemic" | "festival";
```

## Event Types

### Fire

| Property        | Value                                                 |
| --------------- | ----------------------------------------------------- |
| Trigger         | Random chance each tick when fire coverage < 30%      |
| Target          | Random occupied building tile                         |
| Spread          | Spreads to adjacent buildings each tick if unresolved |
| Resolution      | Resolved when fire station covers the tile            |
| Effect          | Destroys buildings (sets to empty tile)               |
| Duration        | Until resolved by fire coverage or building destroyed |
| Frequency check | Every tick: `chance = (30 - fireCoverage%) × 0.01`    |

If fire coverage is at 10%, each tick has a `(30 - 10) × 0.01 = 0.2` (20%) chance of starting a new fire.

Fire spreads to one adjacent building per unresolved tick. A destroyed building is removed from state and the tile becomes empty.

### Economic Boom

| Property      | Value                                            |
| ------------- | ------------------------------------------------ |
| Trigger       | Random when happiness > 70% and population > 500 |
| Duration      | 6 months (6 ticks)                               |
| Effect        | +50% tax income                                  |
| Frequency cap | Max once per 24 months                           |

### Economic Downturn

| Property      | Value                       |
| ------------- | --------------------------- |
| Trigger       | Random when happiness < 40% |
| Duration      | 6 months (6 ticks)          |
| Effect        | −30% tax income             |
| Frequency cap | Max once per 24 months      |

### Epidemic

| Property | Value                                    |
| -------- | ---------------------------------------- |
| Trigger  | When health coverage < 30%               |
| Duration | Until health coverage restored to >= 30% |
| Effect   | −20 happiness                            |
| Target   | City-wide                                |

The epidemic ends immediately when health coverage >= 30%.

### Festival

| Property | Value                                              |
| -------- | -------------------------------------------------- |
| Trigger  | On landmark placement                              |
| Duration | 3 months (3 ticks)                                 |
| Effect   | +10 happiness                                      |
| Stacking | Multiple festivals do not stack (refresh duration) |

## Data Definitions

Event data lives in `src/data/events/`.

```ts
interface EventDefinition {
  type: EventType;
  name: string;
  description: string;
  durationTicks: number; // 0 = indefinite until condition resolves
  effects: EventEffects;
  trigger: EventTrigger;
  frequencyCap?: number; // minimum ticks between repeats
}

interface EventTrigger {
  condition:
    | "happiness_gt"
    | "happiness_lt"
    | "coverage_lt"
    | "building_placed"
    | "random_chance";
  value?: number; // threshold or probability
  target?: string; // service type for coverage checks
}
```

## Sandbox Mode

Events can be disabled in sandbox mode via a flag:

```ts
interface SimulationConfig {
  eventsEnabled: boolean; // default true
}
```

When disabled, no events are triggered. Existing active events are cleared.

## UI Notifications

When an event triggers:

1. Popup appears with event name and description.
2. Sound plays (see sound system doc).
3. If fire: camera optionally pans to fire location.
4. Active events are listed in a notification panel.

Notification panel displays active events with remaining duration or status.

## Tick Integration

Event processing runs in the tick pipeline after economy (see doc 04):

```
1. Economy
...
9. Events — trigger checks, apply effects, expire finished events
```

Event effects modify values that other systems read. For example, `taxIncomeMultiplier` is applied when economy computes income. `happinessModifier` is applied when happiness is recomputed.

## Tests

- fire triggers when fire coverage < 30% (seeded RNG ensures predictability)
- fire does not trigger when coverage >= 30%
- fire spreads to adjacent building each tick
- fire destroys building after spread count
- fire resolved when coverage restored
- economic boom triggers when happiness > 70% and pop > 500
- economic boom applies +50% tax income multiplier
- economic boom expires after 6 ticks
- economic boom does not trigger within 24-tick cooldown
- economic downturn triggers when happiness < 40%
- economic downturn applies −30% tax income multiplier
- epidemic triggers when health coverage < 30%
- epidemic adds −20 happiness
- epidemic resolves when health coverage restored
- festival triggers on landmark placement
- festival adds +10 happiness for 3 ticks
- multiple landmarks do not stack festival happiness
- events disabled in sandbox mode: no triggers fire
- active events are cleared when sandbox flag toggled off
- event popup enqueued on trigger
- event sound requested on trigger
