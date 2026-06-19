# Education and Healthcare Tiers (Phase 3)

## Purpose

This document defines the multi-tier education and healthcare systems. Both systems expand the Phase 1 service model with tiered buildings, coverage quality, and unlock progression.

## Education Tiers

### Education Building Definitions

| Building    | Size |   Cost | Upkeep/Month | Radius | Student Capacity | Unlock Population |
| ----------- | ---: | -----: | -----------: | -----: | ---------------: | ----------------: |
| Elementary  |  3x3 | 15,000 |          600 |     10 |              200 |             2,000 |
| High School |  4x4 | 25,000 |        1,000 |     15 |              500 |             5,000 |
| University  |  5x5 | 50,000 |        2,000 |     20 |            1,000 |            10,000 |

### Education Quality

Education quality is a weighted average of population covered by each tier within service radius:

```txt
tierWeight = { elementary: 1, highSchool: 2, university: 3 }

educationQuality =
  sum over tiers of (tierWeight * populationServed)
  / sum over tiers of (tierWeight * totalCapacity)
  * 100
```

Clamped to 0–100.

### Education Effects

| Effect                        | Formula                                                  |
| ----------------------------- | -------------------------------------------------------- |
| Workforce quality             | `educationQuality` (capped 0–100)                        |
| Commercial income bonus       | `commercialIncome *= 1 + educationQuality * 0.002`       |
| Industrial productivity bonus | `industrialProductivity *= 1 + educationQuality * 0.001` |
| Unlocks high-tech industry    | Requires educationQuality >= 60                          |
| Unlocks office zones          | Requires educationQuality >= 40                          |
| Unlocks building upgrades     | Education quality threshold varies by upgrade tier       |

### Workforce Quality

Workforce quality is a derived stat that feeds into economy and zone unlocks:

```txt
workforceQuality = educationQuality
```

Used by:

- Office zone worker shortage check (requires >= 40%)
- High-tech industrial demand (requires >= 60%)
- Tax income modifier for commercial and office

## Healthcare Tiers

### Healthcare Building Definitions

| Building       | Size |   Cost | Upkeep/Month | Radius | Patient Capacity | Unlock Population | Tier Weight |
| -------------- | ---: | -----: | -----------: | -----: | ---------------: | ----------------: | ----------: |
| Clinic         |  2x2 |  8,000 |          400 |      8 |              100 |                 0 |           1 |
| Hospital       |  4x4 | 30,000 |        1,500 |     15 |              500 |             5,000 |           2 |
| Medical Center |  5x5 | 60,000 |        3,000 |     20 |            1,000 |            15,000 |           3 |

### Health Quality

Health quality is a weighted average of patient capacity within service radius:

```txt
healthQuality =
  sum over facilities of (tierWeight * patientsServed)
  / sum over facilities of (tierWeight * totalCapacity)
  * 100
```

Clamped to 0–100.

### Health Effects

| Effect                         | Formula                                                                   |
| ------------------------------ | ------------------------------------------------------------------------- |
| Happiness bonus                | `happiness += floor(healthQuality / 10)`                                  |
| Population growth rate bonus   | `growthRate *= 1 + healthQuality * 0.005`                                 |
| Building abandonment threshold | Buildings abandon at 18 consecutive ticks (was 12) if healthQuality >= 50 |

## Data Tables

### Full Service Building Definitions

```txt
Buildings:
  elementary_school:
    id: elementary_school
    category: service
    placementType: manual
    size: [3, 3]
    cost: 15000
    upkeep: 600
    unlockPopulation: 2000
    effects:
      educationRadius: 10
      educationCapacity: 200
      educationTier: 1

  high_school:
    id: high_school
    category: service
    placementType: manual
    size: [4, 4]
    cost: 25000
    upkeep: 1000
    unlockPopulation: 5000
    effects:
      educationRadius: 15
      educationCapacity: 500
      educationTier: 2

  university:
    id: university
    category: service
    placementType: manual
    size: [5, 5]
    cost: 50000
    upkeep: 2000
    unlockPopulation: 10000
    effects:
      educationRadius: 20
      educationCapacity: 1000
      educationTier: 3

  clinic:
    id: clinic
    category: service
    placementType: manual
    size: [2, 2]
    cost: 8000
    upkeep: 400
    unlockPopulation: 0
    effects:
      healthRadius: 8
      healthCapacity: 100
      healthTier: 1

  hospital:
    id: hospital
    category: service
    placementType: manual
    size: [4, 4]
    cost: 30000
    upkeep: 1500
    unlockPopulation: 5000
    effects:
      healthRadius: 15
      healthCapacity: 500
      healthTier: 2

  medical_center:
    id: medical_center
    category: service
    placementType: manual
    size: [5, 5]
    cost: 60000
    upkeep: 3000
    unlockPopulation: 15000
    effects:
      healthRadius: 20
      healthCapacity: 1000
      healthTier: 3
```

## Integration

### Education in the Tick Pipeline

Education is computed in the Services step of the simulation tick:

1. For each education building, find population within radius.
2. Compute tier-weighted coverage.
3. Derive `educationQuality` and `workforceQuality`.
4. Apply effects to commercial income, industrial productivity.
5. Check unlock thresholds for office zones and high-tech industry.

### Healthcare in the Tick Pipeline

Healthcare is computed in the Services step:

1. For each health building, find population within radius.
2. Compute tier-weighted health quality.
3. Derive happiness bonus and growth rate modifier.

### Unlock Dependencies

| Feature            | Population Requirement | Education Requirement |
| ------------------ | :--------------------: | :-------------------: |
| Elementary school  |         2,000          |           —           |
| High school        |         5,000          |           —           |
| University         |         10,000         |           —           |
| Office zone        |         5,000          |        >= 40%         |
| High-tech industry |         10,000         |        >= 60%         |

## Tests

- Elementary school can be placed at 2,000+ population
- High school can be placed at 5,000+ population
- University can be placed at 10,000+ population
- Education quality is 0 when no education buildings exist
- Education quality increases when buildings cover population
- Higher tier buildings contribute more to education quality
- Education quality cap is 100
- Commercial income bonus scales with education quality
- Industrial productivity bonus scales with education quality
- Workforce quality equals education quality
- Office zones unlock at 5,000 pop and >= 40% education quality
- High-tech industry unlocks at 10,000 pop and >= 60% education quality
- Clinic placed at start (pop >= 0)
- Hospital unlocks at 5,000 population
- Medical center unlocks at 15,000 population
- Health quality is 0 when no health buildings exist
- Tier weight increases health quality contribution for higher-tier buildings
- Health happiness bonus scales with health quality
- Population growth rate increases with health quality
- Abandonment threshold extends to 18 ticks when healthQuality >= 50
- All building costs and upkeep match definition values
- All building size footprints match definition values
