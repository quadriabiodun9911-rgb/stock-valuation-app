import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  TextInput,
  FlatList,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  navigation: NavigationProp<any>;
}

type AlertType = 'fair_value' | 'earnings_surprise' | 'momentum_breakout' | 'custom';
type AlertStatus = 'active' | 'triggered' | 'dismissed';

interface Alert {
  id: string;
  symbol: string;
  type: AlertType;
  title: string;
  description: string;
  condition: string;
  threshold?: number;
  currentValue?: number;
  status: AlertStatus;
  createdAt: Date;
  triggeredAt?: Date;
  color: string;
  icon: string;
}

interface AlertStats {
  total: number;
  active: number;
  triggered: number;
  dismissed: number;
  byType: Record<AlertType, number>;
}

const ALERT_TYPES = [
  {
    key: 'fair_value',
    name: 'Fair Value Alert',
    description: 'Stock reaches intrinsic value',
    icon: 'flag',
    color: '#10B981',
    bgColor: '#064E3B',
  },
  {
    key: 'earnings_surprise',
    name: 'Earnings Surprise',
    description: 'Unexpected earnings event',
    icon: 'trending-up',
    color: '#F59E0B',
    bgColor: '#78350F',
  },
  {
    key: 'momentum_breakout',
    name: 'Momentum Breakout',
    description: 'Strong price/volume breakout',
    icon: 'rocket',
    color: '#3B82F6',
    bgColor: '#1E3A8A',
  },
];

const ALERTS_STORAGE_KEY = 'sv_alerts_page_alerts_v1';
const ALERTS_PREFS_STORAGE_KEY = 'sv_alerts_page_prefs_v1';

type StoredAlert = Omit<Alert, 'createdAt' | 'triggeredAt'> & {
  createdAt: string;
  triggeredAt?: string;
};

const normalizeStoredAlert = (item: StoredAlert): Alert => ({
  ...item,
  createdAt: new Date(item.createdAt),
  triggeredAt: item.triggeredAt ? new Date(item.triggeredAt) : undefined,
});

