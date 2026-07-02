// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createInitialCityState } from "../../simulation/state";
import { useUIStore } from "../store";
import {
  createBottomPanel,
  selectBottomPanelTab,
  updateBottomPanel,
} from "./BottomPanel";

describe("bottom panel build catalog", () => {
  it("uses the generated power plant thumbnail in the utility catalog", () => {
    const panel = createBottomPanel();
    const state = createInitialCityState();

    selectBottomPanelTab(panel, "utilities");
    updateBottomPanel(panel, state, useUIStore.getState());

    const card = panel.content.querySelector<HTMLElement>(
      "[data-action='building'][data-building='power_plant']",
    );
    const image = card?.querySelector<HTMLImageElement>(".item-card-thumbnail img");

    expect(image?.getAttribute("src")).toBe("/assets/generated/hud/power_plant.png");
    expect(card?.querySelector(".item-card-icon")).toBeNull();
  });
});
