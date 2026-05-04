import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { stockAPI } from '../services/api';

const fmt = (v: number) => `$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

interface LeaderEntry {
    rank: number;
    username: string;
    totalValue: number;
    totalProfit: number;
    profitPct: number;
    tradeCount: number;
    isCurrentUser: boolean;
}

const LeaderboardScreen = ({ navigation }: any) => {
    const { user } = useAuth();
    const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadLeaderboard = useCallback(async () => {
        try {
            // Generate simulated leaderboard data from portfolio
            const portfolio = await stockAPI.getPortfolio();
            const trades = await stockAPI.getTransactions();
            const tradeCount = trades.transactions?.length || 0;

            const simulatedLeaders: LeaderEntry[] = [
                { rank: 1, username: 'WallStreetWolf', totalValue: 156420, totalProfit: 42800, profitPct: 37.7, tradeCount: 89, isCurrentUser: false },
                { rank: 2, username: 'DividendKing', totalValue: 134200, totalProfit: 31500, profitPct: 30.6, tradeCount: 45, isCurrentUser: false },
                { rank: 3, username: 'AlphaSeeker', totalValue: 98700, totalProfit: 22100, profitPct: 28.9, tradeCount: 67, isCurrentUser: false },
                { rank: 4, username: 'ValueHunter', totalValue: 87300, totalProfit: 18400, profitPct: 26.7, tradeCount: 34, isCurrentUser: false },
                { rank: 5, username: user?.username || 'You', totalValue: portfolio.summary.total_equity || 50000, totalProfit: portfolio.summary.total_profit || 5000, profitPct: portfolio.summary.total_profit_pct || 10, tradeCount: tradeCount, isCurrentUser: true },
                { rank: 6, username: 'IndexFanatic', totalValue: 72100, totalProfit: 12300, profitPct: 20.6, tradeCount: 12, isCurrentUser: false },
                { rank: 7, username: 'SwingTrader99', totalValue: 65400, totalProfit: 9800, profitPct: 17.6, tradeCount: 112, isCurrentUser: false },
                { rank: 8, username: 'SafeHaven', totalValue: 54300, totalProfit: 6200, profitPct: 12.9, tradeCount: 23, isCurrentUser: false },
                { rank: 9, username: 'GrowthPick', totalValue: 43200, totalProfit: 3100, profitPct: 7.7, tradeCount: 56, isCurrentUser: false },
                { rank: 10, username: 'NewbieTrader', totalValue: 31500, totalProfit: 1500, profitPct: 5.0, tradeCount: 8, isCurrentUser: false },
            ];

            // Sort by profit percentage and re-rank
            simulatedLeaders.sort((a, b) => b.profitPct - a.profitPct);
            simulatedLeaders.forEach((e, i) => e.rank = i + 1);

            setLeaders(simulatedLeaders);
        } catch {
            // Fallback leaderboard
            setLeaders([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => { loadLeaderboard(); }, []);

    const medalIcon = (rank: number) => {
        if (rank === 1) return { icon: 'trophy', color: '#f59e0b' };
        if (rank === 2) return { icon: 'medal', color: '#94a3b8' };
        if (rank === 3) return { icon: 'medal', color: '#d97706' };
        return null;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e3a5f']} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Leaderboard</Text>
                        <Text style={styles.headerSub}>Top Paper Traders This Month</Text>
                    </View>
                    <View style={styles.trophyBadge}>
                        <Ionicons name="trophy" size={20} color="#f59e0b" />
                    </View>
                </View>

                {/* Top 3 Podium */}
                {leaders.length >= 3 && (
                    <View style={styles.podium}>
                        {[leaders[1], leaders[0], leaders[2]].map((l, i) => {
                            const heights = [90, 110, 75];
                            const sizes = [48, 60, 44];
                            return (
                                <View key={l.username} style={[styles.podiumItem, { marginTop: i === 1 ? 0 : 20 }]}>
                                    <View style={[styles.podiumAvatar, {
                                        width: sizes[i], height: sizes[i], borderRadius: sizes[i] / 2,
                                        borderColor: i === 1 ? '#f59e0b' : '#475569',
                                    }]}>
                                        <Text style={[styles.podiumAvatarText, { fontSize: sizes[i] * 0.35 }]}>
                                            {l.username[0].toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text style={styles.podiumName} numberOfLines={1}>{l.username}</Text>
                                    <Text style={styles.podiumPct}>+{l.profitPct.toFixed(1)}%</Text>
                                    <View style={[styles.podiumBar, { height: heights[i], backgroundColor: i === 1 ? '#f59e0b' : i === 0 ? '#94a3b8' : '#d97706' }]}>
                                        <Text style={styles.podiumRank}>{l.rank}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </LinearGradient>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadLeaderboard(); }} tintColor="#2563eb" />}
            >
                {loading ? (
                    <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
                ) : (
                    leaders.slice(3).map((entry) => (
                        <View key={entry.username}
                            style={[styles.entryCard, entry.isCurrentUser && styles.entryCardYou]}>
                            <Text style={styles.entryRank}>#{entry.rank}</Text>
                            <View style={[styles.entryAvatar, entry.isCurrentUser && { backgroundColor: '#dbeafe' }]}>
                                <Text style={[styles.entryAvatarText, entry.isCurrentUser && { color: '#2563eb' }]}>
                                    {entry.username[0].toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.entryInfo}>
                                <Text style={styles.entryName}>
                                    {entry.username} {entry.isCurrentUser ? '(You)' : ''}
                                </Text>
                                <Text style={styles.entryMeta}>{entry.tradeCount} trades · {fmt(entry.totalValue)}</Text>
                            </View>
                            <View style={[styles.entryPctBadge, {
                                backgroundColor: entry.totalProfit >= 0 ? '#dcfce7' : '#fee2e2'
                            }]}>
                                <Text style={{
                                    fontSize: 13, fontWeight: '800',
                                    color: entry.totalProfit >= 0 ? '#16a34a' : '#ef4444',
                                }}>
                                    +{entry.profitPct.toFixed(1)}%
                                </Text>
                            </View>
                        </View>
                    ))
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { marginRight: 12, padding: 4 },
    headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
    headerSub: { color: '#94a3b8', fontSize: 13, marginTop: 2, fontWeight: '500' },
    trophyBadge: { backgroundColor: 'rgba(245,158,11,0.15)', padding: 10, borderRadius: 14 },

    podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginTop: 24, paddingBottom: 8, gap: 8 },
    podiumItem: { alignItems: 'center', flex: 1 },
    podiumAvatar: { borderWidth: 3, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 6 },
    podiumAvatarText: { color: '#fff', fontWeight: '800' },
    podiumName: { color: '#fff', fontSize: 11, fontWeight: '600', maxWidth: 80 },
    podiumPct: { color: '#16a34a', fontSize: 13, fontWeight: '800', marginTop: 2 },
    podiumBar: { width: '80%', borderTopLeftRadius: 8, borderTopRightRadius: 8, marginTop: 6, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8 },
    podiumRank: { color: '#fff', fontSize: 18, fontWeight: '900' },

    body: { flex: 1, padding: 16 },
    center: { paddingVertical: 60, alignItems: 'center' },

    entryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
    entryCardYou: { borderWidth: 2, borderColor: '#2563eb' },
    entryRank: { fontSize: 14, fontWeight: '800', color: '#64748b', width: 30 },
    entryAvatar: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    entryAvatarText: { fontSize: 15, fontWeight: '800', color: '#334155' },
    entryInfo: { flex: 1 },
    entryName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
    entryMeta: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 2 },
    entryPctBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
});

export default LeaderboardScreen;
