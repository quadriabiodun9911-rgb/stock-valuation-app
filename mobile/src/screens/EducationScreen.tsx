import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const EducationScreen: React.FC = () => {
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
                <Text style={styles.headerTitle}>Learn & Invest</Text>
                <Text style={styles.headerSubtitle}>Clear lessons for Nigerian investors</Text>
            </LinearGradient>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Start Here</Text>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="compass" size={22} color="#2563eb" />
                        <Text style={styles.cardTitle}>How to use the app</Text>
                    </View>
                    <Text style={styles.cardText}>1. Check NGX signals and top movers.</Text>
                    <Text style={styles.cardText}>2. Review a stock’s signal and intrinsic value.</Text>
                    <Text style={styles.cardText}>3. Track your portfolio performance daily.</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Core Concepts</Text>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="bar-chart" size={22} color="#16a34a" />
                        <Text style={styles.cardTitle}>Intrinsic Value</Text>
                    </View>
                    <Text style={styles.cardText}>Compare market price to intrinsic value to see if a stock is undervalued or overvalued.</Text>
                </View>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="pulse" size={22} color="#f97316" />
                        <Text style={styles.cardTitle}>Signals & Trends</Text>
                    </View>
                    <Text style={styles.cardText}>Signals summarize fundamentals and technicals into Buy / Watch / Avoid guidance.</Text>
                </View>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="shield-checkmark" size={22} color="#7c3aed" />
                        <Text style={styles.cardTitle}>Risk Management</Text>
                    </View>
                    <Text style={styles.cardText}>Use diversification, position sizing, and stop levels to manage downside risk.</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>NGX Focus</Text>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="flag" size={22} color="#0ea5e9" />
                        <Text style={styles.cardTitle}>Local Market Insight</Text>
                    </View>
                    <Text style={styles.cardText}>Track NGX gainers, losers, and sector performance to understand market rotation.</Text>
                </View>
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
        paddingTop: 56,
        paddingHorizontal: 24,
        paddingBottom: 28,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerTitle: {
        color: '#f8fafc',
        fontSize: 22,
        fontWeight: '700',
    },
    headerSubtitle: {
        color: '#cbd5f5',
        marginTop: 6,
        fontSize: 14,
    },
    section: {
        paddingHorizontal: 20,
        paddingTop: 22,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 12,
    },
    card: {
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
    },
    cardText: {
        fontSize: 14,
        color: '#475569',
        marginBottom: 4,
    },
});

export default EducationScreen;
