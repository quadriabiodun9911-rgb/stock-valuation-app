import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    FlatList,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { stockAPI, PortfolioResponse } from '../services/api';

interface Props {
    navigation: any;
}

const PortfolioQuick: React.FC<Props> = ({ navigation }) => {
    const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadPortfolio();
    }, []);

    const loadPortfolio = async () => {
        try {
            setLoading(true);
            const data = await stockAPI.getPortfolio();
            setPortfolio(data);
        } catch (error) {
            Alert.alert('Error', 'Failed to load portfolio');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadPortfolio();
        setRefreshing(false);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    const totalValue = portfolio?.portfolio_value || 0;
    const totalInvested = portfolio?.total_invested || 0;
    const profit = totalValue - totalInvested;
    const returnPct = totalInvested > 0 ? ((profit / totalInvested) * 100).toFixed(2) : '0';

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Portfolio Summary</Text>
                <TouchableOpacity onPress={onRefresh}>
                    <Ionicons name="refresh" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Main Stats */}
                <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.mainCard}
                >
                    <View>
                        <Text style={styles.label}>Total Portfolio Value</Text>
                        <Text style={styles.value}>₦{totalValue.toFixed(2)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statsRow}>
                        <View>
                            <Text style={styles.statLabel}>Invested</Text>
                            <Text style={styles.statValue}>₦{totalInvested.toFixed(2)}</Text>
                        </View>
                        <View>
                            <Text style={styles.statLabel}>Profit/Loss</Text>
                            <Text
                                style={[
                                    styles.statValue,
                                    profit >= 0 ? styles.positive : styles.negative,
                                ]}
                            >
                                {profit >= 0 ? '+' : ''}₦{profit.toFixed(2)}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.statLabel}>Return %</Text>
                            <Text
                                style={[
                                    styles.statValue,
                                    parseFloat(returnPct) >= 0
                                        ? styles.positive
                                        : styles.negative,
                                ]}
                            >
                                {parseFloat(returnPct) >= 0 ? '+' : ''}{returnPct}%
                            </Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Holdings */}
                {portfolio && portfolio.positions && portfolio.positions.length > 0 ? (
                    <View style={styles.holdingsSection}>
                        <Text style={styles.sectionTitle}>Holdings</Text>
                        {portfolio.positions.map((holding, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.holdingCard}
                                onPress={() =>
                                    navigation.navigate('StockDetail', {
                                        symbol: holding.symbol,
                                    })
                                }
                            >
                                <View style={styles.holdingLeft}>
                                    <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                                    <Text style={styles.holdingQty}>
                                        {holding.quantity} shares @ ₦
                                        {holding.purchase_price.toFixed(2)}
                                    </Text>
                                </View>
                                <View style={styles.holdingRight}>
                                    <Text style={styles.holdingValue}>
                                        ₦{(holding.current_value || 0).toFixed(2)}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.holdingGain,
                                            holding.profit >= 0
                                                ? styles.positive
                                                : styles.negative,
                                        ]}
                                    >
                                        {holding.profit >= 0 ? '+' : ''}₦{holding.profit.toFixed(2)} (
                                        {holding.return_pct.toFixed(1)}%)
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="wallet-outline" size={48} color="#ddd" />
                        <Text style={styles.emptyTitle}>No Holdings</Text>
                        <Text style={styles.emptyText}>
                            Add your first stock to track your portfolio
                        </Text>
                        <TouchableOpacity
                            style={styles.emptyButton}
                            onPress={() => navigation.navigate('Home')}
                        >
                            <Text style={styles.emptyButtonText}>Browse Stocks</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('Dashboard')}
                    >
                        <Ionicons name="analytics" size={20} color="#007AFF" />
                        <Text style={styles.actionText}>Full Analysis</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('Screener')}
                    >
                        <Ionicons name="filter" size={20} color="#34C759" />
                        <Text style={styles.actionText}>AI Screener</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.spacing} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#007AFF',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: 'white',
    },
    mainCard: {
        marginHorizontal: 16,
        marginVertical: 20,
        padding: 20,
        borderRadius: 12,
    },
    label: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 4,
    },
    value: {
        fontSize: 28,
        fontWeight: '700',
        color: 'white',
        marginBottom: 12,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statLabel: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '700',
        color: 'white',
    },
    positive: {
        color: '#34C759',
    },
    negative: {
        color: '#FF3B30',
    },
    holdingsSection: {
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 12,
    },
    holdingCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    holdingLeft: {
        flex: 1,
    },
    holdingSymbol: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    holdingQty: {
        fontSize: 12,
        color: '#999',
    },
    holdingRight: {
        alignItems: 'flex-end',
        minWidth: 80,
    },
    holdingValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    holdingGain: {
        fontSize: 11,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginTop: 12,
        marginBottom: 4,
    },
    emptyText: {
        fontSize: 13,
        color: '#999',
        marginBottom: 16,
    },
    emptyButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    emptyButtonText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
    },
    quickActions: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginVertical: 20,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        paddingVertical: 12,
        borderRadius: 10,
        gap: 6,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    actionText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    spacing: {
        height: 20,
    },
});

export default PortfolioQuick;
