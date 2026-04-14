import { Platform } from 'react-native';

let Haptics: any = null;

// Dynamic import so it doesn't crash if expo-haptics isn't installed
try {
    Haptics = require('expo-haptics');
} catch { }

export const haptic = {
    light: () => Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Light),
    medium: () => Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium),
    heavy: () => Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Heavy),
    success: () => Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType.Success),
    error: () => Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType.Error),
    selection: () => Haptics?.selectionAsync?.(),
};

export default haptic;
