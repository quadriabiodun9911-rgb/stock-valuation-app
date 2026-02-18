import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenerResponse, stockAPI } from '../services/api';

const ScreenerScreen: React.FC = () => {
    const [results, setResults] = useState<ScreenerResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [minChange, setMinChange] = useState('');
    const [minVolume, setMinVolume] = useState('');
    const [minDividend, setMinDividend] = useState('');
    const [maxPe, setMaxPe] = useState('');
    const [minScore, setMinScore] = useState('');
    const [minMomentum, setMinMomentum] = useState('');
    const [maxVolatility, setMaxVolatility] = useState('');
    const [sector, setSector] = useState('');
    const [signal, setSignal] = useState('');

    useEffect(() => {
        runScreener();
    }, []);

    const runScreener = async () => {
        try {
            setLoading(true);
            const response = await stockAPI.getNgxScreener({
                min_price: minPrice ? Number(minPrice) : undefined,
                max_price: maxPrice ? Number(maxPrice) : undefined,
                min_change: minChange ? Number(minChange) : undefined,
                min_volume: minVolume ? Number(minVolume) : undefined,
                min_dividend: minDividend ? Number(minDividend) : undefined,
                max_pe: maxPe ? Number(maxPe) : undefined,
                min_score: minScore ? Number(minScore) : undefined,
                min_momentum: minMomentum ? Number(minMomentum) : undefined,
                max_volatility: maxVolatility ? Number(maxVolatility) : undefined,
                sector: sector ? sector.trim() : undefined,
                signal: signal ? signal.trim() : undefined,
            });
            setResults(response);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
                <Text style={styles.headerTitle}>AI Screener</Text>
                <Text style={styles.headerSubtitle}>Filter NGX stocks by signals and fundamentals</Text>
            </LinearGradient>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Filters</Text>
                <View style={styles.filterCard}>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={[styles.input, styles.inputHalf]}
                            placeholder="Min Price"
                            value={minPrice}
                            onChangeText={setMinPrice}
                            keyboardType="decimal-pad"
                        />
                        <TextInput
                            style={[styles.input, styles.inputHalf]}
                            placeholder="Max Price"
                            value={maxPrice}
                            onChangeText={setMaxPrice}
                            keyboardType="decimal-pad"
                        />
                    </View>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={[styles.input, styles.inputHalf]}
                            placeholder="Min % Change"
                            value={minChange}
                            onChangeText={setMinChange}
                            keyboardType="decimal-pad"
                        />
                        <TextInput
                            style={[styles.input, styles.inputHalf]}
                            placeholder="Min Volume"
                            value={minVolume}
                            onChangeText={setMinVolume}
                            keyboardType="number-pad"
                        />
                    </View>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={[styles.input, styles.inputHalf]}
                            placeholder="Min Dividend %"
                            value={minDividend}
                            onChangeText={setMinDividend}
                            keyboardType="decimal-pad"
                        />
                        <TextInput
                            style={[styles.input, styles.inputHalf]}
                            placeholder="Max P/E"
                            value={maxPe}
                            onChangeText={setMaxPe}
                            keyboardType="decimal-pad"
                        />
                    </View>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={[styles.input, styles.inputHalf]}
                            placeholder="Min Momentum %"
                            value={minMomentum}
                            onChangeText={setMinMomentum}
                            keyboardType="decimal-pad"
                        />
                        <TextInput
                            style={[styles.input, styles.inputHalf]}
                            placeholder="Max Volatility"
                            value={maxVolatility}
                            onChangeText={setMaxVolatility}
                            keyboardType="decimal-pad"
                        />
                    </View>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={[styles.input, styles.inputHalf]}
                            placeholder="Sector (e.g., Banking)"
                            value={sector}
                            onChangeText={setSector}
                        />
                        <TextInput
                            style={[styles.input, styles.inputHalf]}
                            placeholder="Signal (Buy/Watch/Avoid)"
                            value={signal}
                            onChangeText={setSignal}
                            autoCapitalize="characters"
                        />
                    </View>
                    <TextInput
                        style={styles.input}
                        placeholder="Min AI Score"
                        value={minScore}
                        onChangeText={setMinScore}
                        keyboardType="decimal-pad"
                    />
                    <TouchableOpacity style={styles.primaryButton} onPress={runScreener}>
                        <Ionicons name="filter" size={18} color="#fff" />
                        <Text style={styles.primaryButtonText}>Run Screener</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Results</Text>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#2563eb" />
                        <Text style={styles.loadingText}>Running AI screener...</Text>
                    </View>
                ) : results?.results.length ? (
                    results.results.map((item) => (
                        <View key={item.symbol} style={styles.resultCard}>
                            <View style={styles.resultHeader}>
                                <Text style={styles.resultSymbol}>{item.symbol.replace('.NG', '')}</Text>
                                <Text style={styles.resultSignal}>{item.signal}</Text>
                            </View>
                            <Text style={styles.resultName}>{item.name}</Text>
                            <View style={styles.resultRow}>
                                <Text style={styles.resultLabel}>Price</Text>
                                <Text style={styles.resultValue}>₦{item.price.toFixed(2)}</Text>
                            </View>
                            <View style={styles.resultRow}>
                                <Text style={styles.resultLabel}>Change</Text>
                                <Text style={item.change_pct >= 0 ? styles.positiveValue : styles.negativeValue}>
                                    {item.change_pct.toFixed(2)}%
                                </Text>
                            </View>
                            <View style={styles.resultRow}>
                                <Text style={styles.resultLabel}>Dividend</Text>
                                <Text style={styles.resultValue}>{item.dividend_yield.toFixed(2)}%</Text>
                            </View>
                            <View style={styles.resultRow}>
                                <Text style={styles.resultLabel}>Momentum</Text>
                                <Text style={styles.resultValue}>{item.momentum.toFixed(2)}%</Text>
                            </View>
                            <View style={styles.resultRow}>
                                <Text style={styles.resultLabel}>AI Score</Text>
                                <Text style={styles.resultValue}>{item.ai_score.toFixed(2)}</Text>
                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={styles.emptyText}>No matches found. Try different filters.</Text>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        paddingTop: 56,
        paddingHorizontal: 24,
        paddingBottom: 28,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerTitle: {
        color: '#f8fafc',
        fontSize: 22,
        fontWeight: '700',
    },
    headerSubtitle: {
        color: '#cbd5f5',
        marginTop: 6,
        fontSize: 14,
    },
    section: {
        paddingHorizontal: 20,
        paddingTop: 22,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 12,
    },
    filterCard: {
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 16,
        gap: 10,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 10,
    },
    input: {
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#0f172a',
    },
    inputHalf: {
        flex: 1,
    },
    primaryButton: {
        marginTop: 6,
        backgroundColor: '#2563eb',
        borderRadius: 10,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    primaryButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    loadingText: {
        marginTop: 10,
        color: '#475569',
        fontSize: 14,
    },
    resultCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    resultSymbol: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
    },
    resultSignal: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2563eb',
        textTransform: 'uppercase',
    },
    resultName: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 10,
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    resultLabel: {
        fontSize: 13,
        color: '#64748b',
    },
    resultValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0f172a',
    },
    positiveValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#16a34a',
    },
    negativeValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#dc2626',
    },
    emptyText: {
        fontSize: 14,
        color: '#64748b',
    },
});

export default ScreenerScreen;
