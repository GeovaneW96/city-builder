# Buildings and Zones

## Purpose

This document defines the initial building and zoning model.

Buildings should be data-driven.

## Zone Types

### Residential Zone

Purpose:

- houses citizens;
- creates tax income;
- supplies workers.

Requirements:

- adjacent road;
- residential demand;
- available services later.

Problems:

- pollution lowers desirability;
- lack of jobs lowers demand/happiness;
- lack of services can reduce growth.

### Commercial Zone

Purpose:

- creates jobs;
- provides shops/services;
- generates tax income.

Requirements:

- adjacent road;
- commercial demand;
- available workers.

Problems:

- lack of workers;
- lack of customers;
- traffic later.

### Industrial Zone

Purpose:

- creates jobs;
- generates tax income;
- supplies goods later.

Requirements:

- adjacent road;
- industrial demand;
- workers.

Problems:

- pollution;
- traffic;
- low land value nearby.

## MVP Zone-Grown Buildings

### Small House

```txt
id: small_house
category: residential
size: 1x1
populationCapacity: 8
jobs: 0
taxType: residential
requirements: road access
```

### Small Shop

```txt
id: small_shop
category: commercial
size: 1x1
populationCapacity: 0
jobs: 6
taxType: commercial
requirements: road access, commercial demand
```

### Small Factory

```txt
id: small_factory
category: industrial
size: 2x2
populationCapacity: 0
jobs: 12
taxType: industrial
requirements: road access, industrial demand
effects: pollution
```

## MVP Manual Buildings

### City Hall

Purpose:

- scenario anchor;
- starting building;
- future upgrade visual.

### Power Plant

Purpose:

- provides power capacity.

Tradeoff:

- high cost;
- upkeep;
- pollution later.

### Water Tower

Purpose:

- provides water capacity.

Tradeoff:

- cost and upkeep.

### Park

Purpose:

- improves nearby happiness and land value later.

Tradeoff:

- consumes space;
- upkeep.

### Clinic

Purpose:

- improves health/happiness.

Tradeoff:

- high upkeep;
- requires workers.

### School

Purpose:

- improves education/happiness and future building upgrades.

Tradeoff:

- high cost/upkeep.

## Building Data Schema

Suggested TypeScript shape:

```ts
type BuildingDefinition = {
  id: string;
  name: string;
  category: BuildingCategory;
  placementType: "zone-grown" | "manual";
  size: { width: number; height: number };
  cost: number;
  upkeep: number;
  unlockPopulation?: number;
  requirements: BuildingRequirement[];
  effects: BuildingEffect[];
  visual: {
    modelId: string;
    footprintColor?: string;
  };
};
```

## Building Instance Schema

```ts
type BuildingInstance = {
  id: string;
  definitionId: string;
  position: { x: number; y: number };
  rotation: 0 | 90 | 180 | 270;
  status: "constructing" | "active" | "inactive" | "abandoned";
  warnings: string[];
  createdAtTick: number;
};
```

## Placement Rules

A building can be placed if:

- all footprint tiles are within map bounds;
- all footprint tiles are buildable;
- no conflicting building exists;
- required road adjacency exists if required;
- player has enough money;
- building is unlocked.

## Visual Rules

Buildings should be:

- readable from distance;
- visually distinct by category;
- low-poly and stylized;
- not overly detailed;
- aligned to grid.

## Future Building Categories

- police;
- fire;
- garbage;
- public transport;
- offices;
- tourism;
- landmarks;
- utilities;
- parks/plazas;
- education tiers;
- healthcare tiers.
