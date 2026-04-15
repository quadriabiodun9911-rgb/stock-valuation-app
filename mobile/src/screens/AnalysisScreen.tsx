import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    navigation: any;
}

const AnalysisScreen: React.FC<Props> = ({ navigation }) => {
    const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null);

    const analysisTypes = [
        {
            id: 'dcf',
            title: 'DCF Valuation',
            description: 'Cash-flow driven intrinsic value with scenario-ready assumptions.',
            icon: 'calculator',
            color: '#007AFF',
            focus: 'Intrinsic value + margin of safety',
            output: 'Base case value, upside/downside, sensitivity grid',
            features: [
                'Free Cash Flow Projection',
                'Terminal Value Calculation',
                'Risk-Adjusted Discount Rate',
                'Sensitivity Analysis',
                'Bear/Base/Bull Scenarios'
            ]
        },
        {
            id: 'comparable',
            title: 'Comparable Analysis',
            description: 'Peer multiple analysis for fair value ranges and relative rank.',
            icon: 'git-compare',
            color: '#34C759',
            focus: 'Relative valuation vs peer group',
            output: 'Implied price range, peer percentile, valuation spread',
            features: [
                'P/E Ratio Comparison',
                'EV/EBITDA Analysis',
                'Price-to-Book Ratios',
                'Industry Benchmarking',
                'Outlier Detection'
            ]
        },
        {
            id: 'technical',
            title: 'Technical Analysis',
            description: 'Trend, momentum, and volatility signals for timing entries.',
            icon: 'pulse',
            color: '#FF9500',
            focus: 'Trend strength + momentum regime',
            output: 'Signal score, levels, risk/reward bands',
            features: [
                'Moving Averages',
                'RSI & MACD Indicators',
                'Support & Resistance',
                'Buy/Sell Signals',
                'Volatility Bands'
            ]
        },
        {
            id: 'comprehensive',
            title: 'Full Analysis',
            description: 'Blend fundamentals, valuation, and technicals into one view.',
            icon: 'analytics',
            color: '#FF3B30',
            focus: 'Conviction score + risk framing',
            output: 'Unified rating, action plan, catalysts & risks',
            features: [
                'All Valuation Methods',
                'Investment Recommendation',
                'Risk Assessment',
                'Price Targets',
                'Catalyst Checklist'
            ]
        }
    ];

    const marketInsights = [
        {
            title: 'Macro Pulse',
            description: 'Growth-sensitive assets are stabilizing as inflation surprises fade.',
            trend: 'up',
            color: '#0EA5E9',
            signal: 'Risk-on bias',
            horizon: '1-3 months',
            driver: 'Cooling CPI prints and easing financial conditions.',
            watch: 'Real yields and credit spreads'
        },
        {
            title: 'Valuation Stretch',
            description: 'Mega-cap multiples sit above 5-year medians despite slower EPS growth.',
            trend: 'down',
            color: '#F97316',
            signal: 'Multiple compression risk',
            horizon: '3-6 months',
            driver: 'Higher discount rates and decelerating revisions.',
            watch: 'Forward P/E vs 10Y real rates'
        },
        {
            title: 'Sector Leadership',
            description: 'Quality cash-flow sectors are outperforming cyclicals on risk control.',
            trend: 'up',
            color: '#22C55E',
            signal: 'Quality bid',
            horizon: '4-8 weeks',
            driver: 'Margin resilience and low leverage profiles.',
            watch: 'ROIC spread to cost of capital'
        },
        {
            title: 'Earnings Season',
            description: 'Guidance dispersion is rising; beats are less rewarded.',
            trend: 'down',
            color: '#EF4444',
            signal: 'Event risk elevated',
            horizon: 'Next 4 weeks',
            driver: 'Conservative forward guidance and FX headwinds.',
            watch: 'Post-earnings drift'
        }
    ];

    const promptSymbolForScreen = (screen: string, title: string) => {
        Alert.prompt(
            'Stock Symbol',
            `Enter a stock symbol for ${title}:`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Continue',
                    onPress: (symbol?: string) => {
                        if (symbol && symbol.trim()) {
                            navigation.navigate(screen, {
                                symbol: symbol.trim().toUpperCase(),
                            });
                        }
                    },
                },
            ],
            'plain-text'
        );
    };

    const analysisTools = [
        {
            id: 'screener',
            title: 'Opportunity Screener',
            description: 'Cut through the noise with value, momentum, and quality signals.',
            icon: 'filter',
            color: '#007AFF',
            badge: 'Live',
            onPress: () => navigation.navigate('Screener'),
        },
        {
            id: 'scenario',
            title: 'Scenario Analysis',
            description: 'Stress test assumptions with upside/downside scenarios.',
            icon: 'analytics',
            color: '#6366F1',
            badge: 'Live',
            onPress: () => promptSymbolForScreen('ScenarioAnalysis', 'Scenario Analysis'),
        },
        {
            id: 'fcf',
            title: 'FCF Valuation',
            description: 'Build a free cash flow model with guided inputs.',
            icon: 'calculator',
            color: '#14B8A6',
            badge: 'Live',
            onPress: () => promptSymbolForScreen('FCFValuation', 'FCF Valuation'),
        },
        {
            id: 'dashboard',
            title: 'Portfolio Dashboard',
            description: 'Track holdings, exposure, and risk in one view.',
            icon: 'pie-chart',
            color: '#F59E0B',
            badge: 'Live',
            onPress: () => navigation.navigate('Dashboard'),
        },
        {
            id: 'research',
            title: 'Research Workspace',
            description: 'Pull company insights, catalysts, and risk flags.',
            icon: 'bulb',
            color: '#8B5CF6',
            badge: 'Beta',
            onPress: () => navigation.navigate('Intelligence'),
        },
    ];

    const learningModules = [
        {
            title: 'DCF Modeling',
            description: 'Structure cash flow forecasts, discount rates, and terminal value.',
            icon: 'school',
            color: '#5856D6',
            level: 'Intermediate',
            duration: '25 min',
        },
        {
            title: 'Multiples & Comps',
            description: 'Use peer groups to triangulate fair value ranges.',
            icon: 'library',
            color: '#AF52DE',
            level: 'Beginner',
            duration: '15 min',
        },
        {
            title: 'Moat & Quality',
            description: 'Assess durability, pricing power, and reinvestment quality.',
            icon: 'shield-checkmark',
            color: '#0EA5E9',
            level: 'Advanced',
            duration: '20 min',
        },
    ];

    const handleAnalysisSelect = (analysisType: any) => {
        Alert.alert(
            analysisType.title,
            `Enter a stock symbol to perform ${analysisType.title.toLowerCase()}:`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Analyze',
                    onPress: () => {
                        Alert.prompt(
                            'Stock Symbol',
                            'Enter stock symbol (e.g., AAPL):',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Analyze',
                                    onPress: (symbol?: string) => {
                                        if (symbol && symbol.trim()) {
                                            navigation.navigate('StockDetail', {
                                                symbol: symbol.trim().toUpperCase()
                                            });
                                        }
                                    }
                                }
                            ]
                        );
                    }
                }
            ]
        );
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Market Analysis</Text>
                <Text style={styles.headerSubtitle}>Clear guidance for smarter investing decisions.</Text>
            </View>

            {/* Analysis Types */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Analysis Methods</Text>
                <Text style={styles.sectionSubtitle}>
                    Choose the clearest lens for the decision you need to make.
                </Text>

                {analysisTypes.map((analysis) => (
                    <TouchableOpacity
                        key={analysis.id}
                        style={[styles.analysisCard, { borderLeftColor: analysis.color }]}
                        onPress={() => handleAnalysisSelect(analysis)}
                    >
                        <View style={styles.analysisHeader}>
                            <View style={styles.analysisIcon}>
                                <Ionicons
                                    name={analysis.icon as any}
                                    size={24}
                                    color={analysis.color}
                                />
                            </View>
                            <View style={styles.analysisContent}>
                                <Text style={styles.analysisTitle}>{analysis.title}</Text>
                                <Text style={styles.analysisDescription}>
                                    {analysis.description}
                                </Text>
                                <View style={styles.analysisMetaRow}>
                                    <Text style={styles.analysisMetaLabel}>Focus:</Text>
                                    <Text style={styles.analysisMetaValue}>{analysis.focus}</Text>
                                </View>
                                <View style={styles.analysisMetaRow}>
                                    <Text style={styles.analysisMetaLabel}>Output:</Text>
                                    <Text style={styles.analysisMetaValue}>{analysis.output}</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#666" />
                        </View>

                        <View style={styles.featuresList}>
                            {analysis.features.map((feature, index) => (
                                <View key={index} style={styles.featureItem}>
                                    <Ionicons name="checkmark" size={16} color={analysis.color} />
                                    <Text style={styles.featureText}>{feature}</Text>
                                </View>
                            ))}
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Market Insights */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Market Insights</Text>
                <Text style={styles.sectionSubtitle}>
                    Only the signals worth your attention right now.
                </Text>

                {marketInsights.map((insight, index) => (
                    <View key={index} style={styles.insightCard}>
                        <View style={styles.insightHeader}>
                            <Text style={styles.insightTitle}>{insight.title}</Text>
                            <View style={[styles.trendIndicator, { backgroundColor: insight.color }]}>
                                <Ionicons
                                    name={insight.trend === 'up' ? 'trending-up' : 'trending-down'}
                                    size={16}
                                    color="white"
                                />
                            </View>
                        </View>
                        <Text style={styles.insightDescription}>{insight.description}</Text>
                        <View style={styles.insightStatsRow}>
                            <View style={styles.insightStatItem}>
                                <Text style={styles.insightStatLabel}>Signal</Text>
                                <Text style={styles.insightStatValue}>{insight.signal}</Text>
                            </View>
                            <View style={styles.insightStatItem}>
                                <Text style={styles.insightStatLabel}>Horizon</Text>
                                <Text style={styles.insightStatValue}>{insight.horizon}</Text>
                            </View>
                        </View>
                        <View style={styles.insightDriverRow}>
                            <Ionicons name="flash" size={14} color={insight.color} />
                            <Text style={styles.insightDriverText}>{insight.driver}</Text>
                        </View>
                        <View style={styles.insightWatchRow}>
                            <Ionicons name="eye" size={14} color="#6B7280" />
                            <Text style={styles.insightWatchText}>{insight.watch}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Analysis Tools */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Analysis Tools</Text>

                {analysisTools.map((tool) => (
                    <TouchableOpacity
                        key={tool.id}
                        style={styles.toolCard}
                        onPress={tool.onPress}
                    >
                        <View style={[styles.toolIcon, { backgroundColor: `${tool.color}1A` }]}>
                            <Ionicons name={tool.icon as any} size={22} color={tool.color} />
                        </View>
                        <View style={styles.toolContent}>
                            <Text style={styles.toolTitle}>{tool.title}</Text>
                            <Text style={styles.toolDescription}>{tool.description}</Text>
                        </View>
                        <View style={styles.toolBadge}>
                            <Text style={styles.toolBadgeText}>{tool.badge}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Educational Content */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Learn Valuation</Text>

                {learningModules.map((module, index) => (
                    <View key={index} style={styles.educationCard}>
                        <View style={[styles.educationIcon, { backgroundColor: `${module.color}1A` }]}>
                            <Ionicons name={module.icon as any} size={20} color={module.color} />
                        </View>
                        <View style={styles.educationContent}>
                            <Text style={styles.educationTitle}>{module.title}</Text>
                            <Text style={styles.educationDescription}>{module.description}</Text>
                            <View style={styles.educationMetaRow}>
                                <Text style={styles.educationMeta}>{module.level}</Text>
                                <Text style={styles.educationMetaDot}>•</Text>
                                <Text style={styles.educationMeta}>{module.duration}</Text>
                            </View>
                        </View>
                    </View>
                ))}

                <TouchableOpacity
                    style={styles.educationCta}
                    onPress={() => navigation.navigate('Education')}
                >
                    <Ionicons name="play" size={18} color="white" />
                    <Text style={styles.educationCtaText}>Start Learning</Text>
                </TouchableOpacity>
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
    section: {
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
    analysisCard: {
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        borderLeftWidth: 4,
    },
    analysisHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    analysisIcon: {
        marginRight: 12,
    },
    analysisContent: {
        flex: 1,
    },
    analysisTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    analysisDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 18,
    },
    analysisMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    analysisMetaLabel: {
        fontSize: 12,
        color: '#9CA3AF',
        marginRight: 6,
    },
    analysisMetaValue: {
        fontSize: 12,
        color: '#374151',
        flexShrink: 1,
    },
    featuresList: {
        paddingLeft: 36,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    featureText: {
        fontSize: 12,
        color: '#666',
        marginLeft: 8,
    },
    insightCard: {
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
    },
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    insightTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    trendIndicator: {
        width: 32,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    insightDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 18,
    },
    insightStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    insightStatItem: {
        flex: 1,
        paddingRight: 8,
    },
    insightStatLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: 4,
    },
    insightStatValue: {
        fontSize: 13,
        color: '#374151',
        fontWeight: '600',
    },
    insightDriverRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    insightDriverText: {
        fontSize: 12,
        color: '#6B7280',
        marginLeft: 6,
        flex: 1,
    },
    insightWatchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    insightWatchText: {
        fontSize: 12,
        color: '#6B7280',
        marginLeft: 6,
        flex: 1,
    },
    toolCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    toolIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toolContent: {
        flex: 1,
        marginLeft: 16,
    },
    toolTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 2,
    },
    toolDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 18,
    },
    toolBadge: {
        backgroundColor: '#E0E7FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    toolBadgeText: {
        fontSize: 11,
        color: '#3730A3',
        fontWeight: '600',
    },
    comingSoon: {
        fontSize: 12,
        color: '#FF9500',
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        fontWeight: '500',
    },
    educationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    educationIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    educationContent: {
        marginLeft: 16,
        flex: 1,
    },
    educationTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 2,
    },
    educationDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 18,
    },
    educationMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    educationMeta: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    educationMetaDot: {
        fontSize: 12,
        color: '#9CA3AF',
        marginHorizontal: 6,
    },
    educationCta: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#111827',
        paddingVertical: 12,
        borderRadius: 10,
    },
    educationCtaText: {
        color: 'white',
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default AnalysisScreen;