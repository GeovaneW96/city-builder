# Gamification and Retention

## Purpose

This document defines how the game keeps players engaged.

A city builder should create the feeling of:

> "My city is almost working. I just need to fix one more thing."

## Retention Pillars

### 1. Milestones

Milestones provide clear progress. See `06_PROGRESSION_AND_UNLOCKS.md` for the full milestone table.

Milestones should be celebrated with:

- sound;
- UI animation;
- unlock panel;
- money bonus;
- visible city hall upgrade.

### 2. Unlocks

Unlocks should expand strategy.

Good unlock:

- creates new tradeoffs;
- solves old problems;
- introduces new problems;
- changes city layout decisions.

Bad unlock:

- purely cosmetic;
- obvious upgrade with no downside;
- too late to matter.

### 3. Objectives

Objectives guide the player. The first scenario objective sequence is defined in `22_SCENARIOS.md`.

Objectives should be:

- clear;
- short;
- visible;
- rewarding;
- skippable.

### 4. Achievements

Achievements are optional goals fully defined in `32_CITY_RATING_AND_ACHIEVEMENTS.md`.

### 5. City Rating

A city rating summarizes performance as a letter grade (A–F). Weights, modifiers, and immigration effects are defined in `32_CITY_RATING_AND_ACHIEVEMENTS.md`.

### 6. Visual Rewards

Players should see progress.

Examples:

- building upgrades;
- denser neighborhoods;
- busier roads;
- improved city hall;
- brighter commercial streets;
- parks with people;
- cleaner areas;
- skyline growth.

### 7. Soft Pressure

The game should create pressure without feeling unfair.

Pressure sources:

- limited money;
- upkeep;
- rising service demands;
- unemployment;
- pollution;
- traffic;
- unhappy citizens.

Pressure must be readable and solvable.

## First 30 Minutes

Pacing guidance is defined in `02_CORE_GAMEPLAY_LOOP.md` (Loop Timing section). The first scenario objective sequence in `22_SCENARIOS.md` drives the early experience.

## Hook Formula

Each milestone should follow:

```txt
Need -> Build -> Result -> Problem -> Tool -> Bigger Need
```

Example:

```txt
Need residents.
Build homes.
Population grows.
Need jobs.
Unlock commercial/industrial.
Jobs grow.
Need services.
Unlock clinic/park.
Happiness rises.
Need more money.
Optimize taxes and growth.
```

## Monetization Compatibility

See `19_MONETIZATION_AND_ANALYTICS.md` for monetization plans and principles.
