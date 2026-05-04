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
    if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
};

const DividendScreen: React.FC<Props> = ({ route, navigation }) => {
    const { symbol } = route.params;
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedInvestment, setSelectedInvestment] = useState(0);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await stockAPI.getDividendAnalysis(symbol);
            setData(result);
        } catch (e: any) {
            setError(e.message || 'Failed to load dividend data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={['#065f46', '#059669']} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{symbol} Dividends</Text>
                </LinearGradient>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#059669" />
                </View>
            </View>
        );
    }

    if (error || !data) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={['#065f46', '#059669']} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{symbol} Dividends</Text>
                </LinearGradient>
                <View style={styles.center}>
                    <Ionicons name="alert-circle" size={48} color="#FF3B30" />
                    <Text style={styles.errorText}>{error || 'No data'}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const proj = data.projections?.[selectedInvestment];
    const safetyColor = data.safetyScore >= 70 ? '#34C759' : data.safetyScore >= 50 ? '#f59e0b' : '#FF3B30';

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#065f46', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                <TouchableOpacity style={{ marginBottom: 8 }} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{symbol} Dividend Analysis</Text>
                <Text style={styles.headerSub}>{data.companyName}</Text>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Overview Cards */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Dividend Overview</Text>
                    <View style={styles.gridRow}>
                        <View style={styles.gridBox}>
                            <Text style={styles.gridLabel}>Annual Dividend</Text>
                            <Text style={styles.gridValue}>${data.annualDividend?.toFixed(2) ?? '—'}</Text>
                        </View>
                        <View style={styles.gridBox}>
                            <Text style={styles.gridLabel}>Yield</Text>
                            <Text style={[styles.gridValue, { color: '#059669' }]}>{data.dividendYield?.toFixed(2) ?? '—'}%</Text>
                        </View>
                        <View style={styles.gridBox}>
                            <Text style={styles.gridLabel}>Payout Ratio</Text>
                            <Text style={styles.gridValue}>{data.payoutRatio != null ? `${data.payoutRatio}%` : '—'}</Text>
                        </View>
                        <View style={styles.gridBox}>
                            <Text style={styles.gridLabel}>Growth Rate</Text>
                            <Text style={[styles.gridValue, { color: data.avgGrowthRate > 0 ? '#34C759' : '#FF3B30' }]}>
                                {data.avgGrowthRate > 0 ? '+' : ''}{data.avgGrowthRate}%
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Safety Score */}
                <View style={styles.card}>
                    <View style={styles.safetyRow}>
                        <View>
                            <Text style={styles.sectionTitle}>Dividend Safety</Text>
                            <Text style={styles.safetyNote}>
                                {data.yearsOfDividends} years of dividend history
                            </Text>
                        </View>
                        <View style={[styles.safetyBadge, { backgroundColor: safetyColor + '20', borderColor: safetyColor }]}>
                            <Text style={[styles.safetyScore, { color: safetyColor }]}>{data.safetyScore}</Text>
                            <Text style={[styles.safetyLabel, { color: safetyColor }]}>/ 100</Text>
                        </View>
                    </View>
                </View>

                {/* Income Projections */}
                {data.projections?.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Income If You Invest</Text>
                        <View style={styles.tabRow}>
                            {data.projections.map((p: any, i: number) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[styles.tab, selectedInvestment === i && styles.tabActive]}
                                    onPress={() => setSelectedInvestment(i)}
                                >
                                    <Text style={[styles.tabText, selectedInvestment === i && styles.tabTextActive]}>
                                        {fmt(p.investment)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {proj && (
                            <View style={styles.projGrid}>
                                <View style={styles.projBox}>
                                    <Ionicons name="cash" size={20} color="#059669" />
                                    <Text style={styles.projLabel}>Annual Income</Text>
                                    <Text style={styles.projValue}>${proj.annualIncome?.toFixed(2)}</Text>
                                </View>
                                <View style={styles.projBox}>
                                    <Ionicons name="calendar" size={20} color="#3b82f6" />
                                    <Text style={styles.projLabel}>Monthly Income</Text>
                                    <Text style={styles.projValue}>${proj.monthlyIncome?.toFixed(2)}</Text>
                                </View>
                                <View style={styles.projBox}>
                                    <Ionicons name="layers" size={20} color="#8b5cf6" />
                                    <Text style={styles.projLabel}>Shares Owned</Text>
                                    <Text style={styles.projValue}>{proj.shares}</Text>
                                </View>
                                <View style={styles.projBox}>
                                    <Ionicons name="trending-up" size={20} color="#f59e0b" />
                                    <Text style={styles.projLabel}>Yield on Cost</Text>
                                    <Text style={styles.projValue}>{proj.yieldOnCost}%</Text>
                                </View>
                            </View>
                        )}

                        {/* 10-Year DRIP Table */}
                        {proj?.drip10Year?.length > 0 && (
                            <View style={styles.dripSection}>
                                <Text style={styles.dripTitle}>10-Year DRIP Projection</Text>
                                <Text style={styles.dripNote}>Reinvesting dividends @ {data.avgGrowthRate}% growth</Text>
                                <View style={styles.dripHeader}>
                                    <Text style={[styles.dripCell, { flex: 0.5 }]}>Yr</Text>
                                    <Text style={styles.dripCell}>Shares</Text>
                                    <Text style={styles.dripCell}>Income/yr</Text>
                                    <Text style={styles.dripCell}>Value</Text>
                                </View>
                                {proj.drip10Year.filter((_: any, i: number) => i % 2 === 0 || i === proj.drip10Year.length - 1).map((d: any) => (
                                    <View key={d.year} style={[styles.dripRow, d.year % 2 === 0 && { backgroundColor: '#f0fdf4' }]}>
                                        <Text style={[styles.dripCell, { flex: 0.5, fontWeight: '600' }]}>{d.year}</Text>
                                        <Text style={styles.dripCell}>{d.shares}</Text>
                                        <Text style={[styles.dripCell, { color: '#059669' }]}>{fmt(d.annualIncome)}</Text>
                                        <Text style={[styles.dripCell, { fontWeight: '600' }]}>{fmt(d.portfolioValue)}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* Annual Dividend History */}
                {data.annualHistory?.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Annual Dividend History</Text>
                        {data.annualHistory.slice(-10).reverse().map((a: any, i: number) => {
                            const prev = data.annualHistory[data.annualHistory.indexOf(a) - 1];
                            const growth = prev ? ((a.total - prev.total) / prev.total * 100) : null;
                            return (
                                <View key={i} style={[styles.histRow, i % 2 === 0 && { backgroundColor: '#f0fdf4' }]}>
                                    <Text style={styles.histYear}>{a.year}</Text>
                                    <Text style={styles.histAmount}>${a.total.toFixed(2)}</Text>
                                    <Text style={[styles.histGrowth, { color: growth == null ? '#999' : growth >= 0 ? '#34C759' : '#FF3B30' }]}>
                                        {growth != null ? `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%` : '—'}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                )}

                {data.annualDividend === 0 && (
                    <View style={styles.card}>
                        <View style={{ alignItems: 'center', padding: 20 }}>
                            <Ionicons name="information-circle" size={48} color="#f59e0b" />
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginTop: 12 }}>
                                No Dividend
                            </Text>
                            <Text style={{ fontSize: 13, color: '#666', marginTop: 4, textAlign: 'center' }}>
                                {data.companyName} doesn't currently pay a dividend. Consider dividend-paying alternatives.
                            </Text>
                        </View>
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
    headerTitle: { fontSize: 22, fontWeight: '700', color: 'white' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    errorText: { marginTop: 12, color: '#FF3B30', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
    retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#059669', borderRadius: 8 },
    retryText: { color: 'white', fontWeight: '600' },
    card: { margin: 16, marginBottom: 0, padding: 16, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
    gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    gridBox: { flex: 1, minWidth: 70, backgroundColor: '#f0fdf4', padding: 10, borderRadius: 8, alignItems: 'center' },
    gridLabel: { fontSize: 10, color: '#666', marginBottom: 4 },
    gridValue: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
    safetyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    safetyNote: { fontSize: 12, color: '#666', marginTop: -8 },
    safetyBadge: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
    safetyScore: { fontSize: 22, fontWeight: '800' },
    safetyLabel: { fontSize: 10 },
    tabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center' },
    tabActive: { backgroundColor: '#059669' },
    tabText: { fontSize: 13, fontWeight: '600', color: '#555' },
    tabTextActive: { color: 'white' },
    projGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    projBox: { flex: 1, minWidth: '45%', backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, alignItems: 'center', gap: 4 },
    projLabel: { fontSize: 10, color: '#666' },
    projValue: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
    dripSection: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
    dripTitle: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
    dripNote: { fontSize: 11, color: '#999', marginBottom: 8 },
    dripHeader: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    dripRow: { flexDirection: 'row', paddingVertical: 6 },
    dripCell: { flex: 1, fontSize: 12, color: '#555', textAlign: 'center' },
    histRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center' },
    histYear: { width: 60, fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
    histAmount: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1a1a1a', textAlign: 'center' },
    histGrowth: { width: 70, fontSize: 12, fontWeight: '600', textAlign: 'right' },
});

export default DividendScreen;
