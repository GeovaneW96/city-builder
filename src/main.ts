import { Vector2 } from "three";
import { CONSTRUCTION_COSTS, LOAN_BALANCE } from "./data/balance";
import { getBuildingById, getManualBuildings } from "./data/buildings";
import { FIRST_SETTLEMENT } from "./data/scenarios/first_settlement";
import {
  createCityRenderLayers,
  syncCityRenderLayers,
  syncPlacementPreview,
} from "./rendering/three/city";
import {
  createGrid,
  screenToGrid,
  updateHoverHighlight,
  updateSelectionHighlight,
} from "./rendering/three/grid";
import { createScene, renderFrame } from "./rendering/three/scene";
import { createSaveData, deserializeSave, serializeSave } from "./save/serialization";
import {
  getFootprint,
  getTile,
  hasAdjacentRoad,
  isInBounds,
} from "./simulation/grid/map";
import { getCurrentObjectiveLabel } from "./simulation/systems/progression";
import { useSimulationStore } from "./simulation/store";
import type {
  BuildMode,
  CityState,
  GameCommand,
  PlacementPreview,
  UIState,
  ZoneType,
} from "./shared/types";
import { createAudioFeedback } from "./ui/audio";
import { useUIStore } from "./ui/store";

const SAVE_KEY = "cities:first_settlement:manual";
const TICK_INTERVALS: Record<1 | 2 | 3, number> = { 1: 250, 2: 83, 3: 42 };

const app = document.getElementById("app");
if (!app) throw new Error("No #app element found");

const scene = createScene(app);
const grid = createGrid(scene.scene);
const cityLayers = createCityRenderLayers(scene.scene);
const mouse = new Vector2();
const ui = createInterface(app);
const audioFeedback = createAudioFeedback(
  () => useUIStore.getState().settings.soundEnabled,
);
let isDragging = false;
let placedDuringDrag = new Set<string>();
let lastTickAt = performance.now();

bindInterface();
bindPointerInput();
bindKeyboard();
syncAll();
useSimulationStore.subscribe(syncAll);
useUIStore.subscribe(syncAll);
requestAnimationFrame(animate);

function animate(now: number): void {
  runSimulationClock(now);
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
}

function syncAll(): void {
  const state = useSimulationStore.getState().state;
  const uiState = useUIStore.getState();
  syncCityRenderLayers(cityLayers, state, uiState.activeOverlay);
  syncPlacementPreview(cityLayers.preview, uiState.placementPreview);
  renderInterface(state, uiState);
  updateSelectionHighlight(grid.selectionHighlight, uiState.selectedTile);
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
  return screenToGrid(mouse, scene.camera, grid.raycasterTarget);
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
  ui.status.textContent = result.success ? "Built." : (result.error ?? "Command failed.");
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
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    handleToolbarClick(target);
  });
  ui.root.addEventListener("input", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.dataset.tax) {
      setTaxRate(target.dataset.tax, Number(target.value));
    }
  });
}

function handleToolbarClick(target: HTMLElement): void {
  const action = target.dataset.action;
  if (handleGlobalAction(action, target)) return;
  if (action === "road") useUIStore.getState().setRoadTool("dirt");
  if (action === "zone") setZoneTool(target.dataset.zone);
  if (action === "building") setBuildingTool(target.dataset.building);
  if (action === "demolish") useUIStore.getState().setBuildMode("demolish");
}

function handleGlobalAction(action: string | undefined, target: HTMLElement): boolean {
  if (action === "overlay") setOverlay(target.dataset.overlay);
  if (action === "speed") setSpeed(Number(target.dataset.speed) as 0 | 1 | 2 | 3);
  if (action === "sound") toggleSound();
  if (action === "loan") takeLoan(target.dataset.loan);
  if (action === "save") saveGame();
  if (action === "load") loadGame();
  return ["overlay", "speed", "sound", "loan", "save", "load"].includes(action ?? "");
}

function setZoneTool(zone: string | undefined): void {
  if (zone === "residential" || zone === "commercial" || zone === "industrial") {
    useUIStore.getState().setZoneTool(zone);
  }
}

function setBuildingTool(buildingId: string | undefined): void {
  if (buildingId) useUIStore.getState().setBuildingTool(buildingId);
}

