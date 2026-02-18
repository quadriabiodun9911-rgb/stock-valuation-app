import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { stockAPI, DCFParams, DCFResult, ComparableResult, TechnicalResult } from '../services/api';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

interface Props {
    route: any;
    navigation: any;
}

const ValuationScreen: React.FC<Props> = ({ route, navigation }) => {
    const { symbol, stockInfo } = route.params;

    // State
    const [activeTab, setActiveTab] = useState<'dcf' | 'comparable' | 'technical' | 'full'>('dcf');
    const [loading, setLoading] = useState(false);
    const [peerSymbolsText, setPeerSymbolsText] = useState('');
    const [dcfExcelFileName, setDcfExcelFileName] = useState<string | null>(null);
    const [peerExcelFileName, setPeerExcelFileName] = useState<string | null>(null);

    // Price Calculator State
    const [epsInput, setEpsInput] = useState('');
    const [peInput, setPeInput] = useState('');
    const [epsPeResult, setEpsPeResult] = useState<number | null>(null);
    const [dcfFcfInput, setDcfFcfInput] = useState('');
    const [dcfGrowthInput, setDcfGrowthInput] = useState('');
    const [dcfDiscountInput, setDcfDiscountInput] = useState('');
    const [dcfTerminalInput, setDcfTerminalInput] = useState('');
    const [dcfYearsInput, setDcfYearsInput] = useState('5');
    const [dcfNetDebtInput, setDcfNetDebtInput] = useState('');
    const [dcfSharesInput, setDcfSharesInput] = useState('');
    const [dcfPriceResult, setDcfPriceResult] = useState<number | null>(null);

    // DCF State
    const [dcfParams, setDcfParams] = useState<DCFParams>({
        symbol: symbol,
        growth_rate: 0.05,
        discount_rate: 0.10,
        terminal_growth_rate: 0.03,
    });
    const [dcfResult, setDcfResult] = useState<DCFResult | null>(null);

    // Comparable Analysis State
    const [comparableResult, setComparableResult] = useState<ComparableResult | null>(null);

    // Technical Analysis State
    const [technicalResult, setTechnicalResult] = useState<TechnicalResult | null>(null);

    useEffect(() => {
        navigation.setOptions({
            title: `${symbol} Valuation`,
        });
    }, [symbol, navigation]);

    const runDCFAnalysis = async () => {
        try {
            setLoading(true);
            const result = await stockAPI.calculateDCF(dcfParams);
            setDcfResult(result);
        } catch (error) {
            console.error('DCF Analysis Error:', error);
            Alert.alert('Error', 'Failed to perform DCF analysis. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const runComparableAnalysis = async () => {
        try {
            setLoading(true);
            const peers = peerSymbolsText
                .split(',')
                .map((item) => item.trim().toUpperCase())
                .filter(Boolean);
            const result = await stockAPI.getComparableAnalysis(symbol, peers.length ? peers : undefined);
            setComparableResult(result);
        } catch (error) {
            console.error('Comparable Analysis Error:', error);
            Alert.alert('Error', 'Failed to perform comparable analysis. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const runTechnicalAnalysis = async () => {
        try {
            setLoading(true);
            const result = await stockAPI.getTechnicalAnalysis(symbol);
            setTechnicalResult(result);
        } catch (error) {
            console.error('Technical Analysis Error:', error);
            Alert.alert('Error', 'Failed to perform technical analysis. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const runFullAnalysis = async () => {
        try {
            setLoading(true);
            await runDCFAnalysis();
            await runComparableAnalysis();
            await runTechnicalAnalysis();
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price: number): string => {
        return `$${price.toFixed(2)}`;
    };

    const formatPercentage = (value: number): string => {
        return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
    };

    const formatLargeNumber = (num: number): string => {
        if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
        return `$${num.toFixed(0)}`;
    };

    const parseNumber = (value: string) => {
        const cleaned = value.replace(/[^0-9.-]/g, '');
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const calculateEpsPePrice = () => {
        const eps = parseNumber(epsInput);
        const pe = parseNumber(peInput);
        if (eps === null || pe === null) {
            setEpsPeResult(null);
            return;
        }
        setEpsPeResult(eps * pe);
    };

    const calculateDcfPrice = () => {
        const fcf = parseNumber(dcfFcfInput);
        const growth = parseNumber(dcfGrowthInput);
        const discount = parseNumber(dcfDiscountInput);
        const terminal = parseNumber(dcfTerminalInput);
        const years = parseNumber(dcfYearsInput);
        const netDebt = parseNumber(dcfNetDebtInput) ?? 0;
        const shares = parseNumber(dcfSharesInput);

        if (fcf === null || growth === null || discount === null || terminal === null || years === null || shares === null) {
            setDcfPriceResult(null);
            return;
        }

        const g = growth > 1 ? growth / 100 : growth;
        const r = discount > 1 ? discount / 100 : discount;
        const tg = terminal > 1 ? terminal / 100 : terminal;

        if (r <= tg) {
            Alert.alert('Invalid Assumptions', 'Discount rate must be higher than terminal growth.');
            setDcfPriceResult(null);
            return;
        }

        const horizon = Math.max(1, Math.round(years));
        const projected = Array.from({ length: horizon }, (_, idx) => fcf * Math.pow(1 + g, idx + 1));
        const pvCashflows = projected.reduce((sum, value, idx) => sum + value / Math.pow(1 + r, idx + 1), 0);
        const terminalValue = (projected[horizon - 1] * (1 + tg)) / (r - tg);
        const pvTerminal = terminalValue / Math.pow(1 + r, horizon);
        const enterpriseValue = pvCashflows + pvTerminal;
        const equityValue = enterpriseValue - netDebt;
        const intrinsic = equityValue / shares;

        setDcfPriceResult(intrinsic);
    };

    const buildFullSummary = () => {
        const insights: string[] = [];
        if (dcfResult) {
            insights.push(
                dcfResult.upside_percentage >= 0
                    ? `DCF implies ${formatPercentage(dcfResult.upside_percentage)} upside.`
                    : `DCF implies ${formatPercentage(dcfResult.upside_percentage)} downside.`
            );
        }
        if (comparableResult) {
            insights.push(
                comparableResult.upside_percentage >= 0
                    ? `Comps suggest ${formatPercentage(comparableResult.upside_percentage)} upside.`
                    : `Comps suggest ${formatPercentage(comparableResult.upside_percentage)} downside.`
            );
        }
        if (technicalResult) {
            insights.push(`Trend: ${technicalResult.trend.direction} (${technicalResult.trend.strength}).`);
        }
        return insights.length ? insights.join(' ') : 'Run analyses to generate a unified summary.';
    };

    const buildRiskFlags = () => {
        const flags: Array<{ label: string; tone: 'positive' | 'neutral' | 'negative' }> = [];
        if (dcfResult) {
            if (dcfResult.upside_percentage < -10) {
                flags.push({ label: 'DCF downside risk', tone: 'negative' });
            } else if (dcfResult.upside_percentage > 15) {
                flags.push({ label: 'DCF upside buffer', tone: 'positive' });
            }
        }
        if (comparableResult) {
            if (comparableResult.upside_percentage < -10) {
                flags.push({ label: 'Peers priced higher', tone: 'negative' });
            } else if (comparableResult.upside_percentage > 10) {
                flags.push({ label: 'Peers priced lower', tone: 'positive' });
            }
        }
        if (technicalResult) {
            const rsi = technicalResult.momentum_indicators.rsi;
            if (rsi > 70) flags.push({ label: 'RSI overbought', tone: 'negative' });
            if (rsi < 30) flags.push({ label: 'RSI oversold', tone: 'positive' });
            if (!technicalResult.signals.length) flags.push({ label: 'No fresh signals', tone: 'neutral' });
        }
        if (!flags.length) {
            flags.push({ label: 'Awaiting data', tone: 'neutral' });
        }
        return flags;
    };

    const fillDcfDefaults = () => {
        setDcfGrowthInput(((dcfParams.growth_rate || 0.05) * 100).toFixed(2));
        setDcfDiscountInput(((dcfParams.discount_rate || 0.10) * 100).toFixed(2));
        setDcfTerminalInput(((dcfParams.terminal_growth_rate || 0.03) * 100).toFixed(2));
    };

    const getConfidenceColor = (confidence: string): string => {
        switch (confidence.toLowerCase()) {
            case 'high': return '#34C759';
            case 'medium': return '#FF9500';
            default: return '#FF3B30';
        }
    };

    const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

    const parseCsvLine = (line: string) => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i += 1;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };

    const importDCFExcel = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    'text/csv',
                    'text/comma-separated-values',
                    'application/csv',
                    'text/plain'
                ],
                copyToCacheDirectory: true
            });

            if (result.canceled || !result.assets?.length) {
                return;
            }

            const file = result.assets[0];
            setDcfExcelFileName(file.name || 'CSV File');

            const csvText = await FileSystem.readAsStringAsync(file.uri, {
                encoding: FileSystem.EncodingType.UTF8
            });

            const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
            if (lines.length < 2) {
                throw new Error('CSV must include header and one data row.');
            }

            const headers = parseCsvLine(lines[0]);
            const values = parseCsvLine(lines[1]);

            const normalized: Record<string, string | number> = {};
            headers.forEach((header, index) => {
                normalized[normalizeKey(header)] = values[index] ?? '';
            });

            const growthRate = Number(normalized[normalizeKey('growth_rate')]) || 0.05;
            const discountRate = Number(normalized[normalizeKey('discount_rate')]) || 0.10;
            const terminalGrowth = Number(normalized[normalizeKey('terminal_growth_rate')]) || 0.03;

            setDcfParams((prev) => ({
                ...prev,
                growth_rate: growthRate > 1 ? growthRate / 100 : growthRate,
                discount_rate: discountRate > 1 ? discountRate / 100 : discountRate,
                terminal_growth_rate: terminalGrowth > 1 ? terminalGrowth / 100 : terminalGrowth,
            }));
            Alert.alert('Import Success', 'DCF parameters updated from CSV file.');
        } catch (error) {
            console.error('DCF CSV import error:', error);
            Alert.alert('Import Error', 'Failed to import DCF parameters from CSV file.');
        }
    };

    const importPeersExcel = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    'text/csv',
                    'text/comma-separated-values',
                    'application/csv',
                    'text/plain'
                ],
                copyToCacheDirectory: true
            });

            if (result.canceled || !result.assets?.length) {
                return;
            }

            const file = result.assets[0];
            setPeerExcelFileName(file.name || 'CSV File');

            const csvText = await FileSystem.readAsStringAsync(file.uri, {
                encoding: FileSystem.EncodingType.UTF8
            });

            const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
            if (lines.length < 2) {
                throw new Error('CSV must include header and at least one peer row.');
            }

            const peerValues = lines.slice(1)
                .map((line) => parseCsvLine(line)[0] || '')
                .map((value) => String(value).trim())
                .filter(Boolean);
            setPeerSymbolsText(peerValues.join(', '));
            Alert.alert('Import Success', 'Peer symbols updated from CSV file.');
        } catch (error) {
            console.error('Peer CSV import error:', error);
            Alert.alert('Import Error', 'Failed to import peer symbols from CSV file.');
        }
    };

    const renderDCFTab = () => (
        <View>
            {/* DCF Parameters */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>DCF Parameters</Text>

                <View style={styles.parameterRow}>
                    <Text style={styles.parameterLabel}>Growth Rate (%)</Text>
                    <TextInput
                        style={styles.parameterInput}
                        value={(dcfParams.growth_rate * 100).toString()}
                        onChangeText={(text) => setDcfParams({
                            ...dcfParams,
                            growth_rate: parseFloat(text) / 100 || 0.05
                        })}
                        keyboardType="numeric"
                    />
                </View>

                <View style={styles.parameterRow}>
                    <Text style={styles.parameterLabel}>Discount Rate (%)</Text>
                    <TextInput
                        style={styles.parameterInput}
                        value={(dcfParams.discount_rate * 100).toString()}
                        onChangeText={(text) => setDcfParams({
                            ...dcfParams,
                            discount_rate: parseFloat(text) / 100 || 0.10
                        })}
                        keyboardType="numeric"
                    />
                </View>

                <View style={styles.parameterRow}>
                    <Text style={styles.parameterLabel}>Terminal Growth (%)</Text>
                    <TextInput
                        style={styles.parameterInput}
                        value={(dcfParams.terminal_growth_rate * 100).toString()}
                        onChangeText={(text) => setDcfParams({
                            ...dcfParams,
                            terminal_growth_rate: parseFloat(text) / 100 || 0.03
                        })}
                        keyboardType="numeric"
                    />
                </View>

                <TouchableOpacity
                    style={styles.analyzeButton}
                    onPress={runDCFAnalysis}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Ionicons name="calculator" size={20} color="white" />
                            <Text style={styles.analyzeButtonText}>Calculate DCF</Text>
                        </>
                    )}
                </TouchableOpacity>
                <View style={styles.importRow}>
                    <TouchableOpacity style={styles.importButton} onPress={importDCFExcel}>
                        <Ionicons name="document" size={16} color="white" />
                        <Text style={styles.importButtonText}>Import DCF CSV</Text>
                    </TouchableOpacity>
                    {dcfExcelFileName && (
                        <Text style={styles.importFileName}>Selected: {dcfExcelFileName}</Text>
                    )}
                </View>
            </View>

            {/* DCF Results */}
            {dcfResult && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>DCF Results</Text>

                    <View style={styles.resultCard}>
                        <View style={styles.resultHeader}>
                            <Text style={styles.resultTitle}>Valuation Summary</Text>
                            <View style={[
                                styles.confidenceBadge,
                                { backgroundColor: getConfidenceColor(dcfResult.confidence_level) }
                            ]}>
                                <Text style={styles.confidenceText}>{dcfResult.confidence_level}</Text>
                            </View>
                        </View>

                        <View style={styles.resultRow}>
                            <Text style={styles.resultLabel}>Current Price:</Text>
                            <Text style={styles.resultValue}>
                                {formatPrice(dcfResult.current_price)}
                            </Text>
                        </View>

                        <View style={styles.resultRow}>
                            <Text style={styles.resultLabel}>Intrinsic Value:</Text>
                            <Text style={[styles.resultValue, styles.intrinsicValue]}>
                                {formatPrice(dcfResult.intrinsic_value)}
                            </Text>
                        </View>

                        <View style={styles.resultRow}>
                            <Text style={styles.resultLabel}>Upside/Downside:</Text>
                            <Text style={[
                                styles.resultValue,
                                { color: dcfResult.upside_percentage > 0 ? '#34C759' : '#FF3B30' }
                            ]}>
                                {formatPercentage(dcfResult.upside_percentage)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.detailsCard}>
                        <Text style={styles.detailsTitle}>Valuation Details</Text>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Enterprise Value:</Text>
                            <Text style={styles.detailValue}>
                                {formatLargeNumber(dcfResult.enterprise_value)}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Equity Value:</Text>
                            <Text style={styles.detailValue}>
                                {formatLargeNumber(dcfResult.equity_value)}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Terminal Value:</Text>
                            <Text style={styles.detailValue}>
                                {formatLargeNumber(dcfResult.terminal_value)}
                            </Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );

    const renderTechnicalTab = () => (
        <View>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Technical Analysis</Text>
                <Text style={styles.sectionSubtitle}>
                    Chart patterns, indicators, and trading signals
                </Text>

                <TouchableOpacity
                    style={styles.analyzeButton}
                    onPress={runTechnicalAnalysis}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Ionicons name="pulse" size={20} color="white" />
                            <Text style={styles.analyzeButtonText}>Analyze Charts</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {technicalResult && (
                <View>
                    {/* Price Levels */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Price Levels</Text>

                        <View style={styles.priceLevel}>
                            <Text style={styles.priceLevelLabel}>Resistance:</Text>
                            <Text style={[styles.priceLevelValue, { color: '#FF3B30' }]}>
                                {formatPrice(technicalResult.support_resistance.resistance)}
                            </Text>
                        </View>

                        <View style={styles.priceLevel}>
                            <Text style={styles.priceLevelLabel}>Current Price:</Text>
                            <Text style={styles.priceLevelValue}>
                                {formatPrice(technicalResult.current_price)}
                            </Text>
                        </View>

                        <View style={styles.priceLevel}>
                            <Text style={styles.priceLevelLabel}>Support:</Text>
                            <Text style={[styles.priceLevelValue, { color: '#34C759' }]}>
                                {formatPrice(technicalResult.support_resistance.support)}
                            </Text>
                        </View>
                    </View>

                    {/* Technical Indicators */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Technical Indicators</Text>

                        <View style={styles.indicatorsGrid}>
                            <View style={styles.indicatorCard}>
                                <Text style={styles.indicatorLabel}>RSI</Text>
                                <Text style={[
                                    styles.indicatorValue,
                                    {
                                        color: technicalResult.momentum_indicators.rsi > 70 ? '#FF3B30' :
                                            technicalResult.momentum_indicators.rsi < 30 ? '#34C759' : '#333'
                                    }
                                ]}>
                                    {technicalResult.momentum_indicators.rsi.toFixed(1)}
                                </Text>
                                <Text style={styles.indicatorStatus}>
                                    {technicalResult.momentum_indicators.rsi > 70 ? 'Overbought' :
                                        technicalResult.momentum_indicators.rsi < 30 ? 'Oversold' : 'Neutral'}
                                </Text>
                            </View>

                            <View style={styles.indicatorCard}>
                                <Text style={styles.indicatorLabel}>MACD</Text>
                                <Text style={[
                                    styles.indicatorValue,
                                    { color: technicalResult.momentum_indicators.macd > 0 ? '#34C759' : '#FF3B30' }
                                ]}>
                                    {technicalResult.momentum_indicators.macd.toFixed(3)}
                                </Text>
                                <Text style={styles.indicatorStatus}>
                                    {technicalResult.momentum_indicators.macd > 0 ? 'Bullish' : 'Bearish'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Trading Signals */}
                    {technicalResult.signals.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Trading Signals</Text>

                            {technicalResult.signals.map((signal, index) => (
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
            )}
        </View>
    );

    const renderComparableTab = () => (
        <View>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Comparable Parameters</Text>
                <Text style={styles.sectionSubtitle}>
                    Add peer symbols separated by commas or import from CSV (first column).
                </Text>
                <TextInput
                    style={styles.peerInput}
                    value={peerSymbolsText}
                    onChangeText={setPeerSymbolsText}
                    placeholder="AAPL, MSFT, GOOGL"
                    autoCapitalize="characters"
                />
                <View style={styles.importRow}>
                    <TouchableOpacity style={styles.importButton} onPress={importPeersExcel}>
                        <Ionicons name="document" size={16} color="white" />
                        <Text style={styles.importButtonText}>Import Peers CSV</Text>
                    </TouchableOpacity>
                    {peerExcelFileName && (
                        <Text style={styles.importFileName}>Selected: {peerExcelFileName}</Text>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.analyzeButton}
                    onPress={runComparableAnalysis}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Ionicons name="stats-chart" size={20} color="white" />
                            <Text style={styles.analyzeButtonText}>Run Comparable Analysis</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {comparableResult && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Comparable Results</Text>
                    <View style={styles.resultCard}>
                        <View style={styles.resultRow}>
                            <Text style={styles.resultLabel}>Average Valuation:</Text>
                            <Text style={styles.resultValue}>
                                {formatPrice(comparableResult.average_valuation)}
                            </Text>
                        </View>
                        <View style={styles.resultRow}>
                            <Text style={styles.resultLabel}>Upside/Downside:</Text>
                            <Text style={styles.resultValue}>
                                {formatPercentage(comparableResult.upside_percentage)}
                            </Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );

    const renderFullTab = () => (
        <View>
            <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Full Analysis Overview</Text>
                    <TouchableOpacity style={styles.runAllButton} onPress={runFullAnalysis} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <>
                                <Ionicons name="rocket" size={16} color="white" />
                                <Text style={styles.runAllButtonText}>Run All</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
                <Text style={styles.sectionSubtitle}>
                    Combine DCF, comparable multiples, and technical signals into one snapshot.
                </Text>

                <View style={styles.summaryGrid}>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>DCF Value</Text>
                        <Text style={styles.summaryValue}>
                            {dcfResult ? formatPrice(dcfResult.intrinsic_value) : '—'}
                        </Text>
                        <Text style={styles.summaryMeta}>
                            {dcfResult ? formatPercentage(dcfResult.upside_percentage) : 'Run DCF to update'}
                        </Text>
                    </View>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>Comparable Value</Text>
                        <Text style={styles.summaryValue}>
                            {comparableResult ? formatPrice(comparableResult.average_valuation) : '—'}
                        </Text>
                        <Text style={styles.summaryMeta}>
                            {comparableResult ? formatPercentage(comparableResult.upside_percentage) : 'Run comps to update'}
                        </Text>
                    </View>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>Technical Signal</Text>
                        <Text style={styles.summaryValue}>
                            {technicalResult ? technicalResult.trend.direction : '—'}
                        </Text>
                        <Text style={styles.summaryMeta}>
                            {technicalResult ? technicalResult.trend.strength : 'Run technicals to update'}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Smart Summary</Text>
                <Text style={styles.sectionSubtitle}>{buildFullSummary()}</Text>
                <View style={styles.flagRow}>
                    {buildRiskFlags().map((flag, index) => (
                        <View
                            key={`${flag.label}-${index}`}
                            style={
                                flag.tone === 'positive'
                                    ? styles.flagPositive
                                    : flag.tone === 'negative'
                                        ? styles.flagNegative
                                        : styles.flagNeutral
                            }
                        >
                            <Text style={styles.flagText}>{flag.label}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Price Calculator</Text>
                <Text style={styles.sectionSubtitle}>Estimate target prices with quick valuation inputs.</Text>

                <View style={styles.calculatorCard}>
                    <View style={styles.calculatorHeader}>
                        <Text style={styles.calculatorTitle}>EPS × P/E</Text>
                        <Text style={styles.calculatorBadge}>Quick multiple</Text>
                    </View>
                    <View style={styles.calculatorRow}>
                        <View style={styles.calculatorField}>
                            <Text style={styles.calculatorLabel}>EPS</Text>
                            <TextInput
                                style={styles.calculatorInput}
                                value={epsInput}
                                onChangeText={setEpsInput}
                                keyboardType="decimal-pad"
                                placeholder="2.50"
                            />
                        </View>
                        <View style={styles.calculatorField}>
                            <Text style={styles.calculatorLabel}>P/E</Text>
                            <TextInput
                                style={styles.calculatorInput}
                                value={peInput}
                                onChangeText={setPeInput}
                                keyboardType="decimal-pad"
                                placeholder="18"
                            />
                        </View>
                    </View>
                    <TouchableOpacity style={styles.calcButton} onPress={calculateEpsPePrice}>
                        <Ionicons name="calculator" size={16} color="white" />
                        <Text style={styles.calcButtonText}>Calculate Target Price</Text>
                    </TouchableOpacity>
                    <Text style={styles.calcResultText}>
                        {epsPeResult !== null ? `Target Price: ${formatPrice(epsPeResult)}` : 'Enter EPS and P/E to calculate.'}
                    </Text>
                </View>

                <View style={styles.calculatorCard}>
                    <View style={styles.calculatorHeader}>
                        <Text style={styles.calculatorTitle}>DCF Target</Text>
                        <TouchableOpacity style={styles.calcGhostButton} onPress={fillDcfDefaults}>
                            <Text style={styles.calcGhostButtonText}>Use DCF Params</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.calculatorRow}>
                        <View style={styles.calculatorField}>
                            <Text style={styles.calculatorLabel}>Current FCF</Text>
                            <TextInput
                                style={styles.calculatorInput}
                                value={dcfFcfInput}
                                onChangeText={setDcfFcfInput}
                                keyboardType="decimal-pad"
                                placeholder="1500000000"
                            />
                        </View>
                        <View style={styles.calculatorField}>
                            <Text style={styles.calculatorLabel}>Shares</Text>
                            <TextInput
                                style={styles.calculatorInput}
                                value={dcfSharesInput}
                                onChangeText={setDcfSharesInput}
                                keyboardType="decimal-pad"
                                placeholder="1000000000"
                            />
                        </View>
                    </View>
                    <View style={styles.calculatorRow}>
                        <View style={styles.calculatorField}>
                            <Text style={styles.calculatorLabel}>Growth %</Text>
                            <TextInput
                                style={styles.calculatorInput}
                                value={dcfGrowthInput}
                                onChangeText={setDcfGrowthInput}
                                keyboardType="decimal-pad"
                                placeholder="6"
                            />
                        </View>
                        <View style={styles.calculatorField}>
                            <Text style={styles.calculatorLabel}>Discount %</Text>
                            <TextInput
                                style={styles.calculatorInput}
                                value={dcfDiscountInput}
                                onChangeText={setDcfDiscountInput}
                                keyboardType="decimal-pad"
                                placeholder="10"
                            />
                        </View>
                    </View>
                    <View style={styles.calculatorRow}>
                        <View style={styles.calculatorField}>
                            <Text style={styles.calculatorLabel}>Terminal %</Text>
                            <TextInput
                                style={styles.calculatorInput}
                                value={dcfTerminalInput}
                                onChangeText={setDcfTerminalInput}
                                keyboardType="decimal-pad"
                                placeholder="3"
                            />
                        </View>
                        <View style={styles.calculatorField}>
                            <Text style={styles.calculatorLabel}>Net Debt</Text>
                            <TextInput
                                style={styles.calculatorInput}
                                value={dcfNetDebtInput}
                                onChangeText={setDcfNetDebtInput}
                                keyboardType="decimal-pad"
                                placeholder="0"
                            />
                        </View>
                    </View>
                    <View style={styles.calculatorRow}>
                        <View style={styles.calculatorField}>
                            <Text style={styles.calculatorLabel}>Years</Text>
                            <TextInput
                                style={styles.calculatorInput}
                                value={dcfYearsInput}
                                onChangeText={setDcfYearsInput}
                                keyboardType="numeric"
                                placeholder="5"
                            />
                        </View>
                        <View style={styles.calculatorField}>
                            <Text style={styles.calculatorLabel}>Result</Text>
                            <Text style={styles.calculatorResult}>
                                {dcfPriceResult !== null ? formatPrice(dcfPriceResult) : '—'}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.calcButton} onPress={calculateDcfPrice}>
                        <Ionicons name="analytics" size={16} color="white" />
                        <Text style={styles.calcButtonText}>Calculate DCF Target</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Stock Header */}
            <View style={styles.stockHeader}>
                <View style={styles.stockHeaderContent}>
                    <View style={styles.stockInfo}>
                        <Text style={styles.stockSymbol}>{symbol}</Text>
                        <Text style={styles.stockName}>{stockInfo?.company_name || 'Loading...'}</Text>
                        <Text style={styles.currentPrice}>
                            {stockInfo ? formatPrice(stockInfo.current_price) : 'Loading...'}
                        </Text>
                    </View>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.fcfButton}
                            onPress={() => navigation.navigate('FCFValuation', { symbol })}
                        >
                            <Ionicons name="calculator-outline" size={18} color="white" />
                            <Text style={styles.fcfButtonText}>FCF</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.scenarioButton}
                            onPress={() => navigation.navigate('ScenarioAnalysis', { symbol })}
                        >
                            <Ionicons name="analytics-outline" size={18} color="white" />
                            <Text style={styles.scenarioButtonText}>Scenarios</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'dcf' && styles.activeTab]}
                        onPress={() => setActiveTab('dcf')}
                    >
                        <Text style={[styles.tabText, activeTab === 'dcf' && styles.activeTabText]}>
                            DCF
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'comparable' && styles.activeTab]}
                        onPress={() => setActiveTab('comparable')}
                    >
                        <Text style={[styles.tabText, activeTab === 'comparable' && styles.activeTabText]}>
                            Comparable
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'technical' && styles.activeTab]}
                        onPress={() => setActiveTab('technical')}
                    >
                        <Text style={[styles.tabText, activeTab === 'technical' && styles.activeTabText]}>
                            Technical
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'full' && styles.activeTab]}
                        onPress={() => setActiveTab('full')}
                    >
                        <Text style={[styles.tabText, activeTab === 'full' && styles.activeTabText]}>
                            Full
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tab Content */}
            {activeTab === 'dcf' && renderDCFTab()}
            {activeTab === 'comparable' && renderComparableTab()}
            {activeTab === 'technical' && renderTechnicalTab()}
            {activeTab === 'full' && renderFullTab()}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    stockHeader: {
        backgroundColor: 'white',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    stockHeaderContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    stockInfo: {
        flex: 1,
        alignItems: 'flex-start',
    },
    buttonContainer: {
        flexDirection: 'column',
        gap: 8,
    },
    stockSymbol: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    stockName: {
        fontSize: 16,
        color: '#666',
        marginTop: 4,
    },
    currentPrice: {
        fontSize: 20,
        fontWeight: '600',
        color: '#007AFF',
        marginTop: 8,
    },
    fcfButton: {
        backgroundColor: '#4F46E5',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
    },
    fcfButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    scenarioButton: {
        backgroundColor: '#059669',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
    },
    scenarioButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    runAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111827',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    runAllButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 6,
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    summaryCard: {
        width: '48%',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 6,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    summaryMeta: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 6,
    },
    calculatorCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 16,
    },
    calculatorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    calculatorTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    calculatorBadge: {
        fontSize: 11,
        color: '#2563eb',
        backgroundColor: '#dbeafe',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        fontWeight: '600',
    },
    calculatorRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    calculatorField: {
        width: '48%',
    },
    calculatorLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 6,
    },
    calculatorInput: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 13,
        backgroundColor: '#f9fafb',
    },
    calculatorResult: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginTop: 8,
    },
    calcButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563eb',
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 8,
    },
    calcButtonText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 6,
    },
    calcResultText: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 10,
    },
    calcGhostButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#f3f4f6',
    },
    calcGhostButtonText: {
        fontSize: 11,
        color: '#374151',
        fontWeight: '600',
    },
    flagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    flagPositive: {
        backgroundColor: '#dcfce7',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    flagNegative: {
        backgroundColor: '#fee2e2',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    flagNeutral: {
        backgroundColor: '#e5e7eb',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    flagText: {
        fontSize: 11,
        color: '#111827',
        fontWeight: '600',
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
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    parameterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    parameterLabel: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    parameterInput: {
        width: 80,
        height: 40,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        textAlign: 'center',
        fontSize: 16,
    },
    peerInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        marginBottom: 8,
    },
    analyzeButton: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    analyzeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    importRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    importButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4F46E5',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    importButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 6,
    },
    importFileName: {
        fontSize: 12,
        color: '#6b7280',
        marginLeft: 10,
        flex: 1,
    },
    resultCard: {
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    resultTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    confidenceBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    confidenceText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    resultLabel: {
        fontSize: 14,
        color: '#666',
    },
    resultValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    intrinsicValue: {
        color: '#007AFF',
        fontSize: 16,
    },
    detailsCard: {
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 8,
    },
    detailsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    detailLabel: {
        fontSize: 14,
        color: '#666',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    peersText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 12,
    },
    metricsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    metricCard: {
        width: '48%',
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    metricLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    metricCurrent: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    metricPeer: {
        fontSize: 10,
        color: '#999',
        marginTop: 2,
    },
    priceLevel: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    priceLevelLabel: {
        fontSize: 16,
        color: '#666',
    },
    priceLevelValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    indicatorsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    indicatorCard: {
        width: '48%',
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    indicatorLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    indicatorValue: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    indicatorStatus: {
        fontSize: 12,
        color: '#666',
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

export default ValuationScreen;