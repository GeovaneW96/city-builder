import { Vector2 } from "three";
import { CityAssetManager } from "./assets/AssetManager";
import { CONSTRUCTION_COSTS } from "./data/balance";
import { getBuildingById } from "./data/buildings";
import {
  createCityRenderLayers,
  animateCityRenderLayers,
  syncCityRenderLayers,
  syncPlacementPreview,
  type BuildingRenderInfo,
} from "./rendering/three/city";
import {
  createGrid,
  screenToGrid,
  setGridVisibility,
  updateHoverHighlight,
  updateSelectionHighlight,
} from "./rendering/three/grid";
import { createScene, renderFrame, setSceneQuality } from "./rendering/three/scene";
import { getRenderQualityProfile } from "./rendering/three/quality";
import {
  AUTOSAVE_INTERVAL_MS,
  AUTOSAVE_SLOT_ID,
  SaveSlotManager,
  type SaveSlotId,
} from "./save/slots";
import {
  getFootprint,
  getTile,
  hasAdjacentRoad,
  isInBounds,
} from "./simulation/grid/map";
import { useSimulationStore } from "./simulation/store";
import type {
  BuildMode,
  CityState,
  GameCommand,
  PlacementPreview,
  UIState,
} from "./shared/types";
import { createAudioFeedback } from "./ui/audio";
import { useUIStore } from "./ui/store";
import { createGameUI, updateGameUI, toggleDashboardMode, showStatus } from "./ui/ui";

const TICK_INTERVALS: Record<1 | 2 | 3, number> = { 1: 250, 2: 83, 3: 42 };

const app = document.getElementById("app");
if (!app) throw new Error("No #app element found");

const mapSize = useSimulationStore.getState().state.map.length;
const scene = createScene(app, mapSize, useUIStore.getState().settings.graphicsQuality);
const grid = createGrid(scene.scene, mapSize);
const cityLayers = createCityRenderLayers(scene.scene);
const cityAssets = new CityAssetManager();
const mouse = new Vector2();
const ui = createGameUI(app);
const audioFeedback = createAudioFeedback(
  () => useUIStore.getState().settings.soundEnabled,
);
const saveSlots = new SaveSlotManager(localStorage);
let isDragging = false;
let placedDuringDrag = new Set<string>();
let lastTickAt = performance.now();
let lastAutosaveAt = performance.now();
let selectedSaveSlot: SaveSlotId = "manual_0";
let lastRenderedCityState: CityState | null = null;
let lastRenderedOverlay: UIState["activeOverlay"] = null;
let lastRenderQuality = useUIStore.getState().settings.graphicsQuality;
let generatedAssetsReady = false;

const GLOBAL_ACTIONS: Record<string, (target: HTMLElement) => void> = {
  speed: (target) => setSpeed(Number(target.dataset.speed) as 0 | 1 | 2 | 3),
  sound: () => toggleSound(),
  stats: () => toggleDashboardMode(ui),
  zones: () => useUIStore.getState().setBuildMode("zone"),
  roads: () => useUIStore.getState().setRoadTool("dirt"),
  services: () => useUIStore.getState().setBuildMode("building"),
  demolish: () => useUIStore.getState().setBuildMode("demolish"),
  save: () => saveGame(),
  load: () => loadGame(),
  "delete-save": () => deleteSave(),
  "export-save": () => exportSave(),
  "import-save": () => ui.importFile.click(),
  loan: (target) => takeLoan(target.dataset.loan),
};

bindInterface();
bindPointerInput();
bindKeyboard();
syncAll();
useSimulationStore.subscribe(syncAll);
useUIStore.subscribe(syncAll);
void preloadGeneratedCityAssets();
requestAnimationFrame(animate);

function animate(now: number): void {
  runSimulationClock(now);
  animateCityRenderLayers(cityLayers, now / 1000);
  renderFrame(scene);
  requestAnimationFrame(animate);
}

function runSimulationClock(now: number): void {
  const speed = useSimulationStore.getState().state.time.speed;
  if (speed === 0) {
    lastTickAt = now;
    return;
  }
  const interval = TICK_INTERVALS[speed];
  while (now - lastTickAt >= interval) {
    const result = useSimulationStore.getState().tick();
    audioFeedback.playEvents(result.events);
    lastTickAt += interval;
  }
  if (now - lastAutosaveAt >= AUTOSAVE_INTERVAL_MS) {
    saveSlots.save(AUTOSAVE_SLOT_ID, useSimulationStore.getState().getSaveData());
    lastAutosaveAt = now;
  }
}