function setOverlay(overlay: string | undefined): void {
  const active = useUIStore.getState().activeOverlay;
  const next = active === overlay ? null : overlay;
  if (isOverlay(next)) useUIStore.getState().setActiveOverlay(next);
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
  ui.status.textContent = result.success
    ? "Loan approved."
    : (result.error ?? "Loan declined.");
}

function saveGame(): void {
  const save = createSaveData(useSimulationStore.getState().getSaveData());
  localStorage.setItem(SAVE_KEY, serializeSave(save));
  ui.status.textContent = "Saved.";
}

function loadGame(): void {
  const serialized = localStorage.getItem(SAVE_KEY);
  if (!serialized) {
    ui.status.textContent = "No save found.";
    return;
  }
  useSimulationStore.getState().loadSave(deserializeSave(serialized).state);
  ui.status.textContent = "Loaded.";
}

function renderInterface(state: CityState, uiState: UIState): void {
  ui.money.textContent = formatMoney(state.economy.money);
  ui.population.textContent = `${state.population.total} / ${FIRST_SETTLEMENT.winCondition.populationMin}`;
  ui.happiness.textContent = `${state.happiness.value}%`;
  ui.income.textContent = `${formatMoney(state.economy.monthlyIncome)} / ${formatMoney(state.economy.monthlyExpenses)}`;
  ui.date.textContent = `Y${state.time.year} M${state.time.month}`;
  ui.objective.textContent = getCurrentObjectiveLabel(state);
  ui.demand.innerHTML = renderDemandBars(state);
  ui.loans.innerHTML = renderLoanStatus(state);
  ui.warnings.innerHTML = renderWarnings(state);
  ui.selection.textContent = renderSelection(state, uiState.selectedTile);
  ui.preview.textContent = renderPreview(uiState.placementPreview);
  ui.sound.textContent = `Sound: ${uiState.settings.soundEnabled ? "On" : "Off"}`;
  ui.sound.setAttribute("aria-pressed", String(uiState.settings.soundEnabled));
  updateToolButtons(state, uiState);
  updateTaxControls(state);
}

function renderDemandBars(state: CityState): string {
  return (["residential", "commercial", "industrial"] as const)
    .map((zone) => {
      const label = zone.slice(0, 1).toUpperCase();
      return `<div class="demand-row"><span>${label}</span><b style="width:${state.demand[zone]}%"></b><em>${state.demand[zone]}</em></div>`;
    })
    .join("");
}

function renderWarnings(state: CityState): string {
  if (state.warnings.length === 0) return "<li>No active warnings</li>";
  return state.warnings
    .slice(0, 4)
    .map((warning) => `<li>${warning.message} ${warning.suggestedFix}</li>`)
    .join("");
}

function renderLoanStatus(state: CityState): string {
  const details = state.economy.loans.length
    ? state.economy.loans
        .map(
          (loan) =>
            `${capitalize(loan.type)}: ${loan.remainingMonths}mo · ${formatMoney(loan.monthlyPayment)}/mo`,
        )
        .join("<br>")
    : "No active loans";
  return `
    <p><strong>Loans</strong><br>${details}</p>
    <div class="loan-row">
      <button data-action="loan" data-loan="small">Borrow $5k</button>
      <button data-action="loan" data-loan="medium">Borrow $10k</button>
      <button data-action="loan" data-loan="large">Borrow $20k</button>
    </div>`;
}

function renderSelection(
  state: CityState,
  tilePosition: [number, number] | null,
): string {
  if (!tilePosition) return "No tile selected";
  const tile = getTile(state, tilePosition[0], tilePosition[1]);
  if (!tile) return "No tile selected";
  const building = tile.buildingId
    ? state.buildings.find((candidate) => candidate.id === tile.buildingId)
    : null;
  const definition = building ? getBuildingById(building.definitionId) : null;
  if (definition) return `${definition.name} ${building?.status ?? ""}`;
  if (tile.roadId) return `Road at ${tile.x}, ${tile.y}`;
  if (tile.zone) return `${capitalize(tile.zone)} zone at ${tile.x}, ${tile.y}`;
  return `Empty tile ${tile.x}, ${tile.y}`;
}

function renderPreview(preview: PlacementPreview | null): string {
  if (!preview) return "Select a tool";
  const state = preview.valid ? "Valid" : "Invalid";
  return `${state} ${preview.label ?? "placement"} ${formatMoney(preview.cost)}`;
}

function updateToolButtons(state: CityState, uiState: UIState): void {
  ui.root.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
    button.classList.toggle("active", isActiveButton(button, uiState));
    button.disabled = isButtonLocked(button, state);
  });
}

