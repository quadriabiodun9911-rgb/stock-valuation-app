# AI Analytics Integration Guide

## Overview

The Stock Valuation App now includes advanced AI-powered analytics with predictions, risk assessment, and intelligent recommendations. This guide shows how to integrate these features into your frontend.

## New Features

### 1. **Price Prediction Engine**

Predicts stock prices over multiple time horizons using Monte Carlo simulations.

**Endpoint:** `POST /api/ai/predict`

```json
{
  "symbol": "AAPL",
  "period": "1y"
}
```

**Response:**

```json
{
  "symbol": "AAPL",
  "current_price": 150.25,
  "predictions": {
    "1_month": 152.50,
    "3_months": 158.30,
    "6_months": 165.75,
    "1_year": 175.00
  },
  "confidence": 0.85,
  "upside": 16.5,
  "downside": 12.3,
  "recommendation": "BUY",
  "reasoning": [
    "Positive historical momentum",
    "Low volatility - stable movement",
    "Significant upside potential identified",
    "High prediction confidence based on historical patterns"
  ]
}
```

### 2. **Technical Analysis**

Advanced technical indicators including RSI, MACD, moving averages, support/resistance levels.

**Endpoint:** `GET /api/ai/technical-analysis/{symbol}`

**Response:**

```json
{
  "symbol": "AAPL",
  "rsi": 65.2,
  "macd": "BULLISH",
  "trend": "UPTREND",
  "support": 148.50,
  "resistance": 155.00,
  "momentum": 72.3,
  "signals": [
    "Bullish MACD crossover"
  ]
}
```

### 3. **Intrinsic Value Calculation**

AI-based valuation using DCF, relative valuation, and asset-based methods.

**Endpoint:** `GET /api/ai/intrinsic-value/{symbol}`

**Response:**

```json
{
  "symbol": "AAPL",
  "current_price": 150.25,
  "intrinsic_value": 162.50,
  "margin_of_safety": 7.5,
  "valuation_range": {
    "lower_bound": 138.12,
    "upper_bound": 186.88
  },
  "methods": {
    "dcf": 165.00,
    "relative": 160.50,
    "asset_based": 162.00
  }
}
```

### 4. **AI Recommendations**

Intelligent buy/hold/sell recommendations based on multiple factors.

**Endpoint:** `POST /api/ai/recommendation`

```json
{
  "symbol": "AAPL",
  "period": "1y"
}
```

**Response:**

```json
{
  "symbol": "AAPL",
  "action": "BUY",
  "confidence": 0.82,
  "target_price": 175.00,
  "stop_loss": 135.23,
  "risk_reward_ratio": 2.4,
  "catalysts": [
    "Strong upside potential",
    "Significant margin of safety"
  ],
  "risks": []
}
```

### 5. **Risk Assessment**

Comprehensive risk analysis including volatility, drawdown, beta, VaR, CVaR.

**Endpoint:** `GET /api/ai/risk-assessment/{symbol}`

**Response:**

```json
{
  "symbol": "AAPL",
  "risk_level": "moderate",
  "risk_score": 55.2,
  "volatility": 0.0245,
  "max_drawdown": -0.185,
  "beta": 1.15,
  "var_95": -0.0328,
  "cvar_95": -0.0445
}
```

### 6. **Anomaly Detection**

Real-time detection of unusual price movements, volume spikes, and volatility anomalies.

**Endpoint:** `GET /api/ai/anomalies/{symbol}`

**Response:**

```json
{
  "symbol": "AAPL",
  "alerts": [
    {
      "type": "UNUSUAL_VOLUME",
      "severity": "HIGH",
      "description": "Unusual volume spike detected (3.2x average)",
      "suggested_action": "Check for news or earnings announcement",
      "timestamp": "2024-01-15T14:30:00Z"
    }
  ]
}
```

### 7. **Portfolio Analysis**

Analyze portfolio composition and diversification metrics.

**Endpoint:** `POST /api/ai/portfolio-analysis`

```json
{
  "symbols": ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"],
  "weights": [0.25, 0.20, 0.20, 0.20, 0.15]
}
```

**Response:**

```json
{
  "concentration_score": 18.5,
  "diversification_level": "Well-diversified",
  "num_holdings": 5,
  "largest_position": 25.0,
  "composition_metrics": {
    "hhi": 0.185,
    "smallest_position": 15.0
  }
}
```

### 8. **Stock Comparison**

Compare AI analysis across multiple stocks.

**Endpoint:** `GET /api/ai/compare-stocks?symbols=AAPL&symbols=MSFT&symbols=GOOGL`

**Response:**

```json
{
  "comparison": [
    {
      "symbol": "AAPL",
      "current_price": 150.25,
      "upside_potential": 16.5,
      "risk_level": "moderate",
      "trend": "UPTREND",
      "recommendation": "BUY"
    },
    {
      "symbol": "MSFT",
      "current_price": 380.50,
      "upside_potential": 12.3,
      "risk_level": "low",
      "trend": "UPTREND",
      "recommendation": "HOLD"
    }
  ],
  "best_opportunity": {
    "symbol": "AAPL",
    "upside_potential": 16.5
  },
  "lowest_risk": {
    "symbol": "MSFT",
    "risk_level": "low"
  }
}
```

