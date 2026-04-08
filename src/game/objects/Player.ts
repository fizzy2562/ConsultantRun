import Phaser from 'phaser';
import { characters } from '../../config/game';
import { ensureRunnerAnimations } from '../systems/RunnerSprites';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private characterKey: string;

  constructor(scene: Phaser.Scene, x: number, y: number, characterKey?: string) {
    const key = characterKey ?? characters[0].key;
    super(scene, x, y, key, 0);

    this.characterKey = key;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    ensureRunnerAnimations(scene, this.characterKey);

    this.setDepth(3);
    this.setOrigin(0.5, 1);
    this.setBounce(0);
    this.setCollideWorldBounds(false);
    this.setBodySize(42, 96);
    this.setOffset(43, 22);
    this.playState('run', 1);
  }

  startRun(): void {
    this.playState('run', 1, true);
  }

  setIdle(): void {
    this.playState('idle', 0, true);
  }

  jump(): void {
    this.playState('jump', 3, true);
  }

  fail(): void {
    this.playState('fail', 4, true);
    this.setTint(0xffd7d0);
  }

  clearFailState(): void {
    this.clearTint();
    this.startRun();
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    if (this.texture.key === '__MISSING' && this.scene.textures.exists(this.characterKey)) {
      this.setVisible(true);
      this.setTexture(this.characterKey, 0);
      ensureRunnerAnimations(this.scene, this.characterKey);
      this.startRun();
    }
  }

  private playState(state: 'idle' | 'run' | 'jump' | 'fail', fallbackFrame: number, ignoreIfPlaying = false): void {
    const animationKey = `${this.characterKey}-${state}`;

    if (this.scene.anims.exists(animationKey)) {
      this.play(animationKey, ignoreIfPlaying);
      return;
    }

    if (this.scene.textures.exists(this.characterKey)) {
      this.setVisible(true);
      this.setTexture(this.characterKey, fallbackFrame);
      return;
    }

    this.setVisible(false);
  }
}
