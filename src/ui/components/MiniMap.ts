import type { CityState } from "../../shared/types";
import { icon } from "./icons";

export interface MiniMapElements {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
}

const MAP_SIZE = 160;
const TERRAIN_COLORS: Record<string, string> = {
  grass: "#2d5a3d",
  water: "#1a4a6e",
  blocked: "#3a3a4a",
};

const ZONE_COLORS: Record<string, string> = {
  residential: "#4ade80",
  commercial: "#60a5fa",
  industrial: "#fb923c",
  medium_residential: "#22c55e",
  medium_commercial: "#3b82f6",
  medium_industrial: "#f97316",
  high_residential: "#16a34a",
  high_commercial: "#2563eb",
  office: "#a78bfa",
};

export function createMiniMap(): MiniMapElements {
  const root = document.createElement("div");
  root.className = "minimap";

  root.innerHTML = `
    <div class="minimap-header">
      <span class="minimap-title">Minimap</span>
      <div class="minimap-controls">
        <button class="minimap-btn" data-action="minimap-expand" title="Expand">${icon("expand", 12)}</button>
        <button class="minimap-btn" data-action="minimap-close" title="Close">${icon("close", 12)}</button>
      </div>
    </div>
  `;

  const canvas = document.createElement("canvas");
  canvas.width = MAP_SIZE;
  canvas.height = MAP_SIZE;
  canvas.style.width = "100%";
  canvas.style.aspectRatio = "1";
  root.appendChild(canvas);

  return { root, canvas };
}

function getTileColor(tile: {
  terrain: string;
  buildingId: string | null;
  zone: string | null;
  roadId: string | null;
}): string {
  if (tile.buildingId) return getBuildingColor(tile.buildingId);
  if (tile.zone)
    return ZONE_COLORS[tile.zone] ?? TERRAIN_COLORS[tile.terrain] ?? "#2a2a3a";
  if (tile.roadId) return "#6b7280";
  return TERRAIN_COLORS[tile.terrain] ?? "#2a2a3a";
}

export function updateMiniMap(
  els: MiniMapElements,
  state: CityState,
  cameraTarget?: [number, number, number],
): void {
  const ctx = els.canvas.getContext("2d");
  if (!ctx) return;

  const mapSize = state.map.length;
  const cellSize = MAP_SIZE / mapSize;

  ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);

  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      const tile = state.map[y]?.[x];
      if (!tile) continue;
      ctx.fillStyle = getTileColor(tile);
      ctx.fillRect(x * cellSize, y * cellSize, cellSize + 0.5, cellSize + 0.5);
    }
  }

  if (cameraTarget) {
    drawCameraRect(ctx, cameraTarget, mapSize, cellSize);
  }
}

function drawCameraRect(
  ctx: CanvasRenderingContext2D,
  target: [number, number, number],
  mapSize: number,
  cellSize: number,
): void {
  const cx = target[0] * cellSize;
  const cy = target[2] * cellSize;
  const viewSize = mapSize * 0.15 * cellSize;
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - viewSize / 2, cy - viewSize / 2, viewSize, viewSize);
}

const BUILDING_COLOR_MAP: [string, string][] = [
  ["city_hall", "#f0b429"],
  ["park", "#16a34a"],
  ["garden", "#16a34a"],
  ["power", "#fbbf24"],
  ["water", "#38bdf8"],
  ["clinic", "#f472b6"],
  ["hospital", "#f472b6"],
  ["school", "#a78bfa"],
  ["university", "#a78bfa"],
  ["police", "#60a5fa"],
  ["fire", "#f87171"],
  ["house", "#22c55e"],
  ["apartment", "#22c55e"],
  ["shop", "#3b82f6"],
  ["mall", "#3b82f6"],
  ["factory", "#f97316"],
  ["warehouse", "#f97316"],
];

function getBuildingColor(definitionId: string): string {
  for (const [keyword, color] of BUILDING_COLOR_MAP) {
    if (definitionId.includes(keyword)) return color;
  }
  return "#6b7280";
}
