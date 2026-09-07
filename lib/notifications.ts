/**
 * Web Notification API Helper
 */

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (err) {
    console.warn('[Notification] Error requesting permission:', err);
    return 'denied';
  }
}

export function sendDisembarkNotification(stationName: string, distanceMeters: number): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    const distText = distanceMeters < 1000 ? `${Math.round(distanceMeters)}m` : `${(distanceMeters / 1000).toFixed(1)}km`;
    const notification = new Notification('🚨 WAKE UP! Approaching Your Stop', {
      body: `You are ~${distText} from ${stationName}. Prepare to disembark now!`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'get-off-alarm',
      requireInteraction: true,
      silent: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (err) {
    console.warn('[Notification] Failed to display notification:', err);
    return false;
  }
}
