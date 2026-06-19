import { create } from "zustand";
import type { UIState } from "../shared/types";

interface UIStore extends UIState {
  setSelectedTile: (tile: [number, number] | null) => void;
  setHoveredTile: (tile: [number, number] | null) => void;
  setBuildMode: (mode: UIState["buildMode"]) => void;
  setPlacementPreview: (preview: UIState["placementPreview"]) => void;
  setActiveOverlay: (overlay: UIState["activeOverlay"]) => void;
  updateCamera: (camera: Partial<UIState["camera"]>) => void;
  updateSettings: (settings: Partial<UIState["settings"]>) => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  camera: {
    position: [32, 40, 32],
    target: [32, 0, 32],
    zoom: 1,
    pitch: 45,
    rotation: 0,
  },
  selectedTile: null,
  hoveredTile: null,
  buildMode: null,
  placementPreview: null,
  activeOverlay: null,
  settings: {
    graphicsQuality: "medium",
    soundEnabled: true,
    musicVolume: 0.7,
    sfxVolume: 1.0,
  },

  setSelectedTile: (tile) => set({ selectedTile: tile }),
  setHoveredTile: (tile) => set({ hoveredTile: tile }),
  setBuildMode: (mode) => set({ buildMode: mode, placementPreview: null }),
  setPlacementPreview: (preview) => set({ placementPreview: preview }),
  setActiveOverlay: (overlay) => set({ activeOverlay: overlay }),
  updateCamera: (camera) => set((s) => ({ camera: { ...s.camera, ...camera } })),
  updateSettings: (settings) =>
    set((s) => ({ settings: { ...s.settings, ...settings } })),
}));
