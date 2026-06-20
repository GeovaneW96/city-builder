# Master Feature List

This document lists every feature across all four implementation phases. Under each feature, every piece of logic that must have unit tests is enumerated. Cross-references to design docs are provided.

> **Values and formulas are authoritative in the referenced design docs.** This document summarizes testable logic — if numbers in this list differ from the source doc, the source doc wins.

---

## Phase 1: Foundation

**Goal:** Player can reach 1,000 population in the first scenario without bankruptcy.

### 1.1 Project Scaffolding

**Docs:** `13_TECHNICAL_ARCHITECTURE.md`, `AGENTS.md`

| #     | Testable Logic                                      | Status |
| ----- | --------------------------------------------------- | ------ |
| 1.1.1 | TypeScript compilation succeeds without errors      |        |
| 1.1.2 | Vite dev server starts and serves the app           |        |
| 1.1.3 | ESLint passes with no errors                        |        |
| 1.1.4 | Prettier formatting check passes                    |        |
| 1.1.5 | Dependency-cruiser detects simulation→three imports |        |
| 1.1.6 | Vitest runs and discovers all test files            |        |
| 1.1.7 | Husky commit hook enforces lint-staged              |        |
| 1.1.8 | Commitlint rejects non-conventional commit messages |        |

### 1.2 Shared Types and Event Bus

**Docs:** `13_TECHNICAL_ARCHITECTURE.md`, `src/shared/types.ts`, `src/shared/event-bus.ts`

| #     | Testable Logic                                                                                      | Status |
| ----- | --------------------------------------------------------------------------------------------------- | ------ |
| 1.2.1 | Event bus subscribes and receives emitted events                                                    |        |
| 1.2.2 | Event bus `unsubscribe` stops receiving events                                                      |        |
| 1.2.3 | Event bus supports multiple subscribers per event                                                   |        |
| 1.2.4 | Event bus emits correct event types (TileChanged, RoadPlaced, etc.)                                 |        |
| 1.2.5 | CityState default values match `05_ECONOMY_AND_BALANCING.md` (starting money, base happiness, etc.) |        |
| 1.2.6 | Tile default state is grass terrain, no road, no zone, no building                                  |        |
| 1.2.7 | GameCommand union accepts all command types                                                         |        |
| 1.2.8 | BuildingDefinition fields serialize as expected                                                     |        |

### 1.3 64×64 Flat Grid Map

**Docs:** `08_MAP_GRID_AND_TERRAIN.md`

| #     | Testable Logic                            | Status |
| ----- | ----------------------------------------- | ------ |
| 1.3.1 | Map initializes as 64×64 tiles            |        |
| 1.3.2 | Every tile starts with terrain = "grass"  |        |
| 1.3.3 | Tile coordinates are valid (0..63, 0..63) |        |
| 1.3.4 | Out-of-bounds access returns error        |        |

### 1.4 Road Placement with Drag Support and Cost

**Docs:** `04_SIMULATION_SYSTEMS.md`, `05_ECONOMY_AND_BALANCING.md`, `07_BUILDINGS_AND_ZONES.md`, `08_MAP_GRID_AND_TERRAIN.md`

| #      | Testable Logic                                            | Status |
| ------ | --------------------------------------------------------- | ------ |
| 1.4.1  | Place road on valid empty tile succeeds                   |        |
| 1.4.2  | Place road outside map bounds fails                       |        |
| 1.4.3  | Place road on existing building tile fails                |        |
| 1.4.4  | Place road deducts correct cost from money                |        |
| 1.4.5  | Place road with insufficient money fails                  |        |
| 1.4.6  | Road tile connects orthogonally to neighboring road tiles |        |
| 1.4.7  | Remove road clears roadId and refunds nothing             |        |
| 1.4.8  | Drag-placing multiple roads places each tile individually |        |
| 1.4.9  | Road type (dirt vs paved) stored correctly                |        |
| 1.4.10 | Road network treated as connected graph                   |        |

### 1.5 Zone Painting (Residential, Commercial, Industrial)

**Docs:** `04_SIMULATION_SYSTEMS.md`, `07_BUILDINGS_AND_ZONES.md`

| #     | Testable Logic                                                 | Status |
| ----- | -------------------------------------------------------------- | ------ |
| 1.5.1 | Paint residential zone on empty tile succeeds                  |        |
| 1.5.2 | Paint zone on existing road tile fails                         |        |
| 1.5.3 | Paint zone on existing building tile fails                     |        |
| 1.5.4 | Remove zone clears zone type                                   |        |
| 1.5.5 | Drag-painting multiple zone tiles sets each tile               |        |
| 1.5.6 | Zone type (residential/commercial/industrial) stored correctly |        |
| 1.5.7 | Painting zone does not cost money (cost = 0)                   |        |

### 1.6 Zone-Grown Building Spawning

**Docs:** `04_SIMULATION_SYSTEMS.md`, `07_BUILDINGS_AND_ZONES.md`

