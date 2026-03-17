import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../services/api';

const PriceAlertsScreen = () => {
  const [alerts, setAlerts] = useState([]);
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [alertType, setAlertType] = useState('above');
  const [newAlert, setNewAlert] = useState({
    symbol: '',
    target_price: '',
  });
  const [activeTab, setActiveTab] = useState('active');

  useFocusEffect(
    React.useCallback(() => {
      loadAlerts();
      const interval = setInterval(checkAlerts, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }, [])
  );

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/alerts/list`);
      setAlerts(response.data.alerts || []);
      checkAlerts();
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAlerts = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/alerts/check-all`);
      setTriggeredAlerts(response.data.triggered_alerts || []);

      // Show notification if alerts triggered
      if (response.data.triggered_alerts && response.data.triggered_alerts.length > 0) {
        Alert.alert(
          'Price Alert Triggered',
          `${response.data.triggered_alerts.length} alert(s) triggered`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadAlerts();
    setRefreshing(false);
  }, []);

  const createAlert = async () => {
    if (!newAlert.symbol || !newAlert.target_price) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      const alert = {
        symbol: newAlert.symbol.toUpperCase(),
        target_price: parseFloat(newAlert.target_price),
        alert_type: alertType,
        enabled: true,
      };

      const response = await axios.post(`${API_URL}/api/alerts/create`, alert);
      setAlerts([...alerts, response.data.alert]);
      setNewAlert({ symbol: '', target_price: '' });
      setModalVisible(false);
      Alert.alert('Success', 'Alert created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create alert');
    }
  };

  const deleteAlert = async (symbol, targetPrice, type) => {
    try {
      await axios.delete(`${API_URL}/api/alerts/delete/${symbol}/${targetPrice}/${type}`);
      setAlerts(alerts.filter((a) => !(a.symbol === symbol && a.target_price === targetPrice && a.alert_type === type)));
      Alert.alert('Success', 'Alert deleted');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete alert');
    }
  };

  const renderActiveAlerts = () => {
    if (alerts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="notifications-off" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No active alerts</Text>
          <Text style={styles.emptySubtext}>Create one to get started</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={alerts}
        keyExtractor={(item, index) => `${item.symbol}-${item.target_price}-${index}`}
        renderItem={({ item }) => (
          <View style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <View style={styles.alertInfo}>
                <Text style={styles.alertSymbol}>{item.symbol}</Text>
                <View
                  style={[
                    styles.alertTypeBadge,
                    { backgroundColor: item.alert_type === 'above' ? '#E3F2FD' : '#FCE4EC' },
                  ]}
                >
                  <Text
                    style={[
                      styles.alertTypeText,
                      { color: item.alert_type === 'above' ? '#1976D2' : '#C2185B' },
                    ]}
                  >
                    {item.alert_type === 'above' ? '⬆ Above' : '⬇ Below'} ${item.target_price.toFixed(2)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => deleteAlert(item.symbol, item.target_price, item.alert_type)}
              >
                <MaterialIcons name="delete" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.alertStatus}>
              {item.enabled ? '✓ Active' : '○ Disabled'}
            </Text>
          </View>
        )}
        scrollEnabled={false}
      />
    );
  };

  const renderTriggeredAlerts = () => {
    if (triggeredAlerts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="inbox" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No triggered alerts</Text>
          <Text style={styles.emptySubtext}>Alerts will appear here when triggered</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={triggeredAlerts}
        keyExtractor={(item, index) => `triggered-${index}`}
        renderItem={({ item }) => (
          <View style={[styles.alertCard, styles.triggeredAlert]}>
            <View style={styles.alertHeader}>
              <View style={styles.alertInfo}>
                <Text style={styles.alertSymbol}>{item.alert.symbol}</Text>
                <View style={styles.alertTriggeredBadge}>
                  <MaterialIcons name="notifications-active" size={14} color="#FFA726" />
                  <Text style={styles.alertTriggeredText}>Triggered!</Text>
                </View>
              </View>
            </View>
            <Text style={styles.alertMessage}>{item.notification}</Text>
            <Text style={styles.triggeredTime}>
              {new Date().toLocaleTimeString()}
            </Text>
          </View>
        )}
        scrollEnabled={false}
      />
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'active' && styles.activeTabText,
            ]}
          >
            Active ({alerts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'triggered' && styles.activeTab]}
          onPress={() => setActiveTab('triggered')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'triggered' && styles.activeTabText,
            ]}
          >
            Triggered ({triggeredAlerts.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#0066FF"
          style={{ marginTop: 50 }}
        />
      ) : (
        <>
          {activeTab === 'active' ? renderActiveAlerts() : renderTriggeredAlerts()}
        </>
      )}

      {/* Summary Stats */}
      {alerts.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Active Alerts</Text>
            <Text style={styles.statValue}>{alerts.length}</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Triggered</Text>
            <Text style={styles.statValue}>{triggeredAlerts.length}</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Unique Symbols</Text>
            <Text style={styles.statValue}>
              {new Set(alerts.map((a) => a.symbol)).size}
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <MaterialIcons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* Create Alert Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Price Alert</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Stock Symbol"
              placeholderTextColor="#999"
              value={newAlert.symbol}
              onChangeText={(text) =>
                setNewAlert({ ...newAlert, symbol: text.toUpperCase() })
              }
            />

            <Text style={styles.inputLabel}>Alert Type</Text>
            <View style={styles.alertTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  alertType === 'above' && styles.typeButtonActive,
                ]}
                onPress={() => setAlertType('above')}
              >
                <Text style={styles.typeButtonText}>⬆ Price Above</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  alertType === 'below' && styles.typeButtonActive,
                ]}
                onPress={() => setAlertType('below')}
              >
                <Text style={styles.typeButtonText}>⬇ Price Below</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Target Price"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
              value={newAlert.target_price}
              onChangeText={(text) =>
                setNewAlert({ ...newAlert, target_price: text })
              }
            />

            <TouchableOpacity
              style={styles.submitButton}
              onPress={createAlert}
            >
              <Text style={styles.submitButtonText}>Create Alert</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#0066FF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#999',
  },
  activeTabText: {
    color: '#0066FF',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
  alertCard: {
    backgroundColor: 'white',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#0066FF',
  },
  triggeredAlert: {
    borderLeftColor: '#FFA726',
    backgroundColor: '#FFFBF0',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  alertInfo: {
    flex: 1,
  },
  alertSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  alertTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  alertTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertTriggeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFECB3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  alertTriggeredText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F57C00',
    marginLeft: 4,
  },
  alertStatus: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 8,
  },
  alertMessage: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
  },
  triggeredTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    backgroundColor: 'white',
    marginHorizontal: 6,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066FF',
    marginTop: 4,
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0066FF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: '#333',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  alertTypeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: '#0066FF',
    backgroundColor: '#E3F2FD',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#0066FF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PriceAlertsScreen;
