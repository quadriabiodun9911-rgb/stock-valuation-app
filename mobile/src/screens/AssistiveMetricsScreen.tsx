import React, { useEffect, useState } from 'react';
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
import {
    AssistiveDashboardMetricsResponse,
    AssistiveMetricsResponse,
    stockAPI,
} from '../services/api';

const AssistiveMetricsScreen = ({ navigation }: any) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [days, setDays] = useState<7 | 30 | 90>(30);
    const [metrics, setMetrics] = useState<AssistiveMetricsResponse | null>(null);
    const [dashboard, setDashboard] = useState<AssistiveDashboardMetricsResponse | null>(null);

    const load = async (windowDays: 7 | 30 | 90 = days) => {
        try {
            setLoading(true);
            const [base, grouped] = await Promise.all([
                stockAPI.getAssistiveMetrics(),
                stockAPI.getAssistiveDashboardMetrics(windowDays),
            ]);
            setMetrics(base);
            setDashboard(grouped);
        } catch (err) {
            console.error('Error loading assistive metrics:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const onChangeWindow = async (windowDays: 7 | 30 | 90) => {
        setDays(windowDays);
        await load(windowDays);
    };

    if (loading && !metrics) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Loading Assistive metrics...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.title}>Assistive Metrics</Text>
            </View>

            <View style={styles.cardRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Feedback</Text>
                    <Text style={styles.statValue}>{metrics?.total_feedback ?? 0}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Helpfulness</Text>
                    <Text style={styles.statValue}>{(metrics?.helpfulness_rate ?? 0).toFixed(1)}%</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Events</Text>
                    <Text style={styles.statValue}>{metrics?.total_events ?? 0}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Window</Text>
                <View style={styles.windowButtons}>
                    {[7, 30, 90].map((w) => (
                        <TouchableOpacity
                            key={w}
                            style={[styles.windowButton, days === w && styles.windowButtonActive]}
                            onPress={() => onChangeWindow(w as 7 | 30 | 90)}
                        >
                            <Text style={[styles.windowButtonText, days === w && styles.windowButtonTextActive]}>
                                {w}d
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Feedback by Symbol</Text>
                {(dashboard?.feedback_by_symbol ?? []).slice(0, 8).map((item, idx) => (
                    <View style={styles.row} key={`fbs-${idx}`}>
                        <Text style={styles.rowLabel}>{item.symbol}</Text>
                        <Text style={styles.rowValue}>{item.helpful}/{item.total} helpful</Text>
                    </View>
                ))}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Events by Symbol</Text>
                {(dashboard?.events_by_symbol ?? []).slice(0, 8).map((item, idx) => (
                    <View style={styles.row} key={`ebs-${idx}`}>
                        <Text style={styles.rowLabel}>{item.symbol}</Text>
                        <Text style={styles.rowValue}>{item.total}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Daily Activity</Text>
                {(dashboard?.events_by_day ?? []).slice(0, 10).map((item, idx) => (
                    <View style={styles.row} key={`day-${idx}`}>
                        <Text style={styles.rowLabel}>{item.day}</Text>
                        <Text style={styles.rowValue}>{item.total} events</Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: '#64748b' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 56 },
    backBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
    cardRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 8 },
    statCard: {
        flex: 1,
        backgroundColor: '#ffffff',
        margin: 4,
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    statLabel: { color: '#64748b', fontSize: 12 },
    statValue: { color: '#0f172a', fontSize: 18, fontWeight: '800', marginTop: 4 },
    section: {
        backgroundColor: '#ffffff',
        borderRadius: 10,
        margin: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 7,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#e2e8f0',
    },
    rowLabel: { color: '#334155', fontSize: 13 },
    rowValue: { color: '#0f172a', fontSize: 13, fontWeight: '600' },
    windowButtons: { flexDirection: 'row', gap: 8 },
    windowButton: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    windowButtonActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
    windowButtonText: { color: '#334155', fontWeight: '700' },
    windowButtonTextActive: { color: '#ffffff' },
});

export default AssistiveMetricsScreen;
