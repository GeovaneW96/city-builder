# Land Value System

## Purpose

Land value is a per-tile score (0–100) that determines where higher-tier buildings appear and affects commercial and industrial productivity. It gives the player spatial feedback about which areas of the city are desirable for development and which are degraded by pollution or neglect.

## Initial Value

Every buildable tile starts at a base land value of 50.

## Modifiers

Land value is computed as:

```txt
landValue = baseValue + sum(positiveModifiers) - sum(negativeModifiers)
```

Clamped to [0, 100].

### Positive Modifiers

| Factor               | Value | Radius | Falloff         | Notes                                 |
| -------------------- | :---: | :----: | --------------- | ------------------------------------- |
| Park proximity       |  +5   |   4    | Linear per tile | Each park within radius contributes   |
| Health coverage      |  +3   |   6    | Linear per tile | Clinic/hospital coverage              |
| Education coverage   |  +3   |   6    | Linear per tile | School coverage                       |
| Road access          |  +10  |   —    | None (binary)   | Applied if tile is adjacent to a road |
| Waterfront (Phase 4) |  +15  |   2    | Linear per tile | Adjacent to water; placeholder value  |

### Negative Modifiers

| Factor               | Value | Radius | Falloff         | Notes                                 |
| -------------------- | :---: | :----: | --------------- | ------------------------------------- |
| Industrial pollution |  -8   |   5    | Linear per tile | Per industrial building within radius |
| Noise                |  -5   |   3    | Linear per tile | Near industry or heavy traffic        |

### Distance Falloff Formula

All radius-based modifiers use linear falloff:

```txt
effectiveValue = baseValue * max(0, (radius - distance) / radius)
```

Where `distance` is the Chebyshev distance (tile count) from the source to the target tile. At distance 0, the full value applies. At distance >= radius, no effect.

## Data Parameters

All constants live in `src/data/balance/landValue.ts` with named exports:

```txt
BASE_LAND_VALUE        = 50
PARK_BONUS             = 5
PARK_RADIUS            = 4
HEALTH_BONUS           = 3
HEALTH_RADIUS          = 6
EDUCATION_BONUS        = 3
EDUCATION_RADIUS       = 6
ROAD_ACCESS_BONUS      = 10
WATERFRONT_BONUS       = 15
WATERFRONT_RADIUS      = 2
INDUSTRIAL_PENALTY     = -8
INDUSTRIAL_RADIUS      = 5
NOISE_PENALTY          = -5
NOISE_RADIUS           = 3
LAND_VALUE_MIN         = 0
LAND_VALUE_MAX         = 100
INDUSTRIAL_PRODUCTIVITY_THRESHOLD = 20
LOW_LAND_VALUE_INDUSTRIAL_PRODUCTIVITY_MULTIPLIER = 0.5
```

## Effects

### Building Upgrade Eligibility

Land value thresholds gate building tier upgrades:

| Tier Transition | Min Land Value |
| --------------- | :------------: |
| Low → Medium    |       30       |
| Medium → High   |       60       |
| High → landmark |       90       |

See `docs/24_BUILDING_UPGRADES.md` for full upgrade rules.

### Commercial Income Multiplier

Commercial tax income is multiplied by `landValue / 100` at the building's location. A shop on land value 80 produces 80% of its base income, while one on land value 30 produces only 30%.

```txt
commercialIncome = baseIncome * (tileLandValue / 100)
```

### Industrial Productivity

Industrial buildings on low land value suffer a productivity penalty. If land value < 20, the building produces 50% of normal output (goods and jobs). This creates a pressure for industry to locate away from desirable areas.

```txt
if (tileLandValue < INDUSTRIAL_PENALTY_THRESHOLD) {
    productivityMultiplier = 0.5
}
```

## Land Value Map Overlay

The overlay renders each tile with a color gradient from red (0) through yellow (50) to green (100). Tiles with no data (unbuildable terrain) are gray.

The overlay is toggled from the UI. It shows a legend with the current range and a brief tooltip on hover:

```txt
Land Value: 72
Parks: +10
Services: +6
Road: +10
Pollution: -4
```

## Integration Points

| System            | Integration                                                   |
| ----------------- | ------------------------------------------------------------- |
| Building Upgrades | Land value thresholds gate tier eligibility                   |
| Economy           | Commercial income multiplier; industrial productivity penalty |
| Demand            | High land value areas attract residential demand              |
| Happiness         | Low land value reduces local happiness                        |
| Services          | Health/education coverage contributes positively              |
| Pollution         | Industrial pollution reduces nearby land value                |
| Progression       | Unlocks may raise or remove land value caps                   |

## Tick Behavior

Land value is recomputed every simulation tick for every tile. This is an O(tiles \* sources) operation. Optimization (dirty regions, spatial hashing) is deferred until performance measurement shows it is needed.

The Phase 2 implementation prepares active modifier sources and water tiles once per tick,
then applies Chebyshev-distance falloff to each buildable tile. Water and blocked tiles do
not receive a computed land value.

## Tests

1. Base land value starts at 50 for a fresh tile.
2. Park proximity adds correct bonus with linear falloff.
3. Park beyond radius applies no bonus.
4. Health coverage within radius adds correct bonus.
5. Education coverage stacks with health coverage.
6. Road access adds flat bonus regardless of distance.
7. Industrial pollution subtracts correct value with falloff.
8. Multiple industrial buildings stack pollution penalties (capped at floor 0).
9. Noise penalty from industry applies correctly.
10. Multiple modifiers of same type stack correctly (e.g., two parks).
11. Land value clamps at 0 (never negative).
12. Land value clamps at 100 (never above).
13. Tile with no modifiers retains base value 50.
14. Commercial income multiplier uses correct tile land value.
15. Industrial productivity penalty applies below threshold.
16. Industrial productivity is normal above threshold.
17. Waterfront bonus is zero when no water tiles are adjacent (Phase 4 placeholder).
18. Unbuildable tiles (water, out-of-bounds) return null land value.
19. Land value recomputation after placing a new park updates nearby tiles.
20. Land value recomputation after removing an industrial building removes its pollution penalty.
