# Codex Workflow

## Purpose

This document defines how to use Codex as a coding agent for the project.

The goal is to make Codex productive without letting it create uncontrolled architecture or scope creep.

## General Workflow

1. Write or update design docs.
2. Create a small task.
3. Give Codex the exact files/docs to follow.
4. Ask for implementation.
5. Ask Codex to run tests/typecheck.
6. Review diff.
7. Commit if acceptable.
8. Update backlog.

## Task Size

Good task size:

- one feature;
- one system;
- one bug fix;
- one refactor;
- one doc update.

Bad task size:

- "build the whole game";
- "make it like Cities: Skylines";
- "add traffic, citizens, economy, and UI";
- "improve everything."

## Example Good Codex Task

```txt
Implement road placement for the MVP.

Read:
- AGENTS.md
- docs/02_MVP_PRD.md
- docs/09_MAP_GRID_AND_TERRAIN.md
- docs/14_TECHNICAL_ARCHITECTURE.md

Scope:
- add grid-based road placement command;
- validate map bounds;
- prevent placing over buildings;
- deduct road cost from economy;
- add unit tests;
- do not implement traffic;
- do not implement zoning;
- update docs only if assumptions change.
```

## Example Bad Codex Task

```txt
Build the city builder.
```

## Required Context for Codex

Every implementation task should specify:

- goal;
- files/docs to read;
- scope;
- non-goals;
- acceptance criteria;
- test requirements.

## Prompt Template

Use `docs/templates/CODEX_TASK_TEMPLATE.md`.

## Review Checklist

Before accepting Codex work:

- Does it match the requested scope?
- Did it modify unrelated files?
- Did it preserve simulation/rendering separation?
- Are tests included?
- Are magic numbers moved into data/config?
- Did it update docs if behavior changed?
- Does the game still run?
- Are naming and types clear?

## Common Failure Modes

Watch for Codex:

- hardcoding balance values in systems;
- importing Three.js into simulation;
- implementing extra features not requested;
- creating duplicate state models;
- skipping tests;
- changing architecture without asking;
- writing overly generic abstractions too early.

## Recommended First Codex Tasks

1. Initialize Vite + TypeScript project.
2. Add Three.js scene and camera.
3. Add grid rendering.
4. Add tile picking and hover.
5. Add simulation state skeleton.
6. Add command system.
7. Implement road placement.
8. Implement zone painting.
9. Implement building growth.
10. Implement economy tick.

## Commit Strategy

Make small commits.

Example:

```txt
Initialize Vite TypeScript app
Add Three.js grid scene
Add simulation state model
Implement road placement command
Add residential zone painting
```
