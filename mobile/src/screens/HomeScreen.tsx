import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    Modal,
    FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MarketSummaryResponse, stockAPI, StockInfo, SearchResult, Market, AVAILABLE_MARKETS, PortfolioResponse } from '../services/api';

interface Props {
    navigation: any;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMarket, setSelectedMarket] = useState<Market>('US');
    const [marketModalVisible, setMarketModalVisible] = useState(false);
    const [featuredStocks, setFeaturedStocks] = useState<string[]>([]);
    const [stockPrices, setStockPrices] = useState<{ [key: string]: StockInfo }>({});
    const [loading, setLoading] = useState(false);
    const [companyResults, setCompanyResults] = useState<SearchResult[]>([]);
    const [marketSummary, setMarketSummary] = useState<MarketSummaryResponse | null>(null);
    const [marketLoading, setMarketLoading] = useState(false);
    const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
    const [portfolioLoading, setPortfolioLoading] = useState(false);

    useEffect(() => {
        const market = AVAILABLE_MARKETS[selectedMarket];
        setFeaturedStocks(market.featured_stocks);
        loadFeaturedStocks();
        loadMarketSummary();
        loadPortfolioSnapshot();
    }, [selectedMarket]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            loadMarketSummary();
            loadPortfolioSnapshot();
        }, 60000);

        return () => clearInterval(intervalId);
    }, [selectedMarket]);

    const loadFeaturedStocks = async () => {
        setLoading(true);
        const prices: { [key: string]: StockInfo } = {};

        for (const symbol of featuredStocks.slice(0, 4)) { // Load first 4 for performance
            try {
                const stockInfo = await stockAPI.getStockInfo(symbol);
                prices[symbol] = stockInfo;
            } catch (error) {
                console.error(`Error loading ${symbol}:`, error);
            }
        }

        setStockPrices(prices);
        setLoading(false);
    };

    const handleSearch = async () => {
        const rawQuery = searchQuery.trim();
        if (!rawQuery) return;

        setCompanyResults([]);

        const symbolCandidate = rawQuery.toUpperCase();
        const isSymbolLike = /^[A-Z0-9.^-]{1,10}$/.test(symbolCandidate) && !rawQuery.includes(' ');

        if (isSymbolLike) {
            navigation.navigate('StockDetail', { symbol: symbolCandidate });
            setSearchQuery('');
            return;
        }

        try {
            setLoading(true);
            const response = await stockAPI.searchStocks(rawQuery, 8);
            if (response.results && response.results.length > 0) {
                setCompanyResults(response.results);
            } else {
                Alert.alert('No Results', 'No matching companies found.');
            }
        } catch (error) {
            Alert.alert('Error', 'Unable to search companies right now.');
        } finally {
            setLoading(false);
        }
    };

    const loadMarketSummary = async () => {
        try {
            setMarketLoading(true);
            const summary = await stockAPI.getMarketSummary(selectedMarket);
            setMarketSummary(summary);
        } catch (error) {
            console.error(`Error loading ${selectedMarket} market summary:`, error);
        } finally {
            setMarketLoading(false);
        }
    };

    const loadPortfolioSnapshot = async () => {
        try {
            setPortfolioLoading(true);
            const portfolioData = await stockAPI.getPortfolio();
            setPortfolio(portfolioData);
        } catch (error) {
            console.error('Error loading portfolio:', error);
            setPortfolio(null);
        } finally {
            setPortfolioLoading(false);
        }
    };

    const portfolioHoldings = useMemo(() => {
        if (!portfolio) return [];
        const totalEquity = portfolio.summary.total_equity || portfolio.summary.total_value || 0;
        return portfolio.positions.map((position) => {
            const allocationPct = totalEquity ? (position.market_value / totalEquity) * 100 : 0;
            return {
                symbol: position.symbol,
                quantity: position.shares,
                avg_cost: position.cost_basis,
                allocation_pct: allocationPct,
                return_pct: position.profit_pct,
                profit: position.profit,
            };
        });
    }, [portfolio]);

    const handleMarketChange = (market: Market) => {
        setSelectedMarket(market);
        setMarketModalVisible(false);
    };

    const todaysSignal = () => {
        if (!marketSummary || marketSummary.quotes.length === 0) return 'Neutral';
        const avgChange = marketSummary.quotes.reduce((acc, item) => acc + item.change_pct, 0) / marketSummary.quotes.length;
        if (avgChange >= 0.5) return 'Bullish';
        if (avgChange <= -0.5) return 'Bearish';
        return 'Neutral';
    };

    const navigateToStock = (symbol: string) => {
        navigation.navigate('StockDetail', { symbol });
    };

    const formatMarketCap = (marketCap: number): string => {
        if (!marketCap) return 'N/A';
        if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
        if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
        if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
        return `$${marketCap.toFixed(0)}`;
    };

    const formatCurrency = (value: number): string => {
        return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    };

    const formatPercent = (value: number): string => {
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    };

    const formatPrice = (price: number): string => {
        return price ? `$${price.toFixed(2)}` : 'N/A';
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.header}
            >
                <Text style={styles.headerTitle}>Stock Valuation</Text>
                <Text style={styles.headerSubtitle}>Professional Analysis Platform</Text>
            </LinearGradient>

            {/* Market Selector */}
            <View style={styles.marketSelectorContainer}>
                <Text style={styles.sectionTitle}>Select Market</Text>
                <TouchableOpacity
                    style={styles.marketSelector}
                    onPress={() => setMarketModalVisible(true)}
                >
                    <View style={styles.marketSelectorContent}>
                        <Ionicons name="globe-outline" size={20} color="#667eea" />
                        <View style={styles.marketSelectorText}>
                            <Text style={styles.marketSelectorLabel}>{AVAILABLE_MARKETS[selectedMarket].name}</Text>
                            <Text style={styles.marketSelectorDesc}>{AVAILABLE_MARKETS[selectedMarket].region}</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-down" size={24} color="#667eea" />
                </TouchableOpacity>
            </View>

            {/* Market Selector Modal */}
            <Modal
                visible={marketModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setMarketModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Stock Market</Text>
                            <TouchableOpacity onPress={() => setMarketModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#333" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={Object.values(AVAILABLE_MARKETS)}
                            keyExtractor={(item) => item.code}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.marketOption,
                                        selectedMarket === item.code && styles.marketOptionSelected,
                                    ]}
                                    onPress={() => handleMarketChange(item.code as Market)}
                                >
                                    <View style={styles.marketOptionContent}>
                                        <Text style={styles.marketOptionName}>{item.name}</Text>
                                        <Text style={styles.marketOptionDesc}>
                                            {item.description} • {item.timezone}
                                        </Text>
                                    </View>
                                    {selectedMarket === item.code && (
                                        <Ionicons name="checkmark-circle" size={24} color="#667eea" />
                                    )}
                                </TouchableOpacity>
                            )}
                            scrollEnabled={true}
                        />
                    </View>
                </View>
            </Modal>

            {/* Search Section */}
            <View style={styles.searchSection}>
                <Text style={styles.sectionTitle}>Search Stocks</Text>
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder={`Enter symbol (e.g., ${AVAILABLE_MARKETS[selectedMarket].featured_stocks[0]})`}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        autoCapitalize="characters"
                    />
                    <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                        <Ionicons name="search" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {companyResults.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Company Matches</Text>
                    {companyResults.map((result, index) => (
                        <TouchableOpacity
                            key={`${result.symbol}-${index}`}
                            style={styles.companyCard}
                            onPress={() => navigateToStock(result.symbol)}
                        >
                            <View style={styles.companyInfo}>
                                <Text style={styles.companyName} numberOfLines={1}>
                                    {result.longname || result.shortname || result.symbol}
                                </Text>
                                <Text style={styles.companyMeta}>
                                    {result.symbol} {result.exchange ? `• ${result.exchange}` : ''}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#666" />
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Portfolio Snapshot */}
            <View style={styles.portfolioSnapshot}>
                <View style={styles.portfolioHeader}>
                    <Text style={styles.sectionTitle}>Portfolio Snapshot</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
                        <Ionicons name="arrow-forward-circle" size={24} color="#667eea" />
                    </TouchableOpacity>
                </View>

                {portfolioLoading ? (
                    <View style={styles.portfolioEmpty}>
                        <Ionicons name="hourglass" size={32} color="#999" />
                        <Text style={styles.portfolioEmptyText}>Loading portfolio...</Text>
                    </View>
                ) : portfolio && portfolio.summary.total_equity > 0 ? (
                    <View style={styles.portfolioCard}>
                        {/* Portfolio Value Cards */}
                        <View style={styles.portfolioValueRow}>
                            <View style={styles.portfolioValueCard}>
                                <Text style={styles.portfolioValueLabel}>Total Value</Text>
                                <Text style={styles.portfolioValueAmount}>
                                    {formatCurrency(portfolio.summary.total_equity)}
                                </Text>
                                <Text style={[
                                    styles.portfolioValueChange,
                                    portfolio.summary.total_profit >= 0 ? styles.positive : styles.negative
                                ]}>
                                    {formatCurrency(portfolio.summary.total_profit)}
                                </Text>
                            </View>
                            <View style={styles.portfolioValueCard}>
                                <Text style={styles.portfolioValueLabel}>Return %</Text>
                                <Text style={[
                                    styles.portfolioValueAmount,
                                    portfolio.summary.total_profit_pct >= 0 ? styles.positiveText : styles.negativeText
                                ]}>
                                    {formatPercent(portfolio.summary.total_profit_pct)}
                                </Text>
                                <Text style={styles.portfolioValueMeta}>
                                    Monthly: {formatPercent(portfolio.performance.monthly.profit_pct)}
                                </Text>
                            </View>
                        </View>

                        {/* Portfolio Holdings */}
                        <View style={styles.portfolioDivider} />
                        <View style={styles.portfolioHoldings}>
                            <View style={styles.holdingHeader}>
                                <Text style={styles.holdingHeaderText}>Holdings ({portfolioHoldings.length})</Text>
                                <Text style={styles.holdingHeaderText}>Allocation</Text>
                            </View>
                            {portfolioHoldings.slice(0, 3).map((holding) => (
                                <View key={holding.symbol} style={styles.holdingRow}>
                                    <View style={styles.holdingInfo}>
                                        <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                                        <Text style={styles.holdingShares}>{holding.quantity} shares @ {formatPrice(holding.avg_cost)}</Text>
                                    </View>
                                    <View style={styles.holdingAllocation}>
                                        <Text style={styles.holdingPercent}>{holding.allocation_pct.toFixed(1)}%</Text>
                                        <Text style={[
                                            styles.holdingReturn,
                                            holding.profit >= 0 ? styles.positiveText : styles.negativeText
                                        ]}>
                                            {formatPercent(holding.return_pct)}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                            {portfolioHoldings.length > 3 && (
                                <TouchableOpacity style={styles.viewAllLink} onPress={() => navigation.navigate('Dashboard')}>
                                    <Text style={styles.viewAllText}>
                                        View all {portfolioHoldings.length} holdings →
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Risk Indicator */}
                        <View style={styles.portfolioDivider} />
                        <View style={styles.riskIndicator}>
                            <Ionicons name="shield" size={20} color="#FF9500" />
                            <View style={styles.riskContent}>
                                <Text style={styles.riskLabel}>Risk Level</Text>
                                <Text style={styles.riskValue}>
                                    {portfolio.risk.risk_score >= 7 ? '🔴 High' : portfolio.risk.risk_score >= 4 ? '🟡 Medium' : '🟢 Low'}
                                </Text>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={styles.portfolioEmpty}>
                        <Ionicons name="wallet-outline" size={48} color="#ddd" />
                        <Text style={styles.portfolioEmptyTitle}>No Assets Yet</Text>
                        <Text style={styles.portfolioEmptyText}>
                            Start building your portfolio by analyzing stocks and adding them to your watchlist.
                        </Text>
                        <TouchableOpacity
                            style={styles.startPortfolioButton}
                            onPress={() => navigation.navigate('Analysis')}
                        >
                            <Ionicons name="add-circle" size={20} color="white" />
                            <Text style={styles.startPortfolioButtonText}>Begin Analysis</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
                <Text style={styles.sectionTitle}>Start Here</Text>
                <View style={styles.actionGrid}>
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => navigation.navigate('SmartStrategy')}
                    >
                        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.actionCardGradient}>
                            <Ionicons name="flash" size={28} color="white" />
                        </LinearGradient>
                        <Text style={styles.actionText}>Smart Strategy</Text>
                        <Text style={styles.actionSubtext}>AI picks</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => navigation.navigate('Valuation')}
                    >
                        <LinearGradient colors={['#007AFF', '#0051D5']} style={styles.actionCardGradient}>
                            <Ionicons name="calculator" size={28} color="white" />
                        </LinearGradient>
                        <Text style={styles.actionText}>Quick Valuation</Text>
                        <Text style={styles.actionSubtext}>EPS & DCF</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => navigation.navigate('Watchlist')}
                    >
                        <LinearGradient colors={['#34C759', '#00A86B']} style={styles.actionCardGradient}>
                            <Ionicons name="notifications" size={28} color="white" />
                        </LinearGradient>
                        <Text style={styles.actionText}>Set Alerts</Text>
                        <Text style={styles.actionSubtext}>Track prices</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => navigation.navigate('Dashboard')}
                    >
                        <LinearGradient colors={['#FF9500', '#FF6B00']} style={styles.actionCardGradient}>
                            <Ionicons name="wallet" size={28} color="white" />
                        </LinearGradient>
                        <Text style={styles.actionText}>Portfolio</Text>
                        <Text style={styles.actionSubtext}>Your holdings</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => navigation.navigate('Analysis')}
                    >
                        <LinearGradient colors={['#7c3aed', '#6D28D9']} style={styles.actionCardGradient}>
                            <Ionicons name="analytics" size={28} color="white" />
                        </LinearGradient>
                        <Text style={styles.actionText}>Market News</Text>
                        <Text style={styles.actionSubtext}>Latest trends</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Market Snapshot */}
            <View style={styles.marketOverview}>
                <Text style={styles.sectionTitle}>NGX Snapshot</Text>
                {marketLoading ? (
                    <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Loading market data...</Text>
                    </View>
                ) : marketSummary ? (
                    <View style={styles.marketCard}>
                        <View style={styles.marketRow}>
                            <Text style={styles.marketLabel}>NGX Index</Text>
                            <Text style={styles.marketValue}>
                                {marketSummary.index?.price ? `₦${marketSummary.index.price.toFixed(2)}` : 'N/A'}
                            </Text>
                            <Text style={marketSummary.index && marketSummary.index.change_pct >= 0 ? styles.marketPositive : styles.marketNegative}>
                                {marketSummary.index ? `${marketSummary.index.change_pct.toFixed(2)}%` : ''}
                            </Text>
                        </View>
                        <View style={styles.marketRow}>
                            <Text style={styles.marketLabel}>Today’s signal</Text>
                            <Text style={styles.marketValue}>{todaysSignal()}</Text>
                        </View>
                        <View style={styles.marketDivider} />
                        <Text style={styles.marketSubTitle}>Top Gainers</Text>
                        {marketSummary.gainers.slice(0, 3).map((item) => (
                            <View key={`g-${item.symbol}`} style={styles.marketRow}>
                                <Text style={styles.marketLabel}>{item.symbol.replace('.NG', '')}</Text>
                                <Text style={styles.marketPositive}>{item.change_pct.toFixed(2)}%</Text>
                            </View>
                        ))}
                        <Text style={styles.marketSubTitle}>Top Losers</Text>
                        {marketSummary.losers.slice(0, 3).map((item) => (
                            <View key={`l-${item.symbol}`} style={styles.marketRow}>
                                <Text style={styles.marketLabel}>{item.symbol.replace('.NG', '')}</Text>
                                <Text style={styles.marketNegative}>{item.change_pct.toFixed(2)}%</Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text style={styles.loadingText}>Market data unavailable.</Text>
                )}
            </View>

            {/* Featured Stocks */}
            <View style={styles.featuredSection}>
                <Text style={styles.sectionTitle}>Featured Stocks</Text>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Loading stock data...</Text>
                    </View>
                ) : (
                    <View style={styles.stockGrid}>
                        {Object.entries(stockPrices).map(([symbol, stockInfo]) => (
                            <TouchableOpacity
                                key={symbol}
                                style={styles.stockCard}
                                onPress={() => navigateToStock(symbol)}
                            >
                                <View style={styles.stockHeader}>
                                    <Text style={styles.stockSymbol}>{symbol}</Text>
                                    <Ionicons name="chevron-forward" size={16} color="#666" />
                                </View>
                                <Text style={styles.stockName} numberOfLines={1}>
                                    {stockInfo.company_name}
                                </Text>
                                <Text style={styles.stockPrice}>
                                    {formatPrice(stockInfo.current_price)}
                                </Text>
                                <Text style={styles.stockMarketCap}>
                                    Market Cap: {formatMarketCap(stockInfo.market_cap)}
                                </Text>
                                <View style={styles.stockMetrics}>
                                    <Text style={styles.stockMetric}>
                                        P/E: {stockInfo.pe_ratio ? stockInfo.pe_ratio.toFixed(1) : 'N/A'}
                                    </Text>
                                    <Text style={styles.stockMetric}>
                                        Beta: {stockInfo.beta ? stockInfo.beta.toFixed(2) : 'N/A'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {/* Market Overview */}
            <View style={styles.marketOverview}>
                <Text style={styles.sectionTitle}>Market Insights</Text>
                <View style={styles.insightCard}>
                    <Ionicons name="trending-up" size={24} color="#34C759" />
                    <View style={styles.insightContent}>
                        <Text style={styles.insightTitle}>Valuation Methods</Text>
                        <Text style={styles.insightDescription}>
                            DCF, Comparable Analysis, and Technical Indicators
                        </Text>
                    </View>
                </View>

                <View style={styles.insightCard}>
                    <Ionicons name="shield-checkmark" size={24} color="#007AFF" />
                    <View style={styles.insightContent}>
                        <Text style={styles.insightTitle}>Professional Grade</Text>
                        <Text style={styles.insightDescription}>
                            Institutional-level analysis tools
                        </Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 24,
        paddingTop: 60,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    searchSection: {
        padding: 20,
        backgroundColor: 'white',
        margin: 16,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    companyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    companyInfo: {
        flex: 1,
    },
    companyName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    companyMeta: {
        fontSize: 12,
        color: '#6b7280',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        height: 48,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 16,
        fontSize: 16,
        marginRight: 12,
    },
    searchButton: {
        width: 48,
        height: 48,
        backgroundColor: '#007AFF',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickActions: {
        padding: 20,
        backgroundColor: 'white',
        margin: 16,
        marginTop: 0,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    actionCard: {
        width: '48%',
        aspectRatio: 1.3,
        backgroundColor: 'white',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    actionCardGradient: {
        width: 56,
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1a1a1a',
        textAlign: 'center',
    },
    actionSubtext: {
        fontSize: 11,
        color: '#999',
        marginTop: 4,
        textAlign: 'center',
    },
    featuredSection: {
        padding: 20,
        backgroundColor: 'white',
        margin: 16,
        marginTop: 0,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
    },
    stockGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    stockCard: {
        width: '48%',
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    noticeContainer: {
        padding: 16,
        paddingTop: 8,
    },
    noticeCard: {
        backgroundColor: '#FFF8E1',
        borderLeftWidth: 4,
        borderLeftColor: '#FF9500',
        borderRadius: 8,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    noticeContent: {
        flex: 1,
        marginLeft: 12,
    },
    noticeTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF9500',
        marginBottom: 4,
    },
    noticeText: {
        fontSize: 12,
        color: '#8B6914',
        lineHeight: 18,
    },
    stockHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    stockSymbol: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    stockName: {
        fontSize: 12,
        color: '#666',
        marginBottom: 8,
    },
    stockPrice: {
        fontSize: 18,
        fontWeight: '600',
        color: '#007AFF',
        marginBottom: 4,
    },
    stockMarketCap: {
        fontSize: 11,
        color: '#666',
        marginBottom: 8,
    },
    stockMetrics: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    stockMetric: {
        fontSize: 11,
        color: '#666',
    },
    marketOverview: {
        padding: 20,
        backgroundColor: 'white',
        margin: 16,
        marginTop: 0,
        marginBottom: 32,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    marketCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 16,
    },
    marketRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 6,
    },
    marketLabel: {
        fontSize: 13,
        color: '#666',
        flex: 1,
    },
    marketValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111',
        flex: 1,
        textAlign: 'right',
    },
    marketPositive: {
        fontSize: 14,
        fontWeight: '600',
        color: '#34C759',
        flex: 1,
        textAlign: 'right',
    },
    marketNegative: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF3B30',
        flex: 1,
        textAlign: 'right',
    },
    marketSubTitle: {
        marginTop: 12,
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    marketDivider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 10,
    },
    insightCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    insightContent: {
        marginLeft: 16,
        flex: 1,
    },
    insightTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 2,
    },
    insightDescription: {
        fontSize: 14,
        color: '#666',
    },
    marketSelectorContainer: {
        padding: 20,
        backgroundColor: 'white',
        margin: 16,
        marginTop: 0,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    marketSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    marketSelectorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    marketSelectorText: {
        marginLeft: 12,
        flex: 1,
    },
    marketSelectorLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    marketSelectorDesc: {
        fontSize: 12,
        color: '#666',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    marketOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    marketOptionSelected: {
        backgroundColor: '#f8f9fa',
    },
    marketOptionContent: {
        flex: 1,
    },
    marketOptionName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    marketOptionDesc: {
        fontSize: 12,
        color: '#666',
    },
    portfolioSnapshot: {
        padding: 20,
        backgroundColor: 'white',
        margin: 16,
        marginTop: 0,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    portfolioHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    portfolioCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        overflow: 'hidden',
    },
    portfolioValueRow: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    portfolioValueCard: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    portfolioValueLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 8,
        fontWeight: '500',
    },
    portfolioValueAmount: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    portfolioValueChange: {
        fontSize: 12,
        fontWeight: '600',
    },
    portfolioValueMeta: {
        fontSize: 11,
        color: '#999',
        marginTop: 2,
    },
    positive: {
        color: '#34C759',
    },
    negative: {
        color: '#FF3B30',
    },
    positiveText: {
        color: '#34C759',
    },
    negativeText: {
        color: '#FF3B30',
    },
    portfolioDivider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 0,
    },
    portfolioHoldings: {
        padding: 16,
    },
    holdingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    holdingHeaderText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    holdingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    holdingInfo: {
        flex: 1,
    },
    holdingSymbol: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    holdingShares: {
        fontSize: 11,
        color: '#999',
    },
    holdingAllocation: {
        alignItems: 'flex-end',
        minWidth: 60,
    },
    holdingPercent: {
        fontSize: 13,
        fontWeight: '600',
        color: '#667eea',
        marginBottom: 2,
    },
    holdingReturn: {
        fontSize: 11,
        fontWeight: '600',
    },
    viewAllLink: {
        paddingVertical: 12,
        marginTop: 4,
    },
    viewAllText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#667eea',
    },
    riskIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(255, 149, 0, 0.05)',
        borderRadius: 0,
    },
    riskContent: {
        marginLeft: 12,
        flex: 1,
    },
    riskLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    riskValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF9500',
    },
    portfolioEmpty: {
        paddingVertical: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
    },
    portfolioEmptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginTop: 12,
        marginBottom: 8,
    },
    portfolioEmptyText: {
        fontSize: 13,
        color: '#999',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 16,
    },
    startPortfolioButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#667eea',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 8,
        gap: 8,
    },
    startPortfolioButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
});

export default HomeScreen;