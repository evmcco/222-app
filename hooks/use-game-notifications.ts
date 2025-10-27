import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const NOTIFICATIONS_KEY = 'game_notifications';

export function useGameNotifications() {
  const [notificationGameIds, setNotificationGameIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      if (stored) {
        const gameIds = JSON.parse(stored) as string[];
        setNotificationGameIds(new Set(gameIds));
      }
    } catch (error) {
      console.error('Failed to load game notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveNotifications = async (gameIds: Set<string>) => {
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify([...gameIds]));
    } catch (error) {
      console.error('Failed to save game notifications:', error);
    }
  };

  const toggleNotification = async (gameId: string) => {
    const newGameIds = new Set(notificationGameIds);
    
    if (newGameIds.has(gameId)) {
      newGameIds.delete(gameId);
    } else {
      newGameIds.add(gameId);
    }
    
    setNotificationGameIds(newGameIds);
    await saveNotifications(newGameIds);
  };

  const isNotificationEnabled = (gameId: string) => {
    return notificationGameIds.has(gameId);
  };

  return {
    isNotificationEnabled,
    toggleNotification,
    loading,
  };
}