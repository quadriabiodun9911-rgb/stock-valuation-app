# AI Analytics - Quick Start Guide

## 🎯 Get Started in 5 Minutes

### Step 1: Start Backend

```bash
cd stock-valuation-app/backend
python main.py
```

Backend runs on: `http://localhost:8000`

### Step 2: Test with cURL

**Get a Price Prediction:**

```bash
curl -X POST http://localhost:8000/api/ai/predict \
  -H "Content-Type: application/json" \
  -d '{"symbol": "AAPL"}'
```

**Get Technical Analysis:**

```bash
curl http://localhost:8000/api/ai/technical-analysis/AAPL
```

**Get AI Recommendation:**

```bash
curl -X POST http://localhost:8000/api/ai/recommendation \
  -H "Content-Type: application/json" \
  -d '{"symbol": "AAPL"}'
```

### Step 3: Check API Docs

Visit: `http://localhost:8000/docs`

## 📦 Files Created

### Backend

- **ai_analytics.py** (1200+ lines)
  - Core AI engine
  - All prediction and analysis algorithms
  - Risk assessment
  - Anomaly detection
  
- **ai_endpoints.py** (600+ lines)
  - FastAPI endpoints
  - Request/response models
  - Error handling

- **main.py** (UPDATED)
  - AI router integration
  - API v2.0 updated

### Frontend

- **AIAnalyticsComponents.tsx**
  - 9 pre-built React components
  - Full styling included
  - Easy integration

### Documentation

- **AI_INTEGRATION_GUIDE.md**
  - Complete API reference
  - React integration examples
  - 9 endpoints documented
  
- **AI_FEATURES_GUIDE.md**
  - Feature showcase
  - How each feature works
  - Tips and best practices
  
- **QUICK_START.md** (this file)
  - Get running in minutes
  - Common commands
  - Quick reference

## 🎨 Frontend Integration - Quick Example

### 1. Copy Components

```bash
# Components file is already created at:
stock-valuation-app/mobile-app/src/components/AIAnalyticsComponents.tsx
```

### 2. Create Service

```typescript
// ai-service.ts
import axios from 'axios';

const API = 'http://localhost:8000/api/ai';

export const aiService = {
  predictStockPrice: (symbol: string) => 
    axios.post(`${API}/predict`, { symbol }),
    
  getTechnicalAnalysis: (symbol: string) => 
    axios.get(`${API}/technical-analysis/${symbol}`),
    
  getRecommendation: (symbol: string) => 
    axios.post(`${API}/recommendation`, { symbol }),
};
```

### 3. Use Components

```typescript
import { PredictionCard } from './components/AIAnalyticsComponents';
import { aiService } from './services/ai-service';

export function Dashboard({ symbol }) {
  return (
    <PredictionCard 
      symbol={symbol}
      onApiCall={(sym) => aiService.predictStockPrice(sym)}
    />
  );
}
```

## 🔍 9 AI Endpoints Overview

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ai/predict` | POST | Price predictions |
| `/api/ai/technical-analysis/{symbol}` | GET | Technical indicators |
| `/api/ai/intrinsic-value/{symbol}` | GET | Valuation analysis |
| `/api/ai/recommendation` | POST | Buy/Hold/Sell signals |
| `/api/ai/risk-assessment/{symbol}` | GET | Risk metrics |
| `/api/ai/anomalies/{symbol}` | GET | Anomaly alerts |
| `/api/ai/portfolio-analysis` | POST | Portfolio metrics |
| `/api/ai/compare-stocks` | GET | Multi-stock comparison |
| `/api/ai/market-insights` | GET | Market sentiment |

## 💡 Key Features at a Glance

### Predictions 🔮

- 1m, 3m, 6m, 1y targets
- Monte Carlo simulations
- Confidence scoring

### Technical 📊

- RSI, MACD, moving averages
- Support/resistance levels
- Momentum scoring

### Valuation 💎

- DCF method
- Relative valuation
- Margin of safety

### Recommendations 🎯

- Smart signals (BUY/HOLD/SELL)
- Risk/reward ratios
- Catalysts & risks

### Risk ⚠️

- Volatility metrics
- Max drawdown
- Beta & VaR

### Anomalies 🚨

- Price spikes
- Volume anomalies
- Volatility alerts

### Portfolio 📈

- Diversification score
- Concentration metrics
- Position analysis

### Comparison 🔄

- Side-by-side analysis
- Best opportunity ranking
- Lowest risk selection

### Insights 🌍

- Market sentiment
- Bullish/bearish count
- Average metrics

## 🚀 Common Commands

### Start Backend

```bash
cd stock-valuation-app/backend
python main.py
```

### Check if Running

```bash
curl http://localhost:8000/docs
```

### Test Single Stock

```bash
curl -X POST http://localhost:8000/api/ai/predict \
  -H "Content-Type: application/json" \
  -d '{"symbol": "MSFT"}'
