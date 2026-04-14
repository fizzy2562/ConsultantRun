import Phaser from 'phaser';
import { difficultyConfig } from '../../config/difficulty';
import { obstacleDefinitions } from '../../config/game';
import type { ObstacleDefinition } from '../../types/app';

export class SpawnSystem {
  private remainingGap = difficultyConfig.maxSpawnGap;

  update(distanceTravelled: number, elapsedMs: number): ObstacleDefinition | null {
    this.remainingGap -= distanceTravelled;

    if (this.remainingGap > 0) {
      return null;
    }

    this.remainingGap = this.pickGap(elapsedMs);
    return this.pickObstacle(elapsedMs);
  }

  private pickGap(elapsedMs: number): number {
    const progress = Math.min(1, elapsedMs / 45_000);
    const warmupBoost = elapsedMs < 8_000 ? 120 : elapsedMs < 14_000 ? 60 : 0;
    const minGap = Phaser.Math.Linear(
      difficultyConfig.minSpawnGap,
      difficultyConfig.minSpawnGapLate,
      progress
    ) + warmupBoost;
    const maxGap = Phaser.Math.Linear(
      difficultyConfig.maxSpawnGap,
      difficultyConfig.maxSpawnGapLate,
      progress
    ) + warmupBoost;

    return Phaser.Math.Between(Math.round(minGap), Math.round(maxGap));
  }

  private pickObstacle(elapsedMs = 0): ObstacleDefinition {
    const availableObstacles = obstacleDefinitions.filter((obstacle) => {
      if (elapsedMs < 8_000) {
        return obstacle.key === 'missing-reqs' || obstacle.key === 'client-changed-mind';
      }

      if (elapsedMs < 18_000) {
        return obstacle.key !== 'budget-freeze';
      }

      return true;
    });

    const totalWeight = availableObstacles.reduce((sum, obstacle) => sum + obstacle.weight, 0);
    let cursor = Math.random() * totalWeight;

    for (const obstacle of availableObstacles) {
      cursor -= obstacle.weight;

      if (cursor <= 0) {
        return obstacle;
      }
    }

    return availableObstacles[0] ?? obstacleDefinitions[0];
  }
}
