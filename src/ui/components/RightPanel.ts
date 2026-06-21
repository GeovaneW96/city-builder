import type { CityState, UIState, Warning } from "../../shared/types";
import { getBuildingById } from "../../data/buildings";
import { icon, type IconName } from "./icons";

export interface RightPanelElements {
  root: HTMLElement;
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
    <div class="right-panel-section" data-ui="zone-legend">
      <div class="right-panel-header">
        <span class="right-panel-title">Zone Legend</span>
      </div>
      <div class="zone-legend-item">
        <div class="zone-legend-dot" style="background:#4ade80"></div>
        <div>
          <div class="zone-legend-label">Residential</div>
          <div class="zone-legend-desc">Houses & apartments</div>
        </div>
      </div>
      <div class="zone-legend-item">
        <div class="zone-legend-dot" style="background:#60a5fa"></div>
        <div>
          <div class="zone-legend-label">Commercial</div>
          <div class="zone-legend-desc">Shops & services</div>
        </div>
      </div>
      <div class="zone-legend-item">
        <div class="zone-legend-dot" style="background:#fb923c"></div>
        <div>
          <div class="zone-legend-label">Industrial</div>
          <div class="zone-legend-desc">Factories & warehouses</div>
        </div>
      </div>
    </div>
    <div class="right-panel-section" data-ui="notifications">
      <div class="right-panel-header">
        <span class="right-panel-title">Notifications</span>
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
  if (!def) return "";
  return `
    <div style="margin-bottom:6px">
      <div style="font-size:13px;font-weight:700">${def.name}</div>
      <div style="font-size:10px;color:var(--text-muted);text-transform:capitalize">${building?.status ?? "unknown"}</div>
    </div>
    <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px">
      <div>Cost: ${formatMoney(def.cost)}</div>
      <div>Upkeep: ${formatMoney(def.upkeep)}/mo</div>
      ${def.effects.populationCapacity ? `<div>Capacity: ${def.effects.populationCapacity}</div>` : ""}
      ${def.effects.jobs ? `<div>Jobs: ${def.effects.jobs}</div>` : ""}
      ${def.effects.healthRadius ? `<div>Health: ${def.effects.healthRadius} radius</div>` : ""}
      ${def.effects.educationRadius ? `<div>Education: ${def.effects.educationRadius} radius</div>` : ""}
    </div>
  `;
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
    </div>
  `;
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
    html += renderZoneInfo(tile, x, y);
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

  const warnings = state.warnings.slice(0, 5);
  if (warnings.length === 0) {
    listEl.innerHTML = `<p style="font-size:11px;color:var(--text-muted)">No notifications</p>`;
    return;
  }

  listEl.innerHTML = warnings
    .map((w) => {
      const severityIcon = getSeverityIcon(w.severity);
      const severityClass = getSeverityClass(w);
      return `
        <div class="notification-item">
          <div class="notification-icon ${severityClass}">${icon(severityIcon, 14)}</div>
          <div class="notification-text">
            <div class="notification-title">${w.message}</div>
            <div class="notification-desc">${w.suggestedFix}</div>
          </div>
        </div>
      `;
    })
    .join("");
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
  return "commercial";
}
