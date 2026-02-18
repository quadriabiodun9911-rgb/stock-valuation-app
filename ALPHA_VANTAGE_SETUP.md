# Alpha Vantage Integration Guide

## ✅ What's Been Implemented

Your app now has Alpha Vantage integration for accessing Nigerian Stock Exchange (NGX) data!

### Files Created

- ✅ `backend/alpha_vantage_provider.py` - Complete Alpha Vantage client
- ✅ `backend/.env` - Environment configuration file
- ✅ `backend/.gitignore` - Protects API keys from git

### Files Modified

- ✅ `backend/main.py` - Integrated Alpha Vantage for NGX stocks

---

## 🔑 Getting Your Free Alpha Vantage API Key

### Step 1: Sign Up (30 seconds)

1. Visit: <https://www.alphavantage.co/support/#api-key>
2. Enter your email address
3. Click "GET FREE API KEY"
4. Check your email for the API key

### Step 2: Add API Key to Your App

Open `stock-valuation-app/backend/.env` and replace `demo` with your actual key:

```bash
ALPHA_VANTAGE_API_KEY=YOUR_ACTUAL_KEY_HERE
```

---

## 🧪 Testing NGX Support

### Test 1: Check if Alpha Vantage supports NGX stocks

```bash
cd "stock-valuation-app/backend"
source venv/bin/activate
python alpha_vantage_provider.py
```

**What to expect:**

- ✅ If NGX is supported: You'll see prices for DANGCEM.NG (Dangote Cement)
- ❌ If NGX is NOT supported: You'll see error messages

### Test 2: Test through your API

```bash
# Start backend (in one terminal)
cd "stock-valuation-app/backend"
source venv/bin/activate
python main.py

# Test NGX stock (in another terminal)
curl http://localhost:8000/stock/DANGCEM

# Test international stock (should still work via Yahoo Finance)
curl http://localhost:8000/stock/AAPL
```

---

## 🎯 How It Works Now

### For NGX Stocks (e.g., DANGCEM, NESTLE, MTNN)

1. User searches for Nigerian stock (e.g., "NESTLE")
2. App detects it's an NGX symbol
3. **NEW**: App tries Alpha Vantage first
4. If Alpha Vantage succeeds → Returns data ✅
5. If Alpha Vantage fails → Shows helpful error message

### For International Stocks (e.g., AAPL, MSFT)

1. User searches for stock
2. App uses Yahoo Finance (existing behavior)
3. Returns data ✅

---

## ⚠️ Alpha Vantage Free Tier Limits

- **25 API calls per day**
- **5 API calls per minute**

**Tips for staying within limits:**

- Cache data on frontend
- Only fetch on user request (not auto-refresh)
- Consider upgrading if you need more ($49.99/month for 75/min)

---

## 📊 API Key Status

You can check your API usage at:
<https://www.alphavantage.co/account/>

---

## 🔧 Troubleshooting

### "No API key found"

- Make sure `.env` file exists in `backend/` folder
- Verify API key is correct (no extra spaces)
- Restart backend server after changing `.env`

### "Rate limit exceeded"

- You've made 25+ requests today on free tier
- Wait until tomorrow or upgrade to premium

### "No data found for symbol"

- Alpha Vantage doesn't support this exchange
- Try different symbol format (e.g., DANGCEM vs DANGCEM.NG)

---

## 🚀 Next Steps

### If Alpha Vantage SUPPORTS NGX ✅

1. Update mobile app notice to say "Now powered by Alpha Vantage"
2. Remove error messages for NGX stocks
3. Enable NGX featured stocks on Home screen

### If Alpha Vantage DOESN'T Support NGX ❌

We have other options:

1. **NGX Official API** - Contact NGX directly for API access
2. **FMP (Financial Modeling Prep)** - May support African exchanges
3. **IEX Cloud** - Growing international coverage
4. **Web Scraping** - Last resort, fragile but free

---

## 💰 Cost Analysis

| Provider | Free Tier | Paid Plan | NGX Support |
|----------|-----------|-----------|-------------|
| Alpha Vantage | 25 calls/day | $49.99/mo | **TEST NEEDED** |
| Yahoo Finance | Unlimited | Free | ❌ No |
| NGX Official | Unknown | Likely paid | ✅ Yes |
| FMP | 250 calls/day | $14/mo | Unknown |

---

## 📝 Testing Checklist

Run these tests after adding your API key:

```bash
# 1. Test Alpha Vantage directly
cd "stock-valuation-app/backend"
python alpha_vantage_provider.py

# Expected output:
# ✅ Success! Price: $XXX.XX (for AAPL)
# ✅ or ❌ for DANGCEM.NG (this tells us if NGX is supported)

# 2. Start backend
python main.py

# 3. Test NGX via API (in new terminal)
curl http://localhost:8000/stock/NESTLE
curl http://localhost:8000/stock/DANGCEM
curl http://localhost:8000/stock/MTNN

# 4. Test international stocks still work
curl http://localhost:8000/stock/AAPL
curl http://localhost:8000/stock/MSFT

# 5. Test mobile app
# Open app → Search "NESTLE" → Check if it loads or shows error
```

---

## 📞 Support

- **Alpha Vantage Support**: <support@alphavantage.co>
- **Documentation**: <https://www.alphavantage.co/documentation/>

---

## ✅ Success Criteria

After getting your API key, you should see:

**Test 1 - Alpha Vantage Provider**

```
✅ Success! Price: $255.78 (for AAPL)
✅ or ❌ NGX Support Test result (for DANGCEM.NG)
```

**Test 2 - API Endpoint**

```json
{
  "symbol": "DANGCEM.NG",
  "company_name": "Dangote Cement",
  "current_price": 450.50,
  "data_source": "Alpha Vantage"
}
```

OR (if NGX not supported):

```json
{
  "error": "NGX_NOT_SUPPORTED",
  "message": "...Alpha Vantage unable to fetch this symbol",
  "suggestion": "To enable NGX stocks, get a free Alpha Vantage API key..."
}
```

---

## 🎓 What You Learned

1. ✅ How to integrate third-party financial APIs
2. ✅ Environment variable management with .env files
3. ✅ Data provider abstraction (yfinance + Alpha Vantage)
4. ✅ Graceful fallbacks and error handling
5. ✅ API rate limiting awareness

---

**Ready to test?** Get your API key and run the tests! 🚀