function updateTaxControls(state: CityState): void {
  ui.root.querySelectorAll<HTMLInputElement>("[data-tax]").forEach((input) => {
    const tax = input.dataset.tax;
    if (tax === "residential" || tax === "commercial" || tax === "industrial") {
      input.value = String(state.economy.taxRates[tax]);
      const output = input.nextElementSibling;
      if (output) output.textContent = `${state.economy.taxRates[tax]}%`;
    }
  });
}

function isActiveButton(button: HTMLButtonElement, uiState: UIState): boolean {
  if (button.dataset.action === "road") return uiState.buildMode === "road";
  if (button.dataset.action === "demolish") return uiState.buildMode === "demolish";
  if (button.dataset.zone) return uiState.selectedZoneType === button.dataset.zone;
  if (button.dataset.building)
    return uiState.selectedBuildingId === button.dataset.building;
  if (button.dataset.overlay) return uiState.activeOverlay === button.dataset.overlay;
  if (button.dataset.speed) {
    return (
      useSimulationStore.getState().state.time.speed === Number(button.dataset.speed)
    );
  }
  return false;
}

function isButtonLocked(button: HTMLButtonElement, state: CityState): boolean {
  const zone = button.dataset.zone as ZoneType | undefined;
  const buildingId = button.dataset.building;
  if (zone) return !state.progression.unlockedFeatures.includes(`${zone}_zoning`);
  if (button.dataset.action === "loan") return !canTakeLoan(state);
  if (!buildingId) return false;
  const definition = getBuildingById(buildingId);
  return Boolean(definition && state.population.total < definition.unlockPopulation);
}

function canTakeLoan(state: CityState): boolean {
  return (
    state.economy.money < LOAN_BALANCE.ELIGIBILITY_THRESHOLD &&
    state.economy.loans.length < LOAN_BALANCE.MAX_LOANS &&
    state.time.tick - state.economy.lastLoanTick >= LOAN_BALANCE.COOLDOWN_TICKS
  );
}

function createInterface(container: HTMLElement) {
  injectStyles();
  const root = document.createElement("section");
  root.className = "game-ui";
  root.innerHTML = getInterfaceMarkup();
  container.appendChild(root);
  return {
    root,
    money: getElement(root, "money"),
    population: getElement(root, "population"),
    happiness: getElement(root, "happiness"),
    income: getElement(root, "income"),
    date: getElement(root, "date"),
    objective: getElement(root, "objective"),
    demand: getElement(root, "demand"),
    loans: getElement(root, "loans"),
    warnings: getElement(root, "warnings"),
    selection: getElement(root, "selection"),
    preview: getElement(root, "preview"),
    status: getElement(root, "status"),
    sound: getElement(root, "sound"),
  };
}

function getInterfaceMarkup(): string {
  return `
    <div class="topbar">
      <span>Money <strong data-ui="money"></strong></span>
      <span>Population <strong data-ui="population"></strong></span>
      <span>Happiness <strong data-ui="happiness"></strong></span>
      <span>Income / upkeep <strong data-ui="income"></strong></span>
      <span>Date <strong data-ui="date"></strong></span>
      <button data-action="sound" data-ui="sound" aria-pressed="true"></button>
      <div class="speed">${speedButtons()}</div>
    </div>
    <aside class="panel left">
      <h1>First Settlement</h1>
      <p data-ui="objective"></p>
      <div data-ui="demand" class="demand"></div>
      <div class="taxes">${taxControls()}</div>
      <div data-ui="loans" class="loans"></div>
      <ol data-ui="warnings" class="warnings"></ol>
    </aside>
    <aside class="panel right">
      <h2>Inspector</h2>
      <p data-ui="selection"></p>
      <p data-ui="preview"></p>
      <p data-ui="status"></p>
      <div class="save-row">
        <button data-action="save">Save</button>
        <button data-action="load">Load</button>
      </div>
    </aside>
    <nav class="toolbar">${toolbarButtons()}</nav>
  `;
}

