import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ExperiencePreset = 'beginner' | 'advanced';

const PREFERENCES_STORAGE_KEY = 'sv_app_preferences_v1';

interface AppPreferencesContextValue {
    beginnerMode: boolean;
    setBeginnerMode: (value: boolean) => void;
    toggleBeginnerMode: () => void;
    experiencePreset: ExperiencePreset;
    applyExperiencePreset: (preset: ExperiencePreset) => void;
}

const AppPreferencesContext = createContext<AppPreferencesContextValue | undefined>(undefined);

export const AppPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [beginnerMode, setBeginnerMode] = useState(true);

    useEffect(() => {
        const loadPreferences = async () => {
            try {
                const stored = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
                if (!stored) return;

                const parsed = JSON.parse(stored) as { beginnerMode?: boolean };
                if (typeof parsed.beginnerMode === 'boolean') {
                    setBeginnerMode(parsed.beginnerMode);
                }
            } catch (error) {
                console.warn('Unable to load app preferences:', error);
            }
        };

        loadPreferences();
    }, []);

    const persistBeginnerMode = async (value: boolean) => {
        try {
            await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ beginnerMode: value }));
        } catch (error) {
            console.warn('Unable to save app preferences:', error);
        }
    };

    const setBeginnerModeWithPersist = (value: boolean) => {
        setBeginnerMode(value);
        persistBeginnerMode(value);
    };

    const applyExperiencePreset = (preset: ExperiencePreset) => {
        const isBeginner = preset === 'beginner';
        setBeginnerModeWithPersist(isBeginner);
    };

    const experiencePreset: ExperiencePreset = beginnerMode ? 'beginner' : 'advanced';

    const value = useMemo(
        () => ({
            beginnerMode,
            setBeginnerMode: setBeginnerModeWithPersist,
            toggleBeginnerMode: () => setBeginnerModeWithPersist(!beginnerMode),
            experiencePreset,
            applyExperiencePreset,
        }),
        [beginnerMode, experiencePreset]
    );

    return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
};

export const useAppPreferences = () => {
    const context = useContext(AppPreferencesContext);
    if (!context) {
        throw new Error('useAppPreferences must be used within AppPreferencesProvider');
    }
    return context;
};
