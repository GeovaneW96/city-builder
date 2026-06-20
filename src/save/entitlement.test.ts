import { describe, expect, it } from "vitest";
import {
  createEntitlementState,
  deserializeEntitlement,
  isPremiumFeatureAvailable,
  serializeEntitlement,
} from "./entitlement";

describe("premium entitlement", () => {
  it("defaults to a fully usable non-premium state and persists premium state", () => {
    expect(isPremiumFeatureAvailable(createEntitlementState())).toBe(false);
    expect(
      deserializeEntitlement(serializeEntitlement(createEntitlementState(true))).premium,
    ).toBe(true);
  });
});
