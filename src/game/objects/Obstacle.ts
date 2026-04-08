import Phaser from 'phaser';
import type { ObstacleDefinition } from '../../types/app';

export class Obstacle extends Phaser.Physics.Arcade.Sprite {
  readonly definition: ObstacleDefinition;

  constructor(scene: Phaser.Scene, x: number, y: number, definition: ObstacleDefinition) {
    super(scene, x, y, definition.assetKey);

    this.definition = definition;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setDepth(2);
    this.setDisplaySize(definition.width, definition.height);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(definition.bodyWidth, definition.bodyHeight);
    body.setOffset(definition.bodyOffsetX, definition.bodyOffsetY);
  }
}
