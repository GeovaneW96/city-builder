# High Density and Office Zoning (Phase 3)

## Purpose

This document defines medium-density zoning, high-density zoning, and office zones. These systems expand the Phase 1 zone types and provide deeper city-building progression.

## Density Zoning

### Medium Density

Unlocked at 2,500 population.

New zone types:

- `medium_residential`
- `medium_commercial`
- `medium_industrial`

Requirements for medium-density building growth:

- land value >= 50;
- service coverage >= 60%;
- density unlocked.

### High Density

Unlocked at 10,000 population.

New zone types:

- `high_residential`
- `high_commercial`

Requirements for high-density building growth:

- land value >= 75;
- service coverage >= 60%;
- density unlocked.

High-density industrial is excluded (industrial remains medium-density maximum).

### Density Building Definitions

| Building             | Zone Type  | Size | Population Capacity | Jobs | Land Value Required |
| -------------------- | ---------- | ---: | ------------------: | ---: | ------------------: |
| Medium house         | medium_res |  1x1 |                  20 |    0 |                 50 |
| High-rise apartment  | high_res   |  2x2 |                  50 |    0 |                 75 |
| Medium shop          | medium_com |  1x1 |                   0 |   15 |                 50 |
| High-rise commercial | high_com   |  2x2 |                   0 |   40 |                 75 |
| Medium factory       | medium_ind |  2x2 |                   0 |   30 |                 50 |

### Zone Painting UI

The player selects a density level in the zone tool:

- **Low** (default) — paints `residential`, `commercial`, `industrial`
- **Medium** — paints `medium_residential`, `medium_commercial`, `medium_industrial` (requires unlock)
- **High** — paints `high_residential`, `high_commercial` (requires unlock)

A single tool cycles density with a dropdown or toggle button.

### Building Upgrade Path

The Phase 2 upgrade system (defined in `24_BUILDING_UPGRADES.md`) handles organic tier upgrades (Tier 1→2→3) for existing buildings using land value thresholds of 30/60. In Phase 3, density zoning provides an alternative path: players can paint medium/high density zones, and buildings grow at those densities directly when conditions are met.

When density is unlocked and land value meets thresholds, existing low-density buildings can also upgrade along this path:

```txt
small_house -> medium_house: landValue >= 50, density unlocked
medium_house -> highrise_apartment: landValue >= 75, high density unlocked
small_shop -> medium_shop: landValue >= 50, density unlocked
medium_shop -> highrise_commercial: landValue >= 75, high density unlocked
small_factory -> medium_factory: landValue >= 50, density unlocked
```

Upgrades happen automatically during the building growth step when conditions are met. The old building is replaced with the new definition. No refund is given for the old building.

**Note on system layering:** The Phase 2 tier system (`24_BUILDING_UPGRADES.md`) uses land value thresholds 30/60 and applies universally. The Phase 3 density upgrade path uses thresholds 50/75 and is gated by density zone unlocks. These are complementary — higher density zones require higher land values and later milestones. When both systems are active, the density path takes priority for buildings in density-zoned tiles.

## Office Zones

### Overview

Office zones provide skilled, high-tax jobs with no pollution. They require an educated workforce.

| Property            | Value |
| ------------------- | :---: |
| Unlock population   | 5,000 |
| Education threshold |  40%  |
| Tax income per job  |  10   |
| Pollution           |   0   |

### Office Building Definitions

| Building     | Size | Population Capacity | Jobs | Cost | Upkeep |
| ------------ | ---: | ------------------: | ---: | ---: | -----: |
| Small office |  2x2 |                   0 |   20 | 0*   |    0   |
| Large office |  3x3 |                   0 |   50 | 0*   |    0   |

\*No construction cost. Office buildings are zone-grown (paint the zone, building grows automatically).

### Office Demand Formula

```txt
officeDemand =
  20
  + workforceQuality * 0.5
  - officeCapacity * 0.3
```

Clamped to 0–100.

Where:

- `workforceQuality` = education quality (0–100)
- `officeCapacity` = total jobs from active office buildings

