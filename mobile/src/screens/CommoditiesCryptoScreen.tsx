import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { API_URL } from '../services/api';

interface Props {
    navigation: any;
}

type Tab = 'commodities' | 'crypto';

interface MarketItem {
    symbol: string;
    name: string;
    category: string;
    unit?: string;
    price: number;
    previous_close: number;
    change: number;
    change_percent: number;
    '52_week_high': number;
    '52_week_low': number;
    error: string | null;
}

interface MarketData {
    total: number;
    categories: Record<string, MarketItem[]>;
    items: MarketItem[];
}

// Commodity category colours
const CATEGORY_COLORS: Record<string, string> = {
    'Precious Metals': '#f59e0b',
    'Energy': '#ef4444',
    'Industrial Metals': '#6366f1',
    'Agriculture': '#22c55e',
    'Store of Value': '#f59e0b',
    'Smart Contracts': '#6366f1',
    'Exchange Token': '#0ea5e9',
    'Payments': '#10b981',
    'Meme': '#ec4899',
    'Layer 2': '#8b5cf6',
    'Infrastructure': '#14b8a6',
    'Oracle': '#0891b2',
    'DeFi': '#f97316',
    'Crypto': '#7c3aed',
    'Other': '#64748b',
};

function getCategoryColor(cat: string): string {
    return CATEGORY_COLORS[cat] ?? '#64748b';
}

function PriceRow({ item, theme }: { item: MarketItem; theme: any }) {
    const isUp = item.change_percent >= 0;
    const changeColor = isUp ? '#22c55e' : '#ef4444';
    const catColor = getCategoryColor(item.category);

    return (
        <View style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.catDot, { backgroundColor: catColor }]} />
            <View style={styles.rowLeft}>
                <Text style={[styles.symbol, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.symbolCode, { color: theme.textSecondary }]}>
                    {item.symbol}{item.unit ? `  ·  ${item.unit}` : ''}
                </Text>
            </View>
            <View style={styles.rowRight}>
                {item.error ? (
                    <Text style={styles.errorText}>Unavailable</Text>
                ) : (
                    <>
                        <Text style={[styles.price, { color: theme.text }]}>
                            {item.price < 0.01
                                ? item.price.toFixed(6)
                                : item.price < 1
                                    ? item.price.toFixed(4)
                                    : item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                        <View style={[styles.changePill, { backgroundColor: isUp ? '#dcfce7' : '#fee2e2' }]}>
                            <Ionicons
                                name={isUp ? 'trending-up' : 'trending-down'}
                                size={10}
                                color={changeColor}
                            />
                            <Text style={[styles.changeText, { color: changeColor }]}>
                                {isUp ? '+' : ''}{item.change_percent.toFixed(2)}%
                            </Text>
                        </View>
                    </>
                )}
            </View>
        </View>
    );
}

function CategorySection({ title, items, theme }: { title: string; items: MarketItem[]; theme: any }) {
    const color = getCategoryColor(title);
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: color }]} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
                <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>{items.length}</Text>
            </View>
            {items.map((item) => (
                <PriceRow key={item.symbol} item={item} theme={theme} />
            ))}
        </View>
    );
}

