import Phaser from 'phaser';
import { difficultyConfig } from '../../config/difficulty';
import { gameConfig } from '../../config/game';
import type { PendingRun, StageReached } from '../../types/app';
import { audioSystem } from '../systems/AudioSystem';
import { DifficultySystem } from '../systems/DifficultySystem';
import { Player } from '../objects/Player';
import { Obstacle } from '../objects/Obstacle';
import { StageTracker } from '../objects/StageTracker';
import { ScoreSystem } from '../systems/ScoreSystem';
import { createSceneBackdrop, type BackdropLayers } from '../systems/SceneBackdrop';
import { SpawnSystem } from '../systems/SpawnSystem';

export class PlayScene extends Phaser.Scene {
  private layers!: BackdropLayers;

  private player!: Player;

  private ground!: Phaser.GameObjects.Rectangle;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private spaceKey!: Phaser.Input.Keyboard.Key;

  private scoreText!: Phaser.GameObjects.Text;

  private stageText!: Phaser.GameObjects.Text;

  private progressBar!: Phaser.GameObjects.Rectangle;

  private obstacles!: Phaser.Physics.Arcade.Group;

  private scoreSystem!: ScoreSystem;

  private difficultySystem!: DifficultySystem;

  private spawnSystem!: SpawnSystem;

  private stageTracker!: StageTracker;

  private currentSpeed = difficultyConfig.initialSpeed;

  private currentStage: StageReached = 'Discovery';

  private obstacleClears = 0;

  private isGameOver = false;

  private characterKey = '';

  private jumpCount = 0;

  private isE2EMode = false;

  constructor() {
    super('PlayScene');
  }

  init(data: { characterKey?: string }): void {
    this.characterKey = data.characterKey ?? '';
    this.isE2EMode =
      typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('e2e') === '1';
  }

  create(): void {
    this.layers = createSceneBackdrop(this);

    this.ground = this.add
      .rectangle(gameConfig.logicalWidth / 2, gameConfig.groundY + 22, gameConfig.logicalWidth, 54, 0x112117, 0.88)
      .setDepth(1.2);

    const groundBody = this.physics.add.existing(this.ground, true);
    (groundBody.body as Phaser.Physics.Arcade.StaticBody).setSize(gameConfig.logicalWidth, 54);

    this.player = new Player(this, gameConfig.runnerStartX, gameConfig.groundY, this.characterKey || undefined);
    this.player.setCollideWorldBounds(false);
    this.player.clearFailState();

    this.physics.world.gravity.y = difficultyConfig.gravityY;
    this.physics.add.collider(this.player, this.ground);

    this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true });
    this.physics.add.overlap(this.player, this.obstacles, () => this.finishRun(), undefined, this);

    this.scoreSystem = new ScoreSystem();
    this.difficultySystem = new DifficultySystem();
    this.spawnSystem = new SpawnSystem();
    this.stageTracker = new StageTracker();

    this.cursors = this.input.keyboard?.createCursorKeys() ?? ({} as Phaser.Types.Input.Keyboard.CursorKeys);
    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE) as Phaser.Input.Keyboard.Key;

    this.input.on('pointerdown', () => this.handleJump());

    this.stageText = this.add.text(gameConfig.hudPadding, 24, 'Discovery', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '22px',
      fontStyle: '700',
      color: '#8fd6bc',
    });
    this.stageText.setDepth(5);

    this.scoreText = this.add.text(gameConfig.logicalWidth - gameConfig.hudPadding, 24, '000', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '22px',
      fontStyle: '700',
      color: '#ffffff',
    });
    this.scoreText.setOrigin(1, 0);
    this.scoreText.setDepth(5);

    this.add
      .rectangle(gameConfig.logicalWidth / 2, 74, gameConfig.logicalWidth - 48, 10, 0x16251b, 0.92)
      .setDepth(4)
      .setOrigin(0.5);

    this.progressBar = this.add
      .rectangle(24, 74, 8, 10, 0x4da68b, 1)
      .setDepth(5)
      .setOrigin(0, 0.5);
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.handleJump();
    }

    const difficulty = this.difficultySystem.update(delta);
    this.currentSpeed = difficulty.speed;
    this.layers.grid.tilePositionX += this.currentSpeed * (delta / 1000) * 0.12;
    this.layers.bars.tilePositionX += this.currentSpeed * (delta / 1000) * 0.18;

    const scoreState = this.scoreSystem.update(delta, this.currentSpeed);
    const nextStage = this.stageTracker.getStage(scoreState.score);

    if (nextStage !== this.currentStage) {
      this.currentStage = nextStage;
      this.stageText.setText(nextStage);
      audioSystem.play('milestone');
    }

    this.progressBar.width = (gameConfig.logicalWidth - 48) * this.stageTracker.getProgress(scoreState.score);
    this.scoreText.setText(scoreState.score.toString().padStart(3, '0'));

    if (!this.isE2EMode) {
      const spawnDefinition = this.spawnSystem.update(
        this.currentSpeed * (delta / 1000),
        scoreState.elapsedMs,
      );

      if (spawnDefinition) {
        const obstacle = new Obstacle(
          this,
          gameConfig.logicalWidth + spawnDefinition.width,
          gameConfig.groundY + 6,
          spawnDefinition,
        );
        this.obstacles.add(obstacle);
      }
    }

    this.obstacles.getChildren().forEach((entry) => {
      const obstacle = entry as Obstacle;
      obstacle.x -= this.currentSpeed * obstacle.definition.speedModifier * (delta / 1000);
      obstacle.syncLabel();

      if (obstacle.x < -obstacle.displayWidth) {
        this.obstacleClears += 1;
        obstacle.destroy();
      }
    });

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (!body.touching.down && body.velocity.y < 0) {
      this.player.jump();
    } else if (body.touching.down) {
      this.player.startRun();
    }
  }

  private handleJump(): void {
    if (this.isGameOver) {
      return;
    }

    audioSystem.unlock();

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (!body.blocked.down && !body.touching.down) {
      return;
    }

    body.setVelocityY(difficultyConfig.jumpVelocity);
    this.jumpCount += 1;
    this.player.jump();
    audioSystem.play('jump');
  }

  getDebugSnapshot(): {
    characterKey: string;
    isGameOver: boolean;
    jumpCount: number;
    playerY: number | null;
    scoreText: string | null;
  } {
    return {
      characterKey: this.characterKey,
      isGameOver: this.isGameOver,
      jumpCount: this.jumpCount,
      playerY: this.player?.y ?? null,
      scoreText: this.scoreText?.text ?? null,
    };
  }

  forceFinishForTest(): void {
    this.finishRun();
  }

  private finishRun(): void {
    if (this.isGameOver) {
      return;
    }

    this.isGameOver = true;
    this.player.fail();
    audioSystem.play('collision');

    this.physics.pause();

    const runState = this.scoreSystem.update(0, this.currentSpeed);
    const pendingRun: PendingRun = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      score: runState.score,
      distance: runState.distance,
      durationMs: runState.elapsedMs,
      stageReached: this.currentStage,
      obstacleClears: this.obstacleClears,
      characterKey: this.characterKey,
    };

    this.time.delayedCall(500, () => {
      this.game.events.emit('run-ended', pendingRun);
    });
  }
}
