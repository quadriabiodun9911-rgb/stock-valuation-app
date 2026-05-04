import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, stockAPI } from '../services/api';

interface User {
    id: number;
    email: string;
    username: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (updated: User) => Promise<void>;
}

const AuthContext = createContext<AuthState>({
    user: null,
    token: null,
    loading: true,
    login: async () => { },
    register: async () => { },
    logout: async () => { },
    updateUser: async () => { },
});

const API_BASE_URL = API_URL;

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStoredAuth();
    }, []);

    const loadStoredAuth = async () => {
        try {
            const storedToken = await AsyncStorage.getItem('auth_token');
            const storedUser = await AsyncStorage.getItem('auth_user');
            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
                stockAPI.setAuthToken(storedToken);
            }
        } catch (e) {
            console.error('Failed to load auth:', e);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Login failed');
        await AsyncStorage.setItem('auth_token', data.token);
        await AsyncStorage.setItem('auth_user', JSON.stringify(data.user));
        stockAPI.setAuthToken(data.token);
        setToken(data.token);
        setUser(data.user);
    };

    const register = async (email: string, username: string, password: string) => {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Registration failed');
        await AsyncStorage.setItem('auth_token', data.token);
        await AsyncStorage.setItem('auth_user', JSON.stringify(data.user));
        stockAPI.setAuthToken(data.token);
        setToken(data.token);
        setUser(data.user);
    };

    const logout = async () => {
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('auth_user');
        stockAPI.setAuthToken(null);
        setToken(null);
        setUser(null);
    };

    const updateUser = async (updated: User) => {
        setUser(updated);
        await AsyncStorage.setItem('auth_user', JSON.stringify(updated));
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
