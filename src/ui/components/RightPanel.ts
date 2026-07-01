import type {
  BuildingDefinition,
  BuildingInstance,
  CityState,
  UIState,
  Warning,
} from "../../shared/types";
import { getBuildingById } from "../../data/buildings";
import { icon, type IconName } from "./icons";

export interface RightPanelElements {
  root: HTMLElement;
  overview: HTMLElement;
  inspector: HTMLElement;
  notifications: HTMLElement;
  projects: HTMLElement;
  saveControls: HTMLElement;
}

function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function findEl(root: HTMLElement, key: string): HTMLElement {
  return root.querySelector(`[data-ui='${key}']`) ?? document.createElement("div");
}

export function createRightPanel(): RightPanelElements {
  const root = document.createElement("aside");
  root.className = "right-panel";

  root.innerHTML = `
    <div class="right-panel-section" data-ui="inspector">
      <div class="right-panel-header">
        <span class="right-panel-title">Inspector</span>
      </div>
      <p style="font-size:11px;color:var(--text-muted)">Select a tile</p>
    </div>
    <div class="right-panel-section" data-ui="notifications">
      <div class="right-panel-header">
        <span class="right-panel-title">Notifications</span>
        <span class="right-panel-header-icon">${icon("bell", 16)}</span>
      </div>
      <div id="notification-list"></div>
    </div>
    <div class="right-panel-section" data-ui="projects">
      <div class="right-panel-header">
        <span class="right-panel-title">Active Projects</span>
      </div>
      <div id="project-list"></div>
    </div>
    <div class="right-panel-section" data-ui="save-controls" style="border-top:1px solid var(--border)">
      <div class="right-panel-header">
        <span class="right-panel-title">Save / Load</span>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap">
        <button data-action="save" style="flex:1;min-width:50px;font-size:10px;padding:4px 6px">Save</button>
        <button data-action="load" style="flex:1;min-width:50px;font-size:10px;padding:4px 6px">Load</button>
        <button data-action="export-save" style="flex:1;min-width:50px;font-size:10px;padding:4px 6px">Export</button>
        <button data-action="import-save" style="flex:1;min-width:50px;font-size:10px;padding:4px 6px">Import</button>
      </div>
    </div>
  `;

  return {
    root,
    overview: findEl(root, "overview"),
    inspector: findEl(root, "inspector"),
    notifications: findEl(root, "notifications"),
    projects: findEl(root, "projects"),
    saveControls: findEl(root, "save-controls"),
  };
}

export function updateRightPanel(
  els: RightPanelElements,
  state: CityState,
  uiState: UIState,
): void {
  els.root.classList.toggle("has-selection", uiState.selectedTile !== null);
  updateInspector(els.inspector, state, uiState);
  updateNotifications(els.notifications, state);
}

function renderBuildingInfo(
  tile: { buildingId: string | null },
  state: CityState,
): string {
  if (!tile.buildingId) return "";
  const building = state.buildings.find((b) => b.id === tile.buildingId);
  const def = building ? getBuildingById(building.definitionId) : null;
  if (!building || !def) return "";
  return `
    <div style="margin-bottom:6px">
      <div style="font-size:13px;font-weight:700">${def.name}</div>
      <div style="font-size:10px;color:var(--text-muted);text-transform:capitalize">${building?.status ?? "unknown"}</div>
    </div>
    <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px">
      <div>Cost: ${formatMoney(def.cost)}</div>
      <div>Upkeep: ${formatMoney(def.upkeep)}/mo</div>
      ${renderOccupancyInfo(building, def)}
      ${renderServiceEffects(def)}
      ${renderGarbageInfo(def, state)}
    </div>
  `;
}

