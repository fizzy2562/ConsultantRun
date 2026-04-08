import Phaser from 'phaser';
import { characters } from '../../config/game';
import type { CharacterPalette } from '../../types/app';

function drawLimb(
  graphics: Phaser.GameObjects.Graphics,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  thickness: number,
  color: number,
): void {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.hypot(dx, dy) || 1;
  const nx = (-dy / length) * (thickness / 2);
  const ny = (dx / length) * (thickness / 2);

  graphics.fillStyle(color, 1);
  graphics.fillPoints(
    [
      new Phaser.Math.Vector2(fromX + nx, fromY + ny),
      new Phaser.Math.Vector2(fromX - nx, fromY - ny),
      new Phaser.Math.Vector2(toX - nx, toY - ny),
      new Phaser.Math.Vector2(toX + nx, toY + ny),
    ],
    true,
  );
  graphics.fillCircle(fromX, fromY, thickness * 0.42);
  graphics.fillCircle(toX, toY, thickness * 0.42);
}

function drawShoe(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
  flipped = false,
): void {
  const direction = flipped ? -1 : 1;
  graphics.fillStyle(color, 1);
  graphics.fillPoints(
    [
      new Phaser.Math.Vector2(x, y),
      new Phaser.Math.Vector2(x + width * 0.78 * direction, y - height * 0.16),
      new Phaser.Math.Vector2(x + width * direction, y + height * 0.24),
      new Phaser.Math.Vector2(x + width * 0.32 * direction, y + height * 0.42),
      new Phaser.Math.Vector2(x - width * 0.06 * direction, y + height * 0.12),
    ],
    true,
  );
}

function drawConsultantBody(
  graphics: Phaser.GameObjects.Graphics,
  options: { armOffset: number; legOffset: number; palette: CharacterPalette; tilt: number; fail?: boolean },
): void {
  const jacketColor = 0x262c3d;
  const lapelColor = options.palette.accent;
  const shirtColor = 0xf6f7f8;
  const trouserColor = 0x727887;
  const shoeColor = 0x202335;
  const bagColor = 0x31374b;
  const skinColor = options.fail ? 0xe0a499 : 0xf3b092;
  const hairColor = 0x53485f;
  const tilt = options.tilt;

  const torsoX = 50 + tilt;
  const torsoY = 40;
  const hipX = 63 + tilt;
  const hipY = 86;
  const bagShift = options.legOffset * 0.35;

  graphics.fillStyle(skinColor, 1);
  graphics.fillEllipse(62 + tilt, 23, 26, 32);
  graphics.fillRoundedRect(56 + tilt, 35, 10, 12, 4);

  graphics.fillStyle(hairColor, 1);
  graphics.fillEllipse(60 + tilt, 15, 27, 17);
  graphics.fillTriangle(46 + tilt, 18, 60 + tilt, 4, 74 + tilt, 16);
  graphics.fillTriangle(54 + tilt, 8, 72 + tilt, 10, 66 + tilt, 1);

  graphics.fillStyle(jacketColor, 1);
  graphics.fillRoundedRect(torsoX, torsoY, 28, 50, 10);

  graphics.fillStyle(shirtColor, 1);
  graphics.fillPoints(
    [
      new Phaser.Math.Vector2(58 + tilt, 42),
      new Phaser.Math.Vector2(69 + tilt, 42),
      new Phaser.Math.Vector2(64 + tilt, 62),
      new Phaser.Math.Vector2(60 + tilt, 62),
    ],
    true,
  );

  graphics.fillStyle(lapelColor, 1);
  graphics.fillTriangle(51 + tilt, 42, 58 + tilt, 42, 58 + tilt, 61);
  graphics.fillTriangle(77 + tilt, 42, 69 + tilt, 42, 70 + tilt, 61);
  graphics.fillTriangle(61 + tilt, 52, 66 + tilt, 52, 63 + tilt, 66);
  graphics.fillRoundedRect(70 + tilt, 58, 8, 4, 2);
  graphics.fillRoundedRect(49 + tilt, 69, 8, 4, 2);
  graphics.fillRoundedRect(73 + tilt, 71, 8, 4, 2);
  graphics.fillRoundedRect(48 + tilt, 79, 7, 5, 2);
  graphics.fillRoundedRect(76 + tilt, 79, 7, 5, 2);

  graphics.fillStyle(0x1c2130, 1);
  graphics.fillCircle(64 + tilt, 67, 2);
  graphics.fillCircle(64 + tilt, 76, 2);

  drawLimb(
    graphics,
    77 + tilt,
    52,
    92 + options.armOffset * 0.75 + tilt,
    64 + Math.abs(options.armOffset) * 0.25,
    9,
    jacketColor,
  );
  drawLimb(
    graphics,
    92 + options.armOffset * 0.75 + tilt,
    64 + Math.abs(options.armOffset) * 0.25,
    106 + options.armOffset * 0.5 + tilt,
    72 + Math.max(options.armOffset, -4) * 0.25,
    8,
    skinColor,
  );
  graphics.fillRoundedRect(100 + options.armOffset * 0.5 + tilt, 68, 10, 8, 4);

  drawLimb(
    graphics,
    50 + tilt,
    53,
    40 + options.armOffset * 0.55 + tilt,
    69,
    9,
    jacketColor,
  );
  drawLimb(
    graphics,
    40 + options.armOffset * 0.55 + tilt,
    69,
    39 + options.armOffset * 0.4 + tilt,
    86,
    8,
    skinColor,
  );
  graphics.fillRoundedRect(34 + options.armOffset * 0.4 + tilt, 82, 10, 8, 4);

  graphics.lineStyle(5, 0x151a28, 0.9);
  graphics.beginPath();
  graphics.moveTo(70 + tilt, 44);
  graphics.lineTo(45 + bagShift + tilt, 62);
  graphics.lineTo(42 + bagShift + tilt, 88);
  graphics.strokePath();

  graphics.fillStyle(bagColor, 1);
  graphics.fillRoundedRect(18 + bagShift + tilt, 73, 34, 31, 8);
  graphics.fillStyle(0xc0c5d0, 0.88);
  graphics.fillRoundedRect(31 + bagShift + tilt, 83, 9, 6, 2);

  drawLimb(
    graphics,
    hipX,
    hipY,
    46 + options.legOffset + tilt,
    114 - Math.abs(options.legOffset) * 0.18,
    11,
    trouserColor,
  );
  drawLimb(
    graphics,
    46 + options.legOffset + tilt,
    114 - Math.abs(options.legOffset) * 0.18,
    26 + options.legOffset * 0.6 + tilt,
    134,
    10,
    trouserColor,
  );
  drawShoe(graphics, 18 + options.legOffset * 0.55 + tilt, 132, 18, 10, shoeColor, true);

  drawLimb(
    graphics,
    hipX,
    hipY,
    76 - options.legOffset * 0.45 + tilt,
    111 + Math.abs(options.legOffset) * 0.16,
    11,
    trouserColor,
  );
  drawLimb(
    graphics,
    76 - options.legOffset * 0.45 + tilt,
    111 + Math.abs(options.legOffset) * 0.16,
    92 - options.legOffset * 0.2 + tilt,
    138,
    10,
    trouserColor,
  );
  drawShoe(graphics, 90 - options.legOffset * 0.2 + tilt, 136, 18, 10, shoeColor);
}

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
  options: { legOffset: number; armOffset: number; palette: CharacterPalette; tilt?: number; fail?: boolean }
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const width = 122;
  const height = 144;
  const graphics = scene.make.graphics();
  const tilt = options.tilt ?? 0;
  drawConsultantBody(graphics, {
    armOffset: options.armOffset,
    legOffset: options.legOffset,
    palette: options.palette,
    tilt,
    fail: options.fail,
  });
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

