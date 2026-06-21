# City Specialization

## Purpose

This document defines city specialization mechanics for Phase 3.

Specialization lets the player choose a policy that applies city-wide modifiers, creating meaningful tradeoffs between income types.

## Activation

Specializations are chosen via a policy panel (see doc 31). A specialization is activated immediately when selected.

### Rules

- Only one specialization active at a time.
- Switching specializations costs 50% of the current monthly income.
- Switching has a cooldown of 12 in-game months.
- Each specialization has minimum requirements: population, buildings, or milestones.

### Initial State

No specialization is active at game start.

## Specialization Paths

### Industrial Hub

| Effect                   | Value |
| ------------------------ | ----: |
| Industrial income        |  +50% |
| Industrial jobs          |  +25% |
| Pollution output         |  +50% |
| Happiness from pollution |   −10 |

Requirements:

- Population >= 5,000
- At least 5 industrial buildings active

### Commercial Hub

| Effect             | Value |
| ------------------ | ----: |
| Commercial income  |  +50% |
| Commercial jobs    |  +25% |
| Traffic congestion |  +20% |

Requirements:

- Population >= 5,000
- At least 5 commercial buildings active
- Milestone: commercial zone unlocked

### Tourist Destination

| Effect            | Value |
| ----------------- | ----: |
| Tourism income    | +100% |
| Attractiveness    |  +25% |
| Commercial income |  −20% |

Requirements:

- Population >= 5,000
- At least 1 landmark placed
- Milestone: 10,000 pop

### Education Center

| Effect                  | Value |
| ----------------------- | ----: |
| Education effectiveness |  +50% |
| Workforce quality       |  +25% |
| Education upkeep        |  +50% |

Requirements:

- Population >= 5,000
- At least 2 schools placed

### Green City

| Effect            | Value |
| ----------------- | ----: |
| Pollution output  |  −50% |
| Happiness         |   +10 |
| Industrial income |  −30% |

Requirements:

- Population >= 5,000
- At least 3 parks placed

## Implementation

Education Center applies its 1.5× education effectiveness to derived workforce quality, capped at 100.

Specialization effects are applied as multipliers to the relevant simulation systems.

### Data Constants

Specialization data lives in `src/data/balance/specialization.ts`.

```ts
interface SpecializationDefinition {
  id: string;
  name: string;
  description: string;
  effects: SpecializationEffect[];
  requirements: SpecializationRequirement[];
  cooldownMonths: number; // default 12
  switchCostRatio: number; // default 0.5 (50% of monthly income)
}

interface SpecializationEffect {
  target: string; // e.g., "industrialIncome", "pollutionOutput", "happiness"
  type: "multiplier" | "additive";
  value: number;
}

interface SpecializationRequirement {
  type: "population" | "buildingCount" | "milestone";
  id?: string; // building id or milestone id
  value: number; // threshold count or population
}
```

### State

```ts
interface SpecializationState {
  active: string | null; // specialization id or null
  lastSwitchTick: number; // tick when last switched
  cooldownTicksRemaining: number;
}
```

### Effect Application Points

| Simulation System | Effect Targets                                              |
| ----------------- | ----------------------------------------------------------- |
| Economy           | industrialIncome, commercialIncome, tourismIncome           |
| Happiness         | happiness (additive)                                        |
| Services          | educationEffectiveness, educationUpkeep                     |
| Pollution         | pollutionOutput (multiplier on industry pollution)          |
| Jobs              | industrialJobs, commercialJobs (multiplier on jobs created) |
| Traffic           | trafficCongestion (modifier)                                |

## UI

The policy panel (see doc 31) displays:

- Currently active specialization (or "None")
- Available specializations with requirements (greyed out if unmet)
- Effects preview before confirming
- Cooldown indicator if recently switched
- Cost label for switching

## Tests

- no specialization active by default
- switching to a specialization applies all its effect multipliers
- switching away removes effect multipliers
- switching cost is deducted on switch
- switching is blocked during cooldown
- cooldown expires after 12 months of ticks
- switching is blocked if requirements not met (pop too low)
- switching is blocked if requirements not met (buildings missing)
- switching is blocked if requirements not met (milestone not reached)
- Industrial Hub: +50% industrial income verified against base
- Industrial Hub: +50% pollution output verified
- Green City: −50% pollution output verified
- Green City: +10 happiness verified
- Commercial Hub: +50% commercial income verified
- Tourist Destination: +100% tourism income verified
- multiple effects stack on the same target (additive vs multiplier)