function syncAll(): void {
  const state = useSimulationStore.getState().state;
  const uiState = useUIStore.getState();
  syncRenderQuality(uiState.settings.graphicsQuality);
  if (shouldSyncCityLayers(state, uiState.activeOverlay)) {
    syncCityRenderLayers(
      cityLayers,
      state,
      uiState.activeOverlay,
      getBuildingRenderInfo,
      {
        assetSource: generatedAssetsReady ? cityAssets : undefined,
        detailDensity: getRenderQualityProfile(uiState.settings.graphicsQuality)
          .detailDensity,
      },
    );
    lastRenderedCityState = state;
    lastRenderedOverlay = uiState.activeOverlay;
  }
  syncPlacementPreview(cityLayers.preview, uiState.placementPreview);
  updateGameUI(ui, state, uiState);
  updateSelectionHighlight(grid.selectionHighlight, uiState.selectedTile);
  setGridVisibility(grid, uiState.placementPreview !== null);
}

function syncRenderQuality(quality: UIState["settings"]["graphicsQuality"]): void {
  if (quality === lastRenderQuality) return;
  setSceneQuality(scene, quality);
  lastRenderQuality = quality;
}

async function preloadGeneratedCityAssets(): Promise<void> {
  showStatus(ui, "Loading generated city assets…");
  const result = await cityAssets.preloadAll();
  generatedAssetsReady = result.loaded.length > 0;
  lastRenderedCityState = null;
  syncAll();
  if (result.failed.length === 0) {
    showStatus(ui, `Generated city assets ready (${result.loaded.length}).`);
    return;
  }
  showStatus(
    ui,
    `Generated asset library unavailable (${result.failed.length} failed to load).`,
  );
}

function shouldSyncCityLayers(
  state: CityState,
  activeOverlay: UIState["activeOverlay"],
): boolean {
  return lastRenderedCityState !== state || lastRenderedOverlay !== activeOverlay;
}

function bindPointerInput(): void {
  const canvas = scene.renderer.domElement;
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointerup", stopDragging);
  canvas.addEventListener("pointerleave", handlePointerLeave);
}

function handlePointerMove(event: PointerEvent): void {
  const gridPos = pickGridPosition(event);
  useUIStore.getState().setHoveredTile(gridPos);
  updatePlacementPreview(gridPos);
  updateHoverHighlight(grid.hoverHighlight, gridPos, getPreviewValidity());
  if (isDragging && gridPos && isDragBuildMode(useUIStore.getState().buildMode)) {
    applyToolAt(gridPos);
  }
}

function handlePointerDown(event: PointerEvent): void {
  const gridPos = pickGridPosition(event);
  useUIStore.getState().setSelectedTile(gridPos);
  updateSelectionHighlight(grid.selectionHighlight, gridPos);
  if (!gridPos) return;
  isDragging = true;
  placedDuringDrag = new Set<string>();
  scene.renderer.domElement.setPointerCapture(event.pointerId);
  applyToolAt(gridPos);
}

function stopDragging(event: PointerEvent): void {
  isDragging = false;
  placedDuringDrag.clear();
  if (scene.renderer.domElement.hasPointerCapture(event.pointerId)) {
    scene.renderer.domElement.releasePointerCapture(event.pointerId);
  }
}

function handlePointerLeave(): void {
  useUIStore.getState().setHoveredTile(null);
  useUIStore.getState().setPlacementPreview(null);
  grid.hoverHighlight.visible = false;
  isDragging = false;
}

function pickGridPosition(event: PointerEvent): [number, number] | null {
  const rect = scene.renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  return screenToGrid(mouse, scene.camera, grid.raycasterTarget, scene.gridSize);
}

function applyToolAt(position: [number, number]): void {
  const command = buildCommand(position);
  if (!command) return;
  const key = `${command.type}:${position[0]},${position[1]}`;
  if (placedDuringDrag.has(key)) return;
  placedDuringDrag.add(key);
  const result = useSimulationStore.getState().processCommand(command);
  audioFeedback.playEvents(result.events);
  audioFeedback.playFailure(result.error);
  showStatus(ui, result.success ? "Built." : (result.error ?? "Command failed."));
}

function buildCommand([x, y]: [number, number]): GameCommand | null {
  const uiState = useUIStore.getState();
  if (uiState.buildMode === "road") {
    return { type: "PLACE_ROAD", x, y, roadType: uiState.selectedRoadType };
  }
  if (uiState.buildMode === "zone" && uiState.selectedZoneType) {
    return { type: "PAINT_ZONE", x, y, zoneType: uiState.selectedZoneType };
  }
  if (uiState.buildMode === "building" && uiState.selectedBuildingId) {
    return { type: "PLACE_BUILDING", definitionId: uiState.selectedBuildingId, x, y };
  }
  if (uiState.buildMode === "demolish") return { type: "DEMOLISH", x, y };
  return null;
}

