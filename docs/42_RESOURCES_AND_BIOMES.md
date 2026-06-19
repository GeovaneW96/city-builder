# Resources and Biomes

## Purpose

This document defines resource deposits, extraction buildings, depletion, and biome selection.

Resources add an economic layer to industrial zones. Biomes give visual and strategic variety to maps.

## Resources

### Resource Types

| Type        | Effect                                    | Initial Richness |
| ----------- | ----------------------------------------- | ---------------: |
| Ore         | +50% industrial output on deposits        | 50–100           |
| Oil         | +100% industrial output, +50% pollution   | 50–100           |
| Fertile soil| +50% farming output (if farming exists)   | 50–100           |

### Resource Tile Data

Each resource tile stores:

```txt
resourceType: "ore" | "oil" | "fertile_soil" | null
richness: 1..100
depleted: boolean
```

Resources are generated at map creation, not placed by the player. They are hidden until discovered or revealed via the resource overlay.

### Discovery

A resource tile becomes visible when:

1. It has road access (adjacent to a road tile).
2. There is an industrial zone within 3 tiles.

Once discovered, the resource type and richness are shown on the overlay.

### Depletion

Resource richness decreases by 1 per in-game year when an extraction building is actively operating on the tile.

```txt
richness -= 1 per year of extraction
```

When richness reaches 0, the tile is marked `depleted` and extraction buildings on it produce at 0% output.

A warning fires when richness drops below 20.

### Extraction Buildings

Special buildings that must be placed on resource tiles.

| Building       | Size | Cost   | Upkeep | Jobs | Required Resource |
| -------------- | ---- | ------ | ------ | ---- | ----------------- |
| Mine           | 3×3  | 20,000 | 1,000  | 20   | ore               |
| Oil derrick    | 3×3  | 30,000 | 1,500  | 15   | oil               |
| Farm           | 4×4  | 15,000 | 500    | 15   | fertile_soil      |

Extraction buildings:

- can only be placed on tiles containing their required resource;
- produce output proportional to richness (linear scale: 100% at richness 100, 50% at richness 50, etc.);
- require road access;
- generate pollution for mines and oil derricks (farms do not).

### Resource Overlay

Toggleable overlay that shows:

- discovered resource icons on tiles;
- richness value as a progress bar or number;
- depleted tiles with a muted icon.

## Biomes

### Biome Types

| Biome    | Water  | Ore          | Oil          | Fertile Soil |
| -------- | ------ | ------------ | ------------ | ------------ |
| Temperate| Normal | Moderate     | Low          | Moderate     |
| Desert   | None   | Low          | High         | None         |
| Tropical | High   | None         | Low          | High         |
| Arctic   | Normal | Low          | High         | None         |
| Volcanic | Normal | High         | None         | Low          |

Water availability refers to natural water tiles at map start (ocean and inland water).

### Resource Weight Tables

Biome affects resource generation probability per tile:

```txt
Temperate:
  ore:           0.03
  oil:           0.01
  fertile_soil:  0.04

Desert:
  ore:           0.02
  oil:           0.06
  fertile_soil:  0.00

Tropical:
  ore:           0.00
  oil:           0.01
  fertile_soil:  0.08

Arctic:
  ore:           0.01
  oil:           0.05
  fertile_soil:  0.00

Volcanic:
  ore:           0.08
  oil:           0.00
  fertile_soil:  0.01
```

### Biome Visual Data

```txt
biomeData:
  name: string
  resourceWeights: { ore: number, oil: number, fertile_soil: number }
  terrainColors: { grass: string, water: string, rock: string, sand: string }
  treeDensity: 0..1
  decorationDensity: 0..1
  skyTint: string (optional)
```

Example for Desert:

```txt
terrainColors:
  grass: "#c2b280"
  water: "#4a90d9"
  rock: "#8b7355"
  sand: "#e8d5a3"
treeDensity: 0.02
decorationDensity: 0.05
```

### Biome Selection

Biome is selected at game start before the map is generated. It affects:

- resource placement (weights);
- terrain color palette (rendering only);
- tree and decoration density (rendering only);
- starting water availability.

Biome is stored in save data and cannot change mid-game.

## Tests

- Resource tiles are generated at map creation with valid type and richness.
- Ore tiles give +50% industrial output bonus when an industrial building is on them.
- Oil tiles give +100% industrial output bonus and +50% pollution.
- Fertile soil tiles give +50% farming output.
- Resource tiles without road access or nearby industrial zone are hidden.
- Resource tiles become visible when both conditions (road + industrial zone within 3 tiles) are met.
- Richness decreases by exactly 1 per in-game year during extraction.
- Richness at 0 marks the tile as depleted.
- Depletion warning fires when richness < 20.
- Extraction buildings can only be placed on matching resource tiles.
- Extraction buildings require road access.
- Mine costs 20,000, oil derrick costs 30,000, farm costs 15,000.
- Mine upkeep is 1,000, oil derrick 1,500, farm 500.
- Mine provides 20 jobs, oil derrick 15, farm 15.
- Biome affects resource generation probability per tile.
- Biome affects terrain colors, tree density, and decoration density.
- Biome cannot be changed mid-game.
- Desert biome has zero fertile_soil weight.
- Volcanic biome has zero oil weight.
- Tropical biome has zero ore weight.
