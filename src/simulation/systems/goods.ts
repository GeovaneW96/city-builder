import { GOODS_BALANCE } from "../../data/balance";
import type { CityState, GoodsState } from "../../shared/types";
import type { CityMetrics } from "./metrics";

export function recomputeGoods(state: CityState, metrics: CityMetrics): void {
  state.goods = calculateGoodsState(metrics, state.traffic.industrialMultiplier);
}

export function calculateGoodsState(
  metrics: CityMetrics,
  industrialMultiplier: number,
): GoodsState {
  const demand = metrics.commercialJobs * GOODS_BALANCE.GOODS_PER_JOB;
  const supply = Math.round(
    metrics.industrialJobs * industrialMultiplier * GOODS_BALANCE.GOODS_PER_WORKER,
  );
  const shortagePercentage = getShortagePercentage(demand, supply);
  return {
    demand,
    supply,
    balance: supply - demand,
    shortagePercentage,
    happinessPenalty: getHappinessPenalty(shortagePercentage),
    commercialMultiplier: getCommercialMultiplier(shortagePercentage),
  };
}

function getShortagePercentage(demand: number, supply: number): number {
  if (demand === 0 || supply >= demand) return 0;
  return Math.round(((demand - supply) / demand) * 1000) / 10;
}

function getHappinessPenalty(shortagePercentage: number): number {
  return Math.round(shortagePercentage * GOODS_BALANCE.HAPPINESS_WEIGHT * 10) / 10;
}

function getCommercialMultiplier(shortagePercentage: number): number {
  const reduction = (shortagePercentage / 100) * GOODS_BALANCE.INCOME_PENALTY;
  return Math.max(1 - GOODS_BALANCE.INCOME_PENALTY, 1 - reduction);
}
