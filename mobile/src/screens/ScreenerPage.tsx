import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Market, stockAPI } from '../services/api';

interface Props {
  navigation: NavigationProp<any>;
}

interface FilterCriteria {
  name: string;
  met: boolean;
  color: string;
}

interface ScreenedStock {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  currentPrice: number;
  valueScore: number;
  qualityScore: number;
  momentumScore: number;
  overallScore: number;
  discountToFairValue: number;
  recommendation: string;
  filtersMet: number;
  totalFilters: number;
}

const ScreenerPage: React.FC<Props> = ({ navigation }) => {
  const [stocks, setStocks] = useState<ScreenedStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedMarket, setSelectedMarket] = useState<Market>('US');
  const [strictMode, setStrictMode] = useState<3 | 4 | 5>(3);

  const SCREENER_MARKET_KEY = 'sv_screener_market_v1';
  const SCREENER_STRICT_KEY = 'sv_screener_strict_v1';

  const marketOptions: Market[] = ['US', 'NGX', 'UK', 'EU', 'ASIA', 'EMERGING'];

  const FILTER_CRITERIA = {
    undervalued: { name: 'Undervalued > 25%', color: '#10B981' },
    earnings: { name: 'Positive Earnings', color: '#3B82F6' },
    revenue: { name: 'Revenue Growth > 5%', color: '#8B5CF6' },
    debt: { name: 'Debt < 50% Equity', color: '#F59E0B' },
    momentum: { name: 'Positive Momentum', color: '#EC4899' },
  };

  useEffect(() => {
    loadScreenedStocks();
  }, [selectedMarket]);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [storedMarket, storedStrict] = await Promise.all([
          AsyncStorage.getItem(SCREENER_MARKET_KEY),
          AsyncStorage.getItem(SCREENER_STRICT_KEY),
        ]);

        if (storedMarket && marketOptions.includes(storedMarket as Market)) {
          setSelectedMarket(storedMarket as Market);
        }

        if (storedStrict === '3' || storedStrict === '4' || storedStrict === '5') {
          setStrictMode(Number(storedStrict) as 3 | 4 | 5);
        }
      } catch {
      }
    };

    loadPreferences();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(SCREENER_MARKET_KEY, selectedMarket).catch(() => undefined);
  }, [selectedMarket]);

  useEffect(() => {
    AsyncStorage.setItem(SCREENER_STRICT_KEY, String(strictMode)).catch(() => undefined);
  }, [strictMode]);

  const visibleStocks = useMemo(
    () => stocks.filter((stock) => stock.filtersMet >= strictMode),
    [stocks, strictMode]
  );

  const matchedCount = visibleStocks.length;

  const loadScreenedStocks = async () => {
    try {
      setLoading(true);
      const response = await stockAPI.getMarketScreener(selectedMarket, {});

      const screened = response.results
        .map((stock: any) => {
          const filtersMet = calculateFiltersMet(stock);
          return {
            symbol: stock.symbol,
            name: stock.name || stock.symbol,
            sector: stock.sector || 'Unknown',
            industry: stock.industry || 'Unknown',
            currentPrice: stock.price || 0,
            valueScore: stock.value_score || 0,
            qualityScore: Math.max(0, 100 - ((stock.volatility || 0) * 100)),
            momentumScore: stock.momentum || 0,
            overallScore: stock.ai_score || 0,
            discountToFairValue: stock.value_score || 0,
            recommendation: stock.signal || 'Watch',
            filtersMet,
            totalFilters: 5,
          };
        })
        .sort((a, b) => (b.filtersMet - a.filtersMet) || (b.overallScore - a.overallScore))
        .slice(0, 120);

      setTotalCount(response.total || screened.length);
      setStocks(screened);
    } catch (error) {
      console.error('Failed to load screened stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFiltersMet = (stock: any): number => {
    let count = 0;

    if ((stock.value_score || 0) >= 70) {
      count++;
    }

    if ((stock.pe_ratio || 0) > 0) {
      count++;
    }

    if ((stock.momentum || 0) >= 5) {
      count++;
    }

    if ((stock.volatility || 1) <= 0.5) {
      count++;
    }

    if ((stock.momentum || 0) > 0) {
      count++;
    }

    return count;
  };

  const getFilterStatus = (stock: ScreenedStock): FilterCriteria[] => {
    return [
      {
        name: FILTER_CRITERIA.undervalued.name,
        met: stock.valueScore >= 70,
        color: FILTER_CRITERIA.undervalued.color,
      },
      {
        name: FILTER_CRITERIA.earnings.name,
        met: stock.currentPrice > 0,
        color: FILTER_CRITERIA.earnings.color,
      },
      {
        name: FILTER_CRITERIA.revenue.name,
        met: stock.momentumScore >= 5,
        color: FILTER_CRITERIA.revenue.color,
      },
      {
        name: FILTER_CRITERIA.debt.name,
        met: stock.qualityScore >= 50,
        color: FILTER_CRITERIA.debt.color,
      },
      {
        name: FILTER_CRITERIA.momentum.name,
        met: stock.momentumScore > 0,
        color: FILTER_CRITERIA.momentum.color,
      },
    ];
  };

  const renderMarketSelector = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.marketSelectorScroll}>
      {marketOptions.map((market) => (
        <TouchableOpacity
          key={market}
          onPress={() => setSelectedMarket(market)}
          style={[styles.marketChip, selectedMarket === market && styles.marketChipActive]}
        >
          <Text style={[styles.marketChipText, selectedMarket === market && styles.marketChipTextActive]}>{market}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderStrictModeSelector = () => (
    <View style={styles.strictModeContainer}>
      <Text style={styles.strictModeTitle}>Strict Mode</Text>
      <View style={styles.strictModeChips}>
        {[3, 4, 5].map((threshold) => (
          <TouchableOpacity
            key={threshold}
            onPress={() => setStrictMode(threshold as 3 | 4 | 5)}
            style={[styles.strictChip, strictMode === threshold && styles.strictChipActive]}
          >
            <Text style={[styles.strictChipText, strictMode === threshold && styles.strictChipTextActive]}>
              {threshold}+/5
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle}>Stock Screener</Text>
        <Text style={styles.headerSubtitle}>Whole-market scan • {selectedMarket}</Text>
      </View>

      <TouchableOpacity
        onPress={loadScreenedStocks}
        style={styles.refreshButton}
      >
        <Ionicons name="refresh" size={24} color="#3B82F6" />
      </TouchableOpacity>
    </LinearGradient>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Total Stocks</Text>
        <Text style={styles.statValue}>{totalCount}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Core Matches ({strictMode}+)</Text>
        <Text style={[styles.statValue, { color: '#10B981' }]}>{matchedCount}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Coverage</Text>
        <Text style={[styles.statValue, { color: '#3B82F6' }]}>
          {totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0}%
        </Text>
      </View>
    </View>
  );

  const renderFilterLegend = () => (
    <View style={styles.filterLegend}>
      <Text style={styles.filterLegendTitle}>Active Filters</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
      >
        {Object.entries(FILTER_CRITERIA).map(([key, filter]) => (
          <View key={key} style={styles.filterBadge}>
            <View
              style={[styles.filterDot, { backgroundColor: filter.color }]}
            />
            <Text style={styles.filterBadgeText}>{filter.name}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderStockCard = ({ item, index }: { item: ScreenedStock; index: number }) => {
    const filterStatus = getFilterStatus(item);
    const rankColor =
      index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#3B82F6';

    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate('StockPage', { symbol: item.symbol })
        }
        style={styles.stockCard}
      >
        <View style={styles.cardHeader}>
          <View style={styles.rankBadge}>
            <Text style={[styles.rankText, { color: rankColor }]}>#{index + 1}</Text>
          </View>

          <View style={styles.symbolSection}>
            <Text style={styles.symbolText}>{item.symbol}</Text>
            <Text style={styles.priceText}>${item.currentPrice.toFixed(2)}</Text>
            <Text style={styles.companyText}>{item.name}</Text>
            <Text style={styles.sectorText}>{item.sector} • {item.industry}</Text>
          </View>

          <View style={styles.scoreContainer}>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>Overall</Text>
              <Text style={[styles.scoreValue, { color: '#3B82F6' }]}>
                {Math.round(item.overallScore)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Value</Text>
            <Text style={styles.metricValue}>{Math.round(item.valueScore)}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Quality</Text>
            <Text style={styles.metricValue}>{Math.round(item.qualityScore)}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Momentum</Text>
            <Text style={styles.metricValue}>{Math.round(item.momentumScore)}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Discount</Text>
            <Text style={[styles.metricValue, { color: '#10B981' }]}>
              {item.discountToFairValue.toFixed(1)}
            </Text>
          </View>
        </View>

        <View style={styles.filtersRow}>
          {filterStatus.map((filter, idx) => (
            <View
              key={idx}
              style={[
                styles.filterCheck,
                {
                  backgroundColor: filter.met
                    ? `${filter.color}20`
                    : 'rgba(148, 163, 184, 0.1)',
                },
              ]}
            >
              <Ionicons
                name={filter.met ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={filter.met ? filter.color : '#94a3b8'}
              />
              <Text
                style={[
                  styles.filterCheckText,
                  { color: filter.met ? filter.color : '#94a3b8' },
                ]}
              >
                {filter.name.split('>')[0].split('<')[0].trim()}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.recommendationBadge}>
          <Text
            style={[
              styles.recommendationText,
              {
                color:
                  item.recommendation === 'BUY'
                    ? '#10B981'
                    : item.recommendation === 'HOLD'
                      ? '#F59E0B'
                      : '#EF4444',
              },
            ]}
          >
            {item.recommendation}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="filter-outline" size={64} color="#475569" />
      <Text style={styles.emptyStateTitle}>No Stocks Found</Text>
      <Text style={styles.emptyStateText}>
        No stocks available for this market right now. Try refreshing.
      </Text>
      <TouchableOpacity
        onPress={loadScreenedStocks}
        style={styles.retryButton}
      >
        <Text style={styles.retryButtonText}>Refresh Data</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Screening stocks...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderMarketSelector()}
          {renderStrictModeSelector()}
          {renderStats()}
          {renderFilterLegend()}

          {visibleStocks.length > 0 ? (
            <View style={styles.stocksList}>
              <Text style={styles.resultsTitle}>
                Scan Results ({visibleStocks.length})
              </Text>
              <FlatList
                data={visibleStocks}
                renderItem={renderStockCard}
                keyExtractor={(item) => item.symbol}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            </View>
          ) : (
            renderEmptyState()
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              This premium screener runs algorithmic filters to identify investment opportunities.
            </Text>
          </View>
        </ScrollView>
      )}
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
  refreshButton: {
    padding: 8,
  },
  marketSelectorScroll: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  strictModeContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  strictModeTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  strictModeChips: {
    flexDirection: 'row',
    gap: 8,
  },
  strictChip: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  strictChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  strictChipText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  strictChipTextActive: {
    color: '#052e1b',
  },
  marketChip: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  marketChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  marketChipText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  marketChipTextActive: {
    color: '#f8fafc',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  filterLegend: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterLegendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  filterScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    gap: 6,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterBadgeText: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  stocksList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stockCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 0,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0b1120',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  symbolSection: {
    flex: 1,
  },
  symbolText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  priceText: {
    fontSize: 13,
    color: '#cbd5e1',
    marginTop: 2,
  },
  companyText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  sectorText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  scoreContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  scoreBox: {
    backgroundColor: '#0b1120',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
  },
  metricItem: {
    flex: 1,
    backgroundColor: '#0b1120',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginTop: 2,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  filterCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  filterCheckText: {
    fontSize: 9,
    fontWeight: '500',
    maxWidth: 80,
  },
  recommendationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#0b1120',
    borderWidth: 1,
    borderColor: '#334155',
  },
  recommendationText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  separator: {
    height: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 14,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginTop: 12,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#f8fafc',
    fontWeight: 'bold',
    fontSize: 13,
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

export default ScreenerPage;
