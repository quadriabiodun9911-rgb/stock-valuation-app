# 🔗 INTEGRATION GUIDE - Add All 5 Features to Your App

## Step 1: Update Navigation (App.tsx)

Add these imports at the top of your `mobile/src/App.tsx`:

```typescript
import PortfolioTrackerScreen from './screens/PortfolioTrackerScreen';
import PriceAlertsScreen from './screens/PriceAlertsScreen';
import NewsIntegrationScreen from './screens/NewsIntegrationScreen';
import EnhancedChartingScreen from './screens/EnhancedChartingScreen';
import BacktestingScreen from './screens/BacktestingScreen';
import { MaterialIcons } from '@expo/vector-icons';
```

---

## Step 2: Add to Tab Navigation

Find your `Tab.Navigator` component and add these screens:

```typescript
<Tab.Navigator
  screenOptions={({ route }) => ({
    headerShown: false,
    tabBarIcon: ({ focused, color, size }) => {
      let iconName;

      if (route.name === 'Home') {
        iconName = 'home';
      } else if (route.name === 'Portfolio') {
        iconName = 'analytics';
      } else if (route.name === 'Alerts') {
        iconName = 'notifications';
      } else if (route.name === 'News') {
        iconName = 'newspaper';
      } else if (route.name === 'Charts') {
        iconName = 'show-chart';
      } else if (route.name === 'Backtest') {
        iconName = 'assessment';
      } else if (route.name === 'Watchlist') {
        iconName = 'favorite';
      }

      return <MaterialIcons name={iconName} size={size} color={color} />;
    },
    tabBarActiveTintColor: '#0066FF',
    tabBarInactiveTintColor: '#999',
  })}
>
  <Tab.Screen name="Home" component={HomeScreen} />
  
  <Tab.Screen 
    name="Portfolio" 
    component={PortfolioTrackerScreen}
    options={{
      title: 'Portfolio',
      tabBarLabel: 'Portfolio'
    }}
  />

  <Tab.Screen 
    name="Alerts" 
    component={PriceAlertsScreen}
    options={{
      title: 'Alerts',
      tabBarLabel: 'Alerts'
    }}
  />

  <Tab.Screen 
    name="Charts" 
    component={EnhancedChartingScreen}
    options={{
      title: 'Charts',
      tabBarLabel: 'Charts'
    }}
  />

  <Tab.Screen 
    name="News" 
    component={NewsIntegrationScreen}
    options={{
      title: 'News',
      tabBarLabel: 'News'
    }}
  />

  <Tab.Screen 
    name="Backtest" 
    component={BacktestingScreen}
    options={{
      title: 'Backtest',
      tabBarLabel: 'Backtest'
    }}
  />

  <Tab.Screen name="Watchlist" component={WatchlistScreen} />
</Tab.Navigator>
```

---

## Step 3: Install Dependencies

```bash
cd mobile

# Install chart library (required for Enhanced Charting)
npm install react-native-chart-kit

# Or use yarn
yarn add react-native-chart-kit
```

---

## Step 4: Verify Environment Configuration

Make sure `mobile/.env` has the API URL:

```
EXPO_PUBLIC_API_URL=http://localhost:8000
```

For production:

```
EXPO_PUBLIC_API_URL=https://your-production-api.com
```

---

## Step 5: Backend Integration (Already Done!)

The backend has been updated to include all routers. Verify in `backend/main.py`:

```python
from portfolio_tracker import router as portfolio_router
from price_alerts import router as alerts_router
from news_integration import router as news_router
from enhanced_charting import router as charts_router
from backtesting_engine import router as backtest_router

# These are already added!
app.include_router(portfolio_router)
app.include_router(alerts_router)
app.include_router(news_router)
app.include_router(charts_router)
app.include_router(backtest_router)
```

---

## Step 6: Install Backend Dependencies (If Not Already Done)

```bash
cd backend

# Install required packages
pip install fastapi uvicorn yfinance pandas numpy python-dotenv

# Or install from requirements (if you have one)
pip install -r requirements.txt
```

---

## Step 7: Start the Backend

```bash
cd backend
python main.py
```

Expected output:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

---

## Step 8: Start the Mobile App

```bash
cd mobile
npm start
# or
npx expo start
```

Then:

- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your device

---

## Step 9: Test the Features

### Portfolio Tracker

1. Open the Portfolio tab
2. Click the + button to add a holding
3. Enter: AAPL, 10 shares, $150 purchase price
4. View the portfolio performance