| #      | Testable Logic                                                  | Status |
| ------ | --------------------------------------------------------------- | ------ |
| 1.6.1  | Building spawns on valid empty zoned tile with road access      |        |
| 1.6.2  | Building does not spawn without road access                     |        |
| 1.6.3  | Building does not spawn if demand for that zone type is too low |        |
| 1.6.4  | Building spawns with status "constructing"                      |        |
| 1.6.5  | Building transitions to "active" after 1 tick                   |        |
| 1.6.6  | Max 3 buildings per zone type spawn per tick                    |        |
| 1.6.7  | Cooldown of 3 ticks before building can be replaced             |        |
| 1.6.8  | Correct building definition chosen for zone type                |        |
| 1.6.9  | Building footprint occupies correct tiles                       |        |
| 1.6.10 | No spawn on first tick (suppressed)                             |        |

### 1.7 Manual Building Placement

**Docs:** `07_BUILDINGS_AND_ZONES.md`, `05_ECONOMY_AND_BALANCING.md`

| #      | Testable Logic                                           | Status |
| ------ | -------------------------------------------------------- | ------ |
| 1.7.1  | Place manual building on valid empty tiles succeeds      |        |
| 1.7.2  | Place building outside map bounds fails                  |        |
| 1.7.3  | Place building overlapping another building fails        |        |
| 1.7.4  | Place building on road tile fails                        |        |
| 1.7.5  | Deducts correct construction cost from money             |        |
| 1.7.6  | Insufficient money fails                                 |        |
| 1.7.7  | Building requiring road access fails if no adjacent road |        |
| 1.7.8  | Building requiring unlock fails if milestone not reached |        |
| 1.7.9  | Building rotation (0/90/180/270) stored correctly        |        |
| 1.7.10 | Demolish building removes it and frees tiles             |        |
| 1.7.11 | Demolish on empty tile fails                             |        |

### 1.8 Economy System

**Docs:** `04_SIMULATION_SYSTEMS.md`, `05_ECONOMY_AND_BALANCING.md`

| #      | Testable Logic                                                            | Status |
| ------ | ------------------------------------------------------------------------- | ------ |
| 1.8.1  | Residential tax income computed per `05_ECONOMY_AND_BALANCING.md` formula |        |
| 1.8.2  | Commercial tax income computed per `05_ECONOMY_AND_BALANCING.md` formula  |        |
| 1.8.3  | Industrial tax income computed per `05_ECONOMY_AND_BALANCING.md` formula  |        |
| 1.8.4  | Monthly expenses = sum of all building upkeep + road upkeep               |        |
| 1.8.5  | Money updates by income − expenses each tick                              |        |
| 1.8.6  | Bankruptcy warning appears when money below 0                             |        |
| 1.8.7  | `monthsBelowZero` increments when money below 0                           |        |
| 1.8.8  | `monthsBelowZero` resets to 0 when money returns to ≥ 0                   |        |
| 1.8.9  | Bankruptcy declared after 5 consecutive months below zero                 |        |
| 1.8.10 | Milestone rewards add to money exactly once                               |        |
| 1.8.11 | Set tax rate updates stored rate for correct category                     |        |
| 1.8.12 | Tax rate clamped to valid range                                           |        |

### 1.9 RCI Demand System

**Docs:** `04_SIMULATION_SYSTEMS.md`, `05_ECONOMY_AND_BALANCING.md`

| #      | Testable Logic                                                            | Status |
| ------ | ------------------------------------------------------------------------- | ------ |
| 1.9.1  | Residential demand starts at base value per `05_ECONOMY_AND_BALANCING.md` |        |
| 1.9.2  | Residential demand increases with available jobs                          |        |
| 1.9.3  | Residential demand decreases with unemployment                            |        |
| 1.9.4  | Residential demand decreases with excess housing capacity                 |        |
| 1.9.5  | Commercial demand starts at base value per `05_ECONOMY_AND_BALANCING.md`  |        |
| 1.9.6  | Commercial demand increases with population                               |        |
| 1.9.7  | Commercial demand decreases with excess commercial capacity               |        |
| 1.9.8  | Commercial demand penalized by worker shortage                            |        |
| 1.9.9  | Industrial demand starts at base value per `05_ECONOMY_AND_BALANCING.md`  |        |
| 1.9.10 | Industrial demand increases with unemployment                             |        |
| 1.9.11 | Industrial demand decreases with excess industrial capacity               |        |
| 1.9.12 | Industrial demand penalized by pollution                                  |        |
| 1.9.13 | All demand values clamped between 0 and 100                               |        |
| 1.9.14 | Demand recomputed every tick                                              |        |

### 1.10 Population System

**Docs:** `04_SIMULATION_SYSTEMS.md`

| #      | Testable Logic                                                           | Status |
| ------ | ------------------------------------------------------------------------ | ------ |
| 1.10.1 | Population starts at 0                                                   |        |
| 1.10.2 | Population = sum of all active residential capacity                      |        |
| 1.10.3 | Residential capacity = sum of all active residential building capacities |        |
| 1.10.4 | Employed workers = min(jobs filled, population willing to work)          |        |
| 1.10.5 | Unemployed = total population − employed workers                         |        |
| 1.10.6 | Population grows toward capacity based on demand/happiness               |        |

### 1.11 Happiness System

**Docs:** `04_SIMULATION_SYSTEMS.md`, `05_ECONOMY_AND_BALANCING.md`

