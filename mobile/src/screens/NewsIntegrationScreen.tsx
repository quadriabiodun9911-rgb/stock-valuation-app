import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../services/api';

interface NewsArticle {
    title: string;
    summary?: string;
    source?: string;
    url?: string;
    published?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
}

const NewsIntegrationScreen: React.FC = () => {
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [symbol, setSymbol] = useState('');
    const [activeTab, setActiveTab] = useState<'market' | 'stock'>('market');

    useEffect(() => {
        loadMarketNews();
    }, []);

    const loadMarketNews = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/news/market-news`);
            const data = await res.json();
            setNews(data.articles || data.news || []);
        } catch (error) {
            console.error('Failed to load news:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStockNews = async () => {
        const trimmed = symbol.trim().toUpperCase();
        if (!trimmed) return;
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/news/stock/${trimmed}`);
            const data = await res.json();
            setNews(data.articles || data.news || []);
        } catch (error) {
            console.error('Failed to load stock news:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        if (activeTab === 'market') {
            await loadMarketNews();
        } else {
            await loadStockNews();
        }
        setRefreshing(false);
    };

    const sentimentColor = (s?: string) => {
        if (s === 'positive') return '#22c55e';
        if (s === 'negative') return '#ef4444';
        return '#94a3b8';
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>News</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'market' && styles.activeTab]}
                    onPress={() => { setActiveTab('market'); loadMarketNews(); }}
                >
                    <Text style={[styles.tabText, activeTab === 'market' && styles.activeTabText]}>Market</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'stock' && styles.activeTab]}
                    onPress={() => setActiveTab('stock')}
                >
                    <Text style={[styles.tabText, activeTab === 'stock' && styles.activeTabText]}>By Stock</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'stock' && (
                <View style={styles.searchRow}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Enter symbol (e.g. AAPL)"
                        value={symbol}
                        onChangeText={setSymbol}
                        autoCapitalize="characters"
                        onSubmitEditing={loadStockNews}
                    />
                    <TouchableOpacity style={styles.searchBtn} onPress={loadStockNews}>
                        <Ionicons name="search" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    contentContainerStyle={styles.scrollContent}
                >
                    {news.length > 0 ? (
                        news.map((article, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={styles.newsCard}
                                onPress={() => article.url && Linking.openURL(article.url)}
                            >
                                <View style={styles.newsHeader}>
                                    <Text style={styles.newsTitle} numberOfLines={2}>{article.title}</Text>
                                    {article.sentiment && (
                                        <View style={[styles.sentimentBadge, { backgroundColor: sentimentColor(article.sentiment) + '20' }]}>
                                            <Text style={[styles.sentimentText, { color: sentimentColor(article.sentiment) }]}>
                                                {article.sentiment}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                {article.summary && (
                                    <Text style={styles.newsSummary} numberOfLines={3}>{article.summary}</Text>
                                )}
                                <View style={styles.newsMeta}>
                                    {article.source && <Text style={styles.newsSource}>{article.source}</Text>}
                                    {article.published && <Text style={styles.newsDate}>{article.published}</Text>}
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="newspaper-outline" size={48} color="#ccc" />
                            <Text style={styles.emptyText}>No news articles found.</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 16, paddingTop: 50, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
    tabs: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: '#2563eb' },
    tabText: { fontSize: 15, color: '#64748b', fontWeight: '600' },
    activeTabText: { color: '#2563eb' },
    searchRow: { flexDirection: 'row', padding: 12, backgroundColor: '#fff' },
    searchInput: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, marginRight: 8 },
    searchBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
    scrollContent: { padding: 16 },
    newsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    newsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    newsTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', flex: 1, marginRight: 8 },
    sentimentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    sentimentText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
    newsSummary: { fontSize: 13, color: '#64748b', marginTop: 8, lineHeight: 18 },
    newsMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    newsSource: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
    newsDate: { fontSize: 12, color: '#94a3b8' },
    emptyState: { alignItems: 'center', paddingVertical: 48 },
    emptyText: { marginTop: 12, color: '#94a3b8', fontSize: 15 },
});

export default NewsIntegrationScreen;