function registerCharacterTextures(scene: Phaser.Scene, characterKey: string, palette: CharacterPalette): void {
  generateRunnerFrame(scene, `${characterKey}-idle`,  { legOffset: 0,   armOffset: 0,   palette });
  generateRunnerFrame(scene, `${characterKey}-run-1`, { legOffset: -12, armOffset: -10, palette });
  generateRunnerFrame(scene, `${characterKey}-run-2`, { legOffset: 12,  armOffset: 8,   palette });
  generateRunnerFrame(scene, `${characterKey}-jump`,  { legOffset: 4,   armOffset: 10,  palette, tilt: -6 });
  generateRunnerFrame(scene, `${characterKey}-fail`,  { legOffset: -6,  armOffset: -8,  palette: { ...palette, accent: 0xb26d6d }, tilt: 8, fail: true });

  if (!scene.anims.exists(`${characterKey}-idle`)) {
    scene.anims.create({
      key: `${characterKey}-idle`,
      frames: [{ key: `${characterKey}-idle` }],
      frameRate: 1,
      repeat: -1,
    });
  }

  if (!scene.anims.exists(`${characterKey}-run`)) {
    scene.anims.create({
      key: `${characterKey}-run`,
      frames: [{ key: `${characterKey}-run-1` }, { key: `${characterKey}-run-2` }],
      frameRate: 8,
      repeat: -1,
    });
  }

  if (!scene.anims.exists(`${characterKey}-jump`)) {
    scene.anims.create({
      key: `${characterKey}-jump`,
      frames: [{ key: `${characterKey}-jump` }],
      frameRate: 1,
      repeat: -1,
    });
  }

  if (!scene.anims.exists(`${characterKey}-fail`)) {
    scene.anims.create({
      key: `${characterKey}-fail`,
      frames: [{ key: `${characterKey}-fail` }],
      frameRate: 1,
      repeat: -1,
    });
  }
}

export function registerGeneratedTextures(scene: Phaser.Scene): void {
  generateRoundedRect(scene, 'obstacle-card', 180, 120, 0x202b23, 0xffffff);
  generateRoundedRect(scene, 'ground-strip', 256, 40, 0x121f15, 0x2f4938);

  // Generate textures for all sponsor characters
  for (const character of characters) {
    registerCharacterTextures(scene, character.key, character.palette);
  }

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
