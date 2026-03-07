import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/lib/api';

interface OnboardingState {
  isComplete: boolean;
  country: string;
  city: string;
  communities: string[];
  ethnicityText: string;
  languages: string[];
  interests: string[];
  subscriptionTier: 'free' | 'plus' | 'elite' | 'sydney-local';
}

interface OnboardingContextValue {
  state: OnboardingState;
  isLoading: boolean;
  setCountry: (country: string) => void;
  setCity: (city: string) => void;
  setCommunities: (communities: string[]) => void;
  setEthnicityText: (ethnicityText: string) => void;
  setLanguages: (languages: string[]) => void;
  setInterests: (interests: string[]) => void;
  setSubscriptionTier: (tier: OnboardingState['subscriptionTier']) => void;
  /** Pass userId from useAuth() to persist preferences to the backend. */
  completeOnboarding: (userId?: string) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  /** Pass userId from useAuth() to persist location to the backend. */
  updateLocation: (country: string, city: string, userId?: string) => Promise<void>;
}

const STORAGE_KEY = '@culturepass_onboarding';

const defaultState: OnboardingState = {
  isComplete: false,
  country: '',
  city: '',
  communities: [],
  ethnicityText: '',
  languages: [],
  interests: [],
  subscriptionTier: 'free',
};

const defaultContextValue: OnboardingContextValue = {
  state: defaultState,
  isLoading: false,
  setCountry: () => {},
  setCity: () => {},
  setCommunities: () => {},
  setEthnicityText: () => {},
  setLanguages: () => {},
  setInterests: () => {},
  setSubscriptionTier: () => {},
  completeOnboarding: async () => {},
  resetOnboarding: async () => {},
  updateLocation: async () => {},
};

const OnboardingContext = createContext<OnboardingContextValue>(defaultContextValue);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(defaultState);
  const [isLoading, setIsLoading] = useState(true);

  // FIX: keep a ref that always reflects the latest state so async callbacks
  // (completeOnboarding, updateLocation) never read a stale closure value.
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data) as Partial<OnboardingState>;
          setState({ ...defaultState, ...parsed });
        }
      } catch {
        // AsyncStorage unavailable (e.g. private browsing on web) — use defaults
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // FIX: persistUpdate is now a stable useCallback so it can be listed as a
  // dep in useMemo without causing infinite re-renders, and the eslint-disable
  // suppression can be removed.
  const persistUpdate = useCallback((patch: Partial<OnboardingState>) => {
    setState((prev) => {
      const newState = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState)).catch((err) => {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[OnboardingContext] AsyncStorage.setItem failed — onboarding state will not persist across sessions.', err);
        }
      });
      return newState;
    });
  }, []);

  const completeOnboarding = useCallback(async (userId?: string) => {
    persistUpdate({ isComplete: true });
    if (userId) {
      // FIX: read from stateRef so we always get the latest values, not
      // whatever was captured when useMemo last ran.
      const { city, country, interests, languages, ethnicityText } = stateRef.current;
      try {
        await api.users.update(userId, { city, country, interests, languages, ethnicityText });
      } catch {
        // Network failure — local state is set; DataSync will reconcile on next login
      }
    }
  }, [persistUpdate]);

  const resetOnboarding = useCallback(async () => {
    setState(defaultState);
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const updateLocation = useCallback(async (country: string, city: string, userId?: string) => {
    persistUpdate({ country, city });
    if (userId) {
      try {
        await api.users.update(userId, { city, country });
      } catch {
        // Network failure — local state is set
      }
    }
  }, [persistUpdate]);

  // FIX: all callbacks are now stable useCallbacks — eslint-disable suppression
  // removed and deps are complete.
  const value = useMemo(() => ({
    state,
    isLoading,
    setCountry:          (country: string) => persistUpdate({ country }),
    setCity:             (city: string) => persistUpdate({ city }),
    setCommunities:      (communities: string[]) => persistUpdate({ communities }),
    setEthnicityText:    (ethnicityText: string) => persistUpdate({ ethnicityText }),
    setLanguages:        (languages: string[]) => persistUpdate({ languages }),
    setInterests:        (interests: string[]) => persistUpdate({ interests }),
    setSubscriptionTier: (subscriptionTier: OnboardingState['subscriptionTier']) => persistUpdate({ subscriptionTier }),
    completeOnboarding,
    resetOnboarding,
    updateLocation,
  }), [state, isLoading, persistUpdate, completeOnboarding, resetOnboarding, updateLocation]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  return useContext(OnboardingContext);
}