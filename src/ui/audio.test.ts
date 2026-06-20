import { describe, expect, it } from "vitest";
import { getFeedbackSound } from "./audio";

describe("getFeedbackSound", () => {
  it("maps player placements to the placement sound", () => {
    expect(
      getFeedbackSound({ type: "ROAD_PLACED", x: 1, y: 2, roadId: "road:1,2" }),
    ).toBe("placement");
    expect(
      getFeedbackSound({ type: "ZONE_PAINTED", x: 1, y: 2, zoneType: "residential" }),
    ).toBe("placement");
    expect(
      getFeedbackSound({ type: "BUILDING_ADDED", buildingId: "house:1", x: 1, y: 2 }),
    ).toBe("placement");
  });

  it("maps milestone and newly-added warning events to distinct sounds", () => {
    expect(
      getFeedbackSound({
        type: "MILESTONE_REACHED",
        milestone: "Hamlet",
        population: 50,
      }),
    ).toBe("milestone");
    expect(
      getFeedbackSound({
        type: "WARNING_ADDED",
        warning: {
          id: "city:low-happiness",
          severity: "medium",
          message: "Happiness is low.",
          suggestedFix: "Add a park.",
        },
      }),
    ).toBe("warning");
  });

  it("ignores events without player-facing audio", () => {
    expect(getFeedbackSound({ type: "TILE_CHANGED", x: 2, y: 3 })).toBeNull();
    expect(
      getFeedbackSound({ type: "WARNING_REMOVED", warningId: "city:low-happiness" }),
    ).toBe(null);
  });
});
