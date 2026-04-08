import Phaser from 'phaser';
import { gameConfig } from '../../config/game';
import type { PendingRun } from '../../types/app';
import { Player } from '../objects/Player';
import { createSceneBackdrop, type BackdropLayers } from '../systems/SceneBackdrop';

interface ResultSceneData {
  pendingRun?: PendingRun;
}

export class ResultScene extends Phaser.Scene {
  private layers!: BackdropLayers;

  private player!: Player;

  private scoreText?: Phaser.GameObjects.Text;

  constructor() {
    super('ResultScene');
  }

  create(data?: ResultSceneData): void {
    this.layers = createSceneBackdrop(this);
    this.player = new Player(this, gameConfig.logicalWidth * 0.32, gameConfig.groundY - 4);
    this.player.fail();

    this.add.rectangle(gameConfig.logicalWidth * 0.7, 240, 176, 176, 0x0c1710, 0.84).setStrokeStyle(2, 0x4da68b, 0.4);
    this.add.text(gameConfig.logicalWidth * 0.7, 194, data?.pendingRun?.stageReached ?? 'Discovery', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '28px',
      fontStyle: '700',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 140 },
    }).setOrigin(0.5);

    this.scoreText = this.add
      .text(gameConfig.logicalWidth * 0.7, 282, `${data?.pendingRun?.score ?? 0}`, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '48px',
        fontStyle: '700',
        color: '#8fd6bc',
      })
      .setOrigin(0.5);
  }

  update(_time: number, delta: number): void {
    this.layers.grid.tilePositionX += delta * 0.005;
    this.layers.bars.tilePositionX += delta * 0.011;

    if (this.scoreText) {
      this.scoreText.rotation = Math.sin(this.time.now / 400) * 0.01;
    }
  }
}
