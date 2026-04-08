import type { RoleIntent } from '../types/app';

const fallbackCta = 'https://consultantcloud.io/start';

export const eventConfig = {
  eventName: import.meta.env.VITE_EVENT_NAME?.trim() || 'Agentforce Belgium 2026',
  eventBadge: import.meta.env.VITE_EVENT_BADGE?.trim() || 'Agentforce Belgium 2026',
  consultantCloudCtaUrl: import.meta.env.VITE_CONSULTANT_CLOUD_CTA_URL?.trim() || fallbackCta,
  enableGoogleAuth: import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true',
  leaderboardTitles: {
    daily: 'Today at Agentforce',
    allTime: 'All-time board',
    myBest: 'My best',
  },
  landing: {
    title: 'Can you get the project live?',
    concept: 'Jump the hurdles. Beat the room. Unlock your score.',
    teaser: 'Top scores are moving fast today.',
  },
  resultCopy: {
    lockedTitle: 'Unlock your full result',
    lockedBody: 'See your score, rank, prize status, and the ConsultantCloud handoff.',
  },
  roleOptions: [
    'Salesforce Admin',
    'Platform App Builder',
    'Consultant',
    'Architect',
    'Not sure yet',
  ] as RoleIntent[],
  premiumCtaLabel: 'Start your 14-day access',
};