const AlertsPage: React.FC<Props> = ({ navigation }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterType, setFilterType] = useState<AlertType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<AlertStatus | 'all'>('all');

  // Form states
  const [symbol, setSymbol] = useState('');
  const [selectedAlertType, setSelectedAlertType] = useState<AlertType>('fair_value');
  const [threshold, setThreshold] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setStatusMessage(null);
      const demoAlerts: Alert[] = [
        {
          id: '1',
          symbol: 'MTN',
          type: 'fair_value',
          title: 'Fair Value Alert',
          description: 'MTN trading near intrinsic value',
          condition: 'Price >= ₦450',
          currentValue: 450,
          threshold: 450,
          status: 'triggered',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          color: '#10B981',
          icon: 'flag',
        },
        {
          id: '2',
          symbol: 'GTCO',
          type: 'earnings_surprise',
          title: 'Earnings Surprise Alert',
          description: 'GTCO Q4 earnings announcement',
          condition: 'Earnings per share > ₦2.50',
          currentValue: 2.65,
          threshold: 2.5,
          status: 'active',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          color: '#F59E0B',
          icon: 'trending-up',
        },
        {
          id: '3',
          symbol: 'DANGSUGAR',
          type: 'momentum_breakout',
          title: 'Momentum Breakout',
          description: 'Volume spike detected above 52-week average',
          condition: 'Volume > 2M shares',
          currentValue: 2.5,
          threshold: 2.0,
          status: 'active',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          color: '#3B82F6',
          icon: 'rocket',
        },
        {
          id: '4',
          symbol: 'MTN',
          type: 'momentum_breakout',
          title: 'Momentum Breakout',
          description: 'Price breaks above 20-day moving average',
          condition: 'Price > MA20 (₦445)',
          currentValue: 450,
          threshold: 445,
          status: 'triggered',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          triggeredAt: new Date(Date.now() - 30 * 60 * 1000),
          color: '#3B82F6',
          icon: 'rocket',
        },
      ];

      const [storedAlerts, storedPrefs] = await Promise.all([
        AsyncStorage.getItem(ALERTS_STORAGE_KEY),
        AsyncStorage.getItem(ALERTS_PREFS_STORAGE_KEY),
      ]);

      if (storedAlerts) {
        const parsed = JSON.parse(storedAlerts) as StoredAlert[];
        if (Array.isArray(parsed) && parsed.length) {
          setAlerts(parsed.map(normalizeStoredAlert));
        } else {
          setAlerts(demoAlerts);
        }
      } else {
        setAlerts(demoAlerts);
      }

      if (storedPrefs) {
        const parsedPrefs = JSON.parse(storedPrefs) as {
          filterType?: AlertType | 'all';
          filterStatus?: AlertStatus | 'all';
          selectedAlertType?: AlertType;
        };

        if (
          parsedPrefs.filterType &&
          (parsedPrefs.filterType === 'all' ||
            ALERT_TYPES.some((item) => item.key === parsedPrefs.filterType))
        ) {
          setFilterType(parsedPrefs.filterType);
        }

        if (
          parsedPrefs.filterStatus &&
          ['all', 'active', 'triggered', 'dismissed'].includes(parsedPrefs.filterStatus)
        ) {
          setFilterStatus(parsedPrefs.filterStatus as AlertStatus | 'all');
        }

        if (
          parsedPrefs.selectedAlertType &&
          ALERT_TYPES.some((item) => item.key === parsedPrefs.selectedAlertType)
        ) {
          setSelectedAlertType(parsedPrefs.selectedAlertType);
        }
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
      setStatusMessage('Failed to load alerts. Pull to refresh to retry.');
    } finally {
      setIsHydrated(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isHydrated) return;

    const payload: StoredAlert[] = alerts.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      triggeredAt: item.triggeredAt?.toISOString(),
    }));

    Promise.all([
      AsyncStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(payload)),
      AsyncStorage.setItem(
        ALERTS_PREFS_STORAGE_KEY,
        JSON.stringify({
          filterType,
          filterStatus,
          selectedAlertType,
        })
      ),
    ]).catch((error) => {
      console.error('Failed to persist alerts page state:', error);
    });
  }, [isHydrated, alerts, filterType, filterStatus, selectedAlertType]);

  const calculateStats = (): AlertStats => {
    const stats: AlertStats = {
      total: alerts.length,
      active: 0,
      triggered: 0,
      dismissed: 0,
      byType: {
        fair_value: 0,
        earnings_surprise: 0,
        momentum_breakout: 0,
        custom: 0,
      },
    };

    alerts.forEach((alert) => {
      if (alert.status === 'active') stats.active++;
      else if (alert.status === 'triggered') stats.triggered++;
      else if (alert.status === 'dismissed') stats.dismissed++;
      stats.byType[alert.type]++;
    });

    return stats;
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const typeMatch = filterType === 'all' || alert.type === filterType;
      const statusMatch = filterStatus === 'all' || alert.status === filterStatus;
      return typeMatch && statusMatch;
    });
  }, [alerts, filterType, filterStatus]);

  const stats = useMemo(() => calculateStats(), [alerts]);

  const addAlert = () => {
    if (!symbol.trim() || !threshold) {
      setFormError('Please fill all fields before creating an alert.');
      return;
    }

    const thresholdValue = Number(threshold);
    if (!Number.isFinite(thresholdValue) || thresholdValue <= 0) {
      setFormError('Threshold must be a valid number greater than zero.');
      return;
    }

    const alertTypeObj = ALERT_TYPES.find((t) => t.key === selectedAlertType);
    if (!alertTypeObj) return;

    const newAlert: Alert = {
      id: Date.now().toString(),
      symbol: symbol.toUpperCase(),
      type: selectedAlertType,
      title: alertTypeObj.name,
      description: alertTypeObj.description,
      condition: `${selectedAlertType.replace(/_/g, ' ')} trigger`,
      threshold: thresholdValue,
      currentValue: 0,
      status: 'active',
      createdAt: new Date(),
      color: alertTypeObj.color,
      icon: alertTypeObj.icon,
    };

    setAlerts((prev) => [...prev, newAlert]);
    setSymbol('');
    setThreshold('');
    setFormError(null);
    setModalVisible(false);
    setStatusMessage(`Alert created for ${newAlert.symbol}.`);
  };

  const dismissAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id ? { ...alert, status: 'dismissed' as AlertStatus } : alert
      )
    );
    setStatusMessage('Alert dismissed.');
  };

  const deleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    setStatusMessage('Alert deleted.');
  };

  const onRefresh = async () => {
    await loadAlerts();
    setStatusMessage('Alerts refreshed.');
  };

  const canCreateAlert = symbol.trim().length > 0 && Number(threshold) > 0;

  const renderHeader = () => (
    <LinearGradient
      colors={['#0f3460', '#16213e']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Ionicons name="chevron-back" size={28} color="#f8fafc" />
      </TouchableOpacity>

      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Alerts</Text>
        <Text style={styles.headerSubtitle}>Smart Notifications</Text>
      </View>

      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={styles.addButton}
      >
        <Ionicons name="add-circle" size={28} color="#3B82F6" />
      </TouchableOpacity>
    </LinearGradient>
  );

  const renderStats = () => (
    <View style={styles.statsSection}>
      <View style={styles.statsCards}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Alerts</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#3B82F6' }]}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.triggered}</Text>
          <Text style={styles.statLabel}>Triggered</Text>
        </View>
      </View>
    </View>
  );

  const renderAlertTypeFilter = () => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>Filter by Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <TouchableOpacity
          onPress={() => setFilterType('all')}
          style={[
            styles.filterChip,
            filterType === 'all' && styles.filterChipActive,
          ]}
        >
          <Text
            style={[
              styles.filterChipText,
              filterType === 'all' && styles.filterChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {ALERT_TYPES.map((type) => (
          <TouchableOpacity
            key={type.key}
            onPress={() => setFilterType(type.key as AlertType)}
            style={[
              styles.filterChip,
              filterType === type.key && styles.filterChipActive,
            ]}
          >
            <Ionicons
              name={type.icon as any}
              size={14}
              color={filterType === type.key ? '#fff' : type.color}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.filterChipText,
                filterType === type.key && styles.filterChipTextActive,
              ]}
            >
              {type.name.split(' ')[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderStatusFilter = () => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>Filter by Status</Text>
      <View style={styles.statusFilters}>
        {(['all', 'active', 'triggered', 'dismissed'] as const).map((status) => (
          <TouchableOpacity
            key={status}
            onPress={() => setFilterStatus(status)}
            style={[
              styles.statusFilterChip,
              filterStatus === status && styles.statusFilterChipActive,
            ]}
          >
            <Text
              style={[
                styles.statusFilterText,
                filterStatus === status && styles.statusFilterTextActive,
              ]}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderAlerts = () => (
    <View style={styles.alertsSection}>
      <Text style={styles.sectionTitle}>
        {filteredAlerts.length} Alert{filteredAlerts.length !== 1 ? 's' : ''}
      </Text>
      {filteredAlerts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-outline" size={48} color="#475569" />
          <Text style={styles.emptyStateText}>No alerts match filters</Text>
          <Text style={styles.emptyStateHint}>Tap + to create a new alert</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAlerts}
          renderItem={({ item }) => (
            <View
              style={[
                styles.alertCard,
                {
                  borderLeftColor: item.color,
                  opacity: item.status === 'dismissed' ? 0.5 : 1,
                },
              ]}
            >
              <View style={styles.alertHeader}>
                <View style={[styles.alertIconContainer, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <View style={styles.alertHeaderContent}>
                  <Text style={styles.alertTitle}>{item.symbol}</Text>
                  <Text style={styles.alertType}>{item.title}</Text>
                </View>
                <View style={styles.alertStatusBadge}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          item.status === 'triggered'
                            ? '#10B981'
                            : item.status === 'active'
                              ? '#3B82F6'
                              : '#94a3b8',
                      },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.alertBody}>
                <Text style={styles.alertDescription}>{item.description}</Text>
                <Text style={styles.alertCondition}>📊 {item.condition}</Text>
                {item.currentValue !== undefined && item.threshold !== undefined && (
                  <View style={styles.alertValues}>
                    <View style={styles.valueBox}>
                      <Text style={styles.valueLabel}>Current</Text>
                      <Text style={styles.valueText}>{item.currentValue}</Text>
                    </View>
                    <View style={styles.valueBox}>
                      <Text style={styles.valueLabel}>Threshold</Text>
                      <Text style={styles.valueText}>{item.threshold}</Text>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.alertFooter}>
                <Text style={styles.alertTime}>
                  {item.triggeredAt
                    ? `Triggered ${Math.floor((Date.now() - item.triggeredAt.getTime()) / 60000)}m ago`
                    : `Created ${Math.floor((Date.now() - item.createdAt.getTime()) / 3600000)}h ago`}
                </Text>
                <View style={styles.alertActions}>
                  {item.status !== 'dismissed' && (
                    <TouchableOpacity
                      onPress={() => dismissAlert(item.id)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => deleteAlert(item.id)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.alertSeparator} />}
        />
      )}
    </View>
  );

  const renderAddModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Alert</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color="#f8fafc" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {formError && (
              <View style={styles.formErrorBanner}>
                <Ionicons name="alert-circle" size={16} color="#fecaca" />
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            )}
            <Text style={styles.inputLabel}>Stock Symbol</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., MTN"
              placeholderTextColor="#94a3b8"
              value={symbol}
              onChangeText={(value) => {
                setSymbol(value);
                if (formError) setFormError(null);
              }}
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>Alert Type</Text>
            <View style={styles.alertTypeSelector}>
              {ALERT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  onPress={() => setSelectedAlertType(type.key as AlertType)}
                  style={[
                    styles.alertTypeOption,
                    selectedAlertType === type.key && styles.alertTypeOptionSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.typeIcon,
                      {
                        backgroundColor:
                          selectedAlertType === type.key ? type.color : type.bgColor,
                      },
                    ]}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={20}
                      color={selectedAlertType === type.key ? '#fff' : type.color}
                    />
                  </View>
                  <View style={styles.typeInfo}>
                    <Text style={styles.typeName}>{type.name}</Text>
                    <Text style={styles.typeDesc}>{type.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Threshold Value</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter threshold (e.g., 450)"
              placeholderTextColor="#94a3b8"
              value={threshold}
              onChangeText={(value) => {
                setThreshold(value);
                if (formError) setFormError(null);
              }}
              keyboardType="decimal-pad"
            />

            <Text style={styles.infoText}>
              You will receive a notification when {selectedAlertType.replace(/_/g, ' ')} condition is met.
            </Text>

            <TouchableOpacity
              style={[styles.addModalButton, !canCreateAlert && styles.addModalButtonDisabled]}
              onPress={addAlert}
              disabled={!canCreateAlert}
            >
              <Text style={styles.addModalButtonText}>Create Alert</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading alerts...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#3B82F6" />}
        >
          {statusMessage && (
            <View style={styles.statusBanner}>
              <Ionicons name="information-circle" size={16} color="#1e3a8a" />
              <Text style={styles.statusBannerText}>{statusMessage}</Text>
            </View>
          )}
          {renderStats()}
          {renderAlertTypeFilter()}
          {renderStatusFilter()}
          {renderAlerts()}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Smart alerts keep you informed about your portfolio opportunities.
            </Text>
          </View>
        </ScrollView>
      )}

      {renderAddModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1120',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    marginLeft: -8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  statsSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statusBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBannerText: {
    fontSize: 12,
    color: '#1e3a8a',
    fontWeight: '600',
    flex: 1,
  },
  statsCards: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 10,
  },
  filterScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterChipText: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#f8fafc',
  },
  statusFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  statusFilterChip: {
    flex: 1,
    backgroundColor: '#1e293b',
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusFilterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  statusFilterText: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  statusFilterTextActive: {
    color: '#f8fafc',
  },
  alertsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginTop: 12,
  },
  emptyStateHint: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 6,
  },
  alertCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 0,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  alertIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertHeaderContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  alertType: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  alertStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0b1120',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  alertBody: {
    marginBottom: 10,
    gap: 6,
  },
  alertDescription: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 17,
  },
  alertCondition: {
    fontSize: 11,
    color: '#94a3b8',
  },
  alertValues: {
    flexDirection: 'row',
    gap: 8,
  },
  valueBox: {
    flex: 1,
    backgroundColor: '#0b1120',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 2,
  },
  valueText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  alertTime: {
    fontSize: 10,
    color: '#94a3b8',
  },
  alertActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  alertSeparator: {
    height: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  modalContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  formErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    backgroundColor: 'rgba(127,29,29,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  formErrorText: {
    fontSize: 12,
    color: '#fecaca',
    fontWeight: '600',
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#0b1120',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 14,
  },
  alertTypeSelector: {
    gap: 10,
    marginBottom: 12,
  },
  alertTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b1120',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  alertTypeOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6',
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeInfo: {
    flex: 1,
  },
  typeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f8fafc',
  },
  typeDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  infoText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  addModalButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    minHeight: 44,
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addModalButtonDisabled: {
    opacity: 0.55,
  },
  addModalButtonText: {
    color: '#f8fafc',
    fontWeight: 'bold',
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default AlertsPage;
