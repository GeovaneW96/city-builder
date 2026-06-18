# Data Files Specification

## Purpose

This document defines every data file that must exist before simulation code is written. Data files live under `src/data/` and are imported by simulation systems. They must not contain game logic — only static definitions and configuration.

Values marked **[provisional]** should be adjusted after playtesting.

## File Structure

```
src/data/
  buildings/
    index.ts              # re-exports all building lists
    residential.ts
    commercial.ts
    industrial.ts
    services.ts
    utilities.ts
    civic.ts

  balance/
    index.ts              # re-exports all balance configs
    construction.ts       # construction costs
    upkeep.ts             # monthly upkeep
    taxes.ts              # default rates and happiness effects
    income.ts             # income formulas
    happiness.ts          # happiness component weights

  unlocks/
    index.ts              # re-exports milestone list
    milestones.ts         # milestone definitions

  scenarios/
    index.ts              # re-exports scenario list
    first_settlement.ts   # first scenario config
```

## Shape Conventions

Every data file exports a named constant that conforms to the type defined in `docs/26_SHARED_TYPES_SPEC.md`. For example:

```ts
export const BUILDINGS: BuildingDefinition[] = [ ... ];
```

Files that contain only primitive values (costs, rates) may export plain objects.

---

## Balance: Starting Values (`src/data/balance/`)

### Starting Values

| Key | Value | Notes |
|-----|------:|-------|
| `startingMoney` | 50,000 | |
| `bankruptcyGraceMonths` | 5 | Consecutive months below zero |
| `defaultResidentialTax` | 10 | percentage |
| `defaultCommercialTax` | 10 | percentage |
| `defaultIndustrialTax` | 10 | percentage |
| `baseHappiness` | 70 | out of 100 |

### Construction Costs

| Item | Cost |
|------|-----:|
| `road_dirt` | 50 per tile |
| `road_paved` | 100 per tile |
| `zone_residential` | 0 per tile |
| `zone_commercial` | 0 per tile |
| `zone_industrial` | 0 per tile |
| `power_plant` | 10,000 |
| `water_tower` | 5,000 |
| `park` | 2,500 |
| `clinic` | 8,000 |
| `school` | 12,000 |
| `city_hall` | 0 (given at start) |

### Monthly Upkeep

| Item | Cost |
|------|-----:|
| `road_dirt` | 1 per tile |
| `road_paved` | 2 per tile |
| `power_plant` | 500 |
| `water_tower` | 250 |
| `park` | 100 |
| `clinic` | 400 |
| `school` | 600 |
| `city_hall` | 0 |

### Tax Income Formulas

**[provisional]** These are the canonical formulas:

```txt
residentialIncome = population * 2 * (residentialTaxRate / 10)
commercialIncome  = commercialJobsFilled * 5 * (commercialTaxRate / 10)
industrialIncome  = industrialJobsFilled * 6 * (industrialTaxRate / 10)
```

A 10% tax rate gives a multiplier of 1.0.

### Tax → Happiness Effects

| Rate Range | Happiness Effect |
|-----------:|:-----------------|
| 0–8% | +4 |
| 9–10% | 0 |
| 11–12% | -4 |
| 13–15% | -10 |
| 16%+ | -20 |

### Happiness Component Weights

**[provisional]**

| Component | Default Weight | Notes |
|-----------|:--------------:|-------|
| base | +70 | Starting value |
| tax | 0 | See tax table above |
| unemployment | -0.5 per % unemployed | |
| services | +0.5 per % building in service range | Cap +15 |
| pollution | -1 per 10 pollution average | |
| parks | +3 per park in range | Cap +12 |
| utility | -5 if power shortage, -5 if water shortage | |

---

## Building Definitions (`src/data/buildings/`)

### Residential

| id | name | size | pop cap | jobs | cost | upkeep | unlock pop | requirements |
|----|------|:----:|:-------:|:----:|:----:|:------:|:----------:|--------------|
| `small_house` | Small House | 1×1 | 8 | 0 | 0 | 0 | — | road access, residential demand |

### Commercial

| id | name | size | pop cap | jobs | cost | upkeep | unlock pop | requirements |
|----|------|:----:|:-------:|:----:|:----:|:------:|:----------:|--------------|
| `small_shop` | Small Shop | 1×1 | 0 | 6 | 0 | 0 | 50 | road access, commercial demand |

### Industrial

| id | name | size | pop cap | jobs | cost | upkeep | unlock pop | requirements |
|----|------|:----:|:-------:|:----:|:----:|:------:|:----------:|--------------|
| `small_factory` | Small Factory | 2×2 | 0 | 12 | 0 | 0 | 100 | road access, industrial demand |

### Utilities (manual placement)

| id | name | size | cost | upkeep | unlock pop | effects |
|----|------|:----:|:----:|:------:|:----------:|---------|
| `power_plant` | Power Plant | 2×2 | 10,000 | 500 | — | power capacity +100, jobs 10 |
| `water_tower` | Water Tower | 1×1 | 5,000 | 250 | — | water capacity +50, jobs 2 |

### Services (manual placement)

| id | name | size | cost | upkeep | unlock pop | effects |
|----|------|:----:|:----:|:------:|:----------:|---------|
| `clinic` | Clinic | 2×2 | 8,000 | 400 | 500 | health radius 8, jobs 8, happiness +3 |
| `school` | School | 2×2 | 12,000 | 600 | 750 | education radius 8, jobs 12, happiness +3 |

