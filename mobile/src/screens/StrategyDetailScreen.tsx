import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
    route: any;
    navigation: any;
}

const StrategyDetailScreen: React.FC<Props> = ({ route, navigation }) => {
    const { stock } = route.params;

    const renderLayer = (
        title: string,
        icon: string,
        color: string,
        score: number,
        details: { label: string; value: string; good: boolean }[]
    ) => (
        <View style={styles.layerCard}>
            <View style={styles.layerHeader}>
                <View style={[styles.layerIcon, { backgroundColor: `${color}20` }]}>
                    <Ionicons name={icon as any} size={24} color={color} />
                </View>
                <View style={styles.layerInfo}>
                    <Text style={styles.layerTitle}>{title}</Text>
                    <View style={styles.scoreContainer}>
                        <View style={styles.scoreBarBg}>
                            <View
                                style={[
                                    styles.scoreBarFill,
                                    { width: `${score}%`, backgroundColor: color },
                                ]}
                            />
                        </View>
                        <Text style={styles.scoreText}>{score}/100</Text>
                    </View>
                </View>
            </View>

            <View style={styles.layerDetails}>
                {details.map((detail, index) => (
                    <View key={index} style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{detail.label}</Text>
                        <View style={styles.detailValue}>
                            <Text style={[styles.detailText, { color: detail.good ? '#34C759' : '#FF3B30' }]}>
                                {detail.value}
                            </Text>
                            <Ionicons
                                name={detail.good ? 'checkmark-circle' : 'alert-circle'}
                                size={16}
                                color={detail.good ? '#34C759' : '#FF3B30'}
                            />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="chevron-back" size={28} color="white" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerSymbol}>{stock.symbol}</Text>
                    <Text style={styles.headerName}>{stock.companyName}</Text>
                </View>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Overall Score */}
                <View style={styles.overallCard}>
                    <Text style={styles.overallLabel}>Overall Strategy Score</Text>
                    <Text style={styles.overallScore}>{stock.overallScore}/100</Text>
                    <View
                        style={[
                            styles.recBadge,
                            {
                                backgroundColor:
                                    stock.recommendation === 'BUY'
                                        ? '#34C759'
                                        : stock.recommendation === 'HOLD'
                                        ? '#FF9500'
                                        : '#FF3B30',
                            },
                        ]}
                    >
                        <Text style={styles.recText}>{stock.recommendation}</Text>
                    </View>
                    <Text style={styles.confidenceText}>
                        Confidence: {stock.confidence}
                    </Text>
                </View>

                {/* Allocation */}
                <View style={styles.allocationCard}>
                    <View style={styles.allocationHeader}>
                        <Ionicons name="pie-chart" size={24} color="#667eea" />
                        <Text style={styles.allocationTitle}>
                            Suggested Portfolio Allocation
                        </Text>
                    </View>
                    <Text style={styles.allocationValue}>{stock.allocation}%</Text>
                    <Text style={styles.allocationDesc}>
                        Based on valuation, risk, and conviction
                    </Text>
                </View>

                {/* Layer 1: Value */}
                {renderLayer(
                    'Layer 1: Value Filter',
                    'cash',
                    '#007AFF',
                    stock.valueScore,
                    [
                        {
                            label: 'Intrinsic Value',
                            value: `$${stock.intrinsicValue.toFixed(2)}`,
                            good: true,
                        },
                        {
                            label: 'Current Price',
                            value: `$${stock.currentPrice.toFixed(2)}`,
                            good: stock.discountToFairValue >= 30,
                        },
                        {
                            label: 'Discount to Fair Value',
                            value: `${stock.discountToFairValue.toFixed(1)}%`,
                            good: stock.discountToFairValue >= 30,
                        },
                        {
                            label: 'Margin of Safety',
                            value: stock.discountToFairValue >= 30 ? 'YES ✓' : 'NO ✗',
                            good: stock.discountToFairValue >= 30,
                        },
                    ]
                )}

                {/* Layer 2: Quality */}
                {renderLayer(
                    'Layer 2: Quality Filter',
                    'shield-checkmark',
                    '#34C759',
                    stock.qualityScore,
                    [
                        {
                            label: 'Free Cash Flow',
                            value: stock.fcfPositive ? 'Positive ✓' : 'Negative ✗',
                            good: stock.fcfPositive,
                        },
                        {
                            label: 'Revenue Growth',
                            value: `${(stock.revenueGrowth ?? 0).toFixed(1)}%`,
                            good: (stock.revenueGrowth ?? 0) > 0,
                        },
                        {
                            label: 'Debt Ratio',
                            value: `${(stock.debtRatio ?? 0).toFixed(1)}%`,
                            good: (stock.debtRatio ?? 0) < 50,
                        },
                        {
                            label: 'Profit Margin',
                            value: `${(stock.profitMargin ?? 0).toFixed(1)}%`,
                            good: (stock.profitMargin ?? 0) > 0,
                        },
                        {
                            label: 'Return on Equity',
                            value: `${((stock.roe ?? 0) * 100).toFixed(1)}%`,
                            good: (stock.roe ?? 0) > 0.15,
                        },
                        {
                            label: 'Current Ratio',
                            value: `${(stock.currentRatio ?? 0).toFixed(2)}`,
                            good: (stock.currentRatio ?? 0) >= 1.0,
                        },
                    ]
                )}

                {/* Layer 3: Momentum */}
                {renderLayer(
                    'Layer 3: Momentum Trigger',
                    'trending-up',
                    '#FF9500',
                    stock.momentumScore,
                    [
                        {
                            label: '50-Day MA',
                            value: `$${stock.ma50.toFixed(2)}`,
                            good: stock.currentPrice > stock.ma50,
                        },
                        {
                            label: '200-Day MA',
                            value: `$${stock.ma200.toFixed(2)}`,
                            good: stock.currentPrice > stock.ma200,
                        },
                        {
                            label: 'Price vs MA50',
                            value:
                                stock.currentPrice > stock.ma50
                                    ? 'Above ✓'
                                    : 'Below ✗',
                            good: stock.currentPrice > stock.ma50,
                        },
                        {
                            label: 'RSI (14)',
                            value: `${(stock.rsi ?? 50).toFixed(0)}`,
                            good: (stock.rsi ?? 50) >= 30 && (stock.rsi ?? 50) <= 70,
                        },
                        {
                            label: 'Relative Strength',
                            value: `${stock.relativeStrength.toFixed(0)}`,
                            good: stock.relativeStrength > 50,
                        },
                    ]
                )}

                {/* Layer 4: Risk */}
                {renderLayer(
                    'Layer 4: Risk Assessment',
                    'warning',
                    '#8B5CF6',
                    stock.riskScore ?? 0,
                    [
                        {
                            label: 'Beta',
                            value: `${(stock.beta ?? 1).toFixed(2)}`,
                            good: (stock.beta ?? 1) <= 1.5,
                        },
                        {
                            label: 'Volatility',
                            value: `${((stock.volatility ?? 0) * 100).toFixed(1)}%`,
                            good: (stock.volatility ?? 0) < 0.4,
                        },
                        {
                            label: 'Max Drawdown',
                            value: `${((stock.maxDrawdown ?? 0) * 100).toFixed(1)}%`,
                            good: Math.abs(stock.maxDrawdown ?? 0) < 0.3,
                        },
                        {
                            label: 'Sharpe Estimate',
                            value: `${(stock.sharpeEstimate ?? 0).toFixed(2)}`,
                            good: (stock.sharpeEstimate ?? 0) > 0.5,
                        },
                    ]
                )}

                {/* Exit Rules */}
                <View style={styles.exitCard}>
                    <View style={styles.exitHeader}>
                        <Ionicons name="exit" size={24} color="#FF3B30" />
                        <Text style={styles.exitTitle}>Automatic Exit Rules</Text>
                    </View>
                    <View style={styles.exitRules}>
                        <View style={styles.exitRule}>
                            <Ionicons name="checkmark-circle" size={18} color="#999" />
                            <Text style={styles.exitRuleText}>
                                Sell when price reaches ${stock.intrinsicValue.toFixed(2)}
                            </Text>
                        </View>
                        <View style={styles.exitRule}>
                            <Ionicons name="checkmark-circle" size={18} color="#999" />
                            <Text style={styles.exitRuleText}>
                                Exit if fundamentals weaken
                            </Text>
                        </View>
                        <View style={styles.exitRule}>
                            <Ionicons name="checkmark-circle" size={18} color="#999" />
                            <Text style={styles.exitRuleText}>
                                Stop-loss if momentum breaks
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.spacing} />
            </ScrollView>

            {/* Action Button */}
            {stock.recommendation === 'BUY' && (
                <View style={styles.actionBar}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() =>
                            navigation.navigate('Watchlist', { addSymbol: stock.symbol })
                        }
                    >
                        <Ionicons name="bookmark" size={20} color="white" />
                        <Text style={styles.actionButtonText}>Add to Watchlist</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingTop: 50,
    },
    backButton: {
        marginBottom: 12,
    },
    headerContent: {
        marginLeft: 4,
    },
    headerSymbol: {
        fontSize: 24,
        fontWeight: '700',
        color: 'white',
        marginBottom: 4,
    },
    headerName: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    overallCard: {
        margin: 16,
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    overallLabel: {
        fontSize: 12,
        color: '#999',
        marginBottom: 8,
    },
    overallScore: {
        fontSize: 40,
        fontWeight: '700',
        color: '#667eea',
        marginBottom: 12,
    },
    recBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 12,
    },
    recText: {
        fontSize: 14,
        fontWeight: '700',
        color: 'white',
    },
    confidenceText: {
        fontSize: 12,
        color: '#666',
    },
    allocationCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        backgroundColor: '#f0f4ff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#d1e0ff',
    },
    allocationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    allocationTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
        marginLeft: 8,
    },
    allocationValue: {
        fontSize: 32,
        fontWeight: '700',
        color: '#667eea',
        marginBottom: 8,
    },
    allocationDesc: {
        fontSize: 12,
        color: '#666',
    },
    layerCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    layerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    layerIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    layerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    layerTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    scoreBarBg: {
        flex: 1,
        height: 6,
        backgroundColor: '#f0f0f0',
        borderRadius: 3,
        overflow: 'hidden',
        marginRight: 8,
    },
    scoreBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    scoreText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1a1a1a',
        minWidth: 50,
        textAlign: 'right',
    },
    layerDetails: {
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 13,
        color: '#666',
    },
    detailValue: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: 13,
        fontWeight: '600',
    },
    exitCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        backgroundColor: '#fff5f5',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ffd1d1',
    },
    exitHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    exitTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
        marginLeft: 8,
    },
    exitRules: {
        gap: 12,
    },
    exitRule: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    exitRuleText: {
        fontSize: 13,
        color: '#666',
        marginLeft: 8,
        flex: 1,
    },
    spacing: {
        height: 100,
    },
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#34C759',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
});

export default StrategyDetailScreen;
