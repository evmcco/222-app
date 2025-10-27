import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [loading, setLoading] = useState(false);

  const registerForPushNotificationsAsync = async (): Promise<string | null> => {
    if (!Device.isDevice) {
      alert('Must use physical device for Push Notifications');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    setPermissionStatus(finalStatus);

    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return null;
    }

    try {
      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID || 'your-project-id';
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      setExpoPushToken(token);
      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  };

  const requestPushPermissions = async (): Promise<string | null> => {
    setLoading(true);
    
    try {
      const pushToken = await registerForPushNotificationsAsync();
      return pushToken;
    } catch (error) {
      console.error('Error requesting push permissions:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const enableGameNotification = async (gameId: string): Promise<boolean> => {
    try {
      // Get push token if we don't have it
      let token = expoPushToken;
      if (!token) {
        token = await requestPushPermissions();
        if (!token) return false;
      }

      console.log('Enabling notification for game:', gameId, 'with token:', token);

      const { error } = await supabase
        .from('game_notifications')
        .insert({
          push_token: token,
          game_id: gameId,
        });

      if (error) {
        console.error('Error enabling game notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to enable game notification:', error);
      return false;
    }
  };

  const disableGameNotification = async (gameId: string): Promise<boolean> => {
    try {
      if (!expoPushToken) return false;

      console.log('Disabling notification for game:', gameId);

      const { error } = await supabase
        .from('game_notifications')
        .delete()
        .eq('push_token', expoPushToken)
        .eq('game_id', gameId);

      if (error) {
        console.error('Error disabling game notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to disable game notification:', error);
      return false;
    }
  };

  return {
    expoPushToken,
    permissionStatus,
    loading,
    enableGameNotification,
    disableGameNotification,
  };
}