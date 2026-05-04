import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { stockAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const fmt = (n: number) => `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtSigned = (n: number) => `${n >= 0 ? '+' : '-'}${fmt(n)}`;

type Tab = 'trade' | 'history';

const TradingSimulatorScreen = ({ navigation }: any) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('trade');
    const [symbol, setSymbol] = useState('');
    const [shares, setShares] = useState('');
    const [action, setAction] = useState<'buy' | 'sell'>('buy');
    const [stockInfo, setStockInfo] = useState<any>(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [trades, setTrades] = useState<any[]>([]);
    const [tradesLoading, setTradesLoading] = useState(false);
    const [portfolio, setPortfolio] = useState<any>(null);

    const loadTrades = useCallback(async () => {
        setTradesLoading(true);
        try {
            const res = await stockAPI.getTransactions();
            setTrades(res.transactions || []);
        } catch { }
        setTradesLoading(false);
    }, []);

    const loadPortfolio = useCallback(async () => {
        try {
            const res = await stockAPI.getPortfolio();
            setPortfolio(res);
        } catch { }
    }, []);

    useEffect(() => { loadTrades(); loadPortfolio(); }, []);

    const lookupStock = async () => {
        const sym = symbol.trim().toUpperCase();
        if (!sym) return;
        setLookupLoading(true);
        setStockInfo(null);
        try {
            const info = await stockAPI.getStockInfo(sym);
            setStockInfo(info);
            setSymbol(sym);
        } catch {
            Alert.alert('Not Found', `Could not find stock "${sym}". Check the ticker symbol.`);
        }
        setLookupLoading(false);
    };

    const totalCost = stockInfo && shares ? stockInfo.current_price * parseFloat(shares || '0') : 0;

    const executeTrade = async () => {
        if (!stockInfo || !shares || parseFloat(shares) <= 0) {
            Alert.alert('Invalid', 'Enter a valid number of shares.');
            return;
        }
        const numShares = parseFloat(shares);
        if (action === 'buy' && portfolio && totalCost > portfolio.cash) {
            Alert.alert('Insufficient Cash', `You need ${fmt(totalCost)} but only have ${fmt(portfolio.cash)} available.`);
            return;
        }
        setSubmitting(true);
        try {
            await stockAPI.addTransaction({
                symbol: stockInfo.symbol,
                action,
                shares: numShares,
                price: stockInfo.current_price,
                notes: `Simulated ${action} via Trading Simulator`,
            });
            Alert.alert(
                'Trade Executed',
                `${action === 'buy' ? 'Bought' : 'Sold'} ${numShares} shares of ${stockInfo.symbol} at ${fmt(stockInfo.current_price)}\nTotal: ${fmt(totalCost)}`,
            );
            setShares('');
            setStockInfo(null);
            setSymbol('');
            loadTrades();
            loadPortfolio();
        } catch (e: any) {
            Alert.alert('Trade Failed', e?.message || 'Could not execute trade.');
        }
        setSubmitting(false);
    };

    const deleteTrade = (id: number) => {
        Alert.alert('Delete Trade', 'Remove this trade from history?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await stockAPI.deleteTransaction(id);
                        loadTrades();
                        loadPortfolio();
                    } catch { }
                }
            },
        ]);
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e3a5f']} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Trading Simulator</Text>
                        <Text style={styles.headerSub}>Practice risk-free with paper trading</Text>
                    </View>
                    <View style={styles.cashBadge}>
                        <Ionicons name="wallet" size={14} color="#16a34a" />
                        <Text style={styles.cashText}>{fmt(portfolio?.cash ?? 10000)}</Text>
                    </View>
                    <TouchableOpacity style={styles.leaderBtn}
                        onPress={() => navigation.navigate('Leaderboard')}>
                        <Ionicons name="trophy" size={16} color="#f59e0b" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Tabs */}
            <View style={styles.tabs}>
                {(['trade', 'history'] as const).map(t => (
                    <TouchableOpacity key={t} style={[styles.tab, activeTab === t && styles.tabActive]}
                        onPress={() => { setActiveTab(t); if (t === 'history') loadTrades(); }}>
                        <Ionicons name={t === 'trade' ? 'swap-horizontal' : 'time'} size={16}
                            color={activeTab === t ? '#2563eb' : '#94a3b8'} />
                        <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                            {t === 'trade' ? 'New Trade' : 'History'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                    {activeTab === 'trade' && (
                        <>
                            {/* Action Toggle */}
                            <View style={styles.actionToggle}>
                                <TouchableOpacity style={[styles.actionBtn, action === 'buy' && styles.actionBuyActive]}
                                    onPress={() => setAction('buy')}>
                                    <Ionicons name="trending-up" size={18} color={action === 'buy' ? '#fff' : '#16a34a'} />
                                    <Text style={[styles.actionBtnText, action === 'buy' && { color: '#fff' }]}>Buy</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionBtn, action === 'sell' && styles.actionSellActive]}
                                    onPress={() => setAction('sell')}>
                                    <Ionicons name="trending-down" size={18} color={action === 'sell' ? '#fff' : '#ef4444'} />
                                    <Text style={[styles.actionBtnText, action === 'sell' && { color: '#fff' }]}>Sell</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Symbol Search */}
                            <View style={styles.card}>
                                <Text style={styles.fieldLabel}>Stock Symbol</Text>
                                <View style={styles.searchRow}>
                                    <TextInput style={styles.searchInput} value={symbol}
                                        onChangeText={setSymbol} placeholder="e.g. AAPL, TSLA, MSFT"
                                        placeholderTextColor="#94a3b8" autoCapitalize="characters"
                                        onSubmitEditing={lookupStock} returnKeyType="search" />
                                    <TouchableOpacity style={styles.searchBtn} onPress={lookupStock} disabled={lookupLoading}>
                                        {lookupLoading ? <ActivityIndicator size="small" color="#fff" /> :
                                            <Ionicons name="search" size={18} color="#fff" />}
                                    </TouchableOpacity>
                                </View>

                                {stockInfo && (
                                    <View style={styles.stockCard}>
                                        <View style={styles.stockCardHead}>
                                            <View style={styles.stockIcon}>
                                                <Text style={styles.stockIconText}>{stockInfo.symbol[0]}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.stockSymbol}>{stockInfo.symbol}</Text>
                                                <Text style={styles.stockName} numberOfLines={1}>{stockInfo.company_name}</Text>
                                            </View>
                                            <View style={styles.priceCol}>
                                                <Text style={styles.stockPrice}>{fmt(stockInfo.current_price)}</Text>
                                                <Text style={styles.stockMeta}>{stockInfo.sector || 'Equity'}</Text>
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Shares Input */}
                            <View style={styles.card}>
                                <Text style={styles.fieldLabel}>Number of Shares</Text>
                                <TextInput style={styles.sharesInput} value={shares}
                                    onChangeText={setShares} placeholder="0"
                                    placeholderTextColor="#cbd5e1" keyboardType="decimal-pad" />

                                {stockInfo && shares && parseFloat(shares) > 0 && (
                                    <View style={styles.summaryBox}>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Price per Share</Text>
                                            <Text style={styles.summaryValue}>{fmt(stockInfo.current_price)}</Text>
                                        </View>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Quantity</Text>
                                            <Text style={styles.summaryValue}>{parseFloat(shares)} shares</Text>
                                        </View>
                                        <View style={[styles.summaryRow, styles.summaryTotal]}>
                                            <Text style={styles.totalLabel}>Estimated Total</Text>
                                            <Text style={styles.totalValue}>{fmt(totalCost)}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Execute Button */}
                            <TouchableOpacity onPress={executeTrade} disabled={submitting || !stockInfo || !shares}
                                activeOpacity={0.8}>
                                <LinearGradient
                                    colors={action === 'buy' ? ['#16a34a', '#22c55e'] : ['#dc2626', '#ef4444']}
                                    style={[styles.executeBtn, (!stockInfo || !shares) && { opacity: 0.5 }]}>
                                    {submitting ? <ActivityIndicator color="#fff" /> : (
                                        <>
                                            <Ionicons name={action === 'buy' ? 'cart' : 'exit'} size={20} color="#fff" />
                                            <Text style={styles.executeBtnText}>
                                                {action === 'buy' ? 'Execute Buy Order' : 'Execute Sell Order'}
                                            </Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <Text style={styles.disclaimer}>
                                This is a paper trading simulator. No real money is involved.
                            </Text>
                        </>
                    )}

                    {activeTab === 'history' && (
                        <>
                            {tradesLoading ? (
                                <View style={styles.centerBox}>
                                    <ActivityIndicator size="large" color="#2563eb" />
                                </View>
                            ) : trades.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
                                    <Text style={styles.emptyTitle}>No Trades Yet</Text>
                                    <Text style={styles.emptyDesc}>Execute your first trade to see it here.</Text>
                                </View>
                            ) : (
                                <>
                                    <Text style={styles.historyCount}>{trades.length} Trade{trades.length !== 1 ? 's' : ''}</Text>
                                    {trades.slice().reverse().map((t: any) => {
                                        const isBuy = t.action === 'buy';
                                        return (
                                            <TouchableOpacity key={t.id} style={styles.tradeCard}
                                                onLongPress={() => deleteTrade(t.id)} activeOpacity={0.7}>
                                                <View style={styles.tradeTop}>
                                                    <View style={[styles.tradeActionBadge,
                                                    { backgroundColor: isBuy ? '#dcfce7' : '#fee2e2' }]}>
                                                        <Ionicons name={isBuy ? 'trending-up' : 'trending-down'}
                                                            size={14} color={isBuy ? '#16a34a' : '#ef4444'} />
                                                        <Text style={{
                                                            fontSize: 11, fontWeight: '700',
                                                            color: isBuy ? '#16a34a' : '#ef4444', marginLeft: 3
                                                        }}>
                                                            {t.action.toUpperCase()}
                                                        </Text>
                                                    </View>
                                                    <Text style={styles.tradeSymbol}>{t.symbol}</Text>
                                                    <Text style={styles.tradeDate}>
                                                        {new Date(t.date).toLocaleDateString()}
                                                    </Text>
                                                </View>
                                                <View style={styles.tradeDetails}>
                                                    <View style={styles.tradeDetailItem}>
                                                        <Text style={styles.tradeDetailLabel}>Shares</Text>
                                                        <Text style={styles.tradeDetailValue}>{t.shares}</Text>
                                                    </View>
                                                    <View style={styles.tradeDetailItem}>
                                                        <Text style={styles.tradeDetailLabel}>Price</Text>
                                                        <Text style={styles.tradeDetailValue}>{fmt(t.price)}</Text>
                                                    </View>
                                                    <View style={styles.tradeDetailItem}>
                                                        <Text style={styles.tradeDetailLabel}>Total</Text>
                                                        <Text style={[styles.tradeDetailValue, { fontWeight: '800' }]}>
                                                            {fmt(t.shares * t.price)}
                                                        </Text>
                                                    </View>
                                                </View>
                                                {t.notes ? <Text style={styles.tradeNote}>{t.notes}</Text> : null}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </>
                            )}
                        </>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { marginRight: 12, padding: 4 },
    headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
    headerSub: { color: '#94a3b8', fontSize: 13, fontWeight: '500', marginTop: 2 },
    cashBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
    cashText: { color: '#16a34a', fontSize: 14, fontWeight: '700' },
    leaderBtn: { backgroundColor: 'rgba(245,158,11,0.15)', padding: 10, borderRadius: 10, marginLeft: 8 },

    tabs: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, backgroundColor: '#e2e8f0', borderRadius: 12, padding: 3 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
    tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    tabText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
    tabTextActive: { color: '#2563eb', fontWeight: '700' },

    body: { flex: 1, padding: 16 },

    actionToggle: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 14, borderWidth: 2, borderColor: '#e2e8f0', backgroundColor: '#fff' },
    actionBuyActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
    actionSellActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
    actionBtnText: { fontSize: 15, fontWeight: '700', color: '#334155' },

    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
    fieldLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },

    searchRow: { flexDirection: 'row', gap: 8 },
    searchInput: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontWeight: '600', color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0' },
    searchBtn: { backgroundColor: '#2563eb', borderRadius: 12, width: 48, alignItems: 'center', justifyContent: 'center' },

    stockCard: { marginTop: 14, backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
    stockCardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stockIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
    stockIconText: { fontSize: 16, fontWeight: '800', color: '#2563eb' },
    stockSymbol: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
    stockName: { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 1 },
    priceCol: { alignItems: 'flex-end' },
    stockPrice: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
    stockMeta: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 1 },

    sharesInput: { backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 24, fontWeight: '700', color: '#0f172a', textAlign: 'center', borderWidth: 1, borderColor: '#e2e8f0' },

    summaryBox: { marginTop: 14, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    summaryLabel: { fontSize: 13, color: '#64748b' },
    summaryValue: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
    summaryTotal: { borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 4, paddingTop: 10 },
    totalLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
    totalValue: { fontSize: 18, fontWeight: '800', color: '#2563eb' },

    executeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 16, marginTop: 4 },
    executeBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

    disclaimer: { textAlign: 'center', color: '#94a3b8', fontSize: 11, fontWeight: '500', marginTop: 12 },

    centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 12 },
    emptyDesc: { fontSize: 13, color: '#94a3b8', marginTop: 4 },

    historyCount: { fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 10 },
    tradeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
    tradeTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tradeActionBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    tradeSymbol: { fontSize: 15, fontWeight: '800', color: '#0f172a', flex: 1 },
    tradeDate: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
    tradeDetails: { flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    tradeDetailItem: { flex: 1, alignItems: 'center' },
    tradeDetailLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
    tradeDetailValue: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 2 },
    tradeNote: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginTop: 8 },
});

export default TradingSimulatorScreen;
