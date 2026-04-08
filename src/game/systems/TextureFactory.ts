import Phaser from 'phaser';

function generateRoundedRect(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  fill: number,
  stroke: number
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const graphics = scene.make.graphics();
  graphics.fillStyle(fill, 1);
  graphics.lineStyle(4, stroke, 1);
  graphics.fillRoundedRect(0, 0, width, height, 18);
  graphics.strokeRoundedRect(2, 2, width - 4, height - 4, 16);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

function generateRunnerFrame(
  scene: Phaser.Scene,
  key: string,
  options: { legOffset: number; armOffset: number; accent: number; tilt?: number; fail?: boolean }
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const width = 96;
  const height = 124;
  const graphics = scene.make.graphics();
  const tilt = options.tilt ?? 0;

  graphics.fillStyle(0xffffff, 1);
  graphics.fillCircle(42, 20, 14);
  graphics.fillRoundedRect(30 + tilt, 34, 28, 42, 12);
  graphics.fillStyle(options.accent, 1);
  graphics.fillRoundedRect(28 + tilt, 42, 34, 16, 8);

  graphics.fillStyle(options.fail ? 0xd46f67 : 0xffffff, 1);
  graphics.fillRoundedRect(18 + options.armOffset + tilt, 44, 20, 10, 5);
  graphics.fillRoundedRect(52 + tilt, 46, 22, 10, 5);
  graphics.fillRoundedRect(30 + options.legOffset + tilt, 72, 12, 32, 5);
  graphics.fillRoundedRect(46 - options.legOffset + tilt, 72, 12, 32, 5);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

function generatePattern(scene: Phaser.Scene, key: string, draw: (graphics: Phaser.GameObjects.Graphics) => void): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const graphics = scene.make.graphics();
  draw(graphics);
  graphics.generateTexture(key, 256, 256);
  graphics.destroy();
}

export function registerGeneratedTextures(scene: Phaser.Scene): void {
  generateRoundedRect(scene, 'obstacle-card', 180, 120, 0x202b23, 0xffffff);
  generateRoundedRect(scene, 'ground-strip', 256, 40, 0x121f15, 0x2f4938);

  generateRunnerFrame(scene, 'runner-idle', { legOffset: 0, armOffset: 0, accent: 0x4da68b });
  generateRunnerFrame(scene, 'runner-run-1', { legOffset: -12, armOffset: -10, accent: 0x3d7fab });
  generateRunnerFrame(scene, 'runner-run-2', { legOffset: 12, armOffset: 8, accent: 0x51ac52 });
  generateRunnerFrame(scene, 'runner-jump', { legOffset: 4, armOffset: 10, accent: 0x4da68b, tilt: -6 });
  generateRunnerFrame(scene, 'runner-fail', { legOffset: -6, armOffset: -8, accent: 0xb26d6d, tilt: 8, fail: true });

  generatePattern(scene, 'bg-grid', (graphics) => {
    graphics.clear();
    graphics.fillStyle(0x07120a, 1);
    graphics.fillRect(0, 0, 256, 256);
    graphics.lineStyle(1, 0x113220, 0.55);

    for (let x = 0; x <= 256; x += 32) {
      graphics.lineBetween(x, 0, x, 256);
    }

    for (let y = 0; y <= 256; y += 32) {
      graphics.lineBetween(0, y, 256, y);
    }
  });

  generatePattern(scene, 'bg-bars', (graphics) => {
    graphics.clear();
    graphics.fillStyle(0x051109, 1);
    graphics.fillRect(0, 0, 256, 256);

    for (let index = 0; index < 10; index += 1) {
      graphics.fillStyle(index % 2 === 0 ? 0x0d1c12 : 0x0a160d, 0.9);
      graphics.fillRect(index * 26, 48 + (index % 3) * 18, 18, 170 - index * 8);
    }
  });

  if (!scene.anims.exists('runner-idle')) {
    scene.anims.create({
      key: 'runner-idle',
      frames: [{ key: 'runner-idle' }],
      frameRate: 1,
      repeat: -1,
    });
  }

  if (!scene.anims.exists('runner-run')) {
    scene.anims.create({
      key: 'runner-run',
      frames: [{ key: 'runner-run-1' }, { key: 'runner-run-2' }],
      frameRate: 8,
      repeat: -1,
    });
  }

  if (!scene.anims.exists('runner-jump')) {
    scene.anims.create({
      key: 'runner-jump',
      frames: [{ key: 'runner-jump' }],
      frameRate: 1,
      repeat: -1,
    });
  }

  if (!scene.anims.exists('runner-fail')) {
    scene.anims.create({
      key: 'runner-fail',
      frames: [{ key: 'runner-fail' }],
      frameRate: 1,
      repeat: -1,
    });
  }
}
