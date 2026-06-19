import { Vector2 } from "three";
import { createScene, renderFrame } from "./rendering/three/scene";
import {
  createGrid,
  screenToGrid,
  updateHoverHighlight,
  updateSelectionHighlight,
} from "./rendering/three/grid";
import { useUIStore } from "./ui/store";
import { useSimulationStore } from "./simulation/store";

const app = document.getElementById("app");
if (!app) throw new Error("No #app element found");

const scene = createScene(app);
const grid = createGrid(scene.scene);

const mouse = new Vector2();

scene.renderer.domElement.addEventListener("mousemove", (event: MouseEvent) => {
  const rect = scene.renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  const gridPos = screenToGrid(mouse, scene.camera, grid.raycasterTarget);
  useUIStore.getState().setHoveredTile(gridPos);

  const buildMode = useUIStore.getState().buildMode;
  const hasMoney = useSimulationStore.getState().state.economy.money > 0;
  updateHoverHighlight(grid.hoverHighlight, gridPos, buildMode ? hasMoney : true);
});

scene.renderer.domElement.addEventListener("click", (_event: MouseEvent) => {
  const hovered = useUIStore.getState().hoveredTile;
  useUIStore.getState().setSelectedTile(hovered);
  updateSelectionHighlight(grid.selectionHighlight, hovered);
});

scene.renderer.domElement.addEventListener("mouseleave", () => {
  useUIStore.getState().setHoveredTile(null);
  grid.hoverHighlight.visible = false;
});

function animate(): void {
  renderFrame(scene);
  requestAnimationFrame(animate);
}

animate();
