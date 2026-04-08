import Phaser from 'phaser';
import { characters } from '../../config/game';
import accentureSheet from '../../assets/sprites/runners/runner-accenture.png';
import butlerSheet from '../../assets/sprites/runners/runner-butler.png';
import capgeminiSheet from '../../assets/sprites/runners/runner-capgemini.png';
import delawareSheet from '../../assets/sprites/runners/runner-delaware.png';
import deloitteSheet from '../../assets/sprites/runners/runner-deloitte.png';
import easiSheet from '../../assets/sprites/runners/runner-easi.png';
import genesysSheet from '../../assets/sprites/runners/runner-genesys.png';
import inetumSheet from '../../assets/sprites/runners/runner-inetum.png';
import noveraSheet from '../../assets/sprites/runners/runner-novera.png';
import nrbSheet from '../../assets/sprites/runners/runner-nrb.png';
import pwcSheet from '../../assets/sprites/runners/runner-pwc.png';
import spireSheet from '../../assets/sprites/runners/runner-spire.png';
import valanticSheet from '../../assets/sprites/runners/runner-valantic.png';

const frameWidth = 128;
const frameHeight = 144;

const runnerSpriteAssets: Record<string, string> = {
  'runner-accenture': accentureSheet,
  'runner-butler': butlerSheet,
  'runner-capgemini': capgeminiSheet,
  'runner-delaware': delawareSheet,
  'runner-deloitte': deloitteSheet,
  'runner-easi': easiSheet,
  'runner-genesys': genesysSheet,
  'runner-inetum': inetumSheet,
  'runner-novera': noveraSheet,
  'runner-nrb': nrbSheet,
  'runner-pwc': pwcSheet,
  'runner-spire': spireSheet,
  'runner-valantic': valanticSheet,
};

function resolveAsset(characterKey: string): string {
  const asset = runnerSpriteAssets[characterKey];

  if (!asset) {
    throw new Error(`Missing sprite sheet for ${characterKey}`);
  }

  return asset;
}

export function preloadRunnerSprites(scene: Phaser.Scene): void {
  for (const character of characters) {
    if (scene.textures.exists(character.key)) {
      continue;
    }

    scene.load.spritesheet(character.key, resolveAsset(character.key), {
      frameWidth,
      frameHeight,
    });
  }
}

export function registerRunnerAnimations(scene: Phaser.Scene): void {
  for (const character of characters) {
    ensureRunnerAnimations(scene, character.key);
  }
}

export function ensureRunnerAnimations(scene: Phaser.Scene, textureKey: string): void {
  if (!scene.textures.exists(textureKey)) {
    return;
  }

  if (!scene.anims.exists(`${textureKey}-idle`)) {
    scene.anims.create({
      key: `${textureKey}-idle`,
      frames: [{ key: textureKey, frame: 0 }],
      frameRate: 1,
      repeat: -1,
    });
  }

  if (!scene.anims.exists(`${textureKey}-run`)) {
    scene.anims.create({
      key: `${textureKey}-run`,
      frames: scene.anims.generateFrameNumbers(textureKey, { start: 1, end: 2 }),
      frameRate: 8,
      repeat: -1,
    });
  }

  if (!scene.anims.exists(`${textureKey}-jump`)) {
    scene.anims.create({
      key: `${textureKey}-jump`,
      frames: [{ key: textureKey, frame: 3 }],
      frameRate: 1,
      repeat: -1,
    });
  }

  if (!scene.anims.exists(`${textureKey}-fail`)) {
    scene.anims.create({
      key: `${textureKey}-fail`,
      frames: [{ key: textureKey, frame: 4 }],
      frameRate: 1,
      repeat: -1,
    });
  }
}
