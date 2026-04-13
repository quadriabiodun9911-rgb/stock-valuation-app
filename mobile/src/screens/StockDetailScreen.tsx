import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { stockAPI, StockInfo, ComprehensiveResult, PriceEpsSeries, FinancialGrowthMetrics } from '../services/api';

interface Props {
    route: any;
    navigation: any;
}

const StockDetailScreen: React.FC<Props> = ({ route, navigation }) => {
    const { symbol } = route.params;
    const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
    const [analysis, setAnalysis] = useState<ComprehensiveResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'analysis'>('overview');
    const [priceEpsSeries, setPriceEpsSeries] = useState<PriceEpsSeries | null>(null);
    const [priceEpsLoading, setPriceEpsLoading] = useState(false);
    const [growthMetrics, setGrowthMetrics] = useState<FinancialGrowthMetrics | null>(null);
    const [growthLoading, setGrowthLoading] = useState(false);
    const [priceEpsPeriod, setPriceEpsPeriod] = useState<'6mo' | '1y' | '3y' | '5y'>('1y');

    useEffect(() => {
        loadStockData();
    }, [symbol]);

    useEffect(() => {
        loadAnalysis();
    }, [symbol]);

    useEffect(() => {
        loadPriceEpsSeries(priceEpsPeriod);
    }, [symbol, priceEpsPeriod]);

    const loadStockData = async () => {
        try {
            setLoading(true);
            const info = await stockAPI.getStockInfo(symbol);
            setStockInfo(info);
            loadGrowthMetrics();
        } catch (error: any) {
            console.error('Error loading stock data:', error);

            // Handle specific error types
            if (error.response?.status === 503) {
                const errorData = error.response?.data?.detail;
                if (errorData?.error === 'NGX_NOT_SUPPORTED') {
                    Alert.alert(
                        'Nigerian Stocks Not Available',
                        errorData.message + '\n\n' + errorData.suggestion,
                        [{ text: 'OK' }]
                    );
                    navigation.goBack();
                    return;
                }
            }

            if (error.response?.status === 404) {
                const errorData = error.response?.data?.detail;
                Alert.alert(
                    'Stock Not Found',
                    errorData?.message || 'Unable to find data for this stock symbol.',
                    [{ text: 'OK' }]
                );
                navigation.goBack();
            } else {
                Alert.alert('Error', 'Failed to load stock data. Please check your internet connection and try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const loadGrowthMetrics = async () => {
        try {
            setGrowthLoading(true);
            const metrics = await stockAPI.getFinancialGrowthMetrics(symbol, '1y');
            setGrowthMetrics(metrics);
        } catch (error) {
            console.error('Error loading growth metrics:', error);
        } finally {
            setGrowthLoading(false);
        }
    };

    const loadPriceEpsSeries = async (period: '6mo' | '1y' | '3y' | '5y' = '1y') => {
        try {
            setPriceEpsLoading(true);
            const series = await stockAPI.getPriceEpsSeries(symbol, period);
            setPriceEpsSeries(series);
        } catch (error) {
            console.error('Error loading price/EPS series:', error);
        } finally {
            setPriceEpsLoading(false);
        }
    };

    const getEpsChangePoints = () => {
        if (!priceEpsSeries || priceEpsSeries.points.length === 0) return [] as PriceEpsSeries['points'];
        const changes: PriceEpsSeries['points'] = [];
        let lastEps: number | null = null;
        priceEpsSeries.points.forEach((point) => {
            if (point.eps === null) return;
            if (lastEps === null || point.eps !== lastEps) {
                changes.push(point);
                lastEps = point.eps;
            }
        });
        return changes;
    };

    const getEpsSummary = () => {
        const changes = getEpsChangePoints();
        if (changes.length < 2) return null;
        const last = changes[changes.length - 1];
        const prev = changes[changes.length - 2];
        const changePct = prev.eps ? ((Number(last.eps) - Number(prev.eps)) / Math.abs(Number(prev.eps))) * 100 : null;
        return {
            lastEps: last.eps,
            prevEps: prev.eps,
            changePct,
            date: last.date,
        };
    };

    const loadAnalysis = async () => {
        if (analysis) return; // Already loaded

        try {
            setAnalysisLoading(true);
            const result = await stockAPI.getComprehensiveAnalysis(symbol);
            setAnalysis(result);
        } catch (error) {
            console.error('Error loading analysis:', error);
            Alert.alert('Error', 'Failed to load analysis. Please try again.');
        } finally {
            setAnalysisLoading(false);
        }
    };

    const handleAnalysisTab = () => {
        setActiveTab('analysis');
        loadAnalysis();
    };

    const navigateToValuation = () => {
        navigation.navigate('Valuation', { symbol, stockInfo });
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

    const formatPercentage = (value: number): string => {
        return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
    };

    const getRecommendationColor = (action: string): string => {
        switch (action.toLowerCase()) {
            case 'buy': return '#34C759';
            case 'sell': return '#FF3B30';
            default: return '#FF9500';
        }
    };

    const getSignalLabel = (action?: string) => {
        if (!action) return 'Watch';
        if (action.toLowerCase() === 'buy') return 'Buy';
        if (action.toLowerCase() === 'sell') return 'Avoid';
        return 'Watch';
    };

    const buildPriceEpsChart = () => {
        if (!priceEpsSeries || priceEpsSeries.points.length === 0) return null;

        const points = priceEpsSeries.points;
        const maxPoints = 60;
        const step = Math.max(1, Math.ceil(points.length / maxPoints));
        const sampled = points.filter((_, index) => index % step === 0);

        const prices = sampled.map((point) => point.price ?? 0);
        const epsValues = sampled.map((point) => point.eps).filter((value) => value !== null) as number[];

        if (prices.length === 0) return null;

        const priceMin = Math.min(...prices);
        const priceMax = Math.max(...prices);
        const epsMin = epsValues.length ? Math.min(...epsValues) : 0;
        const epsMax = epsValues.length ? Math.max(...epsValues) : 0;
        const epsRange = epsMax - epsMin;
        const priceRange = priceMax - priceMin || 1;

        const scaledEps = sampled.map((point) => {
            if (point.eps === null || epsRange === 0) return priceMin;
            return ((point.eps - epsMin) / epsRange) * priceRange + priceMin;
        });

        const labels = sampled.map((point) => point.date.slice(5));

        return {
            labels,
            datasets: [
                {
                    data: prices,
                    color: () => '#3B82F6',
                    strokeWidth: 2,
                },
                {
                    data: scaledEps,
                    color: () => '#10B981',
                    strokeWidth: 2,
                },
            ],
            legend: ['Price', 'EPS (P/E-derived)'],
        };
    };

    const buildEpsChart = () => {
        const changes = getEpsChangePoints();
        if (changes.length === 0) return null;

        const maxPoints = 12;
        const step = Math.max(1, Math.ceil(changes.length / maxPoints));
        const sampled = changes.filter((_, index) => index % step === 0);
        const epsValues = sampled.map((point) => point.eps ?? 0);
        const labels = sampled.map((point) => point.date.slice(5));

        return {
            labels,
            datasets: [
                {
                    data: epsValues,
                    color: () => '#8B5CF6',
                    strokeWidth: 2,
                },
            ],
            legend: ['Reported EPS'],
        };
    };

    const epsSummary = getEpsSummary();

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading stock data...</Text>
            </View>
        );
    }

    if (!stockInfo) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color="#FF3B30" />
                <Text style={styles.errorText}>Stock not found</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadStockData}>
                    <Text style={styles.retryText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.stockTitle}>
                    <Text style={styles.symbol}>{stockInfo.symbol}</Text>
                    <Text style={styles.companyName}>{stockInfo.company_name}</Text>
                    <Text style={styles.sectorInfo}>
                        {stockInfo.sector} • {stockInfo.industry}
                    </Text>
                </View>
                <Text style={styles.currentPrice}>
                    {formatPrice(stockInfo.current_price)}
                </Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
                    onPress={() => setActiveTab('overview')}
                >
                    <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
                        Overview
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'analysis' && styles.activeTab]}
                    onPress={handleAnalysisTab}
                >
                    <Text style={[styles.tabText, activeTab === 'analysis' && styles.activeTabText]}>
                        Analysis
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'overview' ? (
                <View>
                    {/* Signal */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Today’s Signal</Text>
                        <View style={styles.signalSummaryCard}>
                            {analysisLoading ? (
                                <Text style={styles.signalSummaryText}>Calculating signal...</Text>
                            ) : (
                                <>
                                    <Text style={styles.signalSummaryLabel}>Signal</Text>
                                    <Text style={[styles.signalSummaryValue, { color: getRecommendationColor(analysis?.recommendation.action || 'hold') }]}>
                                        {getSignalLabel(analysis?.recommendation.action)}
                                    </Text>
                                    <Text style={styles.signalSummaryText}>
                                        Based on fundamentals and technical indicators.
                                    </Text>
                                </>
                            )}
                        </View>
                    </View>

                    {/* Key Metrics */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Key Metrics</Text>
                        <View style={styles.metricsGrid}>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>Market Cap</Text>
                                <Text style={styles.metricValue}>
                                    {formatMarketCap(stockInfo.market_cap)}
                                </Text>
                            </View>

                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>P/E Ratio</Text>
                                <Text style={styles.metricValue}>
                                    {stockInfo.pe_ratio ? stockInfo.pe_ratio.toFixed(2) : 'N/A'}
                                </Text>
                            </View>

                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>Dividend Yield</Text>
                                <Text style={styles.metricValue}>
                                    {stockInfo.dividend_yield ? `${(stockInfo.dividend_yield * 100).toFixed(2)}%` : 'N/A'}
                                </Text>
                            </View>

                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>Beta</Text>
                                <Text style={styles.metricValue}>
                                    {stockInfo.beta ? stockInfo.beta.toFixed(2) : 'N/A'}
                                </Text>
                            </View>

                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>52W High</Text>
                                <Text style={styles.metricValue}>
                                    {formatPrice(stockInfo['52_week_high'])}
                                </Text>
                            </View>

                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>52W Low</Text>
                                <Text style={styles.metricValue}>
                                    {formatPrice(stockInfo['52_week_low'])}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Trading Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Trading Information</Text>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Volume</Text>
                            <Text style={styles.infoValue}>
                                {stockInfo.volume ? stockInfo.volume.toLocaleString() : 'N/A'}
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Avg Volume</Text>
                            <Text style={styles.infoValue}>
                                {stockInfo.avg_volume ? stockInfo.avg_volume.toLocaleString() : 'N/A'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Growth Metrics</Text>
                        <Text style={styles.sectionSubtitle}>
                            Revenue, earnings, price, EPS, and debt-to-equity growth.
                        </Text>
                        {growthLoading ? (
                            <View style={styles.chartLoading}>
                                <ActivityIndicator size="small" color="#007AFF" />
                                <Text style={styles.loadingText}>Loading growth metrics...</Text>
                            </View>
                        ) : growthMetrics ? (
                            <View style={styles.metricsGrid}>
                                <View style={styles.metricCard}>
                                    <Text style={styles.metricLabel}>Revenue Growth</Text>
                                    <Text style={styles.metricValue}>
                                        {growthMetrics.growth.revenue_growth !== null
                                            ? `${growthMetrics.growth.revenue_growth.toFixed(1)}%`
                                            : 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.metricCard}>
                                    <Text style={styles.metricLabel}>Earnings Growth</Text>
                                    <Text style={styles.metricValue}>
                                        {growthMetrics.growth.earnings_growth !== null
                                            ? `${growthMetrics.growth.earnings_growth.toFixed(1)}%`
                                            : 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.metricCard}>
                                    <Text style={styles.metricLabel}>Price Growth</Text>
                                    <Text style={styles.metricValue}>
                                        {growthMetrics.growth.price_growth !== null
                                            ? `${growthMetrics.growth.price_growth.toFixed(1)}%`
                                            : 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.metricCard}>
                                    <Text style={styles.metricLabel}>EPS Growth</Text>
                                    <Text style={styles.metricValue}>
                                        {growthMetrics.growth.eps_growth !== null
                                            ? `${growthMetrics.growth.eps_growth.toFixed(1)}%`
                                            : 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.metricCard}>
                                    <Text style={styles.metricLabel}>Debt/Equity Growth</Text>
                                    <Text style={styles.metricValue}>
                                        {growthMetrics.growth.debt_to_equity_growth !== null
                                            ? `${growthMetrics.growth.debt_to_equity_growth.toFixed(1)}%`
                                            : 'N/A'}
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <Text style={styles.noDataText}>No growth metrics available.</Text>
                        )}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Price & EPS Movement</Text>
                        <Text style={styles.sectionSubtitle}>
                            Daily EPS is derived from P/E, so it reflects price movement.
                        </Text>
                        <View style={styles.periodSelector}>
                            {(['6mo', '1y', '3y', '5y'] as const).map((period) => (
                                <TouchableOpacity
                                    key={period}
                                    style={[styles.periodButton, priceEpsPeriod === period && styles.periodButtonActive]}
                                    onPress={() => setPriceEpsPeriod(period)}
                                >
                                    <Text
                                        style={[styles.periodButtonText, priceEpsPeriod === period && styles.periodButtonTextActive]}
                                    >
                                        {period.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {priceEpsLoading ? (
                            <View style={styles.chartLoading}>
                                <ActivityIndicator size="small" color="#007AFF" />
                                <Text style={styles.loadingText}>Loading chart...</Text>
                            </View>
                        ) : buildPriceEpsChart() ? (
                            <View>
                                <LineChart
                                    data={buildPriceEpsChart()!}
                                    width={Dimensions.get('window').width - 32}
                                    height={240}
                                    withDots={false}
                                    withInnerLines={false}
                                    chartConfig={{
                                        backgroundGradientFrom: '#ffffff',
                                        backgroundGradientTo: '#ffffff',
                                        decimalPlaces: 2,
                                        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                                        labelColor: () => '#6b7280',
                                        propsForBackgroundLines: { stroke: '#f3f4f6' },
                                    }}
                                    style={styles.lineChart}
                                />

                                {epsSummary ? (
                                    <View style={styles.epsSummaryCard}>
                                        <View style={styles.epsSummaryHeader}>
                                            <Text style={styles.epsSummaryTitle}>EPS Snapshot</Text>
                                            <Text style={styles.epsSummaryBadge}>P/E-derived</Text>
                                        </View>
                                        <View style={styles.epsSummaryRow}>
                                            <Text style={styles.epsSummaryLabel}>Latest EPS</Text>
                                            <Text style={styles.epsSummaryValue}>${epsSummary.lastEps?.toFixed(2)}</Text>
                                        </View>
                                        <View style={styles.epsSummaryRow}>
                                            <Text style={styles.epsSummaryLabel}>Prev EPS</Text>
                                            <Text style={styles.epsSummaryValue}>${epsSummary.prevEps?.toFixed(2)}</Text>
                                        </View>
                                        <View style={styles.epsSummaryRow}>
                                            <Text style={styles.epsSummaryLabel}>EPS Change</Text>
                                            <Text
                                                style={[
                                                    styles.epsSummaryValue,
                                                    epsSummary.changePct !== null && epsSummary.changePct < 0
                                                        ? styles.epsSummaryChangeNegative
                                                        : styles.epsSummaryChange
                                                ]}
                                            >
                                                {epsSummary.changePct !== null
                                                    ? formatPercentage(epsSummary.changePct)
                                                    : 'N/A'}
                                            </Text>
                                        </View>
                                        <Text style={styles.epsSummaryDate}>Last update: {epsSummary.date}</Text>
                                    </View>
                                ) : null}

                                {buildEpsChart() ? (
                                    <View style={styles.epsChartContainer}>
                                        <Text style={styles.sectionSubtitle}>Reported EPS (by earnings date)</Text>
                                        <LineChart
                                            data={buildEpsChart()!}
                                            width={Dimensions.get('window').width - 32}
                                            height={200}
                                            withDots
                                            withInnerLines={false}
                                            chartConfig={{
                                                backgroundGradientFrom: '#ffffff',
                                                backgroundGradientTo: '#ffffff',
                                                decimalPlaces: 2,
                                                color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                                                labelColor: () => '#6b7280',
                                                propsForBackgroundLines: { stroke: '#f3f4f6' },
                                            }}
                                            style={styles.lineChart}
                                        />
                                    </View>
                                ) : null}
                            </View>
                        ) : (
                            <Text style={styles.noDataText}>No price/EPS data available.</Text>
                        )}
                    </View>

                    {/* Action Buttons */}
                    <TouchableOpacity style={styles.analyzeButton} onPress={navigateToValuation}>
                        <Ionicons name="analytics" size={24} color="white" />
                        <Text style={styles.analyzeButtonText}>Detailed Valuation Analysis</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.analyzeButton, { backgroundColor: '#1a365d', marginTop: 8 }]}
                        onPress={() => navigation.navigate('Financials', { symbol })}
                    >
                        <Ionicons name="document-text" size={24} color="white" />
                        <Text style={styles.analyzeButtonText}>Financial Statements</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.analyzeButton, { backgroundColor: '#065f46', marginTop: 8 }]}
                        onPress={() => navigation.navigate('Earnings', { symbol })}
                    >
                        <Ionicons name="bar-chart" size={24} color="white" />
                        <Text style={styles.analyzeButtonText}>Earnings Analysis</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.analyzeButton, { backgroundColor: '#1e3a5f', marginTop: 8 }]}
                        onPress={() => navigation.navigate('PeerComparison', { symbol })}
                    >
                        <Ionicons name="people" size={24} color="white" />
                        <Text style={styles.analyzeButtonText}>Peer Comparison</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.analyzeButton, { backgroundColor: '#4c1d95', marginTop: 8 }]}
                        onPress={() => navigation.navigate('ValuationHistory', { symbol })}
                    >
                        <Ionicons name="time" size={24} color="white" />
                        <Text style={styles.analyzeButtonText}>Valuation History</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View>
                    {analysisLoading ? (
                        <View style={styles.analysisLoadingContainer}>
                            <ActivityIndicator size="large" color="#007AFF" />
                            <Text style={styles.loadingText}>Running comprehensive analysis...</Text>
                        </View>
                    ) : analysis ? (
                        <View>
                            {/* Recommendation */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Investment Recommendation</Text>
                                <View style={[styles.recommendationCard, { borderLeftColor: getRecommendationColor(analysis.recommendation.action) }]}>
                                    <View style={styles.recommendationHeader}>
                                        <Text style={[styles.recommendationAction, { color: getRecommendationColor(analysis.recommendation.action) }]}>
                                            {analysis.recommendation.action}
                                        </Text>
                                        <Text style={styles.recommendationConfidence}>
                                            {analysis.recommendation.confidence} Confidence
                                        </Text>
                                    </View>
                                    <Text style={styles.recommendationReason}>
                                        {analysis.recommendation.reasoning}
                                    </Text>
                                </View>
                            </View>

                            {/* Valuations */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Valuation Summary</Text>

                                <View style={styles.valuationCard}>
                                    <Text style={styles.valuationMethod}>DCF Valuation</Text>
                                    <View style={styles.valuationRow}>
                                        <Text style={styles.valuationLabel}>Intrinsic Value:</Text>
                                        <Text style={styles.valuationValue}>
                                            ${analysis.valuations.dcf.intrinsic_value.toFixed(2)}
                                        </Text>
                                    </View>
                                    <View style={styles.valuationRow}>
                                        <Text style={styles.valuationLabel}>Upside:</Text>
                                        <Text style={[
                                            styles.valuationUpside,
                                            { color: analysis.valuations.dcf.upside > 0 ? '#34C759' : '#FF3B30' }
                                        ]}>
                                            {formatPercentage(analysis.valuations.dcf.upside)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.valuationCard}>
                                    <Text style={styles.valuationMethod}>Comparable Analysis</Text>
                                    <View style={styles.valuationRow}>
                                        <Text style={styles.valuationLabel}>Average Valuation:</Text>
                                        <Text style={styles.valuationValue}>
                                            ${analysis.valuations.comparable.average_valuation.toFixed(2)}
                                        </Text>
                                    </View>
                                    <View style={styles.valuationRow}>
                                        <Text style={styles.valuationLabel}>Upside:</Text>
                                        <Text style={[
                                            styles.valuationUpside,
                                            { color: analysis.valuations.comparable.upside > 0 ? '#34C759' : '#FF3B30' }
                                        ]}>
                                            {formatPercentage(analysis.valuations.comparable.upside)}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Technical Analysis */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Technical Analysis</Text>

                                <View style={styles.technicalCard}>
                                    <View style={styles.technicalRow}>
                                        <Text style={styles.technicalLabel}>RSI:</Text>
                                        <Text style={[
                                            styles.technicalValue,
                                            {
                                                color: analysis.technical_analysis.rsi > 70 ? '#FF3B30' :
                                                    analysis.technical_analysis.rsi < 30 ? '#34C759' : '#333'
                                            }
                                        ]}>
                                            {analysis.technical_analysis.rsi.toFixed(1)}
                                        </Text>
                                    </View>
                                    <View style={styles.technicalRow}>
                                        <Text style={styles.technicalLabel}>Support:</Text>
                                        <Text style={styles.technicalValue}>
                                            ${analysis.technical_analysis.support.toFixed(2)}
                                        </Text>
                                    </View>
                                    <View style={styles.technicalRow}>
                                        <Text style={styles.technicalLabel}>Resistance:</Text>
                                        <Text style={styles.technicalValue}>
                                            ${analysis.technical_analysis.resistance.toFixed(2)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Technical Signals */}
                                {analysis.technical_analysis.signals.length > 0 && (
                                    <View style={styles.signalsContainer}>
                                        <Text style={styles.signalsTitle}>Active Signals</Text>
                                        {analysis.technical_analysis.signals.map((signal, index) => (
                                            <View key={index} style={styles.signalCard}>
                                                <View style={[
                                                    styles.signalBadge,
                                                    { backgroundColor: signal.type === 'BUY' ? '#34C759' : '#FF3B30' }
                                                ]}>
                                                    <Text style={styles.signalType}>{signal.type}</Text>
                                                </View>
                                                <View style={styles.signalContent}>
                                                    <Text style={styles.signalIndicator}>{signal.indicator}</Text>
                                                    <Text style={styles.signalDescription}>{signal.description}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>
                    ) : null}
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    signalSummaryCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#007AFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    signalSummaryLabel: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    signalSummaryValue: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 6,
    },
    signalSummaryText: {
        fontSize: 13,
        color: '#4b5563',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 32,
    },
    errorText: {
        fontSize: 18,
        color: '#333',
        marginTop: 16,
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    header: {
        backgroundColor: 'white',
        padding: 24,
        paddingTop: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    stockTitle: {
        marginBottom: 16,
    },
    symbol: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    companyName: {
        fontSize: 16,
        color: '#666',
        marginTop: 4,
    },
    sectorInfo: {
        fontSize: 14,
        color: '#999',
        marginTop: 4,
    },
    currentPrice: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#007AFF',
        textAlign: 'right',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    tab: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#007AFF',
    },
    tabText: {
        fontSize: 16,
        color: '#666',
    },
    activeTabText: {
        color: '#007AFF',
        fontWeight: '500',
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
        marginBottom: 16,
    },
    sectionSubtitle: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 12,
    },
    periodSelector: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderRadius: 10,
        padding: 4,
        marginBottom: 12,
    },
    periodButton: {
        flex: 1,
        paddingVertical: 6,
        borderRadius: 8,
        alignItems: 'center',
    },
    periodButtonActive: {
        backgroundColor: '#007AFF',
    },
    periodButtonText: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '600',
    },
    periodButtonTextActive: {
        color: 'white',
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    metricCard: {
        width: '48%',
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
    },
    metricLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    metricValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    infoLabel: {
        fontSize: 14,
        color: '#666',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    analyzeButton: {
        backgroundColor: '#007AFF',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    analyzeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    chartLoading: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    lineChart: {
        marginTop: 10,
        borderRadius: 12,
    },
    epsSummaryCard: {
        marginTop: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        padding: 12,
    },
    epsSummaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    epsSummaryTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    epsSummaryBadge: {
        fontSize: 11,
        fontWeight: '600',
        color: '#1d4ed8',
        backgroundColor: '#dbeafe',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
    },
    epsSummaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    epsSummaryLabel: {
        fontSize: 12,
        color: '#6b7280',
    },
    epsSummaryValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    epsSummaryChange: {
        color: '#10B981',
    },
    epsSummaryChangeNegative: {
        color: '#EF4444',
    },
    epsSummaryDate: {
        marginTop: 6,
        fontSize: 11,
        color: '#9ca3af',
    },
    epsChartContainer: {
        marginTop: 12,
    },
    noDataText: {
        fontSize: 12,
        color: '#6b7280',
        textAlign: 'center',
        paddingVertical: 12,
    },
    analysisLoadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    recommendationCard: {
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 8,
        borderLeftWidth: 4,
    },
    recommendationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    recommendationAction: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    recommendationConfidence: {
        fontSize: 14,
        color: '#666',
    },
    recommendationReason: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    valuationCard: {
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
    },
    valuationMethod: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    valuationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    valuationLabel: {
        fontSize: 14,
        color: '#666',
    },
    valuationValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    valuationUpside: {
        fontSize: 14,
        fontWeight: '600',
    },
    technicalCard: {
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
    },
    technicalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    technicalLabel: {
        fontSize: 14,
        color: '#666',
    },
    technicalValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    signalsContainer: {
        marginTop: 8,
    },
    signalsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    signalCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    signalBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginRight: 12,
    },
    signalType: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    signalContent: {
        flex: 1,
    },
    signalIndicator: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    signalDescription: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
});

export default StockDetailScreen;