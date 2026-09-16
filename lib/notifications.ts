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
    const notification = new Notification('🚨 Waktunya Turun! Stasiun Sudah Dekat', {
      body: `Sisa ~${distText} menuju ${stationName}. Siapkan barang bawaan dan bersiap turun sekarang!`,
      icon: '/icon.svg',
      badge: '/icon.svg',
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
