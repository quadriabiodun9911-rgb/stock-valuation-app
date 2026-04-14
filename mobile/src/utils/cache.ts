import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

export async function getCached<T>(key: string): Promise<T | null> {
    try {
        const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;
        const entry: CacheEntry<T> = JSON.parse(raw);
        if (Date.now() - entry.timestamp > entry.ttl) {
            AsyncStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }
        return entry.data;
    } catch { return null; }
}

export async function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
    try {
        const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
        await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch (e) { console.warn('Cache write error:', e); }
}

/**
 * Fetch with offline fallback. Tries network first, falls back to cache.
 */
export async function fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = DEFAULT_TTL,
): Promise<T> {
    try {
        const data = await fetcher();
        await setCache(key, data, ttl);
        return data;
    } catch (e) {
        const cached = await getCached<T>(key);
        if (cached !== null) {
            console.log(`Using cached data for ${key}`);
            return cached;
        }
        throw e;
    }
}

export async function clearCache(): Promise<void> {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
        if (cacheKeys.length > 0) {
            await AsyncStorage.multiRemove(cacheKeys);
        }
    } catch (e) { console.warn('Cache clear error:', e); }
}
