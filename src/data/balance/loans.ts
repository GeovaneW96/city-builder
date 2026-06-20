export const LOAN_BALANCE = {
  ANNUAL_RATE: 0.1,
  TERM_MONTHS: 12,
  MAX_LOANS: 3,
  MAX_MISSED_PAYMENTS: 3,
  ELIGIBILITY_THRESHOLD: 10000,
  COOLDOWN_TICKS: 6,
} as const;

export const LOAN_PRINCIPALS = {
  small: 5000,
  medium: 10000,
  large: 20000,
} as const;
