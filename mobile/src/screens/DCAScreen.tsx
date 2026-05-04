import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { stockAPI } from '../services/api';

interface Props {
    route: any;
    navigation: any;
}

const fmt = (n: number): string => {
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
};

const DCAScreen: React.FC<Props> = ({ route, navigation }) => {
    const { symbol: routeSymbol } = route.params ?? {};
    const [symbol, setSymbol] = useState(routeSymbol || 'AAPL');
    const [monthlyAmount, setMonthlyAmount] = useState('500');
    const [years, setYears] = useState('5');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const calculate = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await stockAPI.getDCAAnalysis(
                symbol.toUpperCase(),
                parseFloat(monthlyAmount) || 500,
                parseInt(years) || 5,
            );
            setData(result);
        } catch (e: any) {
            setError(e.message || 'Failed to calculate');
        } finally {
            setLoading(false);
        }
    };

    const returnColor = (pct: number) => (pct >= 0 ? '#34C759' : '#FF3B30');

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#4c1d95', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                <TouchableOpacity style={{ marginBottom: 8 }} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>DCA Calculator</Text>
                <Text style={styles.headerSub}>What if you invested steadily?</Text>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Input */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Backtest DCA Strategy</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Stock Symbol</Text>
                        <TextInput style={styles.input} value={symbol} onChangeText={setSymbol} autoCapitalize="characters" placeholder="AAPL" />
                    </View>
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.inputLabel}>Monthly ($)</Text>
                            <TextInput style={styles.input} value={monthlyAmount} onChangeText={setMonthlyAmount} keyboardType="numeric" placeholder="500" />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.inputLabel}>Years Back</Text>
                            <TextInput style={styles.input} value={years} onChangeText={setYears} keyboardType="numeric" placeholder="5" />
                        </View>
                    </View>

                    <View style={styles.presetRow}>
                        {['1', '3', '5', '10'].map((y) => (
                            <TouchableOpacity key={y} style={[styles.presetBtn, years === y && styles.presetActive]} onPress={() => setYears(y)}>
                                <Text style={[styles.presetText, years === y && { color: 'white' }]}>{y}yr</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.calcBtn} onPress={calculate} disabled={loading}>
                        {loading ? <ActivityIndicator color="white" /> : (
                            <>
                                <Ionicons name="time" size={20} color="white" />
                                <Text style={styles.calcBtnText}>Run Backtest</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {error && (
                    <View style={styles.card}>
                        <Text style={{ color: '#FF3B30', textAlign: 'center' }}>{error}</Text>
                    </View>
                )}

                {data && (
                    <>
                        {/* Result Summary */}
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>{data.companyName} — {data.monthsInvested} Months DCA</Text>
                            <View style={styles.summaryRow}>
                                <View style={styles.summaryBox}>
                                    <Text style={styles.summaryLabel}>Invested</Text>
                                    <Text style={styles.summaryValue}>{fmt(data.totalInvested)}</Text>
                                </View>
                                <View style={styles.summaryArrow}>
                                    <Ionicons name="arrow-forward" size={24} color="#7c3aed" />
                                </View>
                                <View style={styles.summaryBox}>
                                    <Text style={styles.summaryLabel}>Current Value</Text>
                                    <Text style={[styles.summaryValue, { color: returnColor(data.totalReturnPct) }]}>
                                        {fmt(data.currentValue)}
                                    </Text>
                                </View>
                            </View>

                            <View style={[styles.returnBanner, { backgroundColor: returnColor(data.totalReturnPct) + '15' }]}>
                                <Ionicons
                                    name={data.totalReturnPct >= 0 ? 'trending-up' : 'trending-down'}
                                    size={24}
                                    color={returnColor(data.totalReturnPct)}
                                />
                                <Text style={[styles.returnText, { color: returnColor(data.totalReturnPct) }]}>
                                    {data.totalReturnPct >= 0 ? '+' : ''}{data.totalReturnPct}% ({data.totalReturn >= 0 ? '+' : ''}{fmt(data.totalReturn)})
                                </Text>
                            </View>
                        </View>

                        {/* Key Stats */}
                        <View style={styles.card}>
                            <View style={styles.gridRow}>
                                <View style={styles.gridBox}>
                                    <Text style={styles.gridLabel}>Avg Cost</Text>
                                    <Text style={styles.gridValue}>${data.avgCostBasis}</Text>
                                </View>
                                <View style={styles.gridBox}>
                                    <Text style={styles.gridLabel}>Current Price</Text>
                                    <Text style={styles.gridValue}>${data.currentPrice}</Text>
                                </View>
                                <View style={styles.gridBox}>
                                    <Text style={styles.gridLabel}>Shares</Text>
                                    <Text style={styles.gridValue}>{data.totalShares}</Text>
                                </View>
                                <View style={styles.gridBox}>
                                    <Text style={styles.gridLabel}>Est. Div/yr</Text>
                                    <Text style={[styles.gridValue, { color: '#059669' }]}>
                                        {data.estimatedAnnualDividendIncome > 0 ? fmt(data.estimatedAnnualDividendIncome) : '—'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* DCA vs Lump Sum */}
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>DCA vs Lump Sum</Text>
                            <View style={styles.vsRow}>
                                <View style={[styles.vsBox, data.lumpSumComparison?.dcaBetter && styles.vsWinner]}>
                                    <Text style={styles.vsLabel}>DCA</Text>
                                    <Text style={styles.vsValue}>{fmt(data.lumpSumComparison?.dcaValue ?? 0)}</Text>
                                </View>
                                <Text style={styles.vsText}>vs</Text>
                                <View style={[styles.vsBox, !data.lumpSumComparison?.dcaBetter && styles.vsWinner]}>
                                    <Text style={styles.vsLabel}>Lump Sum</Text>
                                    <Text style={styles.vsValue}>{fmt(data.lumpSumComparison?.lumpSumValue ?? 0)}</Text>
                                </View>
                            </View>
                            <Text style={styles.vsNote}>
                                {data.lumpSumComparison?.dcaBetter
                                    ? `DCA won by ${fmt(Math.abs(data.lumpSumComparison.difference))}`
                                    : `Lump sum won by ${fmt(Math.abs(data.lumpSumComparison?.difference ?? 0))}`}
                            </Text>
                        </View>

                        {/* Annual Summary */}
                        {data.annualSummary?.length > 0 && (
                            <View style={styles.card}>
                                <Text style={styles.sectionTitle}>Annual Snapshot</Text>
                                <View style={styles.tableHeader}>
                                    <Text style={[styles.tCell, { flex: 0.6 }]}>Year</Text>
                                    <Text style={styles.tCell}>Invested</Text>
                                    <Text style={styles.tCell}>Value</Text>
                                    <Text style={styles.tCell}>Return</Text>
                                </View>
                                {data.annualSummary.map((a: any) => (
                                    <View key={a.year} style={[styles.tableRow, a.returnPct >= 0 && { backgroundColor: '#faf5ff' }]}>
                                        <Text style={[styles.tCell, { flex: 0.6, fontWeight: '600' }]}>{a.year}</Text>
                                        <Text style={styles.tCell}>{fmt(a.totalInvested)}</Text>
                                        <Text style={[styles.tCell, { fontWeight: '600' }]}>{fmt(a.portfolioValue)}</Text>
                                        <Text style={[styles.tCell, { color: returnColor(a.returnPct), fontWeight: '600' }]}>
                                            {a.returnPct >= 0 ? '+' : ''}{a.returnPct}%
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
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
    card: { margin: 16, marginBottom: 0, padding: 16, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
    inputGroup: { marginBottom: 12 },
    inputLabel: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 4 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
    row: { flexDirection: 'row', gap: 12 },
    presetRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    presetBtn: { flex: 1, paddingVertical: 8, backgroundColor: '#f3f4f6', borderRadius: 8, alignItems: 'center' },
    presetActive: { backgroundColor: '#7c3aed' },
    presetText: { fontSize: 13, fontWeight: '600', color: '#555' },
    calcBtn: { flexDirection: 'row', backgroundColor: '#7c3aed', paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 8 },
    calcBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
    summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    summaryBox: { flex: 1, alignItems: 'center' },
    summaryLabel: { fontSize: 11, color: '#999', marginBottom: 4 },
    summaryValue: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
    summaryArrow: { paddingVertical: 10 },
    returnBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 12, borderRadius: 10, marginTop: 12 },
    returnText: { fontSize: 18, fontWeight: '800' },
    gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    gridBox: { flex: 1, minWidth: 70, backgroundColor: '#faf5ff', padding: 10, borderRadius: 8, alignItems: 'center' },
    gridLabel: { fontSize: 10, color: '#666', marginBottom: 4 },
    gridValue: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
    vsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    vsBox: { flex: 1, padding: 16, borderRadius: 10, backgroundColor: '#f9fafb', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
    vsWinner: { borderColor: '#7c3aed', backgroundColor: '#faf5ff' },
    vsLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 },
    vsValue: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
    vsText: { fontSize: 14, fontWeight: '700', color: '#999' },
    vsNote: { textAlign: 'center', marginTop: 12, fontSize: 13, color: '#7c3aed', fontWeight: '600' },
    tableHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    tableRow: { flexDirection: 'row', paddingVertical: 8 },
    tCell: { flex: 1, fontSize: 12, color: '#555', textAlign: 'center' },
});

export default DCAScreen;
