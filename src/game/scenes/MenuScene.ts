import Phaser from 'phaser';
import { gameConfig } from '../../config/game';
import { Player } from '../objects/Player';
import { createSceneBackdrop, type BackdropLayers } from '../systems/SceneBackdrop';

export class MenuScene extends Phaser.Scene {
  private layers!: BackdropLayers;

  private player!: Player;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.layers = createSceneBackdrop(this);
    this.player = new Player(this, gameConfig.logicalWidth * 0.34, gameConfig.groundY - 6);
    this.player.setScale(1.15);
    this.player.setIdle();

    const runway = this.add.tileSprite(
      gameConfig.logicalWidth / 2,
      gameConfig.groundY + 8,
      gameConfig.logicalWidth,
      40,
      'ground-strip'
    );
    runway.setDepth(2);

    this.tweens.add({
      targets: this.player,
      y: gameConfig.groundY - 14,
      duration: 900,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  update(_time: number, delta: number): void {
    this.layers.grid.tilePositionX += delta * 0.006;
    this.layers.bars.tilePositionX += delta * 0.012;
  }
}
