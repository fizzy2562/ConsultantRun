import { eventConfig } from '../config/event';
import type { EventSessionContext } from '../types/app';
import { trackEvent } from './analytics';
import { supabase } from './supabase';
import { captureUtmContext } from './utm';
import { createId, readJson, storageKeys, writeJson } from './storage';

function buildEventSession(): EventSessionContext {
  return {
    anonymousSessionId: createId(),
    createdAt: new Date().toISOString(),
    eventName: eventConfig.eventName,
    utm: captureUtmContext(),
    userAgent: navigator.userAgent,
  };
}

export async function createOrRestoreEventSession(): Promise<EventSessionContext> {
  const existing = readJson<EventSessionContext>(storageKeys.eventSession);

  if (
    existing &&
    existing.anonymousSessionId &&
    existing.eventName === eventConfig.eventName
  ) {
    return existing;
  }

  const session = buildEventSession();

  writeJson(storageKeys.eventSession, session);

  if (existing && existing.eventName !== eventConfig.eventName) {
    trackEvent('event_session_reset', {
      previous_event_name: existing.eventName,
      next_event_name: eventConfig.eventName,
    });
  }

  if (supabase) {
    const payload = {
      anonymous_session_id: session.anonymousSessionId,
      event_name: session.eventName,
      utm_source: session.utm.utmSource,
      utm_medium: session.utm.utmMedium,
      utm_campaign: session.utm.utmCampaign,
      utm_content: session.utm.utmContent,
      user_agent: session.userAgent,
    };

    const { error } = await supabase.from('event_sessions').insert(payload);

    if (error) {
      console.warn('[event-session] failed to persist event session', error.message);
      trackEvent('event_session_persist_failed', {
        event_name: session.eventName,
        error_message: error.message,
      });
    }
  }

  return session;
}
