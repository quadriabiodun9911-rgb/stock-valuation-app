import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../services/api';

interface Strategy {
    name: string;
    description: string;
    key: string;
}

interface BacktestResult {
    symbol: string;
    strategy: string;
    total_return: number;
    annual_return: number;
    win_rate: number;
    max_drawdown: number;
    sharpe_ratio: number;
    sortino_ratio: number;
    profit_factor: number;
    initial_capital: number;
    final_value: number;
    trades: any[];
}

const STRATEGIES: Strategy[] = [
    { key: 'momentum', name: 'Momentum', description: 'Buy on strong uptrend, sell on weakness' },
    { key: 'mean_reversion', name: 'Mean Reversion', description: 'Buy when oversold, sell when overbought' },
    { key: 'moving_average', name: 'Moving Average Crossover', description: 'Buy on golden cross, sell on death cross' },
    { key: 'rsi_oversold', name: 'RSI Oversold', description: 'Buy when RSI < 30, sell when RSI > 70' },
    { key: 'macd_crossover', name: 'MACD Crossover', description: 'Trade on MACD signal line crossovers' },
];

const BacktestingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const [symbol, setSymbol] = useState('AAPL');
    const [selectedStrategy, setSelectedStrategy] = useState<string>('momentum');
    const [capital, setCapital] = useState('10000');
    const [result, setResult] = useState<BacktestResult | null>(null);
    const [comparisonResults, setComparisonResults] = useState<BacktestResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'single' | 'compare'>('single');

    const runBacktest = async () => {
        const trimmed = symbol.trim().toUpperCase();
        if (!trimmed) {
            Alert.alert('Missing Symbol', 'Enter a stock symbol.');
            return;
        }
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/backtest/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: trimmed,
                    strategy: selectedStrategy,
                    initial_capital: parseFloat(capital) || 10000,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Backtest failed');
            setResult(data);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to run backtest.');
        } finally {
            setLoading(false);
        }
    };

    const compareStrategies = async () => {
        const trimmed = symbol.trim().toUpperCase();
        if (!trimmed) {
            Alert.alert('Missing Symbol', 'Enter a stock symbol.');
            return;
        }
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/backtest/compare-strategies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: trimmed,
                    initial_capital: parseFloat(capital) || 10000,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Comparison failed');
            setComparisonResults(data.results || []);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to compare strategies.');
        } finally {
            setLoading(false);
        }
    };

    const formatPct = (n: number) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`;
    const formatMoney = (n: number) => `$${n.toFixed(2)}`;

    const handleBack = () => {
        if (navigation?.canGoBack?.()) {
            navigation.goBack();
            return;
        }
        navigation?.navigate?.('MainTabs');
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Backtesting</Text>
                <View style={styles.headerSpacer} />
            </View>

            {/* Input Section */}
            <View style={styles.inputSection}>
                <View style={styles.inputRow}>
                    <TextInput
                        style={[styles.input, { flex: 2 }]}
                        placeholder="Symbol"
                        value={symbol}
                        onChangeText={setSymbol}
                        autoCapitalize="characters"
                    />
                    <TextInput
                        style={[styles.input, { flex: 1, marginLeft: 8 }]}
                        placeholder="Capital"
                        value={capital}
                        onChangeText={setCapital}
                        keyboardType="decimal-pad"
                    />
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'single' && styles.activeTab]}
                    onPress={() => setActiveTab('single')}
                >
                    <Text style={[styles.tabText, activeTab === 'single' && styles.activeTabText]}>Single Strategy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'compare' && styles.activeTab]}
                    onPress={() => setActiveTab('compare')}
                >
                    <Text style={[styles.tabText, activeTab === 'compare' && styles.activeTabText]}>Compare All</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={styles.loadingText}>Running backtest…</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {activeTab === 'single' ? (
                        <>
                            {/* Strategy Selection */}
                            <Text style={styles.sectionTitle}>Select Strategy</Text>
                            {STRATEGIES.map((s) => (
                                <TouchableOpacity
                                    key={s.key}
                                    style={[styles.strategyCard, selectedStrategy === s.key && styles.strategyCardActive]}
                                    onPress={() => setSelectedStrategy(s.key)}
                                >
                                    <View style={styles.strategyRadio}>
                                        <Ionicons
                                            name={selectedStrategy === s.key ? 'radio-button-on' : 'radio-button-off'}
                                            size={20}
                                            color={selectedStrategy === s.key ? '#2563eb' : '#94a3b8'}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.strategyName}>{s.name}</Text>
                                        <Text style={styles.strategyDesc}>{s.description}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}

                            <TouchableOpacity style={styles.runBtn} onPress={runBacktest}>
                                <Text style={styles.runBtnText}>Run Backtest</Text>
                            </TouchableOpacity>

                            {/* Result */}
                            {result && (
                                <View style={styles.resultCard}>
                                    <Text style={styles.resultTitle}>{result.strategy} — {result.symbol}</Text>
                                    <View style={styles.metricGrid}>
                                        <View style={styles.metric}>
                                            <Text style={styles.metricLabel}>Total Return</Text>
                                            <Text style={[styles.metricValue, result.total_return >= 0 ? styles.positive : styles.negative]}>
                                                {formatPct(result.total_return)}
                                            </Text>
                                        </View>
                                        <View style={styles.metric}>
                                            <Text style={styles.metricLabel}>Annual Return</Text>
                                            <Text style={styles.metricValue}>{formatPct(result.annual_return)}</Text>
                                        </View>
                                        <View style={styles.metric}>
                                            <Text style={styles.metricLabel}>Win Rate</Text>
                                            <Text style={styles.metricValue}>{(result.win_rate * 100).toFixed(1)}%</Text>
                                        </View>
                                        <View style={styles.metric}>
                                            <Text style={styles.metricLabel}>Max Drawdown</Text>
                                            <Text style={[styles.metricValue, styles.negative]}>{formatPct(result.max_drawdown)}</Text>
                                        </View>
                                        <View style={styles.metric}>
                                            <Text style={styles.metricLabel}>Sharpe Ratio</Text>
                                            <Text style={styles.metricValue}>{result.sharpe_ratio.toFixed(2)}</Text>
                                        </View>
                                        <View style={styles.metric}>
                                            <Text style={styles.metricLabel}>Final Value</Text>
                                            <Text style={styles.metricValue}>{formatMoney(result.final_value)}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.tradeCount}>{result.trades?.length ?? 0} trades executed</Text>
                                </View>
                            )}
                        </>
                    ) : (
                        <>
                            <TouchableOpacity style={styles.runBtn} onPress={compareStrategies}>
                                <Text style={styles.runBtnText}>Compare All Strategies</Text>
                            </TouchableOpacity>

                            {comparisonResults.length > 0 && (
                                <>
                                    <Text style={styles.sectionTitle}>Strategy Comparison — {symbol.toUpperCase()}</Text>
                                    {comparisonResults
                                        .sort((a, b) => b.total_return - a.total_return)
                                        .map((r, idx) => (
                                            <View key={idx} style={styles.compCard}>
                                                <View style={styles.compRank}>
                                                    <Text style={styles.compRankText}>#{idx + 1}</Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.compStrategy}>{r.strategy}</Text>
                                                    <Text style={styles.compMeta}>
                                                        Return: {formatPct(r.total_return)} · Win: {(r.win_rate * 100).toFixed(0)}% · Sharpe: {r.sharpe_ratio.toFixed(2)}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.compFinal, r.total_return >= 0 ? styles.positive : styles.negative]}>
                                                    {formatMoney(r.final_value)}
                                                </Text>
                                            </View>
                                        ))}
                                </>
                            )}
                        </>
                    )}
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: '#64748b' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    backBtn: { padding: 4, marginRight: 8 },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#1e293b' },
    headerSpacer: { width: 32 },
    inputSection: { padding: 12, backgroundColor: '#fff' },
    inputRow: { flexDirection: 'row' },
    input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16 },
    tabs: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: '#2563eb' },
    tabText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
    activeTabText: { color: '#2563eb' },
    scrollContent: { padding: 16 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 12, marginTop: 4 },
    strategyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    strategyCardActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
    strategyRadio: { marginRight: 12 },
    strategyName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
    strategyDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
    runBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginVertical: 16 },
    runBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    resultCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    resultTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12, textTransform: 'capitalize' },
    metricGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    metric: { width: '50%', marginBottom: 12 },
    metricLabel: { fontSize: 12, color: '#64748b' },
    metricValue: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginTop: 2 },
    positive: { color: '#22c55e' },
    negative: { color: '#ef4444' },
    tradeCount: { fontSize: 13, color: '#94a3b8', marginTop: 8, textAlign: 'center' },
    compCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
    compRank: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    compRankText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    compStrategy: { fontSize: 14, fontWeight: '700', color: '#1e293b', textTransform: 'capitalize' },
    compMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
    compFinal: { fontSize: 15, fontWeight: '700' },
});

export default BacktestingScreen;