### Price Alerts

1. Open the Alerts tab
2. Click + to create an alert
3. Enter: AAPL, Target: $180, Type: Above
4. View active and triggered alerts

### News

1. Open the News tab
2. Switch between Market, Stock, Trending, Search tabs
3. View sentiment analysis

### Charts

1. Open the Charts tab
2. Enter a stock symbol (e.g., AAPL)
3. Select different time periods
4. View technical indicators

### Backtesting

1. Open the Backtest tab
2. Select a strategy
3. Enter symbol and click "Run Backtest"
4. Compare all strategies

---

## Step 10: Test All API Endpoints

Run the provided test script:

```bash
bash TEST_ALL_ENDPOINTS.sh
```

This will:

- Test all 27 endpoints
- Display results
- Show any errors

---

## Troubleshooting

### Issue: Metro bundler errors

**Solution:**

```bash
npm start -- --reset-cache
```

### Issue: API not connecting

**Verify:**

1. Backend running on localhost:8000
2. EXPO_PUBLIC_API_URL in .env
3. Try: `curl http://localhost:8000/docs`

### Issue: Charts not displaying

**Solution:**

```bash
npm install react-native-chart-kit
npm start -- --reset-cache
```

### Issue: Missing screen files

**Verify all files exist:**

```bash
ls -la mobile/src/screens/
# Should show all 5 new screens
```

---

## Navigation Flow

```
App.tsx
├── HomeScreen (existing)
├── Portfolio ← NEW
│   ├── View holdings
│   ├── Add holding
│   └── View performance
├── Alerts ← NEW
│   ├── Active alerts
│   ├── Triggered alerts
│   └── Create alert
├── Charts ← NEW
│   ├── Price chart
│   ├── RSI indicator
│   ├── MACD indicator
│   └── Volatility
├── News ← NEW
│   ├── Market news
│   ├── Stock news
│   ├── Trending
│   └── Search
├── Backtest ← NEW
│   ├── Strategy list
│   ├── Run backtest
│   └── Compare strategies
└── Watchlist (existing)
```

---

## API Base URL Configuration

### For Local Development

```
http://localhost:8000
```

### For Production

```
https://your-api-domain.com
```

Set in `mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://your-api-domain.com
```

---

## Build & Deployment

### Build for iOS

```bash
eas build --platform ios
```

### Build for Android

```bash
eas build --platform android
```

### Deploy Backend to Render

1. Go to <https://render.com>
2. Create new Web Service
3. Connect GitHub repository
4. Set build command: `pip install -r requirements.txt`
5. Set start command: `uvicorn app.main:app --host 0.0.0.0`

---

## Performance Tips

1. **Enable caching:**
   - News: Cache for 5 minutes
   - Charts: Cache for 1 minute
   - Portfolio: Cache for 30 seconds

2. **Optimize data requests:**
   - Load only needed data
   - Use pagination for large lists
   - Debounce search queries

3. **Mobile optimization:**
   - Limit number of holdings displayed initially
   - Lazy load news articles
   - Throttle real-time updates

---

## Security Considerations

1. **API Keys:** Store yfinance keys securely
2. **CORS:** Already configured for localhost
3. **Environment Variables:** Use .env files
4. **Input Validation:** Already implemented
5. **Error Messages:** Don't expose sensitive data

---

## What's Next?

After integration:

1. ✅ Test locally
2. ✅ Deploy backend to production
3. ✅ Build mobile apps for app stores
4. ✅ Add database persistence
5. ✅ Add user authentication
6. ✅ Enable push notifications
7. ✅ Add analytics
8. ✅ Monitor performance

---

## Support

### Documentation Files

- `FEATURE_IMPLEMENTATION_GUIDE.md` - Detailed feature docs
- `IMPLEMENTATION_COMPLETE.md` - Complete overview
- `VERIFICATION_CHECKLIST.md` - Verification checklist

### Test Scripts

- `TEST_ALL_ENDPOINTS.sh` - Test all APIs
- `QUICK_START.sh` - Quick setup

### API Documentation

Open in browser:

```
http://localhost:8000/docs
http://localhost:8000/redoc
```

---

## Estimated Time

- **Integration:** 15 minutes
- **Testing:** 30 minutes
- **Deployment:** 1 hour
- **Total:** ~2 hours

---

**Ready to integrate? Start with Step 1! 🚀**
