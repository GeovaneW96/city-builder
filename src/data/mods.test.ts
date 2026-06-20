import { describe, expect, it } from "vitest";
import { ALL_BUILDINGS } from "./buildings";
import { parseMod, validateMod } from "./mods";

describe("mods", () => {
  it("loads valid external definitions and rejects invalid balance data", () => {
    const mod = {
      id: "extra",
      balance: { tax: 1.2 },
      buildings: [{ ...ALL_BUILDINGS[0]!, id: "mod_home" }],
    };
    expect(parseMod(JSON.stringify(mod), ALL_BUILDINGS).id).toBe("extra");
    expect(
      validateMod({ id: "broken", balance: { tax: Number.NaN } }, ALL_BUILDINGS),
    ).toHaveLength(1);
  });
});
