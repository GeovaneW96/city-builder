import type { CityState, UIState } from "../shared/types";
import { injectTheme } from "./styles/theme";
import { createTopBar, updateTopBar, type TopBarElements } from "./components/TopBar";
import {
  createLeftSidebar,
  updateLeftSidebar,
  type SidebarElements,
} from "./components/LeftSidebar";
import {
  createBottomPanel,
  initBottomPanel,
  updateBottomPanel,
  type BottomPanelElements,
} from "./components/BottomPanel";
import {
  createRightPanel,
  updateRightPanel,
  type RightPanelElements,
} from "./components/RightPanel";
import { createMiniMap, updateMiniMap, type MiniMapElements } from "./components/MiniMap";
import {
  createDashboard,
  initDashboard,
  showDashboard,
  hideDashboard,
  updateDashboard,
  type DashboardElements,
} from "./components/Dashboard";

export interface GameUI {
  root: HTMLElement;
  topBar: TopBarElements;
  sidebar: SidebarElements;
  bottomPanel: BottomPanelElements;
  rightPanel: RightPanelElements;
  miniMap: MiniMapElements;
  dashboard: DashboardElements;
  status: HTMLElement;
  importFile: HTMLInputElement;
}

let dashboardMode = false;

export function createGameUI(container: HTMLElement): GameUI {
  injectTheme();

  const root = document.createElement("section");
  root.className = "game-ui";

  const topBar = createTopBar();
  const sidebar = createLeftSidebar();
  const bottomPanel = createBottomPanel();
  const rightPanel = createRightPanel();
  const miniMap = createMiniMap();
  const dashboard = createDashboard();

  const status = document.createElement("div");
  status.className = "status-bar";
  status.setAttribute("role", "status");

  const importFile = document.createElement("input");
  importFile.type = "file";
  importFile.accept = "application/json,.json";
  importFile.hidden = true;

  root.appendChild(topBar.root);
  root.appendChild(sidebar.root);
  root.appendChild(bottomPanel.root);
  root.appendChild(rightPanel.root);
  root.appendChild(miniMap.root);
  root.appendChild(dashboard.root);
  root.appendChild(status);
  root.appendChild(importFile);

  container.appendChild(root);

  initBottomPanel(bottomPanel);
  initDashboard(dashboard, () => {});

  return {
    root,
    topBar,
    sidebar,
    bottomPanel,
    rightPanel,
    miniMap,
    dashboard,
    status,
    importFile,
  };
}

export function updateGameUI(ui: GameUI, state: CityState, uiState: UIState): void {
  updateTopBar(ui.topBar, state, uiState);
  updateLeftSidebar(ui.sidebar, uiState.buildMode);
  updateBottomPanel(ui.bottomPanel, state, uiState);
  updateRightPanel(ui.rightPanel, state, uiState);
  updateMiniMap(ui.miniMap, state);

  if (dashboardMode) {
    updateDashboard(ui.dashboard, state);
  }
}

export function toggleDashboardMode(ui: GameUI): void {
  dashboardMode = !dashboardMode;
  ui.rightPanel.root.classList.toggle("dashboard-active", dashboardMode);
  if (dashboardMode) {
    showDashboard(ui.dashboard);
    ui.bottomPanel.root.style.display = "none";
  } else {
    hideDashboard(ui.dashboard);
    ui.bottomPanel.root.style.display = "";
  }
}

export function isDashboardActive(): boolean {
  return dashboardMode;
}

export function showStatus(ui: GameUI, message: string, durationMs = 2000): void {
  ui.status.textContent = message;
  ui.status.classList.add("visible");
  setTimeout(() => ui.status.classList.remove("visible"), durationMs);
}
