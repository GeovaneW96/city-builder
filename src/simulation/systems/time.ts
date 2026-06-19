import type { CityState } from "../../shared/types";

export function advanceTime(state: CityState): void {
  state.time.tick += 1;
  if (state.time.month === 12) {
    state.time.month = 1;
    state.time.year += 1;
    return;
  }
  state.time.month += 1;
}
