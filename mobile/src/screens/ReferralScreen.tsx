import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
    Share, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { stockAPI } from '../services/api';

const ReferralScreen = ({ navigation }: any) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [redeemCode, setRedeemCode] = useState('');
    const [redeemLoading, setRedeemLoading] = useState(false);

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            const res = await stockAPI.getReferralCode();
            setData(res);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const shareCode = async () => {
        if (!data) return;
        try {
            await Share.share({
                message: data.share_message,
                title: 'Join StockVal',
            });
        } catch (e) { console.error(e); }
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e3a5f']} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Invite Friends</Text>
                    <View style={{ width: 36 }} />
                </View>
            </LinearGradient>

            <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Hero Card */}
                <LinearGradient colors={['#2563eb', '#3b82f6']} style={styles.heroCard}>
                    <Text style={styles.heroEmoji}>🎁</Text>
                    <Text style={styles.heroTitle}>Give $10,000, Get $10,000</Text>
                    <Text style={styles.heroDesc}>
                        Invite friends to StockVal. You both get $10,000 in virtual trading cash!
                    </Text>
                </LinearGradient>

                {/* Referral Code */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Your Referral Code</Text>
                    <View style={styles.codeBox}>
                        <Text style={styles.codeText}>{data?.code || '...'}</Text>
                    </View>
                    <TouchableOpacity style={styles.shareBtn} onPress={shareCode}>
                        <Ionicons name="share-social" size={20} color="#fff" />
                        <Text style={styles.shareBtnText}>Share with Friends</Text>
                    </TouchableOpacity>
                </View>

                {/* Stats */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Your Referral Stats</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{data?.total_referrals || 0}</Text>
                            <Text style={styles.statLabel}>Total</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statValue, { color: '#10b981' }]}>{data?.completed || 0}</Text>
                            <Text style={styles.statLabel}>Completed</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statValue, { color: '#f59e0b' }]}>{data?.pending || 0}</Text>
                            <Text style={styles.statLabel}>Pending</Text>
                        </View>
                    </View>
                    <View style={styles.bonusRow}>
                        <Ionicons name="cash" size={20} color="#10b981" />
                        <Text style={styles.bonusText}>
                            Total Bonus Earned: ${(data?.total_bonus_earned || 0).toLocaleString()}
                        </Text>
                    </View>
                </View>

                {/* How It Works */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>How It Works</Text>
                    {[
                        { step: '1', icon: 'share-social', text: 'Share your unique code with friends' },
                        { step: '2', icon: 'person-add', text: 'Friend signs up & enters your code' },
                        { step: '3', icon: 'cash', text: 'You both get $10,000 virtual trading cash!' },
                    ].map((s) => (
                        <View key={s.step} style={styles.stepRow}>
                            <View style={styles.stepCircle}>
                                <Text style={styles.stepNum}>{s.step}</Text>
                            </View>
                            <Ionicons name={s.icon as any} size={20} color="#2563eb" style={{ marginRight: 10 }} />
                            <Text style={styles.stepText}>{s.text}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
    header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    body: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
    heroCard: { borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 16 },
    heroEmoji: { fontSize: 48, marginBottom: 12 },
    heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
    heroDesc: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 8, lineHeight: 20 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 14 },
    codeBox: { backgroundColor: '#f1f5f9', borderRadius: 14, paddingVertical: 18, alignItems: 'center', borderWidth: 2, borderColor: '#2563eb', borderStyle: 'dashed', marginBottom: 14 },
    codeText: { fontSize: 28, fontWeight: '900', color: '#2563eb', letterSpacing: 4 },
    shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14 },
    shareBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', marginLeft: 8 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 },
    statBox: { alignItems: 'center' },
    statValue: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
    statLabel: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    bonusRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', borderRadius: 12, padding: 12 },
    bonusText: { fontSize: 15, fontWeight: '700', color: '#10b981', marginLeft: 8 },
    stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    stepNum: { fontSize: 14, fontWeight: '800', color: '#2563eb' },
    stepText: { fontSize: 14, color: '#334155', flex: 1 },
});

export default ReferralScreen;
