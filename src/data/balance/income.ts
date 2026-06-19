export const TAX_INCOME_FORMULAS = {
  RESIDENTIAL_BASE_PER_PERSON: 2,
  COMMERCIAL_BASE_PER_JOB: 5,
  INDUSTRIAL_BASE_PER_JOB: 6,
} as const;

export function calculateTaxIncome(baseAmount: number, taxRate: number): number {
  const multiplier = taxRate / 10;
  return baseAmount * multiplier;
}
