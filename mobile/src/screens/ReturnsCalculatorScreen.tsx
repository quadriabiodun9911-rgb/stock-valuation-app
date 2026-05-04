import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { stockAPI } from '../services/api';

interface Props {
    route: any;
    navigation: any;
}

const money = (n: number): string => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const pct = (n: number): string => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

const ReturnsCalculatorScreen: React.FC<Props> = ({ route, navigation }) => {
    const routeSymbol = route?.params?.symbol || '';

    const [symbol, setSymbol] = useState(routeSymbol);
    const [shares, setShares] = useState('10');
    const [purchasePrice, setPurchasePrice] = useState('100');
    const [currentPrice, setCurrentPrice] = useState('120');
    const [purchaseDate, setPurchaseDate] = useState('2024-01-01');
    const [dividends, setDividends] = useState('0');
    const [inflationRate, setInflationRate] = useState('3');
    const [transactionCostRate, setTransactionCostRate] = useState('0.25');
    const [capitalGainsTaxRate, setCapitalGainsTaxRate] = useState('15');
    const [fixedCost, setFixedCost] = useState('0');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);

    const calculate = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await stockAPI.calculateInvestorReturns({
                symbol: symbol.trim() || undefined,
                shares: parseFloat(shares) || 0,
                purchase_price: parseFloat(purchasePrice) || 0,
                current_price: currentPrice.trim() ? parseFloat(currentPrice) : undefined,
                purchase_date: purchaseDate.trim() || undefined,
                total_dividends: dividends.trim() ? parseFloat(dividends) : undefined,
                inflation_rate_pct: parseFloat(inflationRate) || 0,
                transaction_cost_rate_pct: parseFloat(transactionCostRate) || 0,
                fixed_transaction_cost: parseFloat(fixedCost) || 0,
                capital_gains_tax_rate_pct: parseFloat(capitalGainsTaxRate) || 0,
            });
            setResult(response);
        } catch (e: any) {
            setError(e.message || 'Unable to calculate returns');
        } finally {
            setLoading(false);
        }
    };

    const statCards = result
        ? [
            { label: 'Capital Gain', value: money(result.capital_gain), color: '#2563eb' },
            { label: 'Dividend Income', value: money(result.dividend_income), color: '#16a34a' },
            { label: 'Transaction Costs', value: money(result.transaction_costs), color: '#ef4444' },
            { label: 'Estimated Tax', value: money(result.tax_impact), color: '#b91c1c' },
            { label: 'Inflation Drag', value: money(result.inflation_impact), color: '#f59e0b' },
        ]
        : [];

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#2563eb']} style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Returns Calculator</Text>
                <Text style={styles.headerSub}>Include dividends, inflation, and trading costs</Text>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Investment Inputs</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Symbol (optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={symbol}
                            onChangeText={setSymbol}
                            placeholder="AAPL"
                            autoCapitalize="characters"
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.inputLabel}>Shares</Text>
                            <TextInput style={styles.input} value={shares} onChangeText={setShares} keyboardType="numeric" />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.inputLabel}>Purchase Date</Text>
                            <TextInput style={styles.input} value={purchaseDate} onChangeText={setPurchaseDate} placeholder="YYYY-MM-DD" />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.inputLabel}>Buy Price</Text>
                            <TextInput style={styles.input} value={purchasePrice} onChangeText={setPurchasePrice} keyboardType="numeric" />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.inputLabel}>Current Price</Text>
                            <TextInput style={styles.input} value={currentPrice} onChangeText={setCurrentPrice} keyboardType="numeric" />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.inputLabel}>Dividends Received</Text>
                            <TextInput style={styles.input} value={dividends} onChangeText={setDividends} keyboardType="numeric" />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.inputLabel}>Inflation %</Text>
                            <TextInput style={styles.input} value={inflationRate} onChangeText={setInflationRate} keyboardType="numeric" />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.inputLabel}>Transaction Cost %</Text>
                            <TextInput style={styles.input} value={transactionCostRate} onChangeText={setTransactionCostRate} keyboardType="numeric" />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.inputLabel}>Capital Gains Tax %</Text>
                            <TextInput style={styles.input} value={capitalGainsTaxRate} onChangeText={setCapitalGainsTaxRate} keyboardType="numeric" />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.inputLabel}>Fixed Cost</Text>
                            <TextInput style={styles.input} value={fixedCost} onChangeText={setFixedCost} keyboardType="numeric" />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.inputLabel}> </Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.calcBtn} onPress={calculate} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Ionicons name="calculator" size={18} color="white" />
                                <Text style={styles.calcBtnText}>Calculate Returns</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {error && (
                    <View style={styles.card}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {result && (
                    <>
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Results Summary</Text>
                            <View style={styles.heroResult}>
                                <View style={styles.heroBox}>
                                    <Text style={styles.heroLabel}>Total Return</Text>
                                    <Text style={[styles.heroValue, { color: result.total_return >= 0 ? '#16a34a' : '#ef4444' }]}>
                                        {money(result.total_return)}
                                    </Text>
                                    <Text style={[styles.heroPct, { color: result.total_return >= 0 ? '#16a34a' : '#ef4444' }]}>
                                        {pct(result.total_return_pct)}
                                    </Text>
                                </View>
                                <View style={styles.heroBox}>
                                    <Text style={styles.heroLabel}>Real Return (Pre-Tax)</Text>
                                    <Text style={[styles.heroValue, { color: result.real_return >= 0 ? '#16a34a' : '#ef4444' }]}>
                                        {money(result.real_return)}
                                    </Text>
                                    <Text style={[styles.heroPct, { color: result.real_return >= 0 ? '#16a34a' : '#ef4444' }]}>
                                        {pct(result.real_return_pct)}
                                    </Text>
                                </View>
                            </View>

                            <View style={[styles.heroResult, { marginTop: 10 }]}>
                                <View style={styles.heroBox}>
                                    <Text style={styles.heroLabel}>After-Tax Return</Text>
                                    <Text style={[styles.heroValue, { color: result.after_tax_return >= 0 ? '#16a34a' : '#ef4444' }]}>
                                        {money(result.after_tax_return)}
                                    </Text>
                                    <Text style={[styles.heroPct, { color: result.after_tax_return >= 0 ? '#16a34a' : '#ef4444' }]}>
                                        {pct(result.after_tax_return_pct)}
                                    </Text>
                                </View>
                                <View style={styles.heroBox}>
                                    <Text style={styles.heroLabel}>Real Take-Home Return</Text>
                                    <Text style={[styles.heroValue, { color: result.real_after_tax_return >= 0 ? '#16a34a' : '#ef4444' }]}>
                                        {money(result.real_after_tax_return)}
                                    </Text>
                                    <Text style={[styles.heroPct, { color: result.real_after_tax_return >= 0 ? '#16a34a' : '#ef4444' }]}>
                                        {pct(result.real_after_tax_return_pct)}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Return Breakdown</Text>
                            <View style={styles.statGrid}>
                                {statCards.map((item) => (
                                    <View key={item.label} style={styles.statCard}>
                                        <Text style={styles.statLabel}>{item.label}</Text>
                                        <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Details</Text>
                            {[
                                ['Purchase Value', money(result.purchase_value)],
                                ['Current Market Value', money(result.market_value)],
                                ['Gross Return', money(result.gross_return)],
                                ['Holding Period', `${result.holding_period_years} years`],
                                ['Annualized Return', pct(result.annualized_return_pct)],
                                ['Real Annualized Return', pct(result.real_annualized_return_pct)],
                                ['After-Tax Annualized Return', pct(result.after_tax_annualized_return_pct)],
                                ['Real Take-Home Annualized Return', pct(result.real_after_tax_annualized_return_pct)],
                            ].map(([label, value]) => (
                                <View key={label} style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>{label}</Text>
                                    <Text style={styles.detailValue}>{value}</Text>
                                </View>
                            ))}
                        </View>

                        {Array.isArray(result.opportunities) && result.opportunities.length > 0 && (
                            <View style={styles.card}>
                                <Text style={styles.sectionTitle}>Opportunities to Improve</Text>
                                {result.opportunities.map((op: any, idx: number) => (
                                    <View key={`${op.title}-${idx}`} style={styles.opportunityCard}>
                                        <View style={styles.opportunityHead}>
                                            <Text style={styles.opportunityTitle}>{op.title}</Text>
                                            <Text style={styles.opportunityImpact}>-{op.impact_pct}%</Text>
                                        </View>
                                        <Text style={styles.opportunityDetail}>{op.detail}</Text>
                                        <Text style={styles.opportunityAction}>Action: {op.action}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                )}

                <View style={{ height: 30 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingHorizontal: 16, paddingTop: 50, paddingBottom: 18 },
    backBtn: { marginBottom: 8 },
    headerTitle: { fontSize: 22, fontWeight: '700', color: 'white' },
    headerSub: { marginTop: 4, fontSize: 13, color: 'rgba(255,255,255,0.82)' },
    card: {
        margin: 16,
        marginBottom: 0,
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
    inputGroup: { marginBottom: 12 },
    inputLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    row: { flexDirection: 'row', gap: 12 },
    calcBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#2563eb',
        borderRadius: 10,
        paddingVertical: 14,
        marginTop: 4,
    },
    calcBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
    errorText: { color: '#ef4444', textAlign: 'center', fontWeight: '600' },
    heroResult: { flexDirection: 'row', gap: 12 },
    heroBox: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        padding: 12,
        alignItems: 'center',
    },
    heroLabel: { fontSize: 12, color: '#64748b', marginBottom: 6 },
    heroValue: { fontSize: 20, fontWeight: '800' },
    heroPct: { fontSize: 13, fontWeight: '700', marginTop: 4 },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statCard: {
        flex: 1,
        minWidth: '47%',
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        padding: 12,
    },
    statLabel: { fontSize: 11, color: '#64748b', marginBottom: 4 },
    statValue: { fontSize: 16, fontWeight: '800' },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    detailLabel: { fontSize: 13, color: '#475569' },
    detailValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
    opportunityCard: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
    },
    opportunityHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    opportunityTitle: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
    opportunityImpact: { fontSize: 12, fontWeight: '700', color: '#b91c1c' },
    opportunityDetail: { fontSize: 12, color: '#334155', marginTop: 6 },
    opportunityAction: { fontSize: 12, color: '#0f766e', marginTop: 6, fontWeight: '600' },
});

export default ReturnsCalculatorScreen;
