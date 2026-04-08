import { difficultyConfig } from '../../config/difficulty';

export class DifficultySystem {
  private elapsedMs = 0;

  update(deltaMs: number): { speed: number; progress: number } {
    this.elapsedMs += deltaMs;
    const seconds = this.elapsedMs / 1000;
    const speed = Math.min(
      difficultyConfig.maxSpeed,
      difficultyConfig.initialSpeed + seconds * difficultyConfig.speedIncreasePerSecond
    );

    return {
      speed,
      progress: Math.min(1, speed / difficultyConfig.maxSpeed),
    };
  }
}
