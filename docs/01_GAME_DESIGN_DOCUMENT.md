# Game Design Document

## Overview

This document defines the game design for a browser-based 3D city builder.

The game is a systems-driven management game where players build roads, zone land, provide services, manage budget, respond to city problems, and unlock new tools as the city grows.

## Core Player Experience

The player should constantly cycle through:

1. Build something.
2. Watch the city react.
3. Notice a new problem or opportunity.
4. Fix or optimize.
5. Unlock something new.
6. Expand.

The city should feel alive enough to create curiosity, but simple enough that the player understands cause and effect.

## Core Loop

```txt
Plan -> Build -> Simulate -> Diagnose -> Fix -> Grow -> Unlock -> Repeat
```

See `02_CORE_GAMEPLAY_LOOP.md` for the detailed breakdown of each phase.

## Main Resources

### Money

Used to build and maintain infrastructure.

Sources:

- residential taxes;
- commercial taxes;
- industrial taxes;
- milestone rewards;
- scenario rewards.

Sinks:

- road construction;
- building construction;
- service upkeep;
- infrastructure upkeep;
- loan payments.

Failure:

- bankruptcy if money stays below a threshold for too long.

### Population

Represents residents living in the city.

Population is affected by:

- residential capacity;
- happiness;
- jobs;
- services;
- taxes;
- pollution;
- road access.

### Jobs

Created by commercial, industrial, and service buildings.

Jobs affect:

- residential demand;
- unemployment;
- happiness;
- commercial/industrial productivity.

### Happiness

A composite measure of citizen satisfaction.

Influenced by:

- taxes;
- service coverage;
- pollution;
- traffic;
- employment;
- parks;
- health;
- education;
- safety.

### Demand

Demand expresses what the city needs.

Use RCI demand:

- Residential demand;
- Commercial demand;
- Industrial demand.

Demand should not be a simple random value. It should derive from city conditions.

## Zones

Three zone types — residential, commercial, industrial — are painted on empty tiles with road access. See `07_BUILDINGS_AND_ZONES.md` for detailed needs, outputs, and tradeoffs per zone type.

## Buildings

Buildings can be zone-grown or manually placed. See `07_BUILDINGS_AND_ZONES.md` for building definition fields, placement rules, and individual building specs.

## Roads

Roads are the backbone of city function.

Road behavior:

- buildings must be adjacent to roads;
- road placement costs money;
- roads connect zones to the network;
- disconnected buildings receive warnings.

Road features include:

- traffic capacity;
- intersections;
- road hierarchy;
- public transport routes.

## Services

Services improve city function and happiness. Initial services include power, water, parks, clinic, and school. See `07_BUILDINGS_AND_ZONES.md` for building specs and `04_SIMULATION_SYSTEMS.md` for service system mechanics.

## Failure States

The city can fail or enter crisis through:

- bankruptcy;
- very low happiness;
- lack of jobs;
- lack of housing;
- service collapse.

The primary failure state is:

> The city remains bankrupt for a defined period.

## Win Conditions

Sandbox games do not require a hard win, but scenarios should.

First scenario win condition:

> Reach 1,000 population with non-negative money and happiness above 50%.

## Tutorial

The first scenario teaches through objectives. See `22_SCENARIOS.md` for the objective sequence and `06_PROGRESSION_AND_UNLOCKS.md` for the milestone-based unlock flow.

## Difficulty Curve

Early game:

- clear tasks;
- forgiving economy;
- fast feedback.

Mid game:

- service costs increase;
- traffic/pollution introduced;
- denser zoning unlocks.

Late game:

- optimization;
- policies;
- city specialization;
- large-scale infrastructure.

## Design Risks

- too much complexity too early;
- unclear simulation feedback;
- player does not know what to do next;
- visuals are prioritized over gameplay;
- economy is either trivial or punishing;
- Codex introduces inconsistent rules.
