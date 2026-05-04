#!/bin/bash
# Test API Endpoints - Stock Valuation App
# Run these commands to test all 27 API endpoints

BASE_URL="http://localhost:8000"
echo "Testing Stock Valuation App API"
echo "Base URL: $BASE_URL"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============== PORTFOLIO TRACKER TESTS ==============
echo -e "${BLUE}=== PORTFOLIO TRACKER TESTS ===${NC}"

# Test 1: Add a holding
echo -e "\n${BLUE}Test 1: Add Portfolio Holding${NC}"
curl -X POST "$BASE_URL/api/portfolio/add-holding" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "shares": 10,
    "purchase_price": 150.00,
    "purchase_date": "2023-01-01"
  }' | jq '.'

# Test 2: Calculate portfolio
echo -e "\n${BLUE}Test 2: Calculate Portfolio Performance${NC}"
curl -X POST "$BASE_URL/api/portfolio/calculate-portfolio" \
  -H "Content-Type: application/json" \
  -d '{
    "holdings": [
      {"symbol": "AAPL", "shares": 10, "purchase_price": 150, "purchase_date": "2023-01-01"},
      {"symbol": "MSFT", "shares": 5, "purchase_price": 300, "purchase_date": "2023-06-01"}
    ]
  }' | jq '.'

# Test 3: Get rebalance recommendations
echo -e "\n${BLUE}Test 3: Get Rebalancing Recommendations${NC}"
curl -X GET "$BASE_URL/api/portfolio/rebalance-recommendations" \
  -H "Content-Type: application/json" | jq '.'

# ============== PRICE ALERTS TESTS ==============
echo -e "\n${BLUE}=== PRICE ALERTS TESTS ===${NC}"

# Test 4: Create alert
echo -e "\n${BLUE}Test 4: Create Price Alert${NC}"
curl -X POST "$BASE_URL/api/alerts/create" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "target_price": 180.00,
    "alert_type": "above",
    "enabled": true
  }' | jq '.'

# Test 5: List alerts
echo -e "\n${BLUE}Test 5: List All Alerts${NC}"
curl -X GET "$BASE_URL/api/alerts/list" | jq '.'

# Test 6: Check all alerts
echo -e "\n${BLUE}Test 6: Check All Alerts${NC}"
curl -X POST "$BASE_URL/api/alerts/check-all" | jq '.'

# Test 7: Check specific stock alerts
echo -e "\n${BLUE}Test 7: Check Alerts for Specific Stock${NC}"
curl -X GET "$BASE_URL/api/alerts/check/AAPL" | jq '.'

# Test 8: Get alert summary
echo -e "\n${BLUE}Test 8: Get Alert Summary${NC}"
curl -X GET "$BASE_URL/api/alerts/summary" | jq '.'

# ============== NEWS INTEGRATION TESTS ==============
echo -e "\n${BLUE}=== NEWS INTEGRATION TESTS ===${NC}"

# Test 9: Get stock news
echo -e "\n${BLUE}Test 9: Get Stock News${NC}"
curl -X GET "$BASE_URL/api/news/stock/AAPL?limit=5" | jq '.'

# Test 10: Get market news
echo -e "\n${BLUE}Test 10: Get Market News${NC}"
curl -X GET "$BASE_URL/api/news/market-news?limit=5" | jq '.'

# Test 11: Get sector news
echo -e "\n${BLUE}Test 11: Get Sector News${NC}"
curl -X GET "$BASE_URL/api/news/sector/Technology?limit=5" | jq '.'

# Test 12: Get trending stocks
echo -e "\n${BLUE}Test 12: Get Trending Stocks${NC}"
curl -X GET "$BASE_URL/api/news/trending?limit=5" | jq '.'

# Test 13: Search news
echo -e "\n${BLUE}Test 13: Search News${NC}"
curl -X POST "$BASE_URL/api/news/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "earnings", "limit": 5}' | jq '.'

# Test 14: Get sentiment analysis
echo -e "\n${BLUE}Test 14: Get Sentiment Analysis${NC}"
curl -X GET "$BASE_URL/api/news/sentiment/AAPL" | jq '.'

# ============== ENHANCED CHARTING TESTS ==============
echo -e "\n${BLUE}=== ENHANCED CHARTING TESTS ===${NC}"