function updatePlacementPreview(position: [number, number] | null): void {
  useUIStore.getState().setPlacementPreview(createPlacementPreview(position));
}

function createPlacementPreview(
  position: [number, number] | null,
): PlacementPreview | null {
  const uiState = useUIStore.getState();
  if (!position || !uiState.buildMode) return null;
  const state = useSimulationStore.getState().state;
  if (uiState.buildMode === "building" && uiState.selectedBuildingId) {
    return createBuildingPreview(state, position, uiState.selectedBuildingId);
  }
  return createTilePreview(state, position, uiState);
}

function createTilePreview(
  state: CityState,
  position: [number, number],
  uiState: UIState,
): PlacementPreview {
  const [x, y] = position;
  const tile = getTile(state, x, y);
  const valid = isTileToolValid(state, tile, uiState);
  return {
    positions: [position],
    valid,
    cost: uiState.buildMode === "road" ? getRoadCost(uiState.selectedRoadType) : 0,
    label: getModeLabel(uiState),
  };
}

function createBuildingPreview(
  state: CityState,
  position: [number, number],
  buildingId: string,
): PlacementPreview {
  const definition = getBuildingById(buildingId);
  if (!definition) return { positions: [position], valid: false, cost: 0 };
  const footprint = getFootprint(definition, position[0], position[1], 0);
  const valid =
    footprint.every((cell) => isInBounds(cell.x, cell.y)) &&
    footprint.every((cell) => {
      const tile = getTile(state, cell.x, cell.y);
      return tile?.terrain === "grass" && !tile.roadId && !tile.buildingId;
    }) &&
    state.economy.money >= definition.cost &&
    state.population.total >= definition.unlockPopulation &&
    (!definition.requirements.roadAccess || hasAdjacentRoad(state, footprint));
  return {
    positions: footprint.map((cell) => [cell.x, cell.y]),
    valid,
    cost: definition.cost,
    label: definition.name,
  };
}

function isTileToolValid(
  state: CityState,
  tile: ReturnType<typeof getTile>,
  uiState: UIState,
): boolean {
  if (!tile) return false;
  if (uiState.buildMode === "road") return isRoadPreviewValid(state, tile, uiState);
  if (uiState.buildMode === "zone") return isZonePreviewValid(state, tile, uiState);
  if (uiState.buildMode === "demolish")
    return Boolean(tile.roadId || tile.zone || tile.buildingId);
  return false;
}

function isRoadPreviewValid(
  state: CityState,
  tile: NonNullable<ReturnType<typeof getTile>>,
  uiState: UIState,
): boolean {
  const canAfford = state.economy.money >= getRoadCost(uiState.selectedRoadType);
  return !tile.roadId && !tile.buildingId && canAfford;
}

function isZonePreviewValid(
  state: CityState,
  tile: NonNullable<ReturnType<typeof getTile>>,
  uiState: UIState,
): boolean {
  if (!uiState.selectedZoneType) return false;
  const feature = `${uiState.selectedZoneType}_zoning`;
  return (
    state.progression.unlockedFeatures.includes(feature) &&
    !tile.roadId &&
    !tile.buildingId
  );
}

function getPreviewValidity(): boolean {
  return useUIStore.getState().placementPreview?.valid ?? true;
}

function isDragBuildMode(mode: BuildMode): boolean {
  return mode === "road" || mode === "zone" || mode === "demolish";
}

function bindKeyboard(): void {
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") useUIStore.getState().setBuildMode(null);
    if (event.key === " ") togglePause();
    if (event.key === "1") setSpeed(1);
    if (event.key === "2") setSpeed(2);
    if (event.key === "3") setSpeed(3);
  });
}

function togglePause(): void {
  const currentSpeed = useSimulationStore.getState().state.time.speed;
  setSpeed(currentSpeed === 0 ? 1 : 0);
}

function setSpeed(speed: 0 | 1 | 2 | 3): void {
  useSimulationStore.getState().processCommand({ type: "SET_SPEED", speed });
}

function toggleSound(): void {
  const settings = useUIStore.getState().settings;
  useUIStore.getState().updateSettings({ soundEnabled: !settings.soundEnabled });
}

function bindInterface(): void {
  ui.root.addEventListener("click", (event) => {
    const target = findActionTarget(event.target);
    if (target) handleToolbarClick(target);
  });
  ui.root.addEventListener("input", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.dataset.tax) {
      setTaxRate(target.dataset.tax, Number(target.value));
    }
  });
  ui.root.addEventListener("change", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.dataset.ui === "import-file") {
      void importSaveFile(target.files?.[0]);
      target.value = "";
    }
  });
}

