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
    Switch
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StockValuationAPI, UserFinancialData, FCFResult, FCFValuationParams } from '../services/api';

interface FCFValuationScreenProps {
    route: {
        params: {
            symbol: string;
        };
    };
    navigation: any;
}

interface FormData extends UserFinancialData {
    years_to_project: number;
    growth_rate: number;
    discount_rate: number;
    terminal_growth_rate: number;
}

const FCFValuationScreen: React.FC<FCFValuationScreenProps> = ({ route, navigation }) => {
    const { symbol } = route.params;
    const [loading, setLoading] = useState(false);
    const [loadingTemplate, setLoadingTemplate] = useState(true);
    const [useCustomData, setUseCustomData] = useState(false);
    const [importText, setImportText] = useState('');
    const [importCsvText, setImportCsvText] = useState('');
    const [excelFileName, setExcelFileName] = useState<string | null>(null);
    const [fieldDescriptions, setFieldDescriptions] = useState<Record<string, string>>({});
    const [formData, setFormData] = useState<FormData>({
        symbol,
        years_to_project: 5,
        growth_rate: 0.05,
        discount_rate: 0.10,
        terminal_growth_rate: 0.03
    });
    const [result, setResult] = useState<FCFResult | null>(null);
    const [originalData, setOriginalData] = useState<UserFinancialData | null>(null);
    const api = new StockValuationAPI();

    useEffect(() => {
        loadFinancialTemplate();
    }, []);

    const loadFinancialTemplate = async () => {
        try {
            setLoadingTemplate(true);
            const templateResponse = await api.getFinancialTemplate(symbol);
            const template = templateResponse.template;
            const description = templateResponse.description || {};

            setOriginalData(template);
            setFieldDescriptions(description);
            setFormData(prev => ({
                ...prev,
                ...template,
                symbol
            }));
        } catch (error) {
            console.error('Error loading template:', error);
            Alert.alert('Error', 'Failed to load financial data template');
        } finally {
            setLoadingTemplate(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        const numValue = parseFloat(value) || undefined;
        setFormData(prev => ({
            ...prev,
            [field]: numValue
        }));
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

    const mapNormalizedToFinancialData = (normalized: Record<string, unknown>): UserFinancialData => {
        const getValue = (keys: string[]) => {
            for (const key of keys) {
                const value = normalized[normalizeKey(key)];
                if (value !== undefined) {
                    return value;
                }
            }
            return undefined;
        };

        return {
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
                ...mapNormalizedToFinancialData(normalized)
            };

            setUseCustomData(true);
            setFormData(prev => ({
                ...prev,
                ...imported,
                symbol
            }));
            setImportText('');
            Alert.alert('Import Success', 'Financial data has been applied.');
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
                ...mapNormalizedToFinancialData(normalized)
            };

            setUseCustomData(true);
            setFormData(prev => ({
                ...prev,
                ...imported,
                symbol
            }));
            setImportCsvText('');
            Alert.alert('Import Success', 'CSV data has been applied.');
        } catch (error) {
            console.error('CSV import error:', error);
            Alert.alert('Import Error', 'Invalid CSV. Please check the header and values.');
        }
    };

    const importFromExcel = async () => {
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

            const imported = mapNormalizedToFinancialData(normalized);

            setUseCustomData(true);
            setFormData(prev => ({
                ...prev,
                ...imported,
                symbol
            }));
            Alert.alert('Import Success', 'CSV file data has been applied.');
        } catch (error) {
            console.error('CSV file import error:', error);
            Alert.alert('Import Error', 'Failed to import CSV file.');
        }
    };

    const renderFieldDescription = (field: string) => {
        const description = fieldDescriptions[field];
        if (!description) return null;
        return <Text style={styles.inputDescription}>{description}</Text>;
    };

    const formatCurrency = (value?: number) => {
        if (!value) return '';
        if (Math.abs(value) >= 1e9) {
            return `$${(value / 1e9).toFixed(2)}B`;
        } else if (Math.abs(value) >= 1e6) {
            return `$${(value / 1e6).toFixed(2)}M`;
        } else if (Math.abs(value) >= 1e3) {
            return `$${(value / 1e3).toFixed(2)}K`;
        }
        return `$${value.toFixed(2)}`;
    };

    const calculateValuation = async () => {
        try {
            setLoading(true);

            const params: FCFValuationParams = {
                symbol,
                years_to_project: formData.years_to_project,
                growth_rate: formData.growth_rate,
                discount_rate: formData.discount_rate,
                terminal_growth_rate: formData.terminal_growth_rate,
                use_custom_data: useCustomData,
                custom_data: useCustomData ? {
                    symbol,
                    revenue: formData.revenue,
                    operating_income: formData.operating_income,
                    net_income: formData.net_income,
                    total_assets: formData.total_assets,
                    total_debt: formData.total_debt,
                    cash_and_equivalents: formData.cash_and_equivalents,
                    shares_outstanding: formData.shares_outstanding,
                    capex: formData.capex,
                    working_capital_change: formData.working_capital_change,
                    tax_rate: formData.tax_rate,
                    depreciation: formData.depreciation
                } : undefined
            };

            const valuationResult = await api.calculateFCFValuation(params);
            setResult(valuationResult);
        } catch (error) {
            console.error('Error calculating FCF valuation:', error);
            Alert.alert('Error', 'Failed to calculate valuation');
        } finally {
            setLoading(false);
        }
    };

    const resetToOriginal = () => {
        if (originalData) {
            setFormData(prev => ({
                ...prev,
                ...originalData,
                symbol
            }));
        }
    };

    if (loadingTemplate) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.loadingText}>Loading financial data...</Text>
            </View>
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
                <Text style={styles.headerTitle}>FCF Valuation - {symbol}</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Assumptions Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Valuation Assumptions</Text>

                    <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Years to Project</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.years_to_project?.toString()}
                            onChangeText={(value) => handleInputChange('years_to_project', value)}
                            keyboardType="numeric"
                            placeholder="5"
                        />
                    </View>

                    <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Growth Rate (%)</Text>
                        <TextInput
                            style={styles.input}
                            value={(formData.growth_rate * 100).toString()}
                            onChangeText={(value) => handleInputChange('growth_rate', (parseFloat(value) / 100).toString())}
                            keyboardType="numeric"
                            placeholder="5"
                        />
                    </View>

                    <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Discount Rate (%)</Text>
                        <TextInput
                            style={styles.input}
                            value={(formData.discount_rate * 100).toString()}
                            onChangeText={(value) => handleInputChange('discount_rate', (parseFloat(value) / 100).toString())}
                            keyboardType="numeric"
                            placeholder="10"
                        />
                    </View>

                    <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Terminal Growth (%)</Text>
                        <TextInput
                            style={styles.input}
                            value={(formData.terminal_growth_rate * 100).toString()}
                            onChangeText={(value) => handleInputChange('terminal_growth_rate', (parseFloat(value) / 100).toString())}
                            keyboardType="numeric"
                            placeholder="3"
                        />
                    </View>
                </View>

                {/* Custom Data Toggle */}
                <View style={styles.section}>
                    <View style={styles.switchRow}>
                        <Text style={styles.sectionTitle}>Use Custom Financial Data</Text>
                        <Switch
                            value={useCustomData}
                            onValueChange={setUseCustomData}
                            trackColor={{ false: '#767577', true: '#4F46E5' }}
                            thumbColor={useCustomData ? '#f5dd4b' : '#f4f3f4'}
                        />
                    </View>
                </View>

                {/* Import Data Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Import Financial Data (JSON)</Text>
                    <Text style={styles.sectionSubtitle}>
                        Paste JSON with fields like revenue, operating_income, net_income, total_assets, total_debt,
                        cash_and_equivalents, shares_outstanding, capex, working_capital_change, tax_rate, depreciation.
                    </Text>
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
                    <TouchableOpacity onPress={resetToOriginal} style={styles.resetButtonFull}>
                        <Text style={styles.resetButtonText}>Use Template Data</Text>
                    </TouchableOpacity>
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
                        <TouchableOpacity style={styles.importButton} onPress={importFromExcel}>
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

                {/* Financial Data Section */}
                {useCustomData && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Financial Data</Text>
                            <TouchableOpacity onPress={resetToOriginal} style={styles.resetButton}>
                                <Text style={styles.resetButtonText}>Reset to Original</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputRow}>
                            <View style={styles.inputLabelContainer}>
                                <Text style={styles.inputLabel}>Revenue</Text>
                                {renderFieldDescription('revenue')}
                            </View>
                            <TextInput
                                style={styles.input}
                                value={formData.revenue?.toString()}
                                onChangeText={(value) => handleInputChange('revenue', value)}
                                keyboardType="numeric"
                                placeholder="Enter revenue"
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <View style={styles.inputLabelContainer}>
                                <Text style={styles.inputLabel}>Operating Income</Text>
                                {renderFieldDescription('operating_income')}
                            </View>
                            <TextInput
                                style={styles.input}
                                value={formData.operating_income?.toString()}
                                onChangeText={(value) => handleInputChange('operating_income', value)}
                                keyboardType="numeric"
                                placeholder="Enter operating income"
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <View style={styles.inputLabelContainer}>
                                <Text style={styles.inputLabel}>Net Income</Text>
                                {renderFieldDescription('net_income')}
                            </View>
                            <TextInput
                                style={styles.input}
                                value={formData.net_income?.toString()}
                                onChangeText={(value) => handleInputChange('net_income', value)}
                                keyboardType="numeric"
                                placeholder="Enter net income"
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <View style={styles.inputLabelContainer}>
                                <Text style={styles.inputLabel}>Total Assets</Text>
                                {renderFieldDescription('total_assets')}
                            </View>
                            <TextInput
                                style={styles.input}
                                value={formData.total_assets?.toString()}
                                onChangeText={(value) => handleInputChange('total_assets', value)}
                                keyboardType="numeric"
                                placeholder="Enter total assets"
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <View style={styles.inputLabelContainer}>
                                <Text style={styles.inputLabel}>Total Debt</Text>
                                {renderFieldDescription('total_debt')}
                            </View>
                            <TextInput
                                style={styles.input}
                                value={formData.total_debt?.toString()}
                                onChangeText={(value) => handleInputChange('total_debt', value)}
                                keyboardType="numeric"
                                placeholder="Enter total debt"
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <View style={styles.inputLabelContainer}>
                                <Text style={styles.inputLabel}>Cash & Equivalents</Text>
                                {renderFieldDescription('cash_and_equivalents')}
                            </View>
                            <TextInput
                                style={styles.input}
                                value={formData.cash_and_equivalents?.toString()}
                                onChangeText={(value) => handleInputChange('cash_and_equivalents', value)}
                                keyboardType="numeric"
                                placeholder="Enter cash"
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <View style={styles.inputLabelContainer}>
                                <Text style={styles.inputLabel}>Shares Outstanding</Text>
                                {renderFieldDescription('shares_outstanding')}
                            </View>
                            <TextInput
                                style={styles.input}
                                value={formData.shares_outstanding?.toString()}
                                onChangeText={(value) => handleInputChange('shares_outstanding', value)}
                                keyboardType="numeric"
                                placeholder="Enter shares"
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <View style={styles.inputLabelContainer}>
                                <Text style={styles.inputLabel}>CapEx (negative)</Text>
                                {renderFieldDescription('capex')}
                            </View>
                            <TextInput
                                style={styles.input}
                                value={formData.capex?.toString()}
                                onChangeText={(value) => handleInputChange('capex', value)}
                                keyboardType="numeric"
                                placeholder="Enter CapEx"
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <View style={styles.inputLabelContainer}>
                                <Text style={styles.inputLabel}>Working Capital Change</Text>
                                {renderFieldDescription('working_capital_change')}
                            </View>
                            <TextInput
                                style={styles.input}
                                value={formData.working_capital_change?.toString()}
                                onChangeText={(value) => handleInputChange('working_capital_change', value)}
                                keyboardType="numeric"
                                placeholder="Enter change in working capital"
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <View style={styles.inputLabelContainer}>
                                <Text style={styles.inputLabel}>Tax Rate (%)</Text>
                                {renderFieldDescription('tax_rate')}
                            </View>
                            <TextInput
                                style={styles.input}
                                value={formData.tax_rate ? (formData.tax_rate * 100).toString() : ''}
                                onChangeText={(value) => handleInputChange('tax_rate', (parseFloat(value) / 100).toString())}
                                keyboardType="numeric"
                                placeholder="Enter tax rate"
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <View style={styles.inputLabelContainer}>
                                <Text style={styles.inputLabel}>Depreciation</Text>
                                {renderFieldDescription('depreciation')}
                            </View>
                            <TextInput
                                style={styles.input}
                                value={formData.depreciation?.toString()}
                                onChangeText={(value) => handleInputChange('depreciation', value)}
                                keyboardType="numeric"
                                placeholder="Enter depreciation"
                            />
                        </View>
                    </View>
                )}

                {/* Calculate Button */}
                <TouchableOpacity
                    style={[styles.calculateButton, loading && styles.buttonDisabled]}
                    onPress={calculateValuation}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Ionicons name="calculator" size={20} color="white" />
                            <Text style={styles.calculateButtonText}>Calculate FCF Valuation</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Results Section */}
                {result && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Valuation Results</Text>

                        <View style={styles.resultCard}>
                            <View style={styles.resultRow}>
                                <Text style={styles.resultLabel}>Current Price:</Text>
                                <Text style={styles.resultValue}>{formatCurrency(result.current_price)}</Text>
                            </View>

                            <View style={styles.resultRow}>
                                <Text style={styles.resultLabel}>Intrinsic Value:</Text>
                                <Text style={[styles.resultValue, styles.intrinsicValue]}>
                                    {formatCurrency(result.intrinsic_value)}
                                </Text>
                            </View>

                            <View style={styles.resultRow}>
                                <Text style={styles.resultLabel}>Upside/Downside:</Text>
                                <Text style={[
                                    styles.resultValue,
                                    result.upside_percentage >= 0 ? styles.positiveUpside : styles.negativeUpside
                                ]}>
                                    {result.upside_percentage.toFixed(1)}%
                                </Text>
                            </View>

                            <View style={styles.resultRow}>
                                <Text style={styles.resultLabel}>FCF Margin:</Text>
                                <Text style={styles.resultValue}>{result.fcf_margin.toFixed(1)}%</Text>
                            </View>

                            <View style={styles.resultRow}>
                                <Text style={styles.resultLabel}>FCF Yield:</Text>
                                <Text style={styles.resultValue}>{result.fcf_yield.toFixed(1)}%</Text>
                            </View>

                            <View style={styles.resultRow}>
                                <Text style={styles.resultLabel}>Confidence Level:</Text>
                                <Text style={[styles.resultValue, styles.confidenceLevel]}>
                                    {result.confidence_level}
                                </Text>
                            </View>

                            <View style={styles.resultRow}>
                                <Text style={styles.resultLabel}>Data Source:</Text>
                                <Text style={styles.resultValue}>
                                    {result.data_source === 'custom' ? 'Custom Data' : 'Yahoo Finance'}
                                </Text>
                            </View>
                        </View>

                        {/* FCF Projection */}
                        <View style={styles.projectionCard}>
                            <Text style={styles.projectionTitle}>Free Cash Flow Projection</Text>
                            {result.projected_fcf.map((fcf, index) => (
                                <View key={index} style={styles.projectionRow}>
                                    <Text style={styles.projectionYear}>Year {index + 1}:</Text>
                                    <Text style={styles.projectionValue}>{formatCurrency(fcf)}</Text>
                                </View>
                            ))}
                            <View style={styles.projectionRow}>
                                <Text style={[styles.projectionYear, styles.terminalValue]}>Terminal Value:</Text>
                                <Text style={[styles.projectionValue, styles.terminalValue]}>
                                    {formatCurrency(result.terminal_value)}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>
        </LinearGradient>
    );
};

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
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
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
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    inputRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    inputLabelContainer: {
        flex: 1,
        marginRight: 8,
    },
    inputLabel: {
        fontSize: 14,
        color: '#374151',
    },
    inputDescription: {
        fontSize: 11,
        color: '#9ca3af',
        marginTop: 2,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginLeft: 10,
        fontSize: 14,
        backgroundColor: '#f9fafb',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    resetButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#6b7280',
        borderRadius: 6,
    },
    resetButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    resetButtonFull: {
        marginTop: 10,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#6b7280',
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
    calculateButton: {
        backgroundColor: '#4F46E5',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 12,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonDisabled: {
        backgroundColor: '#9ca3af',
    },
    calculateButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    resultCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        padding: 15,
        marginBottom: 15,
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5,
    },
    resultLabel: {
        fontSize: 14,
        color: '#374151',
        flex: 1,
    },
    resultValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        textAlign: 'right',
    },
    intrinsicValue: {
        fontSize: 16,
        color: '#059669',
    },
    positiveUpside: {
        color: '#059669',
    },
    negativeUpside: {
        color: '#dc2626',
    },
    confidenceLevel: {
        color: '#4F46E5',
    },
    projectionCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        padding: 15,
    },
    projectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#1f2937',
    },
    projectionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
    },
    projectionYear: {
        fontSize: 14,
        color: '#374151',
    },
    projectionValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    terminalValue: {
        color: '#4F46E5',
        fontWeight: 'bold',
        marginTop: 5,
        paddingTop: 5,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: 'white',
    },
});

export default FCFValuationScreen;