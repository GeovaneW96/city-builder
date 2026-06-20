import { describe, expect, it } from "vitest";
import { createInitialCityState } from "../state";
import type { BuildingInstance, CityState } from "../../shared/types";
import { calculateMonthlyIncome } from "./economy";
import { calculateGoodsState, recomputeGoods } from "./goods";
import { recomputeHappiness } from "./happiness";
import { calculateCityMetrics } from "./metrics";
import { rebuildWarnings } from "./warnings";

describe("commercial goods", () => {
  it("calculates commercial demand and industrial supply from jobs", () => {
    const state = createInitialCityState();
    addBuilding(state, "small_shop", 10, 10);
    addBuilding(state, "small_factory", 12, 10);

    recomputeGoods(state, calculateCityMetrics(state));

    expect(state.goods).toMatchObject({ demand: 12, supply: 36, balance: 24 });
    expect(state.goods.shortagePercentage).toBe(0);
  });

  it("calculates a capped commercial multiplier and happiness penalty for shortages", () => {
    const state = createInitialCityState();
    addBuilding(state, "small_shop", 10, 10);

    recomputeGoods(state, calculateCityMetrics(state));

    expect(state.goods).toMatchObject({
      demand: 12,
      supply: 0,
      balance: -12,
      shortagePercentage: 100,
      happinessPenalty: 15,
      commercialMultiplier: 0.5,
    });
  });

  it("has no shortage when a city has no commercial demand", () => {
    const state = createInitialCityState();
    addBuilding(state, "small_factory", 10, 10);

    recomputeGoods(state, calculateCityMetrics(state));

    expect(state.goods.shortagePercentage).toBe(0);
    expect(state.goods.commercialMultiplier).toBe(1);
  });

  it("scales industrial goods supply by the traffic productivity multiplier", () => {
    const state = createInitialCityState();
    addBuilding(state, "small_factory", 10, 10);
    const metrics = calculateCityMetrics(state);

    expect(calculateGoodsState(metrics, 0.5).supply).toBe(18);
    expect(calculateGoodsState(metrics, 1).supply).toBe(36);
  });
});

describe("goods shortage effects", () => {
  it("applies a goods shortage to commercial income and happiness", () => {
    const state = createInitialCityState();
    addBuilding(state, "small_house", 8, 8);
    addBuilding(state, "small_shop", 10, 10);
    state.population.total = 8;
    recomputeGoods(state, calculateCityMetrics(state));
    const incomeWithShortage = calculateMonthlyIncome(state, calculateCityMetrics(state));
    recomputeHappiness(state);

    state.goods.commercialMultiplier = 1;
    const incomeWithoutShortage = calculateMonthlyIncome(
      state,
      calculateCityMetrics(state),
    );

    expect(incomeWithShortage).toBeLessThan(incomeWithoutShortage);
    expect(state.happiness.components.goods).toBe(-15);
  });

  it("raises a severity-appropriate warning for goods shortages", () => {
    const state = createInitialCityState();
    state.goods.shortagePercentage = 40;
    rebuildWarnings(state);
    expect(state.warnings.map((warning) => warning.id)).toContain("city:goods-shortage");

    state.goods.shortagePercentage = 60;
    rebuildWarnings(state);
    expect(state.warnings.map((warning) => warning.id)).toContain(
      "city:severe-goods-shortage",
    );
  });
});

function addBuilding(
  state: CityState,
  definitionId: string,
  x: number,
  y: number,
): BuildingInstance {
  const building: BuildingInstance = {
    id: `${definitionId}:${x},${y}`,
    definitionId,
    position: [x, y],
    rotation: 0,
    status: "active",
    warnings: [],
    createdAtTick: 0,
    lockedUntilTick: 0,
    unresolvedWarningTicks: 0,
    upgradeTier: 1,
    lastUpgradeTick: 0,
  };
  state.buildings.push(building);
  return building;
}
