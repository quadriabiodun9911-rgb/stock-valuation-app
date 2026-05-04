import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { stockAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SocialFeedScreen from './SocialFeedScreen';
import ChatScreen from './ChatScreen';

type CrowdTab = 'social' | 'intelligence' | 'chat';

const IntelligenceScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<CrowdTab>('social');
    const [loading, setLoading] = useState(true);

    // Trade reason submission
    const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy');
    const [tradeSymbol, setTradeSymbol] = useState('');
    const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
    const [tradeNote, setTradeNote] = useState('');
    const [tradeConfidence, setTradeConfidence] = useState(3);
    const [buyTags, setBuyTags] = useState<string[]>([]);
    const [sellTags, setSellTags] = useState<string[]>([]);

    // Crowd lookup
    const [summarySymbol, setSummarySymbol] = useState('');
    const [tradeSummary, setTradeSummary] = useState<any>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);

    // Trending & feed
    const [trending, setTrending] = useState<any[]>([]);
    const [feed, setFeed] = useState<any[]>([]);

    useEffect(() => {
        loadData();
        const id = setInterval(loadData, 300000);
        return () => clearInterval(id);
    }, []);

    const loadData = async () => {
        try {
            const [tagsData, trendingData, feedData] = await Promise.all([
                stockAPI.getTradeReasonTags(),
                stockAPI.getTrendingTradeReasons(10),
                stockAPI.getTradeReasonFeed(20),
            ]);
            setBuyTags(tagsData.buy || []);
            setSellTags(tagsData.sell || []);
            setTrending(trendingData.trending || []);
            setFeed(feedData.feed || []);
        } catch (e) {
            console.error('Intelligence load error:', e);
        } finally {
            setLoading(false);
        }
    };

    const toggleReason = (reason: string) => {
        setSelectedReasons((prev) =>
            prev.includes(reason) ? prev.filter((r) => r !== reason) : prev.length < 5 ? [...prev, reason] : prev
        );
    };

    const handleSubmitReason = async () => {
        const trimmed = tradeSymbol.trim().toUpperCase();
        if (!trimmed) { Alert.alert('Missing symbol', 'Enter a stock symbol.'); return; }
        if (!selectedReasons.length) { Alert.alert('Select reasons', 'Pick at least one reason.'); return; }
        try {
            await stockAPI.submitTradeReason({
                symbol: trimmed, action: tradeAction, reasons: selectedReasons,
                note: tradeNote || undefined, confidence: tradeConfidence,
            });
            Alert.alert('Saved', `Your ${tradeAction} reasoning for ${trimmed} has been recorded.`);
            setTradeSymbol(''); setSelectedReasons([]); setTradeNote(''); setTradeConfidence(3);
            const [t, f] = await Promise.all([stockAPI.getTrendingTradeReasons(10), stockAPI.getTradeReasonFeed(20)]);
            setTrending(t.trending); setFeed(f.feed);
        } catch { Alert.alert('Error', 'Failed to save reasoning.'); }
    };

    const handleLookupSummary = async () => {
        const trimmed = summarySymbol.trim().toUpperCase();
        if (!trimmed) return;
        try {
            setSummaryLoading(true);
            setTradeSummary(await stockAPI.getTradeReasonSummary(trimmed));
        } catch { Alert.alert('Error', 'Failed to load reasoning for that symbol.'); }
        finally { setSummaryLoading(false); }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    const renderTab = (tab: CrowdTab, icon: string, label: string) => (
        <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
        >
            <Ionicons name={icon as any} size={18} color={activeTab === tab ? '#2563eb' : '#94a3b8'} />
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>{label}</Text>
        </TouchableOpacity>
    );

    const TabHeader = () => (
        <>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.headerTitle}>Community</Text>
                    {user?.username && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
                            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{user.username[0].toUpperCase()}</Text>
                            </View>
                            <Text style={{ color: '#2563eb', fontWeight: '600', fontSize: 13 }}>@{user.username}</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.headerSub}>Connect with traders</Text>
            </View>
            <View style={styles.tabBar}>
                {renderTab('social', 'logo-twitter', 'Feed')}
                {renderTab('intelligence', 'analytics', 'Intelligence')}
                {renderTab('chat', 'chatbubbles', 'Chat')}
            </View>
        </>
    );

    if (activeTab === 'social') {
        return (
            <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
                <TabHeader />
                <SocialFeedScreen navigation={navigation} />
            </View>
        );
    }

    if (activeTab === 'chat') {
        return (
            <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
                <TabHeader />
                <ChatScreen navigation={navigation} />
            </View>
        );
    }

    // ── Intelligence tab (original content) ──
    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <TabHeader />

                {/* ── Submit Trade Reasoning ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Share Your Trade Reasoning</Text>

                    <View style={styles.toggleRow}>
                        <TouchableOpacity
                            style={[styles.toggle, tradeAction === 'buy' && styles.toggleBuyActive]}
                            onPress={() => { setTradeAction('buy'); setSelectedReasons([]); }}
                        >
                            <Ionicons name="trending-up" size={16} color={tradeAction === 'buy' ? '#fff' : '#16a34a'} />
                            <Text style={[styles.toggleLabel, tradeAction === 'buy' && styles.toggleLabelActive]}>Buy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggle, tradeAction === 'sell' && styles.toggleSellActive]}
                            onPress={() => { setTradeAction('sell'); setSelectedReasons([]); }}
                        >
                            <Ionicons name="trending-down" size={16} color={tradeAction === 'sell' ? '#fff' : '#dc2626'} />
                            <Text style={[styles.toggleLabel, tradeAction === 'sell' && styles.toggleLabelActive]}>Sell</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.card}>
                        <TextInput style={styles.input} placeholder="Stock symbol (e.g., AAPL)" value={tradeSymbol}
                            onChangeText={setTradeSymbol} autoCapitalize="characters" />

                        <Text style={styles.subLabel}>Select reasons (up to 5)</Text>
                        <View style={styles.tagWrap}>
                            {(tradeAction === 'buy' ? buyTags : sellTags).map((tag) => (
                                <TouchableOpacity key={tag}
                                    style={[styles.tag, selectedReasons.includes(tag) && (tradeAction === 'buy' ? styles.tagBuy : styles.tagSell)]}
                                    onPress={() => toggleReason(tag)}>
                                    <Text style={[styles.tagText, selectedReasons.includes(tag) && styles.tagTextActive]}>{tag}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.subLabel}>Confidence</Text>
                        <View style={styles.confRow}>
                            {[1, 2, 3, 4, 5].map((l) => (
                                <TouchableOpacity key={l} onPress={() => setTradeConfidence(l)}
                                    style={[styles.confDot, tradeConfidence >= l && styles.confDotActive]}>
                                    <Text style={[styles.confNum, tradeConfidence >= l && styles.confNumActive]}>{l}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput style={[styles.input, { minHeight: 48 }]} placeholder="Brief note (optional)"
                            value={tradeNote} onChangeText={setTradeNote} maxLength={280} multiline />

                        <TouchableOpacity style={[styles.btn, tradeAction === 'sell' && { backgroundColor: '#dc2626' }]}
                            onPress={handleSubmitReason}>
                            <Ionicons name="send" size={16} color="#fff" />
                            <Text style={styles.btnText}>Submit {tradeAction === 'buy' ? 'Buy' : 'Sell'} Reasoning</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Crowd Lookup ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Crowd Reasoning Lookup</Text>
                    <View style={styles.card}>
                        <TextInput style={styles.input} placeholder="Stock symbol (e.g., AAPL)" value={summarySymbol}
                            onChangeText={setSummarySymbol} autoCapitalize="characters" />
                        <TouchableOpacity style={styles.btn} onPress={handleLookupSummary}>
                            <Ionicons name="bar-chart" size={16} color="#fff" />
                            <Text style={styles.btnText}>See Why People Trade This</Text>
                        </TouchableOpacity>

                        {summaryLoading && <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 12 }} />}

                        {tradeSummary && (
                            <View style={styles.summaryWrap}>
                                <Text style={styles.subLabel}>{tradeSummary.symbol} — {tradeSummary.total_submissions} submissions</Text>
                                <View style={styles.sentimentBar}>
                                    <View style={[styles.sentBuy, { flex: tradeSummary.buy.count || 0.1 }]} />
                                    <View style={[styles.sentSell, { flex: tradeSummary.sell.count || 0.1 }]} />
                                </View>
                                <View style={styles.row}>
                                    <Text style={styles.green}>{tradeSummary.buy.count} buy</Text>
                                    <Text style={styles.red}>{tradeSummary.sell.count} sell</Text>
                                </View>

                                {tradeSummary.buy.top_reasons.length > 0 && (
                                    <>
                                        <Text style={styles.subLabel}>Top Buy Reasons</Text>
                                        {tradeSummary.buy.top_reasons.slice(0, 5).map((r: any) => (
                                            <View key={r.reason} style={styles.row}>
                                                <Text style={styles.label}>{r.reason}</Text>
                                                <Text style={styles.green}>{r.pct}%</Text>
                                            </View>
                                        ))}
                                    </>
                                )}
                                {tradeSummary.sell.top_reasons.length > 0 && (
                                    <>
                                        <Text style={styles.subLabel}>Top Sell Reasons</Text>
                                        {tradeSummary.sell.top_reasons.slice(0, 5).map((r: any) => (
                                            <View key={r.reason} style={styles.row}>
                                                <Text style={styles.label}>{r.reason}</Text>
                                                <Text style={styles.red}>{r.pct}%</Text>
                                            </View>
                                        ))}
                                    </>
                                )}
                            </View>
                        )}
                    </View>
                </View>

                {/* ── Trending ── */}
                {trending.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            <Ionicons name="flame" size={18} color="#f97316" /> Trending
                        </Text>
                        <View style={styles.card}>
                            {trending.map((t) => (
                                <View key={t.symbol} style={styles.row}>
                                    <Text style={styles.label}>{t.symbol}</Text>
                                    <Text style={styles.green}>{t.buy} buy</Text>
                                    <Text style={styles.red}>{t.sell} sell</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* ── Live Feed ── */}
                {feed.length > 0 && (
                    <View style={[styles.section, { marginBottom: 40 }]}>
                        <Text style={styles.sectionTitle}>Live Feed</Text>
                        <View style={styles.card}>
                            {feed.slice(0, 10).map((entry, idx) => (
                                <View key={idx} style={styles.feedItem}>
                                    <View style={styles.row}>
                                        <Text style={styles.label}>{entry.symbol}</Text>
                                        <Text style={entry.action === 'buy' ? styles.green : styles.red}>
                                            {entry.action.toUpperCase()}
                                        </Text>
                                        <Text style={styles.feedTime}>{new Date(entry.timestamp).toLocaleDateString()}</Text>
                                    </View>
                                    <Text style={styles.feedReasons}>{entry.reasons.join(', ')}</Text>
                                    {entry.note ? <Text style={styles.feedNote}>"{entry.note}"</Text> : null}
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
    loadingText: { marginTop: 12, color: '#475569', fontSize: 14, fontWeight: '600' },

    header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#fff' },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
    headerSub: { fontSize: 14, color: '#94a3b8', marginTop: 4 },

    // Tab bar
    tabBar: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 8, paddingBottom: 8, gap: 4, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f8fafc' },
    tabItemActive: { backgroundColor: '#eff6ff' },
    tabLabel: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
    tabLabelActive: { color: '#2563eb' },

    section: { paddingHorizontal: 16, paddingTop: 16 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
    subLabel: { fontSize: 13, fontWeight: '700', color: '#1e293b', marginTop: 10, marginBottom: 6 },

    card: { backgroundColor: '#fff', padding: 16, borderRadius: 14, gap: 8 },
    input: { backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a' },

    toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    toggle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f1f5f9' },
    toggleBuyActive: { backgroundColor: '#16a34a' },
    toggleSellActive: { backgroundColor: '#dc2626' },
    toggleLabel: { fontSize: 14, fontWeight: '700', color: '#475569' },
    toggleLabelActive: { color: '#fff' },

    tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    tagBuy: { backgroundColor: '#dcfce7', borderColor: '#16a34a' },
    tagSell: { backgroundColor: '#fee2e2', borderColor: '#dc2626' },
    tagText: { fontSize: 12, color: '#475569', fontWeight: '600' },
    tagTextActive: { color: '#0f172a' },

    confRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    confDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    confDotActive: { backgroundColor: '#2563eb' },
    confNum: { fontSize: 14, fontWeight: '700', color: '#475569' },
    confNumActive: { color: '#fff' },

    btn: { marginTop: 4, backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
    label: { fontSize: 14, color: '#475569', fontWeight: '600', flex: 1 },
    green: { fontSize: 14, color: '#16a34a', fontWeight: '700' },
    red: { fontSize: 14, color: '#dc2626', fontWeight: '700' },

    summaryWrap: { marginTop: 12 },
    sentimentBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginVertical: 8 },
    sentBuy: { backgroundColor: '#16a34a' },
    sentSell: { backgroundColor: '#dc2626' },

    feedItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    feedTime: { fontSize: 12, color: '#94a3b8' },
    feedReasons: { fontSize: 12, color: '#475569', marginTop: 2 },
    feedNote: { fontSize: 12, fontStyle: 'italic', color: '#64748b', marginTop: 2 },
});

export default IntelligenceScreen;
