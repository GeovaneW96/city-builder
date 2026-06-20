# Traffic Model

## Purpose

This document defines the Phase 2 abstract traffic model for the city builder. Traffic congestion affects happiness and productivity without requiring per-vehicle agent simulation. The model is tile-based, data-driven, and fully testable without rendering.

## Per-Road Capacity

Each road type has a trip capacity per tile:

| Road Type  | Capacity (trips per tile) |
| ---------- | :-----------------------: |
| Dirt road  |            10             |
| Paved road |            25             |

Capacity represents how many trip units a single road tile can handle before becoming congested.

## Traffic Sources

Every active building generates trips based on its type and size:

| Source                    | Formula              | Example                            |
| ------------------------- | -------------------- | ---------------------------------- |
| Residential commute trips | `population / 4`     | House with capacity 8 → 2 trips    |
| Commercial customer trips | `commercialJobs × 2` | Small shop (6 jobs) → 12 trips     |
| Industrial cargo trips    | `industrialJobs × 3` | Small factory (12 jobs) → 36 trips |
| Service trips             | `serviceJobs × 1`    | Clinic (8 jobs) → 8 trips          |

All values round up (ceiling) to the nearest integer.

## Trip Assignment

Each building assigns its trips to the nearest road tile:

1. For each building with > 0 trips, find the closest road tile (Chebyshev distance).
2. If multiple road tiles are equidistant, assign evenly (round up).
3. If no road tile exists within a range of 20 tiles, the building is considered disconnected and generates no trips. It should already have a "no road access" warning from the road connectivity system.
4. Each road tile accumulates the sum of trips assigned to it.

Road tiles with no trips are excluded from congestion calculations.

## Congestion Computation

```txt
roadSegmentCongestion = sum(trips assigned to segment) / segmentCapacity

segmentCongestionClamped = min(1.0, roadSegmentCongestion)
```

A value of 1.0 means the segment is at full capacity. Values above 1.0 are clamped — the segment is simply saturated.

### City Congestion

```txt
cityCongestion = average(segmentCongestionClamped across all road segments) × 100
```

Rounded to one decimal place. Range is 0–100.

## City-Level Congestion Effects

Penalties apply when `cityCongestion > 50`:

### Happiness Penalty

```txt
trafficHappinessPenalty = max(0, cityCongestion - 50) × TRAFFIC_HAPPINESS_WEIGHT
```

Applied as a negative happiness modifier.

### Commercial Productivity Penalty

```txt
commercialProductivityMultiplier = 1.0 - max(0, cityCongestion - 50) × COMMERCIAL_TRAFFIC_PENALTY
```

Multiplies commercial tax income. Cannot go below `COMMERCIAL_MIN_MULTIPLIER`.

### Industrial Productivity Penalty

```txt
industrialProductivityMultiplier = 1.0 - max(0, cityCongestion - 50) × INDUSTRIAL_TRAFFIC_PENALTY
```

Multiplies industrial tax income and goods output. Cannot go below `INDUSTRIAL_MIN_MULTIPLIER`.

### Summary Table

| Effect                             | At cityCongestion = 50 | At cityCongestion = 75 | At cityCongestion = 100 |
| ---------------------------------- | :--------------------: | :--------------------: | :---------------------: |
| Happiness penalty                  |           0            |          −7.5          |           −15           |
| Commercial productivity multiplier |          1.0           |         0.875          |          0.75           |
| Industrial productivity multiplier |          1.0           |          0.85          |          0.70           |

## Warnings

| Condition                      | Warning                    | Severity |
| ------------------------------ | -------------------------- | :------: |
| `cityCongestion > 75`          | "Traffic congestion"       |   high   |
| Any segment at 100% saturation | "Road segment at capacity" |  medium  |
| Average commute > threshold    | "Long commute times"       |   low    |

The general "Traffic congestion" warning includes the current congestion percentage and a suggestion to upgrade roads or add alternative routes.