function toolbarButtons(): string {
  const buildings = getManualBuildings()
    .filter((building) => building.id !== "city_hall")
    .map(
      (building) =>
        `<button data-action="building" data-building="${building.id}">${building.name}</button>`,
    )
    .join("");
  return `
    <button data-action="road">Road</button>
    <button data-action="zone" data-zone="residential">Residential</button>
    <button data-action="zone" data-zone="commercial">Commercial</button>
    <button data-action="zone" data-zone="industrial">Industrial</button>
    ${buildings}
    <button data-action="demolish">Demolish</button>
    <button data-action="overlay" data-overlay="zoning">Zoning</button>
    <button data-action="overlay" data-overlay="pollution">Pollution</button>
    <button data-action="overlay" data-overlay="health">Health</button>
    <button data-action="overlay" data-overlay="education">Education</button>
  `;
}

function speedButtons(): string {
  return [0, 1, 2, 3]
    .map((speed) => `<button data-action="speed" data-speed="${speed}">${speed}</button>`)
    .join("");
}

function taxControls(): string {
  return (["residential", "commercial", "industrial"] as const)
    .map(
      (tax) => `
        <label>${capitalize(tax)}
          <input data-tax="${tax}" type="range" min="0" max="20" value="10" />
          <output>10%</output>
        </label>`,
    )
    .join("");
}

function injectStyles(): void {
  const style = document.createElement("style");
  style.textContent = `
    .game-ui{position:absolute;inset:0;pointer-events:none;font:14px/1.35 Inter,system-ui,sans-serif;color:#f7f8f2}
    .topbar,.panel,.toolbar{pointer-events:auto;background:rgba(24,31,34,.88);backdrop-filter:blur(10px);box-shadow:0 10px 28px rgba(0,0,0,.24)}
    .topbar{position:absolute;left:12px;right:12px;top:12px;display:flex;gap:16px;align-items:center;min-height:44px;padding:8px 12px;border:1px solid rgba(255,255,255,.13)}
    .topbar span{white-space:nowrap;color:#cfd8dc}.topbar strong{color:#fff;margin-left:4px}.speed{margin-left:auto;display:flex;gap:4px}
    .panel{position:absolute;top:72px;width:286px;max-height:calc(100vh - 164px);overflow:auto;padding:14px;border:1px solid rgba(255,255,255,.13)}
    .left{left:12px}.right{right:12px}.panel h1,.panel h2{font-size:16px;font-weight:700;margin:0 0 8px}.panel p{margin:0 0 10px;color:#dfe7ea}
    .toolbar{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:flex;gap:6px;max-width:min(1180px,calc(100vw - 24px));overflow:auto;padding:8px;border:1px solid rgba(255,255,255,.13)}
    button{border:1px solid rgba(255,255,255,.17);background:#344047;color:#f7f8f2;padding:8px 10px;min-height:34px;white-space:nowrap;cursor:pointer}
    button:hover{background:#44535c}button.active{background:#2f7d5b;border-color:#7ee0ab}button:disabled{opacity:.42;cursor:not-allowed}
    .demand{display:grid;gap:6px;margin:12px 0}.demand-row{display:grid;grid-template-columns:18px 1fr 30px;gap:8px;align-items:center}.demand-row b{height:8px;background:#7ee0ab;display:block}.demand-row em{font-style:normal;color:#cfd8dc;text-align:right}
    .taxes{display:grid;gap:8px;margin:12px 0}.taxes label{display:grid;grid-template-columns:84px 1fr 36px;gap:8px;align-items:center;color:#cfd8dc}
    input[type=range]{width:100%}.warnings{padding-left:18px;margin:10px 0 0;color:#ffdca8}.save-row{display:flex;gap:8px}
  `;
  document.head.appendChild(style);
}

function getElement(root: HTMLElement, key: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(`[data-ui="${key}"]`);
  if (!element) throw new Error(`Missing UI element ${key}`);
  return element;
}

function getRoadCost(roadType: "dirt" | "paved"): number {
  return roadType === "dirt"
    ? CONSTRUCTION_COSTS.DIRT_ROAD
    : CONSTRUCTION_COSTS.PAVED_ROAD;
}

function getModeLabel(uiState: UIState): string {
  if (uiState.buildMode === "zone" && uiState.selectedZoneType) {
    return `${capitalize(uiState.selectedZoneType)} zone`;
  }
  return uiState.buildMode ?? "placement";
}

function isOverlay(value: string | null | undefined): value is UIState["activeOverlay"] {
  return (
    value === null ||
    value === "zoning" ||
    value === "power" ||
    value === "water" ||
    value === "pollution" ||
    value === "health" ||
    value === "education"
  );
}

function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function capitalize(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
