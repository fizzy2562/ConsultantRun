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

    const cropWidth = definition.cropWidth ?? this.width;
    const cropHeight = definition.cropHeight ?? this.height;
    const cropX = definition.cropX ?? 0;
    const cropY = definition.cropY ?? 0;

    if (definition.cropWidth && definition.cropHeight) {
      this.setCrop(cropX, cropY, cropWidth, cropHeight);
    }

    this.setDisplaySize(definition.width, definition.height);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(definition.bodyWidth, definition.bodyHeight);
    body.setOffset(definition.bodyOffsetX, definition.bodyOffsetY);
  }

  getDebugSnapshot(): {
    cropHeight: number;
    cropWidth: number;
    displayHeight: number;
    displayWidth: number;
    key: string;
    targetHeight: number;
    targetWidth: number;
  } {
    return {
      cropHeight: this.definition.cropHeight ?? this.height,
      cropWidth: this.definition.cropWidth ?? this.width,
      displayHeight: this.displayHeight,
      displayWidth: this.displayWidth,
      key: this.definition.key,
      targetHeight: this.definition.height,
      targetWidth: this.definition.width,
    };
  }
}
