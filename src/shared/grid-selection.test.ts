import { describe, expect, it } from "vitest";
import { getGridLine, getGridRectangle } from "./grid-selection";

describe("grid selection helpers", () => {
  it("keeps line selections for road-style drag placement", () => {
    expect(getGridLine([2, 3], [5, 3])).toEqual([
      [2, 3],
      [3, 3],
      [4, 3],
      [5, 3],
    ]);
  });

  it("creates rectangular selections for zone drag placement", () => {
    expect(getGridRectangle([2, 3], [4, 5])).toEqual([
      [2, 3],
      [3, 3],
      [4, 3],
      [2, 4],
      [3, 4],
      [4, 4],
      [2, 5],
      [3, 5],
      [4, 5],
    ]);
  });

  it("creates rectangles regardless of drag direction", () => {
    expect(getGridRectangle([4, 5], [2, 3])).toEqual(getGridRectangle([2, 3], [4, 5]));
  });
});
