export type StageReached = 'Discovery' | 'Design' | 'Build' | 'UAT' | 'Go Live';

export type AuthMethod = 'google' | 'magic_link';

export type RoleIntent =
  | 'Salesforce Admin'
  | 'Platform App Builder'
  | 'Consultant'
  | 'Architect'
  | 'Not sure yet';

export interface UTMContext {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
}

export interface EventSessionContext {
  anonymousSessionId: string;
  createdAt: string;
  eventName: string;
  utm: UTMContext;
  userAgent: string;
}

export interface PendingRun {
  id: string;
  createdAt: string;
  score: number;
  distance: number;
  durationMs: number;
  stageReached: StageReached;
  obstacleClears: number;
}

export interface SubmittedScore {
  id: string;
  createdAt: string;
  anonymousSessionId: string;
  userId: string | null;
  displayName: string;
  score: number;
  stageReached: StageReached;
  distance: number;
  eventName: string;
  prizeStatus: string;
  authMethod: AuthMethod | null;
}

export interface LeaderboardEntry extends SubmittedScore {
  rank: number;
  percentile: number;
}

export interface UserIdentity {
  id: string;
  email: string | null;
  displayName: string;
  provider: AuthMethod | 'demo';
}

export interface ObstacleDefinition {
  key: string;
  label: string;
  accent: number;
  weight: number;
  width: number;
  height: number;
  scoreValue: number;
  speedModifier: number;
}

export interface AuthActionResult {
  pending: boolean;
  message: string;
}

export interface RankSummary {
  rank: number;
  percentile: number;
  total: number;
}
