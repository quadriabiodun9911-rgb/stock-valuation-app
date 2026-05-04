import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { stockAPI } from '../services/api';

interface Props {
    route: any;
    navigation: any;
}

type Tab = 'overview' | 'income' | 'balance' | 'cashflow';
type Period = 'annual' | 'quarterly';

const formatNum = (n: number | null | undefined, compact = true): string => {
    if (n == null) return '—';
    const abs = Math.abs(n);
    if (compact) {
        if (abs >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
        if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
        if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
        if (abs >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
    }
    return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
};

const formatPct = (n: number | null | undefined): string => {
    if (n == null) return '—';
    return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
};

const TrendArrow = ({ value }: { value: number | null | undefined }) => {
    if (value == null) return null;
    const color = value >= 0 ? '#34C759' : '#FF3B30';
    const icon = value >= 0 ? 'arrow-up' : 'arrow-down';
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Ionicons name={icon as any} size={12} color={color} />
            <Text style={{ fontSize: 11, color, fontWeight: '600' }}>
                {Math.abs(value).toFixed(1)}%
            </Text>
        </View>
    );
};

const FinancialStatementsScreen: React.FC<Props> = ({ route, navigation }) => {
    const { symbol } = route.params;
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [period, setPeriod] = useState<Period>('annual');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [period]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await stockAPI.getFinancialStatements(symbol, period);
            setData(result);
        } catch (e: any) {
            setError(e.message || 'Failed to load financials');
        } finally {
            setLoading(false);
        }
    };

    const tabs: { key: Tab; label: string; icon: string }[] = [
        { key: 'overview', label: 'Overview', icon: 'grid' },
        { key: 'income', label: 'Income', icon: 'trending-up' },
        { key: 'balance', label: 'Balance', icon: 'layers' },
        { key: 'cashflow', label: 'Cash Flow', icon: 'water' },
    ];

    const renderMetricRow = (
        label: string,
        values: (number | null | undefined)[],
        isPercent = false,
        highlight = false
    ) => (
        <View
            style={[
                styles.metricRow,
                highlight && { backgroundColor: '#f8f9fa' },
            ]}
        >
            <Text style={[styles.metricLabel, highlight && { fontWeight: '600' }]}>
                {label}
            </Text>
            {values.map((v, i) => (
                <Text
                    key={i}
                    style={[
                        styles.metricValue,
                        v != null && v < 0 && { color: '#FF3B30' },
                    ]}
                >
                    {isPercent ? formatPct(v) : formatNum(v)}
                </Text>
            ))}
        </View>
    );

    const renderDateHeader = (dates: string[]) => (
        <View style={styles.metricRow}>
            <Text style={styles.metricLabel} />
            {dates.map((d, i) => (
                <Text key={i} style={styles.dateHeader}>
                    {period === 'annual' ? d.substring(0, 4) : d.substring(0, 7)}
                </Text>
            ))}
        </View>
    );

    const renderOverview = () => {
        if (!data?.keyMetrics?.length) return <Text style={styles.emptyText}>No data available</Text>;
        const metrics = data.keyMetrics;
        const dates = metrics.map((m: any) => m.date);

        return (
            <View>
                {/* Company header */}
                <View style={styles.companyCard}>
                    <Text style={styles.companyName}>{data.companyName}</Text>
                    <Text style={styles.companyMeta}>
                        {data.sector} · {data.industry}
                    </Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Price</Text>
                        <Text style={styles.priceValue}>
                            ${data.currentPrice?.toFixed(2)}
                        </Text>
                        <Text style={styles.priceLabel}>Market Cap</Text>
                        <Text style={styles.priceValue}>
                            {formatNum(data.marketCap)}
                        </Text>
                    </View>
                </View>

                {/* Key Ratios Trend */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Profitability Trends</Text>
                    {renderDateHeader(dates)}
                    {renderMetricRow('Revenue', metrics.map((m: any) => m.revenue), false, true)}
                    {renderMetricRow('Rev Growth', metrics.map((m: any) => m.revenueGrowth), true)}
                    {renderMetricRow('Gross Margin', metrics.map((m: any) => m.grossMargin), true)}
                    {renderMetricRow('Op Margin', metrics.map((m: any) => m.operatingMargin), true)}
                    {renderMetricRow('Net Margin', metrics.map((m: any) => m.netMargin), true)}
                    {renderMetricRow('ROE', metrics.map((m: any) => m.roe), true)}
                    {renderMetricRow('ROA', metrics.map((m: any) => m.roa), true)}
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Financial Health</Text>
                    {renderDateHeader(dates)}
                    {renderMetricRow('D/E Ratio', metrics.map((m: any) => m.debtToEquity))}
                    {renderMetricRow('Current Ratio', metrics.map((m: any) => m.currentRatio))}
                    {renderMetricRow('FCF', metrics.map((m: any) => m.freeCashFlow), false, true)}
                    {renderMetricRow('FCF Margin', metrics.map((m: any) => m.fcfMargin), true)}
                </View>

                {/* Quick Health Check */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Quick Health Check</Text>
                    {(() => {
                        const latest = metrics[0];
                        const checks = [
                            {
                                label: 'Revenue Growing',
                                pass: latest.revenueGrowth != null && latest.revenueGrowth > 0,
                                value: formatPct(latest.revenueGrowth),
                            },
                            {
                                label: 'Profitable (Net Margin > 0)',
                                pass: latest.netMargin != null && latest.netMargin > 0,
                                value: formatPct(latest.netMargin),
                            },
                            {
                                label: 'Positive Free Cash Flow',
                                pass: latest.freeCashFlow != null && latest.freeCashFlow > 0,
                                value: formatNum(latest.freeCashFlow),
                            },
                            {
                                label: 'Low Debt (D/E < 1.5)',
                                pass: latest.debtToEquity != null && latest.debtToEquity < 1.5,
                                value: latest.debtToEquity?.toFixed(2) ?? '—',
                            },
                            {
                                label: 'Good ROE (> 15%)',
                                pass: latest.roe != null && latest.roe > 15,
                                value: formatPct(latest.roe),
                            },
                            {
                                label: 'Current Ratio > 1',
                                pass: latest.currentRatio != null && latest.currentRatio > 1,
                                value: latest.currentRatio?.toFixed(2) ?? '—',
                            },
                        ];
                        const passed = checks.filter((c) => c.pass).length;
                        return (
                            <View>
                                <Text style={styles.healthScore}>
                                    {passed}/{checks.length} checks passed
                                </Text>
                                {checks.map((c, i) => (
                                    <View key={i} style={styles.checkRow}>
                                        <Ionicons
                                            name={
                                                c.pass
                                                    ? 'checkmark-circle'
                                                    : 'close-circle'
                                            }
                                            size={18}
                                            color={c.pass ? '#34C759' : '#FF3B30'}
                                        />
                                        <Text style={styles.checkLabel}>{c.label}</Text>
                                        <Text
                                            style={[
                                                styles.checkValue,
                                                { color: c.pass ? '#34C759' : '#FF3B30' },
                                            ]}
                                        >
                                            {c.value}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        );
                    })()}
                </View>
            </View>
        );
    };

    const renderIncomeStatement = () => {
        if (!data?.keyMetrics?.length) return <Text style={styles.emptyText}>No data</Text>;
        const metrics = data.keyMetrics;
        const dates = metrics.map((m: any) => m.date);
        const inc = data.incomeStatement || {};

        const getRow = (key: string) => metrics.map((_: any, i: number) => inc[key]?.[dates[i]] ?? null);

        return (
            <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Income Statement</Text>
                {renderDateHeader(dates)}
                {renderMetricRow('Revenue', getRow('Total Revenue'), false, true)}
                {renderMetricRow('Cost of Revenue', getRow('Cost Of Revenue'))}
                {renderMetricRow('Gross Profit', getRow('Gross Profit'), false, true)}
                {renderMetricRow('R&D Expense', getRow('Research And Development'))}
                {renderMetricRow('SG&A', getRow('Selling General And Administration'))}
                {renderMetricRow('Operating Income', getRow('Operating Income'), false, true)}
                {renderMetricRow('Interest Expense', getRow('Interest Expense'))}
                {renderMetricRow('Pretax Income', getRow('Pretax Income'))}
                {renderMetricRow('Tax Provision', getRow('Tax Provision'))}
                {renderMetricRow('Net Income', getRow('Net Income'), false, true)}
                {renderMetricRow('EPS Basic', getRow('Basic EPS'))}
                {renderMetricRow('EPS Diluted', getRow('Diluted EPS'))}
                {renderMetricRow('Shares Outstanding', getRow('Diluted Average Shares'))}

                <View style={styles.marginSection}>
                    <Text style={styles.marginTitle}>Margins</Text>
                    {renderMetricRow('Gross Margin', metrics.map((m: any) => m.grossMargin), true)}
                    {renderMetricRow('Operating Margin', metrics.map((m: any) => m.operatingMargin), true)}
                    {renderMetricRow('Net Margin', metrics.map((m: any) => m.netMargin), true)}
                </View>
            </View>
        );
    };

    const renderBalanceSheet = () => {
        if (!data?.keyMetrics?.length) return <Text style={styles.emptyText}>No data</Text>;
        const metrics = data.keyMetrics;
        const dates = metrics.map((m: any) => m.date);
        const bs = data.balanceSheet || {};

        const getRow = (key: string) => metrics.map((_: any, i: number) => bs[key]?.[dates[i]] ?? null);

        return (
            <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Balance Sheet</Text>
                {renderDateHeader(dates)}

                <Text style={styles.subHeader}>Assets</Text>
                {renderMetricRow('Cash & Equiv', getRow('Cash And Cash Equivalents'))}
                {renderMetricRow('Short-Term Invest', getRow('Other Short Term Investments'))}
                {renderMetricRow('Receivables', getRow('Receivables'))}
                {renderMetricRow('Inventory', getRow('Inventory'))}
                {renderMetricRow('Current Assets', getRow('Current Assets'), false, true)}
                {renderMetricRow('PP&E Net', getRow('Net PPE'))}
                {renderMetricRow('Goodwill', getRow('Goodwill'))}
                {renderMetricRow('Total Assets', getRow('Total Assets'), false, true)}

                <Text style={styles.subHeader}>Liabilities</Text>
                {renderMetricRow('Accounts Payable', getRow('Accounts Payable'))}
                {renderMetricRow('Short-Term Debt', getRow('Current Debt'))}
                {renderMetricRow('Current Liabilities', getRow('Current Liabilities'), false, true)}
                {renderMetricRow('Long-Term Debt', getRow('Long Term Debt'))}
                {renderMetricRow('Total Liabilities', getRow('Total Liabilities Net Minority Interest'), false, true)}

                <Text style={styles.subHeader}>Equity</Text>
                {renderMetricRow('Common Stock', getRow('Common Stock'))}
                {renderMetricRow('Retained Earnings', getRow('Retained Earnings'))}
                {renderMetricRow('Total Equity', getRow('Stockholders Equity'), false, true)}

                <View style={styles.marginSection}>
                    <Text style={styles.marginTitle}>Ratios</Text>
                    {renderMetricRow('D/E Ratio', metrics.map((m: any) => m.debtToEquity))}
                    {renderMetricRow('Current Ratio', metrics.map((m: any) => m.currentRatio))}
                    {renderMetricRow('ROA', metrics.map((m: any) => m.roa), true)}
                    {renderMetricRow('ROE', metrics.map((m: any) => m.roe), true)}
                </View>
            </View>
        );
    };

    const renderCashFlowStatement = () => {
        if (!data?.keyMetrics?.length) return <Text style={styles.emptyText}>No data</Text>;
        const metrics = data.keyMetrics;
        const dates = metrics.map((m: any) => m.date);
        const cf = data.cashFlowStatement || {};

        const getRow = (key: string) => metrics.map((_: any, i: number) => cf[key]?.[dates[i]] ?? null);

        return (
            <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Cash Flow Statement</Text>
                {renderDateHeader(dates)}

                <Text style={styles.subHeader}>Operating Activities</Text>
                {renderMetricRow('Net Income', getRow('Net Income'))}
                {renderMetricRow('Depreciation', getRow('Depreciation And Amortization'))}
                {renderMetricRow('Stock-Based Comp', getRow('Stock Based Compensation'))}
                {renderMetricRow('Chg Working Cap', getRow('Change In Working Capital'))}
                {renderMetricRow('Operating CF', getRow('Operating Cash Flow'), false, true)}

                <Text style={styles.subHeader}>Investing Activities</Text>
                {renderMetricRow('Capex', getRow('Capital Expenditure'))}
                {renderMetricRow('Acquisitions', getRow('Net Business Purchase And Sale'))}
                {renderMetricRow('Invest in Securities', getRow('Purchase Of Investment'))}
                {renderMetricRow('Investing CF', getRow('Investing Cash Flow'), false, true)}

                <Text style={styles.subHeader}>Financing Activities</Text>
                {renderMetricRow('Debt Issued', getRow('Issuance Of Debt'))}
                {renderMetricRow('Debt Repaid', getRow('Repayment Of Debt'))}
                {renderMetricRow('Buybacks', getRow('Repurchase Of Capital Stock'))}
                {renderMetricRow('Dividends', getRow('Common Stock Dividend Paid'))}
                {renderMetricRow('Financing CF', getRow('Financing Cash Flow'), false, true)}

                <View style={styles.marginSection}>
                    <Text style={styles.marginTitle}>Free Cash Flow</Text>
                    {renderMetricRow('FCF', metrics.map((m: any) => m.freeCashFlow), false, true)}
                    {renderMetricRow('FCF Margin', metrics.map((m: any) => m.fcfMargin), true)}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#1a365d', '#2563eb']}
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
                <Text style={styles.headerTitle}>{symbol} Financials</Text>
                <Text style={styles.headerSub}>
                    {data?.companyName ?? ''} · {data?.currency ?? 'USD'}
                </Text>
            </LinearGradient>

            {/* Period Toggle */}
            <View style={styles.periodToggle}>
                {(['annual', 'quarterly'] as Period[]).map((p) => (
                    <TouchableOpacity
                        key={p}
                        style={[
                            styles.periodBtn,
                            period === p && styles.periodBtnActive,
                        ]}
                        onPress={() => setPeriod(p)}
                    >
                        <Text
                            style={[
                                styles.periodText,
                                period === p && styles.periodTextActive,
                            ]}
                        >
                            {p === 'annual' ? 'Annual' : 'Quarterly'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
                {tabs.map((t) => (
                    <TouchableOpacity
                        key={t.key}
                        style={[
                            styles.tab,
                            activeTab === t.key && styles.tabActive,
                        ]}
                        onPress={() => setActiveTab(t.key)}
                    >
                        <Ionicons
                            name={t.icon as any}
                            size={16}
                            color={activeTab === t.key ? '#2563eb' : '#999'}
                        />
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === t.key && styles.tabTextActive,
                            ]}
                        >
                            {t.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={styles.loadingText}>Loading financials...</Text>
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={48} color="#FF3B30" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    horizontal={false}
                >
                    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                        <View style={styles.tableContainer}>
                            {activeTab === 'overview' && renderOverview()}
                            {activeTab === 'income' && renderIncomeStatement()}
                            {activeTab === 'balance' && renderBalanceSheet()}
                            {activeTab === 'cashflow' && renderCashFlowStatement()}
                        </View>
                    </ScrollView>
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: { paddingHorizontal: 16, paddingVertical: 16, paddingTop: 50 },
    backButton: { marginBottom: 8 },
    headerTitle: { fontSize: 22, fontWeight: '700', color: 'white' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    periodToggle: {
        flexDirection: 'row',
        margin: 16,
        marginBottom: 0,
        backgroundColor: '#e5e7eb',
        borderRadius: 8,
        padding: 3,
    },
    periodBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    periodBtnActive: { backgroundColor: 'white' },
    periodText: { fontSize: 13, fontWeight: '500', color: '#666' },
    periodTextActive: { color: '#2563eb', fontWeight: '600' },
    tabBar: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
        gap: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    tabActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#2563eb',
    },
    tabText: { fontSize: 12, color: '#666', fontWeight: '500' },
    tabTextActive: { color: '#2563eb', fontWeight: '600' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    loadingText: { marginTop: 12, color: '#666', fontSize: 14 },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    errorText: { marginTop: 12, color: '#FF3B30', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
    retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#2563eb', borderRadius: 8 },
    retryText: { color: 'white', fontWeight: '600' },
    tableContainer: { minWidth: 500, paddingBottom: 20 },
    companyCard: {
        margin: 16,
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    companyName: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
    companyMeta: { fontSize: 13, color: '#666', marginTop: 4 },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 12,
    },
    priceLabel: { fontSize: 12, color: '#999' },
    priceValue: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
    sectionCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 12,
    },
    metricRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 4,
        borderBottomWidth: 0.5,
        borderBottomColor: '#f0f0f0',
    },
    metricLabel: {
        width: 120,
        fontSize: 12,
        color: '#555',
    },
    metricValue: {
        width: 90,
        fontSize: 12,
        fontWeight: '500',
        color: '#1a1a1a',
        textAlign: 'right',
    },
    dateHeader: {
        width: 90,
        fontSize: 11,
        fontWeight: '700',
        color: '#2563eb',
        textAlign: 'right',
    },
    subHeader: {
        fontSize: 13,
        fontWeight: '600',
        color: '#2563eb',
        marginTop: 12,
        marginBottom: 4,
    },
    marginSection: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    marginTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        padding: 40,
    },
    healthScore: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 12,
    },
    checkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        gap: 8,
    },
    checkLabel: { flex: 1, fontSize: 13, color: '#555' },
    checkValue: { fontSize: 13, fontWeight: '600', minWidth: 60, textAlign: 'right' },
});

export default FinancialStatementsScreen;
