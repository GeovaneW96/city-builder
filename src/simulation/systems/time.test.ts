import { describe, expect, it } from "vitest";
import { createInitialCityState } from "../state";
import {
  advanceTime,
  DAYS_PER_MONTH,
  getCalendarTimeAfterHours,
  HOURS_PER_DAY,
  HOURS_PER_MONTH,
} from "./time";

describe("simulation calendar", () => {
  it("advances one day per simulation tick", () => {
    const state = createInitialCityState();
    state.time = { tick: 3, day: 18, hour: 19, month: 4, year: 1, speed: 1 };

    advanceTime(state);

    expect(state.time).toEqual({
      tick: 4,
      day: 19,
      hour: 8,
      month: 4,
      year: 1,
      speed: 1,
    });
  });

  it("rolls the month and year after the last day", () => {
    const state = createInitialCityState();
    state.time = {
      tick: 359,
      day: DAYS_PER_MONTH,
      hour: 19,
      month: 12,
      year: 1,
      speed: 1,
    };

    advanceTime(state);

    expect(state.time).toEqual({
      tick: 360,
      day: 1,
      hour: 8,
      month: 1,
      year: 2,
      speed: 1,
    });
  });

  it("advances the visible calendar by hours without changing the monthly tick", () => {
    const state = createInitialCityState();

    expect(getCalendarTimeAfterHours(state.time, 16)).toMatchObject({
      day: 2,
      hour: 0,
      month: 1,
      year: 1,
      tick: 0,
    });
    expect(getCalendarTimeAfterHours(state.time, HOURS_PER_DAY)).toMatchObject({
      day: 2,
      hour: 8,
      month: 1,
      year: 1,
      tick: 0,
    });
    expect(getCalendarTimeAfterHours(state.time, HOURS_PER_MONTH)).toMatchObject({
      day: 1,
      hour: 8,
      month: 2,
      year: 1,
      tick: 0,
    });
  });
});
