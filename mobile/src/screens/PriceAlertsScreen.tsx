import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../services/api';
import { scheduleAlertNotification } from '../services/notifications';

interface PriceAlert {
    symbol: string;
    target_price: number;
    alert_type: 'above' | 'below';
    created_at?: string;
    triggered?: boolean;
}

interface Props {
    route?: any;
    navigation?: any;
}

const PriceAlertsScreen: React.FC<Props> = ({ route, navigation }) => {
    const [alerts, setAlerts] = useState<PriceAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    const [symbol, setSymbol] = useState('');
    const [targetPrice, setTargetPrice] = useState('');
    const [alertType, setAlertType] = useState<'above' | 'below'>('above');

    useEffect(() => {
        loadAlerts();
    }, []);

    useEffect(() => {
        const incomingSymbol = route?.params?.symbol;
        if (incomingSymbol) {
            setSymbol(String(incomingSymbol).toUpperCase());
            const incomingPrice = route?.params?.currentPrice;
            if (incomingPrice && Number(incomingPrice) > 0) {
                setTargetPrice(String(Number(incomingPrice).toFixed(2)));
            }
            setModalVisible(true);
        }
    }, [route?.params?.symbol]);

    const loadAlerts = async () => {
        try {
            const res = await fetch(`${API_URL}/api/alerts/list`);
            const data = await res.json();
            setAlerts(data.alerts || []);
        } catch (error) {
            console.error('Failed to load alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAlerts();
        setRefreshing(false);
    };

    const handleCreateAlert = async () => {
        const trimmed = symbol.trim().toUpperCase();
        if (!trimmed || !targetPrice) {
            Alert.alert('Missing Fields', 'Enter symbol and target price.');
            return;
        }
        try {
            const res = await fetch(`${API_URL}/api/alerts/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: trimmed,
                    target_price: parseFloat(targetPrice),
                    alert_type: alertType,
                }),
            });
            if (!res.ok) throw new Error('Failed');
            // Confirm to the user and schedule a local notification for this alert
            await scheduleAlertNotification(trimmed, alertType, parseFloat(targetPrice));
            Alert.alert('Created', `Alert set for ${trimmed} ${alertType} $${targetPrice}`);
            setSymbol('');
            setTargetPrice('');
            setModalVisible(false);
            await loadAlerts();
        } catch {
            Alert.alert('Error', 'Failed to create alert.');
        }
    };

    const handleCheckAlerts = async () => {
        try {
            const res = await fetch(`${API_URL}/api/alerts/check-all`, { method: 'POST' });
            const data = await res.json();
            const triggered = data.triggered || [];
            if (triggered.length > 0) {
                Alert.alert('Alerts Triggered!', triggered.map((a: any) => `${a.symbol}: $${a.current_price}`).join('\n'));
            } else {
                Alert.alert('No Alerts', 'No alerts have been triggered.');
            }
            await loadAlerts();
        } catch {
            Alert.alert('Error', 'Failed to check alerts.');
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    {navigation?.canGoBack?.() ? (
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
                            <Ionicons name="arrow-back" size={22} color="#1e293b" />
                        </TouchableOpacity>
                    ) : null}
                    <View>
                        <Text style={styles.headerTitle}>Price Alerts</Text>
                        <Text style={styles.headerSubtitle}>Track targets and get notified faster</Text>
                    </View>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={handleCheckAlerts} style={{ marginRight: 12 }}>
                        <Ionicons name="notifications" size={24} color="#f59e0b" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setModalVisible(true)}>
                        <Ionicons name="add-circle" size={28} color="#2563eb" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={styles.scrollContent}
            >
                {alerts.length > 0 ? (
                    alerts.map((alert, idx) => (
                        <View key={idx} style={[styles.alertCard, alert.triggered && styles.alertTriggered]}>
                            <View>
                                <Text style={styles.alertSymbol}>{alert.symbol}</Text>
                                <Text style={styles.alertInfo}>
                                    Alert when price goes {alert.alert_type} ${alert.target_price.toFixed(2)}
                                </Text>
                            </View>
                            <Ionicons
                                name={alert.triggered ? 'checkmark-circle' : 'time-outline'}
                                size={24}
                                color={alert.triggered ? '#22c55e' : '#94a3b8'}
                            />
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
                        <Text style={styles.emptyText}>No alerts set. Tap + to create one.</Text>
                    </View>
                )}
            </ScrollView>

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Create Price Alert</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Symbol (e.g. AAPL)"
                            value={symbol}
                            onChangeText={setSymbol}
                            autoCapitalize="characters"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Target Price ($)"
                            value={targetPrice}
                            onChangeText={setTargetPrice}
                            keyboardType="decimal-pad"
                        />
                        <View style={styles.typeRow}>
                            <TouchableOpacity
                                style={[styles.typeBtn, alertType === 'above' && styles.typeBtnActive]}
                                onPress={() => setAlertType('above')}
                            >
                                <Ionicons name="trending-up" size={16} color={alertType === 'above' ? '#fff' : '#2563eb'} />
                                <Text style={[styles.typeBtnText, alertType === 'above' && styles.typeBtnTextActive]}>Above</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.typeBtn, alertType === 'below' && styles.typeBtnActive]}
                                onPress={() => setAlertType('below')}
                            >
                                <Ionicons name="trending-down" size={16} color={alertType === 'below' ? '#fff' : '#2563eb'} />
                                <Text style={[styles.typeBtnText, alertType === 'below' && styles.typeBtnTextActive]}>Below</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.addBtn} onPress={handleCreateAlert}>
                                <Text style={styles.addBtnText}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
    headerSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    scrollContent: { padding: 16 },
    alertCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    alertTriggered: { borderLeftWidth: 4, borderLeftColor: '#22c55e' },
    alertSymbol: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
    alertInfo: { fontSize: 13, color: '#64748b', marginTop: 2 },
    emptyState: { alignItems: 'center', paddingVertical: 48 },
    emptyText: { marginTop: 12, color: '#94a3b8', fontSize: 15 },
    modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 },
    modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24 },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: '#1e293b' },
    input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 16 },
    typeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#2563eb', marginHorizontal: 4 },
    typeBtnActive: { backgroundColor: '#2563eb' },
    typeBtnText: { color: '#2563eb', fontWeight: '600', marginLeft: 6 },
    typeBtnTextActive: { color: '#fff' },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
    cancelBtn: { paddingHorizontal: 20, paddingVertical: 10, marginRight: 12 },
    cancelBtnText: { color: '#64748b', fontSize: 16 },
    addBtn: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
    addBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

export default PriceAlertsScreen;
