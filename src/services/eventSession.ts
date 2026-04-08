import { eventConfig } from '../config/event';
import type { EventSessionContext } from '../types/app';
import { supabase } from './supabase';
import { captureUtmContext } from './utm';
import { createId, readJson, storageKeys, writeJson } from './storage';

export async function createOrRestoreEventSession(): Promise<EventSessionContext> {
  const existing = readJson<EventSessionContext>(storageKeys.eventSession);

  if (existing) {
    return existing;
  }

  const session: EventSessionContext = {
    anonymousSessionId: createId(),
    createdAt: new Date().toISOString(),
    eventName: eventConfig.eventName,
    utm: captureUtmContext(),
    userAgent: navigator.userAgent,
  };

  writeJson(storageKeys.eventSession, session);

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

    void supabase.from('event_sessions').insert(payload);
  }

  return session;
}
