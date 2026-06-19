export const TAX_HAPPINESS_EFFECT: Record<string, number> = {
  "0-8": 4,
  "9-10": 0,
  "11-12": -4,
  "13-15": -10,
  "16+": -20,
};

export const DEFAULT_TAX_RATE = 10;

export function getTaxHappinessModifier(rate: number): number {
  if (rate <= 8) return 4;
  if (rate <= 10) return 0;
  if (rate <= 12) return -4;
  if (rate <= 15) return -10;
  return -20;
}
