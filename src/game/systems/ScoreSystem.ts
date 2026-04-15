export class ScoreSystem {
  private elapsedMs = 0;

  private distance = 0;

  private bonus = 0;

  addBonus(value: number): void {
    this.bonus += value;
  }

  update(deltaMs: number, currentSpeed: number): { score: number; distance: number; elapsedMs: number } {
    this.elapsedMs += deltaMs;
    this.distance += currentSpeed * (deltaMs / 1000);

    return {
      score: Math.floor(this.elapsedMs / 100) + this.bonus,
      distance: Math.floor(this.distance),
      elapsedMs: this.elapsedMs,
    };
  }
}
