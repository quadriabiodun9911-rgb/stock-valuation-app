import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { stockAPI } from '../services/api';

const EarningsCalendarScreen = ({ navigation }: any) => {
    const [earnings, setEarnings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [days, setDays] = useState(14);

    useEffect(() => { load(); }, [days]);

    const load = async () => {
        try {
            const res = await stockAPI.getEarningsCalendar(days);
            setEarnings(res.earnings || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    const groupByDate = () => {
        const groups: Record<string, any[]> = {};
        earnings.forEach(e => {
            if (!groups[e.date]) groups[e.date] = [];
            groups[e.date].push(e);
        });
        return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
    }

    const grouped = groupByDate();

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e3a5f']} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Earnings Calendar</Text>
                    <View style={{ width: 36 }} />
                </View>
                <Text style={styles.headerSub}>
                    {earnings.length} upcoming earnings in next {days} days
                </Text>
            </LinearGradient>

            {/* Period Filter */}
            <View style={styles.filterRow}>
                {[7, 14, 30, 60].map(d => (
                    <TouchableOpacity
                        key={d}
                        style={[styles.filterPill, days === d && styles.filterActive]}
                        onPress={() => { setDays(d); setLoading(true); }}
                    >
                        <Text style={[styles.filterText, days === d && styles.filterTextActive]}>{d}d</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                style={styles.list}
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
            >
                {grouped.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
                        <Text style={styles.emptyTitle}>No Earnings Coming Up</Text>
                        <Text style={styles.emptyDesc}>
                            Add stocks to your portfolio or watchlist to see their earnings dates here.
                        </Text>
                    </View>
                ) : grouped.map(([date, items]) => {
                    const d = new Date(date + 'T00:00:00');
                    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const daysUntil = items[0]?.days_until || 0;

                    return (
                        <View key={date}>
                            <View style={styles.dateHeader}>
                                <View>
                                    <Text style={styles.dateDay}>{dayName}</Text>
                                    <Text style={styles.dateText}>{monthDay}</Text>
                                </View>
                                <View style={[styles.countdownBadge, daysUntil <= 2 && styles.countdownSoon]}>
                                    <Text style={[styles.countdownText, daysUntil <= 2 && styles.countdownTextSoon]}>
                                        {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                                    </Text>
                                </View>
                            </View>
                            {items.map((e: any, i: number) => (
                                <TouchableOpacity
                                    key={`${e.symbol}-${i}`}
                                    style={styles.earningCard}
                                    onPress={() => navigation.navigate('StockDetail', { symbol: e.symbol })}
                                >
                                    <View style={styles.symbolCircle}>
                                        <Text style={styles.symbolLetter}>{e.symbol[0]}</Text>
                                    </View>
                                    <View style={styles.earningInfo}>
                                        <Text style={styles.earningSymbol}>{e.symbol}</Text>
                                        <Text style={styles.earningPrice}>${e.price?.toFixed(2)}</Text>
                                    </View>
                                    {e.in_portfolio && (
                                        <View style={styles.ownedBadge}>
                                            <Ionicons name="briefcase" size={12} color="#2563eb" />
                                            <Text style={styles.ownedText}>Owned</Text>
                                        </View>
                                    )}
                                    <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
    header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
    filterRow: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 12, gap: 8 },
    filterPill: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e2e8f0' },
    filterActive: { backgroundColor: '#2563eb' },
    filterText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
    filterTextActive: { color: '#fff' },
    list: { flex: 1, paddingHorizontal: 16 },
    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#64748b', marginTop: 16 },
    emptyDesc: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
    dateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
    dateDay: { fontSize: 12, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' },
    dateText: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
    countdownBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    countdownSoon: { backgroundColor: '#fef2f2' },
    countdownText: { fontSize: 12, fontWeight: '600', color: '#2563eb' },
    countdownTextSoon: { color: '#ef4444' },
    earningCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
    symbolCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    symbolLetter: { fontSize: 16, fontWeight: '800', color: '#2563eb' },
    earningInfo: { flex: 1 },
    earningSymbol: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
    earningPrice: { fontSize: 13, color: '#64748b', marginTop: 2 },
    ownedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 8 },
    ownedText: { fontSize: 11, fontWeight: '600', color: '#2563eb', marginLeft: 4 },
});

export default EarningsCalendarScreen;
