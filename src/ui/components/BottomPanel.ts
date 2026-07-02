import { MILESTONES } from "../../data/unlocks/milestones";
import { CONSTRUCTION_COSTS, MONTHLY_UPKEEP, TRAFFIC_BALANCE } from "../../data/balance";
import type {
  BuildMode,
  BuildingDefinition,
  CityState,
  Road,
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
  thumbnailSrc?: string;
  cost?: number;
  unlockPopulation?: number;
  action: string;
  data?: Record<string, string>;
  building?: BuildingDefinition;
}

const ROAD_ITEMS: ItemDef[] = [
  {
    id: "dirt",
    label: "Dirt Road",
    icon: "road",
    cost: CONSTRUCTION_COSTS.DIRT_ROAD,
    action: "road",
    data: { roadtype: "dirt" },
  },
  {
    id: "paved",
    label: "Paved Road",
    icon: "road",
    cost: CONSTRUCTION_COSTS.PAVED_ROAD,
    action: "road",
    data: { roadtype: "paved" },
  },
  {
    id: "local",
    label: "Main Road",
    icon: "road",
    cost: TRAFFIC_BALANCE.LOCAL_ROAD_COST,
    action: "road",
    data: { roadtype: "local" },
  },
  {
    id: "collector",
    label: "Avenue",
    icon: "road",
    cost: TRAFFIC_BALANCE.COLLECTOR_ROAD_COST,
    unlockPopulation: 500,
    action: "road",
    data: { roadtype: "collector" },
  },
  {
    id: "arterial",
    label: "Highway",
    icon: "road",
    cost: TRAFFIC_BALANCE.ARTERIAL_ROAD_COST,
    unlockPopulation: 1000,
    action: "road",
    data: { roadtype: "arterial" },
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

const BUILDING_THUMBNAILS: Record<string, string> = {
  power_plant: "/assets/generated/hud/power_plant.png",
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
      <span><kbd>LMB</kbd> Place</span>
      <span>Hold <kbd>Shift</kbd> to place multiple</span>
      <span><kbd>R</kbd> Rotate</span>
      <span><kbd>Esc</kbd> Cancel</span>
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
        <button type="button" class="item-card item-card-${item.action} ${active ? "active" : ""} ${availability.locked ? "locked" : ""}" data-action="${item.action}" aria-pressed="${active}" ${availability.locked ? "disabled" : ""} ${Object.entries(
          item.data ?? {},
        )
          .map(([k, v]) => `data-${k.toLowerCase()}="${v}"`)
          .join(" ")}>
          ${renderItemVisual(item)}
          <div class="item-card-label">${item.label}</div>
          <div class="item-card-requirement ${availability.requirement ? "" : "empty"}">${availability.requirement ?? ""}</div>
          ${renderItemStats(item)}
        </button>
      `;
    })
    .join("");
}

function renderItemVisual(item: ItemDef): string {
  if (item.thumbnailSrc) {
    return `
      <div class="item-card-thumbnail" aria-hidden="true">
        <img src="${item.thumbnailSrc}" alt="" loading="lazy" decoding="async" />
      </div>
    `;
  }
  if (item.action !== "road") {
    return `<div class="item-card-icon">${icon(item.icon, 32)}</div>`;
  }
  return `
    <div class="road-card-preview road-card-preview-${item.id}">
      <span class="road-card-road"></span>
    </div>
  `;
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
    thumbnailSrc: BUILDING_THUMBNAILS[building.id],
    cost: building.cost,
    action: "building",
    data: { building: building.id },
    building,
  };
}

interface ItemStat {
  label: string;
  value: string;
  tone?: "positive" | "warning" | "negative";
}

const MAX_BUILDING_STATS = 5;

function renderItemStats(item: ItemDef): string {
  const stats = getItemStats(item);
  if (stats.length === 0) return "";
  return `
    <div class="item-card-stats">
      ${stats
        .map(
          (stat) => `
            <div class="item-card-stat ${stat.tone ?? ""}">
              <span>${stat.label}</span>
              <strong>${stat.value}</strong>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function getItemStats(item: ItemDef): ItemStat[] {
  if (item.action === "road") return getRoadStats(item);
  if (item.action === "building" && item.building) {
    return getBuildingStats(item.building);
  }
  if (item.action === "zone") return getZoneStats(item);
  return [];
}

function getRoadStats(item: ItemDef): ItemStat[] {
  const type = item.data?.roadtype as Road["type"] | undefined;
  if (!type) return [];
  return [
    { label: "Cost", value: `${formatMoney(item.cost ?? 0)}/cell`, tone: "positive" },
    { label: "Upkeep", value: `${formatMoney(getRoadUpkeep(type))}/mo` },
    { label: "Capacity", value: String(getRoadCapacity(type)) },
    { label: "Speed", value: `${formatRoadSpeed(getRoadSpeed(type))}x` },
  ];
}

function getZoneStats(item: ItemDef): ItemStat[] {
  const zoneType = item.data?.zone;
  const zoneLabel = zoneType ? formatLabel(zoneType) : "Zone";
  return [
    { label: "Cost", value: "$0/cell", tone: "positive" },
    { label: "Type", value: zoneLabel },
    { label: "Road", value: "Required" },
  ];
}

function getBuildingStats(building: BuildingDefinition): ItemStat[] {
  const baseStats: ItemStat[] = [
    { label: "Cost", value: formatMoney(building.cost), tone: "positive" },
    { label: "Upkeep", value: `${formatMoney(building.upkeep)}/mo` },
    { label: "Size", value: `${building.size[0]}x${building.size[1]}` },
  ];
  const effectStats = getPriorityEffectStats(building);
  return [...baseStats, ...effectStats.slice(0, MAX_BUILDING_STATS - baseStats.length)];
}

function getEffectStats(building: BuildingDefinition): ItemStat[] {
  return EFFECT_STAT_BUILDERS.map((create) => create(building)).filter(isItemStat);
}

function getPriorityEffectStats(building: BuildingDefinition): ItemStat[] {
  const stats = getEffectStats(building);
  const jobStat = stats.find((stat) => stat.label === "Jobs");
  const primaryStats = stats.filter((stat) => stat.label !== "Jobs");
  return jobStat ? [...primaryStats, jobStat] : primaryStats;
}

function isItemStat(stat: ItemStat | null): stat is ItemStat {
  return stat !== null;
}

type EffectStatBuilder = (building: BuildingDefinition) => ItemStat | null;

const EFFECT_STAT_BUILDERS: EffectStatBuilder[] = [
  (building) => getNumericEffectStat(building, "populationCapacity", "Residents"),
  (building) => getNumericEffectStat(building, "jobs", "Jobs"),
  (building) => getCapacityEffectStat(building, "powerCapacity", "Power", "MW"),
  (building) => getCapacityEffectStat(building, "waterCapacity", "Water", ""),
  (building) => getRadiusEffectStat(building, "healthRadius", "Health"),
  (building) => getRadiusEffectStat(building, "educationRadius", "Education"),
  (building) => getRadiusEffectStat(building, "policeRadius", "Police"),
  (building) => getRadiusEffectStat(building, "fireRadius", "Fire"),
  (building) => getGarbageEffectStat(building),
  (building) => getSignedEffectStat(building, "happiness", "Happiness", "positive"),
  (building) => getSignedEffectStat(building, "pollution", "Pollution", "warning"),
  (building) => getSignedEffectStat(building, "attractiveness", "Appeal"),
];

function getNumericEffectStat(
  building: BuildingDefinition,
  key: "populationCapacity" | "jobs",
  label: string,
): ItemStat | null {
  const value = building.effects[key];
  return value ? { label, value: String(value) } : null;
}

function getCapacityEffectStat(
  building: BuildingDefinition,
  key: "powerCapacity" | "waterCapacity",
  label: string,
  suffix: string,
): ItemStat | null {
  const value = building.effects[key];
  return value ? { label, value: `+${value}${suffix}`, tone: "positive" } : null;
}

function getRadiusEffectStat(
  building: BuildingDefinition,
  key: "healthRadius" | "educationRadius" | "policeRadius" | "fireRadius",
  label: string,
): ItemStat | null {
  const value = building.effects[key];
  return value ? { label, value: `${value} tiles` } : null;
}

function getGarbageEffectStat(building: BuildingDefinition): ItemStat | null {
  const value = building.effects.garbageCapacity;
  return value ? { label: "Garbage", value: `${value}/mo` } : null;
}

function getSignedEffectStat(
  building: BuildingDefinition,
  key: "happiness" | "pollution" | "attractiveness",
  label: string,
  tone?: ItemStat["tone"],
): ItemStat | null {
  const value = building.effects[key];
  return value ? { label, value: `+${value}`, tone } : null;
}

function getRoadCapacity(type: Road["type"]): number {
  if (type === "dirt") return TRAFFIC_BALANCE.DIRT_ROAD_CAPACITY;
  if (type === "paved") return TRAFFIC_BALANCE.PAVED_ROAD_CAPACITY;
  if (type === "local") return TRAFFIC_BALANCE.LOCAL_ROAD_CAPACITY;
  if (type === "collector") return TRAFFIC_BALANCE.COLLECTOR_ROAD_CAPACITY;
  return TRAFFIC_BALANCE.ARTERIAL_ROAD_CAPACITY;
}

function getRoadSpeed(type: Road["type"]): number {
  if (type === "dirt" || type === "local") return TRAFFIC_BALANCE.LOCAL_ROAD_SPEED;
  if (type === "paved" || type === "collector")
    return TRAFFIC_BALANCE.COLLECTOR_ROAD_SPEED;
  return TRAFFIC_BALANCE.ARTERIAL_ROAD_SPEED;
}

function getRoadUpkeep(type: Road["type"]): number {
  if (type === "dirt") return MONTHLY_UPKEEP.DIRT_ROAD_PER_TILE;
  if (type === "paved") return MONTHLY_UPKEEP.PAVED_ROAD_PER_TILE;
  if (type === "local") return TRAFFIC_BALANCE.LOCAL_ROAD_UPKEEP;
  if (type === "collector") return TRAFFIC_BALANCE.COLLECTOR_ROAD_UPKEEP;
  return TRAFFIC_BALANCE.ARTERIAL_ROAD_UPKEEP;
}

function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function formatRoadSpeed(speed: number): string {
  return Number.isInteger(speed) ? String(speed) : speed.toFixed(1);
}

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getItemAvailability(
  item: ItemDef,
  state: CityState | null,
): { locked: boolean; requirement: string | null } {
  if (!state) return { locked: false, requirement: null };
  if (item.unlockPopulation && state.population.total < item.unlockPopulation) {
    return {
      locked: true,
      requirement: `Reaches ${item.unlockPopulation.toLocaleString()} population`,
    };
  }
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
