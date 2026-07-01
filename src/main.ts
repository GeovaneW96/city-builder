import { Vector2 } from "three";
import { CityAssetManager } from "./assets/AssetManager";
import { CONSTRUCTION_COSTS } from "./data/balance";
import { getBuildingById } from "./data/buildings";
import { MILESTONES } from "./data/unlocks/milestones";
import {
  createCityRenderLayers,
  animateCityRenderLayers,
  syncCityRenderLayers,
  syncPlacementPreview,
  type BuildingRenderInfo,
  type CityRenderLayerName,
} from "./rendering/three/city";
import {
  createGrid,
  screenToGrid,
  setGridVisibility,
  updateHoverHighlight,
  updateSelectionHighlight,
} from "./rendering/three/grid";
import {
  createScene,
  panSceneCamera,
  renderFrame,
  setSceneQuality,
  type CameraPanInput,
} from "./rendering/three/scene";
import { getRenderQualityProfile } from "./rendering/three/quality";
import { getCalendarTimeAfterHours, HOURS_PER_DAY } from "./simulation/systems/time";
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
import { getGridLine, getGridRectangle } from "./shared/grid-selection";
import type {
  BuildMode,
  CityState,
  GameEvent,
  GameCommand,
  PlacementPreview,
  UIState,
} from "./shared/types";
import { createAudioFeedback } from "./ui/audio";
import { selectBottomPanelTab, type BuildCatalogTab } from "./ui/components/BottomPanel";
import { updateCalendarClock } from "./ui/components/TopBar";
import { useUIStore } from "./ui/store";
import { createGameUI, updateGameUI, toggleDashboardMode, showStatus } from "./ui/ui";

const TICK_INTERVALS: Record<1 | 2 | 3, number> = { 1: 10000, 2: 5000, 3: 2500 };
const isE2ETest = new URLSearchParams(window.location.search).has("e2e");
const CAMERA_KEY_PANS: Record<string, CameraPanInput> = {
  ArrowUp: { forward: 1, right: 0 },
  ArrowDown: { forward: -1, right: 0 },
  ArrowLeft: { forward: 0, right: -1 },
  ArrowRight: { forward: 0, right: 1 },
};
const CAMERA_PAN_UNITS_PER_SECOND_RATIO = 0.45;
const CAMERA_PAN_MIN_UNITS_PER_SECOND = 16;
const MAX_FRAME_DELTA_SECONDS = 1 / 20;
const RADIUS_RENDER_EFFECTS = [
  "healthRadius",
  "educationRadius",
  "policeRadius",
  "fireRadius",
  "garbageCollectionRadius",
] as const;

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
let dragStart: [number, number] | null = null;
let activePointerId: number | null = null;
let lastTickAt = performance.now();
let lastAutosaveAt = performance.now();
let lastFrameAt = performance.now();
let selectedSaveSlot: SaveSlotId = "manual_0";
let lastRoadRenderKey: string | null = null;
let lastBuildingRenderKey: string | null = null;
let lastZoneRenderKey: string | null = null;
let lastOverlayRenderKey: string | null = null;
let lastWarningRenderKey: string | null = null;
let lastTerrainRenderKey: string | null = null;
let lastEvaluatedCityState: CityState | null = null;
let lastRenderQuality = useUIStore.getState().settings.graphicsQuality;
let generatedAssetsReady = false;
const activeCameraPanKeys = new Set<string>();

