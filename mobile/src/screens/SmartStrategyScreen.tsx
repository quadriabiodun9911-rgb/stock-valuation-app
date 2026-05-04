import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { stockAPI } from '../services/api';

interface Props {
    navigation: any;
}

interface StrategyScore {
    symbol: string;
    companyName: string;
    currentPrice: number;

    // Value Layer
    intrinsicValue: number;
    discountToFairValue: number;
    valueScore: number;

    // Quality Layer
    fcfPositive: boolean;
    revenueGrowth: number;
    debtRatio: number;
    profitMargin: number;
    roe: number;
    currentRatio: number;
    qualityScore: number;

    // Momentum Layer
    ma50: number;
    ma200: number;
    relativeStrength: number;
    rsi: number;
    momentumScore: number;

    // Risk Layer
    riskScore: number;
    beta: number;
    volatility: number;
    maxDrawdown: number;
    sharpeEstimate: number;

    // Overall
    overallScore: number;
    recommendation: 'BUY' | 'HOLD' | 'SELL' | 'AVOID';
    allocation: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

const SmartStrategyScreen: React.FC<Props> = ({ navigation }) => {
    const [loading, setLoading] = useState(false);
    const [stocks, setStocks] = useState<StrategyScore[]>([]);
    const [activeFilter, setActiveFilter] = useState<'all' | 'buy' | 'hold' | 'sell'>('all');

    useEffect(() => {
        loadStrategyAnalysis();
    }, []);

    const loadStrategyAnalysis = async () => {
        try {
            setLoading(true);
            // This would call a new backend endpoint that runs the full strategy
            const response = await stockAPI.getSmartStrategy();
            setStocks(response.stocks);
        } catch (error) {
            Alert.alert('Error', 'Failed to load strategy analysis');
        } finally {
            setLoading(false);
        }
    };

    const getRecommendationColor = (rec: string) => {
        switch (rec) {
            case 'BUY': return '#34C759';
            case 'HOLD': return '#FF9500';
            case 'SELL': return '#FF3B30';
            default: return '#999';
        }
    };

    const filteredStocks = stocks.filter(stock => {
        if (activeFilter === 'all') return true;
        return stock.recommendation === activeFilter.toUpperCase();
    });

    const handleBack = () => {
        if (navigation?.canGoBack?.()) {
            navigation.goBack();
            return;
        }
        navigation?.navigate?.('MainTabs');
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={22} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Smart Strategy</Text>
                <Text style={styles.headerSubtitle}>
                    Professional 3-Layer System
                </Text>
                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={loadStrategyAnalysis}
                >
                    <Ionicons name="refresh" size={20} color="white" />
                </TouchableOpacity>
            </LinearGradient>

            {/* Strategy Overview */}
            <View style={styles.overview}>
                <View style={styles.overviewCard}>
                    <Ionicons name="shield-checkmark" size={24} color="#667eea" />
                    <View style={styles.overviewText}>
                        <Text style={styles.overviewLabel}>4-Layer Analysis</Text>
                        <Text style={styles.overviewValue}>
                            Value × Quality × Momentum × Risk
                        </Text>
                    </View>
                </View>
            </View>

            {/* Filters */}
            <View style={styles.filters}>
                <TouchableOpacity
                    style={[styles.filterButton, activeFilter === 'all' && styles.filterActive]}
                    onPress={() => setActiveFilter('all')}
                >
                    <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>
                        All
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, activeFilter === 'buy' && styles.filterActive]}
                    onPress={() => setActiveFilter('buy')}
                >
                    <Text style={[styles.filterText, activeFilter === 'buy' && styles.filterTextActive]}>
                        Buy Signals
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, activeFilter === 'hold' && styles.filterActive]}
                    onPress={() => setActiveFilter('hold')}
                >
                    <Text style={[styles.filterText, activeFilter === 'hold' && styles.filterTextActive]}>
                        Hold
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, activeFilter === 'sell' && styles.filterActive]}
                    onPress={() => setActiveFilter('sell')}
                >
                    <Text style={[styles.filterText, activeFilter === 'sell' && styles.filterTextActive]}>
                        Sell
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Stock List */}
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#667eea" />
                        <Text style={styles.loadingText}>
                            Running multi-layer analysis...
                        </Text>
                    </View>
                ) : (
                    <>
                        {filteredStocks.map((stock, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.stockCard}
                                onPress={() =>
                                    navigation.navigate('StrategyDetail', { stock })
                                }
                            >
                                {/* Header */}
                                <View style={styles.stockHeader}>
                                    <View style={styles.stockInfo}>
                                        <Text style={styles.stockSymbol}>
                                            {stock.symbol}
                                        </Text>
                                        <Text style={styles.stockName}>
                                            {stock.companyName}
                                        </Text>
                                    </View>
                                    <View
                                        style={[
                                            styles.recBadge,
                                            {
                                                backgroundColor: getRecommendationColor(
                                                    stock.recommendation
                                                ),
                                            },
                                        ]}
                                    >
                                        <Text style={styles.recText}>
                                            {stock.recommendation}
                                        </Text>
                                    </View>
                                </View>

                                {/* Score Bars */}
                                <View style={styles.scores}>
                                    <View style={styles.scoreRow}>
                                        <Text style={styles.scoreLabel}>Value</Text>
                                        <View style={styles.scoreBarContainer}>
                                            <View
                                                style={[
                                                    styles.scoreBar,
                                                    {
                                                        width: `${stock.valueScore}%`,
                                                        backgroundColor: '#007AFF',
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.scoreValue}>
                                            {stock.valueScore}
                                        </Text>
                                    </View>

                                    <View style={styles.scoreRow}>
                                        <Text style={styles.scoreLabel}>Quality</Text>
                                        <View style={styles.scoreBarContainer}>
                                            <View
                                                style={[
                                                    styles.scoreBar,
                                                    {
                                                        width: `${stock.qualityScore}%`,
                                                        backgroundColor: '#34C759',
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.scoreValue}>
                                            {stock.qualityScore}
                                        </Text>
                                    </View>

                                    <View style={styles.scoreRow}>
                                        <Text style={styles.scoreLabel}>Momentum</Text>
                                        <View style={styles.scoreBarContainer}>
                                            <View
                                                style={[
                                                    styles.scoreBar,
                                                    {
                                                        width: `${stock.momentumScore}%`,
                                                        backgroundColor: '#FF9500',
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.scoreValue}>
                                            {stock.momentumScore}
                                        </Text>
                                    </View>

                                    <View style={styles.scoreRow}>
                                        <Text style={styles.scoreLabel}>Risk</Text>
                                        <View style={styles.scoreBarContainer}>
                                            <View
                                                style={[
                                                    styles.scoreBar,
                                                    {
                                                        width: `${stock.riskScore ?? 0}%`,
                                                        backgroundColor: '#8B5CF6',
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.scoreValue}>
                                            {stock.riskScore ?? 0}
                                        </Text>
                                    </View>
                                </View>

                                {/* Footer */}
                                <View style={styles.stockFooter}>
                                    <View style={styles.footerItem}>
                                        <Text style={styles.footerLabel}>Price</Text>
                                        <Text style={styles.footerValue}>
                                            ${stock.currentPrice.toFixed(2)}
                                        </Text>
                                    </View>
                                    <View style={styles.footerItem}>
                                        <Text style={styles.footerLabel}>Discount</Text>
                                        <Text
                                            style={[
                                                styles.footerValue,
                                                {
                                                    color:
                                                        stock.discountToFairValue > 0
                                                            ? '#34C759'
                                                            : '#FF3B30',
                                                },
                                            ]}
                                        >
                                            {stock.discountToFairValue > 0 ? '+' : ''}
                                            {stock.discountToFairValue.toFixed(1)}%
                                        </Text>
                                    </View>
                                    <View style={styles.footerItem}>
                                        <Text style={styles.footerLabel}>RSI</Text>
                                        <Text
                                            style={[
                                                styles.footerValue,
                                                {
                                                    color:
                                                        (stock.rsi ?? 50) > 70
                                                            ? '#FF3B30'
                                                            : (stock.rsi ?? 50) < 30
                                                                ? '#34C759'
                                                                : '#333',
                                                },
                                            ]}
                                        >
                                            {(stock.rsi ?? 50).toFixed(0)}
                                        </Text>
                                    </View>
                                    <View style={styles.footerItem}>
                                        <Text style={styles.footerLabel}>Alloc</Text>
                                        <Text style={styles.footerValue}>
                                            {stock.allocation}%
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </>
                )}

                <View style={styles.spacing} />
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('StrategyExplainer')}
            >
                <Ionicons name="help-circle" size={28} color="white" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 24,
        paddingTop: 50,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: 'white',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    backBtn: {
        position: 'absolute',
        top: 50,
        left: 16,
        padding: 8,
        zIndex: 2,
    },
    refreshButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        padding: 8,
    },
    overview: {
        padding: 16,
    },
    overviewCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    overviewText: {
        marginLeft: 12,
        flex: 1,
    },
    overviewLabel: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    overviewValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    filters: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 16,
        gap: 8,
    },
    filterButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'center',
    },
    filterActive: {
        backgroundColor: '#667eea',
        borderColor: '#667eea',
    },
    filterText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    filterTextActive: {
        color: 'white',
    },
    list: {
        flex: 1,
        paddingHorizontal: 16,
    },
    loadingContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 13,
        color: '#999',
    },
    stockCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    stockHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    stockInfo: {
        flex: 1,
    },
    stockSymbol: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    stockName: {
        fontSize: 12,
        color: '#999',
    },
    recBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    recText: {
        fontSize: 12,
        fontWeight: '700',
        color: 'white',
    },
    scores: {
        marginBottom: 16,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    scoreLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#666',
        width: 70,
    },
    scoreBarContainer: {
        flex: 1,
        height: 6,
        backgroundColor: '#f0f0f0',
        borderRadius: 3,
        overflow: 'hidden',
        marginHorizontal: 8,
    },
    scoreBar: {
        height: '100%',
        borderRadius: 3,
    },
    scoreValue: {
        fontSize: 11,
        fontWeight: '600',
        color: '#1a1a1a',
        width: 30,
        textAlign: 'right',
    },
    stockFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    footerItem: {
        alignItems: 'center',
    },
    footerLabel: {
        fontSize: 11,
        color: '#999',
        marginBottom: 4,
    },
    footerValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    spacing: {
        height: 80,
    },
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#667eea',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
});

export default SmartStrategyScreen;
