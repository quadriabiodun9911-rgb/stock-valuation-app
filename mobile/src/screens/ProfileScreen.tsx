import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    SafeAreaView,
    ScrollView,
    Switch,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { stockAPI } from '../services/api';

interface UserStats {
    followers: number;
    following: number;
    post_count: number;
}

const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

function getAvatarColor(seed: string): string {
    let n = 0;
    for (let i = 0; i < seed.length; i++) n += seed.charCodeAt(i);
    return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function getInitials(username?: string, email?: string): string {
    const name = username || email || '?';
    const parts = name.split(/[@.\s_-]/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

const ProfileScreen = () => {
    const { user, logout } = useAuth();
    const { theme, isDark, toggleTheme } = useTheme();
    const [stats, setStats] = useState<UserStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);

    useEffect(() => {
        if (user?.id) loadStats();
    }, [user?.id]);

    const loadStats = async () => {
        try {
            setStatsLoading(true);
            const data = await stockAPI.getUserStats(user!.id);
            setStats({
                followers: data.followers ?? 0,
                following: data.following ?? 0,
                post_count: data.post_count ?? 0,
            });
        } catch {
            // stats are non-critical, fail silently
        } finally {
            setStatsLoading(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Log Out', onPress: () => logout(), style: 'destructive' },
            ]
        );
    };

    const initials = getInitials(user?.username, user?.email);
    const avatarColor = getAvatarColor(user?.email || 'user');

    const memberTier = (): { label: string; color: string } => {
        const posts = stats?.post_count ?? 0;
        if (posts >= 50) return { label: 'Elite Trader', color: '#f59e0b' };
        if (posts >= 20) return { label: 'Active Member', color: '#8b5cf6' };
        if (posts >= 5) return { label: 'Rising Star', color: '#10b981' };
        return { label: 'New Member', color: '#3b82f6' };
    };
    const tier = memberTier();

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.background },
        safeArea: { flex: 1, backgroundColor: theme.background },
        header: {
            paddingTop: 20,
            paddingBottom: 16,
            paddingHorizontal: 20,
            backgroundColor: theme.card,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
        },
        headerTitle: { fontSize: 28, fontWeight: 'bold', color: theme.text },
        profileCard: {
            alignItems: 'center',
            margin: 16,
            padding: 24,
            backgroundColor: theme.card,
            borderRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: isDark ? 0.15 : 0.08,
            shadowRadius: 10,
            elevation: 6,
        },
        avatarCircle: {
            width: 84,
            height: 84,
            borderRadius: 42,
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
        userName: { fontSize: 20, fontWeight: '700', marginTop: 14, color: theme.text },
        userEmail: { fontSize: 14, color: theme.subtext, marginTop: 4 },
        tierBadge: {
            marginTop: 10,
            paddingHorizontal: 14,
            paddingVertical: 5,
            borderRadius: 20,
        },
        tierText: { fontSize: 13, fontWeight: '600', color: '#fff' },
        statsRow: {
            flexDirection: 'row',
            justifyContent: 'space-around',
            width: '100%',
            marginTop: 20,
            paddingTop: 18,
            borderTopWidth: 1,
            borderTopColor: theme.border,
        },
        statItem: { alignItems: 'center', flex: 1 },
        statValue: { fontSize: 20, fontWeight: '700', color: theme.text },
        statLabel: { fontSize: 12, color: theme.subtext, marginTop: 3 },
        statDivider: { width: 1, backgroundColor: theme.border },
        sectionLabel: {
            fontSize: 12,
            fontWeight: '600',
            color: theme.subtext,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginHorizontal: 20,
            marginTop: 20,
            marginBottom: 8,
        },
        menuContainer: { marginHorizontal: 16 },
        menuGroup: {
            backgroundColor: theme.card,
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: 12,
        },
        menuItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 15,
            paddingHorizontal: 18,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
        },
        menuItemLast: {
            borderBottomWidth: 0,
        },
        menuIconWrap: {
            width: 34,
            height: 34,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 14,
        },
        menuItemText: { flex: 1, fontSize: 16, color: theme.text, fontWeight: '500' },
        menuItemRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        menuItemRightText: { fontSize: 13, color: theme.subtext },
        logoutButton: {
            margin: 16,
            marginTop: 8,
            backgroundColor: '#ef4444',
            padding: 17,
            borderRadius: 14,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
        },
        logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
        versionText: {
            textAlign: 'center',
            color: theme.subtext,
            fontSize: 12,
            marginBottom: 24,
            marginTop: 4,
        },
    });

    const accountItems = [
        { icon: 'person-outline', iconBg: '#3b82f620', label: 'Account Details' },
        { icon: 'notifications-outline', iconBg: '#f59e0b20', label: 'Notifications' },
        { icon: 'shield-checkmark-outline', iconBg: '#10b98120', label: 'Privacy & Security' },
    ];

    const supportItems = [
        { icon: 'help-circle-outline', iconBg: '#8b5cf620', label: 'Help & Support' },
        { icon: 'star-outline', iconBg: '#ec489920', label: 'Rate the App' },
    ];

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Profile</Text>
                </View>

                {/* Profile card */}
                <View style={styles.profileCard}>
                    <View style={[styles.avatarCircle, { backgroundColor: avatarColor }]}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <Text style={styles.userName}>
                        {user?.username || user?.email?.split('@')[0] || 'Investor'}
                    </Text>
                    <Text style={styles.userEmail}>{user?.email}</Text>
                    <View style={[styles.tierBadge, { backgroundColor: tier.color }]}>
                        <Text style={styles.tierText}>{tier.label}</Text>
                    </View>

                    {/* Social stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            {statsLoading ? (
                                <ActivityIndicator size="small" color={theme.subtext} />
                            ) : (
                                <Text style={styles.statValue}>{stats?.followers ?? '—'}</Text>
                            )}
                            <Text style={styles.statLabel}>Followers</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            {statsLoading ? (
                                <ActivityIndicator size="small" color={theme.subtext} />
                            ) : (
                                <Text style={styles.statValue}>{stats?.following ?? '—'}</Text>
                            )}
                            <Text style={styles.statLabel}>Following</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            {statsLoading ? (
                                <ActivityIndicator size="small" color={theme.subtext} />
                            ) : (
                                <Text style={styles.statValue}>{stats?.post_count ?? '—'}</Text>
                            )}
                            <Text style={styles.statLabel}>Posts</Text>
                        </View>
                    </View>
                </View>

                {/* Appearance */}
                <Text style={styles.sectionLabel}>Appearance</Text>
                <View style={styles.menuContainer}>
                    <View style={styles.menuGroup}>
                        <View style={[styles.menuItem, styles.menuItemLast]}>
                            <View style={[styles.menuIconWrap, { backgroundColor: '#6366f120' }]}>
                                <Ionicons
                                    name={isDark ? 'moon-outline' : 'sunny-outline'}
                                    size={18}
                                    color="#6366f1"
                                />
                            </View>
                            <Text style={styles.menuItemText}>
                                {isDark ? 'Dark Mode' : 'Light Mode'}
                            </Text>
                            <Switch
                                value={isDark}
                                onValueChange={toggleTheme}
                                trackColor={{ false: '#d1d5db', true: '#6366f1' }}
                                thumbColor="#fff"
                            />
                        </View>
                    </View>
                </View>

                {/* Account */}
                <Text style={styles.sectionLabel}>Account</Text>
                <View style={styles.menuContainer}>
                    <View style={styles.menuGroup}>
                        {accountItems.map((item, i) => (
                            <TouchableOpacity
                                key={item.label}
                                style={[styles.menuItem, i === accountItems.length - 1 && styles.menuItemLast]}
                            >
                                <View style={[styles.menuIconWrap, { backgroundColor: item.iconBg }]}>
                                    <Ionicons name={item.icon as any} size={18} color={theme.subtext} />
                                </View>
                                <Text style={styles.menuItemText}>{item.label}</Text>
                                <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Support */}
                <Text style={styles.sectionLabel}>Support</Text>
                <View style={styles.menuContainer}>
                    <View style={styles.menuGroup}>
                        {supportItems.map((item, i) => (
                            <TouchableOpacity
                                key={item.label}
                                style={[styles.menuItem, i === supportItems.length - 1 && styles.menuItemLast]}
                            >
                                <View style={[styles.menuIconWrap, { backgroundColor: item.iconBg }]}>
                                    <Ionicons name={item.icon as any} size={18} color={theme.subtext} />
                                </View>
                                <Text style={styles.menuItemText}>{item.label}</Text>
                                <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={{ height: 16 }} />
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#fff" />
                    <Text style={styles.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Stock Valuation App v1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
};

export default ProfileScreen;

