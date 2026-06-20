import { describe, expect, it } from "vitest";
import { calculateMonthlyExpenses, calculateMonthlyIncome } from "./economy";
import { calculateCityMetrics } from "./metrics";
import { processCityCommand } from "../commands/process";
import { createInitialCityState } from "../state";
import type { BuildingInstance, CityState } from "../../shared/types";

it("creates, renames, and deletes a rectangular district without changing tiles otherwise", () => {
  const state = createInitialCityState();
  const created = processCityCommand(state, {
    type: "CREATE_DISTRICT",
    name: "Downtown",
    x1: 2,
    y1: 3,
    x2: 3,
    y2: 4,
  });
  const district = created.state.districts[0]!;

  expect(created.result.success).toBe(true);
  expect(district.tiles).toHaveLength(4);
  expect(created.state.map[3]![2]!.districtId).toBe(district.id);
  expect(
    processCityCommand(created.state, {
      type: "RENAME_DISTRICT",
      districtId: district.id,
      name: "Central",
    }).state.districts[0]!.name,
  ).toBe("Central");

  const deleted = processCityCommand(created.state, {
    type: "DELETE_DISTRICT",
    districtId: district.id,
  });
  expect(deleted.state.districts).toHaveLength(0);
  expect(deleted.state.map[3]![2]!.districtId).toBeNull();
});

it("rejects undersized or overlapping districts", () => {
  const state = createInitialCityState();
  expect(
    processCityCommand(state, {
      type: "CREATE_DISTRICT",
      name: "Tiny",
      x1: 1,
      y1: 1,
      x2: 1,
      y2: 2,
    }).result.success,
  ).toBe(false);

  const created = processCityCommand(state, {
    type: "CREATE_DISTRICT",
    name: "First",
    x1: 1,
    y1: 1,
    x2: 2,
    y2: 2,
  });
  expect(
    processCityCommand(created.state, {
      type: "CREATE_DISTRICT",
      name: "Second",
      x1: 2,
      y1: 2,
      x2: 3,
      y2: 3,
    }).result.success,
  ).toBe(false);
});

describe("district policies", () => {
  it("applies tax breaks only when requirements are met and includes monthly costs", () => {
    const state = createDistrictState();
    const district = state.districts[0]!;
    addBusinesses(state, 10);
    state.population.total = 60;
    const incomeBefore = calculateMonthlyIncome(state, calculateCityMetrics(state));

    const applied = processCityCommand(state, {
      type: "APPLY_DISTRICT_POLICY",
      districtId: district.id,
      policyId: "tax_break",
    });

    expect(applied.result.success).toBe(true);
    expect(calculateMonthlyExpenses(applied.state)).toBe(200);
    expect(
      calculateMonthlyIncome(applied.state, calculateCityMetrics(applied.state)),
    ).toBe(incomeBefore - 15);
    expect(
      processCityCommand(applied.state, {
        type: "APPLY_DISTRICT_POLICY",
        districtId: district.id,
        policyId: "tax_break",
      }).result.success,
    ).toBe(false);
  });

  it("enforces population and per-district policy limits", () => {
    const state = createDistrictState();
    const districtId = state.districts[0]!.id;
    expect(
      processCityCommand(state, {
        type: "APPLY_DISTRICT_POLICY",
        districtId,
        policyId: "smoking_ban",
      }).result.success,
    ).toBe(false);

    state.population.total = 1000;
    state.districts[0]!.policies = ["smoking_ban", "nightlife", "green_initiative"];
    expect(
      processCityCommand(state, {
        type: "APPLY_DISTRICT_POLICY",
        districtId,
        policyId: "service_priority",
      }).result.success,
    ).toBe(false);
  });
});

function createDistrictState(): CityState {
  const state = createInitialCityState();
  const result = processCityCommand(state, {
    type: "CREATE_DISTRICT",
    name: "Commerce",
    x1: 2,
    y1: 2,
    x2: 5,
    y2: 5,
  });
  return result.state;
}

function addBusinesses(state: CityState, amount: number): void {
  Array.from({ length: amount }, (_, index) => {
    const x = 2 + (index % 4);
    const y = 2 + Math.floor(index / 4);
    state.buildings.push(createBuilding(`shop:${index}`, "small_shop", x, y));
  });
}

function createBuilding(
  id: string,
  definitionId: string,
  x: number,
  y: number,
): BuildingInstance {
  return {
    id,
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
}
