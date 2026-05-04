#!/bin/bash
# Quick Start Guide - Stock Valuation App with All 5 Features

echo "=========================================="
echo "Stock Valuation App - Complete Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Python
echo -e "${BLUE}Checking Python installation...${NC}"
python --version || { echo "Python not found. Please install Python 3.8+"; exit 1; }

# Setup Backend
echo ""
echo -e "${BLUE}Setting up Backend...${NC}"
cd backend

# Install Python dependencies
echo "Installing Python packages..."
pip install fastapi uvicorn yfinance pandas numpy python-dotenv

echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# Run Backend
echo ""
echo -e "${BLUE}Starting Backend Server...${NC}"
echo "Server will run on http://localhost:8000"
python main.py &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend running (PID: $BACKEND_PID)${NC}"

sleep 2

# Test Backend
echo ""
echo -e "${BLUE}Testing Backend API...${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs)
if [ $RESPONSE = "200" ]; then
    echo -e "${GREEN}✓ Backend API responding${NC}"
else
    echo -e "Backend not responding (HTTP $RESPONSE)"
    kill $BACKEND_PID
    exit 1
fi

# Setup Mobile
echo ""
echo -e "${BLUE}Setting up Mobile App...${NC}"
cd ../mobile

echo "Installing npm packages..."
npm install --legacy-peer-deps

echo "Installing chart library..."
npm install react-native-chart-kit

echo -e "${GREEN}✓ Mobile dependencies installed${NC}"

# Setup Environment
echo ""
echo -e "${BLUE}Configuring Environment...${NC}"
cat > .env <<EOF
EXPO_PUBLIC_API_URL=http://localhost:8000
EOF
echo -e "${GREEN}✓ Environment configured${NC}"

# Display API Endpoints
echo ""
echo -e "${BLUE}========== API Endpoints Available ==========${NC}"
echo "Portfolio Tracker:"
echo "  - POST   /api/portfolio/add-holding"
echo "  - POST   /api/portfolio/calculate-portfolio"
echo "  - GET    /api/portfolio/rebalance-recommendations"
echo ""
echo "Price Alerts:"
echo "  - POST   /api/alerts/create"
echo "  - GET    /api/alerts/list"
echo "  - POST   /api/alerts/check-all"
echo "  - DELETE /api/alerts/delete/{symbol}/{price}/{type}"
echo ""
echo "News Integration:"
echo "  - GET    /api/news/stock/{symbol}"
echo "  - GET    /api/news/market-news"
echo "  - GET    /api/news/trending"
echo "  - POST   /api/news/search"
echo ""
echo "Enhanced Charting:"
echo "  - GET    /api/charts/ohlc/{symbol}"
echo "  - GET    /api/charts/technical-indicators/{symbol}"
echo "  - GET    /api/charts/rsi/{symbol}"
echo "  - GET    /api/charts/macd/{symbol}"
echo "  - GET    /api/charts/volatility/{symbol}"
echo ""
echo "Backtesting:"
echo "  - POST   /api/backtest/run"
echo "  - GET    /api/backtest/strategies"
echo "  - POST   /api/backtest/compare-strategies"
echo ""
echo -e "${BLUE}===========================================\n${NC}"

# Start Mobile
echo -e "${BLUE}Starting Mobile App...${NC}"
echo "Running: npx expo start"
echo ""
echo "Press 'i' for iOS simulator, 'a' for Android emulator"
echo "Or scan QR code with Expo Go app on your device"
echo ""
npx expo start

# Cleanup
trap "kill $BACKEND_PID" EXIT
