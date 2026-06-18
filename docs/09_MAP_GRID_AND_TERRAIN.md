# Map, Grid, and Terrain

## Purpose

This document defines the world model.

For MVP, the map should be simple and reliable.

## MVP Map

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

Suggested schema:

```ts
type Tile = {
  x: number;
  y: number;
  terrain: "grass" | "water" | "blocked";
  roadId?: string;
  zone?: "residential" | "commercial" | "industrial";
  buildingId?: string;
  pollution: number;
  landValue: number;
};
```

For MVP, terrain can always be `grass`.

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

## Map Expansion

Not part of MVP.

Future expansion can use:

- unlockable map chunks;
- purchaseable land;
- natural obstacles;
- different biomes;
- resource deposits.

## Terrain Features Later

Possible future features:

- rivers;
- coastlines;
- hills;
- forests;
- fertile land;
- ore/oil resources;
- protected areas.

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