| #       | Testable Logic                                                   | Status |
| ------- | ---------------------------------------------------------------- | ------ |
| 1.11.1  | Happiness starts at base value per `05_ECONOMY_AND_BALANCING.md` |        |
| 1.11.2  | Tax happiness modifier applied correctly per rate bracket        |        |
| 1.11.3  | Unemployment happiness penalty applied                           |        |
| 1.11.4  | Service coverage happiness bonus applied                         |        |
| 1.11.5  | Pollution happiness penalty applied                              |        |
| 1.11.6  | Park happiness bonus applied                                     |        |
| 1.11.7  | Utility (power/water) penalty applied                            |        |
| 1.11.8  | Final happiness clamped between 0 and 100                        |        |
| 1.11.9  | Component breakdown stored in state                              |        |
| 1.11.10 | Happiness recomputed every tick                                  |        |

### 1.12 Services (Power, Water, Health, Education)

**Docs:** `04_SIMULATION_SYSTEMS.md`, `07_BUILDINGS_AND_ZONES.md`

| #      | Testable Logic                                                 | Status |
| ------ | -------------------------------------------------------------- | ------ |
| 1.12.1 | Power plant adds capacity to powerCapacity                     |        |
| 1.12.2 | Water tower adds capacity to waterCapacity                     |        |
| 1.12.3 | Power demand = sum of power-requiring buildings                |        |
| 1.12.4 | Water demand = sum of water-requiring buildings                |        |
| 1.12.5 | Power shortage warning when demand > capacity                  |        |
| 1.12.6 | Health coverage radius from clinic affects nearby buildings    |        |
| 1.12.7 | Education coverage radius from school affects nearby buildings |        |
| 1.12.8 | Service coverage computed as percentage                        |        |

### 1.13 Pollution System

**Docs:** `04_SIMULATION_SYSTEMS.md`

| #      | Testable Logic                                              | Status |
| ------ | ----------------------------------------------------------- | ------ |
| 1.13.1 | Industrial building adds pollution at its location          |        |
| 1.13.2 | Pollution decays with distance (radius falloff)             |        |
| 1.13.3 | Pollution clamped between 0 and 100                         |        |
| 1.13.4 | Pollution affects happiness of nearby residential buildings |        |
| 1.13.5 | Pollution reduces land value                                |        |

### 1.14 Warnings System

**Docs:** `04_SIMULATION_SYSTEMS.md`

| #       | Testable Logic                                                          | Status |
| ------- | ----------------------------------------------------------------------- | ------ |
| 1.14.1  | No road access warning on building without adjacent road                |        |
| 1.14.2  | No power warning when building without power and grid has shortage      |        |
| 1.14.3  | No workers warning when commercial/industrial building unfilled         |        |
| 1.14.4  | Low happiness warning when city happiness < threshold                   |        |
| 1.14.5  | High pollution warning when tile pollution > threshold                  |        |
| 1.14.6  | Abandoned building warning triggered after 12 ticks of unresolved issue |        |
| 1.14.7  | City losing money warning when monthly income < expenses                |        |
| 1.14.8  | Warning has severity, message, target, suggested fix                    |        |
| 1.14.9  | Warnings cleared when condition resolves                                |        |
| 1.14.10 | Warnings rebuilt every tick                                             |        |

### 1.15 Progression Milestones

**Docs:** `06_PROGRESSION_AND_UNLOCKS.md`

| #       | Testable Logic                                                                                             | Status |
| ------- | ---------------------------------------------------------------------------------------------------------- | ------ |
| 1.15.1  | Milestone at population 0 (Settlement Site) grants road + residential + city hall                          |        |
| 1.15.2  | Milestone at population 50 (Hamlet) grants commercial zoning + bonus per `06_PROGRESSION_AND_UNLOCKS.md`   |        |
| 1.15.3  | Milestone at population 100 (Village) grants industrial zoning + bonus per `06_PROGRESSION_AND_UNLOCKS.md` |        |
| 1.15.4  | Milestone at population 250 (Small Town) grants park + bonus per `06_PROGRESSION_AND_UNLOCKS.md`           |        |
| 1.15.5  | Milestone at population 500 (Growing Town) grants clinic + bonus per `06_PROGRESSION_AND_UNLOCKS.md`       |        |
| 1.15.6  | Milestone at population 750 (Local Center) grants school + bonus per `06_PROGRESSION_AND_UNLOCKS.md`       |        |
| 1.15.7  | Milestone at population 1000 (First City) completes scenario                                               |        |
| 1.15.8  | Milestone reward applied exactly once                                                                      |        |
| 1.15.9  | Milestone checked every tick                                                                               |        |
| 1.15.10 | Unlocked features persist in progression state                                                             |        |

### 1.16 Save/Load

**Docs:** `15_DATA_MODEL_AND_SAVE_SYSTEM.md`

| #      | Testable Logic                                      | Status |
| ------ | --------------------------------------------------- | ------ |
| 1.16.1 | CityState serializes to JSON without errors         |        |
| 1.16.2 | Deserialized state matches original values          |        |
| 1.16.3 | Simulation tick runs on loaded state without errors |        |
| 1.16.4 | Save data includes version number                   |        |
| 1.16.5 | Migration function handles version 1 format         |        |
| 1.16.6 | Load with missing version rejects gracefully        |        |
| 1.16.7 | Save excludes rendering state                       |        |

### 1.17 First Scenario

**Docs:** `22_SCENARIOS.md`

