# MVP Product Requirements Document

## MVP Goal

Build a playable browser-based city builder vertical slice where the player can grow a city from empty land to 1,000 population without going bankrupt.

The MVP should prove:

- the build interaction is satisfying;
- the city reacts to player decisions;
- the player has understandable problems to solve;
- progression creates motivation;
- the technical architecture supports future expansion.

## Target Platform

- Desktop web browser first.
- Mouse and keyboard controls.
- Mobile is not part of MVP.

## MVP Scenario

Title:

> First Settlement

Objective:

> Reach 1,000 population without going bankrupt.

Starting conditions:

- empty 64x64 grid;
- starting money: 50,000;
- no unlocked advanced services;
- basic road and residential zoning available.

Win condition:

- population >= 1,000;
- money >= 0;
- happiness >= 50%.

Loss condition:

- money < 0 for 5 consecutive in-game months.

## MVP Features

### Map

- Fixed 64x64 grid.
- Flat terrain.
- No terrain editing.
- Tile hover.
- Tile selection.

### Camera

- Pan.
- Zoom.
- Rotate or fixed isometric camera.
- Smooth movement.
- Prevent camera from getting lost below the map.

### Roads

- Place roads on grid tiles.
- Remove roads.
- Road cost deducted from money.
- Invalid placement preview.
- Roads provide access to adjacent buildings/zones.

### Zoning

- Paint residential, commercial, industrial zones.
- Remove zones.
- Zones require road access to grow buildings.
- Zone painting costs little or nothing depending on balance.

### Buildings

Zone-grown buildings:

- small house;
- small shop;
- small factory.

Manual buildings:

- power plant;
- water tower;
- park;
- clinic;
- school;
- city hall.

### Economy

- money;
- income;
- expenses;
- taxes;
- upkeep;
- monthly tick.

Initial simple model:

- residents generate residential tax;
- businesses generate commercial/industrial tax;
- services and roads have upkeep.

### Demand

Use RCI demand:

- residential demand increases when jobs are available;
- commercial demand increases when population grows;
- industrial demand increases when jobs/goods are needed.

### Happiness

MVP happiness should include:

- service coverage;
- taxes;
- unemployment;
- pollution;
- lack of power/water;
- parks.

### Services

MVP services:

- power capacity;
- water capacity;
- parks;
- clinic;
- school.

Power and water can start as capacity-based rather than network-based if needed.

### Warnings

Buildings can display warnings:

- no road access;
- no power;
- no water;
- no workers;
- abandoned;
- unhappy area.

### Progression

Milestones:

- 50 population: commercial zones;
- 100 population: industrial zones;
- 250 population: park;
- 500 population: clinic;
- 750 population: school;
- 1,000 population: scenario complete.

### UI

Required UI:

- top stats bar;
- money;
- population;
- happiness;
- RCI demand bars;
- build toolbar;
- selected tile/building inspector;
- warning messages;
- scenario objective panel;
- pause/play/speed controls.

### Save/Load

MVP should support:

- one local save slot;
- autosave every defined interval;
- manual save;
- load from browser storage.

## Non-Goals

MVP excludes:

- multiplayer;
- large maps;
- procedural maps;
- advanced traffic pathfinding;
- public transport;
- disasters;
- terrain editing;
- realistic citizens;
- modding;
- Steam release;
- mobile UI;
- cloud saves.

## Acceptance Criteria

The MVP is acceptable when:

- player can complete the first scenario;
- game can be played for 15-30 minutes;
- core systems have tests;
- city state can be saved and loaded;
- buildings visibly grow;
- warnings explain problems;
- no severe performance problems on a normal desktop browser;
- code respects simulation/rendering separation.

## Performance Targets

Initial targets:

- 60 FPS on small city if possible;
- minimum acceptable 30 FPS;
- simulation tick independent from render frame;
- no major freezes during placement;
- map size capped at 64x64.

## Analytics to Consider Later

Not for MVP implementation unless easy:

- session length;
- time to first road;
- time to first building;
- time to bankruptcy;
- scenario completion rate;
- most common warning;
- most used building.
