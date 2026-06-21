import type { BuildMode, CityState, UIState } from "../../shared/types";
import { getManualBuildings } from "../../data/buildings";
import { icon, type IconName } from "./icons";

export interface BottomPanelElements {
  root: HTMLElement;
  tabs: HTMLElement;
  content: HTMLElement;
  hint: HTMLElement;
}

type TabId = "roads" | "zones" | "buildings" | "specials";

interface TabDef {
  id: TabId;
  label: string;
}

const TABS: TabDef[] = [
  { id: "roads", label: "Roads" },
  { id: "zones", label: "Zones" },
  { id: "buildings", label: "Services" },
  { id: "specials", label: "Specials" },
];

interface ItemDef {
  id: string;
  label: string;
  icon: IconName;
  cost?: number;
  action: string;
  data?: Record<string, string>;
}

const ROAD_ITEMS: ItemDef[] = [
  {
    id: "dirt",
    label: "Dirt Road",
    icon: "road",
    action: "road",
    data: { roadtype: "dirt" },
  },
  {
    id: "paved",
    label: "Paved Road",
    icon: "road",
    action: "road",
    data: { roadtype: "paved" },
  },
];

const ZONE_ITEMS: ItemDef[] = [
  {
    id: "residential",
    label: "Residential",
    icon: "resident",
    action: "zone",
    data: { zone: "residential" },
  },
  {
    id: "commercial",
    label: "Commercial",
    icon: "commercial",
    action: "zone",
    data: { zone: "commercial" },
  },
  {
    id: "industrial",
    label: "Industrial",
    icon: "industrial",
    action: "zone",
    data: { zone: "industrial" },
  },
];

const SERVICE_ICONS: Record<string, IconName> = {
  park: "park",
  clinic: "clinic",
  hospital: "hospital",
  school: "school",
  university: "university",
  police_station: "police",
  fire_station: "fire",
  power_plant: "power",
  water_tower: "water",
  waste_management: "garbage",
  bus_depot: "transport",
  taxi_stand: "taxiStand",
  library: "school",
  community_center: "services",
  courthouse: "office",
};

function findEl(root: HTMLElement, key: string): HTMLElement {
  return root.querySelector(`[data-ui='${key}']`) ?? document.createElement("div");
}

export function createBottomPanel(): BottomPanelElements {
  const root = document.createElement("div");
  root.className = "bottom-panel";

  root.innerHTML = `
    <div class="bottom-tabs" data-ui="tabs"></div>
    <div class="bottom-content" data-ui="content"></div>
    <div class="bottom-hint" data-ui="hint">
      <span><kbd>Drag</kbd> to build</span>
      <span><kbd>R</kbd> to rotate</span>
      <span><kbd>Esc</kbd> to cancel</span>
    </div>
  `;

  return {
    root,
    tabs: findEl(root, "tabs"),
    content: findEl(root, "content"),
    hint: findEl(root, "hint"),
  };
}

let currentTab: TabId = "roads";
let lastBuildMode: BuildMode | null = null;
let lastStateKey = "";
let lastUiState: UIState | null = null;

function getStateKey(uiState: UIState | null): string {
  if (!uiState) return "";
  const { buildMode, selectedRoadType, selectedZoneType, selectedBuildingId } = uiState;
  return `${currentTab}:${buildMode ?? ""}:${selectedRoadType ?? ""}:${selectedZoneType ?? ""}:${selectedBuildingId ?? ""}`;
}

export function initBottomPanel(els: BottomPanelElements): void {
  renderTabs(els);
  renderContent(els, null);

  els.tabs.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".bottom-tab");
    if (!btn) return;
    const tabId = (btn.dataset.tab as TabId) ?? "roads";
    if (tabId === currentTab) return;
    currentTab = tabId;
    els.tabs.querySelectorAll(".bottom-tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderContent(els, lastUiState);
    lastStateKey = "";
  });
}

function renderTabs(els: BottomPanelElements): void {
  els.tabs.innerHTML = TABS.map(
    (tab) =>
      `<button class="bottom-tab ${tab.id === currentTab ? "active" : ""}" data-tab="${tab.id}">${tab.label}</button>`,
  ).join("");
}

function renderContent(els: BottomPanelElements, uiState: UIState | null): void {
  let items: ItemDef[] = [];

  switch (currentTab) {
    case "roads":
      items = ROAD_ITEMS;
      break;
    case "zones":
      items = ZONE_ITEMS;
      break;
    case "buildings":
      items = getManualBuildings()
        .filter((b) => b.id !== "city_hall")
        .map((b) => ({
          id: b.id,
          label: b.name,
          icon: (SERVICE_ICONS[b.id] ?? "services") as IconName,
          cost: b.cost,
          action: "building",
          data: { building: b.id },
        }));
      break;
    case "specials":
      items = [];
      break;
  }

  els.content.innerHTML = items
    .map((item) => {
      const active = isItemActive(item, uiState);
      return `
        <div class="item-card ${active ? "active" : ""}" data-action="${item.action}" ${Object.entries(
          item.data ?? {},
        )
          .map(([k, v]) => `data-${k.toLowerCase()}="${v}"`)
          .join(" ")}>
          <div class="item-card-icon">${icon(item.icon, 32)}</div>
          <div class="item-card-label">${item.label}</div>
          ${item.cost ? `<div class="item-card-cost">$${item.cost.toLocaleString()}</div>` : ""}
        </div>
      `;
    })
    .join("");
}

function getActiveSelection(item: ItemDef, uiState: UIState): string | null {
  const { buildMode } = uiState;
  if (item.action === "road" && buildMode === "road") return uiState.selectedRoadType;
  if (item.action === "zone" && buildMode === "zone") return uiState.selectedZoneType;
  if (item.action === "building" && buildMode === "building")
    return uiState.selectedBuildingId;
  return null;
}

function isItemActive(item: ItemDef, uiState: UIState | null): boolean {
  if (!uiState) return false;
  const selected = getActiveSelection(item, uiState);
  const dataValue = Object.values(item.data ?? {})[0];
  return selected != null && selected === dataValue;
}

export function updateBottomPanel(
  els: BottomPanelElements,
  _state: CityState,
  uiState: UIState,
): void {
  lastUiState = uiState;

  const { buildMode } = uiState;

  if (buildMode !== lastBuildMode) {
    lastBuildMode = buildMode;
    let newTab = currentTab;
    if (buildMode === "road") newTab = "roads";
    else if (buildMode === "zone") newTab = "zones";
    else if (buildMode === "building") newTab = "buildings";
    if (newTab !== currentTab) {
      currentTab = newTab;
      renderTabs(els);
    }
  }

  const stateKey = getStateKey(uiState);
  if (stateKey === lastStateKey) return;
  lastStateKey = stateKey;

  renderContent(els, uiState);
}
