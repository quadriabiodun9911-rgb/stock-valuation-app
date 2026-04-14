import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { stockAPI } from '../services/api';

const { width: SCREEN_W } = Dimensions.get('window');

const CATEGORY_ICONS: Record<string, string> = {
    trading: 'trending-up', performance: 'trophy', portfolio: 'briefcase',
    research: 'search', social: 'people', engagement: 'flame',
};

const AchievementsScreen = ({ navigation }: any) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        loadAchievements();
    }, []);

    const loadAchievements = async () => {
        try {
            const res = await stockAPI.getAchievements();
            setData(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    const categories = ['all', ...new Set(data?.achievements?.map((a: any) => a.category) || [])];
    const filtered = filter === 'all'
        ? data?.achievements || []
        : (data?.achievements || []).filter((a: any) => a.category === filter);

    const progress = data ? (data.unlocked_count / data.total_count * 100) : 0;

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e3a5f']} style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Achievements</Text>
                    <View style={{ width: 36 }} />
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{data?.total_points || 0}</Text>
                        <Text style={styles.statLabel}>Points</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{data?.unlocked_count || 0}/{data?.total_count || 0}</Text>
                        <Text style={styles.statLabel}>Unlocked</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>🔥 {data?.current_streak || 0}</Text>
                        <Text style={styles.statLabel}>Streak</Text>
                    </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressText}>{progress.toFixed(0)}% Complete</Text>
            </LinearGradient>

            {/* Category Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16 }}>
                {categories.map((c: string) => (
                    <TouchableOpacity
                        key={c}
                        style={[styles.filterPill, filter === c && styles.filterPillActive]}
                        onPress={() => setFilter(c)}
                    >
                        <Text style={[styles.filterText, filter === c && styles.filterTextActive]}>
                            {c.charAt(0).toUpperCase() + c.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Newly Awarded */}
            {data?.newly_awarded?.length > 0 && (
                <View style={styles.newBanner}>
                    <Ionicons name="sparkles" size={18} color="#f59e0b" />
                    <Text style={styles.newBannerText}>
                        New: {data.newly_awarded.map((id: string) =>
                            data.achievements.find((a: any) => a.id === id)?.name
                        ).join(', ')}!
                    </Text>
                </View>
            )}

            <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 40 }}>
                {filtered.map((a: any) => (
                    <View key={a.id} style={[styles.achievementCard, !a.unlocked && styles.lockedCard]}>
                        <View style={[styles.iconCircle, a.unlocked && styles.iconCircleUnlocked]}>
                            <Text style={styles.emoji}>{a.icon}</Text>
                        </View>
                        <View style={styles.achievementInfo}>
                            <View style={styles.achievementHeader}>
                                <Text style={[styles.achievementName, !a.unlocked && styles.lockedText]}>{a.name}</Text>
                                <View style={styles.pointsBadge}>
                                    <Text style={styles.pointsText}>{a.points} pts</Text>
                                </View>
                            </View>
                            <Text style={styles.achievementDesc}>{a.description}</Text>
                            {a.unlocked && a.unlocked_at && (
                                <Text style={styles.unlockedDate}>
                                    Unlocked {new Date(a.unlocked_at).toLocaleDateString()}
                                </Text>
                            )}
                        </View>
                        {a.unlocked ? (
                            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                        ) : (
                            <Ionicons name="lock-closed" size={20} color="#94a3b8" />
                        )}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
    header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
    statBox: { alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
    statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
    progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 3 },
    progressText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 6 },
    filterRow: { marginVertical: 12 },
    filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e2e8f0', marginRight: 8 },
    filterPillActive: { backgroundColor: '#2563eb' },
    filterText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
    filterTextActive: { color: '#fff' },
    newBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', marginHorizontal: 16, padding: 12, borderRadius: 12, marginBottom: 8 },
    newBannerText: { fontSize: 14, fontWeight: '600', color: '#92400e', marginLeft: 8, flex: 1 },
    list: { flex: 1, paddingHorizontal: 16 },
    achievementCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    lockedCard: { opacity: 0.6 },
    iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    iconCircleUnlocked: { backgroundColor: '#ecfdf5' },
    emoji: { fontSize: 22 },
    achievementInfo: { flex: 1 },
    achievementHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    achievementName: { fontSize: 15, fontWeight: '700', color: '#0f172a', flex: 1 },
    lockedText: { color: '#94a3b8' },
    pointsBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    pointsText: { fontSize: 11, fontWeight: '700', color: '#2563eb' },
    achievementDesc: { fontSize: 13, color: '#64748b', marginTop: 2 },
    unlockedDate: { fontSize: 11, color: '#10b981', marginTop: 4 },
});

export default AchievementsScreen;
