import Phaser from 'phaser';
import { characters } from '../../config/game';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private characterKey: string;

  constructor(scene: Phaser.Scene, x: number, y: number, characterKey?: string) {
    const key = characterKey ?? characters[0].key;
    super(scene, x, y, `${key}-idle`);

    this.characterKey = key;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(3);
    this.setOrigin(0.5, 1);
    this.setBounce(0);
    this.setCollideWorldBounds(false);
    this.setBodySize(52, 98);
    this.setOffset(35, 22);
    this.play(`${this.characterKey}-run`);
  }

  startRun(): void {
    this.play(`${this.characterKey}-run`, true);
  }

  setIdle(): void {
    this.play(`${this.characterKey}-idle`, true);
  }

  jump(): void {
    this.play(`${this.characterKey}-jump`, true);
  }

  fail(): void {
    this.play(`${this.characterKey}-fail`, true);
    this.setTint(0xffd7d0);
  }

  clearFailState(): void {
    this.clearTint();
    this.startRun();
  }
}
