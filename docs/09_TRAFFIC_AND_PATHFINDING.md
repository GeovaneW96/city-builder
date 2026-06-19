# Traffic and Pathfinding (Phase 2 Overview)

## Purpose

Traffic is a major city-builder system. Phase 2 uses an abstract congestion model (see `docs/26_TRAFFIC_MODEL.md` for the full specification) rather than per-vehicle agent simulation. This document is a high-level overview of the Phase 2 approach.

## Design Principle

Do not implement full agent-based traffic in Phase 2. Instead, use:

- road access;
- road network connectivity;
- per-segment abstract congestion;
- per-building trip generation.

## Road Access

A building has road access if at least one tile in its footprint is adjacent to a road tile.

## Road Network

Treat connected road tiles as a graph. Each road tile connects to orthogonal neighboring road tiles.

## Abstract Congestion Model (Phase 2)

The detailed traffic model is specified in `docs/26_TRAFFIC_MODEL.md`. At a high level:

1. Every active building generates trips based on its type (residential, commercial, industrial, service).
2. Trips are assigned to the nearest road tile.
3. Each road segment accumulates trips and compares them to its capacity (dirt: 10, paved: 25).
4. City congestion is the average segment saturation across all road tiles, expressed as a percentage (0–100).
5. Congestion above 50% applies penalties to happiness, commercial productivity, and industrial productivity.

All balance values, formulas, and test cases live in `docs/26_TRAFFIC_MODEL.md`.

## Traffic UI

- Congestion overlay (per-segment color from green to red);
- Road capacity tooltip on hover;
- Building warning: "traffic congestion affects operations";
- Average commute stat;
- City congestion trend indicator.

## Pathfinding

Pathfinding is used for connectivity checking and abstract traffic assignment.

Candidate algorithms:

- BFS for simple grid connectivity (road access checks);
- Manhattan/Chebyshev distance for nearest-road assignment.

Full pathfinding for service vehicles, public transport, and cargo routing is deferred.

## Phase 3 Content

The following topics are moved out of this document and will be specified in a dedicated Phase 3 document (`docs/34_AGENT_TRAFFIC_AND_ROAD_HIERARCHY.md`):

- Agent-based vehicle simulation;
- Road hierarchy (arterial, collector, local);
- Traffic lights and intersection logic;
- Lane-level pathfinding;
- Parking demand and availability;
- Public transport routing;
- Service vehicle dispatching.

## Traffic Design Goals

Traffic should:

- reward good road planning;
- make layout matter;
- be understandable through overlays;
- not require perfect realism.

## Tests

See `docs/26_TRAFFIC_MODEL.md` for the full test list covering congestion, trip generation, capacity, warnings, and penalties.
