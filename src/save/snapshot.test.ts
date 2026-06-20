import { describe, expect, it } from "vitest";
import { createInitialCityState } from "../simulation/state";
import { exportCitySnapshot, importCitySnapshot } from "./snapshot";

describe("city snapshots", () => {
  it("round-trips city identity and state through a shareable string", () => {
    const state = createInitialCityState();
    state.population.total = 123;
    state.rating.grade = "B";
    const snapshot = importCitySnapshot(exportCitySnapshot(state, "Harbor"));
    expect(snapshot).toMatchObject({ cityName: "Harbor", population: 123, rating: "B" });
    expect(snapshot.state.population.total).toBe(123);
  });
});
