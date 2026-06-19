# Project Planning

This document defines the implementation phases for the city builder. It is the single source of truth for what is included in each phase. Game design docs describe the full game — this doc maps when each piece is built.

## Phase 1: Foundation

**Goal:** Player can reach 1,000 population in the first scenario without bankruptcy.

### Features

- Project scaffolding (Vite, TypeScript, Three.js, React, Zustand, Vitest)
- Shared types and event bus
- 64x64 flat grid map
- Road placement with drag support and cost
- Zone painting (residential, commercial, industrial)
- Zone-grown building spawning (small house, small shop, small factory)
- Manual building placement (city hall, power plant, water tower, park, clinic, school)
- Economy system (tax income, upkeep, milestone rewards, bankruptcy)
- RCI demand system
- Population system (capacity, employment, growth)
- Happiness system (city-level with component modifiers)
- Services (power, water, health, education) — capacity-based and radius-based
- Pollution system (industrial pollution with radius falloff)
- Warnings system (no road, no power, no workers, low happiness, etc.)
- Progression milestones (50 to 1,000 population with unlocks)
- Save/load (localStorage, versioning, migrations)
- First scenario ("Reach 1,000 population")
- Tutorial objectives
- Camera (pan, zoom, pitch, constrained bounds)
- Grid rendering, building/road visualization with Three.js
- HUD (money, population, date, demand bars)
- Build mode (hover preview, valid/invalid feedback, cost preview)
- Placement preview ghost
- Zoning/pollution/service coverage overlays
- Audio feedback (placement, construction, warning, milestone sounds)

### Tests

- Road placement validation
- Zone painting
- Building growth rules
- Economy tick
- Demand calculation
- Service coverage
- Progression unlocks
- Save/load round-trip
- Bankruptcy condition
- Happiness calculation

## Phase 2: Services & Depth

**Goal:** Full service city simulation with deeper city management.

### Features

- Land value system
- Building upgrades (density tiers based on land value, happiness, services, education)
- Neighborhood-level happiness breakdown
- Road capacity and congestion
- Abstract traffic model
- Commercial goods demand
- Debt and loans
- Police and fire services
- Garbage service
- Public transport (bus system)
- District policies
- City rating
- Achievements
- Export/import save files
- Multiple save slots
- Debug tools (FPS counter, draw calls, simulation tick time)
- E2E tests with Playwright

## Phase 3: Complexity

**Goal:** Advanced city systems with meaningful tradeoffs and optimization.

### Features

- Agent-based traffic with pathfinding
- Road hierarchy (arterial, collector, local)
- Traffic lights and intersections
- Education tiers (elementary, high school, university)
- Healthcare tiers (clinic, hospital, medical center)
- Medium-density and high-density zoning
- Office zones
- Tourism and landmarks
- City specialization mechanics
- Events and disasters
- Scenario editor

## Phase 4: Expansion

**Goal:** Extended content and replayability.

### Features

- Larger maps (beyond 64x64)
- Terrain editing and elevation
- Water bodies, rivers, coastlines
- Resource deposits (ore, oil, fertile land)
- Different biomes
- Mod support
- Shareable city snapshots
- Scenario leaderboard
- Cosmetic packs and content packs
- Premium version / supporter edition