function findActionTarget(raw: EventTarget | null): HTMLElement | null {
  let el = raw instanceof HTMLElement ? raw : null;
  while (el && el !== ui.root) {
    if (el.dataset.action) return el;
    el = el.parentElement;
  }
  return null;
}

function handleToolbarClick(target: HTMLElement): void {
  const action = target.dataset.action;
  if (handleGlobalAction(action, target)) return;
  if (action === "road") {
    const roadType = target.dataset.roadtype as "dirt" | "paved" | undefined;
    useUIStore.getState().setRoadTool(roadType ?? "dirt");
  }
  if (action === "zone") setZoneTool(target.dataset.zone);
  if (action === "building") setBuildingTool(target.dataset.building);
  if (action === "demolish") useUIStore.getState().setBuildMode("demolish");
}

function handleGlobalAction(action: string | undefined, target: HTMLElement): boolean {
  const handler = action ? GLOBAL_ACTIONS[action] : undefined;
  if (!handler) return false;
  handler(target);
  return true;
}

function setZoneTool(zone: string | undefined): void {
  if (zone === "residential" || zone === "commercial" || zone === "industrial") {
    useUIStore.getState().setZoneTool(zone);
  }
}

function setBuildingTool(buildingId: string | undefined): void {
  if (buildingId) useUIStore.getState().setBuildingTool(buildingId);
}

function setTaxRate(taxType: string, rate: number): void {
  if (taxType !== "residential" && taxType !== "commercial" && taxType !== "industrial")
    return;
  useSimulationStore.getState().processCommand({ type: "SET_TAX_RATE", taxType, rate });
}

function takeLoan(loanType: string | undefined): void {
  if (loanType !== "small" && loanType !== "medium" && loanType !== "large") return;
  const result = useSimulationStore.getState().processCommand({
    type: "TAKE_LOAN",
    loanType,
  });
  showStatus(ui, result.success ? "Loan approved." : (result.error ?? "Loan declined."));
}

function saveGame(): void {
  saveSlots.save(selectedSaveSlot, useSimulationStore.getState().getSaveData());
  lastAutosaveAt = performance.now();
  showStatus(ui, `Saved to ${selectedSaveSlot}.`);
}

function loadGame(): void {
  const save = saveSlots.load(selectedSaveSlot);
  if (!save) {
    showStatus(ui, "No save found.");
    return;
  }
  useSimulationStore.getState().loadSave(save.state);
  showStatus(ui, "Loaded.");
}

function deleteSave(): void {
  const deleted = saveSlots.delete(selectedSaveSlot);
  showStatus(ui, deleted ? "Save deleted." : "Save slot is already empty.");
}

function exportSave(): void {
  try {
    const contents = saveSlots.export(selectedSaveSlot);
    downloadSave(contents, selectedSaveSlot);
    showStatus(ui, "Save exported.");
  } catch (error) {
    showStatus(ui, getErrorMessage(error));
  }
}

async function importSaveFile(file: File | undefined): Promise<void> {
  if (!file) return;
  try {
    const destination = saveSlots.firstAvailableManualSlot();
    const save = saveSlots.import(destination, await file.text());
    selectedSaveSlot = destination;
    useSimulationStore.getState().loadSave(save.state);
    showStatus(ui, `Imported into ${destination}.`);
  } catch (error) {
    showStatus(ui, getErrorMessage(error));
  }
}

function downloadSave(contents: string, slot: SaveSlotId): void {
  const blob = new Blob([contents], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `first-settlement_${slot}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Save operation failed.";
}

function getRoadCost(roadType: "dirt" | "paved"): number {
  return roadType === "dirt"
    ? CONSTRUCTION_COSTS.DIRT_ROAD
    : CONSTRUCTION_COSTS.PAVED_ROAD;
}

function getBuildingRenderInfo(definitionId: string): BuildingRenderInfo | null {
  const definition = getBuildingById(definitionId);
  if (!definition) return null;
  return {
    size: definition.size,
    category: definition.category,
    effects: {
      healthRadius: definition.effects.healthRadius,
      educationRadius: definition.effects.educationRadius,
    },
  };
}

function getModeLabel(uiState: UIState): string {
  if (uiState.buildMode === "zone" && uiState.selectedZoneType) {
    return `${capitalize(uiState.selectedZoneType)} zone`;
  }
  return uiState.buildMode ?? "placement";
}

function capitalize(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
