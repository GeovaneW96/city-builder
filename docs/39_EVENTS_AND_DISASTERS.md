# Events and Disasters

## Purpose

This document defines the event and disaster system for Phase 3.

Events add dynamic gameplay by introducing temporary bonuses, penalties, and crises. Fire is the only disaster in Phase 3 scope.

## Architecture

Events are data-driven and emitted by the simulation tick pipeline. The event system runs after all other simulation systems (see doc 04 tick pipeline).

### Event Lifecycle

An active epidemic applies a -20 modifier through the standard happiness calculation until healthcare coverage resolves it.
Landmark placement starts or refreshes a three-tick festival, adding +10 happiness without stacking.
A fire event triggers when fire coverage drops below 30% with industrial buildings present, applying -15 happiness and doubling fire spread rate until coverage >= 40%.
A flood event triggers when water demand exceeds capacity and water tiles exist, applying -10 happiness until capacity catches up.

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

| Property   | Value                                                                      |
| ---------- | -------------------------------------------------------------------------- |
| Trigger    | Fire coverage < 30% and at least one industrial building present           |
| Target     | City-wide event                                                            |
| Effect     | -15 happiness, doubles fire spread rate (getEventFireSpreadMultiplier = 2) |
| Resolution | Fire coverage >= 40%                                                       |
| Duration   | 6 ticks, or until fire coverage reaches 40%                                |

The fire event amplifies existing fire-spread mechanics: while active, the fire spread multiplier doubles, causing fires to spread faster to adjacent unprotected buildings.

### Flood

| Property   | Value                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| Trigger    | Water demand > water capacity, population > 100, and water tiles exist |
| Target     | City-wide event                                                        |
| Effect     | -10 happiness                                                          |
| Resolution | Water capacity >= water demand                                         |
| Duration   | 6 ticks, or until water capacity meets demand                          |

The flood event represents water infrastructure strain when demand exceeds capacity in a city with water features (rivers, coastline). It resolves when sufficient water capacity is restored through additional water towers or reduced demand.

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
