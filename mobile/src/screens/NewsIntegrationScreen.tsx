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
  Image,
  Linking,
  FlatList,
  TextInput,
} from 'react-native';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../services/api';

const NewsIntegrationScreen = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('market');
  const [searchQuery, setSearchQuery] = useState('');
  const [sentiment, setSentiment] = useState(null);
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');

  useFocusEffect(
    React.useCallback(() => {
      loadNews();
    }, [activeTab])
  );

  const loadNews = async () => {
    setLoading(true);
    try {
      let response;

      if (activeTab === 'market') {
        response = await axios.get(`${API_URL}/api/news/market-news?limit=20`);
        setNews(response.data.news || []);
      } else if (activeTab === 'stock') {
        response = await axios.get(`${API_URL}/api/news/stock/${selectedSymbol}?limit=20`);
        setNews(response.data.news || []);

        // Load sentiment
        const sentimentResponse = await axios.get(
          `${API_URL}/api/news/sentiment/${selectedSymbol}`
        );
        setSentiment(sentimentResponse.data);
      } else if (activeTab === 'trending') {
        response = await axios.get(`${API_URL}/api/news/trending?limit=20`);
        const trendingNews = [];
        response.data.trending?.forEach((item) => {
          trendingNews.push(...item.recent_news);
        });
        setNews(trendingNews);
      } else if (activeTab === 'search' && searchQuery) {
        response = await axios.post(`${API_URL}/api/news/search`, {
          query: searchQuery,
          limit: 20,
        });
        setNews(response.data.search_results || []);
      }
    } catch (error) {
      console.error('Error loading news:', error);
      Alert.alert('Error', 'Failed to load news');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadNews();
    setRefreshing(false);
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      loadNews();
    }
  };

  const renderNewsItem = (item, index) => {
    const publishedDate = new Date(item.published).toLocaleDateString();
    const sentimentColor =
      item.sentiment === 'positive'
        ? '#4CAF50'
        : item.sentiment === 'negative'
          ? '#FF6B6B'
          : '#999';
    const sentimentEmoji =
      item.sentiment === 'positive'
        ? '📈'
        : item.sentiment === 'negative'
          ? '📉'
          : '📊';

    return (
      <TouchableOpacity
        key={index}
        style={styles.newsCard}
        onPress={() => {
          if (item.url) {
            Linking.openURL(item.url);
          }
        }}
      >
        {item.image && (
          <Image
            source={{ uri: item.image }}
            style={styles.newsImage}
            defaultSource={require('../assets/placeholder.png')}
          />
        )}

        <View style={styles.newsContent}>
          <View style={styles.newsHeader}>
            <Text style={styles.newsSource}>{item.source}</Text>
            <Text style={styles.publishedDate}>{publishedDate}</Text>
          </View>

          <Text style={styles.newsTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {item.summary && (
            <Text style={styles.newsSummary} numberOfLines={2}>
              {item.summary}
            </Text>
          )}

          <View style={styles.newsFooter}>
            <View
              style={[styles.sentimentBadge, { backgroundColor: sentimentColor + '20' }]}
            >
              <Text style={[styles.sentimentText, { color: sentimentColor }]}>
                {sentimentEmoji} {item.sentiment || 'neutral'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                if (item.url) {
                  Linking.openURL(item.url);
                }
              }}
            >
              <MaterialIcons name="open-in-new" size={16} color="#0066FF" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSentimentChart = () => {
    if (!sentiment) return null;

    const { sentiment_percent, overall_sentiment } = sentiment;

    return (
      <View style={styles.sentimentContainer}>
        <Text style={styles.sentimentTitle}>Market Sentiment - {selectedSymbol}</Text>

        <View style={styles.sentimentBreakdown}>
          <View style={styles.sentimentItem}>
            <View
              style={[styles.sentimentBox, { backgroundColor: '#4CAF50' }]}
            />
            <Text style={styles.sentimentLabel}>Positive</Text>
            <Text style={styles.sentimentPercent}>
              {sentiment_percent.positive?.toFixed(0) || 0}%
            </Text>
          </View>

          <View style={styles.sentimentItem}>
            <View
              style={[styles.sentimentBox, { backgroundColor: '#999' }]}
            />
            <Text style={styles.sentimentLabel}>Neutral</Text>
            <Text style={styles.sentimentPercent}>
              {sentiment_percent.neutral?.toFixed(0) || 0}%
            </Text>
          </View>

          <View style={styles.sentimentItem}>
            <View
              style={[styles.sentimentBox, { backgroundColor: '#FF6B6B' }]}
            />
            <Text style={styles.sentimentLabel}>Negative</Text>
            <Text style={styles.sentimentPercent}>
              {sentiment_percent.negative?.toFixed(0) || 0}%
            </Text>
          </View>
        </View>

        <View style={styles.overallSentiment}>
          <Text style={styles.overallLabel}>Overall Sentiment</Text>
          <Text
            style={[
              styles.overallValue,
              {
                color:
                  overall_sentiment === 'positive'
                    ? '#4CAF50'
                    : overall_sentiment === 'negative'
                      ? '#FF6B6B'
                      : '#999',
              },
            ]}
          >
            {overall_sentiment?.toUpperCase()}
          </Text>
        </View>
      </View>
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
          style={[styles.tab, activeTab === 'market' && styles.activeTab]}
          onPress={() => setActiveTab('market')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'market' && styles.activeTabText,
            ]}
          >
            Market
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'stock' && styles.activeTab]}
          onPress={() => setActiveTab('stock')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'stock' && styles.activeTabText,
            ]}
          >
            Stock
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'trending' && styles.activeTab]}
          onPress={() => setActiveTab('trending')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'trending' && styles.activeTabText,
            ]}
          >
            Trending
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'search' && styles.activeTabText,
            ]}
          >
            Search
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stock Symbol Selector */}
      {activeTab === 'stock' && (
        <View style={styles.symbolSelector}>
          <TextInput
            style={styles.symbolInput}
            placeholder="Enter stock symbol"
            placeholderTextColor="#999"
            value={selectedSymbol}
            onChangeText={(text) => setSelectedSymbol(text.toUpperCase())}
            onSubmitEditing={loadNews}
          />
        </View>
      )}

      {/* Search Bar */}
      {activeTab === 'search' && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search news..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <MaterialIcons name="search" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Sentiment Analysis */}
      {activeTab === 'stock' && renderSentimentChart()}

      {/* News List */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#0066FF"
          style={{ marginTop: 50 }}
        />
      ) : news.length > 0 ? (
        <View style={styles.newsListContainer}>
          {news.map((item, index) => renderNewsItem(item, index))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="newspaper" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No news found</Text>
          <Text style={styles.emptySubtext}>Try another search</Text>
        </View>
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
    paddingHorizontal: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#0066FF',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#999',
  },
  activeTabText: {
    color: '#0066FF',
    fontWeight: 'bold',
  },
  symbolSelector: {
    backgroundColor: 'white',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  symbolInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#333',
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: '#0066FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sentimentContainer: {
    backgroundColor: 'white',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  sentimentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  sentimentBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  sentimentItem: {
    alignItems: 'center',
  },
  sentimentBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginBottom: 8,
  },
  sentimentLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  sentimentPercent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  overallSentiment: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  overallLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  overallValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  newsListContainer: {
    paddingHorizontal: 0,
  },
  newsCard: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  newsImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#e0e0e0',
  },
  newsContent: {
    padding: 12,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  newsSource: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0066FF',
  },
  publishedDate: {
    fontSize: 12,
    color: '#999',
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
    lineHeight: 20,
  },
  newsSummary: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sentimentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '600',
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
});

export default NewsIntegrationScreen;
