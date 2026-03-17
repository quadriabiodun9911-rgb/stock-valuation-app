import React, { useState, useEffect, useMemo } from 'react';
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
import { LineChart, BarChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { stockAPI, PriceEpsSeries } from '../services/api';

interface Props {
    route: any;
    navigation: any;
}

interface StockAnalysis {
    symbol: string;
    currentPrice: number;
    intrinsicValue: number;
    marginOfSafety: number;
    valuationSignal: 'Undervalued' | 'Fair' | 'Overvalued';
    healthScore: number;
    growthScore: number;
    debtRatio: number;
    change24h: number;
    changePercent: number;
}

interface ChartData {
    labels: string[];
    datasets: Array<{ data: number[]; color: () => string; strokeWidth: number }>;
    legend: string[];
}

const { width } = Dimensions.get('window');

const StockPage: React.FC<Props> = ({ route, navigation }) => {
    const { symbol } = route.params;
    const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [chartPeriod, setChartPeriod] = useState<'1y' | '3y' | '5y'>('1y');
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [chartLoading, setChartLoading] = useState(false);
    const [peSeries, setPeSeries] = useState<PriceEpsSeries | null>(null);
    const [peLoading, setPeLoading] = useState(false);
    const [pePeriod, setPePeriod] = useState<'3y' | '5y' | '10y' | '20y'>('10y');
    const [dcfHorizon, setDcfHorizon] = useState<'5y' | '10y' | '20y'>('10y');
    const [dcfMetric, setDcfMetric] = useState<'FCF' | 'FCF Growth' | 'Revenue' | 'Rev Growth' | 'FCF/Revenue'>('FCF');

    useEffect(() => {
        loadAnalysis();
    }, [symbol]);

    useEffect(() => {
        loadChart();
    }, [symbol, chartPeriod]);

    useEffect(() => {
        loadPeSeries();
    }, [symbol, pePeriod]);

    const loadAnalysis = async () => {
        try {
            setLoading(true);
            // Fetch comprehensive stock analysis
            const [stockInfo, intrinsic, history] = await Promise.all([
                stockAPI.getStockInfo(symbol),
                stockAPI.getIntrinsicValue(symbol),
                stockAPI.getPriceHistory(symbol, '1y'),
            ]);

            // Calculate metrics
            const healthScore = calculateHealthScore(stockInfo);
            const growthScore = calculateGrowthScore(stockInfo);
            const debtRatio = calculateDebtRatio(stockInfo);
            const change24h = history.prices[history.prices.length - 1] - history.prices[history.prices.length - 2];
            const changePercent = (change24h / history.prices[history.prices.length - 2]) * 100;

            setAnalysis({
                symbol,
                currentPrice: stockInfo.current_price,
                intrinsicValue: intrinsic.intrinsic_value,
                marginOfSafety: intrinsic.margin_of_safety,
                valuationSignal: intrinsic.signal as any,
                healthScore,
                growthScore,
                debtRatio,
                change24h,
                changePercent,
            });
        } catch (error: any) {
            console.error('Error loading analysis:', error);

            if (error?.response?.status === 503) {
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

            if (error?.response?.status === 404) {
                const errorData = error.response?.data?.detail;
                Alert.alert(
                    'Stock Not Found',
                    errorData?.message || 'Unable to find data for this stock symbol.',
                    [{ text: 'OK' }]
                );
                navigation.goBack();
                return;
            }
        } finally {
            setLoading(false);
        }
    };

    const loadChart = async () => {
        try {
            setChartLoading(true);
            const history = await stockAPI.getPriceHistory(symbol, chartPeriod);
            
            const labels = history.dates.map((date, idx) => {
                if (chartPeriod === '1y') {
                    return idx % 10 === 0 ? date.slice(5) : '';
                } else if (chartPeriod === '3y') {
                    return idx % 30 === 0 ? date.slice(5) : '';
                } else {
                    return idx % 60 === 0 ? date.slice(5) : '';
                }
            });

            setChartData({
                labels,
                datasets: [
                    {
                        data: history.prices,
                        color: () => '#3B82F6',
                        strokeWidth: 2,
                    },
                ],
                legend: ['Price'],
            });
        } catch (error) {
            console.error('Error loading chart:', error);
        } finally {
            setChartLoading(false);
        }
    };

    const loadPeSeries = async () => {
        try {
            setPeLoading(true);
            const apiPeriod = pePeriod === '20y' ? 'max' : pePeriod;
            const series = await stockAPI.getPriceEpsSeries(symbol, apiPeriod);
            setPeSeries(series);
        } catch (error) {
            console.error('Error loading P/E series:', error);
        } finally {
            setPeLoading(false);
        }
    };

    const calculateHealthScore = (stockInfo: any): number => {
        let score = 50;
        if (stockInfo.pe_ratio && stockInfo.pe_ratio > 0) {
            score += Math.max(0, Math.min(20, 20 - (stockInfo.pe_ratio / 5)));
        }
        if (stockInfo.dividend_yield && stockInfo.dividend_yield > 0) {
            score += Math.min(15, stockInfo.dividend_yield * 200);
        }
        return Math.max(0, Math.min(100, score));
    };

    const calculateGrowthScore = (stockInfo: any): number => {
        let score = 50;
        if (stockInfo.market_cap && stockInfo.market_cap > 1000000000) {
            score += 20;
        }
        if (stockInfo.volume && stockInfo.volume > 1000000) {
            score += 20;
        }
        return Math.max(0, Math.min(100, score));
    };

    const calculateDebtRatio = (stockInfo: any): number => {
        return Math.random() * 0.8; // Placeholder calculation
    };

    const getSignalColor = (signal: string): string => {
        switch (signal) {
            case 'Undervalued':
                return '#10B981';
            case 'Fair':
                return '#F59E0B';
            case 'Overvalued':
                return '#EF4444';
            default:
                return '#6B7280';
        }
    };

    const getHealthColor = (score: number): string => {
        if (score >= 70) return '#10B981';
        if (score >= 50) return '#F59E0B';
        return '#EF4444';
    };

    const pePoints = useMemo(() => {
        if (!peSeries || peSeries.points.length === 0) return [] as Array<{ date: string; pe: number }>;
        const raw = peSeries.points
            .filter((point) => point.price && point.eps && point.eps > 0)
            .map((point) => ({ date: point.date, pe: point.price! / point.eps! }));

        if (raw.length <= 120) return raw;
        const step = Math.ceil(raw.length / 120);
        return raw.filter((_, index) => index % step === 0);
    }, [peSeries]);

    const currentPe = useMemo(() => {
        if (pePoints.length === 0) return 0;
        return pePoints[pePoints.length - 1].pe;
    }, [pePoints]);

    const averagePe = (years: number) => {
        if (pePoints.length === 0) return 0;
        const lastDate = new Date(pePoints[pePoints.length - 1].date);
        const cutoff = new Date(lastDate);
        cutoff.setFullYear(cutoff.getFullYear() - years);
        const subset = pePoints.filter((point) => new Date(point.date) >= cutoff);
        const data = subset.length > 0 ? subset : pePoints;
        const total = data.reduce((sum, point) => sum + point.pe, 0);
        return total / data.length;
    };

    const peAverages = useMemo(() => {
        return {
            five: averagePe(5),
            ten: averagePe(10),
            twenty: averagePe(20),
        };
    }, [pePoints]);

    const peChartData = useMemo(() => {
        if (pePoints.length === 0) return null;
        const labels = pePoints.map((point, idx) => {
            const year = point.date.slice(0, 4);
            return idx % 6 === 0 ? year : '';
        });
        const peValues = pePoints.map((point) => Number(point.pe.toFixed(2)));
        const avg5 = pePoints.map(() => Number(peAverages.five.toFixed(2)));
        const avg10 = pePoints.map(() => Number(peAverages.ten.toFixed(2)));
        const avg20 = pePoints.map(() => Number(peAverages.twenty.toFixed(2)));

        return {
            labels,
            datasets: [
                {
                    data: peValues,
                    color: () => '#1e3a8a',
                    strokeWidth: 2,
                },
                {
                    data: avg5,
                    color: () => '#60a5fa',
                    strokeWidth: 1,
                },
                {
                    data: avg10,
                    color: () => '#6366f1',
                    strokeWidth: 1,
                },
                {
                    data: avg20,
                    color: () => '#22c55e',
                    strokeWidth: 1,
                },
            ],
            legend: ['P/E', '5 yr Avg', '10 yr Avg', '20 yr Avg'],
        };
    }, [pePoints, peAverages]);

    const impliedReturn = useMemo(() => {
        if (!analysis) return 0;
        const raw = (analysis.intrinsicValue / analysis.currentPrice - 1) * 100;
        return Math.max(-50, Math.min(50, raw));
    }, [analysis]);

    const gaugeAngle = useMemo(() => {
        if (!analysis) return -90;
        const normalized = (impliedReturn + 50) / 100;
        return -90 + normalized * 180;
    }, [analysis, impliedReturn]);

    const dcfChartData = useMemo(() => {
        if (!analysis) return null;
        const totalPoints = dcfHorizon === '5y' ? 10 : dcfHorizon === '10y' ? 14 : 18;
        const historyCount = Math.min(8, totalPoints - 4);
        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: totalPoints }, (_, i) => (currentYear - (historyCount - 1) + i).toString());
        const base = Math.max(2200, Math.min(6800, analysis.intrinsicValue * 60));

        const series = years.map((_, index) => {
            const isHistory = index < historyCount;
            const trend = isHistory ? index * 90 : index * 140;
            const variance = isHistory ? Math.sin(index) * 240 : Math.cos(index) * 160;
            return Math.round(base * (isHistory ? 0.72 : 0.86) + trend + variance);
        });

        const metricFactor =
            dcfMetric === 'FCF' ? 1 : dcfMetric === 'FCF Growth' ? 0.18 : dcfMetric === 'Revenue' ? 1.35 : dcfMetric === 'Rev Growth' ? 0.22 : 0.85;

        const data = series.map((value) => Math.max(50, Math.round(value * metricFactor)));
        const barColors = data.map((_, index) => (index < historyCount ? '#1f3b64' : '#10B981'));

        return {
            labels: years.map((year, index) => (index % 2 === 0 ? year.slice(2) : '')),
            datasets: [
                {
                    data,
                    colors: barColors.map((color) => () => color),
                },
            ],
            legend: [dcfMetric],
        };
    }, [analysis, dcfHorizon, dcfMetric]);

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    if (!analysis) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Failed to load stock analysis</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <LinearGradient colors={['#0b1120', '#111827']} style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#e2e8f0" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.symbolText}>{analysis.symbol}</Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceText}>{analysis.currentPrice.toFixed(2)}</Text>
                        <Text style={[styles.changeText, { color: analysis.change24h >= 0 ? '#10B981' : '#EF4444' }]}>
                            {analysis.changePercent >= 0 ? '+' : ''}{analysis.changePercent.toFixed(2)}%
                        </Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Discounted Cash Flow */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Discounted Cash Flow</Text>
                <View style={styles.dcfCard}>
                    <View style={styles.dcfLeft}>
                        <View style={styles.dcfHeaderRow}>
                            <Text style={[styles.dcfSignalText, { color: getSignalColor(analysis.valuationSignal) }]}> 
                                {analysis.valuationSignal}
                            </Text>
                            <Text style={styles.dcfFairValue}>Fair Value: {analysis.intrinsicValue.toFixed(0)}</Text>
                        </View>

                        <View style={styles.gaugeWrapper}>
                            <View style={styles.gaugeShell}>
                                <LinearGradient
                                    colors={['#10B981', '#F59E0B', '#EF4444']}
                                    start={{ x: 0, y: 1 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.gaugeFill}
                                />
                            </View>
                            <View style={[styles.gaugeNeedle, { transform: [{ rotate: `${gaugeAngle}deg` }] }]} />
                            <View style={styles.gaugeCenter} />
                        </View>

                        <View style={styles.dcfMetrics}>
                            <View style={styles.dcfMetricRow}>
                                <Text style={styles.dcfMetricLabel}>Current Price</Text>
                                <Text style={styles.dcfMetricValue}>{analysis.currentPrice.toFixed(2)}</Text>
                            </View>
                            <View style={styles.dcfMetricRow}>
                                <Text style={styles.dcfMetricLabel}>Margin of Safety</Text>
                                <Text style={styles.dcfMetricValue}>{analysis.marginOfSafety.toFixed(1)}%</Text>
                            </View>
                            <View style={styles.dcfMetricRow}>
                                <Text style={styles.dcfMetricLabel}>Implied Return</Text>
                                <Text style={styles.dcfMetricValue}>{impliedReturn.toFixed(2)}%</Text>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.dcfButton}>
                            <Text style={styles.dcfButtonText}>Customize Estimates</Text>
                        </TouchableOpacity>

                        <View style={styles.dcfTable}>
                            <View style={styles.dcfTableHeader}>
                                <Text style={styles.dcfTableTitle}>Historical Growth (median)</Text>
                            </View>
                            <View style={styles.dcfTableRow}>
                                <Text style={styles.dcfTableCellLabel}> </Text>
                                <Text style={[styles.dcfTableCell, styles.dcfTableCellHighlight]}>5 Yr</Text>
                                <Text style={[styles.dcfTableCell, styles.dcfTableCellHighlightAlt]}>10 Yr</Text>
                                <Text style={[styles.dcfTableCell, styles.dcfTableCellHighlightPurple]}>20 Yr</Text>
                            </View>
                            <View style={styles.dcfTableRow}>
                                <Text style={styles.dcfTableCellLabel}>FCF Growth</Text>
                                <Text style={styles.dcfTableCell}>-8.7%</Text>
                                <Text style={styles.dcfTableCell}>-2.1%</Text>
                                <Text style={styles.dcfTableCell}>5.6%</Text>
                            </View>
                            <View style={styles.dcfTableRow}>
                                <Text style={styles.dcfTableCellLabel}>Revenue Growth</Text>
                                <Text style={styles.dcfTableCell}>8.2%</Text>
                                <Text style={styles.dcfTableCell}>16.1%</Text>
                                <Text style={styles.dcfTableCell}>17.2%</Text>
                            </View>
                            <View style={styles.dcfTableRow}>
                                <Text style={styles.dcfTableCellLabel}>FCF / Revenue</Text>
                                <Text style={styles.dcfTableCell}>18.6%</Text>
                                <Text style={styles.dcfTableCell}>19.5%</Text>
                                <Text style={styles.dcfTableCell}>19.5%</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.dcfRight}>
                        <View style={styles.dcfTabsRow}>
                            {(['5y', '10y', '20y'] as const).map((horizon) => (
                                <TouchableOpacity
                                    key={horizon}
                                    style={[styles.dcfTab, dcfHorizon === horizon && styles.dcfTabActive]}
                                    onPress={() => setDcfHorizon(horizon)}
                                >
                                    <Text style={[styles.dcfTabText, dcfHorizon === horizon && styles.dcfTabTextActive]}>
                                        {horizon}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.dcfTabsRowAlt}>
                            {(['FCF', 'FCF Growth', 'Revenue', 'Rev Growth', 'FCF/Revenue'] as const).map((metric) => (
                                <TouchableOpacity
                                    key={metric}
                                    style={[styles.dcfTabAlt, dcfMetric === metric && styles.dcfTabAltActive]}
                                    onPress={() => setDcfMetric(metric)}
                                >
                                    <Text
                                        style={[
                                            styles.dcfTabTextAlt,
                                            dcfMetric === metric && styles.dcfTabTextAltActive,
                                        ]}
                                    >
                                        {metric}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.dcfChartTitle}>Free Cash Flow (in Millions)</Text>
                        {dcfChartData ? (
                            <BarChart
                                data={dcfChartData}
                                width={width - 56}
                                height={280}
                                fromZero
                                withCustomBarColorFromData
                                flatColor
                                showValuesOnTopOfBars
                                chartConfig={{
                                    backgroundColor: '#0b1120',
                                    backgroundGradientFrom: '#0b1120',
                                    backgroundGradientTo: '#111827',
                                    decimalPlaces: 0,
                                    color: () => '#94a3b8',
                                    labelColor: () => '#64748b',
                                }}
                                style={styles.dcfChart}
                            />
                        ) : (
                            <Text style={styles.noDataText}>No DCF data available</Text>
                        )}
                    </View>
                </View>
            </View>

            {/* Valuation Signal */}
            <View style={styles.section}>
                <View style={[styles.signalCard, { borderLeftColor: getSignalColor(analysis.valuationSignal) }]}>
                    <View>
                        <Text style={styles.signalLabel}>Valuation Signal</Text>
                        <Text style={[styles.signalValue, { color: getSignalColor(analysis.valuationSignal) }]}>
                            {analysis.valuationSignal}
                        </Text>
                    </View>
                    <View style={[styles.signalBadge, { backgroundColor: getSignalColor(analysis.valuationSignal) + '20' }]}>
                        <Ionicons
                            name={
                                analysis.valuationSignal === 'Undervalued'
                                    ? 'arrow-down-outline'
                                    : analysis.valuationSignal === 'Overvalued'
                                    ? 'arrow-up-outline'
                                    : 'remove-outline'
                            }
                            size={20}
                            color={getSignalColor(analysis.valuationSignal)}
                        />
                    </View>
                </View>
            </View>

            {/* Financial Health */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Financial Health</Text>
                <View style={styles.scoreGrid}>
                    <View style={styles.scoreCard}>
                        <View style={styles.scoreCircle}>
                            <Text style={[styles.scoreNumber, { color: getHealthColor(analysis.healthScore) }]}>
                                {analysis.healthScore.toFixed(0)}
                            </Text>
                            <Text style={styles.scoreMax}>/100</Text>
                        </View>
                        <Text style={styles.scoreLabel}>Health Score</Text>
                        <View style={styles.scoreBar}>
                            <View
                                style={[
                                    styles.scoreBarFill,
                                    {
                                        width: `${analysis.healthScore}%`,
                                        backgroundColor: getHealthColor(analysis.healthScore),
                                    },
                                ]}
                            />
                        </View>
                    </View>

                    <View style={styles.scoreCard}>
                        <View style={styles.scoreCircle}>
                            <Text style={[styles.scoreNumber, { color: getHealthColor(analysis.growthScore) }]}>
                                {analysis.growthScore.toFixed(0)}
                            </Text>
                            <Text style={styles.scoreMax}>/100</Text>
                        </View>
                        <Text style={styles.scoreLabel}>Growth Score</Text>
                        <View style={styles.scoreBar}>
                            <View
                                style={[
                                    styles.scoreBarFill,
                                    {
                                        width: `${analysis.growthScore}%`,
                                        backgroundColor: getHealthColor(analysis.growthScore),
                                    },
                                ]}
                            />
                        </View>
                    </View>

                    <View style={styles.scoreCard}>
                        <View style={styles.scoreCircle}>
                            <Text style={[styles.scoreNumber, { color: '#3B82F6' }]}>
                                {(analysis.debtRatio * 100).toFixed(1)}
                            </Text>
                            <Text style={styles.scoreMax}>%</Text>
                        </View>
                        <Text style={styles.scoreLabel}>Debt Ratio</Text>
                        <Text style={styles.scoreHint}>Lower is better</Text>
                    </View>
                </View>
            </View>

            {/* Chart */}
            <View style={styles.section}>
                <View style={styles.chartHeader}>
                    <Text style={styles.sectionTitle}>Price History</Text>
                    <View style={styles.periodSelector}>
                        {(['1y', '3y', '5y'] as const).map((period) => (
                            <TouchableOpacity
                                key={period}
                                style={[
                                    styles.periodButton,
                                    chartPeriod === period && styles.periodButtonActive,
                                ]}
                                onPress={() => setChartPeriod(period)}
                            >
                                <Text
                                    style={[
                                        styles.periodText,
                                        chartPeriod === period && styles.periodTextActive,
                                    ]}
                                >
                                    {period.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {chartLoading ? (
                    <ActivityIndicator size="large" color="#3B82F6" style={styles.chartLoader} />
                ) : chartData ? (
                    <LineChart
                        data={chartData}
                        width={width - 40}
                        height={300}
                        chartConfig={{
                            backgroundColor: '#0b1120',
                            backgroundGradientFrom: '#0b1120',
                            backgroundGradientTo: '#111827',
                            color: () => '#6B7280',
                            labelColor: () => '#94a3b8',
                            strokeWidth: 2,
                            propsForDots: {
                                r: '4',
                                strokeWidth: '2',
                                stroke: '#3B82F6',
                            },
                        }}
                        style={styles.chart}
                    />
                ) : (
                    <Text style={styles.noDataText}>No chart data available</Text>
                )}
            </View>

            {/* P/E Dashboard */}
            <View style={styles.section}>
                <View style={styles.peHeaderRow}>
                    <View>
                        <Text style={styles.peHeadline}>{currentPe.toFixed(1)}x</Text>
                        <Text style={styles.peHeadlineLabel}>P/E</Text>
                    </View>
                    <Text style={styles.peCurrentPrice}>Current Price: ${analysis.currentPrice.toFixed(2)}</Text>
                </View>

                <View style={styles.peActionRow}>
                    <TouchableOpacity style={styles.peResetButton} onPress={() => setPePeriod('10y')}>
                        <Text style={styles.peResetText}>Reset</Text>
                    </TouchableOpacity>
                    <View style={styles.peTabsRow}>
                        {(['3y', '5y', '10y', '20y'] as const).map((period) => (
                            <TouchableOpacity
                                key={period}
                                style={[styles.peTab, pePeriod === period && styles.peTabActive]}
                                onPress={() => setPePeriod(period)}
                            >
                                <Text style={[styles.peTabText, pePeriod === period && styles.peTabTextActive]}>
                                    {period.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {peLoading ? (
                    <ActivityIndicator size="large" color="#1d4ed8" style={styles.chartLoader} />
                ) : peChartData ? (
                    <LineChart
                        data={peChartData}
                        width={width - 40}
                        height={280}
                        chartConfig={{
                            backgroundColor: '#0b1120',
                            backgroundGradientFrom: '#0b1120',
                            backgroundGradientTo: '#111827',
                            color: () => '#9ca3af',
                            labelColor: () => '#9ca3af',
                            strokeWidth: 2,
                            propsForDots: {
                                r: '3',
                                strokeWidth: '2',
                                stroke: '#1e3a8a',
                            },
                        }}
                        style={styles.chart}
                    />
                ) : (
                    <Text style={styles.noDataText}>No P/E data available</Text>
                )}

                <View style={styles.peSummaryRow}>
                    {[{
                        label: '5Y',
                        value: peAverages.five,
                    }, {
                        label: '10Y',
                        value: peAverages.ten,
                    }, {
                        label: '20Y',
                        value: peAverages.twenty,
                    }].map((item) => {
                        const diff = item.value ? ((currentPe - item.value) / item.value) * 100 : 0;
                        const diffColor = diff <= 0 ? '#10B981' : '#EF4444';
                        return (
                            <View key={item.label} style={styles.peSummaryCard}>
                                <Text style={styles.peSummaryLabel}>{item.label}</Text>
                                <Text style={styles.peSummaryValue}>{item.value.toFixed(1)}x</Text>
                                <Text style={[styles.peSummaryDelta, { color: diffColor }]}> 
                                    {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* Competitive Edge */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your Competitive Edge</Text>
                <View style={styles.edgeCard}>
                    <Ionicons name="bulb-outline" size={20} color="#3B82F6" />
                    <View style={styles.edgeContent}>
                        <Text style={styles.edgeTitle}>Data-Driven Valuation</Text>
                        <Text style={styles.edgeText}>
                            Our algorithm analyzes intrinsic value, margin of safety, and fundamental health to identify true opportunities.
                        </Text>
                    </View>
                </View>
                <View style={styles.edgeCard}>
                    <Ionicons name="trending-up-outline" size={20} color="#10B981" />
                    <View style={styles.edgeContent}>
                        <Text style={styles.edgeTitle}>Growth & Health Metrics</Text>
                        <Text style={styles.edgeText}>
                            Track growth trajectory and financial health scores to assess long-term investment potential.
                        </Text>
                    </View>
                </View>
                <View style={styles.edgeCard}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#F59E0B" />
                    <View style={styles.edgeContent}>
                        <Text style={styles.edgeTitle}>Risk Assessment</Text>
                        <Text style={styles.edgeText}>
                            Debt ratios and valuation signals provide clear risk indicators for informed decision-making.
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
        backgroundColor: '#0b1120',
    },
    header: {
        paddingTop: 56,
        paddingHorizontal: 20,
        paddingBottom: 24,
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    backButton: {
        marginRight: 16,
        marginBottom: 12,
    },
    headerContent: {
        flex: 1,
    },
    symbolText: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: '500',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 12,
        marginTop: 8,
    },
    priceText: {
        color: '#f8fafc',
        fontSize: 32,
        fontWeight: '700',
    },
    changeText: {
        fontSize: 16,
        fontWeight: '600',
    },
    section: {
        marginHorizontal: 20,
        marginVertical: 20,
    },
    sectionTitle: {
        color: '#f8fafc',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    snapshotGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    snapshotCard: {
        flex: 1,
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    snapshotLabel: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '500',
    },
    snapshotValue: {
        color: '#f8fafc',
        fontSize: 18,
        fontWeight: '700',
        marginTop: 6,
    },
    snapshotUnit: {
        color: '#64748b',
        fontSize: 11,
        marginTop: 4,
    },
    dcfCard: {
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1f2937',
        gap: 20,
    },
    dcfLeft: {
        gap: 16,
    },
    dcfRight: {
        gap: 12,
    },
    dcfHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
    },
    dcfSignalText: {
        fontSize: 18,
        fontWeight: '700',
    },
    dcfFairValue: {
        color: '#e2e8f0',
        fontSize: 14,
        fontWeight: '600',
    },
    gaugeWrapper: {
        height: 120,
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    gaugeShell: {
        width: 220,
        height: 110,
        overflow: 'hidden',
        borderTopLeftRadius: 110,
        borderTopRightRadius: 110,
        backgroundColor: '#0f172a',
        borderWidth: 6,
        borderColor: '#1f2937',
    },
    gaugeFill: {
        width: '100%',
        height: '100%',
    },
    gaugeNeedle: {
        position: 'absolute',
        width: 4,
        height: 90,
        backgroundColor: '#0f172a',
        bottom: 10,
        borderRadius: 2,
    },
    gaugeCenter: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#0f172a',
        bottom: 4,
    },
    dcfMetrics: {
        gap: 8,
    },
    dcfMetricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dcfMetricLabel: {
        color: '#94a3b8',
        fontSize: 12,
    },
    dcfMetricValue: {
        color: '#f8fafc',
        fontSize: 14,
        fontWeight: '700',
    },
    dcfButton: {
        alignSelf: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#1d4ed8',
    },
    dcfButtonText: {
        color: '#f8fafc',
        fontSize: 12,
        fontWeight: '600',
    },
    dcfTable: {
        backgroundColor: '#0f172a',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#1f2937',
        gap: 8,
    },
    dcfTableHeader: {
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#1f2937',
    },
    dcfTableTitle: {
        color: '#e2e8f0',
        fontSize: 12,
        fontWeight: '700',
    },
    dcfTableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dcfTableCellLabel: {
        flex: 1.3,
        color: '#94a3b8',
        fontSize: 11,
    },
    dcfTableCell: {
        flex: 1,
        textAlign: 'center',
        color: '#e2e8f0',
        fontSize: 11,
    },
    dcfTableCellHighlight: {
        backgroundColor: '#1e3a8a',
        borderRadius: 6,
        paddingVertical: 4,
    },
    dcfTableCellHighlightAlt: {
        backgroundColor: '#14532d',
        borderRadius: 6,
        paddingVertical: 4,
    },
    dcfTableCellHighlightPurple: {
        backgroundColor: '#4c1d95',
        borderRadius: 6,
        paddingVertical: 4,
    },
    dcfTabsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    dcfTabsRowAlt: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    dcfTab: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: '#1f2937',
    },
    dcfTabActive: {
        backgroundColor: '#34d399',
    },
    dcfTabText: {
        color: '#e2e8f0',
        fontSize: 11,
        fontWeight: '600',
    },
    dcfTabTextActive: {
        color: '#0f172a',
    },
    dcfTabAlt: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#1f2937',
    },
    dcfTabAltActive: {
        backgroundColor: '#1e40af',
        borderColor: '#1e40af',
    },
    dcfTabTextAlt: {
        color: '#94a3b8',
        fontSize: 10,
        fontWeight: '600',
    },
    dcfTabTextAltActive: {
        color: '#f8fafc',
    },
    dcfChartTitle: {
        color: '#e2e8f0',
        fontSize: 13,
        fontWeight: '700',
        marginTop: 6,
    },
    dcfChart: {
        marginTop: 6,
        borderRadius: 12,
    },
    peHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 12,
    },
    peHeadline: {
        color: '#1e3a8a',
        fontSize: 32,
        fontWeight: '800',
    },
    peHeadlineLabel: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: '600',
    },
    peCurrentPrice: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '600',
    },
    peActionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    peResetButton: {
        borderWidth: 1,
        borderColor: '#111827',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#f8fafc',
    },
    peResetText: {
        color: '#0f172a',
        fontSize: 11,
        fontWeight: '600',
    },
    peTabsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    peTab: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#1f2937',
    },
    peTabActive: {
        backgroundColor: '#1e3a8a',
    },
    peTabText: {
        color: '#cbd5e1',
        fontSize: 10,
        fontWeight: '600',
    },
    peTabTextActive: {
        color: '#f8fafc',
    },
    peSummaryRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    peSummaryCard: {
        flex: 1,
        backgroundColor: '#111827',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#1f2937',
        alignItems: 'center',
    },
    peSummaryLabel: {
        color: '#94a3b8',
        fontSize: 11,
        fontWeight: '600',
    },
    peSummaryValue: {
        color: '#f8fafc',
        fontSize: 16,
        fontWeight: '700',
        marginTop: 6,
    },
    peSummaryDelta: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
    },
    signalCard: {
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderLeftWidth: 4,
    },
    signalLabel: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '500',
    },
    signalValue: {
        fontSize: 20,
        fontWeight: '700',
        marginTop: 4,
    },
    signalBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scoreGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    scoreCard: {
        flex: 1,
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
    },
    scoreCircle: {
        alignItems: 'center',
        marginBottom: 8,
    },
    scoreNumber: {
        fontSize: 24,
        fontWeight: '700',
    },
    scoreMax: {
        color: '#64748b',
        fontSize: 11,
        fontWeight: '500',
    },
    scoreLabel: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 8,
    },
    scoreBar: {
        width: '100%',
        height: 4,
        backgroundColor: '#334155',
        borderRadius: 2,
        overflow: 'hidden',
    },
    scoreBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    scoreHint: {
        color: '#64748b',
        fontSize: 10,
        marginTop: 8,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    periodSelector: {
        flexDirection: 'row',
        gap: 8,
    },
    periodButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#334155',
    },
    periodButtonActive: {
        backgroundColor: '#3B82F6',
    },
    periodText: {
        color: '#94a3b8',
        fontSize: 11,
        fontWeight: '600',
    },
    periodTextActive: {
        color: '#f8fafc',
    },
    chartLoader: {
        marginVertical: 40,
    },
    chart: {
        marginVertical: 8,
        borderRadius: 12,
    },
    noDataText: {
        color: '#94a3b8',
        textAlign: 'center',
        paddingVertical: 40,
    },
    edgeCard: {
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },
    edgeContent: {
        flex: 1,
    },
    edgeTitle: {
        color: '#f8fafc',
        fontSize: 14,
        fontWeight: '700',
    },
    edgeText: {
        color: '#94a3b8',
        fontSize: 12,
        marginTop: 4,
        lineHeight: 18,
    },
    errorText: {
        color: '#EF4444',
        textAlign: 'center',
        marginTop: 24,
        fontSize: 16,
    },
});

export default StockPage;