function renderServiceEffects(definition: BuildingDefinition): string {
  const { healthRadius, educationRadius, powerCapacity, waterCapacity } =
    definition.effects;
  return [
    healthRadius ? `<div>Health: ${healthRadius} radius</div>` : "",
    educationRadius ? `<div>Education: ${educationRadius} radius</div>` : "",
    powerCapacity ? `<div>Power: ${powerCapacity} MW</div>` : "",
    waterCapacity ? `<div>Water: ${waterCapacity} units</div>` : "",
  ].join("");
}

function renderOccupancyInfo(
  building: BuildingInstance,
  definition: BuildingDefinition,
): string {
  const active = building.status === "active";
  const residents = definition.effects.populationCapacity;
  const jobs = definition.effects.jobs;
  return [
    residents ? `<div>Residents: ${active ? residents : 0} / ${residents}</div>` : "",
    jobs ? `<div>Jobs provided: ${active ? jobs : 0} / ${jobs}</div>` : "",
  ].join("");
}

function renderGarbageInfo(definition: BuildingDefinition, state: CityState): string {
  if (!definition.effects.garbageCapacity) return "";
  const { garbageCapacity, garbageCollectionRadius } = definition.effects;
  return `<div>Collection: ${garbageCapacity}/mo, ${garbageCollectionRadius ?? 0}-tile range</div><div>City coverage: ${state.extendedServices.garbageCoverage}%</div>`;
}

function renderRoadInfo(
  tile: { roadId: string | null },
  state: CityState,
  x: number,
  y: number,
): string {
  if (!tile.roadId) return "";
  const road = state.roads.find((r) => r.id === tile.roadId);
  return `
    <div style="font-size:13px;font-weight:700">Road</div>
    <div style="font-size:11px;color:var(--text-secondary)">
      <div>Type: ${road?.type ?? "unknown"}</div>
      <div>Position: ${x}, ${y}</div>
    </div>
  `;
}

function renderZoneInfo(
  tile: { zone: string | null; pollution: number; landValue: number | null },
  state: CityState,
  x: number,
  y: number,
): string {
  if (!tile.zone) return "";
  return `
    <div style="font-size:13px;font-weight:700;text-transform:capitalize">${tile.zone} Zone</div>
    <div style="font-size:11px;color:var(--text-secondary)">
      <div>Position: ${x}, ${y}</div>
      <div>Pollution: ${Math.round(tile.pollution)}%</div>
      ${tile.landValue != null ? `<div>Land value: ${Math.round(tile.landValue)}</div>` : ""}
      <div>${getZoneGrowthStatus(state, tile.zone, x, y)}</div>
    </div>
  `;
}

function getZoneGrowthStatus(
  state: CityState,
  zone: string,
  x: number,
  y: number,
): string {
  if (!hasAdjacentRoad(state, x, y)) return "Growth blocked: needs an adjacent road.";
  const demand = getZoneDemand(state, zone);
  if (demand < 10) return `Growth waiting: ${demand}% demand.`;
  return `Ready to grow: ${demand}% demand.`;
}

function hasAdjacentRoad(state: CityState, x: number, y: number): boolean {
  return [
    state.map[y - 1]?.[x],
    state.map[y]?.[x + 1],
    state.map[y + 1]?.[x],
    state.map[y]?.[x - 1],
  ].some((tile) => Boolean(tile?.roadId));
}

function getZoneDemand(state: CityState, zone: string): number {
  if (zone.includes("residential")) return state.demand.residential;
  if (zone.includes("commercial") || zone === "office") return state.demand.commercial;
  return state.demand.industrial;
}

function renderEmptyInfo(
  tile: { terrain: string; pollution: number },
  x: number,
  y: number,
): string {
  return `
    <div style="font-size:13px;font-weight:700">Empty Tile</div>
    <div style="font-size:11px;color:var(--text-secondary)">
      <div>Position: ${x}, ${y}</div>
      <div>Terrain: ${tile.terrain}</div>
      <div>Pollution: ${Math.round(tile.pollution)}%</div>
    </div>
  `;
}

