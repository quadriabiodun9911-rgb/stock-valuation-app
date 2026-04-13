import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { stockAPI } from '../services/api';

interface Props { navigation: any; }

const EconomicDashboardScreen: React.FC<Props> = ({ navigation }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        try {
            setData(await stockAPI.getEconomicDashboard());
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };
    useEffect(() => { load(); }, []);

    if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
    if (!data) return <View style={s.center}><Text>Unable to load economic data</Text></View>;

    const healthColor = data.marketHealth?.status === 'Strong' ? '#16a34a'
        : data.marketHealth?.status === 'Stable' ? '#2563eb'
        : data.marketHealth?.status === 'Cautious' ? '#f59e0b' : '#dc2626';

    return (
        <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
            {/* Header */}
            <View style={[s.header, { backgroundColor: '#0f172a' }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Economic Dashboard</Text>
                <View style={[s.healthBadge, { backgroundColor: healthColor + '20' }]}>
                    <Text style={[s.healthText, { color: healthColor }]}>{data.marketHealth?.status}</Text>
                </View>
            </View>

            {/* Health Card */}
            <View style={[s.card, { borderLeftWidth: 4, borderLeftColor: healthColor }]}>
                <Text style={s.cardTitle}>Market Health</Text>
                <Text style={s.cardSub}>{data.marketHealth?.summary}</Text>
                <View style={s.row}>
                    <View style={s.statBox}>
                        <Text style={[s.statNum, { color: '#16a34a' }]}>{data.sectorCount?.up}</Text>
                        <Text style={s.statLabel}>Sectors Up</Text>
                    </View>
                    <View style={s.statBox}>
                        <Text style={[s.statNum, { color: '#dc2626' }]}>{data.sectorCount?.down}</Text>
                        <Text style={s.statLabel}>Sectors Down</Text>
                    </View>
                    <View style={s.statBox}>
                        <Text style={s.statNum}>{data.vix?.value ?? '—'}</Text>
                        <Text style={s.statLabel}>VIX</Text>
                    </View>
                </View>
            </View>

            {/* Market Indices */}
            <View style={s.card}>
                <Text style={s.cardTitle}>Market Indices</Text>
                {data.indices?.map((idx: any) => (
                    <View key={idx.name} style={s.indexRow}>
                        <Text style={s.indexName}>{idx.name}</Text>
                        <Text style={s.indexPrice}>{idx.price?.toLocaleString()}</Text>
                        <Text style={[s.pct, idx.changePct >= 0 ? s.green : s.red]}>
                            {idx.changePct >= 0 ? '+' : ''}{idx.changePct}%
                        </Text>
                        <Text style={[s.pctSmall, idx.ytdPct >= 0 ? s.green : s.red]}>
                            YTD {idx.ytdPct >= 0 ? '+' : ''}{idx.ytdPct}%
                        </Text>
                    </View>
                ))}
            </View>

            {/* Treasury & Volatility */}
            <View style={s.card}>
                <Text style={s.cardTitle}>Rates & Volatility</Text>
                <View style={s.row}>
                    {data.yields?.treasury10Y && (
                        <View style={s.rateBox}>
                            <Text style={s.rateLabel}>10Y Treasury</Text>
                            <Text style={s.rateVal}>{data.yields.treasury10Y.value}%</Text>
                            <Text style={[s.rateDelta, data.yields.treasury10Y.change >= 0 ? s.red : s.green]}>
                                {data.yields.treasury10Y.change >= 0 ? '+' : ''}{data.yields.treasury10Y.change}
                            </Text>
                        </View>
                    )}
                    {data.yields?.treasury2Y && (
                        <View style={s.rateBox}>
                            <Text style={s.rateLabel}>2Y Treasury</Text>
                            <Text style={s.rateVal}>{data.yields.treasury2Y.value}%</Text>
                            <Text style={[s.rateDelta, data.yields.treasury2Y.change >= 0 ? s.red : s.green]}>
                                {data.yields.treasury2Y.change >= 0 ? '+' : ''}{data.yields.treasury2Y.change}
                            </Text>
                        </View>
                    )}
                    {data.vix && (
                        <View style={s.rateBox}>
                            <Text style={s.rateLabel}>Fear Index</Text>
                            <Text style={s.rateVal}>{data.vix.value}</Text>
                            <Text style={[s.rateDelta, data.vix.change <= 0 ? s.green : s.red]}>
                                {data.vix.change >= 0 ? '+' : ''}{data.vix.change}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Sector Performance */}
            <View style={[s.card, { marginBottom: 40 }]}>
                <Text style={s.cardTitle}>Sector Performance</Text>
                <View style={s.sectorHeader}>
                    <Text style={[s.sectorCol, { flex: 2 }]}>Sector</Text>
                    <Text style={s.sectorCol}>Day</Text>
                    <Text style={s.sectorCol}>Month</Text>
                </View>
                {data.sectors?.map((sec: any) => (
                    <View key={sec.sector} style={s.sectorRow}>
                        <View style={{ flex: 2 }}>
                            <Text style={s.sectorName}>{sec.sector}</Text>
                            <Text style={s.sectorEtf}>{sec.etf}</Text>
                        </View>
                        <Text style={[s.sectorPct, sec.dayChangePct >= 0 ? s.green : s.red]}>
                            {sec.dayChangePct >= 0 ? '+' : ''}{sec.dayChangePct}%
                        </Text>
                        <Text style={[s.sectorPct, sec.monthChangePct >= 0 ? s.green : s.red]}>
                            {sec.monthChangePct >= 0 ? '+' : ''}{sec.monthChangePct}%
                        </Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
    back: { marginRight: 12 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', flex: 1 },
    healthBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    healthText: { fontSize: 13, fontWeight: '700' },
    card: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
    cardSub: { fontSize: 13, color: '#64748b', marginBottom: 12 },
    row: { flexDirection: 'row', justifyContent: 'space-around' },
    statBox: { alignItems: 'center' },
    statNum: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
    statLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    indexRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
    indexName: { flex: 1.5, fontSize: 14, fontWeight: '600', color: '#0f172a' },
    indexPrice: { flex: 1, fontSize: 14, color: '#0f172a', textAlign: 'right' },
    pct: { flex: 0.8, fontSize: 13, fontWeight: '600', textAlign: 'right' },
    pctSmall: { flex: 0.8, fontSize: 11, textAlign: 'right' },
    green: { color: '#16a34a' },
    red: { color: '#dc2626' },
    rateBox: { alignItems: 'center', flex: 1 },
    rateLabel: { fontSize: 11, color: '#94a3b8', marginBottom: 4 },
    rateVal: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
    rateDelta: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    sectorHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    sectorCol: { flex: 1, fontSize: 11, color: '#94a3b8', fontWeight: '600', textAlign: 'right' },
    sectorRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
    sectorName: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
    sectorEtf: { fontSize: 11, color: '#94a3b8' },
    sectorPct: { flex: 1, fontSize: 13, fontWeight: '600', textAlign: 'right' },
});

export default EconomicDashboardScreen;
