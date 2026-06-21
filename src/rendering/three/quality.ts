import type { GraphicsQuality } from "../../shared/types";

export interface RenderQualityProfile {
  pixelRatioCap: number;
  shadowMapSize: number;
  bloom: boolean;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  detailDensity: number;
}

export const RENDER_QUALITY_PROFILES: Record<GraphicsQuality, RenderQualityProfile> = {
  low: {
    pixelRatioCap: 1,
    shadowMapSize: 1024,
    bloom: false,
    bloomStrength: 0,
    bloomRadius: 0,
    bloomThreshold: 1,
    detailDensity: 0.35,
  },
  medium: {
    pixelRatioCap: 1.5,
    shadowMapSize: 1024,
    bloom: false,
    bloomStrength: 0,
    bloomRadius: 0,
    bloomThreshold: 1,
    detailDensity: 0.58,
  },
  high: {
    pixelRatioCap: 2,
    shadowMapSize: 2048,
    bloom: true,
    bloomStrength: 0.55,
    bloomRadius: 0.42,
    bloomThreshold: 0.78,
    detailDensity: 0.8,
  },
  ultra: {
    pixelRatioCap: 2,
    shadowMapSize: 2048,
    bloom: true,
    bloomStrength: 0.8,
    bloomRadius: 0.52,
    bloomThreshold: 0.68,
    detailDensity: 1,
  },
};

export function getRenderQualityProfile(quality: GraphicsQuality): RenderQualityProfile {
  return RENDER_QUALITY_PROFILES[quality];
}
