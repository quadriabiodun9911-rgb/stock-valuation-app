import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
    IntrinsicValueResponse,
    MarketAlertsResponse,
    MarketRankingsResponse,
    MarketSummaryResponse,
    PortfolioResponse,
    stockAPI,
} from '../services/api';

const IntelligenceScreen: React.FC = () => {
    const [market, setMarket] = useState<MarketSummaryResponse | null>(null);
    const [alerts, setAlerts] = useState<MarketAlertsResponse | null>(null);
    const [rankings, setRankings] = useState<MarketRankingsResponse | null>(null);
    const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [symbol, setSymbol] = useState('');
    const [shares, setShares] = useState('');
    const [buyPrice, setBuyPrice] = useState('');
    const [intrinsicSymbol, setIntrinsicSymbol] = useState('');
    const [intrinsic, setIntrinsic] = useState<IntrinsicValueResponse | null>(null);
    const [intrinsicLoading, setIntrinsicLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const intervalId = setInterval(() => {
            loadData();
        }, 60000);

        return () => clearInterval(intervalId);
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const portfolioData = await stockAPI.getPortfolio();
            const symbols = portfolioData.positions.map((pos) => pos.symbol);
            const [marketData, alertData, rankingData] = await Promise.all([
                stockAPI.getNgxMarketSummary(symbols.length ? symbols : undefined),
                stockAPI.getNgxMarketAlerts(symbols.length ? symbols : undefined, false),
                stockAPI.getNgxMarketRankings(),
            ]);
            setPortfolio(portfolioData);
            setMarket(marketData);
            setAlerts(alertData);
            setRankings(rankingData);
        } catch (error) {
            Alert.alert('Error', 'Unable to load market intelligence data.');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

    const performanceSummary = useMemo(() => {
        if (!portfolio) return null;
        return {
            totalValue: portfolio.summary.total_equity,
            totalProfit: portfolio.summary.total_profit,
            totalProfitPct: portfolio.summary.total_profit_pct,
            best: portfolio.summary.best_performer,
            worst: portfolio.summary.worst_performer,
        };
    }, [portfolio]);

    const handleAddPosition = async () => {
        if (!portfolio) return;
        const trimmedSymbol = symbol.trim().toUpperCase();
        const parsedShares = Number(shares);
        const parsedBuy = Number(buyPrice);

        if (!trimmedSymbol || Number.isNaN(parsedShares) || Number.isNaN(parsedBuy)) {
            Alert.alert('Invalid Input', 'Enter a symbol, buy price, and shares.');
            return;
        }

        if (parsedShares <= 0 || parsedBuy <= 0) {
            Alert.alert('Invalid Input', 'Shares and buy price must be positive.');
            return;
        }

        const nextPositions = portfolio.positions.map((pos) => ({
            symbol: pos.symbol,
            shares: pos.shares,
            cost_basis: pos.cost_basis,
        }));

        const existing = nextPositions.find((pos) => pos.symbol.toUpperCase() === trimmedSymbol);
        if (existing) {
            const totalShares = existing.shares + parsedShares;
            const totalCost = existing.shares * existing.cost_basis + parsedShares * parsedBuy;
            existing.shares = totalShares;
            existing.cost_basis = totalShares > 0 ? totalCost / totalShares : parsedBuy;
        } else {
            nextPositions.push({
                symbol: trimmedSymbol,
                shares: parsedShares,
                cost_basis: parsedBuy,
            });
        }

        try {
            await stockAPI.updatePortfolio({ positions: nextPositions, cash: portfolio.cash });
            setSymbol('');
            setShares('');
            setBuyPrice('');
            await loadData();
        } catch (error) {
            Alert.alert('Error', 'Failed to save position.');
        }
    };

    const handleIntrinsicLookup = async () => {
        const trimmed = intrinsicSymbol.trim().toUpperCase();
        if (!trimmed) {
            Alert.alert('Invalid Input', 'Enter a stock symbol.');
            return;
        }

        try {
            setIntrinsicLoading(true);
            const result = await stockAPI.getIntrinsicValue(trimmed);
            setIntrinsic(result);
        } catch (error) {
            Alert.alert('Error', 'Unable to calculate intrinsic value.');
        } finally {
            setIntrinsicLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Loading intelligence...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
                <Text style={styles.headerTitle}>Market Intelligence</Text>
                <Text style={styles.headerSubtitle}>NGX live insights and portfolio analytics</Text>
            </LinearGradient>

            {performanceSummary && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Portfolio Snapshot</Text>
                    <View style={styles.card}>
                        <View style={styles.rowBetween}>
                            <Text style={styles.cardLabel}>Portfolio Value</Text>
                            <Text style={styles.cardValue}>{formatCurrency(performanceSummary.totalValue)}</Text>
                        </View>
                        <View style={styles.rowBetween}>
                            <Text style={styles.cardLabel}>Total P/L</Text>
                            <Text style={performanceSummary.totalProfit >= 0 ? styles.positiveValue : styles.negativeValue}>
                                {formatCurrency(performanceSummary.totalProfit)} ({formatPercent(performanceSummary.totalProfitPct)})
                            </Text>
                        </View>
                        {performanceSummary.best && (
                            <View style={styles.rowBetween}>
                                <Text style={styles.cardLabel}>Best Performer</Text>
                                <Text style={styles.positiveValue}>
                                    {performanceSummary.best.symbol} {formatPercent(performanceSummary.best.profit_pct)}
                                </Text>
                            </View>
                        )}
                        {performanceSummary.worst && (
                            <View style={styles.rowBetween}>
                                <Text style={styles.cardLabel}>Worst Performer</Text>
                                <Text style={styles.negativeValue}>
                                    {performanceSummary.worst.symbol} {formatPercent(performanceSummary.worst.profit_pct)}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            )}

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Add Holding</Text>
                <View style={styles.formCard}>
                    <TextInput
                        style={styles.input}
                        placeholder="Stock symbol (e.g., DANGCEM)"
                        value={symbol}
                        onChangeText={setSymbol}
                        autoCapitalize="characters"
                    />
                    <View style={styles.inputRow}>
                        <TextInput
                            style={[styles.input, styles.inputHalf]}
                            placeholder="Buy price"
                            value={buyPrice}
                            onChangeText={setBuyPrice}
                            keyboardType="decimal-pad"
                        />
                        <TextInput
                            style={[styles.input, styles.inputHalf]}
                            placeholder="Shares"
                            value={shares}
                            onChangeText={setShares}
                            keyboardType="decimal-pad"
                        />
                    </View>
                    <TouchableOpacity style={styles.primaryButton} onPress={handleAddPosition}>
                        <Ionicons name="add" size={18} color="#fff" />
                        <Text style={styles.primaryButtonText}>Save Holding</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {market && (
                <>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Smart Alerts</Text>
                        <View style={styles.card}>
                            {alerts?.locked ? (
                                <Text style={styles.lockedText}>Premium required for alerts.</Text>
                            ) : alerts?.alerts.length ? (
                                alerts.alerts.map((alert) => (
                                    <View key={`${alert.symbol}-${alert.type}`} style={styles.rowBetween}>
                                        <Text style={styles.cardLabel}>{alert.symbol.replace('.NG', '')}</Text>
                                        <Text style={styles.cardValue}>{alert.message}</Text>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.cardLabel}>No alerts triggered.</Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Stock Rankings</Text>
                        <View style={styles.card}>
                            <Text style={styles.subTitle}>Top Momentum</Text>
                            {rankings?.rankings.momentum.map((item) => (
                                <View key={`m-${item.symbol}`} style={styles.rowBetween}>
                                    <Text style={styles.cardLabel}>{item.symbol.replace('.NG', '')}</Text>
                                    <Text style={styles.positiveValue}>{formatPercent(item.score)}</Text>
                                </View>
                            ))}
                            <Text style={styles.subTitle}>Top Dividend</Text>
                            {rankings?.rankings.dividend.map((item) => (
                                <View key={`d-${item.symbol}`} style={styles.rowBetween}>
                                    <Text style={styles.cardLabel}>{item.symbol.replace('.NG', '')}</Text>
                                    <Text style={styles.cardValue}>{item.score.toFixed(2)}%</Text>
                                </View>
                            ))}
                            <Text style={styles.subTitle}>Top Value</Text>
                            {rankings?.rankings.value.map((item) => (
                                <View key={`v-${item.symbol}`} style={styles.rowBetween}>
                                    <Text style={styles.cardLabel}>{item.symbol.replace('.NG', '')}</Text>
                                    <Text style={styles.cardValue}>{item.score.toFixed(4)}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Intrinsic Value</Text>
                        <View style={styles.formCard}>
                            <TextInput
                                style={styles.input}
                                placeholder="Stock symbol (e.g., MTNN)"
                                value={intrinsicSymbol}
                                onChangeText={setIntrinsicSymbol}
                                autoCapitalize="characters"
                            />
                            <TouchableOpacity style={styles.primaryButton} onPress={handleIntrinsicLookup}>
                                <Ionicons name="calculator" size={18} color="#fff" />
                                <Text style={styles.primaryButtonText}>Check Intrinsic Value</Text>
                            </TouchableOpacity>
                            {intrinsicLoading && (
                                <View style={styles.inlineLoading}>
                                    <ActivityIndicator size="small" color="#2563eb" />
                                </View>
                            )}
                            {intrinsic && (
                                <View style={styles.card}>
                                    <View style={styles.rowBetween}>
                                        <Text style={styles.cardLabel}>Market price</Text>
                                        <Text style={styles.cardValue}>{formatCurrency(intrinsic.market_price)}</Text>
                                    </View>
                                    <View style={styles.rowBetween}>
                                        <Text style={styles.cardLabel}>Intrinsic value</Text>
                                        <Text style={styles.cardValue}>{formatCurrency(intrinsic.intrinsic_value)}</Text>
                                    </View>
                                    <View style={styles.rowBetween}>
                                        <Text style={styles.cardLabel}>Margin of safety</Text>
                                        <Text style={intrinsic.margin_of_safety >= 0 ? styles.positiveValue : styles.negativeValue}>
                                            {formatPercent(intrinsic.margin_of_safety)}
                                        </Text>
                                    </View>
                                    <View style={styles.rowBetween}>
                                        <Text style={styles.cardLabel}>Signal</Text>
                                        <Text style={styles.cardValue}>{intrinsic.signal}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Live NGX Prices</Text>
                        <View style={styles.card}>
                            {market.quotes.map((quote) => (
                                <View key={quote.symbol} style={styles.rowBetween}>
                                    <Text style={styles.cardLabel}>{quote.symbol.replace('.NG', '')}</Text>
                                    <Text style={styles.cardValue}>{formatCurrency(quote.price)}</Text>
                                    <Text style={quote.change_pct >= 0 ? styles.positiveValue : styles.negativeValue}>
                                        {formatPercent(quote.change_pct)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Daily % Gainers & Losers</Text>
                        <View style={styles.card}>
                            <Text style={styles.subTitle}>Top Gainers</Text>
                            {market.gainers.map((quote) => (
                                <View key={`g-${quote.symbol}`} style={styles.rowBetween}>
                                    <Text style={styles.cardLabel}>{quote.symbol.replace('.NG', '')}</Text>
                                    <Text style={styles.positiveValue}>{formatPercent(quote.change_pct)}</Text>
                                </View>
                            ))}
                            <Text style={styles.subTitle}>Top Losers</Text>
                            {market.losers.map((quote) => (
                                <View key={`l-${quote.symbol}`} style={styles.rowBetween}>
                                    <Text style={styles.cardLabel}>{quote.symbol.replace('.NG', '')}</Text>
                                    <Text style={styles.negativeValue}>{formatPercent(quote.change_pct)}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Volume Leaders</Text>
                        <View style={styles.card}>
                            {market.volume_leaders.map((quote) => (
                                <View key={`v-${quote.symbol}`} style={styles.rowBetween}>
                                    <Text style={styles.cardLabel}>{quote.symbol.replace('.NG', '')}</Text>
                                    <Text style={styles.cardValue}>{quote.volume.toLocaleString()}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Sector Performance</Text>
                        <View style={styles.card}>
                            {market.sectors.map((sector) => (
                                <View key={sector.sector} style={styles.rowBetween}>
                                    <Text style={styles.cardLabel}>{sector.sector}</Text>
                                    <Text style={sector.avg_change_pct >= 0 ? styles.positiveValue : styles.negativeValue}>
                                        {formatPercent(sector.avg_change_pct)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </>
            )}
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
    subTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1e293b',
        marginTop: 12,
        marginBottom: 6,
    },
    card: {
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 16,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 3,
    },
    formCard: {
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 16,
        gap: 10,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 3,
    },
    input: {
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#0f172a',
    },
    inputRow: {
        flexDirection: 'row',
        gap: 10,
    },
    inputHalf: {
        flex: 1,
    },
    primaryButton: {
        marginTop: 4,
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
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 6,
    },
    cardLabel: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '600',
        flex: 1,
    },
    cardValue: {
        fontSize: 14,
        color: '#0f172a',
        fontWeight: '700',
        flex: 1,
        textAlign: 'right',
    },
    positiveValue: {
        fontSize: 14,
        color: '#16a34a',
        fontWeight: '700',
        flex: 1,
        textAlign: 'right',
    },
    negativeValue: {
        fontSize: 14,
        color: '#dc2626',
        fontWeight: '700',
        flex: 1,
        textAlign: 'right',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#f8fafc',
    },
    loadingText: {
        marginTop: 12,
        color: '#475569',
        fontSize: 14,
        fontWeight: '600',
    },
    lockedText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#f97316',
    },
    inlineLoading: {
        paddingVertical: 8,
        alignItems: 'center',
    },
});

export default IntelligenceScreen;
