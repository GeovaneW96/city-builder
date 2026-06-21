import type { GraphicsQuality } from "../../shared/types";

export interface RenderQualityProfile {
  pixelRatioCap: number;
  shadowMapSize: number;
  bloom: boolean;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  detailDensity: number;
  propDensity: number;
  vehicleDensity: number;
  treeDensity: number;
  fogDensity: number;
  waterQuality: number;
}

export const RENDER_QUALITY_PROFILES: Record<GraphicsQuality, RenderQualityProfile> = {
  low: {
    pixelRatioCap: 1,
    shadowMapSize: 512,
    bloom: false,
    bloomStrength: 0,
    bloomRadius: 0,
    bloomThreshold: 1,
    detailDensity: 0.3,
    propDensity: 0.2,
    vehicleDensity: 0,
    treeDensity: 0.3,
    fogDensity: 0.4,
    waterQuality: 0,
  },
  medium: {
    pixelRatioCap: 1.5,
    shadowMapSize: 1024,
    bloom: false,
    bloomStrength: 0,
    bloomRadius: 0,
    bloomThreshold: 1,
    detailDensity: 0.55,
    propDensity: 0.4,
    vehicleDensity: 0.3,
    treeDensity: 0.5,
    fogDensity: 0.7,
    waterQuality: 1,
  },
  high: {
    pixelRatioCap: 2,
    shadowMapSize: 2048,
    bloom: true,
    bloomStrength: 0.15,
    bloomRadius: 0.08,
    bloomThreshold: 0.92,
    detailDensity: 0.8,
    propDensity: 0.7,
    vehicleDensity: 0.6,
    treeDensity: 0.7,
    fogDensity: 1,
    waterQuality: 1,
  },
  ultra: {
    pixelRatioCap: 2,
    shadowMapSize: 2048,
    bloom: true,
    bloomStrength: 0.2,
    bloomRadius: 0.1,
    bloomThreshold: 0.9,
    detailDensity: 1,
    propDensity: 1,
    vehicleDensity: 1,
    treeDensity: 1,
    fogDensity: 1,
    waterQuality: 2,
  },
};

export function getRenderQualityProfile(quality: GraphicsQuality): RenderQualityProfile {
  return RENDER_QUALITY_PROFILES[quality];
}
