# Map, Grid, and Terrain

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
