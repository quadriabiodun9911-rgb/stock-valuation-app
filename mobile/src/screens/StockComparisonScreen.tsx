import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
    ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart } from 'react-native-chart-kit';
import { stockAPI } from '../services/api';

const screenWidth = Dimensions.get('window').width - 64;

const fmt = (v: number) => {
    if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    return `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

const StockComparisonScreen = ({ navigation }: any) => {
    const [symbolA, setSymbolA] = useState('');
    const [symbolB, setSymbolB] = useState('');
    const [stockA, setStockA] = useState<any>(null);
    const [stockB, setStockB] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [compared, setCompared] = useState(false);

    const handleCompare = async () => {
        const a = symbolA.trim().toUpperCase();
        const b = symbolB.trim().toUpperCase();
        if (!a || !b) { Alert.alert('Enter Symbols', 'Enter two stock ticker symbols to compare.'); return; }
        if (a === b) { Alert.alert('Same Symbol', 'Enter two different symbols.'); return; }
        setLoading(true);
        setCompared(false);
        try {
            const [infoA, infoB] = await Promise.all([
                stockAPI.getStockInfo(a),
                stockAPI.getStockInfo(b),
            ]);
            setStockA(infoA);
            setStockB(infoB);
            setCompared(true);
        } catch {
            Alert.alert('Error', 'Could not fetch stock data. Check the symbols and try again.');
        }
        setLoading(false);
    };

    const rows = stockA && stockB ? [
        { label: 'Price', a: `$${stockA.current_price?.toFixed(2)}`, b: `$${stockB.current_price?.toFixed(2)}`, winner: (stockA.current_price || 0) > (stockB.current_price || 0) ? 'a' : 'b' },
        { label: 'Market Cap', a: fmt(stockA.market_cap || 0), b: fmt(stockB.market_cap || 0), winner: (stockA.market_cap || 0) > (stockB.market_cap || 0) ? 'a' : 'b' },
        { label: 'P/E Ratio', a: stockA.pe_ratio?.toFixed(1) || 'N/A', b: stockB.pe_ratio?.toFixed(1) || 'N/A', winner: stockA.pe_ratio && stockB.pe_ratio ? (stockA.pe_ratio < stockB.pe_ratio ? 'a' : 'b') : null },
        { label: 'Div Yield', a: stockA.dividend_yield ? `${(stockA.dividend_yield * 100).toFixed(2)}%` : 'N/A', b: stockB.dividend_yield ? `${(stockB.dividend_yield * 100).toFixed(2)}%` : 'N/A', winner: (stockA.dividend_yield || 0) > (stockB.dividend_yield || 0) ? 'a' : 'b' },
        { label: 'Beta', a: stockA.beta?.toFixed(2) || 'N/A', b: stockB.beta?.toFixed(2) || 'N/A', winner: stockA.beta && stockB.beta ? (stockA.beta < stockB.beta ? 'a' : 'b') : null },
        { label: 'Sector', a: stockA.sector || 'N/A', b: stockB.sector || 'N/A', winner: null },
    ] : [];

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e3a5f']} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Stock Comparison</Text>
                        <Text style={styles.headerSub}>Side-by-side analysis</Text>
                    </View>
                    <Ionicons name="git-compare" size={24} color="#3b82f6" />
                </View>
            </LinearGradient>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                {/* Input Cards */}
                <View style={styles.inputRow}>
                    <View style={styles.inputCard}>
                        <View style={[styles.inputDot, { backgroundColor: '#2563eb' }]} />
                        <TextInput style={styles.input} value={symbolA} onChangeText={setSymbolA}
                            placeholder="AAPL" placeholderTextColor="#94a3b8" autoCapitalize="characters" />
                    </View>
                    <View style={styles.vsCircle}>
                        <Text style={styles.vsText}>VS</Text>
                    </View>
                    <View style={styles.inputCard}>
                        <View style={[styles.inputDot, { backgroundColor: '#7c3aed' }]} />
                        <TextInput style={styles.input} value={symbolB} onChangeText={setSymbolB}
                            placeholder="MSFT" placeholderTextColor="#94a3b8" autoCapitalize="characters" />
                    </View>
                </View>

                <TouchableOpacity onPress={handleCompare} disabled={loading} activeOpacity={0.8}>
                    <LinearGradient colors={['#2563eb', '#3b82f6']} style={styles.compareBtn}>
                        {loading ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <Ionicons name="git-compare" size={18} color="#fff" />
                                <Text style={styles.compareBtnText}>Compare Stocks</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                {compared && stockA && stockB && (
                    <>
                        {/* Company Headers */}
                        <View style={styles.namesRow}>
                            <View style={[styles.nameCard, { borderLeftColor: '#2563eb' }]}>
                                <Text style={styles.nameSymbol}>{stockA.symbol}</Text>
                                <Text style={styles.nameFull} numberOfLines={1}>{stockA.company_name}</Text>
                            </View>
                            <View style={[styles.nameCard, { borderLeftColor: '#7c3aed' }]}>
                                <Text style={styles.nameSymbol}>{stockB.symbol}</Text>
                                <Text style={styles.nameFull} numberOfLines={1}>{stockB.company_name}</Text>
                            </View>
                        </View>

                        {/* Comparison Table */}
                        <View style={styles.tableCard}>
                            <View style={styles.tableHeader}>
                                <Text style={styles.tableHeaderLabel}>Metric</Text>
                                <Text style={[styles.tableHeaderVal, { color: '#2563eb' }]}>{stockA.symbol}</Text>
                                <Text style={[styles.tableHeaderVal, { color: '#7c3aed' }]}>{stockB.symbol}</Text>
                            </View>
                            {rows.map(({ label, a, b, winner }) => (
                                <View key={label} style={styles.tableRow}>
                                    <Text style={styles.tableLabel}>{label}</Text>
                                    <Text style={[styles.tableValue, winner === 'a' && styles.winner]}>{a}</Text>
                                    <Text style={[styles.tableValue, winner === 'b' && styles.winner]}>{b}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Price Bar Chart */}
                        {stockA.current_price && stockB.current_price && (
                            <View style={styles.chartCard}>
                                <Text style={styles.chartTitle}>Price Comparison</Text>
                                <BarChart
                                    data={{
                                        labels: [stockA.symbol, stockB.symbol],
                                        datasets: [{ data: [stockA.current_price, stockB.current_price] }],
                                    }}
                                    width={screenWidth}
                                    height={200}
                                    yAxisLabel="$"
                                    yAxisSuffix=""
                                    chartConfig={{
                                        backgroundColor: '#fff',
                                        backgroundGradientFrom: '#fff',
                                        backgroundGradientTo: '#fff',
                                        decimalPlaces: 0,
                                        color: (opacity = 1) => `rgba(37,99,235,${opacity})`,
                                        labelColor: () => '#64748b',
                                        barPercentage: 0.6,
                                        propsForBackgroundLines: { stroke: '#f1f5f9' },
                                    }}
                                    style={{ borderRadius: 12 }}
                                    showValuesOnTopOfBars
                                />
                            </View>
                        )}

                        {/* Verdict */}
                        <View style={styles.verdictCard}>
                            <Ionicons name="bulb" size={20} color="#f59e0b" />
                            <Text style={styles.verdictText}>
                                {stockA.pe_ratio && stockB.pe_ratio
                                    ? stockA.pe_ratio < stockB.pe_ratio
                                        ? `${stockA.symbol} appears more attractively valued with a lower P/E ratio.`
                                        : `${stockB.symbol} appears more attractively valued with a lower P/E ratio.`
                                    : `Both stocks have unique strengths. Consider your investment goals and risk tolerance.`}
                            </Text>
                        </View>
                    </>
                )}

                {!compared && !loading && (
                    <View style={styles.empty}>
                        <Ionicons name="git-compare-outline" size={64} color="#cbd5e1" />
                        <Text style={styles.emptyTitle}>Compare Any Two Stocks</Text>
                        <Text style={styles.emptyDesc}>Enter two symbols above and tap Compare to see a side-by-side analysis.</Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { marginRight: 12, padding: 4 },
    headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
    headerSub: { color: '#94a3b8', fontSize: 13, fontWeight: '500', marginTop: 2 },
    body: { flex: 1, padding: 16 },

    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    inputCard: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
    inputDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
    input: { flex: 1, fontSize: 18, fontWeight: '800', color: '#0f172a', paddingVertical: 12 },
    vsCircle: { backgroundColor: '#e2e8f0', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    vsText: { fontSize: 11, fontWeight: '900', color: '#64748b' },

    compareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, marginBottom: 20 },
    compareBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    namesRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    nameCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
    nameSymbol: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    nameFull: { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 },

    tableCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
    tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 10, paddingHorizontal: 16 },
    tableHeaderLabel: { flex: 1, fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
    tableHeaderVal: { width: 80, fontSize: 12, fontWeight: '800', textAlign: 'center' },
    tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
    tableLabel: { flex: 1, fontSize: 13, color: '#475569', fontWeight: '600' },
    tableValue: { width: 80, fontSize: 13, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
    winner: { color: '#16a34a', fontWeight: '800' },

    chartCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
    chartTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 8 },

    verdictCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fffbeb', borderRadius: 14, padding: 16, marginBottom: 14, borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
    verdictText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#92400e', lineHeight: 20 },

    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginTop: 16 },
    emptyDesc: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
});

export default StockComparisonScreen;
