import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
    ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart } from 'react-native-chart-kit';
import { stockAPI } from '../services/api';

const screenWidth = Dimensions.get('window').width - 64;

const OptionsCalculatorScreen = ({ navigation }: any) => {
    const [symbol, setSymbol] = useState('');
    const [optionType, setOptionType] = useState<'call' | 'put'>('call');
    const [strikePrice, setStrikePrice] = useState('');
    const [premium, setPremium] = useState('');
    const [contracts, setContracts] = useState('1');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const calculate = async () => {
        if (!symbol || !strikePrice || !premium) return;
        setLoading(true);
        try {
            const res = await stockAPI.calculateOptions({
                symbol: symbol.toUpperCase(),
                option_type: optionType,
                strike_price: parseFloat(strikePrice),
                premium: parseFloat(premium),
                contracts: parseInt(contracts) || 1,
                expiry_days: 30,
            });
            setResult(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const chartData = result?.scenarios?.filter((_: any, i: number) => i % 2 === 0) || [];

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e3a5f']} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Options Calculator</Text>
                    <View style={{ width: 36 }} />
                </View>
                <Text style={styles.headerSub}>Calculate profit/loss scenarios for options trades</Text>
            </LinearGradient>

            <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Input Form */}
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Symbol</Text>
                            <TextInput
                                style={styles.input}
                                value={symbol}
                                onChangeText={setSymbol}
                                placeholder="AAPL"
                                placeholderTextColor="#94a3b8"
                                autoCapitalize="characters"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Contracts</Text>
                            <TextInput
                                style={styles.input}
                                value={contracts}
                                onChangeText={setContracts}
                                placeholder="1"
                                placeholderTextColor="#94a3b8"
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    {/* Option Type Toggle */}
                    <Text style={styles.label}>Option Type</Text>
                    <View style={styles.toggleRow}>
                        <TouchableOpacity
                            style={[styles.toggleBtn, optionType === 'call' && styles.toggleBtnActive]}
                            onPress={() => setOptionType('call')}
                        >
                            <Text style={[styles.toggleText, optionType === 'call' && styles.toggleTextActive]}>📈 Call</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleBtn, optionType === 'put' && styles.toggleBtnPut]}
                            onPress={() => setOptionType('put')}
                        >
                            <Text style={[styles.toggleText, optionType === 'put' && styles.toggleTextPut]}>📉 Put</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Strike Price ($)</Text>
                            <TextInput
                                style={styles.input}
                                value={strikePrice}
                                onChangeText={setStrikePrice}
                                placeholder="150.00"
                                placeholderTextColor="#94a3b8"
                                keyboardType="decimal-pad"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Premium ($)</Text>
                            <TextInput
                                style={styles.input}
                                value={premium}
                                onChangeText={setPremium}
                                placeholder="5.00"
                                placeholderTextColor="#94a3b8"
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.calcBtn} onPress={calculate} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.calcBtnText}>Calculate P/L</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Results */}
                {result && !result.error && (
                    <>
                        {/* Key Metrics */}
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Key Metrics</Text>
                            <View style={styles.metricsGrid}>
                                <View style={styles.metric}>
                                    <Text style={styles.metricLabel}>Current Price</Text>
                                    <Text style={styles.metricValue}>${result.current_price}</Text>
                                </View>
                                <View style={styles.metric}>
                                    <Text style={styles.metricLabel}>Breakeven</Text>
                                    <Text style={[styles.metricValue, { color: '#2563eb' }]}>${result.breakeven}</Text>
                                </View>
                                <View style={styles.metric}>
                                    <Text style={styles.metricLabel}>Max Loss</Text>
                                    <Text style={[styles.metricValue, { color: '#ef4444' }]}>${Math.abs(result.max_loss).toLocaleString()}</Text>
                                </View>
                                <View style={styles.metric}>
                                    <Text style={styles.metricLabel}>Total Premium</Text>
                                    <Text style={styles.metricValue}>${result.total_premium.toLocaleString()}</Text>
                                </View>
                            </View>
                            <View style={[styles.itmBadge, result.in_the_money ? styles.itmBadgeGreen : styles.itmBadgeRed]}>
                                <Text style={styles.itmText}>
                                    {result.in_the_money ? '✅ In The Money' : '❌ Out of The Money'}
                                </Text>
                            </View>
                        </View>

                        {/* P/L Chart */}
                        {chartData.length > 0 && (
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Profit/Loss by Price</Text>
                                <BarChart
                                    data={{
                                        labels: chartData.map((s: any) => `${s.price_change_pct > 0 ? '+' : ''}${s.price_change_pct}%`),
                                        datasets: [{
                                            data: chartData.map((s: any) => s.profit_loss),
                                        }],
                                    }}
                                    width={screenWidth}
                                    height={200}
                                    yAxisLabel="$"
                                    yAxisSuffix=""
                                    fromZero
                                    chartConfig={{
                                        backgroundColor: '#fff',
                                        backgroundGradientFrom: '#fff',
                                        backgroundGradientTo: '#fff',
                                        decimalPlaces: 0,
                                        color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                                        labelColor: () => '#64748b',
                                        barPercentage: 0.6,
                                        propsForLabels: { fontSize: 10 },
                                    }}
                                    style={{ borderRadius: 12 }}
                                />
                            </View>
                        )}

                        {/* Scenarios Table */}
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Scenario Analysis</Text>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.th, { flex: 1 }]}>Price</Text>
                                <Text style={[styles.th, { flex: 1 }]}>Change</Text>
                                <Text style={[styles.th, { flex: 1 }]}>P/L</Text>
                                <Text style={[styles.th, { flex: 1 }]}>ROI</Text>
                            </View>
                            {result.scenarios.map((s: any, i: number) => (
                                <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                                    <Text style={[styles.td, { flex: 1 }]}>${s.price}</Text>
                                    <Text style={[styles.td, { flex: 1, color: s.price_change_pct >= 0 ? '#10b981' : '#ef4444' }]}>
                                        {s.price_change_pct > 0 ? '+' : ''}{s.price_change_pct}%
                                    </Text>
                                    <Text style={[styles.td, { flex: 1, color: s.profit_loss >= 0 ? '#10b981' : '#ef4444', fontWeight: '600' }]}>
                                        ${s.profit_loss.toLocaleString()}
                                    </Text>
                                    <Text style={[styles.td, { flex: 1, color: s.roi_pct >= 0 ? '#10b981' : '#ef4444' }]}>
                                        {s.roi_pct > 0 ? '+' : ''}{s.roi_pct}%
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
    body: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 14 },
    row: { flexDirection: 'row', gap: 12 },
    inputGroup: { flex: 1, marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 6 },
    input: { backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0' },
    toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0' },
    toggleBtnActive: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
    toggleBtnPut: { backgroundColor: '#fef2f2', borderColor: '#ef4444' },
    toggleText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
    toggleTextActive: { color: '#2563eb' },
    toggleTextPut: { color: '#ef4444' },
    calcBtn: { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
    calcBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    metric: { width: '47%', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 },
    metricLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
    metricValue: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 4 },
    itmBadge: { marginTop: 14, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
    itmBadgeGreen: { backgroundColor: '#ecfdf5' },
    itmBadgeRed: { backgroundColor: '#fef2f2' },
    itmText: { fontSize: 14, fontWeight: '700' },
    tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 8, marginBottom: 4 },
    th: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
    tableRow: { flexDirection: 'row', paddingVertical: 8 },
    tableRowAlt: { backgroundColor: '#f8fafc', borderRadius: 6 },
    td: { fontSize: 13, color: '#0f172a' },
});

export default OptionsCalculatorScreen;
