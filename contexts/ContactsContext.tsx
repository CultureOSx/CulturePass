import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedContact {
  cpid: string;
  name: string;
  username?: string;
  tier?: string;
  org?: string;
  avatarUrl?: string;
  city?: string;
  country?: string;
  bio?: string;
  email?: string;
  phone?: string;
  savedAt: string;
  userId?: string;
}

interface ContactsContextValue {
  contacts: SavedContact[];
  addContact: (contact: Omit<SavedContact, 'savedAt'>) => void;
  removeContact: (cpid: string) => void;
  isContactSaved: (cpid: string) => boolean;
  getContact: (cpid: string) => SavedContact | undefined;
  // FIX: exclude savedAt from updatable fields — callers cannot corrupt the timestamp
  updateContact: (cpid: string, updates: Partial<Omit<SavedContact, 'savedAt'>>) => void;
  clearContacts: () => void;
}

const CONTACTS_KEY = '@culturepass_saved_contacts';

const ContactsContext = createContext<ContactsContextValue | null>(null);

export function ContactsProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<SavedContact[]>([]);

  // FIX: on parse failure, remove the corrupt key so the next launch
  // starts clean instead of hitting the same error repeatedly.
  useEffect(() => {
    AsyncStorage.getItem(CONTACTS_KEY).then(stored => {
      if (!stored) return;
      try {
        setContacts(JSON.parse(stored));
      } catch {
        console.warn('[contacts] corrupt storage — clearing key');
        AsyncStorage.removeItem(CONTACTS_KEY);
      }
    });
  }, []);

  // FIX: persist now catches and logs storage errors so silent desyncs
  // between in-memory state and AsyncStorage are surfaced.
  const persist = useCallback((updated: SavedContact[]) => {
    AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(updated)).catch(err => {
      console.error('[contacts] failed to persist contacts:', err);
    });
  }, []);

  const addContact = useCallback((contact: Omit<SavedContact, 'savedAt'>) => {
    setContacts(prev => {
      const exists = prev.find(c => c.cpid === contact.cpid);
      if (exists) {
        const updated = prev.map(c =>
          c.cpid === contact.cpid ? { ...c, ...contact, savedAt: c.savedAt } : c
        );
        persist(updated);
        return updated;
      }
      const newContact: SavedContact = { ...contact, savedAt: new Date().toISOString() };
      const updated = [newContact, ...prev];
      persist(updated);
      return updated;
    });
  }, [persist]);

  const removeContact = useCallback((cpid: string) => {
    setContacts(prev => {
      const updated = prev.filter(c => c.cpid !== cpid);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const isContactSaved = useCallback((cpid: string) => contacts.some(c => c.cpid === cpid), [contacts]);

  const getContact = useCallback((cpid: string) => contacts.find(c => c.cpid === cpid), [contacts]);

  // FIX: type is now Partial<Omit<SavedContact, 'savedAt'>> — savedAt is
  // stripped at the type level so callers cannot accidentally overwrite it.
  const updateContact = useCallback((cpid: string, updates: Partial<Omit<SavedContact, 'savedAt'>>) => {
    setContacts(prev => {
      const updated = prev.map(c => c.cpid === cpid ? { ...c, ...updates } : c);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const clearContacts = useCallback(() => {
    setContacts([]);
    AsyncStorage.removeItem(CONTACTS_KEY).catch(err => {
      console.error('[contacts] failed to clear contacts:', err);
    });
  }, []);

  const value = useMemo(() => ({
    contacts,
    addContact,
    removeContact,
    isContactSaved,
    getContact,
    updateContact,
    clearContacts,
  }), [contacts, addContact, removeContact, isContactSaved, getContact, updateContact, clearContacts]);

  return (
    <ContactsContext.Provider value={value}>
      {children}
    </ContactsContext.Provider>
  );
}

export function useContacts() {
  const context = useContext(ContactsContext);
  if (!context) throw new Error('useContacts must be used within ContactsProvider');
  return context;
}