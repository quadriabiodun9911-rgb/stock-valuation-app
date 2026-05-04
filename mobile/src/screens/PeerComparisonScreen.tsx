import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { stockAPI } from '../services/api';

interface Props {
    route: any;
    navigation: any;
}

const pctFmt = (v: number | null | undefined): string => {
    if (v == null || isNaN(v)) return '—';
    return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;
};

const numFmt = (v: number | null | undefined): string => {
    if (v == null || isNaN(v)) return '—';
    return v.toFixed(2);
};

const bigFmt = (v: number | null | undefined): string => {
    if (v == null || isNaN(v)) return '—';
    const abs = Math.abs(v);
    if (abs >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
    if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
    return `$${v.toFixed(0)}`;
};

const METRICS: { key: string; label: string; fmt: (v: any) => string; section: string }[] = [
    { key: 'price', label: 'Price', fmt: (v) => (v != null ? `$${v.toFixed(2)}` : '—'), section: 'Overview' },
    { key: 'marketCap', label: 'Market Cap', fmt: bigFmt, section: 'Overview' },
    { key: 'pe', label: 'P/E', fmt: numFmt, section: 'Valuation' },
    { key: 'forwardPE', label: 'Forward P/E', fmt: numFmt, section: 'Valuation' },
    { key: 'pb', label: 'P/B', fmt: numFmt, section: 'Valuation' },
    { key: 'ps', label: 'P/S', fmt: numFmt, section: 'Valuation' },
    { key: 'evEbitda', label: 'EV/EBITDA', fmt: numFmt, section: 'Valuation' },
    { key: 'dividendYield', label: 'Div Yield', fmt: pctFmt, section: 'Overview' },
    { key: 'beta', label: 'Beta', fmt: numFmt, section: 'Overview' },
    { key: 'grossMargin', label: 'Gross Margin', fmt: pctFmt, section: 'Profitability' },
    { key: 'operatingMargin', label: 'Op Margin', fmt: pctFmt, section: 'Profitability' },
    { key: 'netMargin', label: 'Net Margin', fmt: pctFmt, section: 'Profitability' },
    { key: 'roe', label: 'ROE', fmt: pctFmt, section: 'Profitability' },
    { key: 'roa', label: 'ROA', fmt: pctFmt, section: 'Profitability' },
    { key: 'revenue', label: 'Revenue', fmt: bigFmt, section: 'Financials' },
    { key: 'netIncome', label: 'Net Income', fmt: bigFmt, section: 'Financials' },
    { key: 'fcf', label: 'Free Cash Flow', fmt: bigFmt, section: 'Financials' },
    { key: 'fcfMargin', label: 'FCF Margin', fmt: pctFmt, section: 'Financials' },
    { key: 'debtEquity', label: 'Debt / Equity', fmt: numFmt, section: 'Health' },
    { key: 'currentRatio', label: 'Current Ratio', fmt: numFmt, section: 'Health' },
    { key: 'revenueGrowth', label: 'Rev Growth', fmt: pctFmt, section: 'Growth' },
    { key: 'earningsGrowth', label: 'Earn Growth', fmt: pctFmt, section: 'Growth' },
];

const PeerComparisonScreen: React.FC<Props> = ({ route, navigation }) => {
    const { symbol } = route.params;
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [customPeers, setCustomPeers] = useState('');
    const [showInput, setShowInput] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async (peers?: string) => {
        setLoading(true);
        setError(null);
        try {
            const result = await stockAPI.getPeerComparison(symbol, peers);
            setData(result);
        } catch (e: any) {
            setError(e.message || 'Failed to load peer data');
        } finally {
            setLoading(false);
        }
    };

    const onSubmitPeers = () => {
        const trimmed = customPeers.trim();
        if (trimmed) {
            loadData(trimmed);
            setShowInput(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={['#1e3a5f', '#3b82f6']} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{symbol} vs Peers</Text>
                </LinearGradient>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>Fetching peer data...</Text>
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={['#1e3a5f', '#3b82f6']} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{symbol} vs Peers</Text>
                </LinearGradient>
                <View style={styles.center}>
                    <Ionicons name="alert-circle" size={48} color="#FF3B30" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const companies = data?.companies ?? [];
    const sectorAvg = data?.sectorAverage ?? {};
    const sections = [...new Set(METRICS.map((m) => m.section))];

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#1e3a5f', '#3b82f6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{symbol} vs Peers</Text>
                <Text style={styles.headerSub}>
                    {data?.peerCount ?? 0} peers compared
                </Text>
            </LinearGradient>

            {/* Custom peers toggle */}
            <View style={styles.peerBar}>
                <TouchableOpacity
                    style={styles.customBtn}
                    onPress={() => setShowInput(!showInput)}
                >
                    <Ionicons name="people" size={16} color="#3b82f6" />
                    <Text style={styles.customBtnText}>Custom Peers</Text>
                </TouchableOpacity>
                {showInput && (
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. MSFT,GOOG,META"
                            value={customPeers}
                            onChangeText={setCustomPeers}
                            autoCapitalize="characters"
                        />
                        <TouchableOpacity style={styles.goBtn} onPress={onSubmitPeers}>
                            <Text style={styles.goBtnText}>Go</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Column headers */}
                    <View style={styles.tableHeaderRow}>
                        <View style={[styles.metricCol, styles.headerCell]}>
                            <Text style={styles.headerLabel}>Metric</Text>
                        </View>
                        {companies.map((c: any, i: number) => (
                            <View
                                key={i}
                                style={[
                                    styles.dataCol,
                                    styles.headerCell,
                                    c.symbol === symbol && styles.targetCol,
                                ]}
                            >
                                <Text style={[styles.headerTicker, c.symbol === symbol && { color: '#3b82f6' }]}>
                                    {c.symbol}
                                </Text>
                                <Text style={styles.headerName} numberOfLines={1}>
                                    {c.name}
                                </Text>
                            </View>
                        ))}
                        <View style={[styles.dataCol, styles.headerCell, { backgroundColor: '#eff6ff' }]}>
                            <Text style={[styles.headerTicker, { color: '#6366f1' }]}>AVG</Text>
                            <Text style={styles.headerName}>Sector</Text>
                        </View>
                    </View>

                    {/* Sections & rows */}
                    {sections.map((section) => (
                        <View key={section}>
                            <View style={styles.sectionRow}>
                                <Text style={styles.sectionLabel}>{section}</Text>
                            </View>
                            {METRICS.filter((m) => m.section === section).map((metric) => (
                                <View key={metric.key} style={styles.dataRow}>
                                    <View style={styles.metricCol}>
                                        <Text style={styles.metricLabel}>{metric.label}</Text>
                                    </View>
                                    {companies.map((c: any, ci: number) => (
                                        <View
                                            key={ci}
                                            style={[
                                                styles.dataCol,
                                                c.symbol === symbol && styles.targetColBody,
                                            ]}
                                        >
                                            <Text style={styles.dataValue}>
                                                {metric.fmt(c[metric.key])}
                                            </Text>
                                        </View>
                                    ))}
                                    <View style={[styles.dataCol, { backgroundColor: '#fafbff' }]}>
                                        <Text style={[styles.dataValue, { color: '#6366f1' }]}>
                                            {metric.fmt(sectorAvg[metric.key])}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ))}

                    <View style={{ height: 30 }} />
                </ScrollView>
            </ScrollView>
        </View>
    );
};

const COL_WIDTH = 100;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: { paddingHorizontal: 16, paddingVertical: 16, paddingTop: 50 },
    backBtn: { marginBottom: 8 },
    headerTitle: { fontSize: 22, fontWeight: '700', color: 'white' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    loadingText: { marginTop: 12, color: '#666', fontSize: 14 },
    errorText: { marginTop: 12, color: '#FF3B30', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
    retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#3b82f6', borderRadius: 8 },
    retryText: { color: 'white', fontWeight: '600' },
    peerBar: { padding: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    customBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    customBtnText: { fontSize: 13, color: '#3b82f6', fontWeight: '600' },
    inputRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 14,
    },
    goBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#3b82f6', borderRadius: 8, justifyContent: 'center' },
    goBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },
    tableHeaderRow: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#d1d5db' },
    headerCell: { paddingVertical: 10, paddingHorizontal: 6 },
    headerTicker: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
    headerName: { fontSize: 10, color: '#999', marginTop: 2 },
    headerLabel: { fontSize: 12, fontWeight: '600', color: '#666' },
    metricCol: { width: 110, paddingHorizontal: 8, justifyContent: 'center' },
    dataCol: { width: COL_WIDTH, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    targetCol: { backgroundColor: '#eff6ff', borderBottomWidth: 2, borderBottomColor: '#3b82f6' },
    targetColBody: { backgroundColor: '#f0f7ff' },
    sectionRow: {
        paddingVertical: 6,
        paddingHorizontal: 8,
        backgroundColor: '#f3f4f6',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' },
    dataRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingVertical: 6 },
    metricLabel: { fontSize: 12, color: '#555' },
    dataValue: { fontSize: 12, fontWeight: '500', color: '#1a1a1a' },
});

export default PeerComparisonScreen;
