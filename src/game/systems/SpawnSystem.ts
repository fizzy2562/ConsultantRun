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
    return this.pickObstacle();
  }

  private pickGap(elapsedMs: number): number {
    const progress = Math.min(1, elapsedMs / 45_000);
    const minGap = Phaser.Math.Linear(
      difficultyConfig.minSpawnGap,
      difficultyConfig.minSpawnGapLate,
      progress
    );
    const maxGap = Phaser.Math.Linear(
      difficultyConfig.maxSpawnGap,
      difficultyConfig.maxSpawnGapLate,
      progress
    );

    return Phaser.Math.Between(Math.round(minGap), Math.round(maxGap));
  }

  private pickObstacle(): ObstacleDefinition {
    const totalWeight = obstacleDefinitions.reduce((sum, obstacle) => sum + obstacle.weight, 0);
    let cursor = Math.random() * totalWeight;

    for (const obstacle of obstacleDefinitions) {
      cursor -= obstacle.weight;

      if (cursor <= 0) {
        return obstacle;
      }
    }

    return obstacleDefinitions[0];
  }
}
