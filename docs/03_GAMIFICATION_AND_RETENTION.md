# Gamification and Retention

## Purpose

This document defines how the game keeps players engaged.

A city builder should create the feeling of:

> "My city is almost working. I just need to fix one more thing."

## Retention Pillars

### 1. Milestones

Milestones provide clear progress.

Examples:

| Population | Milestone    | Reward            |
| ---------: | ------------ | ----------------- |
|         50 | Hamlet       | Commercial zoning |
|        100 | Village      | Industrial zoning |
|        250 | Small Town   | Park              |
|        500 | Growing Town | Clinic            |
|        750 | Local Center | School            |
|      1,000 | First City   | Scenario complete |

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

Objectives guide the player.

Early objectives:

1. Place a road.
2. Zone residential.
3. Wait for houses.
4. Add power.
5. Reach 100 population.
6. Add commercial.
7. Reach positive income.
8. Build a park.
9. Reach 1,000 population.

Objectives should be:

- clear;
- short;
- visible;
- rewarding;
- skippable.

### 4. Achievements

Achievements are optional goals fully defined in `32_CITY_RATING_AND_ACHIEVEMENTS.md`.

Initial achievements: First Steps, No Debt, Green Start, Happy Town, Efficient Planner, Balanced Economy, City Planner, Road Builder.

### 5. City Rating

A city rating summarizes performance as a letter grade (A–F), defined in `32_CITY_RATING_AND_ACHIEVEMENTS.md`.

Categories (weighted): Economy (30%), Happiness (25%), Services (20%), Environment (15%), Growth (10%).

The rating affects citizen immigration rate (A = +10%, F = −20%).

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

### Minute 0-2

Player learns camera and places first road.

Reward:

- road appears instantly;
- objective completes.

### Minute 2-5

Player zones housing.

Reward:

- houses grow;
- population increases;
- first tax income appears.

### Minute 5-10

Player unlocks commerce/industry.

Problem:

- residents need jobs and shops.

Reward:

- economy starts working.

### Minute 10-20

Player faces services and budget.

Problem:

- happiness drops if services are missing.

Reward:

- parks/clinic/school improve city.

### Minute 20-30

Player optimizes to reach 1,000 population.

Problem:

- growth requires balance.

Reward:

- scenario victory.

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

The game should not be designed around predatory retention.

Avoid:

- energy systems;
- forced waiting;
- pay-to-win;
- aggressive ads.

Monetization options considered:

- premium version;
- cosmetic packs;
- scenario packs;
- supporter edition;
- paid expansion systems.

Monetization is not in initial scope.
