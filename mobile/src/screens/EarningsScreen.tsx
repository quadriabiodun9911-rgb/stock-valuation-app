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

const fmt = (n: number | null | undefined): string => {
    if (n == null) return '—';
    const abs = Math.abs(n);
    if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
    return `$${n.toFixed(2)}`;
};

const EarningsScreen: React.FC<Props> = ({ route, navigation }) => {
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
            const result = await stockAPI.getEarningsAnalysis(symbol);
            setData(result);
        } catch (e: any) {
            setError(e.message || 'Failed to load earnings');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={['#065f46', '#10b981']} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{symbol} Earnings</Text>
                </LinearGradient>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#10b981" />
                    <Text style={styles.loadingText}>Loading earnings data...</Text>
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={['#065f46', '#10b981']} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{symbol} Earnings</Text>
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

    const stats = data?.stats ?? {};
    const quarters = data?.quarters ?? [];
    const annualEps = data?.annualEps ?? [];

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#065f46', '#10b981']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{symbol} Earnings</Text>
                <Text style={styles.headerSub}>{data?.companyName ?? ''}</Text>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* EPS Overview */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>EPS Overview</Text>
                    <View style={styles.epsRow}>
                        <View style={styles.epsBox}>
                            <Text style={styles.epsLabel}>Trailing EPS</Text>
                            <Text style={styles.epsValue}>
                                {data?.trailingEps != null ? `$${data.trailingEps.toFixed(2)}` : '—'}
                            </Text>
                        </View>
                        <View style={styles.epsBox}>
                            <Text style={styles.epsLabel}>Forward EPS</Text>
                            <Text style={styles.epsValue}>
                                {data?.forwardEps != null ? `$${data.forwardEps.toFixed(2)}` : '—'}
                            </Text>
                        </View>
                        <View style={styles.epsBox}>
                            <Text style={styles.epsLabel}>Trailing P/E</Text>
                            <Text style={styles.epsValue}>
                                {data?.trailingPE != null ? data.trailingPE.toFixed(1) : '—'}
                            </Text>
                        </View>
                        <View style={styles.epsBox}>
                            <Text style={styles.epsLabel}>Forward P/E</Text>
                            <Text style={styles.epsValue}>
                                {data?.forwardPE != null ? data.forwardPE.toFixed(1) : '—'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Beat Rate */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Beat / Miss Record</Text>
                    <View style={styles.beatRow}>
                        <View style={styles.beatCircle}>
                            <Text style={styles.beatPct}>
                                {stats.beatRate != null ? `${stats.beatRate}%` : '—'}
                            </Text>
                            <Text style={styles.beatLabel}>Beat Rate</Text>
                        </View>
                        <View style={styles.beatStats}>
                            <View style={styles.beatStat}>
                                <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                                <Text style={styles.beatStatText}>
                                    {stats.beats ?? 0} beats
                                </Text>
                            </View>
                            <View style={styles.beatStat}>
                                <Ionicons name="close-circle" size={20} color="#FF3B30" />
                                <Text style={styles.beatStatText}>
                                    {stats.misses ?? 0} misses
                                </Text>
                            </View>
                            <View style={styles.beatStat}>
                                <Ionicons name="stats-chart" size={20} color="#007AFF" />
                                <Text style={styles.beatStatText}>
                                    Avg surprise: {stats.avgSurprise != null ? `${stats.avgSurprise > 0 ? '+' : ''}${stats.avgSurprise}%` : '—'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Quarterly Earnings History */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Quarterly Earnings History</Text>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.cell, styles.cellWide]}>Quarter</Text>
                        <Text style={styles.cell}>Estimate</Text>
                        <Text style={styles.cell}>Actual</Text>
                        <Text style={styles.cell}>Surprise</Text>
                    </View>
                    {quarters.map((q: any, i: number) => (
                        <View
                            key={i}
                            style={[
                                styles.tableRow,
                                i % 2 === 0 && { backgroundColor: '#f9fafb' },
                            ]}
                        >
                            <Text style={[styles.cell, styles.cellWide]}>
                                {q.date?.substring(0, 10)}
                            </Text>
                            <Text style={styles.cell}>
                                {q.epsEstimate != null ? `$${q.epsEstimate.toFixed(2)}` : '—'}
                            </Text>
                            <Text style={styles.cell}>
                                {q.epsActual != null ? `$${q.epsActual.toFixed(2)}` : '—'}
                            </Text>
                            <View style={[styles.cell, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                                {q.beat != null && (
                                    <Ionicons
                                        name={q.beat ? 'caret-up' : 'caret-down'}
                                        size={14}
                                        color={q.beat ? '#34C759' : '#FF3B30'}
                                    />
                                )}
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: '600',
                                        color: q.beat ? '#34C759' : q.beat === false ? '#FF3B30' : '#999',
                                    }}
                                >
                                    {q.surprisePct != null
                                        ? `${q.surprisePct > 0 ? '+' : ''}${q.surprisePct.toFixed(1)}%`
                                        : '—'}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Annual EPS Trend */}
                {annualEps.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Annual EPS Trend</Text>
                        {annualEps.map((a: any, i: number) => {
                            const prev = annualEps[i + 1];
                            const growth =
                                prev?.eps && a.eps
                                    ? ((a.eps - prev.eps) / Math.abs(prev.eps)) * 100
                                    : null;
                            return (
                                <View
                                    key={i}
                                    style={[
                                        styles.annualRow,
                                        i % 2 === 0 && { backgroundColor: '#f9fafb' },
                                    ]}
                                >
                                    <Text style={styles.annualYear}>
                                        {a.date?.substring(0, 4)}
                                    </Text>
                                    <Text style={styles.annualEps}>
                                        {a.eps != null ? `$${a.eps.toFixed(2)}` : '—'}
                                    </Text>
                                    <Text style={styles.annualIncome}>
                                        {fmt(a.netIncome)}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.annualGrowth,
                                            {
                                                color:
                                                    growth == null
                                                        ? '#999'
                                                        : growth >= 0
                                                        ? '#34C759'
                                                        : '#FF3B30',
                                            },
                                        ]}
                                    >
                                        {growth != null
                                            ? `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`
                                            : '—'}
                                    </Text>
                                </View>
                            );
                        })}
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
    retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#10b981', borderRadius: 8 },
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
    epsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    epsBox: {
        flex: 1,
        minWidth: 70,
        backgroundColor: '#f0fdf4',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    epsLabel: { fontSize: 10, color: '#666', marginBottom: 4 },
    epsValue: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
    beatRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    beatCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#f0fdf4',
        borderWidth: 3,
        borderColor: '#34C759',
        justifyContent: 'center',
        alignItems: 'center',
    },
    beatPct: { fontSize: 20, fontWeight: '800', color: '#065f46' },
    beatLabel: { fontSize: 10, color: '#666' },
    beatStats: { flex: 1, gap: 8 },
    beatStat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    beatStatText: { fontSize: 13, color: '#555' },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    tableRow: { flexDirection: 'row', paddingVertical: 8 },
    cell: { flex: 1, fontSize: 12, color: '#555', textAlign: 'center' },
    cellWide: { flex: 1.5, textAlign: 'left', fontWeight: '500' },
    annualRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 4,
        alignItems: 'center',
    },
    annualYear: { width: 60, fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
    annualEps: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1a1a1a', textAlign: 'center' },
    annualIncome: { flex: 1, fontSize: 12, color: '#666', textAlign: 'center' },
    annualGrowth: { width: 70, fontSize: 12, fontWeight: '600', textAlign: 'right' },
});

export default EarningsScreen;
