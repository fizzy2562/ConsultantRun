import { difficultyConfig } from '../config/difficulty';
import { eventConfig } from '../config/event';
import type {
  AuthMethod,
  EventSessionContext,
  LeaderboardEntry,
  PendingRun,
  RankSummary,
  SubmittedScore,
  UserIdentity,
} from '../types/app';
import {
  createId,
  getDeviceType,
  getLocalDayKey,
  getLocalScores,
  getSubmissionCooldownStamp,
  saveLocalScores,
  setSubmissionCooldownStamp,
} from './storage';
import { sanitizeDisplayName } from './displayName';
import { supabase } from './supabase';

function normalizeScore(record: Record<string, unknown>): SubmittedScore {
  return {
    id: String(record.id),
    createdAt: String(record.created_at ?? record.createdAt ?? new Date().toISOString()),
    anonymousSessionId: String(record.anonymous_session_id ?? record.anonymousSessionId ?? ''),
    userId: (record.user_id as string | null | undefined) ?? (record.userId as string | null | undefined) ?? null,
    displayName: sanitizeDisplayName(String(record.display_name ?? record.displayName ?? 'Consultant')),
    score: Number(record.score ?? 0),
    stageReached: String(record.stage_reached ?? record.stageReached ?? 'Discovery') as SubmittedScore['stageReached'],
    distance: Number(record.distance ?? 0),
    eventName: String(record.event_name ?? record.eventName ?? eventConfig.eventName),
    prizeStatus: String(record.prize_status ?? record.prizeStatus ?? 'unclaimed'),
    authMethod:
      (record.auth_method as AuthMethod | null | undefined) ??
      (record.authMethod as AuthMethod | null | undefined) ??
      null,
    characterKey: String(record.character_key ?? record.characterKey ?? ''),
  };
}

function sortEntries(entries: SubmittedScore[]): SubmittedScore[] {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

function buildRankSummary(entries: SubmittedScore[], scoreId: string): RankSummary {
  const ordered = sortEntries(entries);
  const index = ordered.findIndex((entry) => entry.id === scoreId);
  const rank = index === -1 ? ordered.length : index + 1;
  const total = Math.max(ordered.length, 1);
  const percentile = Math.max(1, Math.round((rank / total) * 100));

  return {
    rank,
    percentile,
    total,
  };
}

function toLeaderboardEntry(entry: SubmittedScore, entries: SubmittedScore[]): LeaderboardEntry {
  const summary = buildRankSummary(entries, entry.id);
  return {
    ...entry,
    rank: summary.rank,
    percentile: summary.percentile,
  };
}

function getDayBounds(date: Date = new Date()): { start: string; end: string } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function validatePendingRun(run: PendingRun): void {
  if (run.score <= 0 || run.distance <= 0 || run.durationMs <= 0) {
    throw new Error('Run data is incomplete.');
  }

  const durationSeconds = run.durationMs / 1000;
  const maxScore = Math.floor(durationSeconds * difficultyConfig.maxSurvivableScorePerSecond) + 60;

  if (run.score > maxScore) {
    throw new Error('Run failed score validation.');
  }

  const maxDistance =
    ((difficultyConfig.initialSpeed + difficultyConfig.maxSpeed) / 2) * durationSeconds + 3000;

  if (run.distance > maxDistance) {
    throw new Error('Run failed distance validation.');
  }
}

function guardSubmissionCooldown(): void {
  const now = Date.now();
  const previous = getSubmissionCooldownStamp();

  if (now - previous < difficultyConfig.submissionCooldownMs) {
    throw new Error('Submission cooldown active. Wait a moment and retry.');
  }

  setSubmissionCooldownStamp(now);
}

async function submitWithSupabase(
  run: PendingRun,
  session: EventSessionContext,
  user: UserIdentity,
  authMethod: AuthMethod
): Promise<SubmittedScore | null> {
  if (!supabase) {
    return null;
  }

  const payload = {
    p_anonymous_session_id: session.anonymousSessionId,
    p_user_id: user.id,
    p_display_name: sanitizeDisplayName(run.displayName || user.displayName),
    p_score: run.score,
    p_stage_reached: run.stageReached,
    p_distance: run.distance,
    p_event_name: session.eventName,
    p_utm_source: session.utm.utmSource,
    p_utm_medium: session.utm.utmMedium,
    p_utm_campaign: session.utm.utmCampaign,
    p_utm_content: session.utm.utmContent,
    p_device_type: getDeviceType(),
    p_auth_method: authMethod,
    p_character_key: run.characterKey,
  };

  const rpcResult = await supabase.rpc('submit_score_secure', payload);

  if (!rpcResult.error && rpcResult.data) {
    const record = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
    return normalizeScore(record as Record<string, unknown>);
  }

  const directInsert = await supabase
    .from('scores')
    .insert({
      anonymous_session_id: session.anonymousSessionId,
      user_id: user.id,
      display_name: sanitizeDisplayName(run.displayName || user.displayName),
      score: run.score,
      stage_reached: run.stageReached,
      distance: run.distance,
      event_name: session.eventName,
      prize_status: 'unclaimed',
      utm_source: session.utm.utmSource,
      utm_medium: session.utm.utmMedium,
      utm_campaign: session.utm.utmCampaign,
      utm_content: session.utm.utmContent,
      device_type: getDeviceType(),
      auth_method: authMethod,
      character_key: run.characterKey,
    })
    .select()
    .single();

  if (directInsert.error || !directInsert.data) {
    return null;
  }

  return normalizeScore(directInsert.data as Record<string, unknown>);
}

async function fetchAllScores(eventName: string): Promise<SubmittedScore[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('event_name', eventName)
      .order('score', { ascending: false })
      .order('created_at', { ascending: true });

    if (!error && data) {
      return (data as Record<string, unknown>[]).map(normalizeScore);
    }
  }

  return sortEntries(getLocalScores().filter((entry) => entry.eventName === eventName));
}

