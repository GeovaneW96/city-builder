# Map, Grid, and Terrain

## Terrain state

Tiles store elevation and water state. Elevation edits are simulation commands with a per-level cost; sea-level tiles are not buildable.

## Purpose

This document defines the world model.

The map should be simple and reliable.

## Map

- 64x64 tiles.
- Flat terrain.
- All tiles buildable unless occupied.
- No terrain editing.
- No water bodies.
- No elevation.

## Tile Coordinates

Use integer grid coordinates:

```txt
x: 0..63
y: 0..63
```

Rendering can map tiles to world coordinates.

Example:

```txt
worldX = x * tileSize
worldZ = y * tileSize
```

## Tile Size

Choose a single tile size in world units.

Example:

```txt
tileSize = 1
```

or

```txt
tileSize = 10
```

The choice should be consistent across rendering, picking, and placement.

## Tile State

Tile fields:

- `x`, `y` — integer grid coordinates;
- `terrain` — `"grass"`, `"water"`, or `"blocked"`;
- `roadId` — set if this tile is a road;
- `zone` — `"residential"`, `"commercial"`, or `"industrial"` if painted;
- `buildingId` — set if a building occupies this tile;
- `pollution` — 0..100;
- `landValue` — 0..100.

Initial terrain is always `grass`.

Each tile also stores `districtId`, which is either the ID of its owning district or `null`.
District ownership is simulation data and is independent of any visual overlay.

Land value is a 0..100 number for buildable terrain and `null` for unbuildable terrain.
Grid cloning also preserves each building's upgrade tier and last-upgrade tick so saved cities
resume density-transition cooldowns correctly.

## Placement Rules

### Roads

- occupy one tile;
- cannot overlap buildings;
- can replace zones if allowed;
- connect orthogonally.

### Zones

- can be painted on empty tiles;
- cannot overlap roads or buildings;
- can be removed.

### Buildings

- occupy one or more tiles;
- require valid footprint;
- may require adjacent road.

## Camera Bounds

The camera should be constrained so the player cannot lose the map.

Rules:

- pan bounded around map extents;
- zoom min/max;
- pitch min/max;
- optional rotate snap.

## Debug Tools

Useful debug overlays:

- tile coordinates;
- occupied tiles;
- road connectivity;
- zone type;
- service coverage;
- pollution;
- land value;

## Road-Bounded Neighborhoods

The happiness simulation treats road tiles as neighborhood boundaries. It flood-fills
contiguous grass tiles and excludes water, blocked terrain, road tiles, and regions without
buildings. This map-derived data is recalculated during the simulation tick and is independent
of rendering state.

## Road Capacity

Every placed road also contributes one abstract traffic segment. Dirt segments have lower trip
capacity than paved segments; congestion is derived from trips assigned to the nearest road and
does not depend on Three.js geometry. See `26_TRAFFIC_MODEL.md` for capacity and routing rules.

Map-state cloning also preserves derived traffic, goods, loan, and extended-service snapshots so
save/load and tick updates remain isolated from the previous city-state object.

Cloning also copies city-rating components and achievement unlock records. These are simulation
snapshots, not rendering data, so a saved or branched state cannot mutate the original city's
progression history.

It also preserves bus-stop and route state. Stops occupy road coordinates without blocking road
or building placement, while routes reference their stop and depot identifiers.

District definitions persist their name, color, rectangular tile list, and active policies.
Deleting a district clears only `districtId` and policies; it does not change terrain, roads,
zones, or buildings.
