import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, Platform, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { PortfolioResponse, stockAPI } from '../services/api';

type AccountScreenProps = {
    onLogout: () => void;
};

const AccountScreen: React.FC<AccountScreenProps> = ({ onLogout }) => {
    const navigation = useNavigation<any>();
    const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
    const [portfolioLoading, setPortfolioLoading] = useState(false);

    useEffect(() => {
        const loadPortfolioSnapshot = async () => {
            try {
                setPortfolioLoading(true);
                const portfolioData = await stockAPI.getPortfolio();
                setPortfolio(portfolioData);
            } catch (error) {
                console.error('Error loading portfolio summary:', error);
                setPortfolio(null);
            } finally {
                setPortfolioLoading(false);
            }
        };

        loadPortfolioSnapshot();
    }, []);

    const diversificationScore = useMemo(() => {
        if (!portfolio || portfolio.allocation.by_sector.length === 0) return 0;
        const hhi = portfolio.allocation.by_sector.reduce((acc, entry) => acc + Math.pow(entry.value, 2), 0);
        return Math.max(0, Math.min(100, Math.round((1 - hhi) * 100)));
    }, [portfolio]);

    const confirmLogout = () => {
        if (Platform.OS === 'web') {
            const confirmed = typeof globalThis.confirm === 'function'
                ? globalThis.confirm('Are you sure you want to log out?')
                : true;

            if (confirmed) {
                onLogout();
            }
            return;
        }

        Alert.alert('Log out', 'Are you sure you want to log out?', [
            {
                text: 'Cancel',
                style: 'cancel',
            },
            {
                text: 'Log out',
                style: 'destructive',
                onPress: onLogout,
            },
        ]);
    };

    const formatCurrency = (value: number): string => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    const formatPercent = (value: number): string => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    const getTrendIcon = (value: number) => (value > 0 ? 'arrow-up' : value < 0 ? 'arrow-down' : 'remove');
    const getRiskIcon = (value: number) => {
        if (value <= 4) return 'arrow-down';
        if (value >= 7) return 'arrow-up';
        return 'remove';
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.titleRow}>
                    <Ionicons name="person-circle" size={24} color="#93c5fd" />
                    <Text style={styles.title}>Registered Account</Text>
                </View>
                <Text style={styles.description}>
                    You currently have access to portfolio tracking and all advanced functionality.
                </Text>
                <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
                    <Ionicons name="log-out-outline" size={18} color="#fee2e2" />
                    <Text style={styles.logoutText}>Log out</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <View style={styles.titleRow}>
                    <Ionicons name="wallet-outline" size={22} color="#60a5fa" />
                    <Text style={styles.title}>Portfolio Summary</Text>
                </View>

                {portfolioLoading ? (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color="#38bdf8" />
                        <Text style={styles.loadingText}>Loading portfolio snapshot...</Text>
                    </View>
                ) : portfolio ? (
                    <>
                        <View style={styles.cardRowBetween}>
                            <View>
                                <Text style={styles.cardLabel}>Total Value</Text>
                                <Text style={styles.cardValue}>{formatCurrency(portfolio.summary.total_equity)}</Text>
                            </View>
                            <View>
                                <Text style={styles.cardLabel}>Total P/L</Text>
                                <View style={styles.metricInlineRow}>
                                    <Ionicons
                                        name={getTrendIcon(portfolio.summary.total_profit)}
                                        size={13}
                                        color={portfolio.summary.total_profit >= 0 ? '#22c55e' : '#ef4444'}
                                    />
                                    <Text style={portfolio.summary.total_profit >= 0 ? styles.positiveValue : styles.negativeValue}>
                                        {formatCurrency(portfolio.summary.total_profit)} ({formatPercent(portfolio.summary.total_profit_pct)})
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.cardRowBetween}>
                            <View>
                                <Text style={styles.cardLabel}>Risk Score</Text>
                                <View style={styles.metricInlineRow}>
                                    <Ionicons
                                        name={getRiskIcon(portfolio.risk.risk_score)}
                                        size={13}
                                        color={portfolio.risk.risk_score <= 4 ? '#22c55e' : portfolio.risk.risk_score >= 7 ? '#ef4444' : '#f59e0b'}
                                    />
                                    <Text style={styles.cardValue}>{portfolio.risk.risk_score.toFixed(1)} / 10</Text>
                                </View>
                            </View>
                            <View>
                                <Text style={styles.cardLabel}>Diversification</Text>
                                <View style={styles.metricInlineRow}>
                                    <Ionicons
                                        name={getTrendIcon(diversificationScore - 60)}
                                        size={13}
                                        color={diversificationScore >= 60 ? '#22c55e' : '#f59e0b'}
                                    />
                                    <Text style={styles.cardValue}>{diversificationScore} / 100</Text>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.openTrackerButton}
                            onPress={() => navigation.navigate('PortfolioTrackerPage')}
                        >
                            <Ionicons name="analytics-outline" size={16} color="#0ea5e9" />
                            <Text style={styles.openTrackerButtonText}>Open Portfolio Tracker</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <Text style={styles.emptyText}>No portfolio data available.</Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0b1120',
        padding: 16,
        gap: 12,
    },
    card: {
        backgroundColor: '#111827',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1f2937',
        padding: 16,
        gap: 12,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        color: '#f8fafc',
        fontSize: 18,
        fontWeight: '700',
    },
    description: {
        color: '#cbd5e1',
        fontSize: 14,
        lineHeight: 20,
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    loadingText: {
        color: '#94a3b8',
        fontSize: 13,
    },
    cardRowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    cardLabel: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '600',
    },
    cardValue: {
        color: '#f8fafc',
        fontSize: 14,
        fontWeight: '700',
        marginTop: 4,
    },
    metricInlineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    positiveValue: {
        color: '#22c55e',
        fontSize: 13,
        fontWeight: '600',
    },
    negativeValue: {
        color: '#ef4444',
        fontSize: 13,
        fontWeight: '600',
    },
    emptyText: {
        color: '#94a3b8',
        fontSize: 13,
    },
    openTrackerButton: {
        marginTop: 12,
        minHeight: 38,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#334155',
        backgroundColor: '#0f172a',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    openTrackerButtonText: {
        color: '#0ea5e9',
        fontSize: 13,
        fontWeight: '700',
    },
    logoutButton: {
        marginTop: 6,
        minHeight: 44,
        borderRadius: 10,
        backgroundColor: '#7f1d1d',
        borderWidth: 1,
        borderColor: '#991b1b',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    logoutText: {
        color: '#fee2e2',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default AccountScreen;
