import React, { useEffect, useState, useCallback } from 'react';
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
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { stockAPI } from '../services/api';

interface UserStats {
    followers: number;
    following: number;
    post_count: number;
}

interface NotificationPrefs {
    priceAlerts: boolean;
    marketNews: boolean;
    communityActivity: boolean;
    emailDigest: boolean;
}

interface AppPrefs {
    currency: string;
    defaultChartPeriod: string;
}

const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'CAD', 'AUD'];
const CHART_PERIODS = ['1D', '1W', '1M', '3M', '1Y'];
const NOTIF_STORAGE_KEY = '@prefs_notifications';
const APP_PREFS_KEY = '@prefs_app';

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

function formatDate(dateStr?: string): string {
    if (!dateStr) return 'Unknown';
    try {
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
        return dateStr;
    }
}

type ModalType = null | 'account' | 'settings' | 'notifications' | 'privacy' | 'help';

const FAQ_ITEMS = [
    {
        q: 'How is the stock valuation calculated?',
        a: 'We use three methods: DCF (Discounted Cash Flow) which projects future cash flows, Comparable Analysis which benchmarks against similar companies, and Technical Analysis using price momentum and support/resistance levels.',
    },
    {
        q: 'Why does the data sometimes fail to load?',
        a: 'Stock data is fetched in real-time from market providers. During peak hours or high traffic, requests may be rate-limited. Tap "Try Again" to retry — it usually succeeds on the second attempt.',
    },
    {
        q: 'What does the AI Insights feature do?',
        a: 'AI Insights analyzes your search using real-time financials (P/E ratio, analyst targets, beta, 52-week range) to generate a buy/sell signal score. If OpenAI or Ollama is configured, responses are enhanced with natural language explanations.',
    },
    {
        q: 'How do I add a stock to my watchlist?',
        a: 'Search for any stock using the Search tab, open its detail page, and tap the bookmark icon in the top right corner. You can view all watched stocks from the Watchlist tab.',
    },
    {
        q: 'Is this financial advice?',
        a: 'No. All analysis, AI insights, and community posts are educational only. Always consult a licensed financial advisor before making investment decisions.',
    },
];