function renderPreviewInfo(preview: { valid: boolean; cost: number }): string {
  return `
    <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
      <div style="font-size:11px;color:${preview.valid ? "var(--positive)" : "var(--negative)"}">
        ${preview.valid ? "Valid" : "Invalid"} placement
        ${preview.cost > 0 ? ` \u2014 ${formatMoney(preview.cost)}` : ""}
      </div>
    </div>
  `;
}

function updateInspector(
  container: HTMLElement,
  state: CityState,
  uiState: UIState,
): void {
  const tilePos = uiState.selectedTile;
  if (!tilePos) {
    container.innerHTML = `
      <div class="right-panel-header">
        <span class="right-panel-title">Inspector</span>
      </div>
      <p style="font-size:11px;color:var(--text-muted)">Select a tile to inspect</p>
    `;
    return;
  }

  const [x, y] = tilePos;
  const tile = state.map[y]?.[x];
  if (!tile) {
    container.innerHTML = `
      <div class="right-panel-header">
        <span class="right-panel-title">Inspector</span>
      </div>
      <p style="font-size:11px;color:var(--text-muted)">Invalid tile</p>
    `;
    return;
  }

  let html = `<div class="right-panel-header"><span class="right-panel-title">Inspector</span></div>`;

  if (tile.buildingId) {
    html += renderBuildingInfo(tile, state);
  } else if (tile.roadId) {
    html += renderRoadInfo(tile, state, x, y);
  } else if (tile.zone) {
    html += renderZoneInfo(tile, state, x, y);
  } else {
    html += renderEmptyInfo(tile, x, y);
  }

  if (uiState.placementPreview) {
    html += renderPreviewInfo(uiState.placementPreview);
  }

  container.innerHTML = html;
}

function updateNotifications(container: HTMLElement, state: CityState): void {
  const listEl = container.querySelector("#notification-list");
  if (!listEl) return;

  const warnings = groupWarnings(state.warnings).slice(0, 5);
  if (warnings.length === 0) {
    listEl.innerHTML = `
      <div class="notification-item">
        <div class="notification-icon positive">${icon("bell", 14)}</div>
        <div class="notification-text">
          <div class="notification-title">No active issues</div>
          <div class="notification-desc">City systems are stable</div>
          <div class="notification-meta">Just now</div>
        </div>
      </div>
      <button class="notification-footer" type="button">View all notifications</button>
    `;
    return;
  }

  listEl.innerHTML = `${warnings
    .map(({ warning, count }) => {
      const severityIcon = getSeverityIcon(warning.severity);
      const severityClass = getSeverityClass(warning);
      return `
        <div class="notification-item">
          <div class="notification-icon ${severityClass}">${icon(severityIcon, 16)}</div>
          <div class="notification-text">
            <div class="notification-title">${warning.message}${count > 1 ? ` (${count})` : ""}</div>
            <div class="notification-desc">${warning.suggestedFix}</div>
            <div class="notification-meta">Just now</div>
          </div>
        </div>
      `;
    })
    .join("")}
    <button class="notification-footer" type="button">View all notifications</button>
  `;
}

function groupWarnings(warnings: Warning[]): { warning: Warning; count: number }[] {
  const grouped = new Map<string, { warning: Warning; count: number }>();
  warnings.forEach((warning) => {
    const key = `${warning.message}:${warning.suggestedFix}`;
    const existing = grouped.get(key);
    if (existing) existing.count += 1;
    else grouped.set(key, { warning, count: 1 });
  });
  return [...grouped.values()];
}

function getSeverityIcon(severity: Warning["severity"]): IconName {
  switch (severity) {
    case "critical":
      return "demolish";
    case "high":
      return "demolish";
    case "medium":
      return "bell";
    case "low":
      return "bell";
    default:
      return "bell";
  }
}

function getSeverityClass(w: Warning): string {
  if (w.severity === "critical" || w.severity === "high") return "warning";
  if (w.severity === "low") return "positive";
  return "commercial";
}
