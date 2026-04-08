import type { PendingRun, SubmittedScore, UserIdentity, UTMContext } from '../types/app';

const PREFIX = 'consultantrun';

export const storageKeys = {
  pendingRun: `${PREFIX}:pending-run`,
  eventSession: `${PREFIX}:event-session`,
  authUser: `${PREFIX}:auth-user`,
  utm: `${PREFIX}:utm`,
  scores: `${PREFIX}:scores`,
  lastSubmittedAt: `${PREFIX}:last-submitted-at`,
  mute: `${PREFIX}:mute`,
};

export function readJson<T>(key: string): T | null {
  const raw = window.localStorage.getItem(key);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJson<T>(key: string, value: T): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  window.localStorage.removeItem(key);
}

export function createId(): string {
  return window.crypto.randomUUID();
}

export function getPendingRun(): PendingRun | null {
  return readJson<PendingRun>(storageKeys.pendingRun);
}

export function savePendingRun(run: PendingRun): void {
  writeJson(storageKeys.pendingRun, run);
}

export function clearPendingRun(): void {
  removeItem(storageKeys.pendingRun);
}

export function getStoredUser(): UserIdentity | null {
  return readJson<UserIdentity>(storageKeys.authUser);
}

export function saveStoredUser(user: UserIdentity): void {
  writeJson(storageKeys.authUser, user);
}

export function clearStoredUser(): void {
  removeItem(storageKeys.authUser);
}

export function getStoredUtm(): UTMContext | null {
  return readJson<UTMContext>(storageKeys.utm);
}

export function saveStoredUtm(utm: UTMContext): void {
  writeJson(storageKeys.utm, utm);
}

export function getLocalScores(): SubmittedScore[] {
  return readJson<SubmittedScore[]>(storageKeys.scores) ?? [];
}

export function saveLocalScores(scores: SubmittedScore[]): void {
  writeJson(storageKeys.scores, scores);
}

export function getDeviceType(): string {
  return window.innerWidth <= 768 ? 'mobile' : 'desktop';
}

export function getLocalDayKey(dateLike: string | Date = new Date()): string {
  const date = typeof dateLike === 'string' ? new Date(dateLike) : dateLike;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getSubmissionCooldownStamp(): number {
  return Number(window.localStorage.getItem(storageKeys.lastSubmittedAt) ?? '0');
}

export function setSubmissionCooldownStamp(timestamp: number): void {
  window.localStorage.setItem(storageKeys.lastSubmittedAt, String(timestamp));
}

export function getMutePreference(): boolean {
  return window.localStorage.getItem(storageKeys.mute) === '1';
}

export function saveMutePreference(isMuted: boolean): void {
  window.localStorage.setItem(storageKeys.mute, isMuted ? '1' : '0');
}
