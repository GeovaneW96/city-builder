# Neighborhood Happiness

## Purpose

Give the player spatial feedback about which areas of the city are happy or unhappy and why. Neighborhood-level happiness replaces a single city-wide number with a per-district breakdown, enabling targeted policy and service placement decisions.

## Backward Compatibility

By default, the game starts with one city-wide neighborhood. Cities with no player-defined districts and no auto-detected clusters behave identically to the phase 1 happiness system. The neighborhood system is purely additive — it decomposes existing happiness data rather than changing the calculation.

## Neighborhood Boundaries

Neighborhoods are determined by one of two methods:

### Method 1: Automatic (Road-Cluster Based)

The simulation auto-detects neighborhoods by flood-filling buildable tiles bounded by roads. Each contiguous group of non-road tiles that is separated by roads forms a neighborhood.

- Road tiles act as boundaries.
- Unbuildable terrain (water, map edge) also acts as a boundary.
- A neighborhood must contain at least one building to be tracked.
- Neighborhoods with no buildings are excluded from calculations.

### Method 2: Player-Painted Districts (Phase 3)

Players can paint district boundaries using a brush tool. Player-defined districts override auto-detection. This is deferred to a future phase; the data model should support it.

## Data Model

Added to simulation state:

```ts
interface Neighborhood {
  id: string;
  label: string;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  tileCount: number;
  population: number;
  happiness: number; // 0–100 composite
  components: HappinessComponents;
  buildings: string[]; // building instance IDs
}

interface HappinessComponents {
  base: number;
  tax: number; // same city-wide tax applies
  unemployment: number;
  services: number;
  pollution: number;
  parks: number;
  traffic: number; // Phase 3 placeholder
}
```

The simulation state also tracks:

```ts
neighborhoods: Neighborhood[];
neighborhoodMode: "auto" | "manual";  // defaults to "auto"
```

## Happiness Computation Per Neighborhood

Each tick, every neighborhood recomputes its happiness using the same component formula as city-level happiness, but with locally-sourced values:

### Base Happiness

Same as city-wide base (70).

### Tax Modifier

Same city-wide tax rates and their happiness effect apply to all neighborhoods equally.

### Unemployment Modifier

Based on the neighborhood's own jobs-to-workers ratio. A neighborhood with high employment relative to its workers gets a smaller penalty than one with widespread joblessness. If `neighborhoodWorkers === 0`, the modifier is 0.

```txt
neighborhoodUnemploymentRate = 1 - (jobs / workers)
unemploymentPenalty = neighborhoodUnemploymentRate * UNEMPLOYMENT_WEIGHT
```

### Service Modifier

Based on local coverage. A building in the neighborhood is considered "covered" if it falls within a service radius. Neighborhood service modifier is the fraction of buildings in the neighborhood with health coverage (for health happiness) and education coverage (for education happiness), combined with equal weight.

```txt
healthCoverage = coveredBuildings / totalBuildings
educationCoverage = coveredBuildings / totalBuildings
serviceModifier = (healthCoverage * HEALTH_WEIGHT + educationCoverage * EDUCATION_WEIGHT) / 2
```

### Pollution Modifier

Based on the average pollution across tiles in the neighborhood:

```txt
avgPollution = sum(tilePollution) / tileCount
pollutionPenalty = avgPollution * POLLUTION_WEIGHT
```

### Park Modifier

Based on the count of parks within or adjacent to the neighborhood:

```txt
parkModifier = localParkCount * PARK_WEIGHT
```

Capped at `MAX_PARK_BONUS`.

### Traffic Modifier

Placeholder for Phase 3. Always 0 in Phase 2.

### Final Formula

```txt
neighborhoodHappiness =
  BASE_HAPPINESS
  + taxModifier
  - unemploymentPenalty
  + serviceModifier
  - pollutionPenalty
  + parkModifier
  - trafficPenalty
```

Clamp to [0, 100].

