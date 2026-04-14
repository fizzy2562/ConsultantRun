import Phaser from 'phaser';
import { difficultyConfig } from '../../config/difficulty';
import { gameConfig, obstacleDefinitions } from '../../config/game';
import type { PendingRun, StageReached } from '../../types/app';
import { audioSystem } from '../systems/AudioSystem';
import { DifficultySystem } from '../systems/DifficultySystem';
import { Player } from '../objects/Player';
import { Obstacle } from '../objects/Obstacle';
import { StageTracker } from '../objects/StageTracker';
import { ScoreSystem } from '../systems/ScoreSystem';
import { createSceneBackdrop, type BackdropLayers } from '../systems/SceneBackdrop';
import { SpawnSystem } from '../systems/SpawnSystem';

const stagePalette: Record<StageReached, { accent: number; aura: number; beamLeft: number; beamRight: number }> = {
  Discovery: { accent: 0x8fd6bc, aura: 0x3d7fab, beamLeft: 0x3d7fab, beamRight: 0x51ac52 },
  Design: { accent: 0x7ed5ff, aura: 0x4a8fc8, beamLeft: 0x4a8fc8, beamRight: 0x4da68b },
  Build: { accent: 0x97ef86, aura: 0x4da68b, beamLeft: 0x4da68b, beamRight: 0x78c96a },
  UAT: { accent: 0xffc96f, aura: 0xd48a37, beamLeft: 0xd48a37, beamRight: 0xf6b94f },
  'Go Live': { accent: 0xffef8a, aura: 0x61b8ff, beamLeft: 0x61b8ff, beamRight: 0x6ee98d },
};

export class PlayScene extends Phaser.Scene {
  private static nextInstanceId = 1;

  private layers!: BackdropLayers;

  private player!: Player;

  private ground!: Phaser.GameObjects.Rectangle;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private spaceKey!: Phaser.Input.Keyboard.Key;

  private scoreText!: Phaser.GameObjects.Text;

  private stageText!: Phaser.GameObjects.Text;

  private progressBar!: Phaser.GameObjects.Rectangle;

  private stagePulse!: Phaser.GameObjects.Rectangle;

  private runBadge!: Phaser.GameObjects.Text;

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

  private displayName = '';

  private jumpCount = 0;

  private isE2EMode = false;

  private instanceId = 0;

  constructor() {
    super('PlayScene');
  }

  init(data: { characterKey?: string; displayName?: string }): void {
    this.characterKey = data.characterKey ?? '';
    this.displayName = data.displayName ?? '';
    this.isE2EMode =
      typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('e2e') === '1';
    this.currentSpeed = difficultyConfig.initialSpeed;
    this.currentStage = 'Discovery';
    this.obstacleClears = 0;
    this.isGameOver = false;
    this.jumpCount = 0;
  }

  create(): void {
    this.instanceId = PlayScene.nextInstanceId;
    PlayScene.nextInstanceId += 1;
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

    this.stagePulse = this.add
      .rectangle(gameConfig.logicalWidth / 2, 118, gameConfig.logicalWidth - 72, 30, 0x4da68b, 0)
      .setDepth(4.5);

    this.runBadge = this.add.text(gameConfig.logicalWidth / 2, 118, 'Runway clear', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
      fontStyle: '700',
      color: '#dbfff2',
      align: 'center',
    });
    this.runBadge.setOrigin(0.5);
    this.runBadge.setDepth(5);

    this.applyStagePalette(this.currentStage, false);
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
    this.layers.beamLeft.rotation += delta * 0.00006;
    this.layers.beamRight.rotation -= delta * 0.00006;
    this.layers.aura.scaleX = 1 + Math.sin(this.time.now / 900) * 0.02;
    this.layers.aura.scaleY = 1 + Math.cos(this.time.now / 1050) * 0.03;

    const scoreState = this.scoreSystem.update(delta, this.currentSpeed);
    const nextStage = this.stageTracker.getStage(scoreState.score);

    if (nextStage !== this.currentStage) {
      this.currentStage = nextStage;
      this.stageText.setText(nextStage);
      this.runBadge.setText(`${nextStage} unlocked`);
      this.flashStagePulse();
      this.applyStagePalette(nextStage, true);
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
    currentStage: StageReached;
    instanceId: number;
    isGameOver: boolean;
    jumpCount: number;
    obstacle: ReturnType<Obstacle['getDebugSnapshot']> | null;
    playerY: number | null;
    scoreText: string | null;
  } {
    const activeObstacle = this.obstacles
      .getChildren()
      .find((entry) => entry.active) as Obstacle | undefined;

    return {
      characterKey: this.characterKey,
      currentStage: this.currentStage,
      instanceId: this.instanceId,
      isGameOver: this.isGameOver,
      jumpCount: this.jumpCount,
      obstacle: activeObstacle?.getDebugSnapshot() ?? null,
      playerY: this.player?.y ?? null,
      scoreText: this.scoreText?.text ?? null,
    };
  }

  forceFinishForTest(): void {
    this.finishRun();
  }

  forceSpawnObstacleForTest(key: string): void {
    const definition = obstacleDefinitions.find((entry) => entry.key === key);

    if (!definition) {
      throw new Error(`Unknown obstacle key: ${key}`);
    }

    const obstacle = new Obstacle(
      this,
      gameConfig.logicalWidth * 0.7,
      gameConfig.groundY + 6,
      definition,
    );
    (obstacle.body as Phaser.Physics.Arcade.Body | null)?.setVelocityX(0);
    this.obstacles.add(obstacle);
  }

  private finishRun(): void {
    if (this.isGameOver) {
      return;
    }

    this.isGameOver = true;
    this.player.fail();
    this.cameras.main.shake(180, 0.01);
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
      displayName: this.displayName || 'Consultant',
    };

    this.time.delayedCall(500, () => {
      this.game.events.emit('run-ended', pendingRun);
    });
  }

  private flashStagePulse(): void {
    this.stagePulse.setScale(1, 1);
    this.stagePulse.setAlpha(0.28);
    this.tweens.killTweensOf(this.stagePulse);
    this.tweens.add({
      targets: this.stagePulse,
      alpha: 0,
      scaleX: 1.02,
      scaleY: 1.18,
      duration: 450,
      ease: 'Sine.easeOut',
    });
  }

  private applyStagePalette(stage: StageReached, animate: boolean): void {
    const palette = stagePalette[stage];
    this.stageText.setColor(`#${palette.accent.toString(16).padStart(6, '0')}`);
    this.progressBar.fillColor = palette.accent;
    this.stagePulse.fillColor = palette.accent;

    const layers = [this.layers.aura, this.layers.beamLeft, this.layers.beamRight];
    const colors = [palette.aura, palette.beamLeft, palette.beamRight];

    layers.forEach((layer, index) => {
      if (animate) {
        this.tweens.addCounter({
          from: (layer.fillColor as number | undefined) ?? colors[index],
          to: colors[index],
          duration: 450,
          onUpdate: (tween) => {
            layer.fillColor = Number(tween.getValue());
          },
        });
      } else {
        layer.fillColor = colors[index];
      }
    });
  }
}
