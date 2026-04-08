import Phaser from 'phaser';
import budgetFreezeImage from '../../assets/obstacles/budget-freeze.png';
import clientChangedMindImage from '../../assets/obstacles/client-changed-mind.png';
import integrationErrorImage from '../../assets/obstacles/integration-error.png';
import missingRequirementsImage from '../../assets/obstacles/missing-requirements.png';
import oneMoreSmallChangeImage from '../../assets/obstacles/one-more-small-change.png';
import scopeCreepImage from '../../assets/obstacles/scope-creep.png';
import uatFailImage from '../../assets/obstacles/uat-fail.png';

const obstacleSpriteAssets: Record<string, string> = {
  'obstacle-budget-freeze': budgetFreezeImage,
  'obstacle-client-changed-mind': clientChangedMindImage,
  'obstacle-integration-error': integrationErrorImage,
  'obstacle-missing-requirements': missingRequirementsImage,
  'obstacle-one-more-small-change': oneMoreSmallChangeImage,
  'obstacle-scope-creep': scopeCreepImage,
  'obstacle-uat-fail': uatFailImage,
};

export function preloadObstacleSprites(scene: Phaser.Scene): void {
  for (const [textureKey, asset] of Object.entries(obstacleSpriteAssets)) {
    if (scene.textures.exists(textureKey)) {
      continue;
    }

    scene.load.image(textureKey, asset);
  }
}
