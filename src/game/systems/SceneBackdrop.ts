import Phaser from 'phaser';
import { gameConfig } from '../../config/game';

export interface BackdropLayers {
  aura: Phaser.GameObjects.Ellipse;
  beamLeft: Phaser.GameObjects.Rectangle;
  beamRight: Phaser.GameObjects.Rectangle;
  grid: Phaser.GameObjects.TileSprite;
  bars: Phaser.GameObjects.TileSprite;
  floorGlow: Phaser.GameObjects.Rectangle;
}

export function createSceneBackdrop(scene: Phaser.Scene): BackdropLayers {
  scene.add.rectangle(
    gameConfig.logicalWidth / 2,
    gameConfig.logicalHeight / 2,
    gameConfig.logicalWidth,
    gameConfig.logicalHeight,
    0x030a03
  );

  const aura = scene.add.ellipse(gameConfig.logicalWidth / 2, 160, 360, 220, 0x3d7fab, 0.16);
  aura.setDepth(0);

  const beamLeft = scene.add
    .rectangle(72, gameConfig.logicalHeight / 2, 120, gameConfig.logicalHeight, 0x3d7fab, 0.08)
    .setAngle(-14)
    .setDepth(0.15);

  const beamRight = scene.add
    .rectangle(gameConfig.logicalWidth - 72, gameConfig.logicalHeight / 2, 120, gameConfig.logicalHeight, 0x51ac52, 0.08)
    .setAngle(14)
    .setDepth(0.16);

  const grid = scene.add
    .tileSprite(gameConfig.logicalWidth / 2, gameConfig.logicalHeight / 2, gameConfig.logicalWidth, gameConfig.logicalHeight, 'bg-grid')
    .setAlpha(0.55)
    .setDepth(0);

  const bars = scene.add
    .tileSprite(gameConfig.logicalWidth / 2, gameConfig.logicalHeight / 2, gameConfig.logicalWidth, gameConfig.logicalHeight, 'bg-bars')
    .setAlpha(0.72)
    .setDepth(0.5);

  const floorGlow = scene.add
    .rectangle(gameConfig.logicalWidth / 2, gameConfig.groundY + 18, gameConfig.logicalWidth, 98, 0x0d1c12, 0.78)
    .setDepth(1);

  return {
    aura,
    beamLeft,
    beamRight,
    grid,
    bars,
    floorGlow,
  };
}
