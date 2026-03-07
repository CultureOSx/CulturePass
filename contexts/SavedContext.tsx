import { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface SavedContextValue {
  savedEvents: string[];
  joinedCommunities: string[];
  toggleSaveEvent: (id: string) => void;
  toggleJoinCommunity: (id: string) => void;
  isEventSaved: (id: string) => boolean;
  isCommunityJoined: (id: string) => boolean;
}

const SAVED_EVENTS_KEY = '@culturepass_saved_events';
const JOINED_COMMUNITIES_KEY = '@culturepass_joined_communities';

const SavedContext = createContext<SavedContextValue | null>(null);

export function SavedProvider({ children }: { children: ReactNode }) {
  const [savedEvents, setSavedEvents] = useState<string[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>([]);
  const { userId } = useAuth();

  // FIX: track whether the server seed has completed so the local cache
  // load never overwrites fresher server data (resolves the load/seed race).
  const serverSeededRef = useRef(false);

  // Load local cache first for instant startup — but skip if the server
  // seed already ran (handles fast async resolution edge case).
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(SAVED_EVENTS_KEY),
      AsyncStorage.getItem(JOINED_COMMUNITIES_KEY),
    ]).then(([events, communities]) => {
      // FIX: only apply local cache if server hasn't already seeded state
      if (serverSeededRef.current) return;
      if (events) setSavedEvents(JSON.parse(events) as string[]);
      if (communities) setJoinedCommunities(JSON.parse(communities) as string[]);
    }).catch(() => {});
  }, []);

  // Seed from server when user logs in — server is source of truth.
  useEffect(() => {
    if (!userId) return;
    api.users.get(userId).then((user) => {
      // FIX: mark seeded BEFORE setting state so the local cache effect
      // (if it resolves after this) skips its write.
      serverSeededRef.current = true;
      if (user.savedEvents?.length) {
        setSavedEvents(user.savedEvents);
        AsyncStorage.setItem(SAVED_EVENTS_KEY, JSON.stringify(user.savedEvents)).catch(() => {});
      }
      if (user.communities?.length) {
        setJoinedCommunities(user.communities);
        AsyncStorage.setItem(JOINED_COMMUNITIES_KEY, JSON.stringify(user.communities)).catch(() => {});
      }
    }).catch(() => {
      // Network unavailable — local cache remains in use
    });
  }, [userId]);

  const toggleSaveEvent = useCallback((id: string) => {
    setSavedEvents(prev => {
      const isSaved = prev.includes(id);
      const next = isSaved ? prev.filter(e => e !== id) : [...prev, id];
      AsyncStorage.setItem(SAVED_EVENTS_KEY, JSON.stringify(next)).catch(() => {});

      if (userId) {
        // FIX: roll back optimistic state + cache on API failure instead of
        // silently swallowing the error and leaving state desynced from server.
        (isSaved ? api.events.unsave(id) : api.events.save(id)).catch(() => {
          setSavedEvents(prev2 => {
            // Revert: undo the optimistic change
            const reverted = isSaved ? [...prev2, id] : prev2.filter(e => e !== id);
            AsyncStorage.setItem(SAVED_EVENTS_KEY, JSON.stringify(reverted)).catch(() => {});
            return reverted;
          });
        });
      }

      return next;
    });
  }, [userId]);

  const toggleJoinCommunity = useCallback((id: string) => {
    setJoinedCommunities(prev => {
      const isJoined = prev.includes(id);
      const next = isJoined ? prev.filter(c => c !== id) : [...prev, id];
      AsyncStorage.setItem(JOINED_COMMUNITIES_KEY, JSON.stringify(next)).catch(() => {});

      if (userId) {
        // FIX: same rollback pattern as toggleSaveEvent
        (isJoined ? api.communities.leave(id) : api.communities.join(id)).catch(() => {
          setJoinedCommunities(prev2 => {
            const reverted = isJoined ? [...prev2, id] : prev2.filter(c => c !== id);
            AsyncStorage.setItem(JOINED_COMMUNITIES_KEY, JSON.stringify(reverted)).catch(() => {});
            return reverted;
          });
        });
      }

      return next;
    });
  }, [userId]);

  const isEventSaved = useCallback((id: string) => savedEvents.includes(id), [savedEvents]);
  const isCommunityJoined = useCallback((id: string) => joinedCommunities.includes(id), [joinedCommunities]);

  const value = useMemo(() => ({
    savedEvents,
    joinedCommunities,
    toggleSaveEvent,
    toggleJoinCommunity,
    isEventSaved,
    isCommunityJoined,
  }), [savedEvents, joinedCommunities, toggleSaveEvent, toggleJoinCommunity, isEventSaved, isCommunityJoined]);

  return (
    <SavedContext.Provider value={value}>
      {children}
    </SavedContext.Provider>
  );
}

export function useSaved() {
  const context = useContext(SavedContext);
  if (!context) throw new Error('useSaved must be used within SavedProvider');
  return context;
}