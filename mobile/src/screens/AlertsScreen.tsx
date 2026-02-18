import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MarketAlertsResponse, stockAPI } from '../services/api';

const AlertsScreen: React.FC = () => {
    const [alerts, setAlerts] = useState<MarketAlertsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadAlerts();
    }, []);

    useEffect(() => {
        const intervalId = setInterval(() => {
            loadAlerts();
        }, 60000);

        return () => clearInterval(intervalId);
    }, []);

    const loadAlerts = async () => {
        try {
            setLoading(true);
            const response = await stockAPI.getNgxMarketAlerts(undefined, false);
            setAlerts(response);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        try {
            setRefreshing(true);
            const response = await stockAPI.getNgxMarketAlerts(undefined, false);
            setAlerts(response);
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
                <Text style={styles.headerTitle}>Smart Alerts</Text>
                <Text style={styles.headerSubtitle}>Real-time NGX signals and triggers</Text>
            </LinearGradient>

            <View style={styles.section}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#2563eb" />
                        <Text style={styles.loadingText}>Checking alerts...</Text>
                    </View>
                ) : alerts?.locked ? (
                    <View style={styles.lockedCard}>
                        <Ionicons name="lock-closed" size={22} color="#f97316" />
                        <View style={styles.lockedContent}>
                            <Text style={styles.lockedTitle}>Premium alerts locked</Text>
                            <Text style={styles.lockedText}>{alerts.message || 'Upgrade to unlock smart alerts.'}</Text>
                        </View>
                    </View>
                ) : alerts?.alerts.length ? (
                    alerts.alerts.map((alert) => (
                        <View key={`${alert.symbol}-${alert.type}`} style={styles.alertCard}>
                            <View style={styles.alertHeader}>
                                <Text style={styles.alertSymbol}>{alert.symbol.replace('.NG', '')}</Text>
                                <Text style={styles.alertType}>{alert.type.replace('_', ' ')}</Text>
                            </View>
                            <Text style={styles.alertMessage}>{alert.message}</Text>
                        </View>
                    ))
                ) : (
                    <Text style={styles.emptyText}>No alerts triggered today.</Text>
                )}
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
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    loadingText: {
        marginTop: 10,
        color: '#475569',
        fontSize: 14,
    },
    lockedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff7ed',
        borderRadius: 16,
        padding: 16,
    },
    lockedContent: {
        marginLeft: 12,
        flex: 1,
    },
    lockedTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ea580c',
    },
    lockedText: {
        marginTop: 4,
        fontSize: 13,
        color: '#9a3412',
    },
    alertCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    alertHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    alertSymbol: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
    },
    alertType: {
        fontSize: 12,
        fontWeight: '600',
        color: '#2563eb',
        textTransform: 'capitalize',
    },
    alertMessage: {
        fontSize: 14,
        color: '#475569',
    },
    emptyText: {
        fontSize: 14,
        color: '#64748b',
    },
});

export default AlertsScreen;
