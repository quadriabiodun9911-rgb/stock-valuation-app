import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { stockAPI } from '../services/api';

interface Props { route: any; navigation: any; }

const fmt = (n: number) => {
    if (!n) return '$0';
    if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    return `$${n.toLocaleString()}`;
};

const EconomicImpactScreen: React.FC<Props> = ({ route, navigation }) => {
    const { symbol } = route.params;
    const [impact, setImpact] = useState<any>(null);
    const [newsImpact, setNewsImpact] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'macro' | 'news'>('macro');
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        try {
            const [imp, news] = await Promise.all([
                stockAPI.getEconomicImpact(symbol),
                stockAPI.getNewsImpact(symbol),
            ]);
            setImpact(imp);
            setNewsImpact(news);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };
    useEffect(() => { load(); }, [symbol]);

    if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    const signalColor = (sig: string) => sig === 'positive' ? '#16a34a' : sig === 'negative' ? '#dc2626' : '#64748b';
    const factorIcon = (sig: string) => sig === 'positive' ? 'arrow-up-circle' : sig === 'negative' ? 'arrow-down-circle' : 'remove-circle';

    return (
        <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
            {/* Header */}
            <View style={[s.header, { backgroundColor: '#1e3a5f' }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={s.headerTitle}>{impact?.companyName || symbol}</Text>
                    <Text style={s.headerSub}>{impact?.sector} · {impact?.industry}</Text>
                </View>
                {impact?.outlook && (
                    <View style={[s.outlookBadge, { backgroundColor: impact.outlook === 'Favorable' ? '#16a34a20' : impact.outlook === 'Challenging' ? '#dc262620' : '#2563eb20' }]}>
                        <Text style={[s.outlookText, { color: impact.outlook === 'Favorable' ? '#16a34a' : impact.outlook === 'Challenging' ? '#dc2626' : '#2563eb' }]}>
                            {impact.outlook}
                        </Text>
                    </View>
                )}
            </View>

            {/* Tab Selector */}
            <View style={s.tabRow}>
                {(['macro', 'news'] as const).map(t => (
                    <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
                        <Ionicons name={t === 'macro' ? 'trending-up' : 'newspaper'} size={16} color={tab === t ? '#2563eb' : '#94a3b8'} />
                        <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t === 'macro' ? 'Macro Impact' : 'News Impact'}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {tab === 'macro' && impact ? (
                <>
                    {/* Outlook Score */}
                    <View style={s.card}>
                        <Text style={s.cardTitle}>Economic Outlook Score</Text>
                        <View style={s.scoreRow}>
                            <Text style={[s.scoreNum, { color: impact.outlookScore > 30 ? '#16a34a' : impact.outlookScore < -30 ? '#dc2626' : '#2563eb' }]}>
                                {impact.outlookScore > 0 ? '+' : ''}{impact.outlookScore}
                            </Text>
                            <Text style={s.scoreLabel}>/100</Text>
                        </View>
                    </View>

                    {/* Macro Context */}
                    <View style={s.card}>
                        <Text style={s.cardTitle}>Macro Environment</Text>
                        <View style={s.macroGrid}>
                            {impact.macro?.sp500YTD != null && (
                                <View style={s.macroItem}>
                                    <Text style={s.macroLabel}>S&P 500 YTD</Text>
                                    <Text style={[s.macroVal, impact.macro.sp500YTD >= 0 ? s.green : s.red]}>
                                        {impact.macro.sp500YTD >= 0 ? '+' : ''}{impact.macro.sp500YTD}%
                                    </Text>
                                </View>
                            )}
                            {impact.macro?.treasury10Y != null && (
                                <View style={s.macroItem}>
                                    <Text style={s.macroLabel}>10Y Yield</Text>
                                    <Text style={s.macroVal}>{impact.macro.treasury10Y}%</Text>
                                </View>
                            )}
                            {impact.macro?.vix != null && (
                                <View style={s.macroItem}>
                                    <Text style={s.macroLabel}>VIX</Text>
                                    <Text style={[s.macroVal, impact.macro.vix < 20 ? s.green : impact.macro.vix > 30 ? s.red : s.blue]}>
                                        {impact.macro.vix}
                                    </Text>
                                </View>
                            )}
                            {impact.macro?.sectorMonthPct != null && (
                                <View style={s.macroItem}>
                                    <Text style={s.macroLabel}>Sector (1M)</Text>
                                    <Text style={[s.macroVal, impact.macro.sectorMonthPct >= 0 ? s.green : s.red]}>
                                        {impact.macro.sectorMonthPct >= 0 ? '+' : ''}{impact.macro.sectorMonthPct}%
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Sensitivity */}
                    <View style={s.card}>
                        <Text style={s.cardTitle}>Sensitivity Analysis</Text>
                        <View style={s.sensitivityRow}>
                            <Ionicons name="trending-up" size={18} color="#f59e0b" />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={s.sensLabel}>Interest Rate Sensitivity: <Text style={s.sensBold}>{impact.interestRateSensitivity?.level}</Text></Text>
                                <Text style={s.sensDetail}>{impact.interestRateSensitivity?.detail}</Text>
                            </View>
                        </View>
                        <View style={[s.sensitivityRow, { marginTop: 12 }]}>
                            <Ionicons name="flame" size={18} color="#dc2626" />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={s.sensLabel}>Inflation Exposure: <Text style={s.sensBold}>{impact.inflationExposure?.level}</Text></Text>
                                <Text style={s.sensDetail}>{impact.inflationExposure?.detail}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Earnings Factors */}
                    <View style={s.card}>
                        <Text style={s.cardTitle}>Earnings & Cash Flow Factors</Text>
                        {impact.earningsFactors?.map((f: any, i: number) => (
                            <View key={i} style={s.factorRow}>
                                <Ionicons name={factorIcon(f.signal) as any} size={20} color={signalColor(f.signal)} />
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={s.factorName}>{f.factor}</Text>
                                    <Text style={s.factorDetail}>{f.detail}</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Cash Flow Projections */}
                    {impact.cashFlowProjections?.length > 0 && (
                        <View style={[s.card, { marginBottom: 40 }]}>
                            <Text style={s.cardTitle}>Projected Free Cash Flow</Text>
                            <Text style={s.cardSub}>Macro-adjusted growth model (5-year)</Text>
                            {impact.cashFlowProjections.map((p: any) => (
                                <View key={p.year} style={s.projRow}>
                                    <Text style={s.projYear}>Year {p.year}</Text>
                                    <Text style={s.projFcf}>${p.projectedFCF}B</Text>
                                    <Text style={[s.projGrowth, p.growthRate >= 0 ? s.green : s.red]}>
                                        {p.growthRate >= 0 ? '+' : ''}{p.growthRate}%
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </>
            ) : tab === 'news' && newsImpact ? (
                <>
                    {/* Composite Signal */}
                    <View style={[s.card, { borderLeftWidth: 4, borderLeftColor: newsImpact.signal?.color === 'green' ? '#16a34a' : newsImpact.signal?.color === 'red' ? '#dc2626' : '#2563eb' }]}>
                        <View style={s.scoreRow}>
                            <View>
                                <Text style={s.cardTitle}>News Composite Signal</Text>
                                <Text style={s.cardSub}>{newsImpact.signal?.direction} — {newsImpact.signal?.strength}</Text>
                            </View>
                            <Text style={[s.scoreNum, { color: newsImpact.compositeScore > 0 ? '#16a34a' : newsImpact.compositeScore < 0 ? '#dc2626' : '#2563eb' }]}>
                                {newsImpact.compositeScore > 0 ? '+' : ''}{newsImpact.compositeScore}
                            </Text>
                        </View>
                    </View>

                    {/* Earnings Impact */}
                    <View style={s.card}>
                        <Text style={s.cardTitle}>Projected Earnings Impact</Text>
                        <View style={s.macroGrid}>
                            <View style={s.macroItem}>
                                <Text style={s.macroLabel}>Current EPS</Text>
                                <Text style={s.macroVal}>${newsImpact.earningsImpact?.currentEPS?.toFixed(2) || '—'}</Text>
                            </View>
                            <View style={s.macroItem}>
                                <Text style={s.macroLabel}>News-Adjusted EPS</Text>
                                <Text style={[s.macroVal, newsImpact.earningsImpact?.adjustmentPct >= 0 ? s.green : s.red]}>
                                    ${newsImpact.earningsImpact?.projectedEPS?.toFixed(2) || '—'}
                                </Text>
                            </View>
                            <View style={s.macroItem}>
                                <Text style={s.macroLabel}>FCF Impact</Text>
                                <Text style={[s.macroVal, newsImpact.earningsImpact?.adjustmentPct >= 0 ? s.green : s.red]}>
                                    {fmt(newsImpact.earningsImpact?.projectedFCF || 0)}
                                </Text>
                            </View>
                            <View style={s.macroItem}>
                                <Text style={s.macroLabel}>Adjustment</Text>
                                <Text style={[s.macroVal, newsImpact.earningsImpact?.adjustmentPct >= 0 ? s.green : s.red]}>
                                    {newsImpact.earningsImpact?.adjustmentPct >= 0 ? '+' : ''}{newsImpact.earningsImpact?.adjustmentPct}%
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* 3 Layers */}
                    {([
                        { key: 'economy', title: 'Economy News', icon: 'globe' as const, color: '#2563eb' },
                        { key: 'industry', title: 'Industry News', icon: 'business' as const, color: '#7c3aed' },
                        { key: 'company', title: 'Company News', icon: 'briefcase' as const, color: '#059669' },
                    ]).map(layer => {
                        const l = newsImpact.layers?.[layer.key];
                        if (!l) return null;
                        return (
                            <View key={layer.key} style={s.card}>
                                <View style={s.layerHeader}>
                                    <Ionicons name={layer.icon} size={18} color={layer.color} />
                                    <Text style={[s.cardTitle, { marginLeft: 8, flex: 1 }]}>{layer.title}</Text>
                                    <View style={[s.sentBadge, { backgroundColor: signalColor(l.sentiment) + '18' }]}>
                                        <Text style={[s.sentText, { color: signalColor(l.sentiment) }]}>
                                            {l.sentiment}
                                        </Text>
                                    </View>
                                </View>
                                {layer.key === 'industry' && l.sectorDrivers && (
                                    <View style={s.driverBox}>
                                        <Text style={s.driverLabel}>Key Drivers</Text>
                                        <Text style={s.driverText}>{l.sectorDrivers.join(' · ')}</Text>
                                        <Text style={[s.driverLabel, { marginTop: 6 }]}>Key Risks</Text>
                                        <Text style={[s.driverText, { color: '#dc2626' }]}>{l.sectorRisks?.join(' · ')}</Text>
                                    </View>
                                )}
                                {l.articles?.slice(0, 4).map((art: any, i: number) => (
                                    <View key={i} style={s.newsRow}>
                                        <View style={[s.newsDot, { backgroundColor: signalColor(art.impact?.sentiment || 'neutral') }]} />
                                        <Text style={s.newsTitle} numberOfLines={2}>{art.title}</Text>
                                    </View>
                                ))}
                            </View>
                        );
                    })}

                    {/* Sector Factors */}
                    <View style={[s.card, { marginBottom: 40 }]}>
                        <Text style={s.cardTitle}>Sector-Specific Factors</Text>
                        <View style={s.driverBox}>
                            <Text style={s.driverLabel}>Growth Drivers</Text>
                            {newsImpact.sectorFactors?.drivers?.map((d: string, i: number) => (
                                <View key={i} style={s.factorChip}>
                                    <Ionicons name="arrow-up" size={12} color="#16a34a" />
                                    <Text style={s.factorChipText}>{d}</Text>
                                </View>
                            ))}
                            <Text style={[s.driverLabel, { marginTop: 10 }]}>Risk Factors</Text>
                            {newsImpact.sectorFactors?.risks?.map((r: string, i: number) => (
                                <View key={i} style={s.factorChip}>
                                    <Ionicons name="warning" size={12} color="#dc2626" />
                                    <Text style={s.factorChipText}>{r}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </>
            ) : null}
        </ScrollView>
    );
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
    back: { marginRight: 12 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
    headerSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    outlookBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    outlookText: { fontSize: 13, fontWeight: '700' },
    tabRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, backgroundColor: '#fff', borderRadius: 10, padding: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8 },
    tabActive: { backgroundColor: '#eff6ff' },
    tabText: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginLeft: 6 },
    tabTextActive: { color: '#2563eb' },
    card: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
    cardSub: { fontSize: 12, color: '#64748b', marginBottom: 8 },
    scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    scoreNum: { fontSize: 36, fontWeight: '800' },
    scoreLabel: { fontSize: 18, color: '#94a3b8', marginLeft: 4 },
    macroGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    macroItem: { width: '50%', paddingVertical: 8 },
    macroLabel: { fontSize: 11, color: '#94a3b8' },
    macroVal: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
    green: { color: '#16a34a' }, red: { color: '#dc2626' }, blue: { color: '#2563eb' },
    sensitivityRow: { flexDirection: 'row', alignItems: 'flex-start' },
    sensLabel: { fontSize: 13, color: '#334155' },
    sensBold: { fontWeight: '700', textTransform: 'capitalize' },
    sensDetail: { fontSize: 12, color: '#64748b', marginTop: 2 },
    factorRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
    factorName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
    factorDetail: { fontSize: 12, color: '#64748b', marginTop: 2 },
    projRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
    projYear: { flex: 1, fontSize: 13, fontWeight: '600', color: '#334155' },
    projFcf: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a', textAlign: 'right' },
    projGrowth: { flex: 0.6, fontSize: 13, fontWeight: '600', textAlign: 'right' },
    layerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    sentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    sentText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
    driverBox: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, marginBottom: 8 },
    driverLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 4 },
    driverText: { fontSize: 12, color: '#334155' },
    newsRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
    newsDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, marginRight: 8 },
    newsTitle: { flex: 1, fontSize: 13, color: '#334155', lineHeight: 18 },
    factorChip: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
    factorChipText: { fontSize: 12, color: '#334155', marginLeft: 6 },
});

export default EconomicImpactScreen;
