# Core Gameplay Loop

## Main Loop

```txt
Build -> Simulate -> Diagnose -> Fix -> Grow -> Unlock -> Repeat
```

The game should constantly pull the player into this loop.

## Loop Breakdown

### 1. Build

The player places:

- roads;
- zones;
- infrastructure;
- services;
- decorations.

The act of building must feel responsive and satisfying.

Requirements:

- grid snapping;
- hover preview;
- cost preview;
- invalid placement feedback;
- immediate visual result;
- undo/remove support.

### 2. Simulate

After building, the city reacts.

Examples:

- houses grow on residential zones;
- shops appear near residents;
- factories create jobs;
- money changes;
- demand shifts;
- warnings appear;
- happiness changes.

Simulation should be understandable, not random.

### 3. Diagnose

The player notices an issue or opportunity.

Feedback sources:

- city stats;
- warnings;
- overlays;
- demand bars;
- inspector panel;
- objective panel;
- visible city changes.

The player should understand:

- what happened;
- why it happened;
- what can be done.

### 4. Fix

The player takes corrective action.

Examples:

- add power;
- lower taxes;
- build park;
- add jobs;
- connect road;
- expand housing;
- remove pollution from residential areas.

### 5. Grow

The city improves.

Rewards:

- population increase;
- better buildings;
- more income;
- improved happiness;
- visual expansion;
- new milestones.

### 6. Unlock

The player receives new tools.

Unlocks should create new decisions, not just more objects.

Examples:

- parks introduce land value/happiness strategy;
- clinics introduce health coverage;
- schools introduce education and better commercial/office growth;
- public transport introduces traffic strategy.

## Short-Term Goals

The player should always have something achievable soon.

Examples:

- reach 100 population;
- connect all buildings to power;
- remove no-road warnings;
- build first commercial zone;
- reach positive monthly income;
- increase happiness above 70%.

## Medium-Term Goals

Examples:

- unlock clinic;
- build balanced neighborhoods;
- reduce pollution;
- reach 1,000 population;
- maintain budget surplus.

## Long-Term Goals

Examples:

- create a high-value city center;
- build dense districts;
- optimize traffic;
- specialize economy;
- complete scenarios;
- unlock landmarks.

## "One More Step" Design

The player should frequently think:

- "I just need more houses."
- "Now I need jobs."
- "Now I need services."
- "Now I need more money."
- "Now I unlocked something useful."
- "Now I can expand again."

This chain is the heart of retention.

## Loop Timing

Early game feedback should be fast.

Suggested early pacing:

- first road within 30 seconds;
- first houses within 1 minute;
- first income within 2 minutes;
- first problem within 3-5 minutes;
- first unlock within 5 minutes;
- first meaningful tradeoff within 10 minutes.

## Bad Loop Smells

The loop is weak if:

- player waits with nothing to do;
- city grows without player input;
- problems are unclear;
- every solution is obvious;
- money is never a constraint;
- warnings feel annoying instead of informative;
- unlocks do not change strategy.
