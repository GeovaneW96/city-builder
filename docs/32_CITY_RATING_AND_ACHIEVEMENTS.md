# City Rating and Achievements

## Purpose

This document defines two complementary meta-game systems: the city rating (a letter grade summarizing overall performance) and achievements (optional long-term goals). Both appear in Phase 2 of the implementation plan.

## City Rating

### Overview

The city rating is a single letter grade (A through F) computed from weighted category scores. It gives the player an at-a-glance summary of city health and provides gameplay modifiers to immigration.

### Categories

| Category      | Weight | Description                                      |
| ------------- | ------ | ------------------------------------------------ |
| Economy       | 30%    | Tax income, expenses, budget balance, debt       |
| Happiness     | 25%    | Average citizen happiness                        |
| Services      | 20%    | Coverage and capacity of health, education, etc. |
| Environment   | 15%    | Pollution levels, park coverage                  |
| Growth        | 10%    | Population growth rate, building density          |

Each category is scored 0–100 independently, then combined via weighted average.

### Category Scoring

#### Economy (0–100)

| Condition                                         | Score |
| ------------------------------------------------- | ----: |
| Positive income, no debt, healthy reserves        | 81–100 |
| Positive income, manageable debt                  | 61–80 |
| Sometimes negative, some debt                     | 41–60 |
| Frequently negative, significant debt             | 21–40 |
| In or near bankruptcy                             | 0–20 |

#### Happiness (0–100)

Directly mapped from city-level average happiness:

- happiness >= 90 → 90–100
- happiness >= 75 → 70–89
- happiness >= 50 → 40–69
- happiness >= 25 → 20–39
- happiness < 25 → 0–19

#### Services (0–100)

Percentage of residential buildings within coverage radius of at least one health, education, and utility service. Each service type contributes equally.

#### Environment (0–100)

| Condition                                                      | Score |
| -------------------------------------------------------------- | ----: |
| Pollution < 5%, parks cover > 10% of city                     | 81–100 |
| Pollution < 10%, parks cover > 5%                             | 61–80 |
| Pollution < 20%                                               | 41–60 |
| Pollution < 40%                                               | 21–40 |
| Pollution >= 40%                                              | 0–20 |

#### Growth (0–100)

| Condition                                                            | Score |
| -------------------------------------------------------------------- | ----: |
| Population growth rate > 5% per month and active construction       | 81–100 |
| Population growth rate > 2% per month                               | 61–80 |
| Stable population (−1% to +2% per month)                            | 41–60 |
| Population declining (−5% to −1% per month)                         | 21–40 |
| Population declining faster than −5% per month                      | 0–20 |

### Letter Grade Mapping

| Weighted Average | Grade | Effect on Immigration        |
| :--------------: | :---: | ---------------------------- |
| >= 90            | A     | +10% immigration rate bonus  |
| >= 75            | B     | +5% immigration rate bonus   |
| >= 60            | C     | No modifier                  |
| >= 40            | D     | −10% immigration rate penalty|
| < 40             | F     | −20% immigration rate penalty|

### Rating Formula

```txt
weightedScore =
  economyScore   * 0.30 +
  happinessScore * 0.25 +
  servicesScore  * 0.20 +
  environmentScore * 0.15 +
  growthScore    * 0.10
```

### Data Constants

```ts
interface CityRatingConfig {
  categoryWeights: Record<RatingCategory, number>; // sum to 1.0
  gradeThresholds: Record<LetterGrade, number>;     // minimum weighted score
  immigrationModifiers: Record<LetterGrade, number>; // multiplicative factor
  calculationInterval: number;                       // ticks between recalculation
}
```

### UI

- Rating displayed in HUD as a large letter grade (A–F)
- Hover or click shows breakdown tooltip:
  - Each category name with score bar and percentage
  - Current immigration modifier
  - Arrow indicating trend (improving/declining)

### Recalculation

Rating is recalculated every N ticks (configurable, default 60 = once per game month) and cached to avoid per-tick overhead.

### Implementation Location

```txt
src/simulation/rating/
  rating.ts         — computeRating(cityState, config) → RatingResult
  ratingConfig.ts   — default weights, thresholds, modifiers
  ratingTypes.ts    — RatingCategory, LetterGrade, RatingResult types
```

## Achievements

### Overview

Achievements are optional goals the player can unlock during gameplay. They provide a sense of long-term progression beyond the main scenario. Each achievement is unlocked at most once and persisted in the save data.

### Achievement Definition

```ts
interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;                    // icon identifier
  condition: (state: CityState) => boolean;
  reward?: AchievementReward;
}

interface AchievementReward {
  type: "money";
  amount: number;
}
```

Definitions live in `src/data/achievements/` and are data-driven.

### Achievement State (Runtime + Save)

```ts
interface AchievementState {
  id: string;
  unlockedAt: number | null;       // tick when unlocked, or null if not yet
}
```

### Initial Achievement List

