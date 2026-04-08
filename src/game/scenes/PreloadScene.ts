import Phaser from 'phaser';
import { preloadRunnerSprites, registerRunnerAnimations } from '../systems/RunnerSprites';
import { registerGeneratedTextures } from '../systems/TextureFactory';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    preloadRunnerSprites(this);
  }

  create(): void {
    registerGeneratedTextures(this);
    registerRunnerAnimations(this);
    this.scene.start('MenuScene');
  }
}
