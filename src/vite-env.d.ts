/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_EVENT_NAME?: string;
  readonly VITE_EVENT_BADGE?: string;
  readonly VITE_CONSULTANT_CLOUD_CTA_URL?: string;
  readonly VITE_ANALYTICS_MEASUREMENT_ID?: string;
  readonly VITE_ENABLE_GOOGLE_AUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
