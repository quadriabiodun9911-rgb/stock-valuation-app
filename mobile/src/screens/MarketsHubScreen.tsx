import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    navigation: any;
}

const sections = [
    {
        title: 'Research & Valuation',
        items: [
            { label: 'Quick Valuation', icon: 'calculator', screen: 'Valuation', color: '#2563eb' },
            { label: 'Full Analysis', icon: 'analytics', screen: 'ValuationFull', color: '#0ea5e9' },
            { label: 'AI Screener', icon: 'filter', screen: 'Screener', color: '#8b5cf6' },
            { label: 'Compare Stocks', icon: 'git-compare', screen: 'StockComparison', color: '#7c3aed' },
        ],
    },
    {
        title: 'Charts & Market Insight',
        items: [
            { label: 'Advanced Charts', icon: 'bar-chart', screen: 'EnhancedCharting', color: '#059669' },
            { label: 'News & Sentiment', icon: 'newspaper', screen: 'NewsIntegration', color: '#0891b2' },
            { label: 'Backtesting', icon: 'trending-up', screen: 'Backtesting', color: '#f59e0b' },
            { label: 'Earnings Calendar', icon: 'calendar', screen: 'EarningsCalendar', color: '#ef4444' },
        ],
    },
    {
        title: 'Portfolio & Planning',
        items: [
            { label: 'Dashboard', icon: 'grid', screen: 'Dashboard', color: '#0f172a' },
            { label: 'Portfolio Tracker', icon: 'pie-chart', screen: 'PortfolioTracker', color: '#16a34a' },
            { label: 'Price Alerts', icon: 'notifications', screen: 'PriceAlerts', color: '#dc2626' },
            { label: 'Goal Planner', icon: 'flag', screen: 'GoalPlanner', color: '#2563eb' },
        ],
    },
];

const MarketsHubScreen: React.FC<Props> = ({ navigation }) => {
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.title}>Tools & Shortcuts</Text>
                <Text style={styles.subtitle}>
                    Reach the most useful pages quickly and keep related features together.
                </Text>
            </View>

            {sections.map((section) => (
                <View key={section.title} style={styles.section}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <View style={styles.grid}>
                        {section.items.map((item) => (
                            <TouchableOpacity
                                key={item.screen}
                                style={styles.card}
                                onPress={() => navigation.navigate(item.screen)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.iconWrap, { backgroundColor: `${item.color}15` }]}>
                                    <Ionicons name={item.icon as any} size={22} color={item.color} />
                                </View>
                                <Text style={styles.cardTitle}>{item.label}</Text>
                                <Text style={styles.cardMeta}>Open feature</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            ))}

            <View style={styles.tipBox}>
                <Ionicons name="link" size={18} color="#2563eb" />
                <Text style={styles.tipText}>
                    Stock search, charts, valuation, portfolio, and alerts are now easier to access from one place.
                </Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 18,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        lineHeight: 20,
    },
    section: {
        paddingHorizontal: 16,
        paddingTop: 18,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 12,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    card: {
        width: '48%',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    iconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 4,
    },
    cardMeta: {
        fontSize: 12,
        color: '#64748b',
    },
    tipBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        margin: 16,
        marginBottom: 28,
        backgroundColor: '#eff6ff',
        borderRadius: 14,
        padding: 14,
    },
    tipText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
        color: '#1e3a8a',
    },
});

export default MarketsHubScreen;
