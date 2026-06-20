import { LOAN_BALANCE, LOAN_PRINCIPALS } from "../../data/balance";
import type { CityState, Loan, LoanType } from "../../shared/types";

export function takeLoan(state: CityState, loanType: LoanType): string | null {
  const validation = validateLoan(state);
  if (validation) return validation;
  const principal = LOAN_PRINCIPALS[loanType];
  state.economy.loans.push({
    id: `loan:${loanType}:${state.time.tick}`,
    type: loanType,
    principal,
    monthlyPayment: getMonthlyPayment(principal),
    remainingMonths: LOAN_BALANCE.TERM_MONTHS,
    missedPayments: 0,
  });
  state.economy.money += principal;
  state.economy.lastLoanTick = state.time.tick;
  return null;
}

export function processLoanPayments(state: CityState): number {
  let paid = 0;
  state.economy.loans.forEach((loan) => {
    paid += processLoanPayment(state, loan);
  });
  state.economy.loans = state.economy.loans.filter((loan) => loan.remainingMonths > 0);
  return paid;
}

export function getMonthlyPayment(principal: number): number {
  return (principal * (1 + LOAN_BALANCE.ANNUAL_RATE)) / LOAN_BALANCE.TERM_MONTHS;
}

function validateLoan(state: CityState): string | null {
  if (state.economy.money >= LOAN_BALANCE.ELIGIBILITY_THRESHOLD) {
    return "Loans are available only when funds are low";
  }
  if (state.economy.loans.length >= LOAN_BALANCE.MAX_LOANS)
    return "Maximum loans reached";
  if (state.time.tick - state.economy.lastLoanTick < LOAN_BALANCE.COOLDOWN_TICKS) {
    return "Loan cooldown is active";
  }
  return null;
}

function processLoanPayment(state: CityState, loan: Loan): number {
  if (state.economy.money >= loan.monthlyPayment) {
    state.economy.money -= loan.monthlyPayment;
    loan.remainingMonths -= 1;
    loan.missedPayments = 0;
    return loan.monthlyPayment;
  }
  loan.missedPayments += 1;
  if (loan.missedPayments >= LOAN_BALANCE.MAX_MISSED_PAYMENTS) {
    state.economy.isBankrupt = true;
    state.progression.scenarioStatus = "lost";
  }
  return 0;
}
