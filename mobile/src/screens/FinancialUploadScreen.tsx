import React, { useCallback, useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput,
    TouchableOpacity, ActivityIndicator, Alert, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import {
    stockAPI,
    FinancialUploadResult,
    FinancialUploadSummary,
    GrowthMetric,
    DCFUploadResult,
} from '../services/api';

interface Props { navigation: any; }

/* ── Helpers ────────────────────────────────────────── */
const fmt = (n: number | null | undefined) => {
    if (n == null) return '—';
    if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
};
const pct = (n: number | null | undefined) => (n != null ? `${n >= 0 ? '+' : ''}${n.toFixed(2)}%` : '—');
const clr = (n: number | null | undefined) => (n != null && n >= 0 ? '#16a34a' : '#dc2626');

const METRIC_LABELS: Record<string, string> = {
    revenue: 'Revenue',
    net_income: 'Net Income',
    free_cash_flow: 'Free Cash Flow',
    operating_income: 'Operating Income',
    total_assets: 'Total Assets',
    total_equity: 'Total Equity',
};

/* ── Main Component ─────────────────────────────────── */
const FinancialUploadScreen: React.FC<Props> = ({ navigation }) => {
    // upload form state
    const [companyName, setCompanyName] = useState('');
    const [symbol, setSymbol] = useState('');
    const [discountRate, setDiscountRate] = useState('10');
    const [terminalGrowth, setTerminalGrowth] = useState('3');
    const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
    const [uploading, setUploading] = useState(false);

    // result state
    const [result, setResult] = useState<FinancialUploadResult | null>(null);

    // history state
    const [uploads, setUploads] = useState<FinancialUploadSummary[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [tab, setTab] = useState<'upload' | 'history'>('upload');

    useEffect(() => { if (tab === 'history') loadHistory(); }, [tab]);

    const loadHistory = useCallback(async () => {
        try {
            setLoadingHistory(true);
            const { uploads: list } = await stockAPI.getFinancialUploads();
            setUploads(list);
        } catch { /* ignore */ } finally { setLoadingHistory(false); }
    }, []);

    /* ── Pick File ────────────────────────────────────── */
    const pickFile = async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
                copyToCacheDirectory: true,
            });
            if (!res.canceled && res.assets?.length) {
                setSelectedFile(res.assets[0]);
            }
        } catch {
            Alert.alert('Error', 'Could not pick file');
        }
    };

    /* ── Upload ───────────────────────────────────────── */
    const handleUpload = async () => {
        if (!selectedFile) return Alert.alert('Select a file', 'Please pick a CSV financial statement first.');
        if (!companyName.trim()) return Alert.alert('Company name', 'Please enter the company name.');
        try {
            setUploading(true);
            const data = await stockAPI.uploadFinancialStatement(
                selectedFile.uri,
                selectedFile.name || 'statement.csv',
                companyName.trim(),
                symbol.trim(),
                parseFloat(discountRate) / 100 || 0.10,
                parseFloat(terminalGrowth) / 100 || 0.03,
            );
            setResult(data);
        } catch (err: any) {
            Alert.alert('Upload Failed', err.message || 'Something went wrong');
        } finally {
            setUploading(false);
        }
    };

    /* ── Reset ────────────────────────────────────────── */
    const reset = () => {
        setResult(null);
        setSelectedFile(null);
        setCompanyName('');
        setSymbol('');
    };

    /* ── Render ────────────────────────────────────────── */
    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient colors={['#0f172a', '#1e3a5f']} style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Financial Analysis</Text>
                    <Text style={styles.headerSub}>Upload statements for DCF & growth</Text>
                </View>
            </LinearGradient>

            {/* Tabs */}
            <View style={styles.tabs}>
                {(['upload', 'history'] as const).map((t) => (
                    <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
                        <Ionicons name={t === 'upload' ? 'cloud-upload' : 'time'} size={16}
                            color={tab === t ? '#2563eb' : '#94a3b8'} />
                        <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                            {t === 'upload' ? 'Upload' : 'History'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {tab === 'upload' ? (
                <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 40 }}>
                    {result ? <ResultView result={result} onReset={reset} /> : (
                        <>
                            {/* File Picker */}
                            <TouchableOpacity style={styles.filePicker} onPress={pickFile}>
                                <Ionicons name={selectedFile ? 'document-text' : 'cloud-upload-outline'} size={40}
                                    color={selectedFile ? '#2563eb' : '#94a3b8'} />
                                <Text style={styles.filePickerText}>
                                    {selectedFile ? selectedFile.name : 'Tap to select a CSV file'}
                                </Text>
                                {selectedFile && <Text style={styles.fileSize}>
                                    {((selectedFile.size || 0) / 1024).toFixed(1)} KB
                                </Text>}
                            </TouchableOpacity>

                            {/* Form */}
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Company Details</Text>
                                <Text style={styles.label}>Company Name *</Text>
                                <TextInput style={styles.input} value={companyName}
                                    onChangeText={setCompanyName} placeholder="e.g. Apple Inc." />

                                <Text style={styles.label}>Ticker Symbol (optional)</Text>
                                <TextInput style={styles.input} value={symbol}
                                    onChangeText={setSymbol} placeholder="e.g. AAPL"
                                    autoCapitalize="characters" />

                                <View style={styles.row}>
                                    <View style={styles.halfInput}>
                                        <Text style={styles.label}>Discount Rate (%)</Text>
                                        <TextInput style={styles.input} value={discountRate}
                                            onChangeText={setDiscountRate} keyboardType="numeric" />
                                    </View>
                                    <View style={styles.halfInput}>
                                        <Text style={styles.label}>Terminal Growth (%)</Text>
                                        <TextInput style={styles.input} value={terminalGrowth}
                                            onChangeText={setTerminalGrowth} keyboardType="numeric" />
                                    </View>
                                </View>
                            </View>

                            {/* CSV Format Guide */}
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>CSV Format Guide</Text>
                                <Text style={styles.guideText}>
                                    Include columns like: Revenue, Net Income, Free Cash Flow, Operating Cash Flow,
                                    CapEx, Total Debt, Cash, Shares Outstanding
                                </Text>
                                <View style={styles.codeBlock}>
                                    <Text style={styles.codeText}>
                                        {'Metric,2021,2022,2023,2024\nRevenue,274500,394330,383280,391000\nNet Income,94680,99800,97000,105000\nFree Cash Flow,92950,111440,110500,118000'}
                                    </Text>
                                </View>
                            </View>

                            {/* Upload Button */}
                            <TouchableOpacity
                                style={[styles.uploadBtn, (!selectedFile || uploading) && styles.uploadBtnDisabled]}
                                onPress={handleUpload} disabled={!selectedFile || uploading}
                            >
                                {uploading ? <ActivityIndicator color="#fff" /> : (
                                    <>
                                        <Ionicons name="analytics" size={20} color="#fff" />
                                        <Text style={styles.uploadBtnText}>Analyze Financial Statement</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            ) : (
                /* History Tab */
                <View style={styles.body}>
                    {loadingHistory ? (
                        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
                    ) : uploads.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No uploads yet</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={uploads}
                            keyExtractor={(item) => String(item.id)}
                            contentContainerStyle={{ paddingBottom: 40 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.historyCard}
                                    onPress={() => navigation.navigate('FinancialUploadDetail', { uploadId: item.id })}
                                >
                                    <View style={styles.historyLeft}>
                                        <Text style={styles.historyCompany}>{item.company_name}</Text>
                                        {item.symbol && <Text style={styles.historySymbol}>{item.symbol}</Text>}
                                        <Text style={styles.historyDate}>
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <View style={styles.historyBadges}>
                                        {item.has_dcf && (
                                            <View style={[styles.badge, { backgroundColor: '#dbeafe' }]}>
                                                <Text style={[styles.badgeText, { color: '#2563eb' }]}>DCF</Text>
                                            </View>
                                        )}
                                        {item.has_growth && (
                                            <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
                                                <Text style={[styles.badgeText, { color: '#16a34a' }]}>Growth</Text>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>
            )}
        </View>
    );
};

/* ── Result Sub-Component ──────────────────────────── */
const ResultView: React.FC<{ result: FinancialUploadResult; onReset: () => void }> = ({ result, onReset }) => {
    const { dcf, growth } = result;
    const hasError = 'error' in dcf && dcf.error;

    return (
        <>
            {/* Company header */}
            <View style={styles.card}>
                <View style={styles.resultHeader}>
                    <View>
                        <Text style={styles.resultCompany}>{result.company_name}</Text>
                        {result.symbol ? <Text style={styles.resultSymbol}>{result.symbol}</Text> : null}
                    </View>
                    <TouchableOpacity onPress={onReset} style={styles.newUploadBtn}>
                        <Ionicons name="add-circle" size={18} color="#2563eb" />
                        <Text style={{ color: '#2563eb', fontWeight: '600', marginLeft: 4 }}>New</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* DCF Valuation */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>DCF Valuation</Text>
                {hasError ? (
                    <View style={styles.errorBox}>
                        <Ionicons name="warning" size={20} color="#f59e0b" />
                        <Text style={styles.errorText}>{dcf.error}</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.metricsGrid}>
                            <MetricBox label="Enterprise Value" value={fmt(dcf.enterprise_value)} />
                            <MetricBox label="Equity Value" value={fmt(dcf.equity_value)} />
                            <MetricBox label="Intrinsic / Share" value={dcf.intrinsic_value_per_share ? fmt(dcf.intrinsic_value_per_share) : '—'} />
                            <MetricBox label="Current FCF" value={fmt(dcf.current_fcf)} />
                            <MetricBox label="Implied Growth" value={pct(dcf.implied_growth_rate)} color={clr(dcf.implied_growth_rate)} />
                            <MetricBox label="Terminal Value" value={fmt(dcf.terminal_value)} />
                        </View>

                        {/* Projected FCF */}
                        <Text style={styles.subTitle}>Projected Free Cash Flow</Text>
                        <View style={styles.projectionRow}>
                            {dcf.projected_fcf.map((v: number, i: number) => (
                                <View key={i} style={styles.projectionItem}>
                                    <Text style={styles.projYearLabel}>Y{i + 1}</Text>
                                    <Text style={styles.projValue}>{fmt(v)}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.assumptions}>
                            <Text style={styles.assumptionText}>
                                Discount Rate: {((dcf.assumptions?.discount_rate || 0.1) * 100).toFixed(1)}%
                                {' · '}Terminal Growth: {((dcf.assumptions?.terminal_growth_rate || 0.03) * 100).toFixed(1)}%
                            </Text>
                        </View>
                    </>
                )}
            </View>

            {/* Growth Analysis */}
            {Object.keys(growth).length > 0 && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Growth Performance</Text>
                    {Object.entries(growth).map(([key, g]) => (
                        <GrowthRow key={key} label={METRIC_LABELS[key] || key} data={g} />
                    ))}
                </View>
            )}
        </>
    );
};

/* ── Small Sub-Components ─────────────────────────── */
const MetricBox: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
    <View style={styles.metricBox}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, color ? { color } : null]}>{value}</Text>
    </View>
);

const GrowthRow: React.FC<{ label: string; data: GrowthMetric }> = ({ label, data }) => (
    <View style={styles.growthRow}>
        <View style={styles.growthHeader}>
            <Text style={styles.growthLabel}>{label}</Text>
            {data.cagr_pct != null && (
                <Text style={[styles.growthCagr, { color: clr(data.cagr_pct) }]}>
                    CAGR {pct(data.cagr_pct)}
                </Text>
            )}
        </View>
        <Text style={styles.growthLatest}>Latest: {fmt(data.latest)}</Text>
        {data.yoy_growth_pct.length > 0 && (
            <View style={styles.yoyRow}>
                {data.yoy_growth_pct.map((g, i) => (
                    <View key={i} style={[styles.yoyBadge, { backgroundColor: g >= 0 ? '#dcfce7' : '#fee2e2' }]}>
                        <Text style={{ color: g >= 0 ? '#16a34a' : '#dc2626', fontSize: 11, fontWeight: '600' }}>
                            {pct(g)}
                        </Text>
                    </View>
                ))}
            </View>
        )}
    </View>
);

/* ── Styles ─────────────────────────────────────────── */
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
    backBtn: { marginRight: 16 },
    headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
    headerSub: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
    tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
    tabActive: { borderBottomWidth: 2, borderBottomColor: '#2563eb' },
    tabText: { fontSize: 14, color: '#94a3b8', marginLeft: 6, fontWeight: '500' },
    tabTextActive: { color: '#2563eb', fontWeight: '700' },
    body: { flex: 1, padding: 16 },

    /* File picker */
    filePicker: {
        backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center',
        borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', marginBottom: 16,
    },
    filePickerText: { fontSize: 14, color: '#475569', marginTop: 10, fontWeight: '500' },
    fileSize: { fontSize: 12, color: '#94a3b8', marginTop: 4 },

    /* Card */
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },

    /* Form */
    label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 4, marginTop: 8 },
    input: {
        backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
        fontSize: 15, borderWidth: 1, borderColor: '#e2e8f0', color: '#0f172a',
    },
    row: { flexDirection: 'row', gap: 12 },
    halfInput: { flex: 1 },

    /* Guide */
    guideText: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 10 },
    codeBlock: { backgroundColor: '#f1f5f9', borderRadius: 8, padding: 10 },
    codeText: { fontSize: 11, fontFamily: 'monospace', color: '#334155', lineHeight: 16 },

    /* Upload button */
    uploadBtn: {
        backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    uploadBtnDisabled: { backgroundColor: '#94a3b8' },
    uploadBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    /* Result */
    resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    resultCompany: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
    resultSymbol: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
    newUploadBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#eff6ff' },

    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    metricBox: { width: '48%' as any, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12 },
    metricLabel: { fontSize: 11, color: '#64748b', fontWeight: '500' },
    metricValue: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginTop: 4 },

    subTitle: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
    projectionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    projectionItem: { alignItems: 'center', flex: 1 },
    projYearLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
    projValue: { fontSize: 12, fontWeight: '600', color: '#0f172a', marginTop: 2 },
    assumptions: { backgroundColor: '#f1f5f9', borderRadius: 8, padding: 8 },
    assumptionText: { fontSize: 11, color: '#64748b', textAlign: 'center' },

    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb', borderRadius: 10, padding: 12 },
    errorText: { flex: 1, fontSize: 13, color: '#92400e' },

    /* Growth */
    growthRow: { marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    growthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    growthLabel: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
    growthCagr: { fontSize: 13, fontWeight: '700' },
    growthLatest: { fontSize: 12, color: '#64748b', marginTop: 2 },
    yoyRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
    yoyBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },

    /* History */
    historyCard: {
        backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    },
    historyLeft: { flex: 1 },
    historyCompany: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
    historySymbol: { fontSize: 12, color: '#2563eb', fontWeight: '600', marginTop: 2 },
    historyDate: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
    historyBadges: { flexDirection: 'row', gap: 6 },
    badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { fontSize: 11, fontWeight: '600' },

    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyText: { fontSize: 15, color: '#94a3b8', marginTop: 12 },
});

export default FinancialUploadScreen;
