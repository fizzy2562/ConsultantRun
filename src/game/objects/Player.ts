import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'runner-idle');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(3);
    this.setOrigin(0.5, 1);
    this.setBounce(0);
    this.setCollideWorldBounds(false);
    this.setBodySize(56, 90);
    this.setOffset(18, 20);
    this.play('runner-run');
  }

  startRun(): void {
    this.play('runner-run', true);
  }

  setIdle(): void {
    this.play('runner-idle', true);
  }

  jump(): void {
    this.play('runner-jump', true);
  }

  fail(): void {
    this.play('runner-fail', true);
    this.setTint(0xffd7d0);
  }

  clearFailState(): void {
    this.clearTint();
    this.startRun();
  }
}
