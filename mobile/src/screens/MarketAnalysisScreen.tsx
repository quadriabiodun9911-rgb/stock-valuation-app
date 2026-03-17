import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { API_URL, Market } from '../services/api';

const { width } = Dimensions.get('window');

interface MomentumData {
  breadth_ratio: number;
  market_rsi: number;
  trend_strength: number;
  volatility: number;
  momentum_signal: string;
}

interface SectorData {
  market?: string;
  sector_rankings: Array<{
    sector: string;
    performance_1m: number;
    momentum: string;
    count?: number;
  }>;
  industry_rankings?: Array<{
    industry: string;
    performance_1m: number;
    momentum: string;
    count?: number;
  }>;
  scanned_count?: number;
  market_sentiment: string;
}

interface DashboardData {
  overall_market_health: number;
  composite_signal: string;
  risk_level: string;
  signal_summary: {
    bullish: number;
    bearish: number;
    neutral: number;
  };
}

export default function MarketAnalysisScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'momentum' | 'sectors' | 'dashboard' | 'regime'>('dashboard');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [selectedMarket, setSelectedMarket] = useState<Market>('US');
  const MARKET_ANALYSIS_SELECTED_KEY = 'sv_market_analysis_selected_market_v1';

  const marketOptions: Market[] = ['US', 'NGX', 'UK', 'EU', 'ASIA', 'EMERGING'];

  const [momentumData, setMomentumData] = useState<MomentumData | null>(null);
  const [sectorData, setSectorData] = useState<SectorData | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [regimeData, setRegimeData] = useState<any>(null);

  const modulesReady = [momentumData, sectorData, dashboardData, regimeData].filter(Boolean).length;

  const fetchJson = async (path: string) => {
    const response = await fetch(`${API_URL}${path}`);
    if (!response.ok) throw new Error(`${path} failed: ${response.status}`);
    return response.json();
  };

  const fetchMarketAnalysis = async (isBackgroundRefresh = false) => {
    try {
      if (!isBackgroundRefresh) setLoading(true);

      const regionKey = selectedMarket.toLowerCase() === 'ngx' ? 'ngx' : selectedMarket.toLowerCase();
      const path = `/market/${regionKey}/summary`;
      const data = await fetchJson(path);

      const quotes = Array.isArray(data.quotes) ? data.quotes : [];

      // Dashboard: derive simple health & signal
      const changes = quotes.map((q: any) => Number(q.change_pct || 0));
      const meanChange = changes.length ? changes.reduce((a: number, b: number) => a + b, 0) / changes.length : 0;
      const overall_health = Math.max(0, Math.min(100, 50 + meanChange));
      const composite_signal = meanChange > 0.02 ? 'bullish' : meanChange < -0.02 ? 'bearish' : 'neutral';
      const signal_summary = {
        bullish: quotes.filter((q: any) => (q.change_pct || 0) > 0.0).length,
        bearish: quotes.filter((q: any) => (q.change_pct || 0) < 0.0).length,
        neutral: quotes.filter((q: any) => Math.abs((q.change_pct || 0)) <= 0.0).length,
      };

      setDashboardData({
        overall_market_health: overall_health,
        composite_signal,
        risk_level: overall_health > 65 ? 'low' : overall_health > 45 ? 'medium' : 'high',
        signal_summary,
      });

      // Sectors: prefer server-provided sectors else derive from quotes
      const sectors = Array.isArray(data.sectors) && data.sectors.length ? data.sectors : (() => {
        const groups: Record<string, { sector: string; performance_1m: number; momentum: string; count: number }> = {};
        quotes.forEach((q: any) => {
          const s = q.sector || 'Other';
          groups[s] = groups[s] || { sector: s, performance_1m: 0, momentum: 'neutral', count: 0 };
          groups[s].performance_1m += Number(q.change_pct || 0);
          groups[s].count += 1;
        });
        return Object.values(groups).map((g) => ({ ...g, performance_1m: g.count ? g.performance_1m / g.count : 0 }));
      })();
      setSectorData({ market: selectedMarket, sector_rankings: sectors.sort((a: any, b: any) => b.performance_1m - a.performance_1m), market_sentiment: composite_signal, scanned_count: quotes.length });

      // Momentum: simple derived metrics
      const positive = quotes.filter((q: any) => (q.change_pct || 0) > 0).length;
      const negative = quotes.filter((q: any) => (q.change_pct || 0) < 0).length;
      const breadth_ratio = negative === 0 ? positive : positive / negative;
      const volatility = changes.length ? Math.sqrt(changes.map((c) => Math.pow(c - meanChange, 2)).reduce((a, b) => a + b, 0) / changes.length) : 0;
      const market_rsi = Math.max(0, Math.min(100, (positive / (positive + negative || 1)) * 100));
      const trend_strength = Math.min(100, Math.abs(meanChange) * 100);
      setMomentumData({ breadth_ratio, market_rsi, trend_strength, volatility, momentum_signal: composite_signal.toUpperCase() });

      // Regime: derive simple support/resistance
      const prices = quotes.map((q: any) => Number(q.price || q.last_price || 0)).filter(Boolean);
      const support = prices.length ? Math.min(...prices) : 0;
      const resistance = prices.length ? Math.max(...prices) : 0;
      setRegimeData({ current_regime: composite_signal === 'bullish' ? 'bull' : composite_signal === 'bearish' ? 'bear' : 'sideways', regime_confidence: Math.min(1, Math.abs(meanChange) * 10), support_level: support, resistance_level: resistance, regime_duration_days: 0 });

      setErrorMessage(null);
      setLastUpdated(data.last_updated || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      console.error('Error fetching market analysis:', error);
      setErrorMessage('Market analysis service is temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketAnalysis();

    const intervalId = setInterval(() => {
      fetchMarketAnalysis(true);
    }, 60000);

    return () => clearInterval(intervalId);
  }, [selectedMarket]);

  useEffect(() => {
    const loadSavedMarket = async () => {
      try {
        const stored = await AsyncStorage.getItem(MARKET_ANALYSIS_SELECTED_KEY);
        if (stored && marketOptions.includes(stored as Market)) {
          setSelectedMarket(stored as Market);
        }
      } catch {
      }
    };

    loadSavedMarket();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(MARKET_ANALYSIS_SELECTED_KEY, selectedMarket).catch(() => undefined);
  }, [selectedMarket]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMarketAnalysis();
    setRefreshing(false);
  };

  const getSignalColor = (signal: string) => {
    if (signal.includes('BUY') || signal === 'bullish') return '#10b981';
    if (signal.includes('SELL') || signal === 'bearish') return '#ef4444';
    return '#f59e0b';
  };

  const getHealthColor = (health: number) => {
    if (health > 70) return '#10b981';
    if (health > 50) return '#f59e0b';
    return '#ef4444';
  };

  const normalizePercent = (value: number) => {
    return Math.max(0, Math.min(100, value));
  };

  const getTrendIcon = (value: number, threshold = 0) => {
    if (value > threshold) return 'arrow-up';
    if (value < threshold) return 'arrow-down';
    return 'remove';
  };

  const momentumScore = normalizePercent(momentumData?.trend_strength ?? 0);
  const volatilityScore = normalizePercent(100 - (momentumData?.volatility ?? 0) * 200);
  const breadthScore = normalizePercent(dashboardData?.overall_market_health ?? 0);

  const renderDashboard = () => {
    if (!dashboardData) {
      return (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={styles.card}>
            <Text style={styles.emptyStateText}>Dashboard data is not available yet.</Text>
          </View>
        </ScrollView>
      );
    }

    return (
      <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Overall Health Score */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Market Health Score</Text>
          <View style={styles.scoreContainer}>
            <View style={[styles.scoreCircle, { backgroundColor: getHealthColor(dashboardData.overall_market_health) }]}>
              <Text style={styles.scoreText}>{Math.round(dashboardData.overall_market_health)}%</Text>
            </View>
            <View style={styles.scoreDetails}>
              <Text style={styles.scoreLabel}>Signal: <Text style={[styles.signalBadge, { color: getSignalColor(dashboardData.composite_signal) }]}>{dashboardData.composite_signal}</Text></Text>
              <Text style={styles.scoreLabel}>Risk Level: <Text style={styles.riskLevel}>{dashboardData.risk_level.toUpperCase()}</Text></Text>
            </View>
          </View>
        </View>

        {/* Signal Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Signal Summary</Text>
          <View style={styles.signalGrid}>
            <View style={[styles.signalBox, { backgroundColor: '#10b98133' }]}>
              <Text style={[styles.signalCount, { color: '#10b981' }]}>{dashboardData.signal_summary.bullish}</Text>
              <Text style={styles.signalLabel}>Bullish</Text>
            </View>
            <View style={[styles.signalBox, { backgroundColor: '#f59e0b33' }]}>
              <Text style={[styles.signalCount, { color: '#f59e0b' }]}>{dashboardData.signal_summary.neutral}</Text>
              <Text style={styles.signalLabel}>Neutral</Text>
            </View>
            <View style={[styles.signalBox, { backgroundColor: '#ef444433' }]}>
              <Text style={[styles.signalCount, { color: '#ef4444' }]}>{dashboardData.signal_summary.bearish}</Text>
              <Text style={styles.signalLabel}>Bearish</Text>
            </View>
          </View>
        </View>

        {/* Component Scores */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Component Analysis</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreRowLabel}>Breadth</Text>
            <View style={styles.scoreBar}>
              <View style={[styles.scoreBarFill, { width: `${breadthScore}%` }]} />
            </View>
            <Text style={styles.scoreRowValue}>{Math.round(breadthScore)}%</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreRowLabel}>Momentum</Text>
            <View style={styles.scoreBar}>
              <View style={[styles.scoreBarFill, { width: `${momentumScore}%` }]} />
            </View>
            <Text style={styles.scoreRowValue}>{Math.round(momentumScore)}%</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreRowLabel}>Volatility</Text>
            <View style={styles.scoreBar}>
              <View style={[styles.scoreBarFill, { width: `${volatilityScore}%` }]} />
            </View>
            <Text style={styles.scoreRowValue}>{Math.round(volatilityScore)}%</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderMomentum = () => {
    if (!momentumData) {
      return (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={styles.card}>
            <Text style={styles.emptyStateText}>Momentum analysis data is not available yet.</Text>
          </View>
        </ScrollView>
      );
    }

    return (
      <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Market Momentum</Text>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Breadth Ratio:</Text>
            <View style={styles.metricValueRow}>
              <Ionicons
                name={getTrendIcon(momentumData.breadth_ratio, 1)}
                size={13}
                color={momentumData.breadth_ratio >= 1 ? '#10b981' : '#ef4444'}
              />
              <Text style={styles.metricValue}>{momentumData.breadth_ratio.toFixed(2)}x</Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Market RSI:</Text>
            <Text style={[styles.metricValue, { color: momentumData.market_rsi > 70 ? '#ef4444' : momentumData.market_rsi < 30 ? '#10b981' : '#f59e0b' }]}>
              {momentumData.market_rsi.toFixed(1)}
            </Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Trend Strength:</Text>
            <View style={styles.metricValueRow}>
              <Ionicons
                name={getTrendIcon(momentumData.trend_strength, 50)}
                size={13}
                color={momentumData.trend_strength >= 50 ? '#10b981' : '#f59e0b'}
              />
              <Text style={styles.metricValue}>{momentumData.trend_strength.toFixed(1)}%</Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Volatility:</Text>
            <View style={styles.metricValueRow}>
              <Ionicons
                name={getTrendIcon((momentumData.volatility * -1), -0.25)}
                size={13}
                color={momentumData.volatility <= 0.25 ? '#10b981' : '#ef4444'}
              />
              <Text style={styles.metricValue}>{(momentumData.volatility * 100).toFixed(1)}%</Text>
            </View>
          </View>

          <View style={[styles.metricRow, { marginTop: 15 }]}>
            <Text style={styles.metricLabel}>Signal:</Text>
            <Text style={[styles.signalBadge, { color: getSignalColor(momentumData.momentum_signal) }]}>
              {momentumData.momentum_signal.toUpperCase()}
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderSectors = () => {
    if (!sectorData) {
      return (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={styles.card}>
            <Text style={styles.emptyStateText}>Sector rotation data is not available yet.</Text>
          </View>
        </ScrollView>
      );
    }

    return (
      <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sector Rotation</Text>
          <Text style={styles.sectionSubtitle}>Top Sectors • {sectorData.market || selectedMarket}</Text>

          {sectorData.sector_rankings.slice(0, 5).map((sector, index) => (
            <View key={index} style={styles.sectorItem}>
              <View style={styles.sectorInfo}>
                <Text style={styles.sectorName}>{sector.sector}</Text>
                <Text style={styles.sectorMomentum}>{sector.momentum}{sector.count ? ` • ${sector.count} stocks` : ''}</Text>
              </View>
              <Text style={[styles.sectorReturn, { color: sector.performance_1m > 0 ? '#10b981' : '#ef4444' }]}>
                {sector.performance_1m > 0 ? '↑ ' : '↓ '}{sector.performance_1m > 0 ? '+' : ''}{sector.performance_1m.toFixed(1)}%
              </Text>
            </View>
          ))}

          {sectorData.industry_rankings && sectorData.industry_rankings.length > 0 && (
            <>
              <Text style={[styles.sectionSubtitle, { marginTop: 16 }]}>Top Industries • {sectorData.market || selectedMarket}</Text>
              {sectorData.industry_rankings.slice(0, 8).map((industry, index) => (
                <View key={`${industry.industry}-${index}`} style={styles.sectorItem}>
                  <View style={styles.sectorInfo}>
                    <Text style={styles.sectorName}>{industry.industry}</Text>
                    <Text style={styles.sectorMomentum}>{industry.momentum}{industry.count ? ` • ${industry.count} stocks` : ''}</Text>
                  </View>
                  <Text style={[styles.sectorReturn, { color: industry.performance_1m > 0 ? '#10b981' : '#ef4444' }]}>
                    {industry.performance_1m > 0 ? '↑ ' : '↓ '}{industry.performance_1m > 0 ? '+' : ''}{industry.performance_1m.toFixed(1)}%
                  </Text>
                </View>
              ))}
            </>
          )}

          <View style={[styles.card, { marginTop: 15, backgroundColor: '#f3f4f633' }]}>
            <Text style={styles.metricLabel}>Market Sentiment: <Text style={[styles.signalBadge, { color: sectorData.market_sentiment === 'aggressive' ? '#10b981' : '#ef4444' }]}>{sectorData.market_sentiment.toUpperCase()}</Text></Text>
            {typeof sectorData.scanned_count === 'number' && (
              <Text style={[styles.metricLabel, { marginTop: 8 }]}>Scanned stocks: {sectorData.scanned_count}</Text>
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderRegime = () => {
    if (!regimeData) {
      return (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={styles.card}>
            <Text style={styles.emptyStateText}>Market regime data is not available yet.</Text>
          </View>
        </ScrollView>
      );
    }

    return (
      <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Market Regime</Text>

          <View style={[styles.regimeBox, { backgroundColor: regimeData.current_regime === 'bull' ? '#10b98133' : regimeData.current_regime === 'bear' ? '#ef444433' : '#f59e0b33' }]}>
            <Text style={[styles.regimeText, { color: regimeData.current_regime === 'bull' ? '#10b981' : regimeData.current_regime === 'bear' ? '#ef4444' : '#f59e0b' }]}>
              {regimeData.current_regime.toUpperCase()}
            </Text>
            <Text style={styles.regimeConfidence}>Confidence: {(regimeData.regime_confidence * 100).toFixed(0)}%</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Support Level:</Text>
            <View style={styles.metricValueRow}>
              <Ionicons name="arrow-down" size={13} color="#38bdf8" />
              <Text style={styles.metricValue}>${regimeData.support_level.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Resistance Level:</Text>
            <View style={styles.metricValueRow}>
              <Ionicons name="arrow-up" size={13} color="#f59e0b" />
              <Text style={styles.metricValue}>${regimeData.resistance_level.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Duration:</Text>
            <Text style={styles.metricValue}>{regimeData.regime_duration_days} days</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ec4899" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <Text style={styles.statusText}>Market: {selectedMarket} • Updated: {lastUpdated || '—'} • Modules: {modulesReady}/4</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
          <Ionicons name="refresh" size={14} color="#38bdf8" />
          <Text style={styles.retryButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.marketSelectorScroll}>
        {marketOptions.map((market) => (
          <TouchableOpacity
            key={market}
            style={[styles.marketChip, selectedMarket === market && styles.marketChipActive]}
            onPress={() => setSelectedMarket(market)}
          >
            <Text style={[styles.marketChipText, selectedMarket === market && styles.marketChipTextActive]}>{market}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      )}

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        {(['dashboard', 'momentum', 'sectors', 'regime'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'momentum' && renderMomentum()}
      {activeTab === 'sectors' && renderSectors()}
      {activeTab === 'regime' && renderRegime()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  marketSelectorScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0f172a',
  },
  marketChip: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  marketChipActive: {
    backgroundColor: '#ec4899',
    borderColor: '#ec4899',
  },
  marketChipText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  marketChipTextActive: {
    color: '#fff',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  statusText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
  },
  retryButtonText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  errorBanner: {
    margin: 12,
    marginBottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  errorBannerText: {
    color: '#fecaca',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyStateText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#ec4899',
  },
  tabText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ec4899',
  },
  card: {
    backgroundColor: '#1e293b',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 16,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  scoreDetails: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 13,
    color: '#cbd5e1',
    marginBottom: 8,
  },
  signalBadge: {
    fontSize: 14,
    fontWeight: '700',
  },
  riskLevel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  signalGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signalBox: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 6,
    borderRadius: 8,
  },
  signalCount: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  signalLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreRowLabel: {
    fontSize: 13,
    color: '#cbd5e1',
    width: 80,
  },
  scoreBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    backgroundColor: '#ec4899',
    borderRadius: 3,
  },
  scoreRowValue: {
    fontSize: 12,
    color: '#94a3b8',
    width: 50,
    textAlign: 'right',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  metricLabel: {
    fontSize: 13,
    color: '#cbd5e1',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  sectorInfo: {
    flex: 1,
  },
  sectorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  sectorMomentum: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'capitalize',
  },
  sectorReturn: {
    fontSize: 13,
    fontWeight: '700',
  },
  regimeBox: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  regimeText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  regimeConfidence: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
