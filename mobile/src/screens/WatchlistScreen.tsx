// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    TextInput,
    ActivityIndicator,
    Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Market, MarketInfo, stockAPI } from '../services/api';

const WATCHLIST_STORAGE_KEY = 'watchlist_items';

// Configure notification presentation behaviour
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

interface Props {
    navigation: any;
    route?: any;
}

type AlertDirection = 'above' | 'below';

interface WatchlistItem {
    symbol: string;
    alertPrice?: number;
    alertDirection: AlertDirection;
    alertEnabled: boolean;
    alertTriggered?: boolean;
    dayMoveAlertPct?: number;
    dayMoveAlertEnabled?: boolean;
    dayMoveAlertTriggered?: boolean;
    baselinePrice?: number;
    lastPrice?: number;
    changePct?: number;
}

const WatchlistScreen: React.FC<Props> = ({ navigation, route }) => {
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [selectedMarket, setSelectedMarket] = useState<Market>('US');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [pendingSymbol, setPendingSymbol] = useState('');
    const availableMarkets = useMemo<MarketInfo[]>(() => stockAPI.getAllMarkets(), []);
    const symbolKey = useMemo(
        () => watchlist.map((item) => item.symbol).sort().join(','),
        [watchlist]
    );

    // Load watchlist from AsyncStorage on mount
    useEffect(() => {
        (async () => {
            try {
                const stored = await AsyncStorage.getItem(WATCHLIST_STORAGE_KEY);
                if (stored) setWatchlist(JSON.parse(stored));
            } catch (_) { }
        })();        // Request notification permission once
        Notifications.requestPermissionsAsync().catch(() => { });
    }, []);

    // Persist watchlist whenever it changes (skip initial empty state)
    useEffect(() => {
        AsyncStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist)).catch(() => { });
    }, [watchlist]);

    useEffect(() => {
        const incomingSymbol = route?.params?.addSymbol?.trim?.().toUpperCase();
        if (!incomingSymbol) return;

        setWatchlist((prev) => {
            const exists = prev.some((item: WatchlistItem) => item.symbol === incomingSymbol);
            if (exists) return prev;
            return [
                ...prev,
                {
                    symbol: incomingSymbol,
                    alertDirection: 'above',
                    alertEnabled: false,
                    dayMoveAlertEnabled: false,
                },
            ];
        });
    }, [route?.params?.addSymbol]);

    const handleAddPress: () => void = () => {
        if (!pendingSymbol.trim()) {
            Alert.alert('Add Symbol', 'Enter a valid stock symbol.');
            return;
        }
        const upperSymbol = pendingSymbol.trim().toUpperCase();
        const exists = watchlist.some((item: WatchlistItem) => item.symbol === upperSymbol);
        if (!exists) {
            setWatchlist((prev) => [
                ...prev,
                {
                    symbol: upperSymbol,
                    alertDirection: 'above',
                    alertEnabled: false,
                    dayMoveAlertEnabled: false,
                },
            ]);
        }
        setPendingSymbol('');
    };

    const removeFromWatchlist = (symbol: string): void => {
        Alert.alert(
            'Remove from Watchlist',
            `Are you sure you want to remove ${symbol}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        setWatchlist((prev) => prev.filter(item => item.symbol !== symbol));
                    },
                },
            ]
        );
    };

    const navigateToStock = (symbol: string): void => {
        navigation.navigate('StockDetail', { symbol });
    };

    const formatCurrency = (value?: number) =>
        value === undefined ? '—' : `$${value.toFixed(2)}`;
    const formatPercent = (value?: number) =>
        value === undefined ? '—' : `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

    const getPerformancePct = (item: WatchlistItem) => {
        if (item.lastPrice === undefined || item.baselinePrice === undefined || item.baselinePrice === 0) {
            return undefined;
        }
        return ((item.lastPrice - item.baselinePrice) / item.baselinePrice) * 100;
    };

    const updateWatchItem = (symbol: string, updates: Partial<WatchlistItem>): void => {
        setWatchlist((prev) => prev.map((item) => (item.symbol === symbol ? { ...item, ...updates } : item)));
    };

    const refreshWatchlist = async (showLoader: boolean = true) => {
        if (!watchlist.length) return;
        try {
            if (showLoader) setRefreshing(true);
            const symbols = watchlist.map((item) => item.symbol);
            const data = await stockAPI.getMarketSummary(selectedMarket, symbols);
            const quoteMap = new Map(data.quotes.map((quote) => [quote.symbol.toUpperCase(), quote]));

            setWatchlist((prev) =>
                prev.map((item) => {
                    const quote = quoteMap.get(item.symbol.toUpperCase());
                    if (!quote) return item;
                    const baseline = item.baselinePrice ?? quote.price;
                    const priceAlertTriggered =
                        item.alertEnabled &&
                        item.alertPrice !== undefined &&
                        (item.alertDirection === 'above'
                            ? quote.price >= item.alertPrice
                            : quote.price <= item.alertPrice);
                    const dayMoveTriggered =
                        item.dayMoveAlertEnabled &&
                        item.dayMoveAlertPct !== undefined &&
                        Math.abs(quote.change_pct) >= item.dayMoveAlertPct;

                    // Fire local notification when alert first triggers
                    if (priceAlertTriggered && !item.alertTriggered) {
                        Notifications.scheduleNotificationAsync({
                            content: {
                                title: `Price Alert: ${item.symbol}`,
                                body: `${item.symbol} is ${item.alertDirection === 'above' ? 'above' : 'below'} $${item.alertPrice?.toFixed(2)} — now at $${quote.price.toFixed(2)}`,
                            },
                            trigger: null,
                        }).catch(() => { });
                    }
                    if (dayMoveTriggered && !item.dayMoveAlertTriggered) {
                        Notifications.scheduleNotificationAsync({
                            content: {
                                title: `Day Move Alert: ${item.symbol}`,
                                body: `${item.symbol} moved ${quote.change_pct >= 0 ? '+' : ''}${quote.change_pct.toFixed(2)}% today — triggered your ${item.dayMoveAlertPct}% alert.`,
                            },
                            trigger: null,
                        }).catch(() => { });
                    }

                    return {
                        ...item,
                        lastPrice: quote.price,
                        changePct: quote.change_pct,
                        baselinePrice: baseline,
                        alertTriggered: priceAlertTriggered || item.alertTriggered,
                        dayMoveAlertTriggered: dayMoveTriggered || item.dayMoveAlertTriggered,
                    };
                })
            );

            setLastUpdated(data.last_updated);
        } catch (error) {
            Alert.alert('Refresh Failed', 'Unable to refresh watchlist prices.');
        } finally {
            if (showLoader) setRefreshing(false);
        }
    };

    useEffect(() => {
        if (symbolKey) {
            refreshWatchlist();
        }
    }, [symbolKey, selectedMarket]);

    useEffect(() => {
        if (!autoRefresh || !symbolKey) return;
        const intervalId = setInterval(() => {
            refreshWatchlist(false);
        }, 300000);
        return () => clearInterval(intervalId);
    }, [autoRefresh, symbolKey, selectedMarket]);

    const performanceSummary = useMemo(() => {
        const withPerf = watchlist
            .map((item) => ({ item, perf: getPerformancePct(item) }))
            .filter((entry) => entry.perf !== undefined);
        if (!withPerf.length) return null;
        const avg =
            withPerf.reduce((sum, entry) => sum + (entry.perf ?? 0), 0) / withPerf.length;
        const best = withPerf.reduce((a, b) => (a.perf! >= b.perf! ? a : b));
        const worst = withPerf.reduce((a, b) => (a.perf! <= b.perf! ? a : b));
        return { avg, best, worst };
    }, [watchlist]);

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Watchlist</Text>
                <Text style={styles.headerSubtitle}>Price alerts, performance, and auto refresh</Text>
            </View>

            <View style={styles.marketSection}>
                <Text style={styles.sectionTitle}>Market Focus</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.marketScroller}>
                    {availableMarkets.map((market) => (
                        <TouchableOpacity
                            key={market.code}
                            style={[
                                styles.marketChip,
                                selectedMarket === market.code && styles.marketChipActive,
                            ]}
                            onPress={() => setSelectedMarket(market.code)}
                        >
                            <Text
                                style={[
                                    styles.marketChipText,
                                    selectedMarket === market.code && styles.marketChipTextActive,
                                ]}
                            >
                                {market.code}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Watchlist Controls</Text>
                    <TouchableOpacity style={styles.refreshButton} onPress={() => refreshWatchlist()}>
                        <Ionicons name="refresh" size={16} color="white" />
                        <Text style={styles.refreshButtonText}>Refresh</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.controlRow}>
                    <Text style={styles.controlLabel}>Auto Refresh (60s)</Text>
                    <Switch value={autoRefresh} onValueChange={setAutoRefresh} />
                </View>
                <View style={styles.controlRow}>
                    <Text style={styles.controlLabel}>Last Updated</Text>
                    <Text style={styles.controlValue}>{lastUpdated ?? '—'}</Text>
                </View>
                {refreshing && (
                    <View style={styles.inlineLoading}>
                        <ActivityIndicator size="small" color="#2563eb" />
                        <Text style={styles.inlineLoadingText}>Refreshing prices...</Text>
                    </View>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Add to Watchlist</Text>
                <View style={styles.addFormRow}>
                    <TextInput
                        style={styles.addInput}
                        placeholder="Symbol (e.g., AAPL)"
                        value={pendingSymbol}
                        onChangeText={setPendingSymbol}
                        autoCapitalize="characters"
                    />
                    <TouchableOpacity style={styles.addActionButton} onPress={handleAddPress}>
                        <Ionicons name="add" size={18} color="white" />
                        <Text style={styles.addActionText}>Add</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {performanceSummary && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Performance Snapshot</Text>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Average Move</Text>
                            <Text
                                style={performanceSummary.avg >= 0 ? styles.positiveValue : styles.negativeValue}
                            >
                                {formatPercent(performanceSummary.avg)}
                            </Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Best Performer</Text>
                            <Text style={styles.positiveValue}>
                                {performanceSummary.best.item.symbol} {formatPercent(performanceSummary.best.perf)}
                            </Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Worst Performer</Text>
                            <Text style={styles.negativeValue}>
                                {performanceSummary.worst.item.symbol} {formatPercent(performanceSummary.worst.perf)}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {watchlist.length > 0 ? (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Tracked Stocks</Text>
                    {watchlist.map((item) => (
                        <View key={item.symbol} style={styles.stockCard}>
                            <View style={styles.stockHeaderRow}>
                                <TouchableOpacity
                                    style={styles.stockInfo}
                                    onPress={() => navigateToStock(item.symbol)}
                                >
                                    <Text style={styles.stockSymbol}>{item.symbol}</Text>
                                    <Ionicons name="chevron-forward" size={20} color="#666" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => removeFromWatchlist(item.symbol)}
                                >
                                    <Ionicons name="close" size={20} color="#FF3B30" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.stockMetricsRow}>
                                <View style={styles.metricBlock}>
                                    <Text style={styles.metricLabel}>Price</Text>
                                    <Text style={styles.metricValue}>{formatCurrency(item.lastPrice)}</Text>
                                </View>
                                <View style={styles.metricBlock}>
                                    <Text style={styles.metricLabel}>Day Move</Text>
                                    <Text
                                        style={
                                            (item.changePct ?? 0) >= 0 ? styles.positiveValue : styles.negativeValue
                                        }
                                    >
                                        {formatPercent(item.changePct)}
                                    </Text>
                                </View>
                                <View style={styles.metricBlock}>
                                    <Text style={styles.metricLabel}>Since Added</Text>
                                    <Text
                                        style={
                                            (getPerformancePct(item) ?? 0) >= 0
                                                ? styles.positiveValue
                                                : styles.negativeValue
                                        }
                                    >
                                        {formatPercent(getPerformancePct(item))}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.alertSection}>
                                <View style={styles.alertHeaderRow}>
                                    <Text style={styles.alertTitle}>Price Alert</Text>
                                    <View style={styles.alertBadgeStack}>
                                        <View
                                            style={
                                                item.alertTriggered
                                                    ? styles.alertBadgeTriggered
                                                    : styles.alertBadge
                                            }
                                        >
                                            <Text
                                                style={
                                                    item.alertTriggered
                                                        ? styles.alertBadgeTextTriggered
                                                        : styles.alertBadgeText
                                                }
                                            >
                                                {item.alertTriggered ? 'Price Hit' : item.alertEnabled ? 'Price On' : 'Price Off'}
                                            </Text>
                                        </View>
                                        <View
                                            style={
                                                item.dayMoveAlertTriggered
                                                    ? styles.alertBadgeTriggered
                                                    : styles.alertBadge
                                            }
                                        >
                                            <Text
                                                style={
                                                    item.dayMoveAlertTriggered
                                                        ? styles.alertBadgeTextTriggered
                                                        : styles.alertBadgeText
                                                }
                                            >
                                                {item.dayMoveAlertTriggered
                                                    ? 'Move Hit'
                                                    : item.dayMoveAlertEnabled
                                                        ? 'Move On'
                                                        : 'Move Off'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.alertControlsRow}>
                                    <TextInput
                                        style={styles.alertInput}
                                        placeholder="Target price"
                                        value={item.alertPrice?.toString() ?? ''}
                                        onChangeText={(value) => {
                                            const parsed = Number(value);
                                            updateWatchItem(item.symbol, {
                                                alertPrice: Number.isFinite(parsed) ? parsed : undefined,
                                                alertTriggered: false,
                                            });
                                        }}
                                        keyboardType="decimal-pad"
                                    />
                                    <View style={styles.alertDirectionGroup}>
                                        <TouchableOpacity
                                            style={
                                                item.alertDirection === 'above'
                                                    ? styles.alertDirectionActive
                                                    : styles.alertDirectionButton
                                            }
                                            onPress={() =>
                                                updateWatchItem(item.symbol, {
                                                    alertDirection: 'above',
                                                    alertTriggered: false,
                                                })
                                            }
                                        >
                                            <Text
                                                style={
                                                    item.alertDirection === 'above'
                                                        ? styles.alertDirectionTextActive
                                                        : styles.alertDirectionText
                                                }
                                            >
                                                Above
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={
                                                item.alertDirection === 'below'
                                                    ? styles.alertDirectionActive
                                                    : styles.alertDirectionButton
                                            }
                                            onPress={() =>
                                                updateWatchItem(item.symbol, {
                                                    alertDirection: 'below',
                                                    alertTriggered: false,
                                                })
                                            }
                                        >
                                            <Text
                                                style={
                                                    item.alertDirection === 'below'
                                                        ? styles.alertDirectionTextActive
                                                        : styles.alertDirectionText
                                                }
                                            >
                                                Below
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.alertToggle}>
                                        <Switch
                                            value={item.alertEnabled}
                                            onValueChange={(value) =>
                                                updateWatchItem(item.symbol, {
                                                    alertEnabled: value,
                                                    alertTriggered: value ? item.alertTriggered : false,
                                                })
                                            }
                                        />
                                    </View>
                                </View>
                                <View style={styles.alertControlsRow}>
                                    <TextInput
                                        style={styles.alertInput}
                                        placeholder="Day move % (e.g., 5)"
                                        value={item.dayMoveAlertPct?.toString() ?? ''}
                                        onChangeText={(value) => {
                                            const parsed = Number(value);
                                            updateWatchItem(item.symbol, {
                                                dayMoveAlertPct: Number.isFinite(parsed) ? parsed : undefined,
                                                dayMoveAlertTriggered: false,
                                            });
                                        }}
                                        keyboardType="decimal-pad"
                                    />
                                    <View style={styles.alertToggle}>
                                        <Switch
                                            value={Boolean(item.dayMoveAlertEnabled)}
                                            onValueChange={(value) =>
                                                updateWatchItem(item.symbol, {
                                                    dayMoveAlertEnabled: value,
                                                    dayMoveAlertTriggered: value ? item.dayMoveAlertTriggered : false,
                                                })
                                            }
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            ) : (
                <View style={styles.emptyState}>
                    <Ionicons name="bookmark-outline" size={64} color="#cbd5e1" />
                    <Text style={styles.emptyTitle}>Nothing here yet</Text>
                    <Text style={styles.emptyDescription}>
                        Track your favourite stocks — monitor live prices and get notified when targets are hit.
                    </Text>
                    <TouchableOpacity
                        style={{ marginTop: 16, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                        onPress={() => navigation.navigate('Search')}
                    >
                        <Ionicons name="search" size={16} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Find a stock to add</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: 'white',
        padding: 24,
        paddingTop: 60,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#666',
    },
    marketSection: {
        marginHorizontal: 16,
        marginTop: 16,
    },
    marketScroller: {
        marginTop: 12,
    },
    marketChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: '#E5E7EB',
        marginRight: 10,
    },
    marketChipActive: {
        backgroundColor: '#1D4ED8',
    },
    marketChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },
    marketChipTextActive: {
        color: 'white',
    },
    addFormRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        marginRight: 10,
        backgroundColor: '#F9FAFB',
    },
    addActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2563eb',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
    },
    addActionText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 6,
    },
    section: {
        backgroundColor: 'white',
        margin: 16,
        marginTop: 0,
        padding: 20,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2563eb',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    refreshButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 6,
    },
    controlRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    controlLabel: {
        fontSize: 14,
        color: '#4B5563',
    },
    controlValue: {
        fontSize: 13,
        color: '#1F2937',
        fontWeight: '600',
    },
    inlineLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    inlineLoadingText: {
        marginLeft: 8,
        fontSize: 12,
        color: '#6B7280',
    },
    summaryCard: {
        backgroundColor: '#F9FAFB',
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 13,
        color: '#6B7280',
    },
    positiveValue: {
        color: '#16A34A',
        fontWeight: '600',
    },
    negativeValue: {
        color: '#DC2626',
        fontWeight: '600',
    },
    stockCard: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        backgroundColor: '#F9FAFB',
    },
    stockHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    stockInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    stockSymbol: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    stockMetricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 14,
    },
    metricBlock: {
        flex: 1,
        paddingRight: 8,
    },
    metricLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    metricValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
    },
    removeButton: {
        marginLeft: 16,
        padding: 8,
    },
    alertSection: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    alertHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    alertBadgeStack: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    alertTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    alertBadge: {
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    alertBadgeTriggered: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    alertBadgeText: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '600',
    },
    alertBadgeTextTriggered: {
        fontSize: 11,
        color: '#B91C1C',
        fontWeight: '600',
    },
    alertControlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    alertInput: {
        flex: 1,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 12,
        marginRight: 8,
    },
    alertDirectionGroup: {
        flexDirection: 'row',
        backgroundColor: '#E5E7EB',
        borderRadius: 8,
        padding: 2,
        marginRight: 8,
    },
    alertDirectionButton: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 6,
    },
    alertDirectionActive: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#111827',
    },
    alertDirectionText: {
        fontSize: 11,
        color: '#374151',
        fontWeight: '600',
    },
    alertDirectionTextActive: {
        fontSize: 11,
        color: 'white',
        fontWeight: '600',
    },
    alertToggle: {
        marginLeft: 'auto',
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
        margin: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
    },
});

export default WatchlistScreen;