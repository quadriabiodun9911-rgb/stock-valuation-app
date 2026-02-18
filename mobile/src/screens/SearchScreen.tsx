import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { stockAPI, StockInfo, SearchResult } from '../services/api';

interface Props {
    navigation: any;
}

const SearchScreen: React.FC<Props> = ({ navigation }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<StockInfo[]>([]);
    const [companyResults, setCompanyResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [popularStocks] = useState([
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX'
    ]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        try {
            setLoading(true);
            setSearchResults([]);
            setCompanyResults([]);

            const rawQuery = searchQuery.trim();
            const symbolCandidate = rawQuery.toUpperCase();
            const isSymbolLike = /^[A-Z0-9.^-]{1,10}$/.test(symbolCandidate) && !rawQuery.includes(' ');

            if (isSymbolLike) {
                try {
                    const stockInfo = await stockAPI.getStockInfo(symbolCandidate);
                    setSearchResults([stockInfo]);
                    return;
                } catch (error: any) {
                    // Handle NGX not supported error
                    if (error.response?.status === 503) {
                        const errorData = error.response?.data?.detail;
                        if (errorData?.error === 'NGX_NOT_SUPPORTED') {
                            Alert.alert(
                                'Nigerian Stocks Not Available',
                                errorData.message + '\n\n' + errorData.suggestion
                            );
                            return;
                        }
                    }
                    // Fall back to company search for other errors
                }
            }

            const searchResponse = await stockAPI.searchStocks(rawQuery, 10);
            const results = searchResponse.results || [];
            setCompanyResults(results);

            if (results.length === 0) {
                Alert.alert(
                    'No Results',
                    'No matching companies found. Check your internet connection and make sure the backend is running.'
                );
            }
        } catch (error: any) {
            // Check if it's an NGX error
            if (error.response?.status === 503) {
                const errorData = error.response?.data?.detail;
                if (errorData?.error === 'NGX_NOT_SUPPORTED') {
                    Alert.alert(
                        'Nigerian Stocks Not Available',
                        errorData.message + '\n\n' + errorData.suggestion
                    );
                    return;
                }
            }

            Alert.alert(
                'Search Unavailable',
                'Unable to fetch market data. Check your internet connection and make sure the backend is running.'
            );
            setSearchResults([]);
            setCompanyResults([]);
        } finally {
            setLoading(false);
        }
    };

    const navigateToStock = (symbol: string) => {
        navigation.navigate('StockDetail', { symbol });
    };

    const formatPrice = (price: number): string => {
        return price ? `$${price.toFixed(2)}` : 'N/A';
    };

    const formatMarketCap = (marketCap: number): string => {
        if (!marketCap) return 'N/A';
        if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
        if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
        if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
        return `$${marketCap.toFixed(0)}`;
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Search Stocks</Text>
                <Text style={styles.headerSubtitle}>Find and analyze any stock</Text>
            </View>

            {/* Search Section */}
            <View style={styles.searchSection}>
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Enter symbol or company name (e.g., AAPL or Apple)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        autoCapitalize="characters"
                        autoCorrect={false}
                    />
                    <TouchableOpacity
                        style={styles.searchButton}
                        onPress={handleSearch}
                        disabled={loading}
                    >
                        <Ionicons
                            name={loading ? "hourglass" : "search"}
                            size={24}
                            color="white"
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Results */}
            {searchResults.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Search Results</Text>
                    {searchResults.map((stock, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.stockCard}
                            onPress={() => navigateToStock(stock.symbol)}
                        >
                            <View style={styles.stockInfo}>
                                <View style={styles.stockHeader}>
                                    <Text style={styles.stockSymbol}>{stock.symbol}</Text>
                                    <Text style={styles.stockPrice}>
                                        {formatPrice(stock.current_price)}
                                    </Text>
                                </View>
                                <Text style={styles.stockName} numberOfLines={1}>
                                    {stock.company_name}
                                </Text>
                                <View style={styles.stockMetrics}>
                                    <Text style={styles.stockMetric}>
                                        Market Cap: {formatMarketCap(stock.market_cap)}
                                    </Text>
                                    <Text style={styles.stockMetric}>
                                        P/E: {stock.pe_ratio ? stock.pe_ratio.toFixed(1) : 'N/A'}
                                    </Text>
                                </View>
                                <Text style={styles.stockSector}>
                                    {stock.sector} • {stock.industry}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="#666" />
                        </TouchableOpacity>
                    ))}
                </View>
            )}

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
                            <Ionicons name="chevron-forward" size={24} color="#666" />
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Popular Stocks */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Popular Stocks</Text>
                <Text style={styles.sectionSubtitle}>
                    Tap any stock to view detailed analysis
                </Text>
                <View style={styles.popularGrid}>
                    {popularStocks.map((symbol, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.popularCard}
                            onPress={() => navigateToStock(symbol)}
                        >
                            <Text style={styles.popularSymbol}>{symbol}</Text>
                            <Ionicons name="trending-up" size={20} color="#007AFF" />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Search Tips */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Search Tips</Text>

                <View style={styles.tipCard}>
                    <Ionicons name="bulb" size={24} color="#FF9500" />
                    <View style={styles.tipContent}>
                        <Text style={styles.tipTitle}>Stock Symbols</Text>
                        <Text style={styles.tipDescription}>
                            Use ticker symbols like AAPL for Apple, MSFT for Microsoft
                        </Text>
                    </View>
                </View>

                <View style={styles.tipCard}>
                    <Ionicons name="analytics" size={24} color="#007AFF" />
                    <View style={styles.tipContent}>
                        <Text style={styles.tipTitle}>Comprehensive Analysis</Text>
                        <Text style={styles.tipDescription}>
                            Get DCF valuation, comparable analysis, and technical indicators
                        </Text>
                    </View>
                </View>

                <View style={styles.tipCard}>
                    <Ionicons name="time" size={24} color="#34C759" />
                    <View style={styles.tipContent}>
                        <Text style={styles.tipTitle}>Real-time Data</Text>
                        <Text style={styles.tipDescription}>
                            Access up-to-date financial data and market information
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
        backgroundColor: 'white',
        padding: 24,
        paddingTop: 60,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#666',
    },
    searchSection: {
        backgroundColor: 'white',
        margin: 16,
        padding: 20,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
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
    section: {
        backgroundColor: 'white',
        margin: 16,
        marginTop: 0,
        padding: 20,
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
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    stockCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
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
    stockInfo: {
        flex: 1,
    },
    stockHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    stockSymbol: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    stockPrice: {
        fontSize: 18,
        fontWeight: '600',
        color: '#007AFF',
    },
    stockName: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    stockMetrics: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    stockMetric: {
        fontSize: 12,
        color: '#666',
    },
    stockSector: {
        fontSize: 12,
        color: '#999',
    },
    popularGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    popularCard: {
        width: '23%',
        aspectRatio: 1,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    popularSymbol: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    tipCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    tipContent: {
        marginLeft: 16,
        flex: 1,
    },
    tipTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 2,
    },
    tipDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 18,
    },
});

export default SearchScreen;