import Phaser from 'phaser';
import { registerGeneratedTextures } from '../systems/TextureFactory';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  create(): void {
    registerGeneratedTextures(this);
    this.scene.start('MenuScene');
  }
}
