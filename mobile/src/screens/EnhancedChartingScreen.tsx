import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  TextInput,
} from 'react-native';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { API_URL } from '../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;

const EnhancedChartingScreen = () => {
  const [symbol, setSymbol] = useState('AAPL');
  const [period, setPeriod] = useState('1y');
  const [ohlcData, setOhlcData] = useState(null);
  const [technicalIndicators, setTechnicalIndicators] = useState(null);
  const [rsiData, setRsiData] = useState(null);
  const [macdData, setMacdData] = useState(null);
  const [volatility, setVolatility] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeChart, setActiveChart] = useState('price');

  useFocusEffect(
    React.useCallback(() => {
      loadChartData();
    }, [symbol, period])
  );

  const loadChartData = async () => {
    setLoading(true);
    try {
      // Load OHLC data
      const ohlcResponse = await axios.get(
        `${API_URL}/api/charts/ohlc/${symbol}?period=${period}`
      );
      setOhlcData(ohlcResponse.data);

      // Load technical indicators
      const indicatorsResponse = await axios.get(
        `${API_URL}/api/charts/technical-indicators/${symbol}?period=${period}`
      );
      setTechnicalIndicators(indicatorsResponse.data);

      // Load RSI
      const rsiResponse = await axios.get(
        `${API_URL}/api/charts/rsi/${symbol}?period=${period}`
      );
      setRsiData(rsiResponse.data);

      // Load MACD
      const macdResponse = await axios.get(
        `${API_URL}/api/charts/macd/${symbol}?period=${period}`
      );
      setMacdData(macdResponse.data);

      // Load volatility
      const volResponse = await axios.get(
        `${API_URL}/api/charts/volatility/${symbol}?period=${period}`
      );
      setVolatility(volResponse.data);
    } catch (error) {
      console.error('Error loading chart data:', error);
      Alert.alert('Error', 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadChartData();
    setRefreshing(false);
  }, []);

  const handleSymbolChange = (text) => {
    setSymbol(text.toUpperCase());
  };

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
  };

  const preparePriceChartData = () => {
    if (!ohlcData || !ohlcData.ohlc_data) return null;

    // Take every nth point to avoid overcrowding
    const step = Math.max(1, Math.floor(ohlcData.ohlc_data.length / 20));
    const data = ohlcData.ohlc_data.filter((_, i) => i % step === 0);

    return {
      labels: data.map((d) => d.date.slice(-5)),
      datasets: [
        {
          data: data.map((d) => d.close),
          strokeWidth: 2,
        },
      ],
    };
  };

  const prepareRSIChartData = () => {
    if (!rsiData || !rsiData.rsi) return null;

    const data = rsiData.rsi.filter((_, i) => i % 5 === 0).slice(0, 20);

    return {
      labels: data.map((d) => d.date.slice(-5)),
      datasets: [
        {
          data: data.map((d) => d.value || 50),
          strokeWidth: 2,
        },
      ],
    };
  };

  const prepareMACDChartData = () => {
    if (!macdData || !macdData.macd) return null;

    const data = macdData.macd.filter((_, i) => i % 5 === 0).slice(0, 20);

    return {
      labels: data.map((d) => d.date.slice(-5)),
      datasets: [
        {
          data: data.map((d) => (d.value || 0) * 100), // Scale for visibility
          strokeWidth: 2,
        },
      ],
    };
  };

  const renderPriceChart = () => {
    const chartData = preparePriceChartData();
    if (!chartData || !ohlcData) return null;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.currentPrice}>
              ${ohlcData.current_price?.toFixed(2)}
            </Text>
            <Text style={styles.priceDate}>{new Date().toLocaleDateString()}</Text>
          </View>
        </View>

        <LineChart
          data={chartData}
          width={SCREEN_WIDTH - 20}
          height={300}
          yAxisLabel="$"
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            color: (opacity = 1) => `rgba(0, 102, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
            strokeWidth: 2,
            propsForDots: {
              r: '0',
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>
    );
  };

  const renderRSIChart = () => {
    const chartData = prepareRSIChartData();
    if (!chartData || !rsiData) return null;

    const rsiStatus = rsiData.status;
    const statusColor =
      rsiStatus === 'overbought' ? '#FF6B6B' : rsiStatus === 'oversold' ? '#4CAF50' : '#FFA726';

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.indicatorTitle}>RSI (Relative Strength Index)</Text>
            <Text style={styles.indicatorValue}>
              {rsiData.current_rsi?.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '30' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {rsiStatus.toUpperCase()}
            </Text>
          </View>
        </View>

        <LineChart
          data={chartData}
          width={SCREEN_WIDTH - 20}
          height={250}
          yAxisLabel=""
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            color: (opacity = 1) => `rgba(255, 167, 38, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
            strokeWidth: 2,
            propsForDots: {
              r: '0',
            },
          }}
          bezier
          style={styles.chart}
        />

        <View style={styles.rsiLevels}>
          <View style={styles.rsiLevel}>
            <View style={[styles.rsiBadge, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.rsiLevelText}>Oversold (&lt;30)</Text>
          </View>
          <View style={styles.rsiLevel}>
            <View style={[styles.rsiBadge, { backgroundColor: '#FFA726' }]} />
            <Text style={styles.rsiLevelText}>Neutral (30-70)</Text>
          </View>
          <View style={styles.rsiLevel}>
            <View style={[styles.rsiBadge, { backgroundColor: '#FF6B6B' }]} />
            <Text style={styles.rsiLevelText}>Overbought (&gt;70)</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderMACDChart = () => {
    const chartData = prepareMACDChartData();
    if (!chartData || !macdData) return null;

    const signal = macdData.trading_signal;
    const signalColor = signal === 'BUY' ? '#4CAF50' : signal === 'SELL' ? '#FF6B6B' : '#999';

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.indicatorTitle}>MACD (Moving Average Convergence Divergence)</Text>
            <Text style={styles.indicatorValue}>
              {macdData.current_macd?.toFixed(4)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: signalColor + '30' }]}>
            <Text style={[styles.statusText, { color: signalColor }]}>
              {signal}
            </Text>
          </View>
        </View>

        <LineChart
          data={chartData}
          width={SCREEN_WIDTH - 20}
          height={250}
          yAxisLabel=""
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
            strokeWidth: 2,
            propsForDots: {
              r: '0',
            },
          }}
          bezier
          style={styles.chart}
        />

        <View style={styles.macdStats}>
          <View style={styles.macdStat}>
            <Text style={styles.macdStatLabel}>MACD</Text>
            <Text style={styles.macdStatValue}>
              {macdData.current_macd?.toFixed(4)}
            </Text>
          </View>
          <View style={styles.macdStat}>
            <Text style={styles.macdStatLabel}>Signal</Text>
            <Text style={styles.macdStatValue}>
              {macdData.current_signal?.toFixed(4)}
            </Text>
          </View>
          <View style={styles.macdStat}>
            <Text style={styles.macdStatLabel}>Histogram</Text>
            <Text style={styles.macdStatValue}>
              {macdData.current_histogram?.toFixed(4)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderVolatilityStats = () => {
    if (!volatility) return null;

    return (
      <View style={styles.volatilityContainer}>
        <Text style={styles.volatilityTitle}>Volatility Analysis</Text>

        <View style={styles.volatilityGrid}>
          <View style={styles.volatilityItem}>
            <Text style={styles.volatilityLabel}>Daily Vol</Text>
            <Text style={styles.volatilityValue}>
              {(volatility.daily_volatility * 100)?.toFixed(2)}%
            </Text>
          </View>

          <View style={styles.volatilityItem}>
            <Text style={styles.volatilityLabel}>Annual Vol</Text>
            <Text style={styles.volatilityValue}>
              {(volatility.annual_volatility * 100)?.toFixed(2)}%
            </Text>
          </View>

          <View style={styles.volatilityItem}>
            <Text style={styles.volatilityLabel}>52W High</Text>
            <Text style={styles.volatilityValue}>
              ${volatility['52_week_high']?.toFixed(2)}
            </Text>
          </View>

          <View style={styles.volatilityItem}>
            <Text style={styles.volatilityLabel}>52W Low</Text>
            <Text style={styles.volatilityValue}>
              ${volatility['52_week_low']?.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Symbol and Period Selector */}
      <View style={styles.controlsContainer}>
        <TextInput
          style={styles.symbolInput}
          placeholder="Stock Symbol"
          placeholderTextColor="#999"
          value={symbol}
          onChangeText={handleSymbolChange}
          maxLength={5}
        />

        <View style={styles.periodSelector}>
          {['1m', '3m', '6m', '1y', '2y', '5y'].map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodButton, period === p && styles.activeButton]}
              onPress={() => handlePeriodChange(p)}
            >
              <Text
                style={[
                  styles.periodText,
                  period === p && styles.activeButtonText,
                ]}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Chart Tabs */}
      <View style={styles.chartTabs}>
        <TouchableOpacity
          style={[styles.chartTab, activeChart === 'price' && styles.activeChartTab]}
          onPress={() => setActiveChart('price')}
        >
          <Text
            style={[
              styles.chartTabText,
              activeChart === 'price' && styles.activeChartTabText,
            ]}
          >
            Price
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chartTab, activeChart === 'rsi' && styles.activeChartTab]}
          onPress={() => setActiveChart('rsi')}
        >
          <Text
            style={[
              styles.chartTabText,
              activeChart === 'rsi' && styles.activeChartTabText,
            ]}
          >
            RSI
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chartTab, activeChart === 'macd' && styles.activeChartTab]}
          onPress={() => setActiveChart('macd')}
        >
          <Text
            style={[
              styles.chartTabText,
              activeChart === 'macd' && styles.activeChartTabText,
            ]}
          >
            MACD
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chartTab, activeChart === 'volatility' && styles.activeChartTab]}
          onPress={() => setActiveChart('volatility')}
        >
          <Text
            style={[
              styles.chartTabText,
              activeChart === 'volatility' && styles.activeChartTabText,
            ]}
          >
            Vol
          </Text>
        </TouchableOpacity>
      </View>

      {/* Charts */}
      {loading ? (
        <ActivityIndicator size="large" color="#0066FF" style={{ marginTop: 50 }} />
      ) : (
        <>
          {activeChart === 'price' && renderPriceChart()}
          {activeChart === 'rsi' && renderRSIChart()}
          {activeChart === 'macd' && renderMACDChart()}
          {activeChart === 'volatility' && renderVolatilityStats()}
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
  controlsContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 12,
    elevation: 2,
  },
  symbolInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    fontWeight: 'bold',
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  activeButton: {
    backgroundColor: '#0066FF',
    borderColor: '#0066FF',
  },
  periodText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  activeButtonText: {
    color: 'white',
  },
  chartTabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  chartTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeChartTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#0066FF',
  },
  chartTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#999',
  },
  activeChartTabText: {
    color: '#0066FF',
  },
  chartContainer: {
    backgroundColor: 'white',
    margin: 12,
    padding: 12,
    borderRadius: 12,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  priceDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  indicatorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  indicatorValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  chart: {
    borderRadius: 8,
  },
  rsiLevels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  rsiLevel: {
    alignItems: 'center',
  },
  rsiBadge: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginBottom: 4,
  },
  rsiLevelText: {
    fontSize: 10,
    color: '#666',
  },
  macdStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  macdStat: {
    alignItems: 'center',
  },
  macdStatLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  macdStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  volatilityContainer: {
    backgroundColor: 'white',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  volatilityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  volatilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  volatilityItem: {
    width: '50%',
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  volatilityLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  volatilityValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default EnhancedChartingScreen;
