# Commercial Goods Demand

## Purpose

Commercial buildings need a steady supply of goods from industrial buildings to function. When goods are scarce, commercial businesses earn less and citizens become unhappy. This system connects industrial output to commercial effectiveness, creating a meaningful economic chain.

## Goods Demand

Each commercial building demands goods based on its number of jobs:

```txt
goodsDemand = commercialJobs × GOODS_PER_JOB
```

| Building    | Jobs | Goods Per Job | Total Demand |
| ----------- | :--: | :-----------: | :----------: |
| Small shop  |  6   |       2       |      12      |
| Medium shop |  15  |       2       |      30      |
| Large store |  35  |       2       |      70      |

Total city goods demand is the sum across all commercial buildings.

## Goods Supply

Each industrial worker produces goods:

```txt
goodsSupply = industrialJobs × GOODS_PER_WORKER
```

| Building       | Jobs | Goods Per Worker | Total Supply |
| -------------- | :--: | :--------------: | :----------: |
| Small factory  |  12  |        3         |      36      |
| Medium factory |  28  |        3         |      84      |
| Large plant    |  60  |        3         |     180      |

Total city goods supply is the sum across all industrial buildings.

## City Goods Balance

```txt
cityGoodsBalance = totalGoodsSupply − totalGoodsDemand
```

A positive balance means the city produces enough goods. A negative balance means a shortage.

### Goods Shortage Percentage

```txt
if (totalGoodsDemand > 0) {
    goodsShortagePct = max(0, (totalGoodsDemand - totalGoodsSupply) / totalGoodsDemand) × 100
} else {
    goodsShortagePct = 0
}
```

Round to one decimal place. Range is 0–100.

## Effects of Goods Shortage

When `goodsShortagePct > 0`, commercial buildings are less effective:

### Commercial Happiness Penalty

```txt
goodsHappinessPenalty = goodsShortagePct × GOODS_HAPPINESS_WEIGHT
```

Applied as a negative happiness modifier.

### Commercial Income Reduction

```txt
goodsIncomeMultiplier = 1.0 - (goodsShortagePct / 100) × GOODS_INCOME_PENALTY

commercialTaxIncome = baseIncome × goodsIncomeMultiplier
```

### Summary Table

| Shortage % | Happiness Penalty | Income Multiplier |
| :--------: | :---------------: | :---------------: |
|     0%     |         0         |       1.00        |
|    25%     |       −3.8        |       0.88        |
|    50%     |       −7.5        |       0.75        |
|    75%     |       −11.3       |       0.63        |
|    100%    |        −15        |       0.50        |

## Connection to Traffic

Goods movement is implicitly affected by traffic congestion:

1. Industrial productivity drops when traffic congestion is high (see `docs/26_TRAFFIC_MODEL.md`).
2. Lower industrial productivity means fewer effective industrial jobs for goods calculation.
3. Effective industrial jobs after traffic penalty:

```txt
effectiveIndustrialJobs = totalIndustrialJobs × industrialProductivityMultiplier
effectiveGoodsSupply = effectiveIndustrialJobs × GOODS_PER_WORKER
```

This creates a feedback loop: traffic congestion reduces goods supply, which hurts commercial effectiveness and happiness.

### Tick Order

Traffic and goods are calculated from the current active buildings before the economy step so
their multipliers apply to that month's income. After construction, population, and services are
updated, both are recalculated before happiness and warnings so the visible derived state matches
the city at the end of the tick.

## Data Parameters

All constants in `src/data/balance/goods.ts`:

```txt
GOODS_PER_JOB                = 2
GOODS_PER_WORKER             = 3
GOODS_HAPPINESS_WEIGHT       = 0.15
GOODS_INCOME_PENALTY         = 0.5    // 50% max reduction
```

## Integration Points

| System    | Integration                                                           |
| --------- | --------------------------------------------------------------------- |
| Economy   | Commercial income multiplied by goods shortage modifier               |
| Happiness | Goods shortage contribution to negative happiness                     |
| Demand    | Industrial demand increases when goods shortage exists                |
| Traffic   | Traffic congestion reduces effective industrial output → goods supply |
| Warnings  | Warning triggered when goodsShortagePct > 25                          |
| UI        | Goods balance in economy panel, shortage warning                      |

## Current Implementation

The simulation derives goods demand from active commercial job capacity and supply from active
industrial capacity scaled by the traffic industrial multiplier. It persists the derived balance
in `CityState`, applies the shortage to commercial tax income and happiness, and emits medium or
high city warnings at the documented thresholds.

## Warnings

| Condition               | Warning                 | Severity |
| ----------------------- | ----------------------- | :------: |
| `goodsShortagePct > 25` | "Goods shortage"        |  medium  |
| `goodsShortagePct > 50` | "Severe goods shortage" |   high   |

## Tests

1. Commercial building with 6 jobs demands 12 goods.
2. Industrial building with 12 jobs supplies 36 goods.
3. Total goods demand is sum of all commercial building demands.
4. Total goods supply is sum of all industrial building supplies.
5. Goods balance is supply minus demand.
6. Shortage percentage is 0 when supply >= demand.
7. Shortage percentage is correct percentage when supply < demand.
8. Shortage percentage is 0 when there are no commercial buildings (demand = 0).
9. Happiness penalty is 0 when shortage is 0%.
10. Happiness penalty increases linearly with shortage percentage.
11. Income multiplier is 1.0 when shortage is 0%.
12. Income multiplier decreases linearly with shortage percentage.
13. Income multiplier does not go below `(1.0 - GOODS_INCOME_PENALTY)`.
14. Traffic congestion reduces effective goods supply via industrial productivity multiplier.
15. Goods shortage warning fires when shortage > 25.
16. Severe goods shortage warning fires when shortage > 50.
17. Warnings clear when shortage drops below threshold.
18. Adding an industrial building reduces existing goods shortage.
19. Removing a commercial building reduces existing goods shortage.
20. Adding a commercial building without sufficient industrial capacity creates or worsens shortage.
21. Goods balance round-trips correctly through save/load.
