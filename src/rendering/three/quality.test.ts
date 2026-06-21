import { describe, expect, it } from "vitest";
import { getRenderQualityProfile } from "./quality";

describe("render quality profiles", () => {
  it("keeps bloom and maximum city detail for higher presets", () => {
    expect(getRenderQualityProfile("low").bloom).toBe(false);
    expect(getRenderQualityProfile("medium").detailDensity).toBeLessThan(
      getRenderQualityProfile("high").detailDensity,
    );
    expect(getRenderQualityProfile("ultra")).toMatchObject({
      bloom: true,
      detailDensity: 1,
      shadowMapSize: 2048,
    });
  });
});
