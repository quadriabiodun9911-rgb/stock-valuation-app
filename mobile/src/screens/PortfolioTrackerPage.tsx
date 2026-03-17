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
  Dimensions,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { stockAPI } from '../services/api';

interface Props {
  navigation: NavigationProp<any>;
}

interface PortfolioHolding {
  id: string;
  symbol: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  intrinsicValue: number;
  sector?: string;
}

interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  totalPL: number;
  totalPLPercent: number;
  riskScore: number; // 0-100
  diversificationScore: number; // 0-100
  topRiskHolding: string;
  largestPosition: string;
  overallIntrinsicValue: number;
  portfolioVsIntrinsic: number; // percentage
}

const PORTFOLIO_STORAGE_KEY = 'sv_portfolio_tracker_holdings_v1';
const PORTFOLIO_CASH_STORAGE_KEY = 'sv_portfolio_tracker_cash_v1';

const PortfolioTrackerPage: React.FC<Props> = ({ navigation }) => {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');

  const normalizeSymbol = (value: string) => value.trim().toUpperCase();

  const toTrackerHolding = (position: any): PortfolioHolding => {
    const qty = Number(position.shares ?? position.quantity ?? 0);
    const currentPrice = Number(position.current_price ?? position.currentPrice ?? 0);
    return {
      id: normalizeSymbol(position.symbol || `P-${Math.random()}`),
      symbol: normalizeSymbol(position.symbol || ''),
      quantity: qty,
      buyPrice: Number(position.cost_basis ?? position.buyPrice ?? 0),
      currentPrice,
      intrinsicValue: Number(position.intrinsic_value ?? position.intrinsicValue ?? currentPrice * 1.1),
      sector: position.sector || 'Unknown',
    };
  };

  const persistPortfolio = async (nextHoldings: PortfolioHolding[], cash = 0) => {
    const positions = nextHoldings.map((holding) => ({
      symbol: normalizeSymbol(holding.symbol),
      shares: Number(holding.quantity),
      cost_basis: Number(holding.buyPrice),
    }));

    await AsyncStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(nextHoldings));
    await AsyncStorage.setItem(PORTFOLIO_CASH_STORAGE_KEY, String(cash));

    await stockAPI.updatePortfolio({ positions, cash });
  };

  // Load portfolio from AsyncStorage (in production, use actual storage)
  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      const [storedHoldings, storedCash] = await Promise.all([
        AsyncStorage.getItem(PORTFOLIO_STORAGE_KEY),
        AsyncStorage.getItem(PORTFOLIO_CASH_STORAGE_KEY),
      ]);

      const localCash = storedCash ? Number(storedCash) || 0 : 0;
      const localHoldings: PortfolioHolding[] = storedHoldings ? JSON.parse(storedHoldings) : [];

      try {
        const portfolio = await stockAPI.getPortfolio();
        const apiHoldings = (portfolio.positions || []).map(toTrackerHolding);

        if (apiHoldings.length > 0) {
          setHoldings(apiHoldings);
          await AsyncStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(apiHoldings));
        } else if (localHoldings.length > 0) {
          setHoldings(localHoldings);
          await stockAPI.updatePortfolio({
            positions: localHoldings.map((holding) => ({
              symbol: normalizeSymbol(holding.symbol),
              shares: Number(holding.quantity),
              cost_basis: Number(holding.buyPrice),
            })),
            cash: localCash,
          });
        } else {
          setHoldings([]);
        }
      } catch {
        setHoldings(localHoldings);
      }
    } catch (error) {
      console.error('Failed to load portfolio:', error);
      Alert.alert('Error', 'Unable to load portfolio from storage.');
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (): PortfolioMetrics => {
    if (holdings.length === 0) {
      return {
        totalValue: 0,
        totalCost: 0,
        totalPL: 0,
        totalPLPercent: 0,
        riskScore: 0,
        diversificationScore: 0,
        topRiskHolding: '-',
        largestPosition: '-',
        overallIntrinsicValue: 0,
        portfolioVsIntrinsic: 0,
      };
    }

    // Calculate basic metrics
    const totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0);
    const totalCost = holdings.reduce((sum, h) => sum + h.quantity * h.buyPrice, 0);
    const totalPL = totalValue - totalCost;
    const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
    const overallIntrinsicValue = holdings.reduce(
      (sum, h) => sum + h.quantity * h.intrinsicValue,
      0
    );
    const portfolioVsIntrinsic =
      overallIntrinsicValue > 0 ? ((totalValue / overallIntrinsicValue) * 100 - 100) : 0;

    // Calculate Risk Score (0-100)
    // Higher = more risky
    let riskScore = 50; // Base score

    // Factor 1: Concentration risk (if one stock > 40% of portfolio)
    const positionRatios = holdings.map((h) => (h.quantity * h.currentPrice) / totalValue);
    const maxPosition = Math.max(...positionRatios);
    if (maxPosition > 0.4) riskScore += 20;
    else if (maxPosition > 0.3) riskScore += 10;
    else riskScore -= 10;

    // Factor 2: Volatility/Margin of Safety (distance from intrinsic value)
    const avgMarginOfSafety =
      holdings.reduce(
        (sum, h) => sum + ((h.intrinsicValue - h.currentPrice) / h.intrinsicValue) * 100,
        0
      ) / holdings.length;

    if (avgMarginOfSafety < 5) riskScore += 15; // Trading close to intrinsic
    else if (avgMarginOfSafety < 15) riskScore += 5;
    else if (avgMarginOfSafety > 30) riskScore -= 15;

    // Factor 3: Profitability (P/L status)
    const unprofitableCount = holdings.filter(
      (h) => h.quantity * h.currentPrice < h.quantity * h.buyPrice
    ).length;
    if (unprofitableCount > holdings.length * 0.5) riskScore += 10;
    else if (unprofitableCount === 0) riskScore -= 5;

    riskScore = Math.max(0, Math.min(100, riskScore));

    // Calculate Diversification Score (0-100)
    // Higher = more diversified
    let diversificationScore = 0;

    // Factor 1: Number of holdings
    if (holdings.length === 1) diversificationScore = 20;
    else if (holdings.length === 2) diversificationScore = 40;
    else if (holdings.length === 3) diversificationScore = 60;
    else if (holdings.length >= 4) diversificationScore = 80;

    // Factor 2: Sector diversification
    const sectors = new Set(holdings.map((h) => h.sector || 'Unknown'));
    if (sectors.size >= 3) diversificationScore += 15;
    else if (sectors.size === 2) diversificationScore += 8;

    // Factor 3: Position concentration (inverse of concentration risk)
    const hhi = positionRatios.reduce((sum, r) => sum + r * r, 0);
    if (hhi < 0.3) diversificationScore += 5;

    diversificationScore = Math.max(0, Math.min(100, diversificationScore));

    // Find largest position and most risky holding
    let largestPosition = holdings[0].symbol;
    let maxValue = 0;
    holdings.forEach((h) => {
      const value = h.quantity * h.currentPrice;
      if (value > maxValue) {
        maxValue = value;
        largestPosition = h.symbol;
      }
    });

    // Most risky = furthest from intrinsic value
    let topRiskHolding = holdings[0].symbol;
    let minMargin = Infinity;
    holdings.forEach((h) => {
      const margin = ((h.intrinsicValue - h.currentPrice) / h.intrinsicValue) * 100;
      if (margin < minMargin) {
        minMargin = margin;
        topRiskHolding = h.symbol;
      }
    });

    return {
      totalValue,
      totalCost,
      totalPL,
      totalPLPercent,
      riskScore: Math.round(riskScore),
      diversificationScore: Math.round(diversificationScore),
      topRiskHolding,
      largestPosition,
      overallIntrinsicValue,
      portfolioVsIntrinsic,
    };
  };

  const metrics = useMemo(() => calculateMetrics(), [holdings]);

  const addHolding = async () => {
    if (!symbol.trim() || !quantity || !buyPrice) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      const parsedQuantity = parseFloat(quantity);
      const parsedBuyPrice = parseFloat(buyPrice);

      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || !Number.isFinite(parsedBuyPrice) || parsedBuyPrice <= 0) {
        Alert.alert('Invalid input', 'Quantity and buy price must be valid positive numbers.');
        return;
      }

      let currentPrice = parsedBuyPrice;
      let intrinsicValue = parsedBuyPrice * 1.1;
      let sector = 'Unknown';

      try {
        const info = await stockAPI.getStockInfo(normalizeSymbol(symbol));
        currentPrice = Number(info.current_price || parsedBuyPrice);
        sector = info.sector || 'Unknown';
      } catch {
      }

      try {
        const intrinsic = await stockAPI.getIntrinsicValue(normalizeSymbol(symbol));
        intrinsicValue = Number(intrinsic.intrinsic_value || intrinsicValue);
      } catch {
      }

      const normalizedSymbol = normalizeSymbol(symbol);
      const existing = holdings.find((holding) => normalizeSymbol(holding.symbol) === normalizedSymbol);
      let nextHoldings: PortfolioHolding[];

      if (existing) {
        const nextQuantity = existing.quantity + parsedQuantity;
        const weightedBuyPrice = ((existing.buyPrice * existing.quantity) + (parsedBuyPrice * parsedQuantity)) / nextQuantity;

        nextHoldings = holdings.map((holding) =>
          normalizeSymbol(holding.symbol) === normalizedSymbol
            ? {
              ...holding,
              quantity: nextQuantity,
              buyPrice: weightedBuyPrice,
              currentPrice,
              intrinsicValue,
              sector,
            }
            : holding
        );
      } else {
        const newHolding: PortfolioHolding = {
          id: normalizedSymbol,
          symbol: normalizedSymbol,
          quantity: parsedQuantity,
          buyPrice: parsedBuyPrice,
          currentPrice,
          intrinsicValue,
          sector,
        };
        nextHoldings = [...holdings, newHolding];
      }

      setHoldings(nextHoldings);
      await persistPortfolio(nextHoldings);

      setSymbol('');
      setQuantity('');
      setBuyPrice('');
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save holding permanently.');
      await loadPortfolio();
    }
  };

  const removeHolding = (id: string) => {
    Alert.alert('Delete holding', 'This will permanently remove the stock from your portfolio.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const nextHoldings = holdings.filter((holding) => holding.id !== id);
            setHoldings(nextHoldings);
            await persistPortfolio(nextHoldings);
          } catch {
            Alert.alert('Error', 'Failed to delete permanently. Restoring latest saved data.');
            await loadPortfolio();
          }
        },
      },
    ]);
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return '#10B981'; // Green - low risk
    if (score < 60) return '#F59E0B'; // Amber - medium risk
    return '#EF4444'; // Red - high risk
  };

  const getDiversificationColor = (score: number) => {
    if (score >= 70) return '#10B981'; // Green - well diversified
    if (score >= 40) return '#F59E0B'; // Amber - okay
    return '#EF4444'; // Red - concentrated
  };

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
        <Text style={styles.headerTitle}>Portfolio Tracker</Text>
        <Text style={styles.headerSubtitle}>Intelligent Portfolio Advisor</Text>
      </View>

      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={styles.addButton}
      >
        <Ionicons name="add-circle" size={28} color="#3B82F6" />
      </TouchableOpacity>
    </LinearGradient>
  );

  const renderPortfolioSummary = () => (
    <View style={styles.summarySection}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>Portfolio Summary</Text>
      </View>

      <View style={styles.summaryCards}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Value</Text>
          <Text style={styles.summaryValue}>
            ₦{metrics.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Cost</Text>
          <Text style={styles.summaryValue}>
            ₦{metrics.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>P/L</Text>
          <Text
            style={[
              styles.summaryValue,
              {
                color: metrics.totalPL >= 0 ? '#10B981' : '#EF4444',
              },
            ]}
          >
            {metrics.totalPL >= 0 ? '+' : ''}
            {metrics.totalPL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </Text>
          <Text
            style={[
              styles.plPercent,
              {
                color: metrics.totalPLPercent >= 0 ? '#10B981' : '#EF4444',
              },
            ]}
          >
            {metrics.totalPLPercent >= 0 ? '+' : ''}
            {metrics.totalPLPercent.toFixed(1)}%
          </Text>
        </View>
      </View>
    </View>
  );

  const renderValuationAnalysis = () => (
    <View style={styles.valuationSection}>
      <Text style={styles.sectionTitle}>Valuation Analysis</Text>
      <View style={styles.valuationCard}>
        <View style={styles.valuationRow}>
          <Text style={styles.valuationLabel}>Portfolio Value</Text>
          <Text style={styles.valuationValue}>
            ₦{metrics.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.valuationRow}>
          <Text style={styles.valuationLabel}>Intrinsic Value</Text>
          <Text style={styles.valuationValue}>
            ₦{metrics.overallIntrinsicValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.valuationRow}>
          <Text style={styles.valuationLabel}>vs Intrinsic</Text>
          <Text
            style={[
              styles.valuationValue,
              {
                color:
                  metrics.portfolioVsIntrinsic < 0 ? '#10B981' : '#EF4444',
              },
            ]}
          >
            {metrics.portfolioVsIntrinsic < 0 ? '' : '+'}
            {metrics.portfolioVsIntrinsic.toFixed(1)}%
          </Text>
        </View>
      </View>
    </View>
  );

  const renderScores = () => (
    <View style={styles.scoresSection}>
      <Text style={styles.sectionTitle}>Portfolio Health</Text>

      <View style={styles.scoreCards}>
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <Ionicons
              name="shield-checkmark"
              size={24}
              color={getRiskColor(metrics.riskScore)}
            />
            <Text style={styles.scoreCardTitle}>Risk Score</Text>
          </View>
          <View style={styles.scoreDisplay}>
            <Text
              style={[
                styles.scoreNumber,
                { color: getRiskColor(metrics.riskScore) },
              ]}
            >
              {metrics.riskScore}
            </Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
          <View
            style={[
              styles.scoreBar,
              {
                backgroundColor: '#334155',
              },
            ]}
          >
            <View
              style={[
                styles.scoreBarFill,
                {
                  width: `${metrics.riskScore}%`,
                  backgroundColor: getRiskColor(metrics.riskScore),
                },
              ]}
            />
          </View>
          <Text style={styles.scoreHint}>
            {metrics.riskScore < 30
              ? 'Low risk'
              : metrics.riskScore < 60
                ? 'Moderate risk'
                : 'High risk'}
          </Text>
        </View>

        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <Ionicons
              name="pie-chart"
              size={24}
              color={getDiversificationColor(metrics.diversificationScore)}
            />
            <Text style={styles.scoreCardTitle}>Diversification</Text>
          </View>
          <View style={styles.scoreDisplay}>
            <Text
              style={[
                styles.scoreNumber,
                { color: getDiversificationColor(metrics.diversificationScore) },
              ]}
            >
              {metrics.diversificationScore}
            </Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
          <View
            style={[
              styles.scoreBar,
              {
                backgroundColor: '#334155',
              },
            ]}
          >
            <View
              style={[
                styles.scoreBarFill,
                {
                  width: `${metrics.diversificationScore}%`,
                  backgroundColor: getDiversificationColor(
                    metrics.diversificationScore
                  ),
                },
              ]}
            />
          </View>
          <Text style={styles.scoreHint}>
            {metrics.diversificationScore >= 70
              ? 'Well diversified'
              : metrics.diversificationScore >= 40
                ? 'Moderate diversity'
                : 'Concentrated'}
          </Text>
        </View>
      </View>

      <View style={styles.insightsRow}>
        <View style={styles.insightCard}>
          <Text style={styles.insightLabel}>Largest Position</Text>
          <Text style={styles.insightValue}>{metrics.largestPosition}</Text>
        </View>
        <View style={styles.insightCard}>
          <Text style={styles.insightLabel}>Highest Risk</Text>
          <Text style={styles.insightValue}>{metrics.topRiskHolding}</Text>
        </View>
      </View>
    </View>
  );

  const renderHoldings = () => (
    <View style={styles.holdingsSection}>
      <Text style={styles.sectionTitle}>Holdings ({holdings.length})</Text>
      {holdings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="wallet-outline" size={48} color="#475569" />
          <Text style={styles.emptyStateText}>No holdings yet</Text>
          <Text style={styles.emptyStateHint}>Tap + to add your first stock</Text>
        </View>
      ) : (
        <FlatList
          data={holdings}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.holdingCard}
              onPress={() => navigation.navigate('StockPage', { symbol: item.symbol })}
            >
              <View style={styles.holdingHeader}>
                <View>
                  <Text style={styles.holdingSymbol}>{item.symbol}</Text>
                  <Text style={styles.holdingQty}>
                    {item.quantity} shares @ ₦{item.buyPrice.toFixed(2)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeHolding(item.id)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <View style={styles.holdingMetrics}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Current</Text>
                  <Text style={styles.metricValue}>₦{item.currentPrice.toFixed(2)}</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Intrinsic</Text>
                  <Text style={styles.metricValue}>₦{item.intrinsicValue.toFixed(2)}</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Position Value</Text>
                  <Text style={styles.metricValue}>
                    ₦{(item.quantity * item.currentPrice).toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.holdingPL}>
                <View style={styles.plBox}>
                  <Text style={styles.plLabel}>P/L</Text>
                  <Text
                    style={[
                      styles.plAmount,
                      {
                        color:
                          item.quantity * (item.currentPrice - item.buyPrice) >= 0
                            ? '#10B981'
                            : '#EF4444',
                      },
                    ]}
                  >
                    {item.quantity * (item.currentPrice - item.buyPrice) >= 0 ? '+' : ''}
                    ₦
                    {(item.quantity * (item.currentPrice - item.buyPrice)).toLocaleString(
                      undefined,
                      { maximumFractionDigits: 0 }
                    )}
                  </Text>
                </View>
                <View style={styles.plBox}>
                  <Text style={styles.plLabel}>Return %</Text>
                  <Text
                    style={[
                      styles.plAmount,
                      {
                        color:
                          ((item.currentPrice - item.buyPrice) / item.buyPrice) * 100 >= 0
                            ? '#10B981'
                            : '#EF4444',
                      },
                    ]}
                  >
                    {((item.currentPrice - item.buyPrice) / item.buyPrice) * 100 >= 0 ? '+' : ''}
                    {(((item.currentPrice - item.buyPrice) / item.buyPrice) * 100).toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.plBox}>
                  <Text style={styles.plLabel}>Vs Intrinsic</Text>
                  <Text
                    style={[
                      styles.plAmount,
                      {
                        color:
                          item.currentPrice < item.intrinsicValue ? '#10B981' : '#EF4444',
                      },
                    ]}
                  >
                    {item.currentPrice < item.intrinsicValue ? '-' : '+'}
                    {Math.abs(
                      ((item.intrinsicValue - item.currentPrice) / item.intrinsicValue) * 100
                    ).toFixed(1)}
                    %
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.holdingSeparator} />}
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
            <Text style={styles.modalTitle}>Add Stock to Portfolio</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color="#f8fafc" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Stock Symbol</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., MTN"
              placeholderTextColor="#94a3b8"
              value={symbol}
              onChangeText={setSymbol}
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>Quantity</Text>
            <TextInput
              style={styles.input}
              placeholder="Number of shares"
              placeholderTextColor="#94a3b8"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
            />

            <Text style={styles.inputLabel}>Buy Price (₦)</Text>
            <TextInput
              style={styles.input}
              placeholder="Price per share"
              placeholderTextColor="#94a3b8"
              value={buyPrice}
              onChangeText={setBuyPrice}
              keyboardType="decimal-pad"
            />

            <TouchableOpacity
              style={styles.addModalButton}
              onPress={addHolding}
            >
              <Text style={styles.addModalButtonText}>Add to Portfolio</Text>
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
          <Text style={styles.loadingText}>Loading portfolio...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {holdings.length > 0 && renderPortfolioSummary()}
          {holdings.length > 0 && renderValuationAnalysis()}
          {holdings.length > 0 && renderScores()}
          {renderHoldings()}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Your intelligent advisor tracks P/L, risk, and diversification in real-time.
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
    padding: 8,
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
    padding: 8,
  },
  summarySection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  summaryHeader: {
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  plPercent: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  valuationSection: {
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
  valuationCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  valuationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  valuationLabel: {
    fontSize: 13,
    color: '#cbd5e1',
  },
  valuationValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  separator: {
    height: 1,
    backgroundColor: '#334155',
  },
  scoresSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scoreCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  scoreCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  scoreMax: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 2,
  },
  scoreBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreHint: {
    fontSize: 10,
    color: '#94a3b8',
  },
  insightsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  insightCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  insightLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  holdingsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  holdingCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 0,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  holdingSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  holdingQty: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  holdingMetrics: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#0b1120',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  holdingPL: {
    flexDirection: 'row',
    gap: 8,
  },
  plBox: {
    flex: 1,
    backgroundColor: '#0b1120',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  plLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 2,
  },
  plAmount: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  holdingSeparator: {
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
    maxHeight: '80%',
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
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 14,
  },
  addModalButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'center',
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

export default PortfolioTrackerPage;
