# Simulation Systems

## Phase 3 extensions

Simulation now includes deterministic agent traffic, tiered services, density and office demand, tourism, specialization, and time-bound city events. These systems remain data/state driven and run without rendering dependencies.

Scenario validation, events, resource depletion, and terrain editing are also simulation-side systems.

## Purpose

This document defines how the city simulation should work.

The simulation should be:

- understandable;
- deterministic where possible;
- testable without rendering;
- data-driven;
- easy to rebalance.

## Simulation Tick

The game should separate render frames from simulation ticks.

Example:

- rendering: every animation frame;
- simulation: every in-game day/month or fixed interval;
- economy: monthly;
- building growth: periodic;
- warnings: updated after relevant changes.

## Core State

Suggested high-level state fields:

- `map` — grid + tiles;
- `buildings` — runtime building instances;
- `roads` — road network state;
- `zones` — painted zone tiles;
- `economy` — money, income, expenses, tax rates;
- `population` — total, capacity, employment;
- `demand` — RCI demand values;
- `services` — capacity and coverage;
- `happiness` — city-level score with component breakdown;
- `progression` — milestones, unlocks, scenario state;
- `warnings` — active warnings;
- `time` — tick, month, year, speed.

Tile state is defined in `08_MAP_GRID_AND_TERRAIN.md`.

District ownership and active policies are simulation state. Achievement state includes both
unlocked rewards and the historical counters needed to evaluate streak and history conditions.

## Road Connectivity

Roads determine access.

Basic rules:

- road tiles connect orthogonally;
- buildings require adjacent road tile;
- disconnected buildings show warning;
- road network is treated as one connected graph.

Road network features:

- road capacity;
- congestion;
- intersections;
- pathfinding.

## Zoning System

Zones are player-painted tile designations.

Zone types:

- residential;
- commercial;
- industrial.

A zone can grow a building if:

- tile is empty;
- zone has road access;
- city has demand for that zone type;
- required services are available or not strictly required yet;
- placement size fits.

## Building Growth

Building growth can be simple:

1. Find valid zoned tiles.
2. Check demand.
3. Spawn a building.
4. Deduct or reserve nothing unless zoning has cost.
5. Update population/jobs/capacity.

Building upgrades depend on:

- land value;
- happiness;
- services;
- education;
- density unlocks.

## Population System

Population is based on occupied residential capacity.

Fields:

- total population;
- residential capacity;
- employed workers;
- unemployed workers;
- growth rate.

Population changes based on:

- available housing;
- residential demand;
- happiness;
- jobs;
- services;
- taxes.

## Jobs System

Jobs come from:

- commercial buildings;
- industrial buildings;
- service buildings.

Unemployment affects happiness.

Worker shortages affect business productivity.

## Demand, Economy, and Happiness

Detailed formulas for demand, economy, and happiness are defined in `docs/05_ECONOMY_AND_BALANCING.md`. The simulation doc covers system interactions and the tick pipeline; the economy doc covers exact formulas and balance values.

## Services System

Services can be implemented as capacity-based or radius-based.

Recommendation:

- power/water: capacity-based first;
- park/clinic/school: radius-based.

Service state:

- capacity;
- demand;
- coverage;
- upkeep;
- affected buildings.

## Pollution System

Industrial buildings produce pollution.

Pollution affects:

- nearby residential happiness;
- land value;
- health.

Use a simple radius falloff.

## Warnings System

Warnings are generated from city state.

Warning examples:

- no road access;
- no power;
- no water;
- no workers;
- low happiness;
- high pollution;
- abandoned building;
- city losing money.

Warnings should include:

- severity;
- message;
- target building/tile;
- suggested fix.

When the warning list is rebuilt, the simulation emits `WARNING_ADDED` only for warnings
that were not active on the preceding tick, and `WARNING_REMOVED` when a warning resolves.
This lets UI feedback react once without affecting deterministic warning state.

## Progression System

Progression is based on population milestones.

State:

- current milestone;
- unlocked features;
- completed objectives;
- scenario state.

## Game Loop Timing

### Separation of Concerns

The game has three independent loops:

```
requestAnimationFrame  →  render current state
setInterval / rAF tick →  advance simulation
input events           →  dispatch commands
```

Rendering runs at display refresh rate (typically 60 fps). Simulation runs on a fixed tick. Input is event-driven.

### Tick Rate and Time Model

