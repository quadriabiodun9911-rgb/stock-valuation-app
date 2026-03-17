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

const BacktestingScreen = () => {
  const [strategies, setStrategies] = useState([]);
  const [backtest, setBacktest] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('strategies');
  const [formData, setFormData] = useState({
    symbol: 'AAPL',
    strategy: 'moving_average',
    start_date: '2020-01-01',
    end_date: new Date().toISOString().split('T')[0],
  });

  useFocusEffect(
    React.useCallback(() => {
      loadStrategies();
    }, [])
  );

  const loadStrategies = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/backtest/strategies`);
      setStrategies(response.data.strategies || []);
    } catch (error) {
      console.error('Error loading strategies:', error);
      Alert.alert('Error', 'Failed to load strategies');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadStrategies();
    setRefreshing(false);
  }, []);

  const runBacktest = async () => {
    if (!formData.symbol) {
      Alert.alert('Error', 'Please enter a stock symbol');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/backtest/run`, {
        symbol: formData.symbol.toUpperCase(),
        strategy: formData.strategy,
        start_date: formData.start_date,
        end_date: formData.end_date,
      });

      setBacktest(response.data);
      setActiveTab('result');
      Alert.alert('Success', 'Backtest completed');
    } catch (error) {
      Alert.alert('Error', 'Failed to run backtest');
    } finally {
      setLoading(false);
    }
  };

  const compareStrategies = async () => {
    if (!formData.symbol) {
      Alert.alert('Error', 'Please enter a stock symbol');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/backtest/compare-strategies?symbol=${formData.symbol.toUpperCase()}&start_date=${formData.start_date}&end_date=${formData.end_date}`
      );

      setComparison(response.data);
      setActiveTab('comparison');
      Alert.alert('Success', 'Strategy comparison completed');
    } catch (error) {
      Alert.alert('Error', 'Failed to compare strategies');
    } finally {
      setLoading(false);
    }
  };

  const renderStrategyList = () => {
    return (
      <FlatList
        data={strategies}
        keyExtractor={(item) => item.name}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.strategyCard}
            onPress={() => {
              setFormData({ ...formData, strategy: item.name });
            }}
          >
            <View style={styles.strategyHeader}>
              <Text style={styles.strategyName}>{item.name}</Text>
              {formData.strategy === item.name && (
                <MaterialIcons name="check-circle" size={20} color="#0066FF" />
              )}
            </View>

            <Text style={styles.strategyDescription}>{item.description}</Text>

            <View style={styles.strategyDetails}>
              <View style={styles.strategyDetail}>
                <Text style={styles.detailLabel}>Entry</Text>
                <Text style={styles.detailValue}>{item.entry}</Text>
              </View>

              <View style={styles.strategyDetail}>
                <Text style={styles.detailLabel}>Exit</Text>
                <Text style={styles.detailValue}>{item.exit}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    );
  };

  const renderBacktestResult = () => {
    if (!backtest) return null;

    const {
      total_return,
      annual_return,
      win_rate,
      max_drawdown,
      sharpe_ratio,
      winning_trades,
      losing_trades,
      total_trades,
      initial_capital,
      final_value,
      total_profit,
    } = backtest;

    const totalReturnColor = total_return >= 0 ? '#4CAF50' : '#FF6B6B';
    const drawdownColor = max_drawdown < -20 ? '#FF6B6B' : max_drawdown < -10 ? '#FFA726' : '#4CAF50';

    return (
      <ScrollView style={styles.resultContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{backtest.symbol} - {backtest.strategy}</Text>
          <Text style={styles.summaryPeriod}>{backtest.period}</Text>

          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Total Return</Text>
              <Text style={[styles.metricValue, { color: totalReturnColor }]}>
                {total_return >= 0 ? '+' : ''}{total_return.toFixed(2)}%
              </Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Annual Return</Text>
              <Text style={styles.metricValue}>{annual_return.toFixed(2)}%</Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Win Rate</Text>
              <Text style={styles.metricValue}>{win_rate.toFixed(2)}%</Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Max Drawdown</Text>
              <Text style={[styles.metricValue, { color: drawdownColor }]}>
                {max_drawdown.toFixed(2)}%
              </Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Sharpe Ratio</Text>
              <Text style={styles.metricValue}>{sharpe_ratio.toFixed(2)}</Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Profit Factor</Text>
              <Text style={styles.metricValue}>{backtest.profit_factor?.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Trade Statistics</Text>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Trades</Text>
            <Text style={styles.statValue}>{total_trades}</Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Winning Trades</Text>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>
              {winning_trades}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Losing Trades</Text>
            <Text style={[styles.statValue, { color: '#FF6B6B' }]}>
              {losing_trades}
            </Text>
          </View>

          <View style={[styles.statRow, { borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 12, marginTop: 12 }]}>
            <Text style={styles.statLabel}>Initial Capital</Text>
            <Text style={styles.statValue}>${initial_capital.toFixed(2)}</Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Final Value</Text>
            <Text style={[styles.statValue, { color: total_profit >= 0 ? '#4CAF50' : '#FF6B6B' }]}>
              ${final_value.toFixed(2)}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Profit/Loss</Text>
            <Text style={[styles.statValue, { color: total_profit >= 0 ? '#4CAF50' : '#FF6B6B', fontWeight: 'bold' }]}>
              {total_profit >= 0 ? '+' : ''}${total_profit.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.equityChart}>
          <Text style={styles.equityTitle}>Equity Curve (sample)</Text>
          <Text style={styles.equityInfo}>Showing simplified representation of account growth</Text>
        </View>
      </ScrollView>
    );
  };

  const renderComparison = () => {
    if (!comparison || !comparison.results) return null;

    return (
      <FlatList
        data={comparison.results}
        keyExtractor={(item) => item.strategy}
        scrollEnabled={false}
        renderItem={({ item, index }) => {
          const totalReturnColor = item.total_return >= 0 ? '#4CAF50' : '#FF6B6B';
          return (
            <View style={[styles.comparisonCard, index === 0 && styles.bestStrategy]}>
              <View style={styles.comparisonHeader}>
                <View>
                  <Text style={styles.comparisonStrategy}>{item.strategy}</Text>
                  {index === 0 && (
                    <View style={styles.bestBadge}>
                      <MaterialIcons name="emoji-events" size={14} color="#FFD700" />
                      <Text style={styles.bestText}>Best</Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.comparisonReturn, { color: totalReturnColor }]}>
                  {item.total_return >= 0 ? '+' : ''}{item.total_return.toFixed(2)}%
                </Text>
              </View>

              <View style={styles.comparisonMetrics}>
                <View style={styles.comparisonMetric}>
                  <Text style={styles.metricLabelSmall}>Annual Return</Text>
                  <Text style={styles.metricValueSmall}>
                    {item.annual_return.toFixed(2)}%
                  </Text>
                </View>

                <View style={styles.comparisonMetric}>
                  <Text style={styles.metricLabelSmall}>Win Rate</Text>
                  <Text style={styles.metricValueSmall}>
                    {item.win_rate.toFixed(2)}%
                  </Text>
                </View>

                <View style={styles.comparisonMetric}>
                  <Text style={styles.metricLabelSmall}>Trades</Text>
                  <Text style={styles.metricValueSmall}>
                    {item.total_trades}
                  </Text>
                </View>

                <View style={styles.comparisonMetric}>
                  <Text style={styles.metricLabelSmall}>Sharpe</Text>
                  <Text style={styles.metricValueSmall}>
                    {item.sharpe_ratio.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
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
          style={[styles.tab, activeTab === 'strategies' && styles.activeTab]}
          onPress={() => setActiveTab('strategies')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'strategies' && styles.activeTabText,
            ]}
          >
            Strategies
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'test' && styles.activeTab]}
          onPress={() => setActiveTab('test')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'test' && styles.activeTabText,
            ]}
          >
            Backtest
          </Text>
        </TouchableOpacity>

        {backtest && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'result' && styles.activeTab]}
            onPress={() => setActiveTab('result')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'result' && styles.activeTabText,
              ]}
            >
              Result
            </Text>
          </TouchableOpacity>
        )}

        {comparison && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'comparison' && styles.activeTab]}
            onPress={() => setActiveTab('comparison')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'comparison' && styles.activeTabText,
              ]}
            >
              Compare
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator size="large" color="#0066FF" style={{ marginTop: 50 }} />
      ) : (
        <>
          {activeTab === 'strategies' && renderStrategyList()}

          {activeTab === 'test' && (
            <View style={styles.testContainer}>
              <TextInput
                style={styles.input}
                placeholder="Stock Symbol"
                placeholderTextColor="#999"
                value={formData.symbol}
                onChangeText={(text) =>
                  setFormData({ ...formData, symbol: text.toUpperCase() })
                }
                maxLength={5}
              />

              <TextInput
                style={styles.input}
                placeholder="Start Date (YYYY-MM-DD)"
                placeholderTextColor="#999"
                value={formData.start_date}
                onChangeText={(text) =>
                  setFormData({ ...formData, start_date: text })
                }
              />

              <TextInput
                style={styles.input}
                placeholder="End Date (YYYY-MM-DD)"
                placeholderTextColor="#999"
                value={formData.end_date}
                onChangeText={(text) =>
                  setFormData({ ...formData, end_date: text })
                }
              />

              <TouchableOpacity style={styles.testButton} onPress={runBacktest}>
                <Text style={styles.testButtonText}>Run Backtest</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.testButton, styles.compareButton]}
                onPress={compareStrategies}
              >
                <Text style={styles.testButtonText}>Compare All Strategies</Text>
              </TouchableOpacity>

              <Text style={styles.selectedStrategy}>
                Selected: {formData.strategy}
              </Text>
            </View>
          )}

          {activeTab === 'result' && renderBacktestResult()}

          {activeTab === 'comparison' && renderComparison()}
        </>
      )}

      <View style={{ height: 40 }} />
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
    fontSize: 13,
    fontWeight: '500',
    color: '#999',
  },
  activeTabText: {
    color: '#0066FF',
    fontWeight: 'bold',
  },
  strategyCard: {
    backgroundColor: 'white',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#e0e0e0',
  },
  strategyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  strategyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  strategyDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  strategyDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  strategyDetail: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  testContainer: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: 'white',
  },
  testButton: {
    backgroundColor: '#0066FF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  compareButton: {
    backgroundColor: '#4CAF50',
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedStrategy: {
    fontSize: 13,
    color: '#0066FF',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  resultContainer: {
    padding: 12,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryPeriod: {
    fontSize: 12,
    color: '#999',
    marginVertical: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  metricBox: {
    width: '50%',
    paddingHorizontal: 6,
    paddingVertical: 12,
  },
  metricLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  detailsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  equityChart: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  equityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  equityInfo: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  comparisonCard: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  bestStrategy: {
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: '#FFFBF0',
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  comparisonStrategy: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'uppercase',
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  bestText: {
    fontSize: 11,
    color: '#FFD700',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  comparisonReturn: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  comparisonMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  comparisonMetric: {
    alignItems: 'center',
  },
  metricLabelSmall: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  metricValueSmall: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default BacktestingScreen;
