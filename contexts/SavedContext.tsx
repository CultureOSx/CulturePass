import { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
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

  // Load local cache first for instant startup
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(SAVED_EVENTS_KEY),
      AsyncStorage.getItem(JOINED_COMMUNITIES_KEY),
    ]).then(([events, communities]) => {
      if (events) setSavedEvents(JSON.parse(events) as string[]);
      if (communities) setJoinedCommunities(JSON.parse(communities) as string[]);
    });
  }, []);

  // Seed from server when user logs in — server is source of truth
  useEffect(() => {
    if (!userId) return;
    api.users.get(userId).then((user) => {
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
        (isSaved ? api.events.unsave(id) : api.events.save(id)).catch(() => {});
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
        (isJoined ? api.communities.leave(id) : api.communities.join(id)).catch(() => {});
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
