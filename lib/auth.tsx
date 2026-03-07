import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Platform, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { setAccessToken } from '@/lib/query-client';
import { router } from 'expo-router';
import { auth as firebaseAuth } from '@/lib/firebase';
import { signOut, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { api, ApiError } from '@/lib/api';
import type { UserRole } from '@/shared/schema';

/**
 * CulturePassAU Auth — Firebase Auth SDK
 *
 * Auth state is driven by Firebase's `onAuthStateChanged` observer.
 * On every auth state change:
 *   1. Get fresh Firebase ID token
 *   2. Call GET /api/auth/me (Cloud Function) for full user profile
 *   3. Sync token to query-client's module-level store
 *
 * City/country syncing to OnboardingContext is intentionally NOT done here.
 * The DataSync component in _layout.tsx handles that bridge so AuthProvider
 * has zero dependency on OnboardingContext (avoids provider order issues).
 *
 * Token auto-refresh: Firebase SDK refreshes ID tokens silently.
 * We additionally force-refresh every 50 min to keep the query-client store current.
 */

export interface AuthUser {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  role?: UserRole;
  subscriptionTier?: 'free' | 'plus' | 'elite' | 'sydney-local';
  country?: string;
  city?: string;
  avatarUrl?: string;
  isSydneyVerified?: boolean;
  communities?: string[];
  interests?: string[];
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

interface AuthProfileResponse {
  id?: string;
  username?: string;
  displayName?: string;
  email?: string;
  role?: UserRole;
  culturePassId?: string;
  createdAt?: string | null;
  country?: string;
  city?: string;
  avatarUrl?: string;
  isSydneyVerified?: boolean;
  interests?: string[];
  membership?: {
    tier?: AuthUser['subscriptionTier'];
  };
}

interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isRestoring: boolean;

  login: (session: AuthSession, navigate?: boolean) => Promise<void>;
  logout: (redirect?: string) => Promise<void>;
  refreshSession: () => Promise<void>;

  hasRole: (...roles: UserRole[]) => boolean;

  isSydneyUser: boolean;
  isSydneyVerified: boolean;
  /** True only until the user dismisses the welcome — call clearSydneyWelcome() */
  showSydneyWelcome: boolean;
  clearSydneyWelcome: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userId: null,
  user: null,
  accessToken: null,
  isLoading: true,      // FIX: was false — consumers checking isLoading for a spinner
  isRestoring: true,    //      would see no spinner between mount and first observer fire
  login: async () => {},
  logout: async () => {},
  refreshSession: async () => {},
  hasRole: () => false,
  isSydneyUser: false,
  isSydneyVerified: false,
  showSydneyWelcome: false,
  clearSydneyWelcome: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  // FIX: both loading flags start true — avoids a flash of unauthenticated UI
  // before the Firebase observer fires on mount.
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(true);
  // FIX: track whether the Sydney welcome has been shown this session
  const [sydneyWelcomeShown, setSydneyWelcomeShown] = useState(false);

  // ------------------------------------------------------------------
  // Firebase Auth state observer
  // ------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser: FirebaseUser | null) => {
      if (!firebaseUser) {
        setSession(null);
        setAccessToken(null);
        setIsLoading(false);
        setIsRestoring(false);
        return;
      }

      try {
        const idToken = await firebaseUser.getIdToken();
        setAccessToken(idToken);

        let userProfile: Partial<AuthUser> = {};
        try {
          let profileData = await api.auth.me() as unknown as AuthProfileResponse;
          const needsBootstrap = !profileData.createdAt || !profileData.culturePassId;
          if (needsBootstrap) {
            await api.auth.register({
              displayName: firebaseUser.displayName ?? undefined,
              city: profileData.city,
              country: profileData.country ?? 'Australia',
            });
            profileData = await api.auth.me() as unknown as AuthProfileResponse;
          }
          const membership = profileData.membership;
          userProfile = {
            username: profileData.username,
            displayName: profileData.displayName,
            email: profileData.email,
            role: profileData.role,
            subscriptionTier: membership?.tier ?? 'free',
            country: profileData.country,
            city: profileData.city,
            avatarUrl: profileData.avatarUrl,
            isSydneyVerified: profileData.isSydneyVerified,
            interests: profileData.interests,
          };
        } catch (error) {
          // FIX: ApiError (4xx) errors were silently swallowed. A 401/403 during
          // bootstrap means the backend rejected the token — force sign-out rather
          // than continuing with an empty profile.
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            console.error('[auth] profile fetch unauthorised — signing out:', error);
            await signOut(firebaseAuth);
            return;
          }
          console.error('[auth] profile fetch error:', error);
        }

        const authUser: AuthUser = {
          id: firebaseUser.uid,
          username: userProfile.username ?? firebaseUser.email?.split('@')[0] ?? firebaseUser.uid,
          displayName: userProfile.displayName ?? firebaseUser.displayName ?? undefined,
          email: userProfile.email ?? firebaseUser.email ?? undefined,
          role: userProfile.role ?? 'user',
          subscriptionTier: userProfile.subscriptionTier ?? 'free',
          country: userProfile.country,
          city: userProfile.city,
          avatarUrl: userProfile.avatarUrl ?? (firebaseUser.photoURL ?? undefined),
          isSydneyVerified: userProfile.isSydneyVerified ?? false,
          interests: userProfile.interests ?? [],
        };

        setSession({
          user: authUser,
          accessToken: idToken,
          expiresAt: Date.now() + 60 * 60 * 1000,
        });
        // NOTE: city/country sync to OnboardingContext is handled by
        // the DataSync component in _layout.tsx (avoids circular dep).
      } catch (error) {
        console.error('[auth] onAuthStateChanged error:', error);
        setSession(null);
        setAccessToken(null);
      } finally {
        setIsLoading(false);
        setIsRestoring(false);
      }
    });

    return unsubscribe;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------
  // Force-refresh ID token every 50 min to keep query-client in sync.
  // FIX: dep was [!!session] (a boolean) — the interval would NOT reset
  // if session was replaced with a new object (e.g. after token refresh).
  // Using [session] ensures the interval is always tied to the live value.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(async () => {
      try {
        const user = firebaseAuth.currentUser;
        if (user) {
          const freshToken = await user.getIdToken(true);
          setAccessToken(freshToken);
          setSession((prev) => prev ? { ...prev, accessToken: freshToken } : prev);
        }
      } catch {
        // Firebase will sign out via onAuthStateChanged if token is truly invalid
      }
    }, 50 * 60 * 1000);

    return () => clearInterval(interval);
  }, [session]); // FIX: was [!!session]

  // ------------------------------------------------------------------
  // login() — kept for compatibility with manual session injection.
  // FIX: added `navigate` param (default true) so callers doing a
  // background token injection don't accidentally redirect to /(tabs).
  // ------------------------------------------------------------------
  const login = useCallback(async (newSession: AuthSession, navigate = true) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsLoading(true);
    try {
      setSession(newSession);
      setAccessToken(newSession.accessToken);
      if (navigate) {
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('[auth] login:', error);
      Alert.alert('Login Failed', 'Please try again');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ------------------------------------------------------------------
  // logout() — signs out of Firebase; onAuthStateChanged clears session.
  // OnboardingContext reset is handled by DataSync watching user → null.
  // Default lands on Discovery so guests can still browse the app.
  // ------------------------------------------------------------------
  const logout = useCallback(async (redirectTo = '/(tabs)') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    setIsLoading(true);
    try {
      await signOut(firebaseAuth);
      router.replace(redirectTo as never);
    } catch (error) {
      console.error('[auth] logout:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ------------------------------------------------------------------
  // refreshSession() — force a fresh ID token
  // ------------------------------------------------------------------
  const refreshSession = useCallback(async () => {
    try {
      const user = firebaseAuth.currentUser;
      if (!user) throw new Error('No authenticated user');
      const freshToken = await user.getIdToken(true);
      setAccessToken(freshToken);
      setSession((prev) => prev ? { ...prev, accessToken: freshToken } : prev);
    } catch (error) {
      console.error('[auth] refreshSession:', error);
      await logout('/(onboarding)/login');
      throw error;
    }
  }, [logout]);

  const isSydneyUser = !!session?.user.city?.toLowerCase().includes('sydney');
  const isSydneyVerified = !!session?.user.isSydneyVerified;

  // FIX: showSydneyWelcome is now gated by sydneyWelcomeShown so it
  // doesn't re-trigger on every render. Call clearSydneyWelcome() once
  // the welcome UI has been presented.
  const showSydneyWelcome = isSydneyUser && !sydneyWelcomeShown;
  const clearSydneyWelcome = useCallback(() => setSydneyWelcomeShown(true), []);

  const hasRole = useCallback((...roles: UserRole[]): boolean => {
    if (!session) return false;
    return roles.includes(session.user.role ?? 'user');
  }, [session]);

  const value = useMemo(() => ({
    isAuthenticated: !!session,
    userId: session?.user.id ?? null,
    user: session?.user ?? null,
    accessToken: session?.accessToken ?? null,
    isLoading,
    isRestoring,
    login,
    logout,
    refreshSession,
    hasRole,
    isSydneyUser,
    isSydneyVerified,
    showSydneyWelcome,
    clearSydneyWelcome,
  }), [
    session, isLoading, isRestoring, login, logout, refreshSession,
    hasRole, isSydneyUser, isSydneyVerified, showSydneyWelcome, clearSydneyWelcome,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAutoRefresh — no-op in Firebase mode.
 * Firebase SDK handles token refresh automatically.
 * Kept for backward compatibility.
 */
export function useAutoRefresh() {
  // Firebase ID tokens are refreshed silently by the SDK.
}