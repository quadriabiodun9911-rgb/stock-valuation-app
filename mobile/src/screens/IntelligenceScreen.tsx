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
    TradeReasonEntry,
    TradeReasonSummary,
    TrendingTradeReason,
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

    // Trade-reasons state
    const [tradeSymbol, setTradeSymbol] = useState('');
    const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy');
    const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
    const [tradeNote, setTradeNote] = useState('');
    const [tradeConfidence, setTradeConfidence] = useState(3);
    const [buyTags, setBuyTags] = useState<string[]>([]);
    const [sellTags, setSellTags] = useState<string[]>([]);
    const [tradeSummary, setTradeSummary] = useState<TradeReasonSummary | null>(null);
    const [summarySymbol, setSummarySymbol] = useState('');
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [trending, setTrending] = useState<TrendingTradeReason[]>([]);
    const [feed, setFeed] = useState<TradeReasonEntry[]>([]);

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
            const [marketData, alertData, rankingData, tagsData, trendingData, feedData] = await Promise.all([
                stockAPI.getNgxMarketSummary(symbols.length ? symbols : undefined),
                stockAPI.getNgxMarketAlerts(symbols.length ? symbols : undefined, false),
                stockAPI.getNgxMarketRankings(),
                stockAPI.getTradeReasonTags(),
                stockAPI.getTrendingTradeReasons(10),
                stockAPI.getTradeReasonFeed(20),
            ]);
            setPortfolio(portfolioData);
            setMarket(marketData);
            setAlerts(alertData);
            setRankings(rankingData);
            setBuyTags(tagsData.buy_reasons);
            setSellTags(tagsData.sell_reasons);
            setTrending(trendingData.trending);
            setFeed(feedData.feed);
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

    const toggleReason = (reason: string) => {
        setSelectedReasons((prev) =>
            prev.includes(reason) ? prev.filter((r) => r !== reason) : prev.length < 5 ? [...prev, reason] : prev
        );
    };

    const handleSubmitReason = async () => {
        const trimmed = tradeSymbol.trim().toUpperCase();
        if (!trimmed) {
            Alert.alert('Missing symbol', 'Enter a stock symbol.');
            return;
        }
        if (!selectedReasons.length) {
            Alert.alert('Select reasons', 'Pick at least one reason.');
            return;
        }
        try {
            await stockAPI.submitTradeReason({
                symbol: trimmed,
                action: tradeAction,
                reasons: selectedReasons,
                note: tradeNote || undefined,
                confidence: tradeConfidence,
            });
            Alert.alert('Saved', `Your ${tradeAction} reasoning for ${trimmed} has been recorded.`);
            setTradeSymbol('');
            setSelectedReasons([]);
            setTradeNote('');
            setTradeConfidence(3);
            // Refresh trending & feed
            const [trendingData, feedData] = await Promise.all([
                stockAPI.getTrendingTradeReasons(10),
                stockAPI.getTradeReasonFeed(20),
            ]);
            setTrending(trendingData.trending);
            setFeed(feedData.feed);
        } catch {
            Alert.alert('Error', 'Failed to save reasoning.');
        }
    };

    const handleLookupSummary = async () => {
        const trimmed = summarySymbol.trim().toUpperCase();
        if (!trimmed) return;
        try {
            setSummaryLoading(true);
            const data = await stockAPI.getTradeReasonSummary(trimmed);
            setTradeSummary(data);
        } catch {
            Alert.alert('Error', 'Failed to load reasoning for that symbol.');
        } finally {
            setSummaryLoading(false);
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
                <Text style={styles.headerSubtitle}>NGX live insights, portfolio analytics & crowd intelligence</Text>
            </LinearGradient>

            {/* ── Why People Buy & Sell ─────────────────────── */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                    <Ionicons name="people" size={18} color="#2563eb" /> Why People Buy & Sell
                </Text>

                {/* Action toggle (Buy / Sell) */}
                <View style={styles.toggleRow}>
                    <TouchableOpacity
                        style={[styles.toggleButton, tradeAction === 'buy' && styles.toggleActive]}
                        onPress={() => { setTradeAction('buy'); setSelectedReasons([]); }}
                    >
                        <Ionicons name="trending-up" size={16} color={tradeAction === 'buy' ? '#fff' : '#16a34a'} />
                        <Text style={[styles.toggleText, tradeAction === 'buy' && styles.toggleTextActive]}>Buying</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, tradeAction === 'sell' && styles.toggleActiveSell]}
                        onPress={() => { setTradeAction('sell'); setSelectedReasons([]); }}
                    >
                        <Ionicons name="trending-down" size={16} color={tradeAction === 'sell' ? '#fff' : '#dc2626'} />
                        <Text style={[styles.toggleText, tradeAction === 'sell' && styles.toggleTextActive]}>Selling</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.formCard}>
                    <TextInput
                        style={styles.input}
                        placeholder="Stock symbol (e.g., AAPL)"
                        value={tradeSymbol}
                        onChangeText={setTradeSymbol}
                        autoCapitalize="characters"
                    />

                    {/* Reason tags */}
                    <Text style={styles.subTitle}>Select your reasons (up to 5)</Text>
                    <View style={styles.tagWrap}>
                        {(tradeAction === 'buy' ? buyTags : sellTags).map((tag) => (
                            <TouchableOpacity
                                key={tag}
                                style={[styles.tag, selectedReasons.includes(tag) && (tradeAction === 'buy' ? styles.tagSelectedBuy : styles.tagSelectedSell)]}
                                onPress={() => toggleReason(tag)}
                            >
                                <Text style={[styles.tagText, selectedReasons.includes(tag) && styles.tagTextSelected]}>
                                    {tag}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Confidence */}
                    <Text style={styles.subTitle}>Confidence level</Text>
                    <View style={styles.confidenceRow}>
                        {[1, 2, 3, 4, 5].map((level) => (
                            <TouchableOpacity
                                key={level}
                                onPress={() => setTradeConfidence(level)}
                                style={[styles.confDot, tradeConfidence >= level && styles.confDotActive]}
                            >
                                <Text style={[styles.confText, tradeConfidence >= level && styles.confTextActive]}>{level}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Optional note */}
                    <TextInput
                        style={[styles.input, { minHeight: 48 }]}
                        placeholder="Add a brief note (optional)"
                        value={tradeNote}
                        onChangeText={setTradeNote}
                        maxLength={280}
                        multiline
                    />

                    <TouchableOpacity style={[styles.primaryButton, tradeAction === 'sell' && { backgroundColor: '#dc2626' }]} onPress={handleSubmitReason}>
                        <Ionicons name="send" size={16} color="#fff" />
                        <Text style={styles.primaryButtonText}>Submit {tradeAction === 'buy' ? 'Buy' : 'Sell'} Reasoning</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Lookup crowd reasoning for a stock ──────── */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                    <Ionicons name="search" size={18} color="#2563eb" /> Crowd Reasoning Lookup
                </Text>
                <View style={styles.formCard}>
                    <TextInput
                        style={styles.input}
                        placeholder="Stock symbol (e.g., AAPL)"
                        value={summarySymbol}
                        onChangeText={setSummarySymbol}
                        autoCapitalize="characters"
                    />
                    <TouchableOpacity style={styles.primaryButton} onPress={handleLookupSummary}>
                        <Ionicons name="bar-chart" size={16} color="#fff" />
                        <Text style={styles.primaryButtonText}>See Why People Trade This</Text>
                    </TouchableOpacity>
                    {summaryLoading && (
                        <View style={styles.inlineLoading}>
                            <ActivityIndicator size="small" color="#2563eb" />
                        </View>
                    )}
                    {tradeSummary && (
                        <View style={styles.card}>
                            <Text style={styles.subTitle}>{tradeSummary.symbol} — {tradeSummary.total_submissions} submissions</Text>

                            <View style={styles.sentimentBar}>
                                <View style={[styles.sentimentBuy, { flex: tradeSummary.buy.count || 0.1 }]} />
                                <View style={[styles.sentimentSell, { flex: tradeSummary.sell.count || 0.1 }]} />
                            </View>
                            <View style={styles.rowBetween}>
                                <Text style={styles.positiveValue}>{tradeSummary.buy.count} buy</Text>
                                <Text style={styles.negativeValue}>{tradeSummary.sell.count} sell</Text>
                            </View>

                            {tradeSummary.buy.top_reasons.length > 0 && (
                                <>
                                    <Text style={styles.subTitle}>Top Buy Reasons</Text>
                                    {tradeSummary.buy.top_reasons.slice(0, 5).map((r) => (
                                        <View key={r.reason} style={styles.rowBetween}>
                                            <Text style={styles.cardLabel}>{r.reason}</Text>
                                            <Text style={styles.positiveValue}>{r.pct}%</Text>
                                        </View>
                                    ))}
                                </>
                            )}

                            {tradeSummary.sell.top_reasons.length > 0 && (
                                <>
                                    <Text style={styles.subTitle}>Top Sell Reasons</Text>
                                    {tradeSummary.sell.top_reasons.slice(0, 5).map((r) => (
                                        <View key={r.reason} style={styles.rowBetween}>
                                            <Text style={styles.cardLabel}>{r.reason}</Text>
                                            <Text style={styles.negativeValue}>{r.pct}%</Text>
                                        </View>
                                    ))}
                                </>
                            )}

                            {tradeSummary.recent.length > 0 && (
                                <>
                                    <Text style={styles.subTitle}>Recent Activity</Text>
                                    {tradeSummary.recent.slice(0, 5).map((entry, idx) => (
                                        <View key={idx} style={styles.feedItem}>
                                            <View style={styles.rowBetween}>
                                                <Text style={entry.action === 'buy' ? styles.positiveValue : styles.negativeValue}>
                                                    {entry.action.toUpperCase()}
                                                </Text>
                                                <Text style={styles.feedTime}>{new Date(entry.timestamp).toLocaleDateString()}</Text>
                                            </View>
                                            <Text style={styles.feedReasons}>{entry.reasons.join(', ')}</Text>
                                            {entry.note ? <Text style={styles.feedNote}>"{entry.note}"</Text> : null}
                                        </View>
                                    ))}
                                </>
                            )}
                        </View>
                    )}
                </View>
            </View>

            {/* ── Trending trade activity ─────────────────── */}
            {trending.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        <Ionicons name="flame" size={18} color="#f97316" /> Trending — Most Discussed
                    </Text>
                    <View style={styles.card}>
                        {trending.map((t) => (
                            <View key={t.symbol} style={styles.rowBetween}>
                                <Text style={styles.cardLabel}>{t.symbol}</Text>
                                <Text style={styles.positiveValue}>{t.buy} buy</Text>
                                <Text style={styles.negativeValue}>{t.sell} sell</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* ── Live feed ───────────────────────────────── */}
            {feed.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        <Ionicons name="chatbubbles" size={18} color="#2563eb" /> Live Feed
                    </Text>
                    <View style={styles.card}>
                        {feed.slice(0, 10).map((entry, idx) => (
                            <View key={idx} style={styles.feedItem}>
                                <View style={styles.rowBetween}>
                                    <Text style={styles.cardLabel}>{entry.symbol}</Text>
                                    <Text style={entry.action === 'buy' ? styles.positiveValue : styles.negativeValue}>
                                        {entry.action.toUpperCase()}
                                    </Text>
                                    <Text style={styles.feedTime}>{new Date(entry.timestamp).toLocaleDateString()}</Text>
                                </View>
                                <Text style={styles.feedReasons}>{entry.reasons.join(', ')}</Text>
                                {entry.note ? <Text style={styles.feedNote}>"{entry.note}"</Text> : null}
                            </View>
                        ))}
                    </View>
                </View>
            )}

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
    toggleRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    toggleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#f1f5f9',
    },
    toggleActive: {
        backgroundColor: '#16a34a',
    },
    toggleActiveSell: {
        backgroundColor: '#dc2626',
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#475569',
    },
    toggleTextActive: {
        color: '#fff',
    },
    tagWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },
    tag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    tagSelectedBuy: {
        backgroundColor: '#dcfce7',
        borderColor: '#16a34a',
    },
    tagSelectedSell: {
        backgroundColor: '#fee2e2',
        borderColor: '#dc2626',
    },
    tagText: {
        fontSize: 12,
        color: '#475569',
        fontWeight: '600',
    },
    tagTextSelected: {
        color: '#0f172a',
    },
    confidenceRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    confDot: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confDotActive: {
        backgroundColor: '#2563eb',
    },
    confText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#475569',
    },
    confTextActive: {
        color: '#fff',
    },
    sentimentBar: {
        flexDirection: 'row',
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginVertical: 8,
    },
    sentimentBuy: {
        backgroundColor: '#16a34a',
    },
    sentimentSell: {
        backgroundColor: '#dc2626',
    },
    feedItem: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    feedTime: {
        fontSize: 12,
        color: '#94a3b8',
    },
    feedReasons: {
        fontSize: 12,
        color: '#475569',
        marginTop: 2,
    },
    feedNote: {
        fontSize: 12,
        fontStyle: 'italic',
        color: '#64748b',
        marginTop: 2,
    },
});

export default IntelligenceScreen;