| Property                 |              Value              | Rationale                                  |
| ------------------------ | :-----------------------------: | ------------------------------------------ |
| Simulation tick interval |        250 ms real-time         | 4 ticks per real second                    |
| In-game months per tick  | 1 month per tick **at speed 1** | One tick = one month                       |
| Ticks per month          |         1 (at speed 1)          | Simple: each tick advances one month       |
| Economy tick             |      Every simulation tick      | Monthly income/expenses computed each tick |
| Building growth check    |      Every simulation tick      | Spawn buildings if conditions are met      |
| Demand recomputation     |      Every simulation tick      | Recalculate RCI demand                     |
| Happiness recomputation  |      Every simulation tick      | Recalculate city happiness                 |
| Service coverage check   |      Every simulation tick      | Buildings re-evaluate service state        |
| Warning refresh          |      Every simulation tick      | Rebuild active warning list                |
| Milestone check          |      Every simulation tick      | Check population against thresholds        |

### Speed Controls

|     Speed     | Ticks per Second | Real Seconds per Tick | Game Months per Real Second |
| :-----------: | :--------------: | :-------------------: | :-------------------------: |
|  0 (Paused)   |        0         |           —           |              0              |
|  1 (Normal)   |        4         |         0.25          |              4              |
|   2 (Fast)    |        12        |         0.083         |             12              |
| 3 (Very Fast) |        24        |         0.042         |             24              |

At speed 1: 1 real second = 4 in-game months.
A full game "year" takes 3 real seconds at speed 1 (12 months / 4 ticks per second).

### Pause Behavior

When paused (`speed = 0`):

- No simulation ticks fire.
- Rendering continues (camera movement, hover, selection).
- Build mode works normally.
- Commands that mutate state are still processed.
- The player can place roads, zones, and buildings while paused.

### Tick Pipeline

Within a single simulation tick, the following runs **in order**:

1. **Economy** — compute income and expenses, process loan payments, update money, and check bankruptcy.
2. **Demand** — recompute RCI demand from current city conditions.
3. **Land Productivity** — compute per-building land value multipliers for commercial tax income and industrial jobs/output.
4. **Building Growth and Upgrades** — activate completed construction, upgrade eligible buildings, then spawn new buildings on valid zoned tiles.
5. **Population** — update totals from residential capacity and demand.
6. **Pollution and Land Value** — recompute pollution, then each tile's land value from local modifiers.
7. **Services** — recompute capacity usage and coverage radii.
8. **Extended Services** — update police crime, fire risk, garbage collection, and any fire-destruction events.
9. **Public Transport and Traffic** — update active bus coverage, then assign trips to roads and calculate congestion effects.
10. **Goods** — calculate industrial supply, commercial demand, shortages, and commercial productivity.
11. **Happiness** — rebuild road-bounded neighborhoods, calculate their local happiness, then calculate the population-weighted city score.
12. **Rating and Achievements** — calculate city rating, apply its next-tick immigration modifier, and unlock eligible one-time rewards.
13. **Warnings** — rebuild active warnings list from current state.
14. **Progression** — check milestones, apply unlocks and rewards.
15. **Events** — emit `GameEvent` objects for any changed state (rendering/UI consume these).

The rating system stores its component breakdown alongside the grade. Presentation derives the
strongest and weakest categories from that stored snapshot; it never feeds a UI-only value back
into simulation state.

The implementation applies district policy effects inside the economy, demand, service,
happiness, and pollution systems. After progression is updated, achievement progress counters
are advanced and newly eligible rewards are emitted as simulation events. Rendering only reads
these results.

### Building Growth Details

- Growth checks every zoned tile that is empty and road-accessible.
- Maximum buildings spawned per tick: **3 per zone type** (cap prevents instant city).
- After a building is spawned, the tile has a cooldown of **3 ticks** before it can be replaced/demolished.
- Zone-grown buildings appear with status `"constructing"` and transition to `"active"` after **1 tick**.
- A building is abandoned if its status would cause a warning for more than **12 consecutive ticks**.

### First Tick Special Case

On game start or load:

- The zero-th tick initializes all derived values.
- No economy tick runs (player cannot lose money on frame 1).
- Building growth is suppressed for the first tick.
- Demand starts at 50/30/30 per the base formulas.

## Determinism

Simulation functions should avoid randomness unless seeded.

If randomness is used:

- use a seeded RNG;
- store the seed in save data;
- make tests predictable.

## Neighborhood Happiness

Happiness is evaluated from deterministic, road-bounded buildable regions. Each region with
at least one building receives local unemployment, service-coverage, pollution, park, and
utility components. The city score is the population-weighted average of the resulting region
scores; an empty city remains at the base score. See `25_NEIGHBORHOOD_HAPPINESS.md` for the
full rules and data model.
