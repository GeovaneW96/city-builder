import { describe, expect, it } from "vitest";
import {
  deserializeLeaderboard,
  recordCompletion,
  serializeLeaderboard,
} from "./leaderboard";

describe("scenario leaderboard", () => {
  it("sorts completion records and persists them as JSON", () => {
    const entries = recordCompletion([], {
      scenarioId: "first",
      cityName: "Slow",
      completionTicks: 20,
      completedAt: "2026-01-01",
    });
    const sorted = recordCompletion(entries, {
      scenarioId: "first",
      cityName: "Fast",
      completionTicks: 10,
      completedAt: "2026-01-02",
    });
    expect(
      deserializeLeaderboard(serializeLeaderboard(sorted)).map((entry) => entry.cityName),
    ).toEqual(["Fast", "Slow"]);
  });
});