```

### Test Recommendation

```bash
curl -X POST http://localhost:8000/api/ai/recommendation \
  -H "Content-Type: application/json" \
  -d '{"symbol": "GOOGL"}'
```

### Test Comparison

```bash
curl "http://localhost:8000/api/ai/compare-stocks?symbols=AAPL&symbols=MSFT&symbols=TSLA"
```

### Test Portfolio

```bash
curl -X POST http://localhost:8000/api/ai/portfolio-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["AAPL", "MSFT", "GOOGL"],
    "weights": [0.4, 0.35, 0.25]
  }'
```

## 📊 Example Responses

### Prediction

```json
{
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
  "recommendation": "BUY"
}
```

### Recommendation

```json
{
  "action": "BUY",
  "confidence": 0.82,
  "target_price": 175.00,
  "stop_loss": 135.23,
  "risk_reward_ratio": 2.4,
  "catalysts": ["Strong upside potential"],
  "risks": []
}
```

### Risk

```json
{
  "risk_level": "moderate",
  "risk_score": 55.2,
  "volatility": 0.0245,
  "max_drawdown": -0.185,
  "beta": 1.15,
  "var_95": -0.0328,
  "cvar_95": -0.0445
}
```

## ✅ Verification Checklist

- [ ] Backend starts successfully
- [ ] API docs load at localhost:8000/docs
- [ ] At least one prediction returns data
- [ ] Technical analysis loads
- [ ] Recommendation endpoint works
- [ ] Risk assessment completes
- [ ] Anomaly detection runs
- [ ] Portfolio analysis calculates
- [ ] Comparison works with 3+ stocks
- [ ] Market insights aggregates data

## 🐛 Troubleshooting

**Backend won't start?**

```bash
# Check Python version
python --version

# Install requirements
pip install fastapi uvicorn yfinance pandas numpy python-dotenv

# Try again
python main.py
```

**API not responding?**

```bash
# Check if running on 8000
netstat -an | grep 8000

# Restart backend
# Kill process and restart
```

**Stock has no data?**

```bash
# Use well-known stocks: AAPL, MSFT, GOOGL, AMZN, TSLA
# Avoid OTC stocks or very new stocks
# Need 60+ days of history
```

**Predictions seem wrong?**

```bash
# Check confidence score
# Low confidence (<0.5) = unreliable
# Look at reasoning section
# Verify with technical analysis
```

## 📚 Learn More

- **Full API Guide**: See AI_INTEGRATION_GUIDE.md
- **Feature Details**: See AI_FEATURES_GUIDE.md
- **API Docs**: <http://localhost:8000/docs>
- **Code Comments**: All functions documented in ai_analytics.py

## 🎓 Understanding the Scores

### Prediction Confidence
>
- >0.8 = Very reliable
- 0.6-0.8 = Reliable
- 0.4-0.6 = Moderate
- <0.4 = Low confidence

### Risk Level

- Very Low: Blue-chip stability
- Low: Stable growth stocks
- Moderate: Balanced risk/return
- High: Growth/small-cap
- Very High: Speculative

### Recommendation Confidence
>
- >0.8 = Strong signal
- 0.6-0.8 = Good signal
- <0.6 = Weak signal

## 🎯 Next Steps

1. **Integrate UI**: Add components to dashboard
2. **Set Alerts**: Configure anomaly thresholds
3. **Build Screener**: Filter by recommendations
4. **Track Performance**: Monitor predictions
5. **Deploy**: Move to production

## 💬 Quick Tips

✅ Use AAPL, MSFT, GOOGL for testing
✅ Check API docs for full schema
✅ Cache results for 15-30 minutes
✅ Combine with technical analysis
✅ Don't trade solely on AI signals
✅ Always use stop losses
✅ Diversify recommendations
✅ Monitor alerts regularly

---

**You're all set! 🚀**

Start the backend and begin exploring AI-powered stock analysis!
