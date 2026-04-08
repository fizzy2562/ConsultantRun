import Phaser from 'phaser';
import type { ObstacleDefinition } from '../../types/app';

export class Obstacle extends Phaser.Physics.Arcade.Sprite {
  readonly definition: ObstacleDefinition;

  private label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, definition: ObstacleDefinition) {
    super(scene, x, y, 'obstacle-card');

    this.definition = definition;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setDepth(2);
    this.setTint(definition.accent);
    this.setDisplaySize(definition.width, definition.height);

    this.label = scene.add.text(x, y - definition.height / 2, definition.label, {
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
      fontStyle: '700',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: definition.width - 22 },
    });
    this.label.setOrigin(0.5);
    this.label.setDepth(3);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(definition.width - 16, definition.height - 10);
    body.setOffset(8, 8);
  }

  syncLabel(): void {
    this.label.setPosition(this.x, this.y - this.displayHeight / 2);
  }

  override destroy(fromScene?: boolean): void {
    this.label.destroy();
    super.destroy(fromScene);
  }
}
