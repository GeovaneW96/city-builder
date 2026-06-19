# District Policies

## Purpose

This document defines the district zoning and policy system. Districts allow players to paint named areas and apply policies that modify local simulation behavior — taxes, services, happiness, pollution, and demand.

## Districts

### District Definition

A district is a named, rectangular area of contiguous tiles. Each tile belongs to at most one district.

```txt
district: {
  id: string;
  name: string;
  tiles: tileCoord[];  // all tiles in the rectangular area
  color: string;       // hex color for map overlay
  policies: policyId[]; // 0–3 active policies
}
```

### Creation Rules

- Districts are painted by clicking and dragging to define a rectangle.
- Painting a district costs nothing.
- A tile already belonging to another district cannot be added to a new district.
- Districts can be renamed or deleted at any time.
- Deleting a district removes all its policies but does not affect tiles (they return to un-districted state).
- Minimum district size: 2×2 tiles.

## Policies

### Policy Definition

```txt
policy: {
  id: string;
  name: string;
  description: string;
  effect: PolicyEffect;
  monthlyCost: number;
  requirements: PolicyRequirement[];
}
```

### Policy List

#### Tax Break

Reduces tax rate in the district by a percentage. The city pays a subsidy to compensate.

| Field         |          Value |
| ------------- | -------------: |
| id            |     tax_break |
| tax reduction |           5%  |
| subsidy cost  |         200/month |
| requirements  | 10 commercial or industrial buildings in district |

#### Service Priority

Buildings in the district receive service coverage checks first during the simulation tick. Improves effective coverage but costs a premium.

| Field         |                   Value |
| ------------- | ----------------------: |
| id            |      service_priority  |
| effect        | service checks ordered by district flag |
| monthly cost  |                  150   |
| requirements  |  at least one service building in city |

#### Smoking Ban

Improves residential happiness in the district.

| Field         |           Value |
| ------------- | --------------: |
| id            |   smoking_ban  |
| happiness     |        +5 residential |
| monthly cost  |          100   |
| requirements  |  population ≥ 500 |

#### Nightlife

Increases commercial demand in the district but reduces residential happiness.

| Field              |            Value |
| ------------------ | ---------------: |
| id                 |      nightlife  |
| commercial demand  |           +15   |
| residential happiness |          -3   |
| monthly cost       |           150   |
| requirements       |  population ≥ 1000 |

#### Green Initiative

Reduces pollution from industrial buildings in the district.

| Field               |             Value |
| ------------------- | ----------------: |
| id                  | green_initiative |
| pollution reduction |            -50%  |
| monthly cost        |             200  |
| requirements        |  at least one industrial building in district |

### Policy Limits

- Maximum 3 policies per district.
- A policy can only be applied once per district.
- The same policy can be applied to multiple districts.

### Policy Effect on Simulation

When a policy is active, the simulation systems read district membership to apply modifiers:

| System      | Policy              | Effect                                                      |
| ----------- | ------------------- | ----------------------------------------------------------- |
| Economy     | Tax break           | district tax rate = city rate − 5%; subsidy deducted monthly |
| Services    | Service priority    | buildings in district processed first in service tick       |
| Happiness   | Smoking ban         | +5 happiness for residential buildings in district          |
| Happiness   | Nightlife           | −3 happiness for residential buildings in district          |
| Demand      | Nightlife           | +15 commercial demand contributed from district             |
| Pollution   | Green initiative    | −50% pollution output from industrial buildings in district |
| Economy     | All policies        | monthlyCost deducted from budget per active policy          |

## District Overlay

The district overlay is a rendering feature:

- tile highlights show district color with low opacity;
- district borders are shown;
- policy icons displayed on hover;
- tooltip shows district name, policy list, and per-policy cost.

## Data Constants

| Constant                          | Value |
| --------------------------------- | ----: |
| MAX_POLICIES_PER_DISTRICT         |     3 |
| MIN_DISTRICT_SIZE                 |     2 |
| TAX_BREAK_REDUCTION               |  0.05 |
| TAX_BREAK_SUBSIDY                 |   200 |
| SERVICE_PRIORITY_COST             |   150 |
| SMOKING_BAN_HAPPINESS             |     5 |
| SMOKING_BAN_COST                  |   100 |
| NIGHTLIFE_COMMERCIAL_DEMAND       |    15 |
| NIGHTLIFE_HAPPINESS_PENALTY       |    -3 |
| NIGHTLIFE_COST                    |   150 |
| GREEN_INITIATIVE_POLLUTION_REDUCTION | 0.50 |
| GREEN_INITIATIVE_COST             |   200 |

## Tests

- District creation with valid rectangle
- District creation with < 2×2 tiles fails
- Tile assigned to one district cannot be added to another
- District deletion removes district but not tiles
- District rename updates display name
- Policy applied to district succeeds within limit
- Policy applied to district fails when ≥ 3 policies active
- Same policy cannot be applied twice to same district
- Tax break reduces district tax rate by 5%
- Tax break subsidy deducted monthly
- Tax break requires 10 commercial/industrial buildings
- Service priority reorders service tick for district buildings
- Smoking ban adds +5 happiness to district residential
- Smoking ban requires population ≥ 500
- Nightlife adds +15 commercial demand
- Nightlife reduces residential happiness by 3
- Nightlife requires population ≥ 1000
- Green initiative halves pollution from district industry
- Green initiative requires industrial building in district
- Deleting district removes all policies and stops cost deductions
- Policy cost accumulates across multiple districts
- District overlay data accessible by rendering layer
- Save/load round-trip for district and policy state