| #      | Testable Logic                                                                                                                                   | Status |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1.17.1 | Scenario starts with correct initial state (money per `05_ECONOMY_AND_BALANCING.md`, empty map)                                                  |        |
| 1.17.2 | Win condition checked: population ≥ 1000 per `06_PROGRESSION_AND_UNLOCKS.md`, money ≥ 0, happiness ≥ threshold per `05_ECONOMY_AND_BALANCING.md` |        |
| 1.17.3 | Loss condition checked: monthsBelowZero ≥ 5                                                                                                      |        |
| 1.17.4 | Scenario win triggers SCENARIO_WIN event                                                                                                         |        |
| 1.17.5 | Scenario loss triggers SCENARIO_LOSE event                                                                                                       |        |
| 1.17.6 | Objectives update as conditions are met                                                                                                          |        |

### 1.18 Tutorial Objectives

**Docs:** `22_SCENARIOS.md`, `03_GAMIFICATION_AND_RETENTION.md`, `10_UI_UX_DESIGN.md`

| #      | Testable Logic                                                        | Status |
| ------ | --------------------------------------------------------------------- | ------ |
| 1.18.1 | Place road objective completes when road placed                       |        |
| 1.18.2 | Paint zone objective completes when correct zone type painted         |        |
| 1.18.3 | Reach population objective completes at threshold                     |        |
| 1.18.4 | Build building objective completes when building of correct id placed |        |
| 1.18.5 | Objectives advance linearly through sequence                          |        |

### 1.19 Camera (Pan, Zoom, Pitch, Bounded)

**Docs:** `14_THREEJS_RENDERING_GUIDE.md`, `08_MAP_GRID_AND_TERRAIN.md`

| #      | Testable Logic                    | Status |
| ------ | --------------------------------- | ------ |
| 1.19.1 | Camera pan bounded to map extents |        |
| 1.19.2 | Camera zoom clamped to min/max    |        |
| 1.19.3 | Camera pitch clamped to min/max   |        |

### 1.20 Grid Rendering and Building/Road Visualization

**Docs:** `14_THREEJS_RENDERING_GUIDE.md`

| #      | Testable Logic                                             | Status |
| ------ | ---------------------------------------------------------- | ------ |
| 1.20.1 | Grid rendered with correct dimensions                      | done   |
| 1.20.2 | Road mesh created/removed when road placed/removed         | done   |
| 1.20.3 | Building mesh created/removed when building placed/removed | done   |
| 1.20.4 | Mesh update on building status change                      | done   |
| 1.20.5 | Instanced meshes used for repeated building types          | done   |

### 1.21 HUD (Money, Population, Date, Demand Bars)

**Docs:** `10_UI_UX_DESIGN.md`

| #      | Testable Logic                                   | Status |
| ------ | ------------------------------------------------ | ------ |
| 1.21.1 | HUD displays current money from simulation state |        |
| 1.21.2 | HUD displays current population                  |        |
| 1.21.3 | HUD displays current in-game date/month/year     |        |
| 1.21.4 | HUD displays RCI demand bars                     |        |
| 1.21.5 | HUD updates when simulation state changes        |        |

### 1.22 Build Mode (Hover, Valid/Invalid Feedback, Cost Preview)

**Docs:** `10_UI_UX_DESIGN.md`, `14_THREEJS_RENDERING_GUIDE.md`

| #      | Testable Logic                             | Status |
| ------ | ------------------------------------------ | ------ |
| 1.22.1 | Hovered tile updates from mouse position   |        |
| 1.22.2 | Invalid placement shows visual feedback    |        |
| 1.22.3 | Valid placement shows visual feedback      |        |
| 1.22.4 | Cost preview shown in UI during build mode |        |
| 1.22.5 | Selected tile persists until deselected    |        |

### 1.23 Placement Preview Ghost

**Docs:** `10_UI_UX_DESIGN.md`, `14_THREEJS_RENDERING_GUIDE.md`

| #      | Testable Logic                                    | Status |
| ------ | ------------------------------------------------- | ------ |
| 1.23.1 | Ghost preview appears at cursor during build mode |        |
| 1.23.2 | Ghost preview shows footprint of building         |        |
| 1.23.3 | Ghost preview color indicates valid/invalid state |        |
| 1.23.4 | Ghost preview removed when build mode exits       |        |

### 1.24 Zoning/Pollution/Service Coverage Overlays

**Docs:** `10_UI_UX_DESIGN.md`, `14_THREEJS_RENDERING_GUIDE.md`

| #      | Testable Logic                                         | Status |
| ------ | ------------------------------------------------------ | ------ |
| 1.24.1 | Zoning overlay colors tiles by zone type               | done   |
| 1.24.2 | Pollution overlay shows pollution levels               | done   |
| 1.24.3 | Service coverage overlay shows health/education radius | done   |
| 1.24.4 | Only one overlay active at a time                      | done   |

### 1.25 Audio Feedback

**Docs:** `12_AUDIO_DESIGN.md`

| #      | Testable Logic                               | Status |
| ------ | -------------------------------------------- | ------ |
| 1.25.1 | Placement sound plays on successful build    | done   |
| 1.25.2 | Warning sound plays on new warning           | done   |
| 1.25.3 | Milestone sound plays on milestone reached   | done   |
| 1.25.4 | Insufficient funds sound on failed placement | done   |
| 1.25.5 | Audio can be muted in settings               | done   |

---

## Phase 2: Services & Depth

**Goal:** Full service city simulation with deeper city management.

