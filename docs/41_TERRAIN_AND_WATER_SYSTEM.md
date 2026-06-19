# Terrain and Water System

## Purpose

This document defines the elevation, terrain editing, and water system.

Terrain editing adds a new spatial layer to the simulation. Water introduces new rules for placement, land value, and map generation.

## Elevation Model

Each tile has an integer elevation from 0 to 10.

| Value | Meaning           |
| ----: | ----------------- |
|     0 | Sea level / water |
|     1 | Default flat      |
|  2-10 | Raised terrain    |

Initial map starts entirely at elevation 1.

Elevation is stored per tile:

```txt
tile.elevation  // 0..10, integer
```

## Terrain Editing Tool

The player can raise or lower terrain with a brush tool.

| Property                        | Value         |
| ------------------------------- | ------------- |
| Cost per tile per level         | 100           |
| Max elevation change per action | 1 level       |
| Brush size                      | 1×1, 3×3, 5×5 |
| Cannot raise water tiles        | —             |

Raising or lowering a tile costs money per level changed. Lowering a non-water tile to elevation 0 turns it into water. Raising a water tile above 0 turns it into land (elevation 1).

Tile changes on water tiles only affect the targeted tile. Adjacent water tiles remain water unless the raised tile was the only path keeping them separate (auto-fill logic on rivers is handled separately).

## Elevation Effects

Building and road placement restrictions:

| Feature             | Max Elevation | Notes                               |
| ------------------- | ------------: | ----------------------------------- |
| Buildings           |             3 | Buildings on elevation 3 pay +50%   |
| Roads               |             5 |                                     |
| Steep slope (roads) |             — | Adjacent tiles with delta > 1 block |

Buildings can be placed on elevation 0-3. For elevation 3, a +50% construction surcharge applies (terracing cost). Roads can be placed on elevation 0-5. If the elevation difference between two adjacent tiles exceeds 1, a road cannot be built between them.

## Water System

### Water Tiles

A tile with elevation 0 is a water tile.

| Property               | Rule   |
| ---------------------- | ------ |
| Buildable              | No     |
| Road placement         | No     |
| Zone painting          | No     |
| Fishing / resource use | Future |

### Waterfront Bonus

Tiles adjacent to a water tile (orthogonally) receive a land value bonus:

```txt
waterfrontBonus = +20 land value (added after all other modifiers)
```

This bonus is recalculated whenever terrain changes. A tile is considered waterfront if any of its four orthogonal neighbors has elevation 0.

### Rivers and Water Auto-Fill

When a player lowers a connected path of tiles to elevation 0, water auto-fills the channel if it connects to an existing water body (ocean edge or other water tile). The fill algorithm:

1. Find all tiles lowered to elevation 0.
2. Check if any of those tiles is orthogonally adjacent to an existing water tile.
3. If yes, mark all connected elevation-0 tiles as water.
4. If no, the lowered tiles remain as dry pits (potential water if later connected).

This allows carving rivers from the coast inland.

### Coastline

At game start, the map can have ocean edge tiles. This is configurable:

```txt
oceanEdge: "none" | "north" | "south" | "east" | "west" | "all"
```

Ocean edge tiles are elevation 0, are not editable, and serve as the water source for river carving.

## Map Size

Map size is configurable at game start. All sizes use the same tile coordinate system.

| Size    | Tiles  | Suggested Use               |
| ------- | ------ | --------------------------- |
| 64×64   | 4,096  | Default                     |
| 128×128 | 16,384 | Large city                  |
| 256×256 | 65,536 | Max (performance sensitive) |

Memory and performance budget:

```txt
64×64   ≈ 0.5 MB  grid state
128×128 ≈ 2.0 MB  grid state
256×256 ≈ 8.0 MB  grid state
```

Rendering should use level-of-detail or chunking for maps larger than 128×128.

## Camera Bounds

Camera pan limits adapt to map size. The camera should never show areas outside the map extents.

```txt
cameraMinX = 0
cameraMaxX = mapWidth * tileSize
cameraMinZ = 0
cameraMaxZ = mapHeight * tileSize
```

Zoom-out distance should be proportional to map size so the full map is visible at max zoom-out.

## Performance

Terrain mesh updates only on edit, not every frame.

- Use vertex displacement on a plane geometry: modify vertex Y based on tile elevation.
- Batch edits: if the player raises 20 tiles, one mesh update.
- On map size > 128×128, split into terrain chunks (e.g., 16×16 tiles per chunk).

## Tests

- A tile at elevation 0 is water and cannot be built on.
- A tile at elevation 1-10 is land and can be built on (subject to building-specific limits).
- Raising a single tile costs exactly 100 money per level.
- Lowering a tile to elevation 0 creates a water tile.
- Raising a water tile to elevation 1 creates a land tile.
- A tile adjacent to water receives +20 land value.
- A tile not adjacent to water does not receive the bonus.
- Roads cannot be placed on elevation > 5.
- Roads cannot span a slope where adjacent tiles differ by > 1 elevation.
- Buildings cannot be placed on elevation > 3.
- Buildings on elevation 3 cost 150% of normal construction cost.
- Water auto-fills a lowered channel only if adjacent to existing water.
- A lowered pit with no water adjacency stays empty.
- Map size 64×64 produces exactly 4096 tiles.
- Map size 256×256 produces exactly 65536 tiles.
- Camera bounds are proportional to map size.
- Terrain mesh updates only when terrain state changes.
- Ocean edge tiles are elevation 0 and not editable.
- Brush sizes 1, 3, and 5 affect the correct tile counts.
