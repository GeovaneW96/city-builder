export interface MapPerformanceBudget {
  size: 64 | 128 | 256;
  tileCount: number;
  estimatedStateMb: number;
  recommendedChunkSize: number;
}

export function getMapPerformanceBudget(size: 64 | 128 | 256): MapPerformanceBudget {
  const budgets = {
    64: { estimatedStateMb: 0.5, recommendedChunkSize: 64 },
    128: { estimatedStateMb: 2, recommendedChunkSize: 64 },
    256: { estimatedStateMb: 8, recommendedChunkSize: 32 },
  };
  return { size, tileCount: size * size, ...budgets[size] };
}