### Worker Shortage Penalty

If `workforceQuality < 40`:

```txt
officeJobsFilled = officeJobs * (workforceQuality / 100)
unfilledJobs = officeJobs - officeJobsFilled
```

Unfilled jobs reduce office tax income proportionally and lower office demand.

### Office Tax Income

```txt
officeTaxIncome = officeJobsFilled * 10 * officeTaxMultiplier
```

Where `officeTaxMultiplier = taxRate / 10` (same as other zone types).

### Comparison: Office vs Commercial

| Property          |      Commercial |            Office |
| ----------------- | --------------: | ----------------: |
| Base tax per job  |               5 |                10 |
| Education req.    |            None | Workforce >= 40%  |
| Pollution         |            Low  |                 0 |
| Unlock            |            None | 5,000 pop + 40% edu |
| Demand sensitivity| Population-based| Education + capacity |

Office zones complement commercial zones — they pay more taxes per job but require an educated population to function effectively.

## Data Structures

```txt
DensityConfig:
  unlocked: boolean
  landValueThreshold: number
  serviceCoverageThreshold: number

ZoneTypeExtended:
  base: residential | commercial | industrial
  density: low | medium | high

DensityState:
  mediumUnlocked: boolean
  highUnlocked: boolean

OfficeState:
  unlocked: boolean
  totalCapacity: number
  filledJobs: number
  taxIncome: number
```

## Integration

### Tick Pipeline Changes

Density and office logic is integrated into existing steps:

- **Progression step** — check population thresholds to unlock medium/high density and office zones.
- **Building growth step** — evaluate density conditions when selecting buildings to spawn.
- **Demand step** — include office demand in the RCI display (RCIO: residential, commercial, industrial, office).
- **Economy step** — add office tax income to total income.

### Land Value Interaction

Land value affects density viability. The base land value system is defined in `23_LAND_VALUE_SYSTEM.md`. Density-specific thresholds build on that system with these additional notes:

| Source                | Land Value Effect |
| --------------------- | ----------------: |
| Park nearby           |               +5  |
| Health coverage       |               +3  |
| Education coverage    |               +3  |
| Road access           |              +10  |
| Police/fire coverage  |              +10  |
| Industrial pollution  |               -8  |
| Noise (traffic/ind.)  |               -5  |

See `23_LAND_VALUE_SYSTEM.md` for full modifier tables, radii, falloff formulas, and data parameters. The values above match the Phase 2 land value system — additional Phase 3 modifiers (police, fire) use the same radius-based falloff model.

## Tests

- Medium residential zone cannot be painted before 2,500 population
- High residential zone cannot be painted before 10,000 population
- Medium commercial zone cannot be painted before 2,500 population
- High commercial zone cannot be painted before 10,000 population
- Medium industrial zone cannot be painted before 2,500 population
- Medium house grows when landValue >= 50 and serviceCoverage >= 60%
- High-rise apartment grows when landValue >= 75 and serviceCoverage >= 60%
- Medium house provides 20 population capacity
- High-rise apartment provides 50 population capacity
- Medium shop provides 15 jobs
- High-rise commercial provides 40 jobs
- Medium factory provides 30 jobs
- Building upgrade from small_house to medium_house occurs when density unlocked and landValue >= 50
- Building upgrade from medium_house to highrise_apartment occurs when high density unlocked and landValue >= 75
- Office zone unlocks at 5,000 population and >= 40% education quality
- Office zone does not unlock before 5,000 population
- Office zone does not unlock when education < 40%
- Small office grows in office zone
- Large office grows in office zone
- Office demand base value is 20
- Office demand increases with workforce quality
- Office demand decreases with existing office capacity
- Office demand is clamped 0–100
- Worker shortage penalty reduces filled jobs when workforceQuality < 40
- Office tax income uses base 10 per job
- Office tax income scales with tax rate multiplier
- Office produces no pollution
- Land value thresholds are evaluated per tile
- Zone painting cycles between low, medium, and high density levels
