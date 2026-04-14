import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { stockAPI, PortfolioResponse } from '../services/api';

interface Props {
    navigation: any;
}

const PortfolioTrackerScreen: React.FC<Props> = ({ navigation }) => {
    const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [addModalVisible, setAddModalVisible] = useState(false);

    // Add holding form
    const [symbol, setSymbol] = useState('');
    const [shares, setShares] = useState('');
    const [costBasis, setCostBasis] = useState('');

    useEffect(() => {
        loadPortfolio();
    }, []);

    const loadPortfolio = async () => {
        try {
            const data = await stockAPI.getPortfolio();
            setPortfolio(data);
        } catch (error) {
            console.error('Failed to load portfolio:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadPortfolio();
        setRefreshing(false);
    };

    const handleAddHolding = async () => {
        const trimmedSymbol = symbol.trim().toUpperCase();
        if (!trimmedSymbol || !shares || !costBasis) {
            Alert.alert('Missing Fields', 'Please fill in all fields.');
            return;
        }
        try {
            const currentPositions = portfolio?.positions?.map((p) => ({
                symbol: p.symbol,
                shares: p.shares,
                cost_basis: p.cost_basis,
            })) || [];

            currentPositions.push({
                symbol: trimmedSymbol,
                shares: parseFloat(shares),
                cost_basis: parseFloat(costBasis),
            });

            await stockAPI.updatePortfolio({
                positions: currentPositions,
                cash: portfolio?.cash || 0,
            });
            Alert.alert('Added', `${trimmedSymbol} added to portfolio.`);
            setSymbol('');
            setShares('');
            setCostBasis('');
            setAddModalVisible(false);
            await loadPortfolio();
        } catch (error) {
            Alert.alert('Error', 'Failed to add holding.');
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Loading portfolio…</Text>
            </View>
        );
    }

    const totalValue = portfolio?.portfolio_value ?? portfolio?.summary?.total_value ?? 0;
    const totalCost = portfolio?.total_invested ?? portfolio?.summary?.total_cost ?? 0;
    const totalProfit = totalValue - totalCost;
    const profitPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Portfolio Tracker</Text>
                <TouchableOpacity onPress={() => setAddModalVisible(true)}>
                    <Ionicons name="add-circle" size={28} color="#2563eb" />
                </TouchableOpacity>
            </View>

            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Summary Card */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Total Value</Text>
                    <Text style={styles.summaryValue}>${totalValue.toFixed(2)}</Text>
                    <View style={styles.summaryRow}>
                        <View>
                            <Text style={styles.miniLabel}>Invested</Text>
                            <Text style={styles.miniValue}>${totalCost.toFixed(2)}</Text>
                        </View>
                        <View>
                            <Text style={styles.miniLabel}>Profit / Loss</Text>
                            <Text style={[styles.miniValue, totalProfit >= 0 ? styles.positive : styles.negative]}>
                                {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)} ({profitPct.toFixed(1)}%)
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Positions */}
                {portfolio?.positions && portfolio.positions.length > 0 ? (
                    portfolio.positions.map((pos, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={styles.positionCard}
                            onPress={() => navigation.navigate('StockDetail', { symbol: pos.symbol })}
                        >
                            <View>
                                <Text style={styles.posSymbol}>{pos.symbol}</Text>
                                <Text style={styles.posShares}>{pos.shares} shares @ ${pos.cost_basis.toFixed(2)}</Text>
                            </View>
                            <View style={styles.posRight}>
                                <Text style={styles.posValue}>${pos.market_value?.toFixed(2) ?? '—'}</Text>
                                <Text style={[styles.posProfit, pos.profit >= 0 ? styles.positive : styles.negative]}>
                                    {pos.profit >= 0 ? '+' : ''}${pos.profit?.toFixed(2) ?? '0.00'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="wallet-outline" size={48} color="#ccc" />
                        <Text style={styles.emptyText}>No holdings yet. Tap + to add one.</Text>
                    </View>
                )}
            </ScrollView>

            {/* Add Holding Modal */}
            <Modal visible={addModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Add Holding</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Symbol (e.g. AAPL)"
                            value={symbol}
                            onChangeText={setSymbol}
                            autoCapitalize="characters"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Shares"
                            value={shares}
                            onChangeText={setShares}
                            keyboardType="decimal-pad"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Cost Basis ($)"
                            value={costBasis}
                            onChangeText={setCostBasis}
                            keyboardType="decimal-pad"
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.addBtn} onPress={handleAddHolding}>
                                <Text style={styles.addBtnText}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: '#64748b' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
    scrollContent: { padding: 16 },
    summaryCard: { backgroundColor: '#2563eb', borderRadius: 16, padding: 20, marginBottom: 16 },
    summaryLabel: { color: '#93c5fd', fontSize: 14 },
    summaryValue: { color: '#fff', fontSize: 32, fontWeight: '700', marginTop: 4 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
    miniLabel: { color: '#93c5fd', fontSize: 12 },
    miniValue: { color: '#fff', fontSize: 16, fontWeight: '600' },
    positive: { color: '#22c55e' },
    negative: { color: '#ef4444' },
    positionCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    posSymbol: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
    posShares: { fontSize: 13, color: '#64748b', marginTop: 2 },
    posRight: { alignItems: 'flex-end' },
    posValue: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
    posProfit: { fontSize: 13, marginTop: 2 },
    emptyState: { alignItems: 'center', paddingVertical: 48 },
    emptyText: { marginTop: 12, color: '#94a3b8', fontSize: 15 },
    modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 },
    modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24 },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: '#1e293b' },
    input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 16 },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
    cancelBtn: { paddingHorizontal: 20, paddingVertical: 10, marginRight: 12 },
    cancelBtnText: { color: '#64748b', fontSize: 16 },
    addBtn: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
    addBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

export default PortfolioTrackerScreen;
