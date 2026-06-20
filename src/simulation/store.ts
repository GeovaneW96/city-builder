import { create } from "zustand";
import type {
  CityState,
  GameCommand,
  CommandResult,
  SimulationTickResult,
  SimulationStore,
} from "../shared/types";
import { processCityCommand } from "./commands/process";
import { cloneCityState } from "./grid/map";
import { createInitialCityState } from "./state";
import { tickCity } from "./systems/tick";

export { createInitialCityState };

export const useSimulationStore = create<SimulationStore>()((set, get) => ({
  state: createInitialCityState(),

  tick(): SimulationTickResult {
    const result = tickCity(get().state);
    if (result.state !== get().state) set({ state: result.state });
    return result;
  },

  processCommand(command: GameCommand): CommandResult {
    const application = processCityCommand(get().state, command);
    if (application.result.success) set({ state: application.state });
    return application.result;
  },

  loadSave(save: CityState): void {
    set({ state: cloneCityState(save) });
  },

  getSaveData(): CityState {
    return cloneCityState(get().state);
  },
}));
