import type { AuthActionResult, AuthMethod, UserIdentity } from '../types/app';
import { clearStoredUser, createId, getStoredUser, saveStoredUser } from './storage';
import { isSupabaseConfigured, supabase } from './supabase';

type AuthListener = (user: UserIdentity | null, method: AuthMethod | null) => void;

function mapProvider(provider: string | undefined): AuthMethod {
  return provider === 'google' ? 'google' : 'magic_link';
}

function mapSupabaseUser(user: {
  id: string;
  email?: string | null;
  app_metadata?: { provider?: string };
  user_metadata?: { full_name?: string; name?: string };
}): UserIdentity {
  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    'Consultant';

  return {
    id: user.id,
    email: user.email ?? null,
    displayName,
    provider: mapProvider(user.app_metadata?.provider),
  };
}

class AuthService {
  private user: UserIdentity | null = null;

  private method: AuthMethod | null = null;

  private listeners = new Set<AuthListener>();

  constructor() {
    if (supabase) {
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const mapped = mapSupabaseUser(session.user);
          this.user = mapped;
          this.method = mapProvider(session.user.app_metadata?.provider);
          this.emit();
          return;
        }

        this.user = null;
        this.method = null;
        this.emit();
      });
    }
  }

  async restoreSession(): Promise<UserIdentity | null> {
    if (supabase) {
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        const user = mapSupabaseUser(data.user);
        this.user = user;
        this.method = mapProvider(data.user.app_metadata?.provider);
        return user;
      }

      this.user = null;
      this.method = null;
      return null;
    }

    const stored = getStoredUser();
    this.user = stored;
    this.method = stored?.provider === 'google' ? 'google' : stored ? 'magic_link' : null;
    return stored;
  }

  onChange(listener: AuthListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getMethod(): AuthMethod | null {
    return this.method;
  }

  isDemoMode(): boolean {
    return !isSupabaseConfigured;
  }

  async signInWithGoogle(): Promise<AuthActionResult> {
    if (supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }

      return {
        pending: true,
        message: 'Redirecting to Google…',
      };
    }

    const user: UserIdentity = {
      id: createId(),
      email: 'runner@consultantrun.demo',
      displayName: 'Event Runner',
      provider: 'demo',
    };

    saveStoredUser(user);
    this.user = user;
    this.method = 'google';
    this.emit();

    return {
      pending: false,
      message: 'Demo Google unlock complete.',
    };
  }

  async signInWithMagicLink(email: string): Promise<AuthActionResult> {
    if (supabase) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }

      return {
        pending: true,
        message: `Magic link sent to ${email}.`,
      };
    }

    const user: UserIdentity = {
      id: createId(),
      email,
      displayName: email.split('@')[0] || 'Consultant',
      provider: 'demo',
    };

    saveStoredUser(user);
    this.user = user;
    this.method = 'magic_link';
    this.emit();

    return {
      pending: false,
      message: 'Demo magic-link unlock complete.',
    };
  }

  async signOut(): Promise<void> {
    if (supabase) {
      await supabase.auth.signOut();
    }

    clearStoredUser();
    this.user = null;
    this.method = null;
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.user, this.method);
    }
  }
}

export const authService = new AuthService();
