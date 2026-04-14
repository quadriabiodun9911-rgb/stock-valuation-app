import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const lightTheme = {
    dark: false,
    bg: '#f1f5f9',
    bgAlt: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    border: '#e2e8f0',
    primary: '#2563eb',
    headerGradient: ['#0f172a', '#1e3a5f'] as readonly string[],
    tabBar: '#ffffff',
    tabBarBorder: 'transparent',
    inputBg: '#f8fafc',
};

export const darkTheme = {
    dark: true,
    bg: '#0f172a',
    bgAlt: '#1e293b',
    card: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    border: '#334155',
    primary: '#3b82f6',
    headerGradient: ['#020617', '#0f172a'] as readonly string[],
    tabBar: '#0f172a',
    tabBarBorder: '#1e293b',
    inputBg: '#0f172a',
};

export type AppTheme = typeof lightTheme;

interface ThemeState {
    theme: AppTheme;
    isDark: boolean;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeState>({
    theme: lightTheme,
    isDark: false,
    toggleTheme: () => { },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem('app_theme').then((val) => {
            if (val === 'dark') setIsDark(true);
        });
    }, []);

    const toggleTheme = () => {
        const next = !isDark;
        setIsDark(next);
        AsyncStorage.setItem('app_theme', next ? 'dark' : 'light');
    };

    const theme = isDark ? darkTheme : lightTheme;

    return (
        <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
