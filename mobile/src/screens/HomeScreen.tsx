import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarketSummaryResponse, stockAPI, SearchResult, Market, AVAILABLE_MARKETS, PortfolioResponse } from '../services/api';

interface Props {
    navigation: any;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMarket, setSelectedMarket] = useState<Market>('US');
    const [loading, setLoading] = useState(false);
    const [companyResults, setCompanyResults] = useState<SearchResult[]>([]);
    const [marketSummary, setMarketSummary] = useState<MarketSummaryResponse | null>(null);
    const [marketLoading, setMarketLoading] = useState(false);
    const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
    const [portfolioLoading, setPortfolioLoading] = useState(false);

    useEffect(() => {
        loadAll();
    }, [selectedMarket]);

    useEffect(() => {
        const id = setInterval(loadAll, 300000);
        return () => clearInterval(id);
    }, [selectedMarket]);

    const loadAll = () => {
        loadMarketSummary();
        loadPortfolioSnapshot();
    };

    const loadMarketSummary = async () => {
        try {
            setMarketLoading(true);
            setMarketSummary(await stockAPI.getMarketSummary(selectedMarket));
        } catch (e) {
            console.error('Market summary error:', e);
        } finally {
            setMarketLoading(false);
        }
    };

    const loadPortfolioSnapshot = async () => {
        try {
            setPortfolioLoading(true);
            setPortfolio(await stockAPI.getPortfolio());
        } catch (e) {
            console.error('Portfolio error:', e);
            setPortfolio(null);
        } finally {
            setPortfolioLoading(false);
        }
    };

    const handleSearch = async () => {
        const raw = searchQuery.trim();
        if (!raw) return;
        setCompanyResults([]);
        const sym = raw.toUpperCase();
        if (/^[A-Z0-9.^-]{1,10}$/.test(sym) && !raw.includes(' ')) {
            navigation.navigate('StockDetail', { symbol: sym });
            setSearchQuery('');
            return;
        }
        try {
            setLoading(true);
            const resp = await stockAPI.searchStocks(raw, 8);
            if (resp.results?.length) {
                setCompanyResults(resp.results);
            } else {
                Alert.alert('No Results', 'No matching companies found.');
            }
        } catch {
            Alert.alert('Error', 'Unable to search right now.');
        } finally {
            setLoading(false);
        }
    };

    const fmt = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
    const fmtPrice = (p: number) => p ? `$${p.toFixed(2)}` : 'N/A';

    const totalValue = portfolio?.summary?.total_equity ?? 0;
    const totalPL = portfolio?.summary?.total_profit ?? 0;
    const totalPct = portfolio?.summary?.total_profit_pct ?? 0;
    const holdingsCount = portfolio?.positions?.length ?? 0;

    const signal = useMemo(() => {
        if (!marketSummary?.quotes?.length) return null;
        const avg = marketSummary.quotes.reduce((a, q) => a + q.change_pct, 0) / marketSummary.quotes.length;
        return avg >= 0.5 ? 'Bullish' : avg <= -0.5 ? 'Bearish' : 'Neutral';
    }, [marketSummary]);

    const quickActions = [
        { icon: 'flash' as const, label: 'Strategy', screen: 'AnalysisSmartStrategy', color: '#6366f1' },
        { icon: 'calculator' as const, label: 'Valuation', screen: 'Valuation', color: '#0ea5e9' },
        { icon: 'notifications' as const, label: 'Alerts', screen: 'Alerts', color: '#10b981' },
        { icon: 'wallet' as const, label: 'Portfolio', screen: 'Dashboard', color: '#f59e0b' },
        { icon: 'analytics' as const, label: 'Analysis', screen: 'Analysis', color: '#8b5cf6' },
        { icon: 'school' as const, label: 'Learn', screen: 'Education', color: '#ec4899' },
    ];

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Stock Valuation</Text>
                <View style={styles.marketToggle}>
                    {Object.keys(AVAILABLE_MARKETS).map((m) => (
                        <TouchableOpacity
                            key={m}
                            style={[styles.marketPill, selectedMarket === m && styles.marketPillActive]}
                            onPress={() => setSelectedMarket(m as Market)}
                        >
                            <Text style={[styles.marketPillText, selectedMarket === m && styles.marketPillTextActive]}>
                                {m}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
                <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 10 }} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={`Search stocks (e.g. ${AVAILABLE_MARKETS[selectedMarket].featured_stocks[0]})`}
                    placeholderTextColor="#94a3b8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    autoCapitalize="characters"
                    returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => { setSearchQuery(''); setCompanyResults([]); }}>
                        <Ionicons name="close-circle" size={20} color="#cbd5e1" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Search Results */}
            {companyResults.length > 0 && (
                <View style={styles.card}>
                    {companyResults.map((r, i) => (
                        <TouchableOpacity
                            key={`${r.symbol}-${i}`}
                            style={styles.resultRow}
                            onPress={() => { navigation.navigate('StockDetail', { symbol: r.symbol }); setCompanyResults([]); setSearchQuery(''); }}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={styles.resultName} numberOfLines={1}>
                                    {r.longname || r.shortname || r.symbol}
                                </Text>
                                <Text style={styles.resultMeta}>{r.symbol}{r.exchange ? ` · ${r.exchange}` : ''}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Portfolio Card */}
            <TouchableOpacity style={styles.portfolioCard} onPress={() => navigation.navigate('Dashboard')} activeOpacity={0.7}>
                {portfolioLoading ? (
                    <ActivityIndicator color="#6366f1" />
                ) : totalValue > 0 ? (
                    <>
                        <View style={styles.portfolioTop}>
                            <View>
                                <Text style={styles.portfolioLabel}>Portfolio Value</Text>
                                <Text style={styles.portfolioValue}>{fmt(totalValue)}</Text>
                            </View>
                            <View style={styles.portfolioReturn}>
                                <Text style={[styles.portfolioPct, totalPct >= 0 ? styles.green : styles.red]}>
                                    {fmtPct(totalPct)}
                                </Text>
                                <Text style={[styles.portfolioPL, totalPL >= 0 ? styles.green : styles.red]}>
                                    {fmt(totalPL)}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.portfolioBottom}>
                            <Text style={styles.portfolioMeta}>{holdingsCount} holding{holdingsCount !== 1 ? 's' : ''}</Text>
                            <Text style={styles.portfolioLink}>View details →</Text>
                        </View>
                    </>
                ) : (
                    <View style={styles.emptyPortfolio}>
                        <Ionicons name="wallet-outline" size={28} color="#cbd5e1" />
                        <Text style={styles.emptyPortfolioText}>No holdings yet</Text>
                        <Text style={styles.portfolioLink}>Start building →</Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* Quick Actions */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionsRow} contentContainerStyle={{ paddingHorizontal: 16 }}>
                {quickActions.map((a) => (
                    <TouchableOpacity
                        key={a.screen}
                        style={styles.actionChip}
                        onPress={() => navigation.navigate(a.screen)}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: a.color + '18' }]}>
                            <Ionicons name={a.icon} size={18} color={a.color} />
                        </View>
                        <Text style={styles.actionLabel}>{a.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Market Pulse */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Market Pulse</Text>
                    {signal && (
                        <View style={[styles.signalBadge, signal === 'Bullish' ? styles.greenBg : signal === 'Bearish' ? styles.redBg : styles.neutralBg]}>
                            <Text style={styles.signalText}>{signal}</Text>
                        </View>
                    )}
                </View>
                {marketLoading ? (
                    <ActivityIndicator color="#6366f1" style={{ paddingVertical: 20 }} />
                ) : marketSummary ? (
                    <>
                        {marketSummary.index?.price != null && (
                            <View style={styles.indexRow}>
                                <Text style={styles.indexLabel}>{selectedMarket === 'NGX' ? 'NGX Index' : 'S&P 500'}</Text>
                                <Text style={styles.indexPrice}>
                                    {selectedMarket === 'NGX' ? '₦' : '$'}{marketSummary.index.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </Text>
                                <Text style={[styles.indexChange, marketSummary.index.change_pct >= 0 ? styles.green : styles.red]}>
                                    {fmtPct(marketSummary.index.change_pct)}
                                </Text>
                            </View>
                        )}
                        {marketSummary.gainers.length > 0 && (
                            <>
                                <Text style={styles.moversLabel}>Top Movers</Text>
                                {[...marketSummary.gainers.slice(0, 2), ...marketSummary.losers.slice(0, 2)].map((item, i) => (
                                    <TouchableOpacity
                                        key={`m-${item.symbol}-${i}`}
                                        style={styles.moverRow}
                                        onPress={() => navigation.navigate('StockDetail', { symbol: item.symbol })}
                                    >
                                        <Text style={styles.moverSymbol}>{item.symbol.replace('.NG', '')}</Text>
                                        <Text style={[styles.moverChange, item.change_pct >= 0 ? styles.green : styles.red]}>
                                            {fmtPct(item.change_pct)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </>
                        )}
                    </>
                ) : (
                    <Text style={styles.mutedText}>Market data unavailable</Text>
                )}
            </View>

            {/* Featured Stocks — from market summary */}
            <View style={[styles.card, { marginBottom: 40 }]}>
                <Text style={styles.cardTitle}>Featured</Text>
                {marketLoading ? (
                    <ActivityIndicator color="#6366f1" style={{ paddingVertical: 20 }} />
                ) : marketSummary?.quotes?.length ? (
                    marketSummary.quotes.slice(0, 6).map((q, i) => (
                        <TouchableOpacity
                            key={`${q.symbol}-${i}`}
                            style={styles.stockRow}
                            onPress={() => navigation.navigate('StockDetail', { symbol: q.symbol })}
                        >
                            <View style={styles.stockLeft}>
                                <Text style={styles.stockSymbol}>{q.symbol.replace('.NG', '')}</Text>
                            </View>
                            <View style={styles.stockRight}>
                                <Text style={styles.stockPrice}>{fmtPrice(q.price)}</Text>
                                <Text style={[styles.stockCap, q.change_pct >= 0 ? styles.green : styles.red]}>
                                    {fmtPct(q.change_pct)}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))
                ) : (
                    <Text style={styles.mutedText}>No stock data available</Text>
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
    /* ── Header ── */
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 12,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0f172a',
    },
    marketToggle: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        padding: 2,
    },
    marketPill: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 6,
    },
    marketPillActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 1,
    },
    marketPillText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#94a3b8',
    },
    marketPillTextActive: {
        color: '#0f172a',
    },
    /* ── Search ── */
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#0f172a',
        paddingVertical: 0,
    },
    /* ── Search Results ── */
    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    resultName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 2,
    },
    resultMeta: {
        fontSize: 12,
        color: '#94a3b8',
    },
    /* ── Card (reusable) ── */
    card: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 14,
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 8,
    },
    /* ── Portfolio ── */
    portfolioCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 14,
        padding: 18,
    },
    portfolioTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    portfolioLabel: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '500',
        marginBottom: 4,
    },
    portfolioValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0f172a',
    },
    portfolioReturn: {
        alignItems: 'flex-end',
    },
    portfolioPct: {
        fontSize: 18,
        fontWeight: '700',
    },
    portfolioPL: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    portfolioBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    portfolioMeta: {
        fontSize: 13,
        color: '#94a3b8',
    },
    portfolioLink: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6366f1',
    },
    emptyPortfolio: {
        alignItems: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    emptyPortfolioText: {
        fontSize: 14,
        color: '#94a3b8',
    },
    /* ── Quick Actions ── */
    actionsRow: {
        marginBottom: 12,
    },
    actionChip: {
        alignItems: 'center',
        marginRight: 16,
        width: 64,
    },
    actionIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    actionLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#475569',
        textAlign: 'center',
    },
    /* ── Market Pulse ── */
    signalBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    signalText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
    },
    greenBg: { backgroundColor: '#10b981' },
    redBg: { backgroundColor: '#ef4444' },
    neutralBg: { backgroundColor: '#94a3b8' },
    indexRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    indexLabel: {
        flex: 1,
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
    indexPrice: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0f172a',
        marginRight: 8,
    },
    indexChange: {
        fontSize: 13,
        fontWeight: '700',
        minWidth: 60,
        textAlign: 'right',
    },
    moversLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94a3b8',
        marginTop: 4,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    moverRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f8fafc',
    },
    moverSymbol: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
    },
    moverChange: {
        fontSize: 14,
        fontWeight: '700',
    },
    /* ── Featured Stocks ── */
    stockRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    stockLeft: {
        flex: 1,
        marginRight: 12,
    },
    stockSymbol: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0f172a',
    },
    stockRight: {
        alignItems: 'flex-end',
    },
    stockPrice: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0f172a',
    },
    stockCap: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 2,
    },
    /* ── Shared ── */
    green: { color: '#10b981' },
    red: { color: '#ef4444' },
    mutedText: {
        fontSize: 13,
        color: '#94a3b8',
        textAlign: 'center',
        paddingVertical: 16,
    },
});

export default HomeScreen;