export const leaderboardService = {
  async submitScore(
    run: PendingRun,
    session: EventSessionContext,
    user: UserIdentity,
    authMethod: AuthMethod
  ): Promise<LeaderboardEntry> {
    validatePendingRun(run);
    guardSubmissionCooldown();

    const remoteScore = await submitWithSupabase(run, session, user, authMethod);

    if (remoteScore) {
      const fullEntries = await fetchAllScores(session.eventName);
      const entries = fullEntries.map((entry) => toLeaderboardEntry(entry, fullEntries));
      return {
        ...remoteScore,
        rank: entries.find((entry) => entry.id === remoteScore.id)?.rank ?? 1,
        percentile: entries.find((entry) => entry.id === remoteScore.id)?.percentile ?? 1,
      };
    }

    const localScores = getLocalScores();
    const createdAt = new Date().toISOString();
    const submitted: SubmittedScore = {
      id: createId(),
      createdAt,
      anonymousSessionId: session.anonymousSessionId,
      userId: user.id,
      displayName: sanitizeDisplayName(run.displayName || user.displayName),
      score: run.score,
      stageReached: run.stageReached,
      distance: run.distance,
      eventName: session.eventName,
      prizeStatus: 'unclaimed',
      authMethod,
      characterKey: run.characterKey,
    };

    const nextScores = [...localScores, submitted];
    saveLocalScores(nextScores);

    return toLeaderboardEntry(submitted, nextScores);
  },

  async getDailyLeaderboard(eventName = eventConfig.eventName): Promise<LeaderboardEntry[]> {
    const { start, end } = getDayBounds();

    if (supabase) {
      const { data, error } = await supabase
        .from('scores')
        .select('*')
        .eq('event_name', eventName)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('score', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(10);

      if (!error && data) {
        const entries = (data as Record<string, unknown>[]).map(normalizeScore);
        return entries.map((entry) => toLeaderboardEntry(entry, entries));
      }
    }

    const entries = sortEntries(
      getLocalScores().filter(
        (entry) =>
          entry.eventName === eventName && getLocalDayKey(entry.createdAt) === getLocalDayKey(new Date())
      )
    ).slice(0, 10);

    return entries.map((entry) => toLeaderboardEntry(entry, entries));
  },

  async getAllTimeLeaderboard(eventName = eventConfig.eventName): Promise<LeaderboardEntry[]> {
    const fullEntries = await fetchAllScores(eventName);
    const entries = fullEntries.slice(0, 25);
    return entries.map((entry) => toLeaderboardEntry(entry, fullEntries));
  },

  async getMyBest(userId: string, eventName = eventConfig.eventName): Promise<LeaderboardEntry | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('scores')
        .select('*')
        .eq('event_name', eventName)
        .eq('user_id', userId)
        .order('score', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const normalized = normalizeScore(data as Record<string, unknown>);
        const fullEntries = await fetchAllScores(eventName);
        const rankedEntries = fullEntries.map((entry) => toLeaderboardEntry(entry, fullEntries));
        return rankedEntries.find((entry) => entry.id === normalized.id) ?? {
          ...normalized,
          rank: 1,
          percentile: 1,
        };
      }
    }

    const entries = sortEntries(
      getLocalScores().filter((entry) => entry.eventName === eventName && entry.userId === userId)
    );

    if (!entries[0]) {
      return null;
    }

    return toLeaderboardEntry(entries[0], getLocalScores());
  },

  async getRank(scoreId: string, eventName = eventConfig.eventName): Promise<RankSummary> {
    const fullEntries = await fetchAllScores(eventName);
    const entries = fullEntries.map((entry) => toLeaderboardEntry(entry, fullEntries));
    const found = entries.find((entry) => entry.id === scoreId);

    if (found) {
      return {
        rank: found.rank,
        percentile: found.percentile,
        total: entries.length,
      };
    }

    return {
      rank: entries.length + 1,
      percentile: 100,
      total: entries.length,
    };
  },
};
