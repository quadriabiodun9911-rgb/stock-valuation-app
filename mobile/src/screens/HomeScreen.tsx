import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Animated,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MarketSummaryResponse, stockAPI, SearchResult, Market, AVAILABLE_MARKETS, PortfolioResponse } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { SkeletonCard } from '../components/SkeletonLoader';

interface Props {
    navigation: any;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
    const { user } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMarket, setSelectedMarket] = useState<Market>('US');
    const [loading, setLoading] = useState(false);
    const [companyResults, setCompanyResults] = useState<SearchResult[]>([]);
    const [marketSummary, setMarketSummary] = useState<MarketSummaryResponse | null>(null);
    const [marketLoading, setMarketLoading] = useState(false);
    const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
    const [portfolioLoading, setPortfolioLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [briefing, setBriefing] = useState<any>(null);
    const [briefingLoading, setBriefingLoading] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        loadAll();
    }, [selectedMarket]);

    useEffect(() => {
        const id = setInterval(loadAll, 300000);
        return () => clearInterval(id);
    }, [selectedMarket]);

    const loadAll = async () => {
        loadMarketSummary();
        loadPortfolioSnapshot();
        loadBriefing();
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAll();
        setRefreshing(false);
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

    const loadBriefing = async () => {
        try {
            setBriefingLoading(true);
            setBriefing(await stockAPI.getDailyBriefing());
        } catch (e) {
            console.error('Briefing error:', e);
        } finally {
            setBriefingLoading(false);
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
        { icon: 'search' as const, label: 'Discover', screen: 'Search', color: '#2563eb', gradient: ['#2563eb', '#3b82f6'] as const },
        { icon: 'wallet' as const, label: 'Portfolio', screen: 'Dashboard', color: '#f59e0b', gradient: ['#f59e0b', '#fbbf24'] as const },
        { icon: 'calculator' as const, label: 'Valuation', screen: 'Valuation', color: '#0ea5e9', gradient: ['#0ea5e9', '#38bdf8'] as const },
        { icon: 'grid' as const, label: 'Tools', screen: 'Charts', color: '#7c3aed', gradient: ['#7c3aed', '#8b5cf6'] as const },
        { icon: 'notifications' as const, label: 'Alerts', screen: 'PriceAlerts', color: '#ef4444', gradient: ['#ef4444', '#f87171'] as const },
        { icon: 'people' as const, label: 'Community', screen: 'Crowd', color: '#14b8a6', gradient: ['#14b8a6', '#2dd4bf'] as const },
        { icon: 'bookmark' as const, label: 'Watchlist', screen: 'Watchlist', color: '#1e293b', gradient: ['#1e293b', '#475569'] as const },
        { icon: 'sparkles' as const, label: 'AI Chat', screen: 'AIChat', color: '#8b5cf6', gradient: ['#8b5cf6', '#a78bfa'] as const },
    ];

    const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening';

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
            >
                {/* Header */}
                <LinearGradient colors={['#0f172a', '#1e3a5f']} style={styles.header}>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.greeting}>{greeting}{user?.username ? `, ${user.username}` : ''}</Text>
                            <Text style={styles.headerTitle}>StockVal</Text>
                        </View>
                        <TouchableOpacity onPress={toggleTheme} style={styles.darkModeBtn}>
                            <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color={isDark ? '#f59e0b' : '#94a3b8'} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.marketToggleRow}>
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
                            placeholderTextColor="#64748b"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={handleSearch}
                            autoCapitalize="characters"
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => { setSearchQuery(''); setCompanyResults([]); }}>
                                <Ionicons name="close-circle" size={20} color="#475569" />
                            </TouchableOpacity>
                        )}
                    </View>
                </LinearGradient>

                {/* Search Results */}
                {companyResults.length > 0 && (
                    <View style={styles.card}>
                        {companyResults.map((r, i) => (
                            <TouchableOpacity
                                key={`${r.symbol}-${i}`}
                                style={styles.resultRow}
                                onPress={() => { navigation.navigate('StockDetail', { symbol: r.symbol }); setCompanyResults([]); setSearchQuery(''); }}
                            >
                                <View style={styles.resultIcon}>
                                    <Text style={styles.resultIconText}>{r.symbol.charAt(0)}</Text>
                                </View>
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
                <TouchableOpacity style={styles.portfolioCard} onPress={() => navigation.navigate('Dashboard')} activeOpacity={0.8}>
                    <LinearGradient
                        colors={totalPL >= 0 ? ['#059669', '#10b981'] : ['#dc2626', '#ef4444']}
                        style={styles.portfolioGrad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        {portfolioLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : totalValue > 0 ? (
                            <>
                                <View style={styles.portfolioTop}>
                                    <View>
                                        <Text style={styles.portfolioLabel}>Portfolio Value</Text>
                                        <Text style={styles.portfolioValue}>{fmt(totalValue)}</Text>
                                    </View>
                                    <View style={styles.portfolioReturn}>
                                        <View style={styles.portfolioBadge}>
                                            <Ionicons name={totalPct >= 0 ? 'trending-up' : 'trending-down'} size={14} color="#fff" />
                                            <Text style={styles.portfolioPct}>{fmtPct(totalPct)}</Text>
                                        </View>
                                        <Text style={styles.portfolioPL}>{fmt(totalPL)}</Text>
                                    </View>
                                </View>
                                <View style={styles.portfolioBottom}>
                                    <Text style={styles.portfolioMeta}>{holdingsCount} holding{holdingsCount !== 1 ? 's' : ''}</Text>
                                    <View style={styles.portfolioArrow}>
                                        <Text style={styles.portfolioLink}>View details</Text>
                                        <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.9)" />
                                    </View>
                                </View>
                            </>
                        ) : (
                            <View style={styles.emptyPortfolio}>
                                <View style={styles.emptyIcon}>
                                    <Ionicons name="wallet-outline" size={28} color="rgba(255,255,255,0.8)" />
                                </View>
                                <Text style={styles.emptyPortfolioText}>Start building your portfolio</Text>
                                <Text style={styles.portfolioLink}>Get started →</Text>
                            </View>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                {/* Daily Briefing Card */}
                {briefingLoading ? (
                    <SkeletonCard style={{ marginHorizontal: 16, marginTop: 12 }} />
                ) : briefing ? (
                    <View style={styles.card}>
                        <View style={styles.cardTitleRow}>
                            <Ionicons name="sunny" size={18} color="#f59e0b" />
                            <Text style={styles.cardTitle}>Morning Briefing</Text>
                            <View style={[styles.signalBadge, briefing.sentiment === 'Bullish' ? styles.greenBg : briefing.sentiment === 'Bearish' ? styles.redBg : styles.neutralBg]}>
                                <Text style={styles.signalText}>{briefing.sentiment || 'Neutral'}</Text>
                            </View>
                        </View>
                        {briefing.indices?.slice(0, 3).map((idx: any, i: number) => (
                            <View key={i} style={styles.moverRow}>
                                <Text style={styles.moverSymbol}>{idx.symbol}</Text>
                                <View style={[styles.changePill, idx.change_pct >= 0 ? styles.greenPillBg : styles.redPillBg]}>
                                    <Text style={[styles.changePillText, idx.change_pct >= 0 ? styles.greenText : styles.redText]}>
                                        {idx.change_pct >= 0 ? '+' : ''}{idx.change_pct?.toFixed(2)}%
                                    </Text>
                                </View>
                            </View>
                        ))}
                        {briefing.portfolio?.overnight_change_pct != null && (
                            <View style={{ backgroundColor: '#f1f5f9', borderRadius: 10, padding: 10, marginTop: 8 }}>
                                <Text style={{ fontSize: 12, color: '#64748b' }}>Your portfolio overnight</Text>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: briefing.portfolio.overnight_change_pct >= 0 ? '#10b981' : '#ef4444' }}>
                                    {briefing.portfolio.overnight_change_pct >= 0 ? '+' : ''}{briefing.portfolio.overnight_change_pct?.toFixed(2)}%
                                </Text>
                            </View>
                        )}
                    </View>
                ) : null}

                {/* Quick Actions */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Start Here</Text>
                    <Text style={styles.sectionSubtitle}>Use these shortcuts for the most common tasks.</Text>
                </View>
                <View style={styles.actionGrid}>
                    {quickActions.map((a) => (
                        <TouchableOpacity
                            key={a.screen}
                            style={styles.actionTile}
                            onPress={() => navigation.navigate(a.screen)}
                            activeOpacity={0.82}
                        >
                            <View style={styles.actionTileHeader}>
                                <LinearGradient colors={[...a.gradient]} style={styles.actionTileIcon}>
                                    <Ionicons name={a.icon} size={18} color="#fff" />
                                </LinearGradient>
                                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                            </View>
                            <Text style={styles.actionTileLabel}>{a.label}</Text>
                            <Text style={styles.actionTileMeta}>Open now</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Market Pulse */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.cardTitleRow}>
                            <Ionicons name="pulse" size={18} color="#2563eb" />
                            <Text style={styles.cardTitle}>Market Pulse</Text>
                        </View>
                        {signal && (
                            <View style={[styles.signalBadge, signal === 'Bullish' ? styles.greenBg : signal === 'Bearish' ? styles.redBg : styles.neutralBg]}>
                                <Ionicons name={signal === 'Bullish' ? 'trending-up' : signal === 'Bearish' ? 'trending-down' : 'remove'} size={12} color="#fff" />
                                <Text style={styles.signalText}>{signal}</Text>
                            </View>
                        )}
                    </View>
                    {marketLoading ? (
                        <ActivityIndicator color="#2563eb" style={{ paddingVertical: 20 }} />
                    ) : marketSummary ? (
                        <>
                            {marketSummary.index?.price != null && (
                                <View style={styles.indexRow}>
                                    <View style={styles.indexLeft}>
                                        <View style={styles.indexDot} />
                                        <Text style={styles.indexLabel}>{selectedMarket === 'NGX' ? 'NGX Index' : 'S&P 500'}</Text>
                                    </View>
                                    <Text style={styles.indexPrice}>
                                        {selectedMarket === 'NGX' ? '₦' : '$'}{marketSummary.index.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </Text>
                                    <View style={[styles.changePill, marketSummary.index.change_pct >= 0 ? styles.greenPillBg : styles.redPillBg]}>
                                        <Text style={[styles.changePillText, marketSummary.index.change_pct >= 0 ? styles.greenText : styles.redText]}>
                                            {fmtPct(marketSummary.index.change_pct)}
                                        </Text>
                                    </View>
                                </View>
                            )}
                            {marketSummary.gainers.length > 0 && (
                                <>
                                    <Text style={styles.moversLabel}>TOP MOVERS</Text>
                                    {[...marketSummary.gainers.slice(0, 2), ...marketSummary.losers.slice(0, 2)].map((item, i) => (
                                        <TouchableOpacity
                                            key={`m-${item.symbol}-${i}`}
                                            style={styles.moverRow}
                                            onPress={() => navigation.navigate('StockDetail', { symbol: item.symbol })}
                                            activeOpacity={0.6}
                                        >
                                            <View style={styles.moverLeft}>
                                                <View style={[styles.moverDot, item.change_pct >= 0 ? styles.greenDot : styles.redDot]} />
                                                <Text style={styles.moverSymbol}>{item.symbol.replace('.NG', '')}</Text>
                                            </View>
                                            <View style={[styles.changePill, item.change_pct >= 0 ? styles.greenPillBg : styles.redPillBg]}>
                                                <Text style={[styles.changePillText, item.change_pct >= 0 ? styles.greenText : styles.redText]}>
                                                    {fmtPct(item.change_pct)}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </>
                            )}
                        </>
                    ) : (
                        <Text style={styles.mutedText}>Market data unavailable</Text>
                    )}
                </View>

                {/* Featured Stocks */}
                <View style={[styles.card, { marginBottom: 40 }]}>
                    <View style={styles.cardTitleRow}>
                        <Ionicons name="star" size={16} color="#f59e0b" />
                        <Text style={styles.cardTitle}>Featured</Text>
                    </View>
                    {marketLoading ? (
                        <ActivityIndicator color="#2563eb" style={{ paddingVertical: 20 }} />
                    ) : marketSummary?.quotes?.length ? (
                        marketSummary.quotes.slice(0, 6).map((q, i) => (
                            <TouchableOpacity
                                key={`${q.symbol}-${i}`}
                                style={styles.stockRow}
                                onPress={() => navigation.navigate('StockDetail', { symbol: q.symbol })}
                                activeOpacity={0.6}
                            >
                                <View style={styles.stockLeft}>
                                    <View style={styles.stockAvatar}>
                                        <Text style={styles.stockAvatarText}>{q.symbol.charAt(0)}</Text>
                                    </View>
                                    <Text style={styles.stockSymbol}>{q.symbol.replace('.NG', '')}</Text>
                                </View>
                                <View style={styles.stockRight}>
                                    <Text style={styles.stockPrice}>{fmtPrice(q.price)}</Text>
                                    <View style={[styles.changeChip, q.change_pct >= 0 ? styles.greenChipBg : styles.redChipBg]}>
                                        <Text style={[styles.changeChipText, q.change_pct >= 0 ? styles.greenText : styles.redText]}>
                                            {fmtPct(q.change_pct)}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <Text style={styles.mutedText}>No stock data available</Text>
                    )}
                </View>
            </ScrollView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f1f5f9',
    },
    /* ── Header ── */
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    greeting: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '500',
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -0.5,
    },
    darkModeBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 8,
        borderRadius: 10,
    },
    marketToggleRow: {
        marginTop: 4,
    },
    marketToggle: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 10,
        padding: 3,
    },
    marketPill: {
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 8,
    },
    marketPillActive: {
        backgroundColor: '#fff',
    },
    marketPillText: {
        fontSize: 13,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
    },
    marketPillTextActive: {
        color: '#0f172a',
    },
    /* ── Search ── */
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#fff',
        paddingVertical: 0,
    },
    /* ── Search Results ── */
    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        gap: 12,
    },
    resultIcon: {
        width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff6ff',
        justifyContent: 'center', alignItems: 'center',
    },
    resultIconText: {
        fontSize: 14, fontWeight: '800', color: '#2563eb',
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
        borderRadius: 18,
        padding: 18,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0f172a',
    },
    /* ── Section Header ── */
    sectionHeader: {
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 8,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0f172a',
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 4,
    },
    /* ── Portfolio ── */
    portfolioCard: {
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 16,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    portfolioGrad: {
        padding: 20,
    },
    portfolioTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    portfolioLabel: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '600',
        marginBottom: 4,
    },
    portfolioValue: {
        fontSize: 28,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -0.5,
    },
    portfolioReturn: {
        alignItems: 'flex-end',
    },
    portfolioBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    portfolioPct: {
        fontSize: 15,
        fontWeight: '800',
        color: '#fff',
    },
    portfolioPL: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 4,
        color: 'rgba(255,255,255,0.8)',
    },
    portfolioBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
    },
    portfolioMeta: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '500',
    },
    portfolioArrow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    portfolioLink: {
        fontSize: 13,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.9)',
    },
    emptyPortfolio: {
        alignItems: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    emptyIcon: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center',
    },
    emptyPortfolioText: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
    },
    /* ── Quick Actions ── */
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    actionTile: {
        width: '48%',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    actionTileHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    actionTileIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionTileLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 4,
    },
    actionTileMeta: {
        fontSize: 12,
        color: '#64748b',
    },
    /* ── Market Pulse ── */
    signalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    signalText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#fff',
    },
    greenBg: { backgroundColor: '#10b981' },
    redBg: { backgroundColor: '#ef4444' },
    neutralBg: { backgroundColor: '#94a3b8' },
    indexRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    indexLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    indexDot: {
        width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb',
    },
    indexLabel: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '600',
    },
    indexPrice: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
        marginRight: 10,
    },
    indexChange: {
        fontSize: 13,
        fontWeight: '700',
        minWidth: 60,
        textAlign: 'right',
    },
    changePill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    changePillText: {
        fontSize: 13,
        fontWeight: '800',
    },
    greenPillBg: { backgroundColor: '#ecfdf5' },
    redPillBg: { backgroundColor: '#fef2f2' },
    greenText: { color: '#059669' },
    redText: { color: '#dc2626' },
    moversLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94a3b8',
        marginTop: 6,
        marginBottom: 10,
        letterSpacing: 1,
    },
    moverRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f8fafc',
    },
    moverLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    moverDot: {
        width: 6, height: 6, borderRadius: 3,
    },
    greenDot: { backgroundColor: '#10b981' },
    redDot: { backgroundColor: '#ef4444' },
    moverSymbol: {
        fontSize: 15,
        fontWeight: '700',
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginRight: 12,
    },
    stockAvatar: {
        width: 38, height: 38, borderRadius: 12, backgroundColor: '#eff6ff',
        justifyContent: 'center', alignItems: 'center',
    },
    stockAvatarText: {
        fontSize: 15, fontWeight: '800', color: '#2563eb',
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
        fontWeight: '800',
        color: '#0f172a',
    },
    changeChip: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 4,
    },
    changeChipText: {
        fontSize: 12,
        fontWeight: '800',
    },
    greenChipBg: { backgroundColor: '#ecfdf5' },
    redChipBg: { backgroundColor: '#fef2f2' },
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
