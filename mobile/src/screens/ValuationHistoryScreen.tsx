import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { stockAPI } from '../services/api';

interface Props {
    route: any;
    navigation: any;
}

const MULTIPLE_COLORS: Record<string, string> = {
    pe: '#3b82f6',
    pb: '#10b981',
    ps: '#f59e0b',
    evEbitda: '#8b5cf6',
};

const MULTIPLE_LABELS: Record<string, string> = {
    pe: 'P/E Ratio',
    pb: 'Price / Book',
    ps: 'Price / Sales',
    evEbitda: 'EV / EBITDA',
};

const verdictColor = (v: string | undefined): string => {
    if (!v) return '#666';
    if (v.includes('undervalued')) return '#34C759';
    if (v.includes('overvalued')) return '#FF3B30';
    return '#f59e0b';
};

const verdictIcon = (v: string | undefined): string => {
    if (!v) return 'help-circle';
    if (v.includes('undervalued')) return 'trending-down';
    if (v.includes('overvalued')) return 'trending-up';
    return 'remove';
};

const ValuationHistoryScreen: React.FC<Props> = ({ route, navigation }) => {
    const { symbol } = route.params;
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await stockAPI.getValuationHistory(symbol);
            setData(result);
        } catch (e: any) {
            setError(e.message || 'Failed to load valuation data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={['#4c1d95', '#8b5cf6']} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{symbol} Valuation</Text>
                </LinearGradient>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#8b5cf6" />
                    <Text style={styles.loadingText}>Analyzing valuation history...</Text>
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={['#4c1d95', '#8b5cf6']} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{symbol} Valuation</Text>
                </LinearGradient>
                <View style={styles.center}>
                    <Ionicons name="alert-circle" size={48} color="#FF3B30" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const current = data?.current ?? {};
    const ranges = data?.ranges ?? {};
    const verdicts = data?.verdicts ?? {};
    const multiples = Object.keys(MULTIPLE_LABELS).filter((k) => current[k] != null);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#4c1d95', '#8b5cf6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{symbol} Valuation History</Text>
                <Text style={styles.headerSub}>
                    {data?.companyName ?? ''} — 5-year analysis
                </Text>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Current Multiples */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Current Multiples</Text>
                    <View style={styles.multiplesGrid}>
                        {multiples.map((key) => (
                            <View key={key} style={styles.multipleBox}>
                                <View
                                    style={[styles.multipleIndicator, { backgroundColor: MULTIPLE_COLORS[key] }]}
                                />
                                <Text style={styles.multipleLabel}>{MULTIPLE_LABELS[key]}</Text>
                                <Text style={styles.multipleValue}>{current[key]?.toFixed(1)}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Range Bars */}
                {multiples.map((key) => {
                    const r = ranges[key];
                    if (!r) return null;
                    const min = r.min ?? 0;
                    const max = r.max ?? 100;
                    const avg = r.avg ?? 0;
                    const cur = current[key] ?? 0;
                    const range = max - min || 1;
                    const curPos = Math.max(0, Math.min(1, (cur - min) / range));
                    const avgPos = Math.max(0, Math.min(1, (avg - min) / range));
                    const verdict = verdicts[key];

                    return (
                        <View key={key} style={styles.card}>
                            <View style={styles.rangeHeader}>
                                <View
                                    style={[styles.multipleIndicator, { backgroundColor: MULTIPLE_COLORS[key] }]}
                                />
                                <Text style={styles.sectionTitle}>{MULTIPLE_LABELS[key]}</Text>
                            </View>

                            {/* Range bar */}
                            <View style={styles.rangeContainer}>
                                <View style={styles.rangeBar}>
                                    {/* Average marker */}
                                    <View style={[styles.avgMarker, { left: `${avgPos * 100}%` }]}>
                                        <View style={styles.avgLine} />
                                        <Text style={styles.avgLabel}>avg</Text>
                                    </View>
                                    {/* Current position */}
                                    <View
                                        style={[
                                            styles.currentDot,
                                            {
                                                left: `${curPos * 100}%`,
                                                backgroundColor: MULTIPLE_COLORS[key],
                                            },
                                        ]}
                                    />
                                </View>
                                <View style={styles.rangeLabels}>
                                    <Text style={styles.rangeValue}>{min.toFixed(1)}</Text>
                                    <Text style={[styles.rangeValue, { color: MULTIPLE_COLORS[key], fontWeight: '700' }]}>
                                        {cur.toFixed(1)}
                                    </Text>
                                    <Text style={styles.rangeValue}>{max.toFixed(1)}</Text>
                                </View>
                            </View>

                            {/* Stats row */}
                            <View style={styles.statsRow}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Min</Text>
                                    <Text style={styles.statValue}>{min.toFixed(1)}</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Avg</Text>
                                    <Text style={styles.statValue}>{avg.toFixed(1)}</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Median</Text>
                                    <Text style={styles.statValue}>{(r.median ?? 0).toFixed(1)}</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Max</Text>
                                    <Text style={styles.statValue}>{max.toFixed(1)}</Text>
                                </View>
                            </View>

                            {/* Verdict */}
                            {verdict && (
                                <View
                                    style={[
                                        styles.verdictBanner,
                                        { backgroundColor: verdictColor(verdict) + '15' },
                                    ]}
                                >
                                    <Ionicons
                                        name={verdictIcon(verdict) as any}
                                        size={18}
                                        color={verdictColor(verdict)}
                                    />
                                    <Text style={[styles.verdictText, { color: verdictColor(verdict) }]}>
                                        {verdict}
                                    </Text>
                                </View>
                            )}
                        </View>
                    );
                })}

                {/* Historical Data */}
                {data?.historical?.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Annual Snapshot</Text>
                        <View style={styles.histHeader}>
                            <Text style={[styles.histCell, { flex: 1.2 }]}>Year</Text>
                            {multiples.map((k) => (
                                <Text key={k} style={styles.histCell}>
                                    {MULTIPLE_LABELS[k].replace('Price / ', 'P/').replace('EV / ', '')}
                                </Text>
                            ))}
                        </View>
                        {data.historical.map((row: any, i: number) => (
                            <View
                                key={i}
                                style={[styles.histRow, i % 2 === 0 && { backgroundColor: '#faf5ff' }]}
                            >
                                <Text style={[styles.histCell, { flex: 1.2, fontWeight: '600' }]}>
                                    {row.date?.substring(0, 4)}
                                </Text>
                                {multiples.map((k) => (
                                    <Text key={k} style={styles.histCell}>
                                        {row[k] != null ? row[k].toFixed(1) : '—'}
                                    </Text>
                                ))}
                            </View>
                        ))}
                    </View>
                )}

                <View style={{ height: 30 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: { paddingHorizontal: 16, paddingVertical: 16, paddingTop: 50 },
    backBtn: { marginBottom: 8 },
    headerTitle: { fontSize: 22, fontWeight: '700', color: 'white' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    loadingText: { marginTop: 12, color: '#666', fontSize: 14 },
    errorText: { marginTop: 12, color: '#FF3B30', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
    retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#8b5cf6', borderRadius: 8 },
    retryText: { color: 'white', fontWeight: '600' },
    card: {
        margin: 16,
        marginBottom: 0,
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
    multiplesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    multipleBox: {
        flex: 1,
        minWidth: 70,
        backgroundColor: '#faf5ff',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    multipleIndicator: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
    multipleLabel: { fontSize: 10, color: '#666', marginBottom: 2 },
    multipleValue: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
    rangeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    rangeContainer: { marginBottom: 12 },
    rangeBar: {
        height: 12,
        backgroundColor: '#e5e7eb',
        borderRadius: 6,
        position: 'relative',
        marginBottom: 6,
    },
    currentDot: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        top: -4,
        marginLeft: -10,
        borderWidth: 3,
        borderColor: 'white',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },
    avgMarker: { position: 'absolute', top: -6, marginLeft: -1 },
    avgLine: { width: 2, height: 24, backgroundColor: '#9ca3af' },
    avgLabel: { fontSize: 9, color: '#9ca3af', textAlign: 'center', marginTop: 2 },
    rangeLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rangeValue: { fontSize: 11, color: '#999' },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    statBox: {
        flex: 1,
        backgroundColor: '#f9fafb',
        padding: 8,
        borderRadius: 6,
        alignItems: 'center',
    },
    statLabel: { fontSize: 10, color: '#999' },
    statValue: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginTop: 2 },
    verdictBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    verdictText: { fontSize: 13, fontWeight: '600' },
    histHeader: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    histRow: { flexDirection: 'row', paddingVertical: 8 },
    histCell: { flex: 1, fontSize: 12, color: '#555', textAlign: 'center' },
});

export default ValuationHistoryScreen;
