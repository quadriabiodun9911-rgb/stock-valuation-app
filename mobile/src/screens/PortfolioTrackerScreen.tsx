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
  Dimensions,
  RefreshControl,
} from 'react-native';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PortfolioTrackerScreen = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newHolding, setNewHolding] = useState({
    symbol: '',
    shares: '',
    purchase_price: '',
    purchase_date: new Date().toISOString().split('T')[0],
  });

  useFocusEffect(
    React.useCallback(() => {
      loadPortfolio();
    }, [])
  );

  const loadPortfolio = async () => {
    setLoading(true);
    try {
      // Load sample portfolio (in real app, fetch from backend)
      const samplePortfolio = [
        { symbol: 'AAPL', shares: 10, purchase_price: 150, purchase_date: '2023-01-01' },
        { symbol: 'MSFT', shares: 5, purchase_price: 300, purchase_date: '2023-06-01' },
        { symbol: 'GOOGL', shares: 3, purchase_price: 2800, purchase_date: '2023-09-01' },
      ];

      setPortfolio(samplePortfolio);

      // Calculate portfolio summary
      const response = await axios.post(`${API_URL}/api/portfolio/calculate-portfolio`, {
        holdings: samplePortfolio,
      });

      setPortfolioSummary(response.data);
    } catch (error) {
      console.error('Error loading portfolio:', error);
      Alert.alert('Error', 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadPortfolio();
    setRefreshing(false);
  }, []);

  const addHolding = async () => {
    if (!newHolding.symbol || !newHolding.shares || !newHolding.purchase_price) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      const holding = {
        symbol: newHolding.symbol.toUpperCase(),
        shares: parseFloat(newHolding.shares),
        purchase_price: parseFloat(newHolding.purchase_price),
        purchase_date: new Date(newHolding.purchase_date),
      };

      const response = await axios.post(`${API_URL}/api/portfolio/add-holding`, holding);

      setPortfolio([...portfolio, holding]);
      setNewHolding({
        symbol: '',
        shares: '',
        purchase_price: '',
        purchase_date: new Date().toISOString().split('T')[0],
      });
      setModalVisible(false);
      loadPortfolio();
      Alert.alert('Success', 'Holding added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to add holding');
    }
  };

  const removeHolding = (symbol) => {
    Alert.alert('Remove Holding', `Remove ${symbol} from portfolio?`, [
      { text: 'Cancel', onPress: () => { } },
      {
        text: 'Remove',
        onPress: () => {
          setPortfolio(portfolio.filter((h) => h.symbol !== symbol));
          loadPortfolio();
        },
      },
    ]);
  };

  const renderSummary = () => {
    if (!portfolioSummary) return null;

    const gainLossColor = portfolioSummary.total_gain_loss >= 0 ? '#4CAF50' : '#FF6B6B';

    return (
      <View style={[styles.summaryCard, { borderLeftColor: gainLossColor }]}>
        <Text style={styles.summaryLabel}>Portfolio Value</Text>
        <Text style={styles.portfolioValue}>
          ${portfolioSummary.total_current_value.toFixed(2)}
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Invested</Text>
            <Text style={styles.summaryValue}>
              ${portfolioSummary.total_invested.toFixed(2)}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Gain/Loss</Text>
            <Text style={[styles.summaryValue, { color: gainLossColor }]}>
              ${portfolioSummary.total_gain_loss.toFixed(2)} ({portfolioSummary.total_gain_loss_percent.toFixed(2)}%)
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderHolding = (holding) => {
    if (!portfolioSummary) return null;

    const holdingData = portfolioSummary.holdings.find((h) => h.symbol === holding.symbol);
    if (!holdingData) return null;

    const gainLossColor = holdingData.gain_loss >= 0 ? '#4CAF50' : '#FF6B6B';

    return (
      <View key={holding.symbol} style={styles.holdingCard}>
        <View style={styles.holdingHeader}>
          <View style={styles.holdingInfo}>
            <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
            <Text style={styles.holdingShares}>{holding.shares} shares</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => removeHolding(holding.symbol)}
          >
            <MaterialIcons name="close" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        <View style={styles.holdingStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Entry Price</Text>
            <Text style={styles.statValue}>${holding.purchase_price.toFixed(2)}</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Current Price</Text>
            <Text style={styles.statValue}>${holdingData.current_price.toFixed(2)}</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Current Value</Text>
            <Text style={styles.statValue}>${holdingData.current_value.toFixed(2)}</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Gain/Loss</Text>
            <Text style={[styles.statValue, { color: gainLossColor }]}>
              ${holdingData.gain_loss.toFixed(2)} ({holdingData.gain_loss_percent.toFixed(2)}%)
            </Text>
          </View>
        </View>

        <View style={styles.allocationBar}>
          <View
            style={[
              styles.allocationFill,
              {
                width: `${Math.min(holdingData.allocation_percent, 100)}%`,
                backgroundColor: gainLossColor,
              },
            ]}
          />
        </View>
        <Text style={styles.allocationLabel}>{holdingData.allocation_percent.toFixed(1)}% of portfolio</Text>
      </View>
    );
  };

  const renderTopPerformers = () => {
    if (!portfolioSummary || !portfolioSummary.top_performers) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Performers</Text>
        {portfolioSummary.top_performers.slice(0, 3).map((holding) => (
          <View key={holding.symbol} style={styles.performerCard}>
            <Text style={styles.performerSymbol}>{holding.symbol}</Text>
            <Text style={[styles.performerGain, { color: holding.gain_loss >= 0 ? '#4CAF50' : '#FF6B6B' }]}>
              +{holding.gain_loss_percent.toFixed(2)}%
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderSectorAllocation = () => {
    if (!portfolioSummary || !portfolioSummary.sector_allocation) return null;

    const sectors = Object.entries(portfolioSummary.sector_allocation);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sector Allocation</Text>
        {sectors.slice(0, 5).map(([sector, data]) => (
          <View key={sector} style={styles.sectorItem}>
            <Text style={styles.sectorName}>{sector}</Text>
            <View style={styles.sectorBar}>
              <View
                style={[
                  styles.sectorFill,
                  { width: `${Math.min(data.percent, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.sectorPercent}>{data.percent.toFixed(1)}%</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {loading ? (
        <ActivityIndicator size="large" color="#0066FF" style={{ marginTop: 50 }} />
      ) : (
        <>
          {renderSummary()}

          <View style={styles.holdingsSection}>
            <Text style={styles.sectionTitle}>Your Holdings</Text>
            {portfolio.length > 0 ? (
              portfolio.map((holding) => renderHolding(holding))
            ) : (
              <Text style={styles.emptyText}>No holdings yet</Text>
            )}
          </View>

          {renderTopPerformers()}
          {renderSectorAllocation()}
        </>
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <MaterialIcons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* Add Holding Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Holding</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Stock Symbol"
              placeholderTextColor="#999"
              value={newHolding.symbol}
              onChangeText={(text) => setNewHolding({ ...newHolding, symbol: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Number of Shares"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
              value={newHolding.shares}
              onChangeText={(text) => setNewHolding({ ...newHolding, shares: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Purchase Price"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
              value={newHolding.purchase_price}
              onChangeText={(text) => setNewHolding({ ...newHolding, purchase_price: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Purchase Date (YYYY-MM-DD)"
              placeholderTextColor="#999"
              value={newHolding.purchase_date}
              onChangeText={(text) => setNewHolding({ ...newHolding, purchase_date: text })}
            />

            <TouchableOpacity style={styles.submitButton} onPress={addHolding}>
              <Text style={styles.submitButtonText}>Add Holding</Text>
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
  summaryCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  portfolioValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  holdingsSection: {
    marginTop: 10,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  holdingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  holdingInfo: {
    flex: 1,
  },
  holdingSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  holdingShares: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  holdingStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  statItem: {
    width: '50%',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  allocationBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  allocationFill: {
    height: '100%',
    borderRadius: 4,
  },
  allocationLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  performerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  performerSymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  performerGain: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectorItem: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  sectorName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  sectorBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  sectorFill: {
    height: '100%',
    backgroundColor: '#0066FF',
  },
  sectorPercent: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  section: {
    paddingHorizontal: 15,
    marginTop: 20,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
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
    maxHeight: '80%',
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

export default PortfolioTrackerScreen;
