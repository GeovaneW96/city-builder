import { describe, expect, it } from "vitest";
import { processCityCommand } from "../commands/process";
import { createInitialCityState } from "../state";
import type { CityState, Loan } from "../../shared/types";
import { runEconomy } from "./economy";
import { getMonthlyPayment, takeLoan } from "./loans";
import { calculateCityMetrics } from "./metrics";
import { rebuildWarnings } from "./warnings";

describe("loan issuance", () => {
  it("adds the selected principal and records a fixed repayment schedule", () => {
    const state = createEligibleState();

    const result = processCityCommand(state, { type: "TAKE_LOAN", loanType: "small" });

    expect(result.result.success).toBe(true);
    expect(result.state.economy.money).toBe(14999);
    expect(result.state.economy.loans[0]).toMatchObject({
      type: "small",
      principal: 5000,
      remainingMonths: 12,
      missedPayments: 0,
    });
    expect(result.state.economy.loans[0]?.monthlyPayment).toBeCloseTo(458.33, 2);
  });

  it("enforces low-funds eligibility, cooldowns, and the loan limit", () => {
    const state = createInitialCityState();
    expect(
      processCityCommand(state, { type: "TAKE_LOAN", loanType: "small" }).result.success,
    ).toBe(false);

    const eligible = createEligibleState();
    expect(takeLoan(eligible, "small")).toBeNull();
    eligible.economy.money = 0;
    expect(takeLoan(eligible, "medium")).toBe("Loan cooldown is active");

    eligible.time.tick = 20;
    eligible.economy.money = 0;
    eligible.economy.lastLoanTick = 0;
    eligible.economy.loans = [
      createLoan("small"),
      createLoan("medium"),
      createLoan("large"),
    ];
    expect(takeLoan(eligible, "small")).toBe("Maximum loans reached");
  });
});

describe("loan repayments", () => {
  it("deducts payments, resets missed payments, and removes paid-off loans", () => {
    const state = createInitialCityState();
    const loan = createLoan("small", 1, 2);
    state.economy.loans = [loan];
    state.economy.money = 1000;

    runEconomy(state, calculateCityMetrics(state));

    expect(state.economy.money).toBeCloseTo(541.67, 2);
    expect(state.economy.monthlyExpenses).toBeCloseTo(458.33, 2);
    expect(state.economy.loans).toHaveLength(0);
  });

  it("defaults the city after three consecutive missed payments", () => {
    const state = createInitialCityState();
    state.economy.loans = [createLoan("small")];
    state.economy.money = 0;

    runEconomy(state, calculateCityMetrics(state));
    runEconomy(state, calculateCityMetrics(state));
    expect(state.economy.loans[0]?.missedPayments).toBe(2);

    runEconomy(state, calculateCityMetrics(state));

    expect(state.economy.isBankrupt).toBe(true);
    expect(state.progression.scenarioStatus).toBe("lost");
  });

  it("reports outstanding and late loan payments through city warnings", () => {
    const state = createInitialCityState();
    state.economy.loans = [createLoan("small")];

    rebuildWarnings(state);
    expect(state.warnings.map((warning) => warning.id)).toContain(
      "city:outstanding-loans",
    );

    state.economy.loans[0]!.missedPayments = 2;
    rebuildWarnings(state);
    expect(
      state.warnings.find((warning) => warning.id === "city:loan-payment-due")?.severity,
    ).toBe("critical");
  });
});

function createEligibleState(): CityState {
  const state = createInitialCityState();
  state.economy.money = 9999;
  state.time.tick = 6;
  return state;
}

function createLoan(type: Loan["type"], remainingMonths = 12, missedPayments = 0): Loan {
  const principal = type === "small" ? 5000 : type === "medium" ? 10000 : 20000;
  return {
    id: `loan:${type}`,
    type,
    principal,
    monthlyPayment: getMonthlyPayment(principal),
    remainingMonths,
    missedPayments,
  };
}