const GLOBAL_ACTIONS: Record<string, (target: HTMLElement) => void> = {
  speed: (target) => setSpeed(Number(target.dataset.speed) as 0 | 1 | 2 | 3),
  sound: () => toggleSound(),
  stats: () => toggleDashboardMode(ui),
  zones: () => useUIStore.getState().setBuildMode("zone"),
  roads: () => useUIStore.getState().setRoadTool("dirt"),
  services: () => openBuildCatalog("buildings"),
  utilities: () => openBuildCatalog("utilities"),
  decorations: () => openBuildCatalog("decorations"),
  specials: () => openBuildCatalog("specials"),
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
useSimulationStore.subscribe(() => syncAll());
useUIStore.subscribe(() => syncAll());
if (!isE2ETest) void preloadGeneratedCityAssets();
requestAnimationFrame(animate);

function animate(now: number): void {
  const deltaSeconds = getFrameDeltaSeconds(now);
  updateKeyboardCameraPan(deltaSeconds);
  runSimulationClock(now);
  updateGameClock(now);
  if (!isE2ETest) {
    animateCityRenderLayers(cityLayers, now / 1000);
    renderFrame(scene);
  } else {
    scene.controls.update();
    scene.scene.updateMatrixWorld();
  }
  requestAnimationFrame(animate);
}

function getFrameDeltaSeconds(now: number): number {
  const deltaSeconds = Math.max(0, (now - lastFrameAt) / 1000);
  lastFrameAt = now;
  return Math.min(deltaSeconds, MAX_FRAME_DELTA_SECONDS);
}

function updateKeyboardCameraPan(deltaSeconds: number): void {
  const input = getActiveCameraPanInput();
  if (!input || deltaSeconds === 0) return;
  panSceneCamera(scene, input, getCameraPanDistance(deltaSeconds));
}

function getActiveCameraPanInput(): CameraPanInput | null {
  const input: CameraPanInput = { forward: 0, right: 0 };
  for (const key of activeCameraPanKeys) {
    const keyInput = CAMERA_KEY_PANS[key];
    if (!keyInput) continue;
    input.forward += keyInput.forward;
    input.right += keyInput.right;
  }
  if (input.forward === 0 && input.right === 0) return null;
  return input;
}

function getCameraPanDistance(deltaSeconds: number): number {
  const unitsPerSecond = Math.max(
    CAMERA_PAN_MIN_UNITS_PER_SECOND,
    scene.gridSize * CAMERA_PAN_UNITS_PER_SECOND_RATIO,
  );
  return unitsPerSecond * deltaSeconds;
}

function updateGameClock(now: number): void {
  const state = useSimulationStore.getState().state;
  if (state.time.speed === 0) {
    updateCalendarClock(ui.topBar, state.time);
    return;
  }
  const interval = TICK_INTERVALS[state.time.speed];
  const elapsed = Math.max(0, now - lastTickAt);
  const elapsedHours = Math.min(
    HOURS_PER_DAY - 1,
    Math.floor((elapsed / interval) * HOURS_PER_DAY),
  );
  updateCalendarClock(ui.topBar, getCalendarTimeAfterHours(state.time, elapsedHours));
}

function runSimulationClock(now: number): void {
  const speed = useSimulationStore.getState().state.time.speed;
  if (speed === 0) {
    lastTickAt = now;
    return;
  }
  const interval = TICK_INTERVALS[speed];
  if (now - lastTickAt < interval) return;
  const result = useSimulationStore.getState().tick();
  audioFeedback.playEvents(result.events);
  showMilestoneNotification(result.events);
  lastTickAt += interval;
  if (now - lastAutosaveAt >= AUTOSAVE_INTERVAL_MS) {
    saveSlots.save(AUTOSAVE_SLOT_ID, useSimulationStore.getState().getSaveData());
    lastAutosaveAt = now;
  }
}

function showMilestoneNotification(events: GameEvent[]): void {
  const event = events.find((item) => item.type === "MILESTONE_REACHED");
  if (!event || event.type !== "MILESTONE_REACHED") return;
  const milestone = MILESTONES.find((item) => item.population === event.population);
  const unlocks = milestone?.unlocks.map(formatFeatureName).join(", ") ?? "";
  const message = unlocks
    ? `${event.milestone} reached — unlocked: ${unlocks}.`
    : `${event.milestone} reached!`;
  showStatus(ui, message, 5000);
}

function formatFeatureName(feature: string): string {
  return feature.replace("_zoning", " zoning").replace(/_/g, " ");
}

function syncAll(force = false): void {
  const state = useSimulationStore.getState().state;
  const uiState = useUIStore.getState();
  const qualityChanged = syncRenderQuality(uiState.settings.graphicsQuality);
  evaluateCityRender(state, uiState, force || qualityChanged);
  syncPlacementPreview(
    cityLayers.preview,
    uiState.placementPreview,
    getBuildingRenderInfo,
    generatedAssetsReady ? cityAssets : undefined,
  );
  updateGameUI(ui, state, uiState);
  updateSelectionHighlight(grid.selectionHighlight, uiState.selectedTile);
  setGridVisibility(grid, uiState.placementPreview !== null);
}

function evaluateCityRender(state: CityState, uiState: UIState, force: boolean): void {
  if (isE2ETest) return;
  const stateChanged = state !== lastEvaluatedCityState;
  const overlayRenderKey = getOverlayRenderKey(state, uiState);
  const overlayChanged = overlayRenderKey !== lastOverlayRenderKey;
  if (!force && !stateChanged && !overlayChanged) return;

  const roadRenderKey = getRoadRenderKey(state);
  const buildingRenderKey = getBuildingRenderKey(state);
  const zoneRenderKey = getZoneRenderKey(state);
  const warningRenderKey = getWarningRenderKey(state);
  const terrainRenderKey = getTerrainRenderKey(state);
  const refreshTerrain = force || terrainRenderKey !== lastTerrainRenderKey;
  const dirtyLayers = getDirtyRenderLayers({
    force,
    refreshTerrain,
    roadRenderKey,
    buildingRenderKey,
    zoneRenderKey,
    overlayRenderKey,
    warningRenderKey,
  });
  if (dirtyLayers.length > 0) {
    syncCityRenderLayers(
      cityLayers,
      state,
      uiState.activeOverlay,
      getBuildingRenderInfo,
      {
        assetSource: generatedAssetsReady ? cityAssets : undefined,
        detailDensity: getRenderQualityProfile(
          useUIStore.getState().settings.graphicsQuality,
        ).detailDensity,
        refreshTerrain,
        dirtyLayers,
        selectedTile: uiState.selectedTile,
      },
    );
    lastRoadRenderKey = roadRenderKey;
    lastBuildingRenderKey = buildingRenderKey;
    lastZoneRenderKey = zoneRenderKey;
    lastOverlayRenderKey = overlayRenderKey;
    lastWarningRenderKey = warningRenderKey;
    lastTerrainRenderKey = terrainRenderKey;
  }
  lastEvaluatedCityState = state;
}

function syncRenderQuality(quality: UIState["settings"]["graphicsQuality"]): boolean {
  if (quality === lastRenderQuality) return false;
  setSceneQuality(scene, quality);
  lastRenderQuality = quality;
  return true;
}

async function preloadGeneratedCityAssets(): Promise<void> {
  showStatus(ui, "Loading generated city assets…");
  const result = await cityAssets.preloadAll();
  generatedAssetsReady = result.loaded.length > 0;
  syncAll(true);
  if (result.failed.length === 0) {
    showStatus(ui, `Generated city assets ready (${result.loaded.length}).`);
    return;
  }
  showStatus(
    ui,
    `Generated asset library unavailable (${result.failed.length} failed to load).`,
  );
}

function getDirtyRenderLayers(params: {
  force: boolean;
  refreshTerrain: boolean;
  roadRenderKey: string;
  buildingRenderKey: string;
  zoneRenderKey: string;
  overlayRenderKey: string;
  warningRenderKey: string;
}): CityRenderLayerName[] {
  const dirtyLayers: CityRenderLayerName[] = [];
  addDirtyRenderLayer(dirtyLayers, params.refreshTerrain, "terrain");
  addDirtyRenderLayer(
    dirtyLayers,
    params.force || params.roadRenderKey !== lastRoadRenderKey,
    "roads",
  );
  addDirtyRenderLayer(
    dirtyLayers,
    params.force || params.buildingRenderKey !== lastBuildingRenderKey,
    "buildings",
  );
  addDirtyRenderLayer(
    dirtyLayers,
    params.force || params.zoneRenderKey !== lastZoneRenderKey,
    "zones",
  );
  addDirtyRenderLayer(
    dirtyLayers,
    params.force || params.overlayRenderKey !== lastOverlayRenderKey,
    "overlays",
  );
  addDirtyRenderLayer(
    dirtyLayers,
    params.force || params.warningRenderKey !== lastWarningRenderKey,
    "warnings",
  );
  return dirtyLayers;
}

function addDirtyRenderLayer(
  dirtyLayers: CityRenderLayerName[],
  dirty: boolean,
  layer: CityRenderLayerName,
): void {
  if (dirty) dirtyLayers.push(layer);
}

function getRoadRenderKey(state: CityState): string {
  return state.roads
    .map((road) => `${road.id}:${road.type}:${Object.values(road.connections).join("")}`)
    .join(",");
}

function getBuildingRenderKey(state: CityState): string {
  return state.buildings
    .map(
      (building) =>
        `${building.id}:${building.definitionId}:${building.position.join(",")}:${building.rotation}:${building.status}`,
    )
    .join(",");
}

function getZoneRenderKey(state: CityState): string {
  return state.map
    .flat()
    .filter((tile) => tile.zone)
    .map(
      (tile) =>
        `${tile.x},${tile.y}:${tile.zone}:${tile.roadId ?? ""}:${tile.buildingId ?? ""}`,
    )
    .join(",");
}

function getOverlayRenderKey(state: CityState, uiState: UIState): string {
  const activeOverlay = uiState.activeOverlay;
  const selectedRadiusKey = getSelectedRadiusRenderKey(state, uiState.selectedTile);
  if (activeOverlay === null) return `none:${selectedRadiusKey}`;
  if (activeOverlay === "pollution") {
    return `pollution:${selectedRadiusKey}:${state.map
      .flat()
      .map((tile) => tile.pollution)
      .join(",")}`;
  }
  if (activeOverlay === "zoning")
    return `zoning:${selectedRadiusKey}:${getZoneRenderKey(state)}`;
  if (activeOverlay === "health" || activeOverlay === "education") {
    return `${activeOverlay}:${selectedRadiusKey}:${getBuildingRenderKey(state)}`;
  }
  if (activeOverlay === "districts") {
    return `districts:${selectedRadiusKey}:${JSON.stringify(state.districts)}`;
  }
  return `${activeOverlay}:${selectedRadiusKey}`;
}

function getSelectedRadiusRenderKey(
  state: CityState,
  selectedTile: UIState["selectedTile"],
): string {
  if (!selectedTile) return "selected:none";
  const tile = state.map[selectedTile[1]]?.[selectedTile[0]];
  const buildingId = tile?.buildingId;
  if (!buildingId) return `selected:${selectedTile.join(",")}:empty`;
  const building = state.buildings.find((item) => item.id === buildingId);
  if (!building) return `selected:${buildingId}:missing`;
  return `selected:${building.id}:${getDefinitionRadiusRenderKey(building.definitionId)}`;
}

function getDefinitionRadiusRenderKey(definitionId: string): string {
  const effects = getBuildingById(definitionId)?.effects;
  if (!effects) return "0:0:0:0:0";
  return RADIUS_RENDER_EFFECTS.map((effect) => String(effects[effect] ?? 0)).join(":");
}

function getWarningRenderKey(state: CityState): string {
  const warningKey = state.warnings
    .map((warning) => `${warning.id}:${warning.targetTile?.join(",") ?? ""}`)
    .join(",");
  return [
    warningKey,
    `unemployed:${state.population.unemployedWorkers}`,
    getBuildingRenderKey(state),
  ].join("|");
}

function getTerrainRenderKey(state: CityState): string {
  return state.map
    .flat()
    .map((tile) => `${tile.terrain}:${tile.elevation}`)
    .join(",");
}

function bindPointerInput(): void {
  const canvas = scene.renderer.domElement;
  canvas.addEventListener("pointermove", handlePointerMove, { capture: true });
  canvas.addEventListener("pointerdown", handlePointerDown, { capture: true });
  canvas.addEventListener("pointerup", stopDragging);
  canvas.addEventListener("pointerleave", handlePointerLeave);
}

function handlePointerMove(event: PointerEvent): void {
  const gridPos = pickGridPosition(event);
  useUIStore.getState().setHoveredTile(gridPos);
  updatePlacementPreview(getPreviewPositions(gridPos));
  updateHoverHighlight(grid.hoverHighlight, gridPos, getPreviewValidity());
}

function handlePointerDown(event: PointerEvent): void {
  if (event.button !== 0) return;
  const gridPos = pickGridPosition(event);
  useUIStore.getState().setSelectedTile(gridPos);
  updateSelectionHighlight(grid.selectionHighlight, gridPos);
  if (!gridPos || !useUIStore.getState().buildMode) return;
  isDragging = true;
  dragStart = gridPos;
  activePointerId = event.pointerId;
  scene.controls.enabled = false;
  scene.renderer.domElement.setPointerCapture(event.pointerId);
  updatePlacementPreview(getPreviewPositions(gridPos));
}

function stopDragging(event: PointerEvent): void {
  if (!isDragging) return;
  const positions = getPreviewPositions(pickGridPosition(event));
  commitPlacement(positions);
  cancelPlacement(event.pointerId);
}

function cancelPlacement(pointerId?: number): void {
  isDragging = false;
  dragStart = null;
  scene.controls.enabled = true;
  const capturedPointerId = pointerId ?? activePointerId;
  if (
    capturedPointerId != null &&
    scene.renderer.domElement.hasPointerCapture(capturedPointerId)
  ) {
    scene.renderer.domElement.releasePointerCapture(capturedPointerId);
  }
  activePointerId = null;
}

function handlePointerLeave(): void {
  if (isDragging) return;
  useUIStore.getState().setHoveredTile(null);
  useUIStore.getState().setPlacementPreview(null);
  grid.hoverHighlight.visible = false;
}

function pickGridPosition(event: PointerEvent): [number, number] | null {
  const rect = scene.renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  return screenToGrid(mouse, scene.camera, grid.raycasterTarget, scene.gridSize);
}

function commitPlacement(positions: [number, number][]): void {
  const preview = createPlacementPreview(positions);
  if (!preview?.valid) {
    showStatus(ui, "Invalid placement.");
    return;
  }
  const commands = positions.map(buildCommand).filter((command) => command !== null);
  if (commands.length === 0) return;
  const result = useSimulationStore.getState().processCommands(commands);
  audioFeedback.playEvents(result.events);
  if (!result.success) audioFeedback.playFailure(result.error);
  showStatus(ui, result.success ? "Built." : (result.error ?? "Command failed."));
}

function getPreviewPositions(end: [number, number] | null): [number, number][] {
  if (!end) return [];
  const mode = useUIStore.getState().buildMode;
  if (!isDragging || !dragStart || !isDragBuildMode(mode)) return [end];
  if (mode === "zone") return getGridRectangle(dragStart, end);
  return getGridLine(dragStart, end);
}

function buildCommand([x, y]: [number, number]): GameCommand | null {
  const uiState = useUIStore.getState();
  if (uiState.buildMode === "road") {
    if (getTile(useSimulationStore.getState().state, x, y)?.roadId) return null;
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

function updatePlacementPreview(positions: [number, number][]): void {
  useUIStore.getState().setPlacementPreview(createPlacementPreview(positions));
}

function createPlacementPreview(positions: [number, number][]): PlacementPreview | null {
  const uiState = useUIStore.getState();
  if (positions.length === 0 || !uiState.buildMode) return null;
  const state = useSimulationStore.getState().state;
  if (uiState.buildMode === "building" && uiState.selectedBuildingId) {
    const position = positions.at(-1);
    return position
      ? createBuildingPreview(state, position, uiState.selectedBuildingId)
      : null;
  }
  return createTilePreview(state, positions, uiState);
}

function createTilePreview(
  state: CityState,
  positions: [number, number][],
  uiState: UIState,
): PlacementPreview {
  const roadCost =
    uiState.buildMode === "road" ? getRoadCost(uiState.selectedRoadType) : 0;
  const paidPositions =
    uiState.buildMode === "road"
      ? positions.filter(([x, y]) => !getTile(state, x, y)?.roadId)
      : positions;
  const valid =
    positions.every(([x, y]) => isTileToolValid(state, getTile(state, x, y), uiState)) &&
    state.economy.money >= roadCost * paidPositions.length;
  return {
    positions,
    valid,
    cost: roadCost * paidPositions.length,
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
    definitionId: definition.id,
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
  if (tile.roadId) return true;
  return tile.terrain === "grass" && !tile.buildingId && canAfford;
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
    if (handleCameraPanKey(event)) return;
    if (event.key === "Escape") {
      cancelPlacement();
      useUIStore.getState().setBuildMode(null);
    }
    if (event.key === " ") togglePause();
    if (event.key === "1") setSpeed(1);
    if (event.key === "2") setSpeed(2);
    if (event.key === "3") setSpeed(3);
  });
  window.addEventListener("keyup", handleCameraPanRelease);
  window.addEventListener("blur", () => activeCameraPanKeys.clear());
}

function handleCameraPanKey(event: KeyboardEvent): boolean {
  const input = CAMERA_KEY_PANS[event.key];
  if (!input || isEditableKeyboardTarget(event.target)) return false;
  event.preventDefault();
  activeCameraPanKeys.add(event.key);
  return true;
}

function handleCameraPanRelease(event: KeyboardEvent): void {
  activeCameraPanKeys.delete(event.key);
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  );
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
  if (!(raw instanceof Element)) return null;
  return raw.closest<HTMLElement>("[data-action]");
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

function openBuildCatalog(tab: BuildCatalogTab): void {
  useUIStore.getState().setBuildMode("building");
  selectBottomPanelTab(ui.bottomPanel, tab);
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
  syncAll(true);
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
    syncAll(true);
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
      policeRadius: definition.effects.policeRadius,
      fireRadius: definition.effects.fireRadius,
      garbageCollectionRadius: definition.effects.garbageCollectionRadius,
      populationCapacity: definition.effects.populationCapacity,
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
