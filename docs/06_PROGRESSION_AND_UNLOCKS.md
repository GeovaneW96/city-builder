# Progression and Unlocks

## Purpose

This document defines how the player unlocks new systems and content.

Progression should create a sense of growth and prevent the player from being overwhelmed early.

## Milestones

| Population | City Stage      | Unlocks                                  |
| ---------: | --------------- | ---------------------------------------- |
|          0 | Settlement Site | Dirt road, residential zoning, city hall |
|         50 | Hamlet          | Commercial zoning                        |
|        100 | Village         | Industrial zoning, landfill              |
|        250 | Small Town      | Park, clinic                             |
|        500 | Growing Town    | School                                   |
|        750 | Local Center    | Expansion bonus                          |
|      1,000 | First City      | Scenario victory                         |

## Unlock Design Rules

A good unlock should:

- solve a problem the player has recently encountered;
- introduce a new tradeoff;
- create visible change;
- support the next stage of growth.

Example:

- Before clinic: citizens complain about health.
- Unlock clinic: health improves but upkeep increases.
- New tradeoff: better happiness versus higher monthly cost.

## Milestone Rewards

Each milestone provides:

- new building/tool;
- money bonus;
- objective update;
- city title;
- small celebration animation;
- sound effect.

Suggested bonuses:

| Population |             Bonus |
| ---------: | ----------------: |
|         50 |             2,000 |
|        100 |             3,000 |
|        250 |             5,000 |
|        500 |             7,500 |
|        750 |            10,000 |
|      1,000 | scenario complete |

## Tutorial Objectives

Objectives should align with unlocks.

Example flow:

1. Build power and water utilities, then zone residential.
2. Reach 50 population and zone commercial.
3. Reach 100 population, zone industrial, and build a landfill.
4. Reach 250 population, then build a park and clinic.
5. Reach 500 population, then build a school.
6. Reach 1,000 population.

## Extended Milestones

The milestone table above covers the first scenario. A broader milestone table for post-scenario play:

| Population | Unlock                     |
| ---------: | -------------------------- |
|      2,000 | Police and fire            |
|      3,500 | Medium-density residential |
|      5,000 | Bus system                 |
|      7,500 | District policies          |
|     10,000 | High-density zoning        |
|     15,000 | Train/cargo                |
|     25,000 | Landmarks                  |

Progression uses simple population milestones. Alternative models (research tree, city reputation, mayor level, scenario-specific unlocks, achievement-based unlocks) can be introduced per scenario design.

Coverage warnings for police and fire should remain hidden until those services are unlocked, so the warning feed does not ask the player to build unavailable infrastructure.
