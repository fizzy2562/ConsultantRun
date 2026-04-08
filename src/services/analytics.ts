type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, payload: AnalyticsPayload = {}): void {
  const event = {
    event: name,
    ...payload,
  };

  window.dataLayer?.push(event);

  if (typeof window.gtag === 'function') {
    window.gtag('event', name, payload);
  }

  if (import.meta.env.DEV) {
    console.debug('[analytics]', event);
  }
}