# Test 15: Get OHLC data
echo -e "\n${BLUE}Test 15: Get OHLC Data${NC}"
curl -X GET "$BASE_URL/api/charts/ohlc/AAPL?period=1y" | jq '.ohlc_data[0:5]'

# Test 16: Get technical indicators
echo -e "\n${BLUE}Test 16: Get Technical Indicators${NC}"
curl -X GET "$BASE_URL/api/charts/technical-indicators/AAPL?period=1y" | jq '.sma_20[0:5]'

# Test 17: Get RSI
echo -e "\n${BLUE}Test 17: Get RSI Indicator${NC}"
curl -X GET "$BASE_URL/api/charts/rsi/AAPL?period=1y" | jq '.'

# Test 18: Get MACD
echo -e "\n${BLUE}Test 18: Get MACD Indicator${NC}"
curl -X GET "$BASE_URL/api/charts/macd/AAPL?period=1y" | jq '.current_macd, .current_signal, .trading_signal'

# Test 19: Get volatility
echo -e "\n${BLUE}Test 19: Get Volatility Analysis${NC}"
curl -X GET "$BASE_URL/api/charts/volatility/AAPL?period=1y" | jq '.'

# Test 20: Compare stocks
echo -e "\n${BLUE}Test 20: Compare Multiple Stocks${NC}"
curl -X GET "$BASE_URL/api/charts/comparison/AAPL,MSFT,GOOGL?period=1y" | jq '.'

# ============== BACKTESTING TESTS ==============
echo -e "\n${BLUE}=== BACKTESTING TESTS ===${NC}"

# Test 21: List strategies
echo -e "\n${BLUE}Test 21: List Available Strategies${NC}"
curl -X GET "$BASE_URL/api/backtest/strategies" | jq '.'

# Test 22: Run backtest - Moving Average
echo -e "\n${BLUE}Test 22: Run Backtest - Moving Average Strategy${NC}"
curl -X POST "$BASE_URL/api/backtest/run" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "strategy": "moving_average",
    "start_date": "2022-01-01",
    "end_date": "2023-12-31",
    "initial_capital": 10000,
    "position_size": 0.8
  }' | jq '.total_return, .annual_return, .win_rate, .sharpe_ratio'

# Test 23: Run backtest - Momentum
echo -e "\n${BLUE}Test 23: Run Backtest - Momentum Strategy${NC}"
curl -X POST "$BASE_URL/api/backtest/run" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "strategy": "momentum",
    "initial_capital": 10000
  }' | jq '.total_return, .total_trades, .win_rate'

# Test 24: Run backtest - Mean Reversion
echo -e "\n${BLUE}Test 24: Run Backtest - Mean Reversion Strategy${NC}"
curl -X POST "$BASE_URL/api/backtest/run" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "MSFT",
    "strategy": "mean_reversion",
    "initial_capital": 10000
  }' | jq '.total_return, .max_drawdown, .profit_factor'

# Test 25: Run backtest - RSI Oversold
echo -e "\n${BLUE}Test 25: Run Backtest - RSI Oversold Strategy${NC}"
curl -X POST "$BASE_URL/api/backtest/run" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "GOOGL",
    "strategy": "rsi_oversold",
    "initial_capital": 10000
  }' | jq '.total_return, .sharpe_ratio, .sortino_ratio'

# Test 26: Run backtest - MACD Crossover
echo -e "\n${BLUE}Test 26: Run Backtest - MACD Crossover Strategy${NC}"
curl -X POST "$BASE_URL/api/backtest/run" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "MSFT",
    "strategy": "macd_crossover",
    "initial_capital": 10000
  }' | jq '.total_return, .profit_factor, .total_trades'

# Test 27: Compare all strategies
echo -e "\n${BLUE}Test 27: Compare All Strategies${NC}"
curl -X POST "$BASE_URL/api/backtest/compare-strategies?symbol=AAPL&start_date=2022-01-01&end_date=2023-12-31" \
  -H "Content-Type: application/json" | jq '.results[] | {strategy: .strategy, total_return: .total_return}'

echo -e "\n${GREEN}=== ALL TESTS COMPLETED ===${NC}"
echo ""
echo "API Documentation: http://localhost:8000/docs"
echo "Alternative docs:  http://localhost:8000/redoc"
