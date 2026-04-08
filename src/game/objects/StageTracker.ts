import { stageThresholds } from '../../config/game';
import type { StageReached } from '../../types/app';

export class StageTracker {
  getStage(score: number): StageReached {
    let currentStage: StageReached = 'Discovery';

    for (const threshold of stageThresholds) {
      if (score >= threshold.minScore) {
        currentStage = threshold.stage;
      }
    }

    return currentStage;
  }

  getProgress(score: number): number {
    const currentIndex = stageThresholds.findLastIndex((threshold) => score >= threshold.minScore);
    const current = stageThresholds[currentIndex];
    const next = stageThresholds[currentIndex + 1];

    if (!current || !next) {
      return 1;
    }

    return Math.min(1, (score - current.minScore) / (next.minScore - current.minScore));
  }
}
