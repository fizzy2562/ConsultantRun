import type { UTMContext } from '../types/app';
import { getStoredUtm, saveStoredUtm } from './storage';

function normalizeParam(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function captureUtmContext(): UTMContext {
  const existing = getStoredUtm();
  const params = new URLSearchParams(window.location.search);

  const next: UTMContext = {
    utmSource: normalizeParam(params.get('utm_source')) ?? existing?.utmSource ?? null,
    utmMedium: normalizeParam(params.get('utm_medium')) ?? existing?.utmMedium ?? null,
    utmCampaign: normalizeParam(params.get('utm_campaign')) ?? existing?.utmCampaign ?? null,
    utmContent: normalizeParam(params.get('utm_content')) ?? existing?.utmContent ?? null,
  };

  saveStoredUtm(next);
  return next;
}