| ID                 | Name               | Condition                                                         | Reward   |
| ------------------ | ------------------ | ----------------------------------------------------------------- | -------: |
| first_steps        | First Steps        | Reach 100 population                                              |    1,000 |
| no_debt            | No Debt            | Reach 1,000 population without ever going negative on money       |    5,000 |
| green_start        | Green Start        | Keep city-wide pollution < 10% until reaching 500 population      |    3,000 |
| happy_town         | Happy Town         | Keep happiness > 80% for 10 consecutive ticks                     |    2,000 |
| efficient_planner  | Efficient Planner  | Reach 1,000 population with fewer than 100 road tiles placed      |    5,000 |
| balanced_economy   | Balanced Economy   | Maintain positive net income for 12 consecutive months            |    4,000 |
| city_planner       | City Planner       | Unlock all milestones in a single playthrough                     |   10,000 |
| road_builder       | Road Builder       | Place a total of 500 road tiles (cumulative across sessions)      |    2,000 |

### Condition Semantics

- **first_steps**: Triggers once when `population.total >= 100`.
- **no_debt**: Checked at the moment population reaches 1,000. If `moneyEverNegative` flag was never set, award.
- **green_start**: Checked each tick. If `pollutionAverage < 0.1` and `population.total >= 500`, award. Must never have exceeded threshold.
- **happy_town**: Track a counter of consecutive ticks where `happiness.average > 80`. When counter reaches 10, award.
- **efficient_planner**: Checked when population hits 1,000. `roadTileCount < 100`.
- **balanced_economy**: Track a counter of consecutive monthly ticks where `economy.netIncome > 0`. When counter reaches 12, award.
- **city_planner**: Checked when `progression.allMilestonesUnlocked` becomes true.
- **road_builder**: Track cumulative road tiles placed. Checked when count crosses 500.

### Save Data

```ts
interface AchievementsSaveData {
  achievements: AchievementState[];
}
```

Saved as part of the player profile within the save game blob. See `15_DATA_MODEL_AND_SAVE_SYSTEM.md` for full save schema.

### UI

- Achievements panel accessible from HUD
- List of all achievements with lock/unlock state
- Locked achievements show condition hint (e.g. "Reach 100 population")
- Unlocked achievements show checkmark and timestamp
- Popup notification when an achievement unlocks

### Implementation Location

```txt
src/simulation/achievements/
  achievementSystem.ts  — checkAchievements(state, definitions) → AchievementEvent[]
  achievementRegistry.ts — load definitions, provide lookup

src/data/achievements/
  index.ts             — merged array of all achievement definitions
  firstSteps.ts        — individual definition files
  noDebt.ts
  greenStart.ts
  happyTown.ts
  efficientPlanner.ts
  balancedEconomy.ts
  cityPlanner.ts
  roadBuilder.ts
```

### Integration

The achievement system runs as part of the simulation tick. After each tick:

1. Check all locked achievement conditions against current state.
2. For each newly unlocked achievement, emit an `ACHIEVEMENT_UNLOCKED` event.
3. Apply any one-time rewards (e.g. money bonus).
4. Update achievement state in CityState.

## Tests

### City Rating Tests

- [ ] Rating categories each computed from valid state produce score in 0–100 range
- [ ] Economy score: positive income with reserves → high score
- [ ] Economy score: near bankruptcy → low score
- [ ] Happiness score: maps directly from city happiness average
- [ ] Services score: full coverage → 100, no coverage → 0
- [ ] Environment score: low pollution + parks → high, high pollution → low
- [ ] Growth score: fast growth → high, decline → low
- [ ] Weighted average formula produces correct combined score
- [ ] Grade mapping: score 90+ → A, 75+ → B, 60+ → C, 40+ → D, <40 → F
- [ ] Immigration modifier matches grade (A → +10%, F → −20%)
- [ ] Rating recalculates only every N ticks (caching works)
- [ ] Empty/new city produces F grade with all low scores
- [ ] Category weights sum to 1.0 (validation test on config)
- [ ] Grade thresholds are strictly increasing (validation test on config)
- [ ] Breakdown tooltip data matches computed scores

### Achievement Tests

- [ ] `first_steps` unlocks when population reaches 100
- [ ] `first_steps` does not unlock again after reloading save
- [ ] `no_debt` unlocks at 1,000 population if never negative
- [ ] `no_debt` does not unlock if money went negative
- [ ] `green_start` unlocks at 500 pop if pollution < 10% throughout
- [ ] `green_start` does not unlock if pollution exceeds threshold before 500 pop
- [ ] `happy_town` requires 10 consecutive ticks at >80% happiness
- [ ] `happy_town` counter resets on a tick below threshold
- [ ] `efficient_planner` unlocks at 1,000 pop with < 100 road tiles
- [ ] `efficient_planner` does not unlock with >= 100 road tiles
- [ ] `balanced_economy` requires 12 consecutive months of positive income
- [ ] `balanced_economy` counter resets on a negative-income month
- [ ] `city_planner` unlocks when all milestones are unlocked
- [ ] `road_builder` unlocks when cumulative road tile count reaches 500
- [ ] `road_builder` cumulative count persists across sessions
- [ ] Each achievement unlocks at most once (idempotent check)
- [ ] Unlock emits `ACHIEVEMENT_UNLOCKED` event
- [ ] Money reward is applied on unlock
- [ ] Achievement state is serialized and deserialized correctly in save/load
- [ ] Achievement definitions loaded from data directory are all valid
- [ ] Duplicate achievement IDs cause registration error
- [ ] Unknown achievement IDs in save data are ignored (graceful migration)
