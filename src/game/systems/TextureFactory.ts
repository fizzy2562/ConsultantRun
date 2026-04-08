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
}