## Data Parameters

All constants in `src/data/balance/traffic.ts`:

```txt
DIRT_ROAD_CAPACITY                  = 10
PAVED_ROAD_CAPACITY                 = 25
RESIDENTIAL_TRIPS_PER_POP          = 0.25   // population / 4
COMMERCIAL_TRIPS_PER_JOB           = 2
INDUSTRIAL_TRIPS_PER_JOB           = 3
SERVICE_TRIPS_PER_JOB              = 1
MAX_ROAD_DISTANCE                  = 20
TRAFFIC_HAPPINESS_WEIGHT           = 0.3
COMMERCIAL_TRAFFIC_PENALTY         = 0.005  // 0.5% per point above 50
COMMERCIAL_MIN_MULTIPLIER          = 0.5
INDUSTRIAL_TRAFFIC_PENALTY         = 0.006  // 0.6% per point above 50
INDUSTRIAL_MIN_MULTIPLIER          = 0.5
TRAFFIC_WARNING_THRESHOLD          = 75
SEGMENT_WARNING_THRESHOLD          = 1.0
```

## Integration Points

| System    | Integration                                                       |
| --------- | ----------------------------------------------------------------- |
| Happiness | Traffic happiness penalty applied as negative modifier            |
| Economy   | Commercial and industrial income multiplied by traffic penalty    |
| Goods     | Industrial goods output scaled by industrial productivity penalty |
| Warnings  | Traffic congestion and saturated segment warnings                 |
| UI        | Congestion overlay, per-segment tooltip, city congestion stat     |
| Roads     | Per-road-type capacity read from road definition                  |

## Current Implementation

`recomputeTraffic` rebuilds the road-segment list every tick from active buildings and roads.
Trips are conserved when equidistant roads share a building's demand, disconnected buildings
produce none, and only segments with trips contribute to the city-congestion average. The
derived traffic state drives happiness, commercial and industrial tax income, and city warnings.

Active bus-route coverage reduces residential, commercial, and industrial building trip demand
before road assignment. See `30_PUBLIC_TRANSPORT.md` for the route and coverage rules.

## Tests

1. Dirt road tile has capacity of 10.
2. Paved road tile has capacity of 25.
3. Residential building generates `ceil(population / 4)` commute trips.
4. Commercial building generates `jobs × 2` customer trips.
5. Industrial building generates `jobs × 3` cargo trips.
6. Service building generates `jobs × 1` service trips.
7. Building assigns all trips to the nearest road tile.
8. Building with equidistant road tiles splits trips evenly.
9. Building with no road tile within max distance generates zero trips.
10. Road segment congestion clamps at 1.0 (100%) and never exceeds it.
11. City congestion is the average of all segment congestion values × 100.
12. City with no road tiles produces 0 congestion (no segments to average).
13. City with one empty road produces 0 congestion.
14. Happiness penalty is 0 when city congestion is ≤ 50.
15. Happiness penalty increases linearly above 50.
16. Commercial productivity multiplier is 1.0 when city congestion ≤ 50.
17. Commercial productivity multiplier decreases linearly above 50.
18. Industrial productivity multiplier is 1.0 when city congestion ≤ 50.
19. Industrial productivity multiplier decreases linearly above 50.
20. Commercial multiplier does not go below `COMMERCIAL_MIN_MULTIPLIER`.
21. Industrial multiplier does not go below `INDUSTRIAL_MIN_MULTIPLIER`.
22. "Traffic congestion" warning fires when city congestion > 75.
23. "Traffic congestion" warning clears when city congestion drops to ≤ 75.
24. Adding paved roads to a congested dirt network reduces city congestion.
25. Multiple buildings sharing the same nearest road tile accumulate correctly.
26. Mixed road types (dirt + paved) use correct per-tile capacities.
27. Traffic trips round up to the nearest integer.
28. Road segments with no assigned trips do not affect the average.