### 9. **Market Insights**

Aggregate market sentiment and insights from multiple stocks.

**Endpoint:** `GET /api/ai/market-insights?symbols=AAPL&symbols=MSFT&symbols=GOOGL`

**Response:**

```json
{
  "timestamp": "2024-01-15T15:45:00Z",
  "market_sentiment": "BULLISH",
  "stocks_analyzed": 3,
  "bullish_count": 2,
  "bearish_count": 0,
  "average_upside": 14.1,
  "average_risk": 11.8,
  "key_opportunities": [],
  "key_risks": []
}
```

## Frontend Integration Examples

### React/TypeScript Implementation

```typescript
// ai-service.ts
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/ai';

export const aiService = {
  // Price Predictions
  predictStockPrice: async (symbol: string) => {
    return axios.post(`${API_BASE}/predict`, { symbol });
  },

  // Technical Analysis
  getTechnicalAnalysis: async (symbol: string) => {
    return axios.get(`${API_BASE}/technical-analysis/${symbol}`);
  },

  // Intrinsic Value
  getIntrinsicValue: async (symbol: string) => {
    return axios.get(`${API_BASE}/intrinsic-value/${symbol}`);
  },

  // Recommendations
  getRecommendation: async (symbol: string) => {
    return axios.post(`${API_BASE}/recommendation`, { symbol });
  },

  // Risk Assessment
  getRiskAssessment: async (symbol: string) => {
    return axios.get(`${API_BASE}/risk-assessment/${symbol}`);
  },

  // Anomaly Detection
  getAnomalies: async (symbol: string) => {
    return axios.get(`${API_BASE}/anomalies/${symbol}`);
  },

  // Portfolio Analysis
  analyzePortfolio: async (symbols: string[], weights: number[]) => {
    return axios.post(`${API_BASE}/portfolio-analysis`, { symbols, weights });
  },

  // Compare Stocks
  compareStocks: async (symbols: string[]) => {
    return axios.get(`${API_BASE}/compare-stocks`, { 
      params: { symbols } 
    });
  },

  // Market Insights
  getMarketInsights: async (symbols: string[]) => {
    return axios.get(`${API_BASE}/market-insights`, { 
      params: { symbols } 
    });
  }
};
```

### Usage in Components

```typescript
// PredictionCard.tsx
import { useEffect, useState } from 'react';
import { aiService } from './ai-service';

export function PredictionCard({ symbol }: { symbol: string }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    aiService.predictStockPrice(symbol)
      .then(res => setPrediction(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="prediction-card">
      <h3>{symbol} Price Prediction</h3>
      <p>Current: ${prediction.current_price}</p>
      <p>1-Year Target: ${prediction.predictions['1_year']}</p>
      <p>Upside Potential: {prediction.upside.toFixed(1)}%</p>
      <p>Recommendation: {prediction.recommendation}</p>
      <p>Confidence: {(prediction.confidence * 100).toFixed(0)}%</p>
    </div>
  );
}
```

## Key Metrics Explained

### Technical Indicators

- **RSI (Relative Strength Index)**: 0-100, >70 = overbought, <30 = oversold
- **MACD**: Shows trend momentum and reversals
- **Support/Resistance**: Key price levels
- **Momentum Score**: 0-100 scale of upward/downward force

### Risk Metrics

- **Volatility**: Standard deviation of returns
- **Max Drawdown**: Largest peak-to-trough decline
- **Beta**: Stock volatility vs market (>1 = more volatile)
- **VaR 95%**: 95% confidence of daily loss
- **CVaR 95%**: Expected loss beyond VaR

### Valuation Metrics

- **Intrinsic Value**: Fair value based on fundamentals
- **Margin of Safety**: Discount to intrinsic value
- **DCF Value**: Discounted cash flow valuation
- **Relative Value**: Peer-based valuation

## Performance Tips

1. **Cache Results**: Cache predictions/analysis for 15-30 minutes
2. **Batch Requests**: Use compare-stocks for multiple symbols
3. **Error Handling**: Always handle insufficient data responses
4. **Rate Limiting**: Implement request throttling
5. **Data Freshness**: Update daily for overnight analysis

## Error Handling

```typescript
try {
  const prediction = await aiService.predictStockPrice(symbol);
} catch (error) {
  if (error.response?.status === 400) {
    console.error('Insufficient data for prediction');
  } else if (error.response?.status === 500) {
    console.error('Server error - try again later');
  }
}
```

## Next Steps

1. Integrate prediction chart visualization
2. Add real-time anomaly alerts
3. Create portfolio rebalancing recommendations
4. Build AI-powered screening filters
5. Add alerts for recommendation changes

## Support

For issues or feature requests, check:

- Backend logs: `python main.py`
- API docs: `http://localhost:8000/docs`
- This guide for endpoint specifications
