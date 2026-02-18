import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Switch,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import {
    StockValuationAPI,
    UserFinancialData,
    FCFResult,
    FCFValuationParams,
    FinancialGrowthMetrics,
    PriceEpsSeries
} from '../services/api';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

interface ScenarioAnalysisScreenProps {
    route: {
        params: {
            symbol: string;
        };
    };
    navigation: any;
}

interface Scenario {
    id: string;
    name: string;
    type: 'optimistic' | 'base' | 'pessimistic' | 'custom';
    color: string;
    params: FCFValuationParams;
    result?: FCFResult;
}

interface FinancialRatios {
    roe: number;
    roa: number;
    debt_to_equity: number;
    current_ratio: number;
    fcf_per_share: number;
    ev_to_fcf: number;
    price_to_fcf: number;
    fcf_growth_rate: number;
}

const ScenarioAnalysisScreen: React.FC<ScenarioAnalysisScreenProps> = ({ route, navigation }) => {
    const { symbol } = route.params;
    const [loading, setLoading] = useState(false);
    const [loadingTemplate, setLoadingTemplate] = useState(true);
    const [selectedScenario, setSelectedScenario] = useState<string>('base');
    const [templateData, setTemplateData] = useState<UserFinancialData | null>(null);
    const [showDetailedProjections, setShowDetailedProjections] = useState(true);
    const [showFinancialRatios, setShowFinancialRatios] = useState(true);
    const [useCustomData, setUseCustomData] = useState(false);
    const [importText, setImportText] = useState('');
    const [importCsvText, setImportCsvText] = useState('');
    const [excelFileName, setExcelFileName] = useState<string | null>(null);
    const [growthMetrics, setGrowthMetrics] = useState<FinancialGrowthMetrics | null>(null);
    const [growthLoading, setGrowthLoading] = useState(false);
    const [priceEpsSeries, setPriceEpsSeries] = useState<PriceEpsSeries | null>(null);
    const [priceEpsLoading, setPriceEpsLoading] = useState(false);
    const [priceEpsPeriod, setPriceEpsPeriod] = useState<'6mo' | '1y' | '3y' | '5y'>('1y');
    const api = new StockValuationAPI();

    const [scenarios, setScenarios] = useState<Scenario[]>([
        {
            id: 'optimistic',
            name: 'Optimistic',
            type: 'optimistic',
            color: '#10B981',
            params: {
                symbol,
                years_to_project: 5,
                growth_rate: 0.08, // 8% growth
                discount_rate: 0.09, // Lower discount rate
                terminal_growth_rate: 0.04, // Higher terminal growth
                use_custom_data: false
            }
        },
        {
            id: 'base',
            name: 'Base Case',
            type: 'base',
            color: '#3B82F6',
            params: {
                symbol,
                years_to_project: 5,
                growth_rate: 0.05, // 5% growth
                discount_rate: 0.10, // Standard WACC
                terminal_growth_rate: 0.03, // GDP growth
                use_custom_data: false
            }
        },
        {
            id: 'pessimistic',
            name: 'Pessimistic',
            type: 'pessimistic',
            color: '#EF4444',
            params: {
                symbol,
                years_to_project: 5,
                growth_rate: 0.02, // 2% growth
                discount_rate: 0.12, // Higher risk premium
                terminal_growth_rate: 0.02, // Lower terminal growth
                use_custom_data: false
            }
        }
    ]);

    useEffect(() => {
        loadFinancialTemplate();
        loadGrowthMetrics();
    }, []);

    useEffect(() => {
        loadPriceEpsSeries(priceEpsPeriod);
    }, [symbol, priceEpsPeriod]);

    const loadGrowthMetrics = async () => {
        try {
            setGrowthLoading(true);
            const metrics = await api.getFinancialGrowthMetrics(symbol, '1y');
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
            const series = await api.getPriceEpsSeries(symbol, period);
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

    const loadFinancialTemplate = async () => {
        try {
            setLoadingTemplate(true);
            const templateResponse = await api.getFinancialTemplate(symbol);
            const template = templateResponse.template;

            setTemplateData(template);

            // Update scenarios with template data
            const updatedScenarios = scenarios.map(scenario => ({
                ...scenario,
                params: {
                    ...scenario.params,
                    custom_data: template,
                    use_custom_data: useCustomData
                }
            }));
            setScenarios(updatedScenarios);

        } catch (error) {
            console.error('Error loading template:', error);
            Alert.alert('Error', 'Failed to load financial data template');
        } finally {
            setLoadingTemplate(false);
        }
    };

    const runAllScenarios = async () => {
        try {
            setLoading(true);
            const updatedScenarios = [...scenarios];

            for (let i = 0; i < updatedScenarios.length; i++) {
                const scenario = updatedScenarios[i];
                try {
                    const result = await api.calculateFCFValuation(scenario.params);
                    updatedScenarios[i] = { ...scenario, result };
                } catch (error) {
                    console.error(`Error calculating ${scenario.name}:`, error);
                }
            }

            setScenarios(updatedScenarios);
        } catch (error) {
            console.error('Error running scenarios:', error);
            Alert.alert('Error', 'Failed to calculate scenarios');
        } finally {
            setLoading(false);
        }
    };

    const calculateFinancialRatios = (result: FCFResult, template: UserFinancialData): FinancialRatios => {
        const marketCap = result.current_price * result.assumptions.shares_outstanding;
        const totalEquity = (template.total_assets || 0) - (template.total_debt || 0);

        return {
            roe: template.net_income ? (template.net_income / totalEquity) * 100 : 0,
            roa: template.net_income && template.total_assets ? (template.net_income / template.total_assets) * 100 : 0,
            debt_to_equity: template.total_debt && totalEquity ? (template.total_debt / totalEquity) : 0,
            current_ratio: 1.5, // Simplified - would need current assets/liabilities
            fcf_per_share: result.current_fcf / result.assumptions.shares_outstanding,
            ev_to_fcf: result.enterprise_value / result.current_fcf,
            price_to_fcf: result.current_price / (result.current_fcf / result.assumptions.shares_outstanding),
            fcf_growth_rate: result.growth_rates_used[0] * 100
        };
    };

    const updateScenarioParam = (scenarioId: string, param: string, value: any) => {
        setScenarios(prev => prev.map(scenario =>
            scenario.id === scenarioId
                ? {
                    ...scenario,
                    params: {
                        ...scenario.params,
                        [param]: value
                    }
                }
                : scenario
        ));
    };

    const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

    const toNumber = (value: unknown) => {
        if (value === null || value === undefined) return undefined;
        if (typeof value === 'number') return value;
        if (typeof value !== 'string') return undefined;
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        const negative = trimmed.startsWith('(') && trimmed.endsWith(')');
        const cleaned = trimmed.replace(/[,$()]/g, '');
        const parsed = parseFloat(cleaned);
        if (Number.isNaN(parsed)) return undefined;
        return negative ? -parsed : parsed;
    };

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

    const applyCustomDataToScenarios = (data: UserFinancialData | null, enabled: boolean) => {
        setScenarios(prev => prev.map(scenario => ({
            ...scenario,
            params: {
                ...scenario.params,
                use_custom_data: enabled,
                custom_data: data || undefined
            }
        })));
    };

    const applyImportedData = () => {
        if (!importText.trim()) {
            Alert.alert('Import Error', 'Paste JSON financial data to import.');
            return;
        }

        try {
            const raw = JSON.parse(importText);
            if (typeof raw !== 'object' || raw === null) {
                throw new Error('Invalid JSON object');
            }

            const normalized: Record<string, unknown> = {};
            Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
                normalized[normalizeKey(key)] = value;
            });

            const getValue = (keys: string[]) => {
                for (const key of keys) {
                    const value = normalized[normalizeKey(key)];
                    if (value !== undefined) {
                        return value;
                    }
                }
                return undefined;
            };

            const imported: UserFinancialData = {
                symbol,
                revenue: toNumber(getValue(['revenue', 'total_revenue', 'totalRevenue'])),
                operating_income: toNumber(getValue(['operating_income', 'operatingIncome', 'ebit'])),
                net_income: toNumber(getValue(['net_income', 'netIncome', 'net_earnings'])),
                total_assets: toNumber(getValue(['total_assets', 'totalAssets'])),
                total_debt: toNumber(getValue(['total_debt', 'totalDebt', 'debt'])),
                cash_and_equivalents: toNumber(getValue(['cash_and_equivalents', 'cashAndEquivalents', 'cash'])),
                shares_outstanding: toNumber(getValue(['shares_outstanding', 'sharesOutstanding', 'shares'])),
                capex: toNumber(getValue(['capex', 'capital_expenditures', 'capitalExpenditures'])),
                working_capital_change: toNumber(getValue(['working_capital_change', 'change_in_working_capital', 'workingCapitalChange'])),
                tax_rate: toNumber(getValue(['tax_rate', 'effective_tax_rate', 'taxRate'])),
                depreciation: toNumber(getValue(['depreciation', 'depreciation_and_amortization', 'depreciationAndAmortization']))
            };

            setTemplateData(imported);
            setUseCustomData(true);
            applyCustomDataToScenarios(imported, true);
            setImportText('');
            Alert.alert('Import Success', 'Financial data has been applied to all scenarios.');
        } catch (error) {
            console.error('Import error:', error);
            Alert.alert('Import Error', 'Invalid JSON. Please verify the format.');
        }
    };

    const applyImportedCsv = () => {
        if (!importCsvText.trim()) {
            Alert.alert('Import Error', 'Paste CSV financial data to import.');
            return;
        }

        try {
            const lines = importCsvText.split(/\r?\n/).filter((line) => line.trim());
            if (lines.length < 2) {
                throw new Error('CSV must include header and one data row.');
            }

            const headers = parseCsvLine(lines[0]);
            const values = parseCsvLine(lines[1]);

            const normalized: Record<string, unknown> = {};
            headers.forEach((header, index) => {
                normalized[normalizeKey(header)] = values[index];
            });

            const getValue = (keys: string[]) => {
                for (const key of keys) {
                    const value = normalized[normalizeKey(key)];
                    if (value !== undefined) {
                        return value;
                    }
                }
                return undefined;
            };

            const imported: UserFinancialData = {
                symbol,
                revenue: toNumber(getValue(['revenue', 'total_revenue', 'totalRevenue'])),
                operating_income: toNumber(getValue(['operating_income', 'operatingIncome', 'ebit'])),
                net_income: toNumber(getValue(['net_income', 'netIncome', 'net_earnings'])),
                total_assets: toNumber(getValue(['total_assets', 'totalAssets'])),
                total_debt: toNumber(getValue(['total_debt', 'totalDebt', 'debt'])),
                cash_and_equivalents: toNumber(getValue(['cash_and_equivalents', 'cashAndEquivalents', 'cash'])),
                shares_outstanding: toNumber(getValue(['shares_outstanding', 'sharesOutstanding', 'shares'])),
                capex: toNumber(getValue(['capex', 'capital_expenditures', 'capitalExpenditures'])),
                working_capital_change: toNumber(getValue(['working_capital_change', 'change_in_working_capital', 'workingCapitalChange'])),
                tax_rate: toNumber(getValue(['tax_rate', 'effective_tax_rate', 'taxRate'])),
                depreciation: toNumber(getValue(['depreciation', 'depreciation_and_amortization', 'depreciationAndAmortization']))
            };

            setTemplateData(imported);
            setUseCustomData(true);
            applyCustomDataToScenarios(imported, true);
            setImportCsvText('');
            Alert.alert('Import Success', 'CSV data has been applied to all scenarios.');
        } catch (error) {
            console.error('CSV import error:', error);
            Alert.alert('Import Error', 'Invalid CSV. Please check the header and values.');
        }
    };

    const importFromCsvFile = async () => {
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
            setExcelFileName(file.name || 'CSV File');

            const csvText = await FileSystem.readAsStringAsync(file.uri, {
                encoding: FileSystem.EncodingType.UTF8
            });

            const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
            if (lines.length < 2) {
                throw new Error('CSV must include header and one data row.');
            }

            const headers = parseCsvLine(lines[0]);
            const values = parseCsvLine(lines[1]);

            const normalized: Record<string, unknown> = {};
            headers.forEach((header, index) => {
                normalized[normalizeKey(header)] = values[index];
            });

            const imported: UserFinancialData = {
                symbol,
                revenue: toNumber(normalized[normalizeKey('revenue')]),
                operating_income: toNumber(normalized[normalizeKey('operating_income')])
                    ?? toNumber(normalized[normalizeKey('operatingIncome')])
                    ?? toNumber(normalized[normalizeKey('ebit')]),
                net_income: toNumber(normalized[normalizeKey('net_income')])
                    ?? toNumber(normalized[normalizeKey('netIncome')])
                    ?? toNumber(normalized[normalizeKey('net_earnings')]),
                total_assets: toNumber(normalized[normalizeKey('total_assets')])
                    ?? toNumber(normalized[normalizeKey('totalAssets')]),
                total_debt: toNumber(normalized[normalizeKey('total_debt')])
                    ?? toNumber(normalized[normalizeKey('totalDebt')])
                    ?? toNumber(normalized[normalizeKey('debt')]),
                cash_and_equivalents: toNumber(normalized[normalizeKey('cash_and_equivalents')])
                    ?? toNumber(normalized[normalizeKey('cashAndEquivalents')])
                    ?? toNumber(normalized[normalizeKey('cash')]),
                shares_outstanding: toNumber(normalized[normalizeKey('shares_outstanding')])
                    ?? toNumber(normalized[normalizeKey('sharesOutstanding')])
                    ?? toNumber(normalized[normalizeKey('shares')]),
                capex: toNumber(normalized[normalizeKey('capex')])
                    ?? toNumber(normalized[normalizeKey('capital_expenditures')])
                    ?? toNumber(normalized[normalizeKey('capitalExpenditures')]),
                working_capital_change: toNumber(normalized[normalizeKey('working_capital_change')])
                    ?? toNumber(normalized[normalizeKey('change_in_working_capital')])
                    ?? toNumber(normalized[normalizeKey('workingCapitalChange')]),
                tax_rate: toNumber(normalized[normalizeKey('tax_rate')])
                    ?? toNumber(normalized[normalizeKey('effective_tax_rate')])
                    ?? toNumber(normalized[normalizeKey('taxRate')]),
                depreciation: toNumber(normalized[normalizeKey('depreciation')])
                    ?? toNumber(normalized[normalizeKey('depreciation_and_amortization')])
                    ?? toNumber(normalized[normalizeKey('depreciationAndAmortization')])
            };

            setTemplateData(imported);
            setUseCustomData(true);
            applyCustomDataToScenarios(imported, true);
            Alert.alert('Import Success', 'CSV file data has been applied to all scenarios.');
        } catch (error) {
            console.error('CSV file import error:', error);
            Alert.alert('Import Error', 'Failed to import CSV file.');
        }
    };

    const addCustomScenario = () => {
        const customId = `custom-${Date.now()}`;
        const newScenario: Scenario = {
            id: customId,
            name: `Custom ${scenarios.filter(s => s.type === 'custom').length + 1}`,
            type: 'custom',
            color: '#8B5CF6',
            params: {
                symbol,
                years_to_project: 5,
                growth_rate: 0.05,
                discount_rate: 0.10,
                terminal_growth_rate: 0.03,
                use_custom_data: false,
                custom_data: templateData || undefined
            }
        };
        setScenarios(prev => [...prev, newScenario]);
    };

    const removeScenario = (scenarioId: string) => {
        if (scenarios.length <= 3) {
            Alert.alert('Cannot Remove', 'You must keep at least 3 scenarios for comparison');
            return;
        }
        setScenarios(prev => prev.filter(s => s.id !== scenarioId));
    };

    const formatCurrency = (value: number, compact = false) => {
        if (!value) return '$0';
        if (compact) {
            if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
            if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
            if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
            if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
        }
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    };

    const formatPercentage = (value: number): string => {
        return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
    };

    const getScenarioIcon = (type: string) => {
        switch (type) {
            case 'optimistic': return 'trending-up';
            case 'pessimistic': return 'trending-down';
            case 'base': return 'remove';
            default: return 'settings';
        }
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

    if (loadingTemplate) {
        return (
            <LinearGradient colors={['#667eea', '#764ba2']} style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="white" />
                <Text style={styles.loadingText}>Loading financial data...</Text>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scenario Analysis - {symbol}</Text>
                <TouchableOpacity
                    onPress={addCustomScenario}
                    style={styles.addButton}
                >
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Control Panel */}
                <View style={styles.controlPanel}>
                    <View style={styles.controlRow}>
                        <View style={styles.switchContainer}>
                            <Text style={styles.switchLabel}>Detailed Projections</Text>
                            <Switch
                                value={showDetailedProjections}
                                onValueChange={setShowDetailedProjections}
                                trackColor={{ false: '#767577', true: '#4F46E5' }}
                            />
                        </View>
                        <View style={styles.switchContainer}>
                            <Text style={styles.switchLabel}>Financial Ratios</Text>
                            <Switch
                                value={showFinancialRatios}
                                onValueChange={setShowFinancialRatios}
                                trackColor={{ false: '#767577', true: '#4F46E5' }}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.runButton, loading && styles.buttonDisabled]}
                        onPress={runAllScenarios}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <>
                                <Ionicons name="play" size={18} color="white" />
                                <Text style={styles.runButtonText}>Run All Scenarios</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Financial Data Source */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Financial Data Source</Text>
                    <Text style={styles.sectionSubtitle}>
                        Import JSON financials to run scenarios with your own data. Toggle on to apply to all scenarios.
                    </Text>
                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>Use Custom Financial Data</Text>
                        <Switch
                            value={useCustomData}
                            onValueChange={(value) => {
                                setUseCustomData(value);
                                applyCustomDataToScenarios(templateData, value);
                            }}
                            trackColor={{ false: '#767577', true: '#4F46E5' }}
                        />
                    </View>
                    <TextInput
                        style={styles.importInput}
                        value={importText}
                        onChangeText={setImportText}
                        placeholder='{"revenue": 120000000, "net_income": 15000000, "total_debt": 30000000}'
                        placeholderTextColor="#9ca3af"
                        multiline
                        numberOfLines={6}
                    />
                    <View style={styles.importButtonRow}>
                        <TouchableOpacity style={styles.importButton} onPress={applyImportedData}>
                            <Ionicons name="cloud-upload" size={16} color="white" />
                            <Text style={styles.importButtonText}>Apply Import</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.importSecondaryButton} onPress={() => setImportText('')}>
                            <Text style={styles.importSecondaryButtonText}>Clear</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Import Financial Data (CSV)</Text>
                    <Text style={styles.sectionSubtitle}>
                        First line headers, second line values. Example:
                        revenue,operating_income,net_income,total_assets,total_debt,cash_and_equivalents,shares_outstanding,capex,working_capital_change,tax_rate,depreciation
                        120000000,18000000,15000000,500000000,30000000,20000000,100000000,-5000000,-2000000,0.24,8000000
                    </Text>
                    <TextInput
                        style={styles.importInput}
                        value={importCsvText}
                        onChangeText={setImportCsvText}
                        placeholder="revenue,net_income,total_debt\n120000000,15000000,30000000"
                        placeholderTextColor="#9ca3af"
                        multiline
                        numberOfLines={6}
                    />
                    <View style={styles.importButtonRow}>
                        <TouchableOpacity style={styles.importButton} onPress={applyImportedCsv}>
                            <Ionicons name="cloud-upload" size={16} color="white" />
                            <Text style={styles.importButtonText}>Apply CSV</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.importSecondaryButton} onPress={() => setImportCsvText('')}>
                            <Text style={styles.importSecondaryButtonText}>Clear</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Import Financial Data (CSV File)</Text>
                    <Text style={styles.sectionSubtitle}>
                        CSV file with header row and one data row.
                    </Text>
                    {excelFileName && (
                        <Text style={styles.fileNameText}>Selected: {excelFileName}</Text>
                    )}
                    <View style={styles.importButtonRow}>
                        <TouchableOpacity style={styles.importButton} onPress={importFromCsvFile}>
                            <Ionicons name="document" size={16} color="white" />
                            <Text style={styles.importButtonText}>Select CSV File</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.importSecondaryButton}
                            onPress={() => setExcelFileName(null)}
                        >
                            <Text style={styles.importSecondaryButtonText}>Clear</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Growth Metrics</Text>
                    <Text style={styles.sectionSubtitle}>
                        Year-over-year changes from available financial data.
                    </Text>
                    {growthLoading ? (
                        <View style={styles.chartLoading}>
                            <ActivityIndicator size="small" color="#4F46E5" />
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
                    <Text style={styles.sectionTitle}>Share Price & Daily EPS Movement</Text>
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
                            <ActivityIndicator size="small" color="#4F46E5" />
                            <Text style={styles.loadingText}>Loading chart...</Text>
                        </View>
                    ) : buildPriceEpsChart() ? (
                        <View>
                            <LineChart
                                data={buildPriceEpsChart()!}
                                width={Dimensions.get('window').width - 40}
                                height={240}
                                withDots={false}
                                withInnerLines={false}
                                chartConfig={{
                                    backgroundGradientFrom: '#ffffff',
                                    backgroundGradientTo: '#ffffff',
                                    decimalPlaces: 2,
                                    color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
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
                                        width={Dimensions.get('window').width - 40}
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

                {/* Scenario Configuration */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Scenario Parameters</Text>
                    {scenarios.map(scenario => (
                        <View key={scenario.id} style={styles.scenarioCard}>
                            <View style={styles.scenarioHeader}>
                                <View style={styles.scenarioTitleRow}>
                                    <View style={[styles.scenarioIndicator, { backgroundColor: scenario.color }]} />
                                    <Ionicons name={getScenarioIcon(scenario.type)} size={16} color={scenario.color} />
                                    <Text style={[styles.scenarioName, { color: scenario.color }]}>{scenario.name}</Text>
                                </View>
                                {scenario.type === 'custom' && (
                                    <TouchableOpacity onPress={() => removeScenario(scenario.id)}>
                                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            <View style={styles.parameterGrid}>
                                <View style={styles.parameterItem}>
                                    <Text style={styles.parameterLabel}>Growth Rate (%)</Text>
                                    <TextInput
                                        style={styles.parameterInput}
                                        value={(scenario.params.growth_rate * 100).toFixed(1)}
                                        onChangeText={(value) => updateScenarioParam(
                                            scenario.id,
                                            'growth_rate',
                                            parseFloat(value) / 100 || 0.05
                                        )}
                                        keyboardType="numeric"
                                    />
                                </View>

                                <View style={styles.parameterItem}>
                                    <Text style={styles.parameterLabel}>Discount Rate (%)</Text>
                                    <TextInput
                                        style={styles.parameterInput}
                                        value={(scenario.params.discount_rate * 100).toFixed(1)}
                                        onChangeText={(value) => updateScenarioParam(
                                            scenario.id,
                                            'discount_rate',
                                            parseFloat(value) / 100 || 0.10
                                        )}
                                        keyboardType="numeric"
                                    />
                                </View>

                                <View style={styles.parameterItem}>
                                    <Text style={styles.parameterLabel}>Terminal Growth (%)</Text>
                                    <TextInput
                                        style={styles.parameterInput}
                                        value={(scenario.params.terminal_growth_rate * 100).toFixed(1)}
                                        onChangeText={(value) => updateScenarioParam(
                                            scenario.id,
                                            'terminal_growth_rate',
                                            parseFloat(value) / 100 || 0.03
                                        )}
                                        keyboardType="numeric"
                                    />
                                </View>

                                <View style={styles.parameterItem}>
                                    <Text style={styles.parameterLabel}>Years</Text>
                                    <TextInput
                                        style={styles.parameterInput}
                                        value={scenario.params.years_to_project.toString()}
                                        onChangeText={(value) => updateScenarioParam(
                                            scenario.id,
                                            'years_to_project',
                                            parseInt(value) || 5
                                        )}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Results Comparison */}
                {scenarios.some(s => s.result) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Valuation Results</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.comparisonTable}>
                                {/* Header */}
                                <View style={styles.tableRow}>
                                    <View style={styles.metricCell}>
                                        <Text style={styles.tableHeader}>Metric</Text>
                                    </View>
                                    {scenarios.filter(s => s.result).map(scenario => (
                                        <View key={scenario.id} style={styles.scenarioCell}>
                                            <Text style={[styles.tableHeader, { color: scenario.color }]}>
                                                {scenario.name}
                                            </Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Current Price */}
                                <View style={styles.tableRow}>
                                    <View style={styles.metricCell}>
                                        <Text style={styles.tableMetric}>Current Price</Text>
                                    </View>
                                    {scenarios.filter(s => s.result).map(scenario => (
                                        <View key={scenario.id} style={styles.scenarioCell}>
                                            <Text style={styles.tableValue}>
                                                {formatCurrency(scenario.result!.current_price)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Intrinsic Value */}
                                <View style={styles.tableRow}>
                                    <View style={styles.metricCell}>
                                        <Text style={styles.tableMetric}>Intrinsic Value</Text>
                                    </View>
                                    {scenarios.filter(s => s.result).map(scenario => (
                                        <View key={scenario.id} style={styles.scenarioCell}>
                                            <Text style={[styles.tableValue, styles.intrinsicValue]}>
                                                {formatCurrency(scenario.result!.intrinsic_value)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Upside */}
                                <View style={styles.tableRow}>
                                    <View style={styles.metricCell}>
                                        <Text style={styles.tableMetric}>Upside/Downside</Text>
                                    </View>
                                    {scenarios.filter(s => s.result).map(scenario => (
                                        <View key={scenario.id} style={styles.scenarioCell}>
                                            <Text style={[
                                                styles.tableValue,
                                                scenario.result!.upside_percentage >= 0 ?
                                                    styles.positiveUpside : styles.negativeUpside
                                            ]}>
                                                {scenario.result!.upside_percentage.toFixed(1)}%
                                            </Text>
                                        </View>
                                    ))}
                                </View>

                                {/* FCF Margin */}
                                <View style={styles.tableRow}>
                                    <View style={styles.metricCell}>
                                        <Text style={styles.tableMetric}>FCF Margin</Text>
                                    </View>
                                    {scenarios.filter(s => s.result).map(scenario => (
                                        <View key={scenario.id} style={styles.scenarioCell}>
                                            <Text style={styles.tableValue}>
                                                {scenario.result!.fcf_margin.toFixed(1)}%
                                            </Text>
                                        </View>
                                    ))}
                                </View>

                                {/* FCF Yield */}
                                <View style={styles.tableRow}>
                                    <View style={styles.metricCell}>
                                        <Text style={styles.tableMetric}>FCF Yield</Text>
                                    </View>
                                    {scenarios.filter(s => s.result).map(scenario => (
                                        <View key={scenario.id} style={styles.scenarioCell}>
                                            <Text style={styles.tableValue}>
                                                {scenario.result!.fcf_yield.toFixed(1)}%
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                )}

                {/* Detailed FCF Projections */}
                {showDetailedProjections && scenarios.some(s => s.result) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>5-Year FCF Projections</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.projectionTable}>
                                {/* Header */}
                                <View style={styles.tableRow}>
                                    <View style={styles.yearCell}>
                                        <Text style={styles.tableHeader}>Year</Text>
                                    </View>
                                    {scenarios.filter(s => s.result).map(scenario => (
                                        <View key={scenario.id} style={styles.scenarioCell}>
                                            <Text style={[styles.tableHeader, { color: scenario.color }]}>
                                                {scenario.name}
                                            </Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Current FCF */}
                                <View style={styles.tableRow}>
                                    <View style={styles.yearCell}>
                                        <Text style={styles.tableYear}>Current</Text>
                                    </View>
                                    {scenarios.filter(s => s.result).map(scenario => (
                                        <View key={scenario.id} style={styles.scenarioCell}>
                                            <Text style={styles.tableValue}>
                                                {formatCurrency(scenario.result!.current_fcf, true)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Projected years */}
                                {[0, 1, 2, 3, 4].map(yearIndex => (
                                    <View key={yearIndex} style={styles.tableRow}>
                                        <View style={styles.yearCell}>
                                            <Text style={styles.tableYear}>Year {yearIndex + 1}</Text>
                                        </View>
                                        {scenarios.filter(s => s.result).map(scenario => (
                                            <View key={scenario.id} style={styles.scenarioCell}>
                                                <Text style={styles.tableValue}>
                                                    {formatCurrency(scenario.result!.projected_fcf[yearIndex], true)}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                ))}

                                {/* Terminal Value */}
                                <View style={[styles.tableRow, styles.terminalRow]}>
                                    <View style={styles.yearCell}>
                                        <Text style={styles.terminalLabel}>Terminal</Text>
                                    </View>
                                    {scenarios.filter(s => s.result).map(scenario => (
                                        <View key={scenario.id} style={styles.scenarioCell}>
                                            <Text style={styles.terminalValue}>
                                                {formatCurrency(scenario.result!.terminal_value, true)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                )}

                {/* Financial Ratios */}
                {showFinancialRatios && scenarios.some(s => s.result) && templateData && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Financial Ratios Analysis</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.ratiosTable}>
                                {/* Headers */}
                                <View style={styles.tableRow}>
                                    <View style={styles.ratioCell}>
                                        <Text style={styles.tableHeader}>Ratio</Text>
                                    </View>
                                    {scenarios.filter(s => s.result).map(scenario => (
                                        <View key={scenario.id} style={styles.scenarioCell}>
                                            <Text style={[styles.tableHeader, { color: scenario.color }]}>
                                                {scenario.name}
                                            </Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Financial Ratios Rows */}
                                {scenarios.filter(s => s.result).length > 0 && (() => {
                                    const ratioMetrics = [
                                        { key: 'fcf_per_share', label: 'FCF per Share', format: (v: number) => formatCurrency(v) },
                                        { key: 'ev_to_fcf', label: 'EV/FCF', format: (v: number) => v.toFixed(1) + 'x' },
                                        { key: 'price_to_fcf', label: 'P/FCF', format: (v: number) => v.toFixed(1) + 'x' },
                                        { key: 'fcf_growth_rate', label: 'FCF Growth Rate', format: (v: number) => v.toFixed(1) + '%' }
                                    ];

                                    return ratioMetrics.map(metric => (
                                        <View key={metric.key} style={styles.tableRow}>
                                            <View style={styles.ratioCell}>
                                                <Text style={styles.tableMetric}>{metric.label}</Text>
                                            </View>
                                            {scenarios.filter(s => s.result).map(scenario => {
                                                const ratios = calculateFinancialRatios(scenario.result!, templateData);
                                                const value = ratios[metric.key as keyof FinancialRatios];
                                                return (
                                                    <View key={scenario.id} style={styles.scenarioCell}>
                                                        <Text style={styles.tableValue}>
                                                            {metric.format(value)}
                                                        </Text>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    ));
                                })()}
                            </View>
                        </ScrollView>
                    </View>
                )}
            </ScrollView>
        </LinearGradient>
    );
};

const { width } = Dimensions.get('window');
const cellWidth = Math.max(120, width / 5);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    backButton: {
        padding: 5,
    },
    addButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        flex: 1,
        textAlign: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    controlPanel: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    controlRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 15,
    },
    switchContainer: {
        alignItems: 'center',
    },
    switchLabel: {
        fontSize: 14,
        marginBottom: 5,
        color: '#374151',
    },
    runButton: {
        backgroundColor: '#4F46E5',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    importInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        backgroundColor: '#f9fafb',
        minHeight: 120,
        textAlignVertical: 'top',
    },
    importButtonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
    },
    importButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4F46E5',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    importButtonText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 6,
    },
    importSecondaryButton: {
        marginLeft: 10,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
        backgroundColor: '#ffffff',
    },
    importSecondaryButtonText: {
        color: '#374151',
        fontSize: 13,
        fontWeight: '600',
    },
    fileNameText: {
        fontSize: 12,
        color: '#4b5563',
        marginBottom: 8,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    metricCard: {
        width: '48%',
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    metricLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 6,
    },
    metricValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    chartLoading: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    lineChart: {
        marginTop: 10,
        borderRadius: 12,
    },
    noDataText: {
        fontSize: 12,
        color: '#6b7280',
        textAlign: 'center',
        paddingVertical: 12,
    },
    buttonDisabled: {
        backgroundColor: '#9ca3af',
    },
    runButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#1f2937',
    },
    sectionSubtitle: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 12,
        lineHeight: 16,
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
        backgroundColor: '#4F46E5',
    },
    periodButtonText: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '600',
    },
    periodButtonTextActive: {
        color: 'white',
    },
    epsSummaryCard: {
        marginTop: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
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
        color: '#4338ca',
        backgroundColor: '#e0e7ff',
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
    scenarioCard: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        padding: 15,
        marginBottom: 15,
    },
    scenarioHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    scenarioTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    scenarioIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    scenarioName: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    parameterGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    parameterItem: {
        width: '48%',
        marginBottom: 10,
    },
    parameterLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 5,
    },
    parameterInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
        backgroundColor: '#f9fafb',
    },
    comparisonTable: {
        minWidth: width - 40,
    },
    projectionTable: {
        minWidth: width - 40,
    },
    ratiosTable: {
        minWidth: width - 40,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        paddingVertical: 8,
    },
    terminalRow: {
        borderTopWidth: 2,
        borderTopColor: '#4F46E5',
        backgroundColor: '#f8fafc',
    },
    metricCell: {
        width: 120,
        paddingRight: 15,
        justifyContent: 'center',
    },
    scenarioCell: {
        width: cellWidth,
        paddingHorizontal: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    yearCell: {
        width: 80,
        paddingRight: 15,
        justifyContent: 'center',
    },
    ratioCell: {
        width: 140,
        paddingRight: 15,
        justifyContent: 'center',
    },
    tableHeader: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#374151',
        textAlign: 'center',
    },
    tableMetric: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    tableValue: {
        fontSize: 14,
        color: '#1f2937',
        textAlign: 'center',
    },
    tableYear: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    intrinsicValue: {
        fontWeight: '600',
        color: '#059669',
    },
    positiveUpside: {
        color: '#059669',
        fontWeight: '600',
    },
    negativeUpside: {
        color: '#dc2626',
        fontWeight: '600',
    },
    terminalLabel: {
        fontSize: 14,
        color: '#4F46E5',
        fontWeight: 'bold',
    },
    terminalValue: {
        fontSize: 14,
        color: '#4F46E5',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: 'white',
    },
});

export default ScenarioAnalysisScreen;