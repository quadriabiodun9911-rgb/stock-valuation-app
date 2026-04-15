import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../services/api';

interface OHLCPoint {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface IndicatorPoint {
    date: string;
    value: number;
}

interface ChartData {
    symbol: string;
    period: string;
    ohlc_data: OHLCPoint[];
    sma_20?: IndicatorPoint[];
    sma_50?: IndicatorPoint[];
    rsi?: IndicatorPoint[];
    macd?: IndicatorPoint[];
}

const PERIODS = ['1m', '3m', '6m', '1y', '2y', '5y'];

interface Props {
    route?: any;
    navigation?: any;
}

const EnhancedChartingScreen: React.FC<Props> = ({ route, navigation }) => {
    const [symbol, setSymbol] = useState(route?.params?.symbol ? String(route.params.symbol).toUpperCase() : 'AAPL');
    const [period, setPeriod] = useState('1y');
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeIndicator, setActiveIndicator] = useState<'price' | 'rsi' | 'macd'>('price');

    const loadChart = async (symbolOverride?: string) => {
        const trimmed = (symbolOverride || symbol).trim().toUpperCase();
        if (!trimmed) return;
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/charts/ohlc/${trimmed}?period=${period}`);
            const data = await res.json();
            setChartData(data);

            // Also load technical indicators
            try {
                const indRes = await fetch(`${API_URL}/api/charts/technical-indicators/${trimmed}?period=${period}`);
                const indData = await indRes.json();
                setChartData((prev) => prev ? { ...prev, ...indData } : prev);
            } catch { /* optional */ }
        } catch (error) {
            console.error('Failed to load chart:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const incomingSymbol = route?.params?.symbol;
        if (incomingSymbol) {
            const preset = String(incomingSymbol).toUpperCase();
            setSymbol(preset);
            loadChart(preset);
        }
    }, [route?.params?.symbol]);

    const handleLoadChart = () => {
        loadChart();
    };

    const formatPrice = (n: number) => `$${n.toFixed(2)}`;
    const screenWidth = Dimensions.get('window').width;

    const latestOHLC = chartData?.ohlc_data?.[chartData.ohlc_data.length - 1];
    const firstOHLC = chartData?.ohlc_data?.[0];
    const priceChange = latestOHLC && firstOHLC ? latestOHLC.close - firstOHLC.close : 0;
    const priceChangePct = firstOHLC && firstOHLC.close > 0 ? (priceChange / firstOHLC.close) * 100 : 0;

    // Simple price range for mini-chart visualization
    const prices = chartData?.ohlc_data?.map((d) => d.close) ?? [];
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 1;
    const priceRange = maxPrice - minPrice || 1;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    {navigation?.canGoBack?.() ? (
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={22} color="#1e293b" />
                        </TouchableOpacity>
                    ) : null}
                    <View>
                        <Text style={styles.headerTitle}>Enhanced Charts</Text>
                        <Text style={styles.headerSubtitle}>Analyze price action for {symbol || 'your stock'}</Text>
                    </View>
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchRow}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Symbol (e.g. AAPL)"
                    value={symbol}
                    onChangeText={setSymbol}
                    autoCapitalize="characters"
                    onSubmitEditing={handleLoadChart}
                />
                <TouchableOpacity style={styles.searchBtn} onPress={handleLoadChart}>
                    <Ionicons name="analytics" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Period Selector */}
            <View style={styles.periodRow}>
                {PERIODS.map((p) => (
                    <TouchableOpacity
                        key={p}
                        style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                        onPress={() => { setPeriod(p); }}
                    >
                        <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p.toUpperCase()}</Text>
                    </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.goBtn} onPress={handleLoadChart}>
                    <Text style={styles.goBtnText}>Go</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : chartData ? (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Price summary */}
                    <View style={styles.priceCard}>
                        <Text style={styles.priceSymbol}>{chartData.symbol}</Text>
                        <Text style={styles.priceValue}>{latestOHLC ? formatPrice(latestOHLC.close) : '—'}</Text>
                        <Text style={[styles.priceChange, priceChange >= 0 ? styles.positive : styles.negative]}>
                            {priceChange >= 0 ? '+' : ''}{formatPrice(priceChange)} ({priceChangePct.toFixed(2)}%)
                        </Text>
                    </View>

                    {/* Mini price bar chart */}
                    <View style={styles.chartContainer}>
                        <Text style={styles.sectionTitle}>Price History ({chartData.period})</Text>
                        <View style={styles.barsContainer}>
                            {prices.slice(-60).map((price, idx) => {
                                const height = ((price - minPrice) / priceRange) * 100;
                                return (
                                    <View
                                        key={idx}
                                        style={[
                                            styles.bar,
                                            {
                                                height: `${Math.max(2, height)}%`,
                                                backgroundColor: price >= (prices.slice(-60)[idx - 1] ?? price) ? '#22c55e' : '#ef4444',
                                                width: Math.max(2, (screenWidth - 64) / 60 - 1),
                                            },
                                        ]}
                                    />
                                );
                            })}
                        </View>
                        <View style={styles.priceRangeRow}>
                            <Text style={styles.priceRangeText}>Low: {formatPrice(minPrice)}</Text>
                            <Text style={styles.priceRangeText}>High: {formatPrice(maxPrice)}</Text>
                        </View>
                    </View>

                    {/* Indicator Tabs */}
                    <View style={styles.indicatorTabs}>
                        {(['price', 'rsi', 'macd'] as const).map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.indTab, activeIndicator === tab && styles.indTabActive]}
                                onPress={() => setActiveIndicator(tab)}
                            >
                                <Text style={[styles.indTabText, activeIndicator === tab && styles.indTabTextActive]}>
                                    {tab.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* OHLC Data Table (latest 10 days) */}
                    <View style={styles.tableContainer}>
                        <Text style={styles.sectionTitle}>Recent OHLC Data</Text>
                        <View style={styles.tableHeader}>
                            <Text style={styles.th}>Date</Text>
                            <Text style={styles.th}>Open</Text>
                            <Text style={styles.th}>High</Text>
                            <Text style={styles.th}>Low</Text>
                            <Text style={styles.th}>Close</Text>
                        </View>
                        {chartData.ohlc_data.slice(-10).reverse().map((row, idx) => (
                            <View key={idx} style={styles.tableRow}>
                                <Text style={styles.td}>{row.date.slice(0, 10)}</Text>
                                <Text style={styles.td}>{row.open.toFixed(2)}</Text>
                                <Text style={styles.td}>{row.high.toFixed(2)}</Text>
                                <Text style={styles.td}>{row.low.toFixed(2)}</Text>
                                <Text style={styles.td}>{row.close.toFixed(2)}</Text>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            ) : (
                <View style={styles.emptyState}>
                    <Ionicons name="bar-chart-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>Enter a symbol and tap Go to load charts.</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 16, paddingTop: 50, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { marginRight: 10 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
    headerSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
    searchRow: { flexDirection: 'row', padding: 12, backgroundColor: '#fff' },
    searchInput: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, marginRight: 8 },
    searchBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
    periodRow: { flexDirection: 'row', padding: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', alignItems: 'center' },
    periodBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginHorizontal: 2 },
    periodBtnActive: { backgroundColor: '#2563eb' },
    periodText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
    periodTextActive: { color: '#fff' },
    goBtn: { backgroundColor: '#22c55e', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, marginLeft: 'auto' },
    goBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    scrollContent: { padding: 16 },
    priceCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, alignItems: 'center' },
    priceSymbol: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
    priceValue: { fontSize: 32, fontWeight: '700', color: '#1e293b', marginTop: 4 },
    priceChange: { fontSize: 15, fontWeight: '600', marginTop: 4 },
    positive: { color: '#22c55e' },
    negative: { color: '#ef4444' },
    chartContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
    barsContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 120, marginBottom: 8 },
    bar: { borderRadius: 1, marginRight: 1 },
    priceRangeRow: { flexDirection: 'row', justifyContent: 'space-between' },
    priceRangeText: { fontSize: 12, color: '#94a3b8' },
    indicatorTabs: { flexDirection: 'row', marginBottom: 12 },
    indTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, marginHorizontal: 2, backgroundColor: '#e2e8f0' },
    indTabActive: { backgroundColor: '#2563eb' },
    indTabText: { fontWeight: '600', color: '#64748b' },
    indTabTextActive: { color: '#fff' },
    tableContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
    tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 8, marginBottom: 8 },
    th: { flex: 1, fontSize: 12, fontWeight: '700', color: '#64748b', textAlign: 'center' },
    tableRow: { flexDirection: 'row', paddingVertical: 6 },
    td: { flex: 1, fontSize: 12, color: '#1e293b', textAlign: 'center' },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { marginTop: 12, color: '#94a3b8', fontSize: 15 },
});

export default EnhancedChartingScreen;
