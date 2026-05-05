/**
 * Notification service — handles permission request, price alert scheduling,
 * and the daily market brief local notification.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DAILY_BRIEF_ID_KEY = 'daily_brief_notification_id';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/** Request permission. Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
}

/**
 * Schedule a local "price alert triggered" notification.
 * Called immediately when the backend confirms an alert is triggered.
 */
export async function scheduleAlertNotification(
    symbol: string,
    direction: 'above' | 'below',
    targetPrice: number,
): Promise<void> {
    const granted = await requestNotificationPermission();
    if (!granted) return;
    await Notifications.scheduleNotificationAsync({
        content: {
            title: `Price alert: ${symbol} 🔔`,
            body: `${symbol} has moved ${direction} your target of $${targetPrice.toFixed(2)}`,
            data: { symbol, type: 'price_alert' },
        },
        trigger: null, // immediate
    });
}

/**
 * Schedule (or reschedule) the daily morning brief notification.
 * Fires every day at 08:00 local time.
 * Cancels the previous one so rescheduling is idempotent.
 */
export async function scheduleDailyBrief(watchlistSymbols: string[]): Promise<void> {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    // Cancel any previously scheduled brief
    const prevId = await AsyncStorage.getItem(DAILY_BRIEF_ID_KEY);
    if (prevId) {
        await Notifications.cancelScheduledNotificationAsync(prevId).catch(() => null);
    }

    const topSymbols = watchlistSymbols.slice(0, 3);
    const bodyText = topSymbols.length
        ? `Check your watchlist: ${topSymbols.join(', ')} + today's market brief`
        : 'Tap to see today\'s market summary and your watchlist.';

    const id = await Notifications.scheduleNotificationAsync({
        content: {
            title: 'Good morning — your market brief is ready ☀️',
            body: bodyText,
            data: { type: 'daily_brief' },
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 8,
            minute: 0,
        },
    });

    await AsyncStorage.setItem(DAILY_BRIEF_ID_KEY, id);
}

/** Cancel the daily brief (e.g. user opts out). */
export async function cancelDailyBrief(): Promise<void> {
    const prevId = await AsyncStorage.getItem(DAILY_BRIEF_ID_KEY);
    if (prevId) {
        await Notifications.cancelScheduledNotificationAsync(prevId).catch(() => null);
        await AsyncStorage.removeItem(DAILY_BRIEF_ID_KEY);
    }
}
