import type { ObstacleDefinition, StageReached } from '../types/app';

export const gameConfig = {
  logicalWidth: 390,
  logicalHeight: 844,
  groundY: 708,
  runnerStartX: 84,
  scoreRatePerSecond: 10,
  backgroundColor: '#030A03',
  hudPadding: 24,
};

export const stageThresholds: Array<{ stage: StageReached; minScore: number }> = [
  { stage: 'Discovery', minScore: 0 },
  { stage: 'Design', minScore: 151 },
  { stage: 'Build', minScore: 351 },
  { stage: 'UAT', minScore: 651 },
  { stage: 'Go Live', minScore: 901 },
];

export const obstacleDefinitions: ObstacleDefinition[] = [
  { key: 'scope-creep', label: 'Scope Creep', accent: 0x3d7fab, weight: 1.2, width: 144, height: 72, scoreValue: 12, speedModifier: 1 },
  { key: 'missing-reqs', label: 'Missing Requirements', accent: 0x4da68b, weight: 1.15, width: 150, height: 78, scoreValue: 14, speedModifier: 0.96 },
  { key: 'uat-fail', label: 'UAT Fail', accent: 0x51ac52, weight: 0.95, width: 136, height: 92, scoreValue: 18, speedModifier: 1.05 },
  { key: 'client-changed-mind', label: 'Client Changed Mind', accent: 0xb4a26f, weight: 0.86, width: 158, height: 88, scoreValue: 16, speedModifier: 1.04 },
  { key: 'integration-error', label: 'Integration Error', accent: 0x6991c6, weight: 0.82, width: 154, height: 82, scoreValue: 17, speedModifier: 1.08 },
  { key: 'budget-freeze', label: 'Budget Freeze', accent: 0x6d6d6d, weight: 0.74, width: 150, height: 96, scoreValue: 20, speedModifier: 1.12 },
  { key: 'one-more-change', label: 'One More Small Change', accent: 0x78b97d, weight: 0.7, width: 164, height: 86, scoreValue: 19, speedModifier: 1.1 },
];