### 2.1 Land Value System

**Docs:** `23_LAND_VALUE_SYSTEM.md`

| #     | Testable Logic                                                 | Status |
| ----- | -------------------------------------------------------------- | ------ |
| 2.1.1 | Land value initialized to 50 (default) per tile                | done   |
| 2.1.2 | Park presence increases nearby land value                      | done   |
| 2.1.3 | Pollution decreases nearby land value                          | done   |
| 2.1.4 | Service coverage (health, education) increases land value      | done   |
| 2.1.5 | Road access increases land value                               | done   |
| 2.1.6 | Land value decays with distance from positive/negative sources | done   |
| 2.1.7 | Land value clamped between 0 and 100                           | done   |
| 2.1.8 | Land value affects building upgrade eligibility                |        |
| 2.1.9 | Land value affects commercial/industrial productivity          |        |

### 2.2 Building Upgrades (Density Tiers)

**Docs:** `24_BUILDING_UPGRADES.md`

| #     | Testable Logic                                                           | Status |
| ----- | ------------------------------------------------------------------------ | ------ |
| 2.2.1 | Building upgrades from low to medium density when conditions met         | done   |
| 2.2.2 | Building upgrades from medium to high density when conditions met        | done   |
| 2.2.3 | Upgrade conditions: land value threshold, happiness, services, education | done   |
| 2.2.4 | Upgrade replaces old building definition with new one                    | done   |
| 2.2.5 | Upgrade increases population capacity (residential)                      | done   |
| 2.2.6 | Upgrade increases jobs (commercial/industrial)                           | done   |
| 2.2.7 | Upgrade changes visual asset                                             | done   |
| 2.2.8 | Upgrade has cooldown before next upgrade                                 | done   |
| 2.2.9 | Building cannot upgrade if it has active warnings                        | done   |

### 2.3 Neighborhood-Level Happiness Breakdown

**Docs:** `25_NEIGHBORHOOD_HAPPINESS.md`

| #     | Testable Logic                                                                                  | Status |
| ----- | ----------------------------------------------------------------------------------------------- | ------ |
| 2.3.1 | Map divided into neighborhood regions                                                           | done   |
| 2.3.2 | Each neighborhood has independent happiness value                                               | done   |
| 2.3.3 | Neighborhood happiness calculated from local conditions (local services, local pollution, etc.) | done   |
| 2.3.4 | City-level happiness is weighted average of neighborhoods                                       | done   |
| 2.3.5 | Neighborhood boundaries configurable or auto-assigned                                           | done   |

### 2.4 Road Capacity and Congestion

**Docs:** `26_TRAFFIC_MODEL.md`

| #     | Testable Logic                                         | Status |
| ----- | ------------------------------------------------------ | ------ |
| 2.4.1 | Each road tile has a capacity value                    |        |
| 2.4.2 | Dirt road has lower capacity than paved road           |        |
| 2.4.3 | Traffic demand calculated from population, jobs, trips |        |
| 2.4.4 | Congestion = traffic demand / total road capacity      |        |
| 2.4.5 | Congestion affects happiness                           |        |
| 2.4.6 | Congestion affects commercial/industrial productivity  |        |
| 2.4.7 | Warning shown when congestion exceeds threshold        |        |

### 2.5 Abstract Traffic Model

**Docs:** `26_TRAFFIC_MODEL.md`

| #     | Testable Logic                                    | Status |
| ----- | ------------------------------------------------- | ------ |
| 2.5.1 | Traffic demand sources computed per building type |        |
| 2.5.2 | Commute trips from residential buildings          |        |
| 2.5.3 | Customer trips to commercial buildings            |        |
| 2.5.4 | Cargo trips from industrial buildings             |        |
| 2.5.5 | Service trips from service buildings              |        |
| 2.5.6 | Disconnected buildings produce zero trips         |        |

### 2.6 Commercial Goods Demand

**Docs:** `27_COMMERCIAL_GOODS_DEMAND.md`

| #     | Testable Logic                                            | Status |
| ----- | --------------------------------------------------------- | ------ |
| 2.6.1 | Commercial buildings require goods supply from industrial |        |
| 2.6.2 | Goods shortage reduces commercial happiness/productivity  |        |
| 2.6.3 | Goods demand proportional to commercial capacity          |        |
| 2.6.4 | Goods supply proportional to industrial capacity          |        |
| 2.6.5 | Warning shown when goods supply insufficient              |        |

### 2.7 Debt and Loans

**Docs:** `28_DEBT_AND_LOANS.md`

| #     | Testable Logic                                       | Status |
| ----- | ---------------------------------------------------- | ------ |
| 2.7.1 | Player can take a loan when money is below threshold |        |
| 2.7.2 | Loan has fixed principal, interest rate, term        |        |
| 2.7.3 | Loan amount added to money instantly                 |        |
| 2.7.4 | Monthly interest deducted from money                 |        |
| 2.7.5 | Loan default occurs if payment missed for N months   |        |
| 2.7.6 | Loan default triggers bankruptcy                     |        |
| 2.7.7 | Max outstanding loans enforced                       |        |
| 2.7.8 | Loan repaid after term ends                          |        |

### 2.8 Police and Fire Services

**Docs:** `29_EXTENDED_SERVICES.md`

