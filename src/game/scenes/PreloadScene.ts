import Phaser from 'phaser';
import { preloadObstacleSprites } from '../systems/ObstacleSprites';
import { preloadRunnerSprites, registerRunnerAnimations } from '../systems/RunnerSprites';
import { registerGeneratedTextures } from '../systems/TextureFactory';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    preloadObstacleSprites(this);
    preloadRunnerSprites(this);
  }

  create(): void {
    registerGeneratedTextures(this);
    registerRunnerAnimations(this);
    this.scene.start('MenuScene');
  }
}
