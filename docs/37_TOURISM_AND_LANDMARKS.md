# Tourism and Landmarks

## Purpose

This document defines the tourism and landmark system for Phase 3.

Tourism provides a new income stream tied to city attractiveness. Landmarks are high-impact signature buildings that boost attractiveness and serve as visual milestones.

## Attractiveness Score

Attractiveness is a city-wide score from 0–100.

### Attractiveness Factors

| Factor             |                              Contribution | Notes                                                    |
| ------------------ | ----------------------------------------: | -------------------------------------------------------- |
| Parks              |         `sum(park happiness effects) × 2` | Each park has a happiness effect value; total is doubled |
| Landmarks          |                        `+15 per landmark` | Each placed landmark adds a flat bonus                   |
| Service coverage   | `+5` if health + education coverage > 50% | Both services must be above 50% coverage                 |
| Low pollution      |      `+10` if average city pollution < 20 | Based on grid-wide average pollution                     |
| Beaches/waterfront |                                     `+20` | Deferred to Phase 4                                      |

Attractiveness is recomputed every simulation tick.

### Attractiveness Display

The HUD shows:

- Attractiveness score (0–100)
- Breakdown by factor (positive and negative contributors)

## Tourism Income

Tourism income is computed per tick:

```txt
tourismIncome = baseIncome + attractiveness × 50
```

| Variable                 |        Value |
| ------------------------ | -----------: |
| baseIncome               |            0 |
| attractivenessMultiplier | 50 per point |

Tourists are abstract. They are not simulated as agents. Income appears in the economy panel as a separate line item.

## Tourism Buildings

### Hotel

| Field              |                          Value |
| ------------------ | -----------------------------: |
| id                 |                        `hotel` |
| category           |                     commercial |
| placementType      |                         manual |
| size               |                            2×2 |
| cost               |                         20,000 |
| upkeep             |                            800 |
| jobs               |                             10 |
| populationCapacity |                              0 |
| requirements       | commercial demand, road access |
| effects            |              attractiveness +5 |
| unlockPopulation   |                           none |

### Landmark Statue

| Field              |                              Value |
| ------------------ | ---------------------------------: |
| id                 |                  `landmark_statue` |
| category           |                              civic |
| placementType      |                             manual |
| size               |                                2×2 |
| cost               |                             30,000 |
| upkeep             |                                500 |
| jobs               |                                  5 |
| populationCapacity |                                  0 |
| requirements       | road access, milestone: 10,000 pop |
| effects            |                 attractiveness +15 |
| unlockPopulation   |                             10,000 |

Hotels and landmarks are placed manually (not zone-grown).

## Landmarks

### Rules

- Only 1 of each landmark type per city.
- Landmarks contribute +15 attractiveness each.
- Landmarks have high visual impact (see rendering guide).
- Landmarks appear in the build menu under a "Landmarks" tab, unlocked at specific population milestones.
- Landmarks are indestructible by events (cannot burn down).

### Landmark Definitions File

Landmark data lives in `src/data/buildings/landmarks.ts`.

Example structure:

```ts
interface LandmarkDefinition {
  id: string;
  name: string;
  description: string;
  size: [number, number];
  cost: number;
  upkeep: number;
  jobs: number;
  unlockPopulation: number;
  attractivenessBonus: number;
}
```

Landmarks planned for Phase 3:

| id                    | name            |   cost | upkeep | unlockPop | attractivenessBonus |
| --------------------- | --------------- | -----: | -----: | --------: | ------------------: |
| `landmark_statue`     | Landmark Statue | 30,000 |    500 |    10,000 |                 +15 |
| `landmark_fountain`   | Grand Fountain  | 25,000 |    300 |     8,000 |                 +10 |
| `landmark_clocktower` | Clock Tower     | 40,000 |    700 |    15,000 |                 +20 |

## Economy Integration

Tourism income is added to `monthlyIncome` as a separate entry `tourismIncome`.

HUD economy panel displays:

```
Tourism Income: $X,XXX/mo  (+X from attractiveness)
Attractiveness: XX/100
  Parks: +X
  Landmarks: +X
  Services: +X
  Low Pollution: +X
```

## Data Structures

```ts
interface AttractivenessState {
  score: number;
  breakdown: {
    parks: number;
    landmarks: number;
    serviceCoverage: number;
    lowPollution: number;
    beaches: number; // Phase 4
  };
}

interface TourismState {
  income: number;
  attractiveness: AttractivenessState;
}
```

## Tests

- attractiveness is 0 on an empty city
- adding a park (happiness effect +5) yields +10 attractiveness
- adding 2 landmarks yields +30 attractiveness (15 each)
- health+education coverage at 60% adds +5; at 40% adds 0
- average pollution at 15 adds +10; at 25 adds 0
- tourism income formula: base 0 + attractiveness × 50
- hotel costs reduce money on purchase
- hotel adds +5 attractiveness
- landmark cannot be placed twice (same id)
- landmark is unlocked only after population milestone met
- landmark appears in build menu under correct tab
- tourism income appears in economy panel
- attractiveness factors stack additively, clamped to 0–100