| #     | Testable Logic                                        | Status |
| ----- | ----------------------------------------------------- | ------ |
| 2.8.1 | Police station reduces crime in radius                |        |
| 2.8.2 | Low police coverage increases crime happiness penalty |        |
| 2.8.3 | Fire station reduces fire risk in radius              |        |
| 2.8.4 | Building with high fire risk can catch fire (event)   |        |
| 2.8.5 | Fire destroys building if not covered                 |        |
| 2.8.6 | Police and fire buildings have upkeep costs           |        |
| 2.8.7 | Police and fire buildings provide jobs                |        |

### 2.9 Garbage Service

**Docs:** `29_EXTENDED_SERVICES.md`

| #     | Testable Logic                                            | Status |
| ----- | --------------------------------------------------------- | ------ |
| 2.9.1 | Buildings produce garbage proportional to population/jobs |        |
| 2.9.2 | Garbage trucks collect from buildings within radius       |        |
| 2.9.3 | Uncollected garbage reduces happiness                     |        |
| 2.9.4 | Landfill/disposal building required for garbage capacity  |        |
| 2.9.5 | Garbage building has upkeep cost                          |        |

### 2.10 Public Transport (Bus System)

**Docs:** `30_PUBLIC_TRANSPORT.md`

| #      | Testable Logic                                          | Status |
| ------ | ------------------------------------------------------- | ------ |
| 2.10.1 | Bus stops placed on road tiles                          |        |
| 2.10.2 | Bus route created by connecting stops                   |        |
| 2.10.3 | Bus route reduces traffic congestion along its path     |        |
| 2.10.4 | Bus route improves happiness for nearby buildings       |        |
| 2.10.5 | Bus depot required for maintenance, has upkeep          |        |
| 2.10.6 | Coverage computed as percentage of buildings near stops |        |

### 2.11 District Policies

**Docs:** `31_DISTRICT_POLICIES.md`

| #      | Testable Logic                                 | Status |
| ------ | ---------------------------------------------- | ------ |
| 2.11.1 | District can be painted on set of tiles        |        |
| 2.11.2 | Policy applied to entire district              |        |
| 2.11.3 | Tax rate override per district                 |        |
| 2.11.4 | Service priority per district                  |        |
| 2.11.5 | Policy has monthly cost                        |        |
| 2.11.6 | Multiple policies can be active simultaneously |        |

### 2.12 City Rating

**Docs:** `32_CITY_RATING_AND_ACHIEVEMENTS.md`

| #      | Testable Logic                                                              | Status |
| ------ | --------------------------------------------------------------------------- | ------ |
| 2.12.1 | City rating computed from economy, happiness, services, environment, growth |        |
| 2.12.2 | Rating displayed as letter grade (A–F)                                      |        |
| 2.12.3 | Rating affects citizen immigration rate                                     |        |
| 2.12.4 | Rating breakdown shows strengths/weaknesses                                 |        |

### 2.13 Achievements

**Docs:** `32_CITY_RATING_AND_ACHIEVEMENTS.md`

| #      | Testable Logic                           | Status |
| ------ | ---------------------------------------- | ------ |
| 2.13.1 | Achievement triggered when condition met |        |
| 2.13.2 | Achievement awarded only once            |        |
| 2.13.3 | Achievement persists in save data        |        |
| 2.13.4 | Achievement definitions data-driven      |        |

### 2.14 Export/Import Save Files

**Docs:** `33_SAVE_MANAGEMENT.md`

| #      | Testable Logic                                 | Status |
| ------ | ---------------------------------------------- | ------ |
| 2.14.1 | Export produces downloadable JSON file         |        |
| 2.14.2 | Import accepts valid JSON file and loads state |        |
| 2.14.3 | Import rejects invalid/malformed save file     |        |
| 2.14.4 | Import saves to a new save slot                |        |

### 2.15 Multiple Save Slots

**Docs:** `33_SAVE_MANAGEMENT.md`

| #      | Testable Logic                                     | Status |
| ------ | -------------------------------------------------- | ------ |
| 2.15.1 | Save slot selected before save operation           |        |
| 2.15.2 | Save slot stores metadata (name, date, population) |        |
| 2.15.3 | Save slot loads correct state                      |        |
| 2.15.4 | Save slot deletion works                           |        |
| 2.15.5 | Save slot list survives page reload                |        |
| 2.15.6 | Autosave saves to dedicated autosave slot          |        |

### 2.16 Debug Tools

**Docs:** `17_PERFORMANCE_GUIDE.md`

| #      | Testable Logic                         | Status |
| ------ | -------------------------------------- | ------ |
| 2.16.1 | FPS counter displayed in debug overlay |        |
| 2.16.2 | Draw call count displayed              |        |
| 2.16.3 | Simulation tick time displayed         |        |
| 2.16.4 | Debug overlay toggleable               |        |

### 2.17 E2E Tests with Playwright

**Docs:** `16_TESTING_STRATEGY.md`

| #      | Testable Logic                         | Status |
| ------ | -------------------------------------- | ------ |
| 2.17.1 | App loads without errors               | done   |
| 2.17.2 | Player can place a road tile via click | done   |
| 2.17.3 | Player can paint a zone via drag       | done   |
| 2.17.4 | HUD updates after simulation tick      | done   |
| 2.17.5 | Save/load works end-to-end             | done   |

---

## Phase 3: Complexity

