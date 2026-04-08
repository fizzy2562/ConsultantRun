import Phaser from 'phaser';
import { gameConfig } from '../config/game';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { PlayScene } from './scenes/PlayScene';
import { PreloadScene } from './scenes/PreloadScene';
import { ResultScene } from './scenes/ResultScene';

export function createGame(parentId: string): Phaser.Game {
  const searchParams =
    typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const isE2EMode = searchParams.get('e2e') === '1';

  return new Phaser.Game({
    type: isE2EMode ? Phaser.CANVAS : Phaser.AUTO,
    parent: parentId,
    width: gameConfig.logicalWidth,
    height: gameConfig.logicalHeight,
    backgroundColor: gameConfig.backgroundColor,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [BootScene, PreloadScene, MenuScene, PlayScene, ResultScene],
  });
}
