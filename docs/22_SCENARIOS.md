# Scenarios

Custom scenarios use the shared simulation schema and are validated before JSON export/import.

## Purpose

Scenarios provide structured goals and replayability.

Start with one scenario.

## Scenario 1: First Settlement

### Goal

Reach 1,000 population without going bankrupt.

### Starting Conditions

- 64x64 empty temperate biome map;
- 50,000 money;
- basic road unlocked;
- residential zoning unlocked;
- other systems locked behind milestones.

### Objectives

Objectives follow the progression milestones in `06_PROGRESSION_AND_UNLOCKS.md`. Each milestone grants a new unlock and bonus; the scenario advances the player through the full milestone chain from 0 to 1,000 population.

### Win Condition

- population >= 1,000;
- money >= 0;
- happiness >= 50%.

### Loss Condition

- money below 0 for 5 consecutive months.

### Teaching Goals

The player learns:

- roads enable buildings;
- zones create city growth;
- jobs matter;
- services cost money;
- happiness affects growth;
- milestones unlock tools.

## Future Scenario Ideas

### Industrial Boom

Grow an industrial city while controlling pollution.

### Green City

Reach a population target with low pollution and high happiness.

### Budget Crisis

Fix a city that starts with debt and bad services.

### Traffic Nightmare

Redesign a congested city.

### Tourism Town

Use parks, landmarks, and commercial services to grow tourism.