**Goal:** Advanced city systems with meaningful tradeoffs and optimization.

### 3.1 Agent-Based Traffic with Pathfinding

**Docs:** `34_AGENT_TRAFFIC_AND_ROAD_HIERARCHY.md`

| #     | Testable Logic                                                 | Status |
| ----- | -------------------------------------------------------------- | ------ |
| 3.1.1 | Agents spawn at residential buildings with commute destination |        |
| 3.1.2 | Agents travel along road network using pathfinding (A\*)       |        |
| 3.1.3 | Agent travel time affected by road type and congestion         |        |
| 3.1.4 | Agent count limited to performance budget                      |        |
| 3.1.5 | Agents despawn at destination                                  |        |
| 3.1.6 | Pathfinding respects one-way roads if applicable               |        |

### 3.2 Road Hierarchy (Arterial, Collector, Local)

**Docs:** `34_AGENT_TRAFFIC_AND_ROAD_HIERARCHY.md`

| #     | Testable Logic                                                  | Status |
| ----- | --------------------------------------------------------------- | ------ |
| 3.2.1 | Road types: local, collector, arterial with distinct capacities |        |
| 3.2.2 | Higher-tier roads have higher speed limits                      |        |
| 3.2.3 | Pathfinding prefers higher-tier roads for longer trips          |        |
| 3.2.4 | Road upgrade/downgrade costs defined per tier                   |        |

### 3.3 Traffic Lights and Intersections

**Docs:** `34_AGENT_TRAFFIC_AND_ROAD_HIERARCHY.md`

| #     | Testable Logic                                 | Status |
| ----- | ---------------------------------------------- | ------ |
| 3.3.1 | Intersections detected where roads cross       |        |
| 3.3.2 | Traffic light reduces intersection congestion  |        |
| 3.3.3 | Traffic light has construction and upkeep cost |        |

### 3.4 Education Tiers

**Docs:** `35_EDUCATION_AND_HEALTHCARE_TIERS.md`

| #     | Testable Logic                                             | Status |
| ----- | ---------------------------------------------------------- | ------ |
| 3.4.1 | Education levels: elementary, high school, university      |        |
| 3.4.2 | Higher education improves workforce quality                |        |
| 3.4.3 | Education level affects building upgrade eligibility       |        |
| 3.4.4 | Each education building has cost, upkeep, capacity, radius |        |

### 3.5 Healthcare Tiers

**Docs:** `35_EDUCATION_AND_HEALTHCARE_TIERS.md`

| #     | Testable Logic                                              | Status |
| ----- | ----------------------------------------------------------- | ------ |
| 3.5.1 | Healthcare levels: clinic, hospital, medical center         |        |
| 3.5.2 | Higher healthcare improves citizen health and happiness     |        |
| 3.5.3 | Healthcare coverage radius increases with tier              |        |
| 3.5.4 | Each healthcare building has cost, upkeep, capacity, radius |        |

### 3.6 Medium-Density and High-Density Zoning

**Docs:** `36_HIGH_DENSITY_AND_OFFICE_ZONING.md`

| #     | Testable Logic                                            | Status |
| ----- | --------------------------------------------------------- | ------ |
| 3.6.1 | Medium-density zone type available at milestone           |        |
| 3.6.2 | High-density zone type available at milestone             |        |
| 3.6.3 | Density zones spawn denser buildings                      |        |
| 3.6.4 | Density zone requirements (land value, services) enforced |        |

### 3.7 Office Zones

**Docs:** `36_HIGH_DENSITY_AND_OFFICE_ZONING.md`

| #     | Testable Logic                              | Status |
| ----- | ------------------------------------------- | ------ |
| 3.7.1 | Office zone type available at milestone     |        |
| 3.7.2 | Office buildings provide skilled jobs       |        |
| 3.7.3 | Office buildings require educated workforce |        |
| 3.7.4 | Office buildings produce no pollution       |        |

### 3.8 Tourism and Landmarks

**Docs:** `37_TOURISM_AND_LANDMARKS.md`

| #     | Testable Logic                                     | Status |
| ----- | -------------------------------------------------- | ------ |
| 3.8.1 | Tourism demand calculated from city attractiveness |        |
| 3.8.2 | Landmarks increase tourism attractiveness          |        |
| 3.8.3 | Parks and services contribute to attractiveness    |        |
| 3.8.4 | Tourism provides alternative income source         |        |
| 3.8.5 | Landmarks have high cost and upkeep                |        |

### 3.9 City Specialization Mechanics

**Docs:** `38_CITY_SPECIALIZATION.md`

| #     | Testable Logic                                        | Status |
| ----- | ----------------------------------------------------- | ------ |
| 3.9.1 | Specialization path chosen via policy or milestone    |        |
| 3.9.2 | Industrial specialization boosts industrial output    |        |
| 3.9.3 | Commercial specialization boosts commercial income    |        |
| 3.9.4 | Tourism specialization boosts tourism income          |        |
| 3.9.5 | Education specialization boosts education effects     |        |
| 3.9.6 | Specialization has tradeoffs (neglects other sectors) |        |

### 3.10 Events and Disasters

**Docs:** `39_EVENTS_AND_DISASTERS.md`

