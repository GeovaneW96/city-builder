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
- available services.

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
- traffic.

### Industrial Zone

Purpose:

- creates jobs;
- generates tax income;
- supplies goods.

Requirements:

- adjacent road;
- industrial demand;
- workers.

Problems:

- pollution;
- traffic;
- low land value nearby.

## Zone-Grown Buildings

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

## Manual Buildings

### City Hall

Purpose:

- scenario anchor;
- starting building;
- upgrade visual.

### Power Plant

Purpose:

- provides power capacity.

Tradeoff:

- high cost;
- upkeep;
- pollution.

### Water Tower

Purpose:

- provides water capacity.

Tradeoff:

- cost and upkeep.

### Park

Purpose:

- improves nearby happiness and land value.

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

## Building Definition Fields

- `id` — unique string identifier;
- `name` — display name;
- `category` — residential, commercial, industrial, utility, service, civic, decoration;
- `placementType` — `"zone-grown"` or `"manual"`;
- `size` — width and height in tiles;
- `cost` — construction cost;
- `upkeep` — monthly maintenance;
- `unlockPopulation` — population milestone required (optional);
- `requirements` — road access, demand, unlock, service, or worker conditions;
- `effects` — power/water capacity, health/education radius, happiness, pollution, jobs, population capacity, tax type;
- `visual` — model id and optional footprint color.

## Building Instance Fields

- `id` — unique runtime id;
- `definitionId` — references a building definition;
- `position` — grid coordinates;
- `rotation` — 0, 90, 180, or 270 degrees;
- `status` — `"constructing"`, `"active"`, `"inactive"`, or `"abandoned"`;
- `warnings` — list of active warning strings;
- `createdAtTick` — tick when the building was placed.

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
