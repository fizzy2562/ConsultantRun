import Phaser from 'phaser';
import { gameConfig } from '../../config/game';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(gameConfig.backgroundColor);
    this.scene.start('PreloadScene');
  }
}
