# Traffic and Pathfinding

## Purpose

Traffic is a major city-builder system. The first version should use an abstract traffic model before simulating individual cars.

## Recommendation

Do not implement full agent-based traffic in the first prototype.

Instead, use:

- road access;
- road network connectivity;
- abstract congestion score;
- simple commute pressure.

## Road Access

A building has road access if at least one tile in its footprint is adjacent to a road tile.

## Road Network

Treat connected road tiles as a graph.

Each road tile connects to orthogonal neighboring road tiles.

## Abstract Traffic Model

Possible first model:

```txt
trafficDemand = populationTrips + jobTrips + industrialTrips
roadCapacity = roadTileCount * capacityPerRoadTile
congestion = trafficDemand / roadCapacity
```

Congestion affects:

- happiness;
- commercial/industrial productivity;
- warnings.

## Local Congestion Later

Later, assign traffic pressure to road segments.

Sources:

- residential buildings create commute trips;
- commercial buildings attract customer trips;
- industrial buildings create cargo trips;
- services create utility trips.

## Pathfinding Later

When needed, use pathfinding for:

- cars;
- service vehicles;
- public transport;
- cargo.

Candidate algorithms:

- BFS for simple grids;
- Dijkstra for weighted roads;
- A\* for performance.

## Traffic Design Goals

Traffic should:

- reward good road planning;
- make layout matter;
- be understandable through overlays;
- not require perfect realism.

## Traffic UI

Required later:

- congestion overlay;
- road capacity tooltip;
- building warning: "traffic prevents deliveries";
- average commute stat;
- traffic trend.

## Do Not Do Early

Avoid in early version:

- thousands of individual cars;
- lane-level simulation;
- traffic lights;
- multi-lane pathfinding;
- parking;
- complex intersections.

These can easily consume the entire project.
