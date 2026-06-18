# Roadmap

## Phase 0 - Documentation and Scope

Goal: define the game before implementation.

Deliverables:

- game vision;
- MVP PRD;
- simulation rules;
- technical architecture;
- Codex workflow;
- initial backlog.

Exit criteria:

- first vertical slice is clearly defined;
- non-goals are clear;
- simulation/rendering boundary is documented;
- Codex can safely start implementation.

## Phase 1 - Interaction Prototype

Goal: prove that building on the map feels good.

Features:

- Three.js scene;
- 64x64 grid;
- city-builder camera;
- tile hover;
- tile selection;
- road placement;
- zone painting;
- basic cost deduction.

Exit criteria:

- player can navigate the map comfortably;
- player can place roads and zones;
- invalid placement feedback exists;
- state can be inspected/debugged.

## Phase 2 - Simulation MVP

Goal: turn the prototype into a game.

Features:

- residential/commercial/industrial demand;
- auto-growing buildings;
- population;
- jobs;
- money;
- taxes;
- upkeep;
- happiness;
- road connectivity;
- basic power/water services;
- warnings.

Exit criteria:

- city can grow;
- city can fail;
- player can diagnose and fix problems;
- core systems are tested.

## Phase 3 - Progression and Retention

Goal: make players want to continue.

Features:

- city milestones;
- unlocks;
- tutorial objectives;
- first scenario;
- achievements;
- city rating;
- better feedback and rewards.

Exit criteria:

- first 15-30 minutes have a clear arc;
- player always has a next goal;
- unlocks meaningfully change strategy.

## Phase 4 - Depth Systems

Goal: add strategic complexity.

Candidate features:

- pollution;
- land value;
- education;
- health;
- fire/police;
- parks;
- traffic;
- public transport;
- districts;
- policies.

Exit criteria:

- systems create meaningful tradeoffs;
- city layout matters;
- different strategies are viable.

## Phase 5 - Content and Polish

Goal: improve replayability and presentation.

Candidate features:

- more building models;
- scenario variants;
- events;
- disasters;
- audio;
- animations;
- improved UI;
- visual overlays;
- save slots;
- settings;
- performance optimization.

Exit criteria:

- game feels coherent and polished;
- performance remains acceptable;
- players can replay with different goals.
