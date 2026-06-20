export interface EntitlementState {
  premium: boolean;
}

export function createEntitlementState(premium = false): EntitlementState {
  return { premium };
}

export function isPremiumFeatureAvailable(state: EntitlementState): boolean {
  return state.premium;
}

export function serializeEntitlement(state: EntitlementState): string {
  return JSON.stringify(state);
}

export function deserializeEntitlement(serialized: string): EntitlementState {
  const parsed = JSON.parse(serialized) as Partial<EntitlementState>;
  return { premium: parsed.premium === true };
}
