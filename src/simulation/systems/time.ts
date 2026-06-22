import type { CityState, TimeState } from "../../shared/types";

export const DAYS_PER_MONTH = 30;
export const HOURS_PER_DAY = 24;
export const HOURS_PER_MONTH = DAYS_PER_MONTH * HOURS_PER_DAY;

export function getCalendarTimeAfterHours(time: TimeState, hours: number): TimeState {
  const totalHours =
    ((time.year - 1) * 12 + (time.month - 1)) * HOURS_PER_MONTH +
    (time.day - 1) * HOURS_PER_DAY +
    time.hour +
    Math.max(0, Math.floor(hours));
  const hoursPerYear = HOURS_PER_MONTH * 12;
  const year = Math.floor(totalHours / hoursPerYear) + 1;
  const hoursInYear = totalHours % hoursPerYear;
  const month = Math.floor(hoursInYear / HOURS_PER_MONTH) + 1;
  const hoursInMonth = hoursInYear % HOURS_PER_MONTH;

  return {
    ...time,
    year,
    month,
    day: Math.floor(hoursInMonth / HOURS_PER_DAY) + 1,
    hour: hoursInMonth % HOURS_PER_DAY,
  };
}

export function advanceTime(state: CityState): void {
  state.time.tick += 1;
  state.time.day = 1;
  state.time.hour = 8;
  if (state.time.month === 12) {
    state.time.month = 1;
    state.time.year += 1;
    return;
  }
  state.time.month += 1;
}
