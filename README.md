# City Builder Game

A browser-based 3D city builder inspired by games like Cities: Skylines and SimCity, built with Three.js and designed with a strong focus on simulation, progression, and player retention.

The goal is not to clone a full AAA city builder at first. The goal is to create a focused, fun, browser-native city builder where players can grow a small town into a living city by managing roads, zoning, services, economy, happiness, and expansion.

## Current Status

Documentation and planning phase.

No production game code should be implemented until the initial scope, core gameplay loop, and technical architecture are clear.

## Product Vision

Players start with empty land and limited money. They build roads, zone areas, provide services, manage a budget, solve city problems, unlock new tools, and grow a small settlement into a thriving city.

The game should make players feel:

- "I built this."
- "I understand what went wrong."
- "I know what I want to fix next."
- "Just one more milestone."

## Recommended Tech Stack

Initial proposal:

- TypeScript
- Three.js
- Vite
- React for UI
- Zustand or another lightweight state store
- Vitest for simulation/unit tests
- Playwright later for end-to-end tests
- IndexedDB or localStorage for local saves

The simulation should be independent from Three.js rendering.

## Documentation Index

Start here:

1. `AGENTS.md` - Codex instructions and development rules.
2. `docs/00_GAME_VISION.md` - North star for the game.
3. `docs/01_GAME_DESIGN_DOCUMENT.md` - Main game design document.
4. `docs/02_CORE_GAMEPLAY_LOOP.md` - Core loop and player motivation.
5. `docs/03_GAMIFICATION_AND_RETENTION.md` - Hook, progression, goals, rewards.
6. `docs/04_SIMULATION_SYSTEMS.md` - Simulation model.
7. `docs/13_TECHNICAL_ARCHITECTURE.md` - Engineering architecture.
8. `docs/18_BACKLOG.md` - Prioritized backlog.
9. `docs/23_TASK_00_SCAFFOLDING.md` - First implementation task.

## First Implementation Target

The first vertical slice should be:

- 64x64 grid map
- Three.js camera with pan/zoom/orbit controls
- tile hover and selection
- road placement
- residential/commercial/industrial zone painting
- simple auto-growing buildings
- money, population, demand, and happiness
- first guided scenario: reach 1,000 population without bankruptcy

## Development Principle

Build the game in this order:

1. Game design and loop.
2. Core technical architecture.
3. Tiny playable prototype.
4. Initial simulation.
5. Progression and retention.
6. Content and polish.

Do not start with advanced traffic, disasters, multiplayer, realistic assets, or large-scale terrain editing.
