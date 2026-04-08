export class ScoreSystem {
  private elapsedMs = 0;

  private distance = 0;

  update(deltaMs: number, currentSpeed: number): { score: number; distance: number; elapsedMs: number } {
    this.elapsedMs += deltaMs;
    this.distance += currentSpeed * (deltaMs / 1000);

    return {
      score: Math.floor(this.elapsedMs / 100),
      distance: Math.floor(this.distance),
      elapsedMs: this.elapsedMs,
    };
  }
}
