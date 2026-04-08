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
    title: 'Jump the blockers. Top the board.',
    concept: 'Pick a sponsor, enter your name, get 3 lives. Can you reach Go Live?',
    teaser: 'Top scores are moving fast today.',
  },
  resultCopy: {
    lockedTitle: 'Claim your result',
    lockedBody: 'Sign in to lock in your score and claim a prize at the ConsultantCloud stand.',
  },
  roleOptions: [
    'Salesforce Admin',
    'Platform App Builder',
    'Consultant',
    'Architect',
    'Not sure yet',
  ] as RoleIntent[],
  premiumCtaLabel: 'Find out more about ConsultantCloud',
};