| #      | Testable Logic                                           | Status |
| ------ | -------------------------------------------------------- | ------ |
| 3.10.1 | Event types: fire, flood, economic downturn, epidemic    |        |
| 3.10.2 | Event triggered by game conditions or random chance      |        |
| 3.10.3 | Event has duration, effects, and resolution conditions   |        |
| 3.10.4 | Fire spreads to adjacent buildings without fire coverage |        |
| 3.10.5 | Economic downturn reduces tax income temporarily         |        |

### 3.11 Scenario Editor

**Docs:** `40_SCENARIO_EDITOR.md`

| #      | Testable Logic                                           | Status |
| ------ | -------------------------------------------------------- | ------ |
| 3.11.1 | Scenario editor creates valid scenario definition        |        |
| 3.11.2 | Scenario definition matches Scenario schema              |        |
| 3.11.3 | Custom start conditions, objectives, win/loss conditions |        |
| 3.11.4 | Scenario exported to JSON format                         |        |
| 3.11.5 | Exported scenario importable and playable                |        |

---

## Phase 4: Expansion

**Goal:** Extended content and replayability.

### 4.1 Larger Maps

**Docs:** `41_TERRAIN_AND_WATER_SYSTEM.md`

| #     | Testable Logic                           | Status |
| ----- | ---------------------------------------- | ------ |
| 4.1.1 | Map size configurable (128×128, 256×256) |        |
| 4.1.2 | Map size affects performance budget      |        |
| 4.1.3 | Camera bounds adapt to map size          |        |

### 4.2 Terrain Editing and Elevation

**Docs:** `41_TERRAIN_AND_WATER_SYSTEM.md`

| #     | Testable Logic                                | Status |
| ----- | --------------------------------------------- | ------ |
| 4.2.1 | Terrain elevation stored per tile             |        |
| 4.2.2 | Elevation affects building placement validity |        |
| 4.2.3 | Elevation costs money per tile changed        |        |
| 4.2.4 | Steep elevation affects road placement        |        |

### 4.3 Water Bodies, Rivers, Coastlines

**Docs:** `41_TERRAIN_AND_WATER_SYSTEM.md`

| #     | Testable Logic                                   | Status |
| ----- | ------------------------------------------------ | ------ |
| 4.3.1 | Water tiles are not buildable                    |        |
| 4.3.2 | Water tiles affect land value (waterfront bonus) |        |
| 4.3.3 | Water can be placed/removed with terrain tools   |        |

### 4.4 Resource Deposits

**Docs:** `42_RESOURCES_AND_BIOMES.md`

| #     | Testable Logic                               | Status |
| ----- | -------------------------------------------- | ------ |
| 4.4.1 | Resource deposits spawned on map generation  |        |
| 4.4.2 | Ore deposit boosts industrial output in area |        |
| 4.4.3 | Oil deposit boosts industrial output         |        |
| 4.4.4 | Fertile land boosts farming output           |        |
| 4.4.5 | Resources deplete over time                  |        |

### 4.5 Different Biomes

**Docs:** `42_RESOURCES_AND_BIOMES.md`

| #     | Testable Logic                            | Status |
| ----- | ----------------------------------------- | ------ |
| 4.5.1 | Biome affects starting terrain appearance |        |
| 4.5.2 | Biome affects resource distribution       |        |
| 4.5.3 | Biome available as map generation option  |        |

### 4.6 Mod Support

**Docs:** `43_MOD_SUPPORT.md`

| #     | Testable Logic                                    | Status |
| ----- | ------------------------------------------------- | ------ |
| 4.6.1 | Mod loads building definitions from external file |        |
| 4.6.2 | Mod loads custom balance values                   |        |
| 4.6.3 | Mod loading fails gracefully on invalid data      |        |
| 4.6.4 | Mods can add new scenario definitions             |        |

### 4.7 Shareable City Snapshots

**Docs:** `44_SOCIAL_AND_LEADERBOARD.md`

| #     | Testable Logic                                  | Status |
| ----- | ----------------------------------------------- | ------ |
| 4.7.1 | City exported as compressed shareable string    |        |
| 4.7.2 | Shared city can be imported by other players    |        |
| 4.7.3 | Snapshot includes city name, population, rating |        |

### 4.8 Scenario Leaderboard

**Docs:** `44_SOCIAL_AND_LEADERBOARD.md`

| #     | Testable Logic                        | Status |
| ----- | ------------------------------------- | ------ |
| 4.8.1 | Completion time tracked per scenario  |        |
| 4.8.2 | Leaderboard sorted by completion time |        |
| 4.8.3 | Leaderboard data persisted locally    |        |

### 4.9 Cosmetic Packs and Content Packs

**Docs:** `45_CONTENT_PACKS_AND_MONETIZATION.md`

| #     | Testable Logic                                      | Status |
| ----- | --------------------------------------------------- | ------ |
| 4.9.1 | Cosmetic pack provides alternative building visuals |        |
| 4.9.2 | Content pack provides new building definitions      |        |
| 4.9.3 | Pack asset loading does not break existing saves    |        |

### 4.10 Premium Version / Supporter Edition

**Docs:** `45_CONTENT_PACKS_AND_MONETIZATION.md`

| #      | Testable Logic                                             | Status |
| ------ | ---------------------------------------------------------- | ------ |
| 4.10.1 | Premium features gated behind flag                         |        |
| 4.10.2 | Non-premium game fully functional without premium features |        |
| 4.10.3 | Premium flag persists in save data                         |        |