### Civic (manual placement)

| id | name | size | cost | upkeep | unlock pop | effects |
|----|------|:----:|:----:|:------:|:----------:|---------|
| `city_hall` | City Hall | 2×2 | 0 | 0 | — | visual anchor, jobs 4 |

### Parks (manual placement)

| id | name | size | cost | upkeep | unlock pop | effects |
|----|------|:----:|:----:|:------:|:----------:|---------|
| `park` | Park | 1×1 | 2,500 | 100 | 250 | happiness radius 6, strength +5 |

---

## Milestones / Unlocks (`src/data/unlocks/milestones.ts`)

This is the **canonical** milestone table, reconciling `docs/07_PROGRESSION_AND_UNLOCKS.md` and `docs/02_MVP_PRD.md`. The milestone reward bonuses from `07` are included; `02` does not mention specific amounts so `07` values are used.

| # | id | name | pop | Unlocks | Reward Money |
|:-:|:---|:-----|:---:|:--------|:------------:|
| 0 | `settlement` | Settlement Site | 0 | dirt road, residential zone, city hall | — |
| 1 | `hamlet` | Hamlet | 50 | commercial zone | 2,000 |
| 2 | `village` | Village | 100 | industrial zone | 3,000 |
| 3 | `small_town` | Small Town | 250 | park | 5,000 |
| 4 | `growing_town` | Growing Town | 500 | clinic | 7,500 |
| 5 | `local_center` | Local Center | 750 | school | 10,000 |
| 6 | `first_city` | First City | 1,000 | scenario victory | — |

Rules:

- Milestone 0 requires no action; it is the starting state.
- Milestones are checked once per month after the economy tick.
- Reward money is added to `economy.money` immediately when a milestone is reached.
- Each milestone should be reached only once; guard with `completedObjectives`.
- Unlocking means: the building/feature becomes available in the build toolbar. The data layer defines an `unlockPopulation` field on each building definition.

---

## First Scenario (`src/data/scenarios/first_settlement.ts`)

Reconciled from `docs/25_SCENARIOS.md` and `docs/02_MVP_PRD.md`.

```ts
{
  id: "first_settlement",
  name: "First Settlement",
  description: "Reach 1,000 population without going bankrupt.",

  startingConditions: {
    mapWidth: 64,
    mapHeight: 64,
    startingMoney: 50000,
    initiallyUnlocked: [
      "dirt_road",
      "residential_zone",
      "city_hall"
    ]
  },

  objectives: [
    { id: "place_first_road",      title: "Place a Road" },
    { id: "zone_residential",      title: "Zone Residential" },
    { id: "reach_50",              title: "Reach 50 Population" },
    { id: "zone_commercial",       title: "Zone Commercial" },
    { id: "reach_100",             title: "Reach 100 Population" },
    { id: "zone_industrial",       title: "Zone Industrial" },
    { id: "reach_250",             title: "Reach 250 Population" },
    { id: "build_park",            title: "Build a Park" },
    { id: "reach_500",             title: "Reach 500 Population" },
    { id: "build_clinic",          title: "Build a Clinic" },
    { id: "reach_750",             title: "Reach 750 Population" },
    { id: "build_school",          title: "Build a School" },
    { id: "reach_1000",            title: "Reach 1,000 Population" },
  ],

  winCondition: {
    population: 1000,
    minMoney: 0,
    minHappiness: 50
  },

  lossCondition: {
    type: "bankruptcy",
    graceMonths: 5
  }
}
```

---

## Demand Formula Constants (`src/data/balance/`)

**[provisional]** These constants parameterize the demand formulas in the simulation.

### Residential Demand

```ts
residentialDemand = clamp(
    BASE         // 50
    + availableJobs * JOB_WEIGHT        // 0.5
    + happinessModifier                  // happiness impact (0..30)
    - availableHousing * HOUSING_WEIGHT  // 0.3
    - unemployment * UNEMPLOY_PENALTY,  // 0.4
  0, 100
);
```

### Commercial Demand

```ts
commercialDemand = clamp(
    BASE         // 30
    + population / POP_SCALE            // 20
    - commercialCapacity * CAP_WEIGHT   // 0.3
    - workerShortagePenalty,            // computed: unfilled jobs * 0.5
  0, 100
);
```

### Industrial Demand

```ts
industrialDemand = clamp(
    BASE           // 30
    + unemployedWorkers * UNEMPLOY_WEIGHT // 0.4
    - industrialCapacity * CAP_WEIGHT     // 0.2
    - pollutionPenalty,                   // computed: city avg pollution * 0.3
  0, 100
);
```

These constants should live in a single file: `src/data/balance/demand.ts`.

---

## Capacity-Based Services Model

Power and water use a capacity-based model for MVP:

```ts
power.totalDemand = sum of all building "occupants" (population + jobs)
water.totalDemand = same as power, or half
```

If total demand > total capacity, buildings receive a "no power" / "no water" warning proportional to a random or round-robin allocation.

Implementation note: capacity-based means **no network graph**. Every building is considered connected if service capacity exists. Radius-based services (clinic, school, park) require distance checks from the building.

---

## Migration Path Notes

These data files are the MVP set. Future expansion adds:

- More building tiers (medium house, large shop, etc.)
- More service buildings (police, fire)
- District/neighborhood data
- Scenario variants
- Achievement definitions
