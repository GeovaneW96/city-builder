# Risk Register

## Purpose

This document tracks product, design, technical, and production risks.

## Risk: Scope Explosion

City builders are complex systems games.

Mitigation:

- keep MVP scenario small;
- reject non-goals;
- use backlog sections;
- one system at a time.

## Risk: Beautiful But Not Fun

Three.js visuals may look nice, but the game may lack an engaging loop.

Mitigation:

- implement gameplay loop early;
- test first 15 minutes;
- add objectives and feedback;
- prioritize simulation consequences.

## Risk: Unclear Feedback

Players may not understand why city systems fail.

Mitigation:

- actionable warnings;
- overlays;
- inspector panel;
- demand explanations;
- tutorial objectives.

## Risk: AI-Generated Architecture Drift

Codex may add inconsistent patterns.

Mitigation:

- use AGENTS.md;
- small tasks;
- tests;
- code review checklist;
- strict simulation/rendering separation.

## Risk: Performance Problems

Browser 3D city can become slow.

Mitigation:

- small map;
- instancing;
- avoid one mesh per tile;
- fixed simulation ticks;
- profile early.

## Risk: Bad Economy Balance

If economy is too easy, game is boring. If too hard, it frustrates.

Mitigation:

- start forgiving;
- playtest;
- centralize balance values;
- track time to bankruptcy and time to win.

## Risk: Player Has No Goal

Sandbox alone may feel empty.

Mitigation:

- first scenario;
- milestones;
- objectives;
- unlocks;
- achievements later.

## Risk: Overcomplicated Traffic

Traffic can consume development time.

Mitigation:

- abstract congestion first;
- delay pathfinding;
- no individual cars in MVP.