const CommoditiesCryptoScreen: React.FC<Props> = ({ navigation }) => {
    const { theme, isDark } = useTheme();
    const [activeTab, setActiveTab] = useState<Tab>('commodities');
    const [commodityData, setCommodityData] = useState<MarketData | null>(null);
    const [cryptoData, setCryptoData] = useState<MarketData | null>(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const fetchData = useCallback(async (tab: Tab, silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const endpoint = tab === 'commodities' ? '/markets/commodities' : '/markets/crypto';
            const res = await fetch(`${API_URL}${endpoint}`);
            if (!res.ok) throw new Error(`Server responded ${res.status}`);
            const json: MarketData = await res.json();
            if (!mountedRef.current) return;
            if (tab === 'commodities') setCommodityData(json);
            else setCryptoData(json);
        } catch (err: any) {
            if (mountedRef.current) setError(err.message ?? 'Failed to load data');
        } finally {
            if (mountedRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, []);

    useEffect(() => {
        // Load both tabs upfront so switching is instant
        fetchData('commodities');
        fetchData('crypto', true);
    }, [fetchData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData(activeTab);
    }, [activeTab, fetchData]);

    const onTabSwitch = (tab: Tab) => {
        setActiveTab(tab);
        // Re-fetch if data is missing
        if (tab === 'commodities' && !commodityData) fetchData('commodities');
        if (tab === 'crypto' && !cryptoData) fetchData('crypto');
    };

    const currentData = activeTab === 'commodities' ? commodityData : cryptoData;
    const categories = currentData ? Object.entries(currentData.categories) : [];

    return (
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
            {/* Header */}
            <LinearGradient colors={['#0f172a', '#1d4ed8']} style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Markets</Text>
                    <Text style={styles.headerSub}>Commodities & Crypto</Text>
                </View>
                <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
                    <Ionicons name="refresh" size={20} color="#fff" />
                </TouchableOpacity>
            </LinearGradient>

            {/* Tabs */}
            <View style={[styles.tabBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                {(['commodities', 'crypto'] as Tab[]).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.tabActive]}
                        onPress={() => onTabSwitch(tab)}
                    >
                        <Ionicons
                            name={tab === 'commodities' ? 'layers' : 'logo-bitcoin'}
                            size={16}
                            color={activeTab === tab ? '#2563eb' : theme.textSecondary}
                        />
                        <Text style={[styles.tabLabel, { color: activeTab === tab ? '#2563eb' : theme.textSecondary },
                        activeTab === tab && styles.tabLabelActive]}>
                            {tab === 'commodities' ? 'Commodities' : 'Crypto'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            {loading && !currentData ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                        Fetching live prices…
                    </Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Ionicons name="cloud-offline-outline" size={48} color={theme.textMuted} />
                    <Text style={[styles.errorMsg, { color: theme.text }]}>Could not load data</Text>
                    <Text style={[styles.errorDetail, { color: theme.textSecondary }]}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData(activeTab)}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    {/* Summary strip */}
                    {currentData && (
                        <View style={[styles.summaryStrip, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
                                {currentData.total} assets  ·  {Object.keys(currentData.categories).length} categories
                            </Text>
                            <View style={styles.liveTag}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveText}>Live</Text>
                            </View>
                        </View>
                    )}

                    {categories.map(([cat, items]) => (
                        <CategorySection key={cat} title={cat} items={items} theme={theme} />
                    ))}

                    <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
                        Prices sourced from market data providers. Delayed up to 15 min.
                    </Text>
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 52,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    backBtn: { padding: 4, marginRight: 8 },
    refreshBtn: { padding: 4, marginLeft: 'auto' },
    headerText: { flex: 1 },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
    headerSub: { color: '#93c5fd', fontSize: 12, marginTop: 2 },

    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: '#2563eb' },
    tabLabel: { fontSize: 14, fontWeight: '600' },
    tabLabelActive: { color: '#2563eb' },

    scrollContent: { padding: 16, paddingBottom: 40 },

    summaryStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 16,
    },
    summaryText: { fontSize: 13 },
    liveTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
    liveText: { color: '#22c55e', fontSize: 12, fontWeight: '700' },

    section: { marginBottom: 20 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6,
    },
    sectionDot: { width: 8, height: 8, borderRadius: 4 },
    sectionTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
    sectionCount: { fontSize: 12 },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 6,
        gap: 10,
    },
    catDot: { width: 6, height: 6, borderRadius: 3 },
    rowLeft: { flex: 1 },
    rowRight: { alignItems: 'flex-end' },
    symbol: { fontSize: 14, fontWeight: '700' },
    symbolCode: { fontSize: 11, marginTop: 1 },
    price: { fontSize: 15, fontWeight: '700' },
    changePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 3,
    },
    changeText: { fontSize: 11, fontWeight: '700' },
    errorText: { color: '#ef4444', fontSize: 12 },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
    loadingText: { fontSize: 14, marginTop: 8 },
    errorMsg: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
    errorDetail: { fontSize: 13, textAlign: 'center' },
    retryBtn: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 8,
    },
    retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    disclaimer: { fontSize: 11, textAlign: 'center', marginTop: 8 },
});

export default CommoditiesCryptoScreen;
