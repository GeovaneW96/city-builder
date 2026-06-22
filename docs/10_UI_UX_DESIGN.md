# UI and UX Design

Removed unused `isDashboardVisible` and `isDashboardActive` exports (were dead code).

## Purpose

City builders are UI-heavy games.

The UI must help the player understand:

- what is happening;
- why it is happening;
- what they can do next.

## Design Principles

### 1. Always Show the City State

Core stats should always be visible:

- money;
- net monthly cash flow;
- population;
- happiness;
- demand;
- current objective.

### 2. Make Problems Actionable

Bad warning:

> Building unhappy.

Good warning:

> No water. Build a water tower or increase water capacity.

### 3. Reduce Cognitive Load

Early game should reveal systems gradually.

Do not show every advanced stat at the start.

### 4. Use Overlays

Overlays let the player diagnose spatial problems.

Overlays:

- zoning;
- power;
- water;
- happiness;
- pollution;
- service coverage;
- traffic;
- land value.

## Main UI Areas

### Top Bar

Shows:

- money;
- population;
- happiness;
- monthly income;
- city rating, with an on-demand score breakdown and immigration effect;
- date/time;
- speed controls.
- sound on/off control.

### Bottom Toolbar

Build categories:

- roads;
- zones;
- utilities;
- services;
- parks;
- demolish.

### Side Panel

Shows selected tile/building details.

For a building:

- name;
- status;
- residents/jobs;
- happiness impact;
- upkeep;
- warnings;
- actions.

For a tile:

- coordinates;
- zone;
- pollution;
- land value;
- road access.

### Objective Panel

Shows current scenario objectives.

Example:

```txt
Objective: Reach 100 population
Progress: 64 / 100
Reward: Commercial zoning
```

The panel also shows the next population unlock. The build palette keeps unavailable zones and
buildings visible but disabled, with their exact population requirement. Available buildings that
need road access state that placement requirement before the player selects them.

For population objectives, the panel explains the immediate build action. When happiness falls,
it shows the strongest active penalty and its remedy (for example, a utility shortage and the
specific utility to build). Reaching a population milestone produces a five-second status
notification naming the newly unlocked tool.

Selecting a zoned tile shows whether it can grow. The inspector names a missing adjacent road or
reports the current zone demand, so an empty zone is never a silent failure. The left sidebar
opens the matching service, utility, or park catalog rather than a generic empty menu.

The objective panel has a fixed left-rail allocation and scrolls its own long guidance, so it
never covers build navigation. The default pointer action is inspection; pressing Escape leaves
any build tool and returns to inspecting. Building inspection shows residents or jobs, cost,
upkeep, and service-specific capacity/range. The top bar displays the full simulated calendar
date, year, and hour. It advances independently of Three.js rendering; monthly ticks occur on
the first day at 08:00.

### Demand Bars

Show RCI demand:

- residential;
- commercial;
- industrial.

Demand bars should include tooltips explaining why demand is high/low.

### Warning Feed

A compact alert area for city problems.

Examples:

- 5 buildings have no power.
- Industrial demand is high.
- City is losing money.
- Happiness is falling.

## Build Mode UX

When placing something:

- show ghost preview;
- show cost;
- show valid/invalid state;
- show footprint;
- allow cancel;
- allow rotate for buildings;
- drag placement for roads/zones;
- do not spend money until placement is committed.
- commit a drag placement on pointer release; Escape cancels its preview without spending money.

## Camera UX

Controls should feel like city-builder controls.

Desktop:

- mouse wheel: zoom;
- middle/right drag: pan/rotate depending on chosen style;
- left click: select/place;
- escape: cancel build mode;
- space: pause;
- number keys: speed.

## Tutorial UX

Tutorial should be objective-based, not intrusive.

Bad:

- long modal explanations;
- blocking the player constantly.

Good:

- small objective cards;
- contextual hints;
- highlight relevant toolbar button;
- explain warnings when first encountered.

## Accessibility

Consider:

- readable font sizes;
- colorblind-safe warning icons;
- icons plus text;
- keyboard shortcuts;
- reduced motion setting;
- scalable UI.

## Foundation Audio Control

The top bar includes a text-labelled sound toggle with an `aria-pressed` state. It disables
all generated action, warning, and milestone sound effects without changing simulation state.

## Economy Loan Controls

The economy panel lists active loans with remaining months and fixed payment, and exposes
small, medium, and large borrowing controls when the city meets simulation eligibility. The
controls dispatch `TAKE_LOAN` commands; they never mutate economy state directly. Ineligible
options are disabled, and the inspector reports approval or validation feedback.
