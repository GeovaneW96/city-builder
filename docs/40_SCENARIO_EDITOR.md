# Scenario Editor

## Purpose

This document defines the in-game scenario editor for Phase 3.

The scenario editor allows designers (and players) to create, edit, validate, and export scenarios as JSON files matching the ScenarioDefinition schema.

## Editor Mode

The scenario editor is a dev-only mode toggled by a flag or URL parameter (`?editor=true` or a button in the main menu).

In editor mode:

- All buildings, zones, and tools are unlocked regardless of population/milestones.
- A floating toolbar appears with editor-specific tools.
- The save/load system writes scenario `.json` files instead of save files.
- No simulation tick runs while editing (editor is paused).

## Editor Tabs

### 1. Map Painter

Tools for setting up initial map state.

| Tool | Function |
| ---- | -------- |
| Place Road | Click/drag to paint road tiles |
| Zone Residential | Paint residential zone tiles |
| Zone Commercial | Paint commercial zone tiles |
| Zone Industrial | Paint industrial zone tiles |
| Place Building | Drop-down selector + click to place any building |
| Eraser | Remove roads, zones, or buildings |
| Clear All | Reset map to empty flat terrain |

Right-click to remove. Left-click to place/paint. Selection highlights the current tool.

### 2. Starting Conditions

Form inputs for scenario initial state:

| Field | Type | Default |
| ----- | ---- | ------: |
| Starting money | number input | 50,000 |
| Starting population | number input | 0 |
| Starting happiness | number input (0–100) | 70 |
| Initial unlocks | multi-select checkboxes | none |
| Starting buildings | auto-populated from map | — |

### 3. Objectives

Ordered list of objectives. Each objective has:

| Field | Type | Description |
| ----- | ---- | ----------- |
| id | string | auto-generated uuid |
| order | number | position in sequence |
| description | text | player-facing text |
| condition type | dropdown | See condition types below |
| condition value | number | threshold value |
| optional | checkbox | if true, objective can be skipped |

Condition types:

| Type | Value Meaning |
| ---- | ------------- |
| `population` | population >= value |
| `money` | money >= value |
| `happiness` | happiness >= value |
| `build_building` | building of given id exists |
| `place_roads` | road tiles >= value |
| `zone_residential` | residential zone tiles >= value |
| `zone_commercial` | commercial zone tiles >= value |
| `zone_industrial` | industrial zone tiles >= value |
| `has_building_count` | count of a building id >= value |

The editor provides an "Add Objective" button that appends a new row. Objectives can be reordered (drag handle) and deleted.

### 4. Win / Loss Conditions

| Condition | Type | Default |
| --------- | ---- | ------- |
| Win condition | dropdown + number | population >= 1,000 |
| Win: money >= | number | 0 |
| Win: happiness >= | number (0–100) | 50 |
| Loss condition | dropdown | bankruptcy |
| Loss: bankruptcy months | number | 5 |

### 5. Milestone Overrides

Optional overrides for the default progression system.

| Field | Type |
| ----- | ---- |
| Override milestone thresholds | table of population → unlock ID mappings |
| Disable default milestones | checkbox |

If no overrides are provided, the default milestone table is used.

## Schema Validation

When the editor exports a scenario, validation runs automatically.

Validation checks:

- Condition type references a valid type from the allowed list
- Unlock ID exists in building data (`src/data/buildings/`)
- Population targets are positive integers
- Money targets are integers >= 0
- Happiness targets are integers in 0–100
- Building IDs referenced in conditions exist in building definitions
- Objective IDs are unique
- At least one win condition is set
- Starting money >= 0
- Map dimensions are positive integers

Validation errors are displayed inline with the relevant field highlighted.

## Export Format

Exported scenarios match the ScenarioDefinition schema (see doc 22) and are output as `.json` files:

```json
{
  "id": "my_scenario",
  "name": "My Scenario",
  "description": "A custom scenario",
  "mapWidth": 64,
  "mapHeight": 64,
  "startingMoney": 50000,
  "startingPopulation": 0,
  "startingHappiness": 70,
  "initialUnlocks": ["road", "residential_zone"],
  "startingBuildings": [],
  "startingMap": {
    "roads": [{ "x": 30, "y": 30 }, { "x": 31, "y": 30 }],
    "zones": [{ "x": 28, "y": 30, "type": "residential" }]
  },
  "objectives": [
    { "id": "obj-1", "order": 1, "description": "Place a road", "condition": { "type": "place_roads", "value": 1 }, "optional": false }
  ],
  "winConditions": {
    "population": 1000,
    "money": 0,
    "happiness": 50
  },
  "lossConditions": {
    "type": "bankruptcy",
    "monthsBelowZero": 5
  },
  "milestoneOverrides": null
}
```

Exported files can be placed in `src/data/scenarios/` for bundling with the game.

## UI Components

### Toolbar

Floating toolbar docked to the left edge of the screen:

- Icon buttons for each map painter tool
- Separator
- Tab buttons (Map, Conditions, Objectives, Milestones)

### Objective List Editor

A scrollable list with rows containing:

- Drag handle (≡)
- Text input for description
- Condition type dropdown
- Condition value number input
- Optional checkbox
- Delete button (×)
- "Add Objective" button below the list

### Condition Editors

Each condition type shows the relevant input:

- `population`, `money`, `happiness`: number input with unit label
- `build_building`, `has_building_count`: building selector dropdown + number input
- `place_roads`, `zone_residential`, etc.: number input

### Export Button

An "Export Scenario" button in the toolbar that:

1. Validates the scenario
2. Shows error list if invalid
3. Opens a save dialog (writes `.json` file)
4. On success: shows confirmation message

## Tests

1. Create a new scenario from scratch → all fields default
2. Paint roads, zones, and buildings on the map → verify map state serializes correctly
3. Set starting money to 100,000 → exported JSON shows `startingMoney: 100000`
4. Add 3 objectives with different condition types → objectives appear in order in JSON
5. Reorder objectives → order field updates correctly
6. Set win condition to population >= 500 → exported JSON reflects
7. Set loss condition to bankruptcy with 3 months → exported JSON reflects
8. Export with invalid condition type → validation error shown
9. Export with missing win condition → validation error shown
10. Export with non-existent building ID → validation error shown
11. Export with negative population target → validation error shown
12. Import the exported JSON into the editor → all fields round-trip correctly
13. Play the imported scenario → verify win/loss triggers at correct thresholds
14. Toggle milestone overrides → overrides appear in export
15. Clear all map data → exported map has empty arrays
