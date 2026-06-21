# Extended Services

Unprotected fires now deterministically spread from a building that reaches the fire-risk threshold to one adjacent uncovered target before both are removed.

## Purpose

This document defines police, fire, and garbage service systems. These services extend the base services system (power, water, health, education) with crime, fire risk, and waste management mechanics.

## Police Service

### Crime Model

Each residential and commercial building has a crime level (0–100). Base crime starts at 10 for all buildings and increases by 0.5 per month when no police coverage exists.

Covered buildings (within 8 tiles of a police station) have crime suppressed to 0 and decay active crime by 5 per month.

City crime rate is the average crime across all buildings, weighted by population.

### Happiness Penalty

| Crime Rate | Happiness Effect |
| ---------: | ---------------: |
|       0–10 |                0 |
|      11–25 |               -3 |
|      26–50 |               -8 |
|        51+ |              -15 |

### Police Station

| Field            |          Value |
| ---------------- | -------------: |
| id               | police_station |
| category         |       security |
| size             |            2×2 |
| cost             |         10,000 |
| upkeep           |            400 |
| workers          |              8 |
| unlockPopulation |          2,000 |
| crimeRadius      |              8 |
| crimeSuppression |            100 |

## Fire Service

### Fire Risk Model

Industrial and dense residential buildings accumulate fire risk (0–100). Base fire risk starts at 5 for industrial, 2 for residential. Risk increases by 1 per month of no coverage.

Fire stations suppress risk within 8 tiles, reducing it by 10 per month and preventing accumulation while covered.

If fire risk reaches 100, the building burns down (removed from simulation) and generates a warning.

### Fire Station

| Field            |        Value |
| ---------------- | -----------: |
| id               | fire_station |
| category         |     security |
| size             |          3×3 |
| cost             |       12,000 |
| upkeep           |          500 |
| workers          |           10 |
| unlockPopulation |        2,000 |
| fireRadius       |            8 |
| riskSuppression  |           10 |

## Garbage System

### Garbage Production

Each building produces garbage per month:

| Building Type | Garbage per Month |
| ------------- | ----------------: |
| Residential   |      1 per 10 pop |
| Commercial    |      1 per 5 jobs |
| Industrial    |     2 per 10 jobs |

### Landfill

Landfills collect garbage from surrounding buildings within 12 tiles.

| Field            |    Value |
| ---------------- | -------: |
| id               | landfill |
| category         |  utility |
| size             |      3×3 |
| cost             |    8,000 |
| upkeep           |      300 |
| workers          |        4 |
| collectionRadius |       12 |
| capacityPerMonth |      500 |

### Uncollected Garbage

If garbage produced in a month exceeds collection capacity in the coverage area, the surplus remains as uncollected garbage. Accumulated garbage reduces nearby residential happiness by −1 per 10 units uncollected.

Uncollected garbage decays by 5 units per month passively.

### Garbage State

```txt
garbageState: {
  totalUncollected: number;
  monthlyProduction: number;
  monthlyCollected: number;
  landfillUsage: Map<buildingId, number>;
  coverageMap: Map<tileCoord, boolean>;
}
```

## Warnings

| Warning         | Condition                                |
| --------------- | ---------------------------------------- |
| High crime      | police coverage < 50% of buildings       |
| Fire risk       | fire coverage < 50% of at-risk buildings |
| Garbage buildup | uncollected garbage > 50 units           |

## Building Definitions

```txt
// Police Station
{
  id: "police_station",
  name: "Police Station",
  category: "security",
  placementType: "manual",
  size: [2, 2],
  cost: 10000,
  upkeep: 400,
  workers: 8,
  unlockPopulation: 2000,
  effects: {
    crimeSuppressionRadius: 8,
    crimeSuppression: 100
  }
}

// Fire Station
{
  id: "fire_station",
  name: "Fire Station",
  category: "security",
  placementType: "manual",
  size: [3, 3],
  cost: 12000,
  upkeep: 500,
  workers: 10,
  unlockPopulation: 2000,
  effects: {
    fireSuppressionRadius: 8,
    riskSuppressionPerTick: 10
  }
}

// Landfill
{
  id: "landfill",
  name: "Landfill",
  category: "utility",
  placementType: "manual",
  size: [3, 3],
  cost: 8000,
  upkeep: 300,
  workers: 4,
  effects: {
    garbageCollectionRadius: 12,
    garbageCapacityPerMonth: 500
  }
}
```

## Data Constants

| Constant                   | Value |
| -------------------------- | ----: |
| POLICE_RADIUS              |     8 |
| POLICE_COST                | 10000 |
| POLICE_UPKEEP              |   400 |
| POLICE_WORKERS             |     8 |
| POLICE_UNLOCK_POP          |  2000 |
| FIRE_RADIUS                |     8 |
| FIRE_COST                  | 12000 |
| FIRE_UPKEEP                |   500 |
| FIRE_WORKERS               |    10 |
| FIRE_UNLOCK_POP            |  2000 |
| LANDFILL_RADIUS            |    12 |
| LANDFILL_COST              |  8000 |
| LANDFILL_UPKEEP            |   300 |
| LANDFILL_WORKERS           |     4 |
| LANDFILL_CAPACITY          |   500 |
| BASE_CRIME                 |    10 |
| CRIME_GROWTH_PER_MONTH     |   0.5 |
| FIRE_BASE_RISK_INDUSTRIAL  |     5 |
| FIRE_BASE_RISK_RESIDENTIAL |     2 |
| FIRE_RISK_GROWTH_PER_MONTH |     1 |
| FIRE_RISK_THRESHOLD        |   100 |
| GARBAGE_RES_PER_10_POP     |     1 |
| GARBAGE_COM_PER_5_JOBS     |     1 |
| GARBAGE_IND_PER_10_JOBS    |     2 |
| GARBAGE_HAPPINESS_PER_10   |    -1 |
| GARBAGE_DECAY_PER_MONTH    |     5 |
| GARBAGE_WARNING_THRESHOLD  |    50 |

## Tests

- Police station placement validity (size, cost, road access)
- Crime growth over time without police coverage
- Crime suppression within police radius
- Crime happiness penalty at each threshold
- Police station requires unlock population 2000
- Fire station placement validity
- Fire risk accumulation on industrial buildings without coverage
- Fire risk suppression within fire station radius
- Building burns down when fire risk reaches 100
- Fire station requires unlock population 2000
- Garbage production per building type at various sizes
- Landfill collection radius — buildings inside vs outside
- Garbage exceeds capacity produces uncollected surplus
- Uncollected garbage happiness penalty calculation
- Passive garbage decay each month
- Garbage buildup warning threshold
- High crime warning at < 50% coverage
- Fire risk warning at < 50% coverage
- Multiple police stations stack coverage correctly
- Multiple landfills share collection load
- Building removal on fire destroys warning state
- Save/load round-trip for garbage state

## Current Implementation

The simulation supplies police and fire coverage from active stations, updates per-building
crime and fire-risk values, and emits normal building-removal events when an uncovered building
burns. Landfills collect covered producer output against their data-defined capacity; leftover
waste decays each tick and contributes to happiness and warnings. The `extendedServices` save
state exposes coverage, crime, and garbage totals without depending on rendering.
