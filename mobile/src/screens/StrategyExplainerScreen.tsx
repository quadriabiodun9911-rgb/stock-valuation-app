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
    navigation: any;
}

const StrategyExplainerScreen: React.FC<Props> = ({ navigation }) => {
    const renderLayerExplanation = (
        number: string,
        title: string,
        icon: string,
        color: string,
        description: string,
        criteria: string[],
        example: { label: string; value: string }
    ) => (
        <View style={styles.layerSection}>
            <View style={styles.layerHeaderContainer}>
                <View style={[styles.layerNumber, { backgroundColor: color }]}>
                    <Text style={styles.layerNumberText}>{number}</Text>
                </View>
                <View style={styles.layerTitleContainer}>
                    <View style={[styles.iconCircle, { backgroundColor: `${color}20` }]}>
                        <Ionicons name={icon as any} size={20} color={color} />
                    </View>
                    <Text style={styles.layerTitle}>{title}</Text>
                </View>
            </View>

            <Text style={styles.layerDescription}>{description}</Text>

            <View style={styles.criteriaBox}>
                <Text style={styles.criteriaTitle}>Criteria:</Text>
                {criteria.map((item, index) => (
                    <View key={index} style={styles.criteriaItem}>
                        <Ionicons name="checkmark-circle" size={16} color={color} />
                        <Text style={styles.criteriaText}>{item}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.exampleBox}>
                <Text style={styles.exampleTitle}>Example:</Text>
                <View style={styles.exampleContent}>
                    <Text style={styles.exampleLabel}>{example.label}</Text>
                    <Text style={[styles.exampleValue, { color }]}>
                        {example.value}
                    </Text>
                </View>
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
                <Text style={styles.headerTitle}>How Smart Strategy Works</Text>
                <Text style={styles.headerSubtitle}>
                    Professional hedge fund approach for individual investors
                </Text>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Introduction */}
                <View style={styles.introCard}>
                    <View style={styles.introHeader}>
                        <Ionicons name="bulb" size={32} color="#667eea" />
                        <Text style={styles.introTitle}>The Strategy</Text>
                    </View>
                    <Text style={styles.introText}>
                        Our Smart Strategy combines{' '}
                        <Text style={styles.bold}>Value Investing</Text>,{' '}
                        <Text style={styles.bold}>Quality Screening</Text>, and{' '}
                        <Text style={styles.bold}>Momentum Timing</Text> to identify
                        stocks with the highest probability of success.
                    </Text>
                    <Text style={styles.introText}>
                        Think of it as your personal fund manager + research analyst +
                        risk controller in one system.
                    </Text>
                </View>

                {/* The 5-Layer System */}
                <View style={styles.systemCard}>
                    <Text style={styles.systemTitle}>The 5-Layer System</Text>
                    <Text style={styles.systemSubtitle}>
                        Only stocks that pass all layers make it to BUY recommendation
                    </Text>
                </View>

                {/* Layer 1 */}
                {renderLayerExplanation(
                    '1',
                    'Value Filter',
                    'cash',
                    '#007AFF',
                    'First, we calculate the intrinsic value (what the stock is TRULY worth). We only consider stocks trading at least 30% below their fair value.',
                    [
                        'Calculate intrinsic value using DCF model',
                        'Compare to current market price',
                        'Require minimum 30% discount (margin of safety)',
                        'Protects against downside risk',
                    ],
                    {
                        label: 'Stock trading at ₦10, worth ₦15',
                        value: '33% discount → PASS ✓',
                    }
                )}

                {/* Layer 2 */}
                {renderLayerExplanation(
                    '2',
                    'Quality Filter',
                    'shield-checkmark',
                    '#34C759',
                    'Second, we ensure the company is financially healthy. Great businesses generate cash, grow revenue, and manage debt wisely.',
                    [
                        'Free Cash Flow must be positive',
                        'Revenue growth over past year',
                        'Debt ratio below 50%',
                        'Positive profit margins',
                    ],
                    {
                        label: 'Company with ₦5B FCF, 15% growth, 30% debt',
                        value: 'Quality score 85/100 → PASS ✓',
                    }
                )}

                {/* Layer 3 */}
                {renderLayerExplanation(
                    '3',
                    'Momentum Trigger',
                    'trending-up',
                    '#FF9500',
                    'Third, we wait for the right time to buy. Even great stocks at great prices need momentum to confirm the market is starting to recognize their value.',
                    [
                        'Price above 50-day moving average',
                        'Price above 200-day moving average',
                        'Relative strength index (vs market)',
                        'Positive technical setup',
                    ],
                    {
                        label: 'Stock breaking above key MAs with RSI at 60',
                        value: 'Momentum confirmed → PASS ✓',
                    }
                )}

                {/* Layer 4 */}
                {renderLayerExplanation(
                    '4',
                    'Capital Allocation',
                    'pie-chart',
                    '#FF3B30',
                    'Fourth, we size positions based on conviction and risk. Higher-quality opportunities with better value get larger allocations.',
                    [
                        'Maximum 10% per position (risk management)',
                        'Higher allocation for strong signals',
                        'Lower allocation for borderline cases',
                        'Based on volatility and conviction',
                    ],
                    {
                        label: 'Stock with 90/100 score, low volatility',
                        value: '8% allocation suggested',
                    }
                )}

                {/* Layer 5 */}
                {renderLayerExplanation(
                    '5',
                    'Exit Rules',
                    'exit',
                    '#8E8E93',
                    'Finally, we enforce discipline on exits. Emotions often cause investors to hold too long or sell too early. Our system automates this.',
                    [
                        'Sell when price reaches fair value',
                        'Exit if fundamentals deteriorate',
                        'Stop-loss if momentum breaks',
                        'No second-guessing the system',
                    ],
                    {
                        label: 'Stock reaches ₦15 fair value target',
                        value: 'Automatic sell signal → EXIT',
                    }
                )}

                {/* Why This Works */}
                <View style={styles.whyCard}>
                    <Text style={styles.whyTitle}>Why This Works</Text>
                    <View style={styles.whyItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                        <View style={styles.whyText}>
                            <Text style={styles.whyHeading}>Removes Emotion</Text>
                            <Text style={styles.whyDesc}>
                                No fear, no greed. Just rules and data.
                            </Text>
                        </View>
                    </View>
                    <View style={styles.whyItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                        <View style={styles.whyText}>
                            <Text style={styles.whyHeading}>Triple Confirmation</Text>
                            <Text style={styles.whyDesc}>
                                Value + Quality + Momentum = Higher win rate
                            </Text>
                        </View>
                    </View>
                    <View style={styles.whyItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                        <View style={styles.whyText}>
                            <Text style={styles.whyHeading}>Risk Management</Text>
                            <Text style={styles.whyDesc}>
                                Position sizing and stops protect capital
                            </Text>
                        </View>
                    </View>
                    <View style={styles.whyItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                        <View style={styles.whyText}>
                            <Text style={styles.whyHeading}>Proven Approach</Text>
                            <Text style={styles.whyDesc}>
                                Used by successful hedge funds worldwide
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Recommendations Explained */}
                <View style={styles.recsCard}>
                    <Text style={styles.recsTitle}>Recommendation Levels</Text>
                    <View style={styles.recItem}>
                        <View style={[styles.recBadge, { backgroundColor: '#34C759' }]}>
                            <Text style={styles.recBadgeText}>BUY</Text>
                        </View>
                        <Text style={styles.recDesc}>
                            All 3 layers pass. Strong conviction. Add to portfolio.
                        </Text>
                    </View>
                    <View style={styles.recItem}>
                        <View style={[styles.recBadge, { backgroundColor: '#FF9500' }]}>
                            <Text style={styles.recBadgeText}>HOLD</Text>
                        </View>
                        <Text style={styles.recDesc}>
                            2 layers pass. Watch closely. May upgrade to BUY.
                        </Text>
                    </View>
                    <View style={styles.recItem}>
                        <View style={[styles.recBadge, { backgroundColor: '#FF3B30' }]}>
                            <Text style={styles.recBadgeText}>SELL</Text>
                        </View>
                        <Text style={styles.recDesc}>
                            0-1 layers pass. Exit position or avoid entry.
                        </Text>
                    </View>
                </View>

                <View style={styles.spacing} />
            </ScrollView>

            {/* CTA Button */}
            <View style={styles.ctaBar}>
                <TouchableOpacity
                    style={styles.ctaButton}
                    onPress={() => navigation.navigate('SmartStrategy')}
                >
                    <Text style={styles.ctaButtonText}>View Live Recommendations</Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                </TouchableOpacity>
            </View>
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
        paddingVertical: 24,
        paddingTop: 50,
    },
    backButton: {
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: 'white',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    introCard: {
        margin: 16,
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    introHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    introTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
        marginLeft: 12,
    },
    introText: {
        fontSize: 14,
        lineHeight: 22,
        color: '#666',
        marginBottom: 12,
    },
    bold: {
        fontWeight: '600',
        color: '#667eea',
    },
    systemCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        backgroundColor: '#f0f4ff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#d1e0ff',
    },
    systemTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    systemSubtitle: {
        fontSize: 13,
        color: '#666',
    },
    layerSection: {
        marginHorizontal: 16,
        marginBottom: 24,
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    layerHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    layerNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    layerNumberText: {
        fontSize: 16,
        fontWeight: '700',
        color: 'white',
    },
    layerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    layerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    layerDescription: {
        fontSize: 14,
        lineHeight: 22,
        color: '#666',
        marginBottom: 16,
    },
    criteriaBox: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    criteriaTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#999',
        marginBottom: 8,
    },
    criteriaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    criteriaText: {
        fontSize: 13,
        color: '#666',
        marginLeft: 8,
        flex: 1,
    },
    exampleBox: {
        backgroundColor: '#f0f4ff',
        padding: 12,
        borderRadius: 8,
    },
    exampleTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#999',
        marginBottom: 8,
    },
    exampleContent: {
        gap: 4,
    },
    exampleLabel: {
        fontSize: 13,
        color: '#666',
    },
    exampleValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    whyCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        backgroundColor: '#f0fff4',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#c6f6d5',
    },
    whyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 16,
    },
    whyItem: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    whyText: {
        flex: 1,
        marginLeft: 12,
    },
    whyHeading: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    whyDesc: {
        fontSize: 13,
        color: '#666',
    },
    recsCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    recsTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 16,
    },
    recItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    recBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        minWidth: 60,
        alignItems: 'center',
    },
    recBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: 'white',
    },
    recDesc: {
        fontSize: 13,
        color: '#666',
        marginLeft: 12,
        flex: 1,
    },
    spacing: {
        height: 100,
    },
    ctaBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#667eea',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    ctaButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
});

export default StrategyExplainerScreen;
