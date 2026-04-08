import type { CharacterDefinition, ObstacleDefinition, StageReached } from '../types/app';

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

export const characters: CharacterDefinition[] = [
  // Platinum sponsors
  { key: 'runner-deloitte',  label: 'Deloitte Digital',   logoMark: 'D',    tier: 'Platinum',       palette: { body: 0x1a1a1a, accent: 0x86BC25, arms: 0xffffff } },
  { key: 'runner-spire',     label: 'spire.',             logoMark: 'sp',   tier: 'Platinum',       palette: { body: 0x1a1a1a, accent: 0x00AEEF, arms: 0xffffff } },
  { key: 'runner-delaware',  label: 'delaware',           logoMark: 'de',   tier: 'Platinum',       palette: { body: 0xffffff, accent: 0xC8102E, arms: 0xffffff } },
  // Groundbreakers partners
  { key: 'runner-accenture', label: 'Accenture',          logoMark: 'A>',   tier: 'Groundbreakers', palette: { body: 0x1a1a1a, accent: 0xA100FF, arms: 0xffffff } },
  { key: 'runner-pwc',       label: 'PwC',                logoMark: 'PwC',  tier: 'Groundbreakers', palette: { body: 0xffffff, accent: 0xE0301E, arms: 0xffffff } },
  { key: 'runner-capgemini', label: 'Capgemini',          logoMark: 'cg',   tier: 'Groundbreakers', palette: { body: 0xffffff, accent: 0x0070AD, arms: 0xffffff } },
  { key: 'runner-valantic',  label: 'valantic',           logoMark: 'va',   tier: 'Groundbreakers', palette: { body: 0xffffff, accent: 0x00A4B4, arms: 0xffffff } },
  { key: 'runner-easi',      label: 'easi',               logoMark: 'ea',   tier: 'Groundbreakers', palette: { body: 0xffffff, accent: 0x1B2A6B, arms: 0xffffff } },
  { key: 'runner-inetum',    label: 'inetum',             logoMark: 'in',   tier: 'Groundbreakers', palette: { body: 0xffffff, accent: 0x005CA9, arms: 0xffffff } },
  // Navigators partners
  { key: 'runner-genesys',   label: 'Genesys',            logoMark: 'G',    tier: 'Navigators',     palette: { body: 0xffffff, accent: 0xFF4F1F, arms: 0xffffff } },
  { key: 'runner-butler',    label: 'Butler',             logoMark: 'B',    tier: 'Navigators',     palette: { body: 0xfff3e0, accent: 0xC87941, arms: 0xfff3e0 } },
  { key: 'runner-novera',    label: 'Novera Solutions',   logoMark: 'N',    tier: 'Navigators',     palette: { body: 0xffffff, accent: 0x6B8E5E, arms: 0xffffff } },
  { key: 'runner-nrb',       label: 'NRB',                logoMark: 'NRB',  tier: 'Navigators',     palette: { body: 0x1B3A6B, accent: 0xffffff, arms: 0xaabbcc } },
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
