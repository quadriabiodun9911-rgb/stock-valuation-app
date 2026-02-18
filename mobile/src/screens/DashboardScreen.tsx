import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { stockAPI, PortfolioAllocationEntry, PortfolioResponse } from '../services/api';

interface Props {
    navigation: any;
}

const DashboardScreen: React.FC<Props> = () => {
    const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadPortfolio();
    }, []);

    const loadPortfolio = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await stockAPI.getPortfolio();
            setPortfolio(data);
        } catch (err) {
            setError('Unable to load portfolio data.');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

    const sectorAllocation = useMemo(() => {
        if (!portfolio) return [] as PortfolioAllocationEntry[];
        const cashAllocation = portfolio.summary.total_equity > 0 ? portfolio.cash / portfolio.summary.total_equity : 0;
        const sectors = [...portfolio.allocation.by_sector]
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
        return cashAllocation > 0
            ? [...sectors, { name: 'Cash', value: cashAllocation }]
            : sectors;
    }, [portfolio]);

    const riskLabel = useMemo(() => {
        if (!portfolio) return 'N/A';
        const score = portfolio.risk.risk_score;
        if (score >= 7) return 'High';
        if (score >= 4) return 'Medium';
        return 'Low';
    }, [portfolio]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Loading portfolio data...</Text>
            </View>
        );
    }

    if (error || !portfolio) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorText}>{error || 'No portfolio data available.'}</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
                <Text style={styles.headerTitle}>Portfolio Dashboard</Text>
                <Text style={styles.headerSubtitle}>Track Portfolio, Profits, and Risk</Text>
            </LinearGradient>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Overview</Text>
                <View style={styles.overviewRow}>
                    <View style={styles.overviewCard}>
                        <Ionicons name="wallet" size={22} color="#2563eb" />
                        <Text style={styles.overviewLabel}>Total Value</Text>
                        <Text style={styles.overviewValue}>{formatCurrency(portfolio.summary.total_equity)}</Text>
                        <Text style={styles.overviewMeta}>{formatPercent(portfolio.performance.monthly.profit_pct)} monthly</Text>
                    </View>
                    <View style={styles.overviewCard}>
                        <Ionicons name="trending-up" size={22} color="#16a34a" />
                        <Text style={styles.overviewLabel}>Total Profit</Text>
                        <Text style={styles.overviewValue}>{formatCurrency(portfolio.summary.total_profit)}</Text>
                        <Text style={styles.overviewMeta}>{formatPercent(portfolio.summary.total_profit_pct)} all-time</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Portfolio</Text>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="pie-chart" size={22} color="#7c3aed" />
                        <Text style={styles.cardTitle}>Allocation</Text>
                    </View>
                    {sectorAllocation.length === 0 ? (
                        <Text style={styles.cardLabel}>No allocation data available.</Text>
                    ) : (
                        sectorAllocation.map((entry) => (
                            <View key={entry.name || entry.symbol} style={styles.rowBetween}>
                                <Text style={styles.cardLabel}>{entry.name || entry.symbol}</Text>
                                <Text style={styles.cardValue}>{(entry.value * 100).toFixed(1)}%</Text>
                            </View>
                        ))
                    )}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Profits</Text>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="bar-chart" size={22} color="#16a34a" />
                        <Text style={styles.cardTitle}>Performance</Text>
                    </View>
                    <View style={styles.rowBetween}>
                        <Text style={styles.cardLabel}>Monthly</Text>
                        <Text style={portfolio.performance.monthly.profit >= 0 ? styles.positiveValue : styles.negativeValue}>
                            {formatCurrency(portfolio.performance.monthly.profit)} ({formatPercent(portfolio.performance.monthly.profit_pct)})
                        </Text>
                    </View>
                    <View style={styles.rowBetween}>
                        <Text style={styles.cardLabel}>Quarterly</Text>
                        <Text style={portfolio.performance.quarterly.profit >= 0 ? styles.positiveValue : styles.negativeValue}>
                            {formatCurrency(portfolio.performance.quarterly.profit)} ({formatPercent(portfolio.performance.quarterly.profit_pct)})
                        </Text>
                    </View>
                    <View style={styles.rowBetween}>
                        <Text style={styles.cardLabel}>Year-to-date</Text>
                        <Text style={portfolio.performance.ytd.profit >= 0 ? styles.positiveValue : styles.negativeValue}>
                            {formatCurrency(portfolio.performance.ytd.profit)} ({formatPercent(portfolio.performance.ytd.profit_pct)})
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Risk</Text>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="shield-checkmark" size={22} color="#f97316" />
                        <Text style={styles.cardTitle}>Risk Profile</Text>
                    </View>
                    <View style={styles.rowBetween}>
                        <Text style={styles.cardLabel}>Volatility</Text>
                        <Text style={styles.cardValue}>{riskLabel}</Text>
                    </View>
                    <View style={styles.rowBetween}>
                        <Text style={styles.cardLabel}>Max Drawdown</Text>
                        <Text style={styles.negativeValue}>
                            {portfolio.risk.max_drawdown === null ? 'N/A' : `${(portfolio.risk.max_drawdown * 100).toFixed(2)}%`}
                        </Text>
                    </View>
                    <View style={styles.rowBetween}>
                        <Text style={styles.cardLabel}>Risk Score</Text>
                        <Text style={styles.cardValue}>{portfolio.risk.risk_score.toFixed(1)} / 10</Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#f8fafc',
    },
    loadingText: {
        marginTop: 12,
        color: '#475569',
        fontSize: 14,
        fontWeight: '600',
    },
    errorText: {
        color: '#dc2626',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    header: {
        paddingTop: 56,
        paddingHorizontal: 24,
        paddingBottom: 28,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerTitle: {
        color: '#f8fafc',
        fontSize: 22,
        fontWeight: '700',
    },
    headerSubtitle: {
        color: '#cbd5f5',
        marginTop: 6,
        fontSize: 14,
    },
    section: {
        paddingHorizontal: 20,
        paddingTop: 22,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 12,
    },
    overviewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    overviewCard: {
        flex: 1,
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 16,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 3,
    },
    overviewLabel: {
        marginTop: 8,
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
    },
    overviewValue: {
        marginTop: 6,
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
    },
    overviewMeta: {
        marginTop: 4,
        fontSize: 12,
        color: '#16a34a',
        fontWeight: '600',
    },
    card: {
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 16,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 6,
    },
    cardLabel: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '600',
    },
    cardValue: {
        fontSize: 14,
        color: '#0f172a',
        fontWeight: '700',
    },
    positiveValue: {
        fontSize: 14,
        color: '#16a34a',
        fontWeight: '700',
    },
    negativeValue: {
        fontSize: 14,
        color: '#dc2626',
        fontWeight: '700',
    },
});

export default DashboardScreen;
