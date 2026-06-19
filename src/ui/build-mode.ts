import type { PlacementPreview, BuildMode } from "../shared/types";

export interface BuildModeInput {
  gridX: number;
  gridY: number;
  buildMode: BuildMode;
  hasMoney: boolean;
}

export function computePlacementPreview(input: BuildModeInput): PlacementPreview | null {
  const { gridX, gridY, buildMode, hasMoney } = input;

  if (!buildMode) return null;

  switch (buildMode) {
    case "road":
      return {
        positions: [[gridX, gridY]],
        valid: hasMoney,
        cost: 50,
        label: "Dirt Road",
      };

    case "zone":
      return {
        positions: [[gridX, gridY]],
        valid: true,
        cost: 0,
        label: "Zone",
      };

    case "building":
      return {
        positions: [[gridX, gridY]],
        valid: hasMoney,
        cost: 0,
        label: "Building",
      };

    case "demolish":
      return {
        positions: [[gridX, gridY]],
        valid: true,
        cost: 0,
        label: "Demolish",
      };
  }
}
