import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { type GameFilter, isGameFilter } from '@/lib/game-filters';

const STORAGE_KEY = '222:game-preferences:v1';
type Preferences = { filter: GameFilter; pins: string[] };
const defaults: Preferences = { filter: 'all', pins: [] };

export function useGamePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [ready, setReady] = useState(false);
  const queue = useRef(Promise.resolve());
  const warned = useRef(false);
  const dirty = useRef(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!raw || !active) return;
      const saved = JSON.parse(raw);
      setPreferences({
        filter: isGameFilter(saved?.filter) ? saved.filter : 'all',
        pins: Array.isArray(saved?.pins) ? [...new Set<string>(saved.pins.filter((id: unknown) => typeof id === 'string'))] : [],
      });
    }).catch(error => console.warn('Could not restore game preferences:', error))
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready || !dirty.current) return;
    // Serialize writes so quick pin/filter changes cannot persist out of order.
    queue.current = queue.current.then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)))
      .catch(error => {
        console.warn('Could not save game preferences:', error);
        if (!warned.current) {
          warned.current = true;
          Alert.alert('Could not save preferences', 'Your changes work for this session, but may not survive an app restart.');
        }
      });
  }, [preferences, ready]);

  return {
    ...preferences, ready,
    setFilter: (filter: GameFilter) => { if (ready) { dirty.current = true; setPreferences(current => ({ ...current, filter })); } },
    togglePin: (id: string) => { if (ready) { dirty.current = true; setPreferences(current => ({ ...current, pins: current.pins.includes(id) ? current.pins.filter(pin => pin !== id) : [...current.pins, id] })); } },
  };
}
