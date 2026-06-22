import { MILESTONES } from "../../data/unlocks/milestones";
import type {
  BuildMode,
  BuildingDefinition,
  CityState,
  UIState,
  ZoneType,
} from "../../shared/types";
import { getManualBuildings } from "../../data/buildings";
import { icon, type IconName } from "./icons";

export interface BottomPanelElements {
  root: HTMLElement;
  tabs: HTMLElement;
  content: HTMLElement;
  hint: HTMLElement;
}

export type BuildCatalogTab =
  | "roads"
  | "zones"
  | "buildings"
  | "utilities"
  | "decorations"
  | "specials";

interface TabDef {
  id: BuildCatalogTab;
  label: string;
}

const TABS: TabDef[] = [
  { id: "roads", label: "Roads" },
  { id: "zones", label: "Zones" },
  { id: "buildings", label: "Services" },
  { id: "utilities", label: "Utilities" },
  { id: "decorations", label: "Parks" },
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
      <span><kbd>Esc</kbd> to inspect</span>
    </div>
  `;

  return {
    root,
    tabs: findEl(root, "tabs"),
    content: findEl(root, "content"),
    hint: findEl(root, "hint"),
  };
}

let currentTab: BuildCatalogTab = "roads";
let lastBuildMode: BuildMode | null = null;
let lastStateKey = "";
let lastUiState: UIState | null = null;
let lastCityState: CityState | null = null;

function getStateKey(state: CityState, uiState: UIState | null): string {
  if (!uiState) return String(state.population.total);
  const { buildMode, selectedRoadType, selectedZoneType, selectedBuildingId } = uiState;
  return `${currentTab}:${buildMode ?? ""}:${selectedRoadType ?? ""}:${selectedZoneType ?? ""}:${selectedBuildingId ?? ""}:${state.population.total}:${state.progression.unlockedFeatures.join(",")}`;
}

export function initBottomPanel(els: BottomPanelElements): void {
  renderTabs(els);
  renderContent(els, null, null);

  els.tabs.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".bottom-tab");
    if (!btn) return;
    selectBottomPanelTab(els, (btn.dataset.tab as BuildCatalogTab) ?? "roads");
  });
}

export function selectBottomPanelTab(
  els: BottomPanelElements,
  tab: BuildCatalogTab,
): void {
  if (tab === currentTab) return;
  currentTab = tab;
  renderTabs(els);
  renderContent(els, lastCityState, lastUiState);
  lastStateKey = "";
}

export function getSelectedBottomPanelTab(): BuildCatalogTab {
  return currentTab;
}

function renderTabs(els: BottomPanelElements): void {
  els.tabs.innerHTML = TABS.map(
    (tab) =>
      `<button class="bottom-tab ${tab.id === currentTab ? "active" : ""}" data-tab="${tab.id}">${tab.label}</button>`,
  ).join("");
}

function renderContent(
  els: BottomPanelElements,
  state: CityState | null,
  uiState: UIState | null,
): void {
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
        .filter((building) => isServiceBuilding(building))
        .map(toBuildingItem);
      break;
    case "utilities":
      items = getManualBuildings()
        .filter((building) => building.category === "utility")
        .map(toBuildingItem);
      break;
    case "decorations":
      items = getManualBuildings()
        .filter((building) => building.category === "decoration")
        .map(toBuildingItem);
      break;
    case "specials":
      items = getManualBuildings()
        .filter(
          (building) =>
            building.category === "civic" || building.category === "commercial",
        )
        .filter((building) => building.id !== "city_hall")
        .map(toBuildingItem);
      break;
  }

  els.content.innerHTML = items
    .map((item) => {
      const active = isItemActive(item, uiState);
      const availability = getItemAvailability(item, state);
      return `
        <button type="button" class="item-card ${active ? "active" : ""} ${availability.locked ? "locked" : ""}" data-action="${item.action}" aria-pressed="${active}" ${availability.locked ? "disabled" : ""} ${Object.entries(
          item.data ?? {},
        )
          .map(([k, v]) => `data-${k.toLowerCase()}="${v}"`)
          .join(" ")}>
          <div class="item-card-icon">${icon(item.icon, 32)}</div>
          <div class="item-card-label">${item.label}</div>
          ${availability.requirement ? `<div class="item-card-requirement">${availability.requirement}</div>` : ""}
          ${item.cost ? `<div class="item-card-cost">$${item.cost.toLocaleString()}</div>` : ""}
        </button>
      `;
    })
    .join("");
}

function isServiceBuilding(building: BuildingDefinition): boolean {
  return (
    building.category === "service" ||
    building.category === "security" ||
    building.category === "transit"
  );
}

function toBuildingItem(building: BuildingDefinition): ItemDef {
  return {
    id: building.id,
    label: building.name,
    icon: (SERVICE_ICONS[building.id] ?? "services") as IconName,
    cost: building.cost,
    action: "building",
    data: { building: building.id },
  };
}

function getItemAvailability(
  item: ItemDef,
  state: CityState | null,
): { locked: boolean; requirement: string | null } {
  if (!state) return { locked: false, requirement: null };
  const zone = item.data?.zone as ZoneType | undefined;
  if (zone) return getZoneAvailability(state, zone);
  const buildingId = item.data?.building;
  if (!buildingId) return { locked: false, requirement: null };
  const building = getManualBuildings().find(
    (definition) => definition.id === buildingId,
  );
  return building
    ? getBuildingAvailability(state, building)
    : { locked: false, requirement: null };
}

function getZoneAvailability(
  state: CityState,
  zone: ZoneType,
): { locked: boolean; requirement: string | null } {
  const unlocked = state.progression.unlockedFeatures.includes(`${zone}_zoning`);
  return {
    locked: !unlocked,
    requirement: unlocked ? null : getUnlockRequirement(`${zone}_zoning`),
  };
}

function getBuildingAvailability(
  state: CityState,
  building: BuildingDefinition,
): { locked: boolean; requirement: string | null } {
  const unlocked =
    state.population.total >= building.unlockPopulation ||
    state.progression.unlockedFeatures.includes(building.id);
  if (!unlocked) {
    return { locked: true, requirement: getBuildingUnlockRequirement(building) };
  }
  return {
    locked: false,
    requirement: building.requirements.roadAccess ? "Requires adjacent road" : null,
  };
}

function getUnlockRequirement(feature: string): string {
  const milestone = MILESTONES.find((item) => item.unlocks.includes(feature));
  if (milestone) return `Unlock at ${milestone.population} population`;
  return "Unlock by population";
}

function getBuildingUnlockRequirement(building: BuildingDefinition): string {
  const milestoneRequirement = getUnlockRequirement(building.id);
  if (milestoneRequirement !== "Unlock by population") return milestoneRequirement;
  return `Unlock at ${building.unlockPopulation} population`;
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
  state: CityState,
  uiState: UIState,
): void {
  lastUiState = uiState;
  lastCityState = state;

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

  const stateKey = getStateKey(state, uiState);
  if (stateKey === lastStateKey) return;
  lastStateKey = stateKey;

  renderContent(els, state, uiState);
}
