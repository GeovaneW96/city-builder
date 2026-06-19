# Public Transport

## Purpose

This document defines the bus system — the first public transit option in the city builder. The bus system reduces traffic congestion, improves happiness, and unlocks at population 2,500.

## Core Concepts

- **Bus Stop**: a building placed on a road tile where passengers board/alight.
- **Bus Depot**: a building required to operate buses. At least one depot must exist for any bus route to function.
- **Bus Route**: an ordered sequence of 2+ bus stops. Each route requires an associated depot.

## Bus Stop

| Field        |  Value |
| ------------ | -----: |
| id           | bus_stop |
| category     | transit |
| size         |    1×1 |
| placedOn     |   road |
| cost         |    500 |
| upkeep       |     50 |
| unlockPopulation | 2500 |

Placement rules:
- must be placed on an existing road tile;
- multiple stops can exist on the same tile (route nodes, not physical collisions);
- stops are not buildings in the traditional sense — they are lightweight markers on the road network.

## Bus Depot

| Field        |                 Value |
| ------------ | --------------------: |
| id           |           bus_depot |
| category     |              transit |
| size         |                 3×3 |
| cost         |              15,000 |
| upkeep       |                800 |
| workers      |                 15 |
| unlockPopulation |             2500 |

Placement rules:
- standard building placement (3x3 footprint, road adjacent);
- at least one depot must exist for routes to operate;
- multiple depots allowed.

## Bus Route

### Route Definition

```txt
route: {
  id: string;
  name: string;
  stops: stopId[];       // ordered list, length >= 2
  depotId: string;
  active: boolean;
  monthlyUpkeep: number; // 100
}
```

### Route Rules

- A route must have ≥ 2 stops.
- All stops on a route must belong to the same city (no cross-city routes in initial scope).
- A route is inactive if its assigned depot is demolished or becomes inoperable.
- Monthly upkeep per route: 100 (paid regardless of ridership).

## Coverage

### Transit Coverage

A building is "covered by transit" if it is within 4 tiles of any bus stop.

### Coverage Effects

| Building Type | Effect                                    |
| ------------- | ----------------------------------------- |
| Residential   | Traffic congestion −20%, happiness +3     |
| Commercial    | Traffic congestion −20%, happiness +2     |
| Industrial    | Traffic congestion −20%                   |

### Ridership

Ridership is a percentage of population near covered stops:

```txt
ridership = min(coveredPopulation * 0.3, 100)
```

Ridership does not generate direct income in the initial scope. It is a qualitative metric displayed to the player.

## Service State

```txt
publicTransportState: {
  stops: Map<stopId, BusStop>;
  depots: Map<depotId, BusDepot>;
  routes: Map<routeId, BusRoute>;
  coverageMap: Map<tileCoord, boolean>;
  ridership: number;
  activeRouteCount: number;
}
```

## Warnings

| Warning                    | Condition                           |
| -------------------------- | ----------------------------------- |
| Bus route has no depot     | A route exists with no valid depot  |
| Route too short            | A route has < 2 stops               |
| No bus depot               | Stops exist but no depot is built   |

## Data Constants

| Constant                       |  Value |
| ------------------------------ | -----: |
| BUS_STOP_COST                  |    500 |
| BUS_STOP_UPKEEP                |     50 |
| BUS_DEPOT_COST                 |  15000 |
| BUS_DEPOT_UPKEEP               |    800 |
| BUS_DEPOT_WORKERS              |     15 |
| BUS_ROUTE_UPKEEP               |    100 |
| BUS_UNLOCK_POP                 |   2500 |
| TRANSIT_COVERAGE_RADIUS        |      4 |
| TRAFFIC_REDUCTION_PERCENT      |   0.20 |
| RESIDENTIAL_HAPPINESS_BONUS    |      3 |
| COMMERCIAL_HAPPINESS_BONUS     |      2 |
| RIDERSHIP_PERCENT_OF_COVERED   |   0.30 |
| MIN_STOPS_PER_ROUTE            |      2 |

## Tests

- Bus stop placement on road tile succeeds
- Bus stop placement on non-road tile fails
- Bus stop placement outside map bounds fails
- Bus stop cost deducted from money
- Bus stop upkeep applied monthly
- Bus stop unlock at population 2500
- Bus depot placement validity (3×3, road adjacent)
- Bus depot cost and upkeep
- Bus route creation with ≥ 2 stops
- Bus route creation with < 2 stops fails
- Bus route assigned to existing depot
- Bus route without depot shows warning
- Bus route inactive when depot demolished
- Route monthly upkeep deducted
- Building within 4 tiles of stop is covered
- Building outside 4 tiles is not covered
- Covered residential gets happiness +3
- Covered commercial gets happiness +2
- Traffic reduction applied in covered areas
- Ridership calculated as 30% of covered population
- Multiple routes share coverage correctly
- Stops on same road tile coexist without conflict
- Save/load round-trip for transport state
