import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { webSocketManager, alertService, PriceUpdate, Alert as AlertType } from '../services/realtime';

interface RealTimePriceProps {
  symbol: string;
  initialPrice?: number;
}

export const RealTimePriceCard: React.FC<RealTimePriceProps> = ({ symbol, initialPrice = 0 }) => {
  const [price, setPrice] = useState(initialPrice);
  const [bid, setBid] = useState(initialPrice * 0.99);
  const [ask, setAsk] = useState(initialPrice * 1.01);
  const [change, setChange] = useState(0);
  const [changePercent, setChangePercent] = useState(0);
  const [volume, setVolume] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        setLoading(true);
        await webSocketManager.connect(
          symbol,
          () => setIsConnected(true),
          (error) => {
            console.error('WebSocket connection error:', error);
            Alert.alert('Connection Error', `Failed to connect to live price stream for ${symbol}`);
          }
        );
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
      } finally {
        setLoading(false);
      }
    };

    connectWebSocket();

    // Subscribe to price updates
    const unsubscribe = webSocketManager.onPriceUpdate((data: PriceUpdate) => {
      setPrice(data.price);
      setBid(data.bid);
      setAsk(data.ask);
      setChange(data.change);
      setChangePercent(data.change_percent);
      setVolume(data.volume);
      setLastUpdate(new Date(data.timestamp).toLocaleTimeString());
    });

    return () => {
      unsubscribe();
      // Don't disconnect here - let it stay connected
    };
  }, [symbol]);

  const changeColor = change >= 0 ? '#22c55e' : '#ef4444';
  const connectionStatus = isConnected ? '🟢 Live' : '🔴 Offline';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.symbol}>{symbol}</Text>
        <Text style={[styles.connectionStatus, { color: isConnected ? '#22c55e' : '#ef4444' }]}>
          {connectionStatus}
        </Text>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Connecting to live stream...</Text>
      ) : (
        <>
          <View style={styles.priceSection}>
            <Text style={styles.price}>${price.toFixed(2)}</Text>
            <View style={styles.changeContainer}>
              <Text style={[styles.change, { color: changeColor }]}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)}
              </Text>
              <Text style={[styles.changePercent, { color: changeColor }]}>
                ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
              </Text>
            </View>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Bid</Text>
              <Text style={styles.detailValue}>${bid.toFixed(2)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Ask</Text>
              <Text style={styles.detailValue}>${ask.toFixed(2)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Volume</Text>
              <Text style={styles.detailValue}>{(volume / 1000000).toFixed(2)}M</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Spread</Text>
              <Text style={styles.detailValue}>${(ask - bid).toFixed(2)}</Text>
            </View>
          </View>

          {lastUpdate && (
            <Text style={styles.lastUpdate}>Updated: {lastUpdate}</Text>
          )}
        </>
      )}
    </View>
  );
};

interface AlertsListProps {
  symbol: string;
}

export const AlertsList: React.FC<AlertsListProps> = ({ symbol }) => {
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAlerts();

    // Subscribe to incoming alerts
    const unsubscribe = webSocketManager.onAlert((alert: AlertType) => {
      Alert.alert('Price Alert', alert.message);
      fetchAlerts();
    });

    return () => unsubscribe();
  }, [symbol]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await alertService.getAlerts(symbol);
      setAlerts(response.alerts || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Active Alerts ({alerts.length})</Text>

      {loading ? (
        <Text style={styles.loadingText}>Loading alerts...</Text>
      ) : alerts.length === 0 ? (
        <Text style={styles.emptyText}>No active alerts. Create one to get started!</Text>
      ) : (
        <ScrollView style={styles.alertsList}>
          {alerts.map((alert) => (
            <View key={alert.alert_id} style={styles.alertItem}>
              <View style={styles.alertHeader}>
                <Text style={styles.alertType}>{alert.alert_type}</Text>
                <Text style={styles.alertThreshold}>${alert.threshold.toFixed(2)}</Text>
              </View>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertTime}>
                {new Date(alert.timestamp).toLocaleString()}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

interface SetAlertProps {
  symbol: string;
  onAlertSet?: () => void;
}

export const SetAlertDialog: React.FC<SetAlertProps> = ({ symbol, onAlertSet }) => {
  const [alertType, setAlertType] = useState<'price_above' | 'price_below'>('price_above');
  const [threshold, setThreshold] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetAlert = async () => {
    if (!threshold || isNaN(parseFloat(threshold))) {
      Alert.alert('Invalid Input', 'Please enter a valid price threshold');
      return;
    }

    try {
      setLoading(true);
      await alertService.setPriceAlert({
        symbol,
        alert_type: alertType,
        threshold: parseFloat(threshold),
        enabled: true,
      });

      Alert.alert('Success', `Alert set: ${symbol} ${alertType} $${threshold}`);
      setThreshold('');
      onAlertSet?.();
    } catch (error) {
      Alert.alert('Error', `Failed to set alert: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Set Price Alert</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Alert Type</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              alertType === 'price_above' && styles.typeButtonActive,
            ]}
            onPress={() => setAlertType('price_above')}
          >
            <Text style={styles.typeButtonText}>Price Above</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              alertType === 'price_below' && styles.typeButtonActive,
            ]}
            onPress={() => setAlertType('price_below')}
          >
            <Text style={styles.typeButtonText}>Price Below</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Price Threshold ($)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter price"
          value={threshold}
          onChangeText={setThreshold}
          keyboardType="decimal-pad"
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSetAlert}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Setting Alert...' : 'Set Alert'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

import { TextInput } from 'react-native';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  symbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  connectionStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
  priceSection: {
    marginBottom: 16,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  change: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  changePercent: {
    fontSize: 16,
    fontWeight: '500',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  detailItem: {
    width: '50%',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  lastUpdate: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
  alertsList: {
    maxHeight: 300,
  },
  alertItem: {
    backgroundColor: '#f3f4f6',
    borderLeftWidth: 4,
    borderLeftColor: '#f97316',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  alertType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f97316',
    textTransform: 'uppercase',
  },
  alertThreshold: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  alertMessage: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#3b82f6',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1f2937',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
