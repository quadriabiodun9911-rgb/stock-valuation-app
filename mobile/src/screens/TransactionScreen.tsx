import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, TextInput, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { stockAPI } from '../services/api';

interface Props { navigation: any; }

const TransactionScreen: React.FC<Props> = ({ navigation }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ symbol: '', action: 'buy' as 'buy' | 'sell', shares: '', price: '', notes: '' });
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        try { setData(await stockAPI.getTransactions()); }
        catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };
    useEffect(() => { load(); }, []);

    const handleSubmit = async () => {
        if (!form.symbol || !form.shares || !form.price) {
            Alert.alert('Missing Fields', 'Symbol, shares, and price are required.');
            return;
        }
        try {
            setSubmitting(true);
            await stockAPI.addTransaction({
                symbol: form.symbol.toUpperCase(),
                action: form.action,
                shares: parseFloat(form.shares),
                price: parseFloat(form.price),
                notes: form.notes || undefined,
            });
            setForm({ symbol: '', action: 'buy', shares: '', price: '', notes: '' });
            setShowForm(false);
            load();
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to record transaction');
        } finally { setSubmitting(false); }
    };

    const handleDelete = (id: number) => {
        Alert.alert('Delete Transaction', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                try { await stockAPI.deleteTransaction(id); load(); }
                catch (e) { Alert.alert('Error', 'Failed to delete'); }
            }},
        ]);
    };

    if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    const txns = data?.transactions || [];
    const summary = data?.summary || [];

    return (
        <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
            {/* Header */}
            <View style={[s.header, { backgroundColor: '#1a1a2e' }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Transaction History</Text>
                <TouchableOpacity onPress={() => setShowForm(!showForm)} style={s.addBtn}>
                    <Ionicons name={showForm ? 'close' : 'add'} size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Add Transaction Form */}
            {showForm && (
                <View style={s.card}>
                    <Text style={s.cardTitle}>New Transaction</Text>
                    <View style={s.actionRow}>
                        {(['buy', 'sell'] as const).map(a => (
                            <TouchableOpacity key={a} style={[s.actionBtn, form.action === a && (a === 'buy' ? s.buyActive : s.sellActive)]} onPress={() => setForm({ ...form, action: a })}>
                                <Text style={[s.actionBtnText, form.action === a && s.actionBtnTextActive]}>
                                    {a === 'buy' ? 'BUY' : 'SELL'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TextInput style={s.input} placeholder="Symbol (e.g. AAPL)" placeholderTextColor="#94a3b8" value={form.symbol} onChangeText={v => setForm({ ...form, symbol: v })} autoCapitalize="characters" />
                    <View style={s.inputRow}>
                        <TextInput style={[s.input, { flex: 1, marginRight: 8 }]} placeholder="Shares" placeholderTextColor="#94a3b8" value={form.shares} onChangeText={v => setForm({ ...form, shares: v })} keyboardType="numeric" />
                        <TextInput style={[s.input, { flex: 1 }]} placeholder="Price" placeholderTextColor="#94a3b8" value={form.price} onChangeText={v => setForm({ ...form, price: v })} keyboardType="numeric" />
                    </View>
                    <TextInput style={s.input} placeholder="Notes (optional)" placeholderTextColor="#94a3b8" value={form.notes} onChangeText={v => setForm({ ...form, notes: v })} />
                    <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={submitting}>
                        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>Record Transaction</Text>}
                    </TouchableOpacity>
                </View>
            )}

            {/* Portfolio Summary */}
            {summary.length > 0 && (
                <View style={s.card}>
                    <Text style={s.cardTitle}>Holdings Summary</Text>
                    {summary.map((h: any) => (
                        <TouchableOpacity key={h.symbol} style={s.holdingRow} onPress={() => navigation.navigate('StockDetail', { symbol: h.symbol })}>
                            <View style={{ flex: 1 }}>
                                <Text style={s.holdingSymbol}>{h.symbol}</Text>
                                <Text style={s.holdingMeta}>{h.shares} shares · Avg ${h.avgCostBasis}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={s.holdingValue}>${h.marketValue?.toLocaleString()}</Text>
                                <Text style={[s.holdingPL, h.unrealizedPL >= 0 ? s.green : s.red]}>
                                    {h.unrealizedPL >= 0 ? '+' : ''}${h.unrealizedPL?.toLocaleString()} ({h.unrealizedPLPct}%)
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Transaction List */}
            <View style={[s.card, { marginBottom: 40 }]}>
                <Text style={s.cardTitle}>All Transactions ({txns.length})</Text>
                {txns.length === 0 ? (
                    <View style={s.emptyBox}>
                        <Ionicons name="receipt-outline" size={40} color="#cbd5e1" />
                        <Text style={s.emptyText}>No transactions yet</Text>
                        <Text style={s.emptyHint}>Tap + to record your first trade</Text>
                    </View>
                ) : txns.map((t: any) => (
                    <View key={t.id} style={s.txnRow}>
                        <View style={[s.txnBadge, t.action === 'buy' ? s.buyBg : s.sellBg]}>
                            <Ionicons name={t.action === 'buy' ? 'arrow-down' : 'arrow-up'} size={14} color="#fff" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <View style={s.txnTopRow}>
                                <Text style={s.txnSymbol}>{t.symbol}</Text>
                                <Text style={s.txnTotal}>${t.total?.toLocaleString()}</Text>
                            </View>
                            <View style={s.txnTopRow}>
                                <Text style={s.txnMeta}>{t.action.toUpperCase()} · {t.shares} @ ${t.price}</Text>
                                <Text style={s.txnDate}>{t.date}</Text>
                            </View>
                            {t.notes && <Text style={s.txnNotes}>{t.notes}</Text>}
                        </View>
                        <TouchableOpacity onPress={() => handleDelete(t.id)} style={s.deleteBtn}>
                            <Ionicons name="trash-outline" size={16} color="#dc2626" />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
    back: { marginRight: 12 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', flex: 1 },
    addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
    actionRow: { flexDirection: 'row', marginBottom: 12 },
    actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', marginHorizontal: 4 },
    buyActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
    sellActive: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
    actionBtnText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
    actionBtnTextActive: { color: '#fff' },
    input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', marginBottom: 8 },
    inputRow: { flexDirection: 'row' },
    submitBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
    submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    holdingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
    holdingSymbol: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
    holdingMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
    holdingValue: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
    holdingPL: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    green: { color: '#16a34a' }, red: { color: '#dc2626' },
    emptyBox: { alignItems: 'center', paddingVertical: 30 },
    emptyText: { fontSize: 15, fontWeight: '600', color: '#94a3b8', marginTop: 10 },
    emptyHint: { fontSize: 12, color: '#cbd5e1', marginTop: 4 },
    txnRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
    txnBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
    buyBg: { backgroundColor: '#16a34a' },
    sellBg: { backgroundColor: '#dc2626' },
    txnTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    txnSymbol: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
    txnTotal: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
    txnMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
    txnDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    txnNotes: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginTop: 4 },
    deleteBtn: { padding: 8, marginLeft: 4 },
});

export default TransactionScreen;
