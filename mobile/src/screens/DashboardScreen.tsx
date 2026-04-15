import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, ActivityIndicator,
    TouchableOpacity, RefreshControl, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { stockAPI, PortfolioAllocationEntry, PortfolioResponse } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const screenWidth = Dimensions.get('window').width - 64;

interface Props { navigation: any; }

const fmt = (v: number) => `$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const fmtSigned = (v: number) => `${v >= 0 ? '+' : '-'}$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

const SECTOR_COLORS: Record<string, string> = {
    Technology: '#2563eb', 'Consumer Cyclical': '#7c3aed', Healthcare: '#16a34a',
    'Financial Services': '#f59e0b', Energy: '#ef4444', Communication: '#06b6d4',
    Industrials: '#64748b', 'Real Estate': '#ec4899', Utilities: '#14b8a6',
    'Consumer Defensive': '#8b5cf6', 'Basic Materials': '#d97706', Cash: '#94a3b8',
};

const DashboardScreen: React.FC<Props> = ({ navigation }) => {
    const { user } = useAuth();
    const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'holdings' | 'performance'>('overview');

    const loadPortfolio = useCallback(async () => {
        try {
            setError(null);
            const data = await stockAPI.getPortfolio();
            setPortfolio(data);
        } catch { setError('Unable to load portfolio data.'); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { loadPortfolio(); }, []);

    const onRefresh = () => { setRefreshing(true); loadPortfolio(); };

    const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

    const sectorAllocation = useMemo(() => {
        if (!portfolio) return [] as PortfolioAllocationEntry[];
        const cashPct = portfolio.summary.total_equity > 0 ? portfolio.cash / portfolio.summary.total_equity : 0;
        const sectors = [...portfolio.allocation.by_sector].sort((a, b) => b.value - a.value).slice(0, 6);
        return cashPct > 0.001 ? [...sectors, { name: 'Cash', value: cashPct }] : sectors;
    }, [portfolio]);

    const riskLabel = useMemo(() => {
        if (!portfolio) return { text: 'N/A', color: '#94a3b8' };
        const s = portfolio.risk.risk_score;
        if (s >= 7) return { text: 'High', color: '#ef4444' };
        if (s >= 4) return { text: 'Medium', color: '#f59e0b' };
        return { text: 'Low', color: '#16a34a' };
    }, [portfolio]);

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.centerText}>Loading portfolio…</Text>
        </View>
    );
    if (error || !portfolio) return (
        <View style={styles.center}>
            <Ionicons name="alert-circle" size={48} color="#dc2626" />
            <Text style={styles.errorText}>{error || 'No data available.'}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadPortfolio}>
                <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
        </View>
    );

    const profitColor = portfolio.summary.total_profit >= 0 ? '#16a34a' : '#ef4444';
    const bestPos = portfolio.positions.reduce((a: any, b: any) => a.profit_pct > b.profit_pct ? a : b, portfolio.positions[0]);
    const worstPos = portfolio.positions.reduce((a: any, b: any) => a.profit_pct < b.profit_pct ? a : b, portfolio.positions[0]);

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}>
                {/* Header */}
                <LinearGradient colors={['#0f172a', '#1e3a5f']} style={styles.header}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={22} color="#fff" />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.headerLabel}>
                                {user?.username ? `${user.username}'s Portfolio` : 'Portfolio Dashboard'}
                            </Text>
                            <Text style={styles.totalValue}>{fmt(portfolio.summary.total_equity)}</Text>
                            <View style={styles.profitBadge}>
                                <Ionicons name={portfolio.summary.total_profit >= 0 ? 'trending-up' : 'trending-down'}
                                    size={16} color={profitColor} />
                                <Text style={[styles.profitText, { color: profitColor }]}>
                                    {fmtSigned(portfolio.summary.total_profit)} ({fmtPct(portfolio.summary.total_profit_pct)})
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.simBtn}
                            onPress={() => navigation.navigate('TradingSimulator')}>
                            <LinearGradient colors={['#2563eb', '#3b82f6']} style={styles.simBtnGrad}>
                                <Ionicons name="swap-horizontal" size={16} color="#fff" />
                                <Text style={styles.simBtnText}>Trade</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* Mini Stats Row */}
                    <View style={styles.miniStats}>
                        <View style={styles.miniStat}>
                            <Text style={styles.miniStatLabel}>Invested</Text>
                            <Text style={styles.miniStatValue}>{fmt(portfolio.summary.total_cost)}</Text>
                        </View>
                        <View style={styles.miniDivider} />
                        <View style={styles.miniStat}>
                            <Text style={styles.miniStatLabel}>Market Value</Text>
                            <Text style={styles.miniStatValue}>{fmt(portfolio.summary.total_value)}</Text>
                        </View>
                        <View style={styles.miniDivider} />
                        <View style={styles.miniStat}>
                            <Text style={styles.miniStatLabel}>Cash</Text>
                            <Text style={styles.miniStatValue}>{fmt(portfolio.cash)}</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Tabs */}
                <View style={styles.tabs}>
                    {(['overview', 'holdings', 'performance'] as const).map((t) => (
                        <TouchableOpacity key={t} style={[styles.tab, activeTab === t && styles.tabActive]}
                            onPress={() => setActiveTab(t)}>
                            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                                {t === 'overview' ? 'Overview' : t === 'holdings' ? 'Holdings' : 'Performance'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.body}>
                    {activeTab === 'overview' && (
                        <>
                            {/* Portfolio Growth Chart */}
                            <View style={styles.card}>
                                <View style={styles.cardHead}>
                                    <Ionicons name="trending-up" size={18} color="#2563eb" />
                                    <Text style={styles.cardTitle}>Portfolio Growth</Text>
                                </View>
                                <LineChart
                                    data={{
                                        labels: ['', '', '', '', '', ''],
                                        datasets: [{
                                            data: [
                                                portfolio.summary.total_cost * 0.92,
                                                portfolio.summary.total_cost * 0.97,
                                                portfolio.summary.total_cost,
                                                portfolio.summary.total_cost * 1.03,
                                                portfolio.summary.total_value * 0.97,
                                                portfolio.summary.total_equity,
                                            ],
                                        }],
                                    }}
                                    width={screenWidth}
                                    height={180}
                                    yAxisLabel="$"
                                    yAxisSuffix=""
                                    withDots={false}
                                    withInnerLines={false}
                                    withOuterLines={false}
                                    chartConfig={{
                                        backgroundColor: '#fff',
                                        backgroundGradientFrom: '#fff',
                                        backgroundGradientTo: '#fff',
                                        decimalPlaces: 0,
                                        color: (opacity = 1) =>
                                            portfolio.summary.total_profit >= 0
                                                ? `rgba(22,163,106,${opacity})`
                                                : `rgba(239,68,68,${opacity})`,
                                        labelColor: () => '#94a3b8',
                                        propsForBackgroundLines: { stroke: '#f1f5f9' },
                                        fillShadowGradientFrom: portfolio.summary.total_profit >= 0 ? '#16a34a' : '#ef4444',
                                        fillShadowGradientTo: '#fff',
                                        fillShadowGradientFromOpacity: 0.2,
                                        fillShadowGradientToOpacity: 0,
                                    }}
                                    bezier
                                    style={{ borderRadius: 12, marginTop: 4 }}
                                />
                            </View>

                            {/* Best & Worst */}
                            <View style={styles.duoRow}>
                                <View style={[styles.duoCard, { borderLeftColor: '#16a34a' }]}>
                                    <Text style={styles.duoLabel}>Best Performer</Text>
                                    <Text style={styles.duoSymbol}>{bestPos?.symbol}</Text>
                                    <Text style={[styles.duoPct, { color: '#16a34a' }]}>{fmtPct(bestPos?.profit_pct || 0)}</Text>
                                </View>
                                <View style={[styles.duoCard, { borderLeftColor: '#ef4444' }]}>
                                    <Text style={styles.duoLabel}>Worst Performer</Text>
                                    <Text style={styles.duoSymbol}>{worstPos?.symbol}</Text>
                                    <Text style={[styles.duoPct, { color: '#ef4444' }]}>{fmtPct(worstPos?.profit_pct || 0)}</Text>
                                </View>
                            </View>

                            <View style={styles.card}>
                                <View style={styles.cardHead}>
                                    <Ionicons name="flash" size={18} color="#2563eb" />
                                    <Text style={styles.cardTitle}>Quick Actions</Text>
                                </View>
                                <View style={styles.actionGrid}>
                                    <TouchableOpacity style={styles.actionChip} onPress={() => navigation.navigate('PortfolioTracker')}>
                                        <Ionicons name="pie-chart" size={16} color="#2563eb" />
                                        <Text style={styles.actionChipText}>Tracker</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionChip} onPress={() => navigation.navigate('GoalPlanner')}>
                                        <Ionicons name="flag" size={16} color="#2563eb" />
                                        <Text style={styles.actionChipText}>Goals</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionChip} onPress={() => navigation.navigate('PriceAlerts')}>
                                        <Ionicons name="notifications" size={16} color="#2563eb" />
                                        <Text style={styles.actionChipText}>Alerts</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionChip} onPress={() => navigation.navigate('StockDetail', { symbol: bestPos?.symbol || 'AAPL' })}>
                                        <Ionicons name="arrow-forward-circle" size={16} color="#2563eb" />
                                        <Text style={styles.actionChipText}>Top Pick</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Allocation */}
                            <View style={styles.card}>
                                <View style={styles.cardHead}>
                                    <Ionicons name="pie-chart" size={18} color="#7c3aed" />
                                    <Text style={styles.cardTitle}>Sector Allocation</Text>
                                </View>
                                {sectorAllocation.map((s, i) => {
                                    const pctVal = s.value * 100;
                                    const color = SECTOR_COLORS[s.name || ''] || '#64748b';
                                    return (
                                        <View key={s.name || i} style={styles.allocRow}>
                                            <View style={[styles.allocDot, { backgroundColor: color }]} />
                                            <Text style={styles.allocName}>{s.name || s.symbol}</Text>
                                            <View style={styles.allocBarBg}>
                                                <View style={[styles.allocBarFill, { width: `${Math.min(pctVal, 100)}%` as any, backgroundColor: color }]} />
                                            </View>
                                            <Text style={styles.allocPct}>{pctVal.toFixed(1)}%</Text>
                                        </View>
                                    );
                                })}
                            </View>

                            {/* Risk */}
                            <View style={styles.card}>
                                <View style={styles.cardHead}>
                                    <Ionicons name="shield-checkmark" size={18} color="#f97316" />
                                    <Text style={styles.cardTitle}>Risk Profile</Text>
                                </View>
                                <View style={styles.riskRow}>
                                    <View style={styles.riskGauge}>
                                        <View style={[styles.riskCircle, { borderColor: riskLabel.color }]}>
                                            <Text style={[styles.riskScore, { color: riskLabel.color }]}>
                                                {portfolio.risk.risk_score.toFixed(1)}
                                            </Text>
                                            <Text style={styles.riskOutOf}>/10</Text>
                                        </View>
                                        <Text style={[styles.riskLabelText, { color: riskLabel.color }]}>{riskLabel.text} Risk</Text>
                                    </View>
                                    <View style={styles.riskDetails}>
                                        <View style={styles.riskLine}>
                                            <Text style={styles.riskLineLabel}>Volatility</Text>
                                            <Text style={styles.riskLineValue}>
                                                {portfolio.risk.volatility != null ? `${(portfolio.risk.volatility * 100).toFixed(1)}%` : 'N/A'}
                                            </Text>
                                        </View>
                                        <View style={styles.riskLine}>
                                            <Text style={styles.riskLineLabel}>Max Drawdown</Text>
                                            <Text style={[styles.riskLineValue, { color: '#ef4444' }]}>
                                                {portfolio.risk.max_drawdown != null ? `${(portfolio.risk.max_drawdown * 100).toFixed(2)}%` : 'N/A'}
                                            </Text>
                                        </View>
                                        <View style={styles.riskLine}>
                                            <Text style={styles.riskLineLabel}>Positions</Text>
                                            <Text style={styles.riskLineValue}>{portfolio.positions.length}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </>
                    )}

                    {activeTab === 'holdings' && (
                        <>
                            <Text style={styles.holdingsCount}>
                                {portfolio.positions.length} Position{portfolio.positions.length !== 1 ? 's' : ''}
                            </Text>
                            {portfolio.positions.map((pos: any) => {
                                const isUp = pos.profit >= 0;
                                return (
                                    <TouchableOpacity key={pos.symbol} style={styles.holdingCard}
                                        onPress={() => navigation.navigate('StockDetail', { symbol: pos.symbol })}
                                        activeOpacity={0.7}>
                                        <View style={styles.holdingTop}>
                                            <View style={styles.holdingLeft}>
                                                <View style={[styles.holdingIcon, { backgroundColor: isUp ? '#dcfce7' : '#fee2e2' }]}>
                                                    <Text style={{ fontWeight: '800', fontSize: 14, color: isUp ? '#16a34a' : '#ef4444' }}>
                                                        {pos.symbol[0]}
                                                    </Text>
                                                </View>
                                                <View>
                                                    <Text style={styles.holdingSymbol}>{pos.symbol}</Text>
                                                    <Text style={styles.holdingSector}>{pos.sector || 'Equity'}</Text>
                                                </View>
                                            </View>
                                            <View style={styles.holdingRight}>
                                                <Text style={styles.holdingMarketVal}>{fmt(pos.market_value)}</Text>
                                                <View style={[styles.holdingPLBadge, { backgroundColor: isUp ? '#dcfce7' : '#fee2e2' }]}>
                                                    <Ionicons name={isUp ? 'arrow-up' : 'arrow-down'} size={11}
                                                        color={isUp ? '#16a34a' : '#ef4444'} />
                                                    <Text style={{ fontSize: 12, fontWeight: '700', color: isUp ? '#16a34a' : '#ef4444', marginLeft: 2 }}>
                                                        {fmtPct(pos.profit_pct)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View style={styles.holdingGrid}>
                                            <View style={styles.holdingGridItem}>
                                                <Text style={styles.gridLabel}>Shares</Text>
                                                <Text style={styles.gridValue}>{pos.shares}</Text>
                                            </View>
                                            <View style={styles.holdingGridItem}>
                                                <Text style={styles.gridLabel}>Avg Cost</Text>
                                                <Text style={styles.gridValue}>{fmt(pos.cost_basis)}</Text>
                                            </View>
                                            <View style={styles.holdingGridItem}>
                                                <Text style={styles.gridLabel}>Price</Text>
                                                <Text style={styles.gridValue}>{fmt(pos.current_price)}</Text>
                                            </View>
                                            <View style={styles.holdingGridItem}>
                                                <Text style={styles.gridLabel}>P/L</Text>
                                                <Text style={[styles.gridValue, { color: isUp ? '#16a34a' : '#ef4444' }]}>
                                                    {fmtSigned(pos.profit)}
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}

                            {/* Cash row */}
                            <View style={[styles.holdingCard, { backgroundColor: '#f8fafc' }]}>
                                <View style={styles.holdingTop}>
                                    <View style={styles.holdingLeft}>
                                        <View style={[styles.holdingIcon, { backgroundColor: '#e2e8f0' }]}>
                                            <Ionicons name="cash" size={14} color="#64748b" />
                                        </View>
                                        <View>
                                            <Text style={styles.holdingSymbol}>Cash</Text>
                                            <Text style={styles.holdingSector}>Available Balance</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.holdingMarketVal}>{fmt(portfolio.cash)}</Text>
                                </View>
                            </View>
                        </>
                    )}

                    {activeTab === 'performance' && (
                        <>
                            {[
                                { label: 'Monthly', data: portfolio.performance.monthly, icon: 'calendar-outline' as const },
                                { label: 'Quarterly', data: portfolio.performance.quarterly, icon: 'calendar' as const },
                                { label: 'Year-to-Date', data: portfolio.performance.ytd, icon: 'trending-up' as const },
                            ].map(({ label, data, icon }) => {
                                const up = data.profit >= 0;
                                return (
                                    <View key={label} style={styles.perfCard}>
                                        <View style={styles.perfHead}>
                                            <View style={[styles.perfIconWrap, { backgroundColor: up ? '#dcfce7' : '#fee2e2' }]}>
                                                <Ionicons name={icon} size={18} color={up ? '#16a34a' : '#ef4444'} />
                                            </View>
                                            <Text style={styles.perfLabel}>{label}</Text>
                                            <View style={[styles.perfPctBadge, { backgroundColor: up ? '#dcfce7' : '#fee2e2' }]}>
                                                <Text style={{ fontSize: 13, fontWeight: '700', color: up ? '#16a34a' : '#ef4444' }}>
                                                    {fmtPct(data.profit_pct)}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.perfAmount, { color: up ? '#16a34a' : '#ef4444' }]}>
                                            {fmtSigned(data.profit)}
                                        </Text>
                                    </View>
                                );
                            })}

                            <View style={styles.card}>
                                <View style={styles.cardHead}>
                                    <Ionicons name="analytics" size={18} color="#2563eb" />
                                    <Text style={styles.cardTitle}>Investment Summary</Text>
                                </View>
                                {[
                                    { l: 'Total Invested', v: fmt(portfolio.summary.total_cost) },
                                    { l: 'Current Value', v: fmt(portfolio.summary.total_value) },
                                    { l: 'Unrealized P/L', v: fmtSigned(portfolio.summary.total_profit), c: profitColor },
                                    { l: 'Return', v: fmtPct(portfolio.summary.total_profit_pct), c: profitColor },
                                ].map(({ l, v, c }) => (
                                    <View key={l} style={styles.summRow}>
                                        <Text style={styles.summLabel}>{l}</Text>
                                        <Text style={[styles.summValue, c ? { color: c } : null]}>{v}</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', padding: 24 },
    centerText: { marginTop: 12, color: '#475569', fontSize: 14, fontWeight: '600' },
    errorText: { color: '#dc2626', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 12 },
    retryBtn: { marginTop: 16, backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
    retryText: { color: '#fff', fontWeight: '700' },

    header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
    backBtn: { marginRight: 12, marginTop: 2, padding: 4 },
    headerLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
    totalValue: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 4, letterSpacing: -1 },
    profitBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
    profitText: { fontSize: 14, fontWeight: '700' },
    simBtn: { marginLeft: 'auto' },
    simBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
    simBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    miniStats: { flexDirection: 'row', marginTop: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 12 },
    miniStat: { flex: 1, alignItems: 'center' },
    miniDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 2 },
    miniStatLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '500' },
    miniStatValue: { color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 2 },

    tabs: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, backgroundColor: '#e2e8f0', borderRadius: 12, padding: 3 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
    tabTextActive: { color: '#0f172a', fontWeight: '700' },

    body: { padding: 16, paddingBottom: 40 },

    duoRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    duoCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
    duoLabel: { fontSize: 11, color: '#64748b', fontWeight: '500' },
    duoSymbol: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 4 },
    duoPct: { fontSize: 14, fontWeight: '700', marginTop: 2 },

    actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    actionChip: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#eff6ff',
        borderRadius: 10,
        paddingVertical: 10,
        marginBottom: 8,
    },
    actionChipText: { fontSize: 12, fontWeight: '700', color: '#2563eb' },

    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },

    allocRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    allocDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    allocName: { fontSize: 12, color: '#334155', fontWeight: '500', width: 90 },
    allocBarBg: { flex: 1, height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, marginHorizontal: 8, overflow: 'hidden' },
    allocBarFill: { height: 6, borderRadius: 3 },
    allocPct: { fontSize: 12, fontWeight: '700', color: '#0f172a', width: 42, textAlign: 'right' },

    riskRow: { flexDirection: 'row', alignItems: 'center' },
    riskGauge: { alignItems: 'center', marginRight: 20 },
    riskCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
    riskScore: { fontSize: 22, fontWeight: '800' },
    riskOutOf: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: -2 },
    riskLabelText: { fontSize: 12, fontWeight: '700', marginTop: 6 },
    riskDetails: { flex: 1 },
    riskLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    riskLineLabel: { fontSize: 13, color: '#64748b' },
    riskLineValue: { fontSize: 13, fontWeight: '700', color: '#0f172a' },

    holdingsCount: { fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 10 },
    holdingCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    holdingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    holdingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    holdingIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    holdingSymbol: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
    holdingSector: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
    holdingRight: { alignItems: 'flex-end' },
    holdingMarketVal: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
    holdingPLBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
    holdingGrid: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    holdingGridItem: { flex: 1, alignItems: 'center' },
    gridLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
    gridValue: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginTop: 2 },

    perfCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
    perfHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    perfIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    perfLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0f172a' },
    perfPctBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    perfAmount: { fontSize: 20, fontWeight: '800', marginTop: 8 },

    summRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
    summLabel: { fontSize: 13, color: '#64748b' },
    summValue: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
});

export default DashboardScreen;