const ProfileScreen = () => {
    const { user, logout, updateUser } = useAuth();
    const { theme, isDark, toggleTheme } = useTheme();

    const [stats, setStats] = useState<UserStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [activeModal, setActiveModal] = useState<ModalType>(null);

    // Account Details state
    const [editingUsername, setEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [usernameLoading, setUsernameLoading] = useState(false);

    // Change Password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);

    // Notifications prefs
    const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
        priceAlerts: true,
        marketNews: true,
        communityActivity: false,
        emailDigest: false,
    });

    // App prefs
    const [appPrefs, setAppPrefs] = useState<AppPrefs>({
        currency: 'USD',
        defaultChartPeriod: '1M',
    });

    // FAQ expanded state
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    useEffect(() => {
        if (user?.id) loadStats();
        loadPrefs();
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
            // non-critical
        } finally {
            setStatsLoading(false);
        }
    };

    const loadPrefs = async () => {
        try {
            const [notifRaw, appRaw] = await Promise.all([
                AsyncStorage.getItem(NOTIF_STORAGE_KEY),
                AsyncStorage.getItem(APP_PREFS_KEY),
            ]);
            if (notifRaw) setNotifPrefs(JSON.parse(notifRaw));
            if (appRaw) setAppPrefs(JSON.parse(appRaw));
        } catch {
            // use defaults
        }
    };

    const saveNotifPrefs = async (updated: NotificationPrefs) => {
        setNotifPrefs(updated);
        await AsyncStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(updated));
    };

    const saveAppPrefs = async (updated: AppPrefs) => {
        setAppPrefs(updated);
        await AsyncStorage.setItem(APP_PREFS_KEY, JSON.stringify(updated));
    };

    const handleLogout = () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', onPress: () => logout(), style: 'destructive' },
        ]);
    };

    const handleSaveUsername = async () => {
        const trimmed = newUsername.trim();
        if (!trimmed || trimmed.length < 3) {
            Alert.alert('Invalid Username', 'Username must be at least 3 characters.');
            return;
        }
        try {
            setUsernameLoading(true);
            const res = await stockAPI.updateProfile(trimmed);
            await updateUser(res.user);
            setEditingUsername(false);
            setNewUsername('');
            Alert.alert('Updated', 'Your username has been updated.');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not update username.');
        } finally {
            setUsernameLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Missing Fields', 'Please fill in all password fields.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Mismatch', 'New passwords do not match.');
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert('Too Short', 'New password must be at least 6 characters.');
            return;
        }
        try {
            setPasswordLoading(true);
            await stockAPI.changePassword(currentPassword, newPassword);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            Alert.alert('Success', 'Password changed successfully.');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not change password.');
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'This will permanently delete your account and all data. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Are you sure?',
                            'Type "DELETE" to confirm.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Confirm Delete',
                                    style: 'destructive',
                                    onPress: () => logout(),
                                },
                            ]
                        );
                    },
                },
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

    const closeModal = useCallback(() => {
        setActiveModal(null);
        setEditingUsername(false);
        setNewUsername('');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setExpandedFaq(null);
    }, []);

    // ── Shared modal shell ─────────────────────────────────────────
    const renderModalShell = (title: string, children: React.ReactNode) => (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
            <SafeAreaView style={[s.modalSafe, { backgroundColor: theme.background }]}>
                <View style={[s.modalHeader, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
                    <TouchableOpacity onPress={closeModal} style={s.modalBackBtn}>
                        <Ionicons name="chevron-down" size={22} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[s.modalTitle, { color: theme.text }]}>{title}</Text>
                    <View style={{ width: 40 }} />
                </View>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {children}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );

    // ── Account Details modal ──────────────────────────────────────
    const renderAccountModal = () => renderModalShell('Account Details', (
        <View>
            {/* Avatar + name */}
            <View style={[s.profileCard, { backgroundColor: theme.card }]}>
                <View style={[s.avatarCircle, { backgroundColor: avatarColor }]}>
                    <Text style={s.avatarText}>{initials}</Text>
                </View>
                <View style={[s.tierBadge, { backgroundColor: tier.color, marginTop: 10 }]}>
                    <Text style={s.tierText}>{tier.label}</Text>
                </View>
            </View>

            {/* Fields */}
            <Text style={[s.sectionLabel, { color: theme.subtext }]}>Profile Info</Text>
            <View style={[s.menuGroup, { backgroundColor: theme.card, marginHorizontal: 16 }]}>
                <View style={[s.fieldRow, { borderBottomColor: theme.border }]}>
                    <Text style={[s.fieldLabel, { color: theme.subtext }]}>Email</Text>
                    <Text style={[s.fieldValue, { color: theme.text }]}>{user?.email}</Text>
                </View>
                <View style={[s.fieldRow, { borderBottomColor: theme.border }]}>
                    <Text style={[s.fieldLabel, { color: theme.subtext }]}>Member Since</Text>
                    <Text style={[s.fieldValue, { color: theme.text }]}>{formatDate((user as any)?.created_at)}</Text>
                </View>
                <View style={[s.fieldRow, { borderBottomColor: theme.border, borderBottomWidth: 0 }]}>
                    <Text style={[s.fieldLabel, { color: theme.subtext }]}>Tier</Text>
                    <Text style={[s.fieldValue, { color: tier.color, fontWeight: '600' }]}>{tier.label}</Text>
                </View>
            </View>

            {/* Edit Username */}
            <Text style={[s.sectionLabel, { color: theme.subtext }]}>Edit Username</Text>
            <View style={[s.menuGroup, { backgroundColor: theme.card, marginHorizontal: 16, padding: 16 }]}>
                <Text style={[s.fieldLabel, { color: theme.subtext, marginBottom: 8 }]}>Current: @{user?.username}</Text>
                {editingUsername ? (
                    <View>
                        <TextInput
                            style={[s.textInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                            value={newUsername}
                            onChangeText={setNewUsername}
                            placeholder="New username"
                            placeholderTextColor={theme.subtext}
                            autoCapitalize="none"
                            autoCorrect={false}
                            maxLength={50}
                        />
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                            <TouchableOpacity
                                style={[s.actionBtn, { backgroundColor: '#3b82f6', flex: 1 }]}
                                onPress={handleSaveUsername}
                                disabled={usernameLoading}
                            >
                                {usernameLoading
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Text style={s.actionBtnText}>Save</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.actionBtn, { backgroundColor: theme.border, flex: 1 }]}
                                onPress={() => { setEditingUsername(false); setNewUsername(''); }}
                            >
                                <Text style={[s.actionBtnText, { color: theme.text }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: '#3b82f610', borderWidth: 1, borderColor: '#3b82f6' }]}
                        onPress={() => { setEditingUsername(true); setNewUsername(user?.username || ''); }}
                    >
                        <Ionicons name="pencil-outline" size={16} color="#3b82f6" />
                        <Text style={[s.actionBtnText, { color: '#3b82f6', marginLeft: 6 }]}>Change Username</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    ));

    // ── App Settings modal ─────────────────────────────────────────
    const renderSettingsModal = () => renderModalShell('App Settings', (
        <View>
            <Text style={[s.sectionLabel, { color: theme.subtext }]}>Display Currency</Text>
            <View style={[s.menuGroup, { backgroundColor: theme.card, marginHorizontal: 16 }]}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 }}>
                    {CURRENCIES.map((c) => (
                        <TouchableOpacity
                            key={c}
                            style={[
                                s.chip,
                                { borderColor: appPrefs.currency === c ? '#3b82f6' : theme.border },
                                appPrefs.currency === c && { backgroundColor: '#3b82f6' },
                            ]}
                            onPress={() => saveAppPrefs({ ...appPrefs, currency: c })}
                        >
                            <Text style={{ color: appPrefs.currency === c ? '#fff' : theme.text, fontWeight: '600' }}>{c}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <Text style={[s.sectionLabel, { color: theme.subtext }]}>Default Chart Period</Text>
            <View style={[s.menuGroup, { backgroundColor: theme.card, marginHorizontal: 16 }]}>
                <View style={{ flexDirection: 'row', gap: 8, padding: 14 }}>
                    {CHART_PERIODS.map((p) => (
                        <TouchableOpacity
                            key={p}
                            style={[
                                s.chip,
                                { borderColor: appPrefs.defaultChartPeriod === p ? '#8b5cf6' : theme.border },
                                appPrefs.defaultChartPeriod === p && { backgroundColor: '#8b5cf6' },
                            ]}
                            onPress={() => saveAppPrefs({ ...appPrefs, defaultChartPeriod: p })}
                        >
                            <Text style={{ color: appPrefs.defaultChartPeriod === p ? '#fff' : theme.text, fontWeight: '600' }}>{p}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <Text style={[s.sectionLabel, { color: theme.subtext }]}>Appearance</Text>
            <View style={[s.menuGroup, { backgroundColor: theme.card, marginHorizontal: 16 }]}>
                <View style={[s.menuItem, { borderBottomWidth: 0 }]}>
                    <View style={[s.menuIconWrap, { backgroundColor: '#6366f120' }]}>
                        <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={18} color="#6366f1" />
                    </View>
                    <Text style={[s.menuItemText, { color: theme.text }]}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
                    <Switch
                        value={isDark}
                        onValueChange={toggleTheme}
                        trackColor={{ false: '#d1d5db', true: '#6366f1' }}
                        thumbColor="#fff"
                    />
                </View>
            </View>
        </View>
    ));

    // ── Notifications modal ────────────────────────────────────────
    const renderNotificationsModal = () => renderModalShell('Notifications', (
        <View>
            <Text style={[s.sectionLabel, { color: theme.subtext }]}>Push Notifications</Text>
            <View style={[s.menuGroup, { backgroundColor: theme.card, marginHorizontal: 16 }]}>
                {([
                    { key: 'priceAlerts', label: 'Price Alerts', sub: 'Get notified when a price target is hit', icon: 'trending-up-outline', color: '#10b981' },
                    { key: 'marketNews', label: 'Market News', sub: 'Breaking news for stocks you follow', icon: 'newspaper-outline', color: '#3b82f6' },
                    { key: 'communityActivity', label: 'Community Activity', sub: 'Replies and mentions in the social feed', icon: 'people-outline', color: '#8b5cf6' },
                ] as const).map((item, i, arr) => (
                    <View key={item.key} style={[s.menuItem, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                        <View style={[s.menuIconWrap, { backgroundColor: item.color + '20' }]}>
                            <Ionicons name={item.icon} size={18} color={item.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.menuItemText, { color: theme.text }]}>{item.label}</Text>
                            <Text style={{ fontSize: 12, color: theme.subtext, marginTop: 2 }}>{item.sub}</Text>
                        </View>
                        <Switch
                            value={notifPrefs[item.key]}
                            onValueChange={(v) => saveNotifPrefs({ ...notifPrefs, [item.key]: v })}
                            trackColor={{ false: '#d1d5db', true: item.color }}
                            thumbColor="#fff"
                        />
                    </View>
                ))}
            </View>

            <Text style={[s.sectionLabel, { color: theme.subtext }]}>Email</Text>
            <View style={[s.menuGroup, { backgroundColor: theme.card, marginHorizontal: 16 }]}>
                <View style={[s.menuItem, { borderBottomWidth: 0 }]}>
                    <View style={[s.menuIconWrap, { backgroundColor: '#f59e0b20' }]}>
                        <Ionicons name="mail-outline" size={18} color="#f59e0b" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.menuItemText, { color: theme.text }]}>Weekly Digest</Text>
                        <Text style={{ fontSize: 12, color: theme.subtext, marginTop: 2 }}>Weekly portfolio performance summary</Text>
                    </View>
                    <Switch
                        value={notifPrefs.emailDigest}
                        onValueChange={(v) => saveNotifPrefs({ ...notifPrefs, emailDigest: v })}
                        trackColor={{ false: '#d1d5db', true: '#f59e0b' }}
                        thumbColor="#fff"
                    />
                </View>
            </View>
        </View>
    ));

    // ── Privacy & Security modal ───────────────────────────────────
    const renderPrivacyModal = () => renderModalShell('Privacy & Security', (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Text style={[s.sectionLabel, { color: theme.subtext }]}>Change Password</Text>
            <View style={[s.menuGroup, { backgroundColor: theme.card, marginHorizontal: 16, padding: 16 }]}>
                {/* Current password */}
                <Text style={[s.fieldLabel, { color: theme.subtext, marginBottom: 6 }]}>Current Password</Text>
                <View style={[s.pwRow, { borderColor: theme.border, backgroundColor: theme.background }]}>
                    <TextInput
                        style={[s.pwInput, { color: theme.text }]}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry={!showCurrentPw}
                        placeholder="Enter current password"
                        placeholderTextColor={theme.subtext}
                        autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowCurrentPw(!showCurrentPw)}>
                        <Ionicons name={showCurrentPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.subtext} />
                    </TouchableOpacity>
                </View>

                {/* New password */}
                <Text style={[s.fieldLabel, { color: theme.subtext, marginBottom: 6, marginTop: 14 }]}>New Password</Text>
                <View style={[s.pwRow, { borderColor: theme.border, backgroundColor: theme.background }]}>
                    <TextInput
                        style={[s.pwInput, { color: theme.text }]}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNewPw}
                        placeholder="At least 6 characters"
                        placeholderTextColor={theme.subtext}
                        autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowNewPw(!showNewPw)}>
                        <Ionicons name={showNewPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.subtext} />
                    </TouchableOpacity>
                </View>

                {/* Confirm password */}
                <Text style={[s.fieldLabel, { color: theme.subtext, marginBottom: 6, marginTop: 14 }]}>Confirm New Password</Text>
                <TextInput
                    style={[s.textInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    placeholder="Repeat new password"
                    placeholderTextColor={theme.subtext}
                    autoCapitalize="none"
                />

                <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: '#3b82f6', marginTop: 16 }]}
                    onPress={handleChangePassword}
                    disabled={passwordLoading}
                >
                    {passwordLoading
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={s.actionBtnText}>Update Password</Text>}
                </TouchableOpacity>
            </View>

            <Text style={[s.sectionLabel, { color: theme.subtext }]}>Data & Privacy</Text>
            <View style={[s.menuGroup, { backgroundColor: theme.card, marginHorizontal: 16 }]}>
                <TouchableOpacity
                    style={[s.menuItem, { borderBottomColor: theme.border }]}
                    onPress={() => Linking.openURL('mailto:support@stockvaluation.app?subject=Data Export Request')}
                >
                    <View style={[s.menuIconWrap, { backgroundColor: '#10b98120' }]}>
                        <Ionicons name="download-outline" size={18} color="#10b981" />
                    </View>
                    <Text style={[s.menuItemText, { color: theme.text }]}>Export My Data</Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[s.menuItem, { borderBottomWidth: 0 }]}
                    onPress={() => Linking.openURL('https://stock-valuation-app-rtll.onrender.com/docs#/privacy')}
                >
                    <View style={[s.menuIconWrap, { backgroundColor: '#3b82f620' }]}>
                        <Ionicons name="document-text-outline" size={18} color="#3b82f6" />
                    </View>
                    <Text style={[s.menuItemText, { color: theme.text }]}>Privacy Policy</Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
                </TouchableOpacity>
            </View>

            <Text style={[s.sectionLabel, { color: theme.subtext }]}>Danger Zone</Text>
            <View style={[s.menuGroup, { backgroundColor: theme.card, marginHorizontal: 16 }]}>
                <TouchableOpacity
                    style={[s.menuItem, { borderBottomWidth: 0 }]}
                    onPress={handleDeleteAccount}
                >
                    <View style={[s.menuIconWrap, { backgroundColor: '#ef444420' }]}>
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </View>
                    <Text style={[s.menuItemText, { color: '#ef4444' }]}>Delete Account</Text>
                    <Ionicons name="chevron-forward" size={16} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    ));

    // ── Help & Support modal ───────────────────────────────────────
    const renderHelpModal = () => renderModalShell('Help & Support', (
        <View>
            <Text style={[s.sectionLabel, { color: theme.subtext }]}>Frequently Asked Questions</Text>
            <View style={[s.menuGroup, { backgroundColor: theme.card, marginHorizontal: 16 }]}>
                {FAQ_ITEMS.map((item, i) => (
                    <View key={i}>
                        <TouchableOpacity
                            style={[s.menuItem, (expandedFaq !== i) && { borderBottomColor: theme.border }]}
                            onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}
                        >
                            <Text style={[s.menuItemText, { color: theme.text, flex: 1, marginRight: 8 }]}>{item.q}</Text>
                            <Ionicons
                                name={expandedFaq === i ? 'chevron-up' : 'chevron-down'}
                                size={16}
                                color={theme.subtext}
                            />
                        </TouchableOpacity>
                        {expandedFaq === i && (
                            <View style={{ paddingHorizontal: 16, paddingBottom: 14, paddingTop: 0 }}>
                                <Text style={{ color: theme.subtext, fontSize: 14, lineHeight: 20 }}>{item.a}</Text>
                            </View>
                        )}
                    </View>
                ))}
            </View>

            <Text style={[s.sectionLabel, { color: theme.subtext }]}>Contact</Text>
            <View style={[s.menuGroup, { backgroundColor: theme.card, marginHorizontal: 16 }]}>
                <TouchableOpacity
                    style={[s.menuItem, { borderBottomColor: theme.border }]}
                    onPress={() => Linking.openURL('mailto:support@stockvaluation.app')}
                >
                    <View style={[s.menuIconWrap, { backgroundColor: '#3b82f620' }]}>
                        <Ionicons name="mail-outline" size={18} color="#3b82f6" />
                    </View>
                    <Text style={[s.menuItemText, { color: theme.text }]}>Email Support</Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[s.menuItem, { borderBottomColor: theme.border }]}
                    onPress={() => Linking.openURL('mailto:bugs@stockvaluation.app?subject=Bug Report')}
                >
                    <View style={[s.menuIconWrap, { backgroundColor: '#ef444420' }]}>
                        <Ionicons name="bug-outline" size={18} color="#ef4444" />
                    </View>
                    <Text style={[s.menuItemText, { color: theme.text }]}>Report a Bug</Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[s.menuItem, { borderBottomWidth: 0 }]}
                    onPress={() => Linking.openURL('https://stock-valuation-app-rtll.onrender.com/docs')}
                >
                    <View style={[s.menuIconWrap, { backgroundColor: '#8b5cf620' }]}>
                        <Ionicons name="book-outline" size={18} color="#8b5cf6" />
                    </View>
                    <Text style={[s.menuItemText, { color: theme.text }]}>API Documentation</Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
                </TouchableOpacity>
            </View>

            <Text style={[s.sectionLabel, { color: theme.subtext }]}>Legal</Text>
            <View style={[s.menuGroup, { backgroundColor: theme.card, marginHorizontal: 16 }]}>
                <TouchableOpacity
                    style={[s.menuItem, { borderBottomColor: theme.border }]}
                    onPress={() => Linking.openURL('https://stock-valuation-app-rtll.onrender.com/docs#/terms')}
                >
                    <View style={[s.menuIconWrap, { backgroundColor: '#6366f120' }]}>
                        <Ionicons name="document-text-outline" size={18} color="#6366f1" />
                    </View>
                    <Text style={[s.menuItemText, { color: theme.text }]}>Terms of Service</Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[s.menuItem, { borderBottomWidth: 0 }]}
                    onPress={() => Alert.alert('Disclaimer', 'All content in this app is for educational purposes only and does not constitute financial advice.')}
                >
                    <View style={[s.menuIconWrap, { backgroundColor: '#f59e0b20' }]}>
                        <Ionicons name="warning-outline" size={18} color="#f59e0b" />
                    </View>
                    <Text style={[s.menuItemText, { color: theme.text }]}>Risk Disclaimer</Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
                </TouchableOpacity>
            </View>
        </View>
    ));

    // ── Main menu items ────────────────────────────────────────────
    const accountItems = [
        { icon: 'person-outline', iconBg: '#3b82f620', iconColor: '#3b82f6', label: 'Account Details', modal: 'account' as ModalType },
        { icon: 'settings-outline', iconBg: '#6366f120', iconColor: '#6366f1', label: 'App Settings', modal: 'settings' as ModalType },
        { icon: 'notifications-outline', iconBg: '#f59e0b20', iconColor: '#f59e0b', label: 'Notifications', modal: 'notifications' as ModalType },
        { icon: 'shield-checkmark-outline', iconBg: '#10b98120', iconColor: '#10b981', label: 'Privacy & Security', modal: 'privacy' as ModalType },
    ];

    const supportItems = [
        { icon: 'help-circle-outline', iconBg: '#8b5cf620', iconColor: '#8b5cf6', label: 'Help & Support', modal: 'help' as ModalType },
        { icon: 'star-outline', iconBg: '#ec489920', iconColor: '#ec4899', label: 'Rate the App', modal: null as ModalType, onPress: () => Alert.alert('Rate Us', 'Thank you for using the app! Rating will be available on the App Store.') },
    ];

    return (
        <SafeAreaView style={[s.safeArea, { backgroundColor: theme.background }]}>
            <ScrollView style={[s.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
                <View style={[s.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                    <Text style={[s.headerTitle, { color: theme.text }]}>Profile</Text>
                </View>

                {/* Profile card */}
                <View style={[s.profileCard, { backgroundColor: theme.card }]}>
                    <View style={[s.avatarCircle, { backgroundColor: avatarColor }]}>
                        <Text style={s.avatarText}>{initials}</Text>
                    </View>
                    <Text style={[s.userName, { color: theme.text }]}>
                        {user?.username || user?.email?.split('@')[0] || 'Investor'}
                    </Text>
                    <Text style={[s.userEmail, { color: theme.subtext }]}>{user?.email}</Text>
                    <View style={[s.tierBadge, { backgroundColor: tier.color }]}>
                        <Text style={s.tierText}>{tier.label}</Text>
                    </View>

                    {/* Social stats */}
                    <View style={[s.statsRow, { borderTopColor: theme.border }]}>
                        {[
                            { val: stats?.followers, label: 'Followers' },
                            { val: stats?.following, label: 'Following' },
                            { val: stats?.post_count, label: 'Posts' },
                        ].map((stat, i) => (
                            <React.Fragment key={stat.label}>
                                {i > 0 && <View style={[s.statDivider, { backgroundColor: theme.border }]} />}
                                <View style={s.statItem}>
                                    {statsLoading
                                        ? <ActivityIndicator size="small" color={theme.subtext} />
                                        : <Text style={[s.statValue, { color: theme.text }]}>{stat.val ?? '—'}</Text>}
                                    <Text style={[s.statLabel, { color: theme.subtext }]}>{stat.label}</Text>
                                </View>
                            </React.Fragment>
                        ))}
                    </View>
                </View>

                {/* Account section */}
                <Text style={[s.sectionLabel, { color: theme.subtext }]}>Account</Text>
                <View style={s.menuContainer}>
                    <View style={[s.menuGroup, { backgroundColor: theme.card }]}>
                        {accountItems.map((item, i) => (
                            <TouchableOpacity
                                key={item.label}
                                style={[s.menuItem, { borderBottomColor: theme.border }, i === accountItems.length - 1 && s.menuItemLast]}
                                onPress={() => setActiveModal(item.modal)}
                            >
                                <View style={[s.menuIconWrap, { backgroundColor: item.iconBg }]}>
                                    <Ionicons name={item.icon as any} size={18} color={item.iconColor} />
                                </View>
                                <Text style={[s.menuItemText, { color: theme.text }]}>{item.label}</Text>
                                <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Support section */}
                <Text style={[s.sectionLabel, { color: theme.subtext }]}>Support</Text>
                <View style={s.menuContainer}>
                    <View style={[s.menuGroup, { backgroundColor: theme.card }]}>
                        {supportItems.map((item, i) => (
                            <TouchableOpacity
                                key={item.label}
                                style={[s.menuItem, { borderBottomColor: theme.border }, i === supportItems.length - 1 && s.menuItemLast]}
                                onPress={item.onPress ?? (() => item.modal && setActiveModal(item.modal))}
                            >
                                <View style={[s.menuIconWrap, { backgroundColor: item.iconBg }]}>
                                    <Ionicons name={item.icon as any} size={18} color={item.iconColor} />
                                </View>
                                <Text style={[s.menuItemText, { color: theme.text }]}>{item.label}</Text>
                                <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={{ height: 16 }} />
                <TouchableOpacity style={s.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#fff" />
                    <Text style={s.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={[s.versionText, { color: theme.subtext }]}>Stock Valuation App v1.0.0</Text>
            </ScrollView>

            {/* Modals */}
            {activeModal === 'account' && renderAccountModal()}
            {activeModal === 'settings' && renderSettingsModal()}
            {activeModal === 'notifications' && renderNotificationsModal()}
            {activeModal === 'privacy' && renderPrivacyModal()}
            {activeModal === 'help' && renderHelpModal()}
        </SafeAreaView>
    );
};

// ── Styles ──────────────────────────────────────────────────────
const s = StyleSheet.create({
    safeArea: { flex: 1 },
    container: { flex: 1 },
    header: {
        paddingTop: 20,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 28, fontWeight: 'bold' },
    profileCard: {
        alignItems: 'center',
        margin: 16,
        padding: 24,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
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
    userName: { fontSize: 20, fontWeight: '700', marginTop: 14 },
    userEmail: { fontSize: 14, marginTop: 4 },
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
    },
    statItem: { alignItems: 'center', flex: 1 },
    statValue: { fontSize: 20, fontWeight: '700' },
    statLabel: { fontSize: 12, marginTop: 3 },
    statDivider: { width: 1 },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 8,
    },
    menuContainer: { marginHorizontal: 16 },
    menuGroup: {
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
    },
    menuItemLast: { borderBottomWidth: 0 },
    menuIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    menuItemText: { flex: 1, fontSize: 16, fontWeight: '500' },
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
        fontSize: 12,
        marginBottom: 24,
        marginTop: 4,
    },
    // Modal styles
    modalSafe: { flex: 1 },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    modalBackBtn: { width: 40, alignItems: 'flex-start' },
    modalTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
    fieldRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    fieldLabel: { fontSize: 14 },
    fieldValue: { fontSize: 14, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
    textInput: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 11,
        fontSize: 15,
    },
    pwRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 4,
    },
    pwInput: { flex: 1, fontSize: 15, paddingVertical: 8 },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
    },
    actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1.5,
    },
});

export default ProfileScreen;


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

