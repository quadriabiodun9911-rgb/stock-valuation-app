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
    navigation: any;
}

const fmt = (n: number): string => {
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
};

const GoalPlannerScreen: React.FC<Props> = ({ navigation }) => {
    const [targetAmount, setTargetAmount] = useState('1000000');
    const [currentSavings, setCurrentSavings] = useState('0');
    const [monthlyContribution, setMonthlyContribution] = useState('500');
    const [annualReturn, setAnnualReturn] = useState('10');
    const [years, setYears] = useState('20');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const calculate = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await stockAPI.calculateGoalPlan({
                targetAmount: parseFloat(targetAmount) || 1000000,
                currentSavings: parseFloat(currentSavings) || 0,
                monthlyContribution: parseFloat(monthlyContribution) || 500,
                annualReturn: parseFloat(annualReturn) || 10,
                years: parseInt(years) || 20,
                inflationRate: 3.0,
            });
            setData(result);
        } catch (e: any) {
            setError(e.message || 'Calculation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1e3a5f', '#2563eb']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                <TouchableOpacity style={{ marginBottom: 8 }} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Goal Planner</Text>
                <Text style={styles.headerSub}>Your path to financial freedom</Text>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Input Form */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Set Your Goal</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Target Amount ($)</Text>
                        <TextInput style={styles.input} value={targetAmount} onChangeText={setTargetAmount} keyboardType="numeric" placeholder="1000000" />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Current Savings ($)</Text>
                        <TextInput style={styles.input} value={currentSavings} onChangeText={setCurrentSavings} keyboardType="numeric" placeholder="0" />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Monthly Contribution ($)</Text>
                        <TextInput style={styles.input} value={monthlyContribution} onChangeText={setMonthlyContribution} keyboardType="numeric" placeholder="500" />
                    </View>
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.inputLabel}>Annual Return (%)</Text>
                            <TextInput style={styles.input} value={annualReturn} onChangeText={setAnnualReturn} keyboardType="numeric" placeholder="10" />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.inputLabel}>Years</Text>
                            <TextInput style={styles.input} value={years} onChangeText={setYears} keyboardType="numeric" placeholder="20" />
                        </View>
                    </View>

                    {/* Quick presets */}
                    <View style={styles.presetRow}>
                        {[
                            { label: '$100K/10yr', t: '100000', y: '10' },
                            { label: '$500K/15yr', t: '500000', y: '15' },
                            { label: '$1M/20yr', t: '1000000', y: '20' },
                            { label: '$5M/30yr', t: '5000000', y: '30' },
                        ].map((p) => (
                            <TouchableOpacity
                                key={p.label}
                                style={styles.presetBtn}
                                onPress={() => { setTargetAmount(p.t); setYears(p.y); }}
                            >
                                <Text style={styles.presetText}>{p.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.calcBtn} onPress={calculate} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Ionicons name="calculator" size={20} color="white" />
                                <Text style={styles.calcBtnText}>Calculate</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {error && (
                    <View style={styles.card}>
                        <Text style={{ color: '#FF3B30', textAlign: 'center' }}>{error}</Text>
                    </View>
                )}

                {data && (
                    <>
                        {/* Result Summary */}
                        <View style={styles.card}>
                            <View style={styles.resultHeader}>
                                <Ionicons
                                    name={data.goalReached ? 'checkmark-circle' : 'alert-circle'}
                                    size={36}
                                    color={data.goalReached ? '#34C759' : '#f59e0b'}
                                />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.resultTitle}>
                                        {data.goalReached
                                            ? `Goal reached in Year ${data.goalYear}!`
                                            : `Shortfall — you'll reach ${fmt(data.finalBalance)}`}
                                    </Text>
                                    <Text style={styles.resultSub}>
                                        {data.goalReached
                                            ? `Final balance: ${fmt(data.finalBalance)}`
                                            : `Need ${fmt(data.requiredMonthly)}/mo to hit ${fmt(data.goalAmount)}`}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Key Numbers */}
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Key Numbers</Text>
                            <View style={styles.gridRow}>
                                <View style={styles.numBox}>
                                    <Text style={styles.numLabel}>You Contribute</Text>
                                    <Text style={styles.numValue}>{fmt(data.totalContributed)}</Text>
                                </View>
                                <View style={styles.numBox}>
                                    <Text style={styles.numLabel}>Market Earns</Text>
                                    <Text style={[styles.numValue, { color: '#34C759' }]}>{fmt(data.totalEarnings)}</Text>
                                </View>
                            </View>
                            <View style={[styles.gridRow, { marginTop: 8 }]}>
                                <View style={styles.numBox}>
                                    <Text style={styles.numLabel}>Monthly Need</Text>
                                    <Text style={styles.numValue}>${data.requiredMonthly?.toLocaleString()}</Text>
                                </View>
                                <View style={styles.numBox}>
                                    <Text style={styles.numLabel}>Real Return</Text>
                                    <Text style={styles.numValue}>{data.assumptions?.realReturn}%/yr</Text>
                                </View>
                            </View>
                        </View>

                        {/* Passive Income (4% Rule) */}
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Passive Income (4% Rule)</Text>
                            <Text style={styles.passiveNote}>
                                At your goal of {fmt(data.goalAmount)}, you could withdraw:
                            </Text>
                            <View style={styles.gridRow}>
                                <View style={[styles.numBox, { backgroundColor: '#f0fdf4' }]}>
                                    <Text style={styles.numLabel}>Monthly</Text>
                                    <Text style={[styles.numValue, { color: '#059669' }]}>${data.passiveIncome?.monthly?.toLocaleString()}</Text>
                                </View>
                                <View style={[styles.numBox, { backgroundColor: '#f0fdf4' }]}>
                                    <Text style={styles.numLabel}>Annually</Text>
                                    <Text style={[styles.numValue, { color: '#059669' }]}>${data.passiveIncome?.annual?.toLocaleString()}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Milestones */}
                        {data.milestones?.length > 0 && (
                            <View style={styles.card}>
                                <Text style={styles.sectionTitle}>Milestones</Text>
                                {data.milestones.map((m: any) => (
                                    <View key={m.percent} style={styles.milestoneRow}>
                                        <View style={[styles.milestoneDot, { backgroundColor: m.percent === 100 ? '#34C759' : '#2563eb' }]} />
                                        <Text style={styles.milestoneText}>
                                            {m.percent}% — {fmt(m.amount)} in Year {m.year}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Year-by-Year Table */}
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Year-by-Year Projection</Text>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tCell, { flex: 0.5 }]}>Yr</Text>
                                <Text style={styles.tCell}>Balance</Text>
                                <Text style={styles.tCell}>Contributed</Text>
                                <Text style={styles.tCell}>Earnings</Text>
                            </View>
                            {data.yearlyProjection?.filter((_: any, i: number) => i % (data.yearlyProjection.length > 15 ? 2 : 1) === 0 || i === data.yearlyProjection.length - 1).map((y: any) => (
                                <View key={y.year} style={[styles.tableRow, y.balance >= data.goalAmount && { backgroundColor: '#f0fdf4' }]}>
                                    <Text style={[styles.tCell, { flex: 0.5, fontWeight: '600' }]}>{y.year}</Text>
                                    <Text style={[styles.tCell, { fontWeight: '600' }]}>{fmt(y.balance)}</Text>
                                    <Text style={styles.tCell}>{fmt(y.contributed)}</Text>
                                    <Text style={[styles.tCell, { color: '#34C759' }]}>{fmt(y.earnings)}</Text>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                <View style={{ height: 30 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: { paddingHorizontal: 16, paddingVertical: 16, paddingTop: 50 },
    headerTitle: { fontSize: 22, fontWeight: '700', color: 'white' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    card: { margin: 16, marginBottom: 0, padding: 16, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
    inputGroup: { marginBottom: 12 },
    inputLabel: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 4 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
    row: { flexDirection: 'row', gap: 12 },
    presetRow: { flexDirection: 'row', gap: 6, marginTop: 4, marginBottom: 12 },
    presetBtn: { flex: 1, paddingVertical: 6, backgroundColor: '#eff6ff', borderRadius: 6, alignItems: 'center' },
    presetText: { fontSize: 11, fontWeight: '600', color: '#2563eb' },
    calcBtn: { flexDirection: 'row', backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 8 },
    calcBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
    resultHeader: { flexDirection: 'row', alignItems: 'center' },
    resultTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
    resultSub: { fontSize: 13, color: '#666', marginTop: 4 },
    gridRow: { flexDirection: 'row', gap: 8 },
    numBox: { flex: 1, backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, alignItems: 'center' },
    numLabel: { fontSize: 10, color: '#999', marginBottom: 4 },
    numValue: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
    passiveNote: { fontSize: 12, color: '#666', marginBottom: 12 },
    milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    milestoneDot: { width: 12, height: 12, borderRadius: 6 },
    milestoneText: { fontSize: 13, color: '#555' },
    tableHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    tableRow: { flexDirection: 'row', paddingVertical: 8 },
    tCell: { flex: 1, fontSize: 12, color: '#555', textAlign: 'center' },
});

export default GoalPlannerScreen;
