# Economy and Balancing

## Purpose

This document defines the initial economy model and balancing assumptions.

All values are provisional. Balance should be adjusted after playtesting.

## Starting Values

| Value                    |  Initial |
| ------------------------ | -------: |
| Starting money           |   50,000 |
| Bankruptcy grace period  | 5 months |
| Starting residential tax |      10% |
| Starting commercial tax  |      10% |
| Starting industrial tax  |      10% |
| Base happiness           |       70 |

## Construction Costs

| Item                  |                       Cost |
| --------------------- | -------------------------: |
| Dirt road tile        |                         50 |
| Paved road tile       | 100 (— not used initially) |
| Residential zone tile |                          0 |
| Commercial zone tile  |                          0 |
| Industrial zone tile  |                          0 |
| Power plant           |                     10,000 |
| Water tower           |                      5,000 |
| Park                  |                      2,500 |
| Clinic                |                      8,000 |
| School                |                     12,000 |
| City hall             |                          0 |

## Monthly Upkeep

| Item            | Monthly Upkeep |
| --------------- | -------------: |
| Dirt road tile  |              1 |
| Paved road tile |              2 |
| Power plant     |            500 |
| Water tower     |            250 |
| Park            |            100 |
| Clinic          |            400 |
| School          |            600 |

## Tax Income

Initial simple formulas:

```txt
Residential tax income = population * 2 * residentialTaxMultiplier
Commercial tax income = commercialJobsFilled * 5 * commercialTaxMultiplier
Industrial tax income = industrialJobsFilled * 6 * industrialTaxMultiplier
```

Where:

```txt
taxMultiplier = taxRate / 10
```

A 10% tax rate means multiplier 1.0.

## Tax Happiness Modifier

Suggested initial model:

| Tax Rate | Happiness Effect |
| -------: | ---------------: |
|     0-8% |               +4 |
|    9-10% |                0 |
|   11-12% |               -4 |
|   13-15% |              -10 |
|     16%+ |              -20 |

## Population and Jobs

Building definitions (population capacity, jobs, costs, upkeep) are defined in `docs/07_BUILDINGS_AND_ZONES.md` and data files under `src/data/`. Density-tier upgrade thresholds and cooldowns are data-driven in `src/data/balance/upgrades.ts`.

## Demand Rules

Demand should be clamped between 0 and 100.

### Residential Demand

Draft formula:

```txt
residentialDemand =
  50
  + availableJobs * 0.5
  + happinessModifier
  - availableHousing * 0.3
  - unemployment * 0.4
```

### Commercial Demand

Draft formula:

```txt
commercialDemand =
  30
  + population / 20
  - commercialCapacity * 0.3
  - workerShortagePenalty
```

### Industrial Demand

Draft formula:

```txt
industrialDemand =
  30
  + unemployedWorkers * 0.4
  - industrialCapacity * 0.2
  - pollutionPenalty
```

These formulas are parameterized in `src/data/balance/demand.ts` with named constants (BASE, JOB_WEIGHT, CAP_WEIGHT, etc.). Values are placeholders and should be refined through testing.

## Happiness Components

Initial city-level happiness:

```txt
happiness =
  base
  + serviceCoverageBonus
  + parkBonus
  - taxPenalty
  - unemploymentPenalty
  - pollutionPenalty
  - utilityPenalty
```

Clamp between 0 and 100.

## Utility and Service Demand

Initial utility demand is intentionally simple and data-driven in `src/data/balance/services.ts`.

Per active building:

| Category    | Power Demand | Water Demand |
| ----------- | -----------: | -----------: |
| Residential |            1 |            1 |
| Commercial  |            2 |            2 |
| Industrial  |            3 |            3 |
| Service     |            2 |            2 |
| Utility     |            2 |            1 |

City hall and parks do not require utilities in the prototype.

Health and education coverage each provide up to +4 happiness at full residential coverage. Parks provide their building happiness effect up to a +15 citywide cap. A power or water shortage applies a -8 utility happiness penalty.

Unemployment is intentionally soft in the first scenario so the player can reach the 50-population commercial zoning milestone before jobs exist. Full unemployment applies up to -8 happiness.

## Pollution Balance

Initial pollution values are data-driven in `src/data/balance/pollution.ts`.

- Industrial pollution radius: 5 tiles.
- Pollution decays by Manhattan distance from the source.
- High pollution warning threshold: 45.
- Residential pollution happiness penalty uses average residential tile pollution divided by 8.
- Land value applies its own industrial pollution penalty and falloff; see `docs/23_LAND_VALUE_SYSTEM.md`.

## Land Value Balance

Land value modifier constants are defined in `src/data/balance/landValue.ts`; their
authoritative formulas, radii, and integration rules are documented in
`docs/23_LAND_VALUE_SYSTEM.md`.

## Neighborhood Happiness Balance

`src/data/balance/happiness.ts` defines the neighborhood-specific weights. Local unemployment
uses the established citywide cap and rate so a single neighborhood preserves the Phase 1
growth curve. Health and education each contribute up to 10 points before their combined
average, pollution is divided by 8, and local park bonuses are capped at 15. These values are
intentionally data-driven so scenario and balance tuning does not alter the simulation algorithm.

## Traffic Productivity Balance

Traffic capacity, trip factors, thresholds, and productivity multipliers are defined in
`src/data/balance/traffic.ts`. Congestion above 50% reduces commercial and industrial taxable
income; the effects are capped by their configured minimum multipliers. The same derived state
supplies the traffic happiness penalty and warnings.

## Commercial Goods Balance

`src/data/balance/goods.ts` defines commercial goods demand per job, industrial output per job,
the shortage-to-happiness weight, and the capped commercial income reduction. Industrial output
is first scaled by traffic productivity, so congestion can cause a downstream commercial
shortage without adding a separate rendering or agent dependency.

## Bankruptcy

If money is below 0:

- show warning immediately;
- increment monthsBelowZero each economy tick;
- if monthsBelowZero >= 5, scenario fails.

If money returns to >= 0:

- reset monthsBelowZero.

## Balance Goals

Early game should be forgiving.

Target pacing:

- first 100 population within 5 minutes;
- first financial pressure within 10-15 minutes;
- scenario completion within 20-30 minutes;
- bankruptcy possible but avoidable.

## Balance Testing Questions

During playtesting, ask:

- Did the player understand why they gained/lost money?
- Did they run out of money too early?
- Did services feel useful?
- Were taxes meaningful?
- Was residential demand too easy to satisfy?
- Did the city grow too fast or too slowly?
- Were there interesting choices?
