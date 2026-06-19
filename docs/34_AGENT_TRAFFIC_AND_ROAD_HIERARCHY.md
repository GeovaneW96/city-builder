# Agent Traffic and Road Hierarchy (Phase 3)

## Purpose

This document specifies the Phase 3 agent-based traffic simulation and road hierarchy system. It replaces the abstract congestion model from Phase 2 with lightweight agent simulation, 3-tier road types, traffic lights, and intersection logic.

## Road Hierarchy

Three road types with distinct capacity, speed, and cost.

### Road Type Definitions

| Property         |     Local |   Collector |   Arterial |
| ---------------- | --------: | ----------: | ---------: |
| Capacity         |        25 |          50 |        100 |
| Speed multiplier |       1.0 |         1.5 |        2.0 |
| Cost per tile    |        50 |         150 |        300 |
| Monthly upkeep   |         1 |           3 |          5 |
| Road type        | unpaved   | paved       | paved      |

### Upgrade and Downgrade

Cost to upgrade or downgrade a road:

```txt
upgradeCost = (newTierCost - oldTierCost) * tileCount
downgradeRefund = floor((oldTierCost - newTierCost) / 2) * tileCount
```

Upgrade cost is paid in full. Downgrade refunds 50% of the difference.

### Pathfinding Weighting

Pathfinding uses a weighted A\* algorithm where edge cost depends on road tier and congestion:

```txt
edgeCost = distance * (1 / tierSpeedMultiplier) * (1 + congestion * 2)
```

Higher-tier roads have lower base cost for long trips. Congestion penalty doubles the cost factor at 100% saturation.

## Agent-Based Traffic

### Agent Definition

Agents are lightweight simulation objects. They are not rendered as vehicles in Phase 3.

```txt
interface TrafficAgent:
  id: string
  type: commuter | customer | cargo
  originBuildingId: string
  destinationBuildingId: string
  startTick: number
  route: RoadTileId[]
  currentEdgeIndex: number
  status: traveling | arrived
```

### Agent Spawning Rules

| Agent Type   | Origin              | Destination                  | Spawn Condition                     |
| ------------ | ------------------- | ---------------------------- | ----------------------------------- |
| Commuter     | Residential building | Job building                 | Residential has workers, job exists |
| Customer     | Residential building | Commercial building          | Commercial has capacity             |
| Cargo        | Industrial building  | Commercial building          | Industrial produces goods           |

### Agent Budget

| Property       | Value |
| -------------- | ----: |
| Max agents     |   200 |
| Per tick spawn |     5 |
| Configurable   |   yes |

When the agent budget is full, new agents are queued and spawned when slots free up.

### Pathfinding

Agents pathfind using A\* on the road graph.

```txt
pathfind(startTile, endTile):
  edgeCost = distance * (1 + congestion * 2)
  use tier speed multiplier to weight higher-tier roads lower
  maxSteps = 500
  return route or empty if unreachable
```

### Agent Travel Time Effects

| Effect                  | Formula                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| Happiness penalty       | `-floor(commuteTicks / 10)` (per commuting agent, averaged)      |
| Commercial effectiveness| `commercialIncome *= max(0.5, 1 - avgCommuteTicks / 50)`         |

### Agent Despawn

An agent despawns immediately upon reaching its destination. The next queued agent (if any) spawns in the same tick.

## Traffic Lights and Intersections

### Intersection Definition

An intersection is any road tile where two or more road segments meet orthogonally (degree >= 2 in the road graph).

### Traffic Light Placement

| Property   | Value    |
| ---------- | -------- |
| Cost       | 1,000    |
| Upkeep     | 50/month |
| Effect     | Reduces intersection congestion by 50% |

Traffic lights are placed manually on intersections. Only one traffic light per intersection.

### Visual States

In the rendering layer, traffic lights show:

- **Green** — congestion below 30% on outgoing edges
- **Yellow** — congestion 30–60%
- **Red** — congestion above 60%

Color is determined each tick from the intersection's outgoing edge congestion.

## Performance Budget

| Constraint                         |        Value |
| ---------------------------------- | -----------: |
| Max active agents                  |          200 |
| Max pathfind steps per agent       |          500 |
| Agent tick frequency               | Every 4th simulation tick |
| Road network dirty rebuild         | On road add/remove only |

### Dirty Tracking

The road graph is rebuilt lazily. A `roadNetworkDirty` flag is set when a road tile is placed or removed. Pathfinding checks this flag and rebuilds the graph once before the next agent tick.

## Integration with Simulation Tick

Agent traffic runs as a new step in the simulation tick pipeline, inserted after economy and before demand:

1. Economy
2. **Agent Traffic** (every 4th tick)
3. Demand
4. Building Growth
5. Population
6. Services
7. Happiness
8. Warnings
9. Progression
10. Events

Within the agent traffic step:

1. Check `roadNetworkDirty` — rebuild graph if needed.
2. Despawn arrived agents.
3. Spawn new agents up to budget limit.
4. Advance traveling agents one edge along their route.
5. Recompute per-edge congestion from active agents.
6. Update commute averages for happiness/effect formulas.

## Data Structures

```txt
RoadNetworkState:
  graph: AdjacencyList<RoadTileId, Edge>
  congestion: Map<RoadTileId, number>  // 0.0 to 1.0
  intersections: Set<RoadTileId>
  trafficLights: Map<RoadTileId, TrafficLightState>
  dirty: boolean

TrafficLightState:
  tickPlaced: number
  phase: green | yellow | red

AgentPoolState:
  agents: TrafficAgent[]
  queue: PendingSpawn[]
  maxAgents: number
  nextId: number
```

## Tests

- Local road placement sets tile type to `local`
- Collector road placement sets tile type to `collector`
- Arterial road placement sets tile type to `arterial`
- Upgrade from local to collector costs correct amount
- Upgrade from collector to arterial costs correct amount
- Downgrade refunds 50% of difference
- Pathfinding prefers arterial over local when both connect origin and destination
- Pathfinding cost includes congestion penalty
- Pathfinding respects max steps limit
- Pathfinding returns empty route for disconnected graph
- Agent spawns commuter when residential + job building both exist
- Agent spawns customer when residential + commercial both exist
- Agent spawns cargo when industrial + commercial both exist
- Agent count does not exceed max budget
- Agents queue when budget is full
- Agent despawns on reaching destination
- Agent commute time affects happiness
- Agent commute time affects commercial effectiveness
- Agent tick runs every 4th tick only
- Intersection detected where degree >= 2
- Traffic light reduces intersection congestion by 50%
- Traffic light cost and upkeep are deducted
- Dirty flag set on road add
- Dirty flag set on road remove
- Road graph rebuilt before agent tick when dirty