## City-Level Happiness

City-level happiness is the weighted average of all neighborhood values, weighted by population:

```txt
cityHappiness = sum(neighborhoodHappiness * neighborhoodPopulation) / totalPopulation
```

If total population is 0, city happiness defaults to base (70).

This ensures that a dense, happy downtown contributes more to the city score than a rural area with one unhappy house.

## Neighborhood Happiness Overlay

The overlay renders each neighborhood tile with a color from red (low happiness) to green (high happiness). Neighborhood boundaries are shown as semi-transparent borders.

On hover, a tooltip shows:

```txt
Neighborhood: Downtown
Happiness: 72%
Parks: +5
Services: +8
Pollution: -4
Unemployment: -6
```

## Tick Behavior

Recomputed every simulation tick as part of the happiness pipeline step (step 6 in tick order). The pipeline is:

1. Clear all neighborhood data.
2. Re-detect neighborhood boundaries (auto mode) or use stored districts.
3. Assign each building to its neighborhood.
4. For each neighborhood, compute local statistics (population, employment, pollution average, etc.).
5. Compute neighborhood happiness from local components.
6. Compute city happiness as weighted average.

Detection and assignment is O(buildings + tiles) per tick. If performance is a concern, detection can be cached and invalidated only when roads change.

## Data Parameters

Stored in `src/data/balance/happiness.ts`:

```txt
BASE_HAPPINESS             = 70
UNEMPLOYMENT_WEIGHT        = 25
HEALTH_WEIGHT              = 10
EDUCATION_WEIGHT           = 10
POLLUTION_WEIGHT           = 8
PARK_WEIGHT                = 5
MAX_PARK_BONUS             = 15
NEIGHBORHOOD_MIN_POPULATION = 1
```

The Phase 2 implementation reuses the existing citywide unemployment cap and rate for each
neighborhood. This keeps a city with one auto-detected neighborhood on the established growth
curve while still deriving the rate from local workers and jobs.

## Integration Points

| System    | Integration                                                       |
| --------- | ----------------------------------------------------------------- |
| Happiness | City happiness is weighted average of neighborhoods               |
| Services  | Neighborhood coverage computed per neighborhood                   |
| Pollution | Neighborhood average pollution affects local happiness            |
| Parks     | Neighborhood park count affects local happiness                   |
| UI        | Overlay rendering, tooltip per neighborhood                       |
| Warnings  | Low neighborhood happiness can trigger neighborhood-level warning |

## Current Implementation

Phase 2 implements automatic road-bounded detection and exposes the derived neighborhoods on
`CityState`. Each tick rebuilds the list and computes local components from simulation data;
the city score is population weighted. `neighborhoodMode` is persisted with an `"auto"` default
so the Phase 3 manual-district implementation can replace only the boundary source.

## Tests

1. A city with one neighborhood produces happiness equal to the legacy city-level calculation.
2. Two neighborhoods with different pollution levels produce different happiness scores.
3. City-level happiness is the population-weighted average of neighborhood values.
4. Empty city (population 0) defaults city happiness to base (70).
5. Neighborhood auto-detection separates tiles separated by a road.
6. Neighborhood auto-detection treats water/map edge as boundaries.
7. Neighborhood with no buildings is excluded from calculations.
8. Neighborhood unemployment modifier uses local jobs/workers ratio.
9. Neighborhood with no workers has zero unemployment modifier.
10. Neighborhood service modifier reflects fraction of buildings covered.
11. Neighborhood pollution modifier uses per-tile average.
12. Neighborhood park modifier caps at max bonus.
13. After road placement splits a neighborhood, happiness is recalculated for both halves.
14. Adding a park to a neighborhood increases its park modifier.
15. Player-painted district override (data model prepared; returns auto-detected in Phase 2).
16. Neighborhood overlay shows data only for neighborhoods with at least one building.
17. Neighborhood data is cleared and rebuilt each tick.
