# Stock Valuation App

A comprehensive stock valuation platform with professional-grade analysis tools, built with FastAPI backend and React Native/Expo mobile app.

## Features

### Backend API

- **DCF (Discounted Cash Flow) Valuation**: Calculate intrinsic value using projected cash flows
- **Comparable Company Analysis**: Valuation based on industry peers and multiples
- **Technical Analysis**: Chart patterns, indicators, and trading signals
- **Real-time Stock Data**: Integration with Yahoo Finance API
- **Comprehensive Analysis**: Combined valuation with investment recommendations

### Mobile App

- **Professional UI**: Clean, modern interface optimized for financial data
- **Multiple Analysis Methods**: DCF, Comparable, and Technical analysis
- **Interactive Charts**: Visual representation of valuation data
- **Stock Search**: Find and analyze any publicly traded stock
- **Watchlist**: Track your favorite stocks (coming soon)
- **Real-time Updates**: Live stock prices and market data

## Architecture

```
stock-valuation-app/
├── backend/              # FastAPI backend
│   ├── main.py          # Main application with all analysis logic
│   └── requirements.txt # Python dependencies
└── mobile/              # React Native/Expo mobile app
    ├── src/
    │   ├── screens/     # App screens
    │   └── services/    # API service layer
    ├── App.tsx          # Main app component
    └── package.json     # Node dependencies
```

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 14+
- Expo CLI (`npm install -g @expo/cli`)

### Backend Setup

1. **Navigate to backend directory:**

   ```bash
   cd stock-valuation-app/backend
   ```

2. **Install Python dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Start the FastAPI server:**

   ```bash
   python main.py
   ```

   The backend will be available at `http://localhost:8000`

### Mobile App Setup

1. **Navigate to mobile directory:**

   ```bash
   cd stock-valuation-app/mobile
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the development server:**

   ```bash
   npx expo start
   ```

4. **Run the app:**
   - **iOS**: Press `i` in terminal or scan QR code with Camera app
   - **Android**: Press `a` in terminal or scan QR code with Expo Go app
   - **Web**: Press `w` in terminal or open `http://localhost:8081`

## API Endpoints

### Stock Information

- `GET /stock/{symbol}` - Get basic stock information

### Valuation Analysis

- `POST /valuation/dcf` - Perform DCF valuation analysis
- `GET /valuation/comparable/{symbol}` - Comparable company analysis
- `GET /analysis/technical/{symbol}` - Technical analysis indicators
- `GET /analysis/comprehensive/{symbol}` - Combined analysis with recommendation

### System

- `GET /` - API information
- `GET /health` - Health check

## Usage Examples

### DCF Analysis

```python
# Example DCF request
{
    "symbol": "AAPL",
    "growth_rate": 0.05,      # 5% growth rate
    "discount_rate": 0.10,    # 10% discount rate
    "terminal_growth_rate": 0.03  # 3% terminal growth
}
```

### Mobile App Navigation

1. **Home Screen**: Search stocks and view featured companies
2. **Search Screen**: Find any stock by symbol
3. **Analysis Screen**: Choose valuation methodology
4. **Stock Detail**: View comprehensive stock information
5. **Valuation Screen**: Perform detailed analysis with custom parameters

## Valuation Methodologies

### 1. DCF (Discounted Cash Flow)

- Projects future free cash flows
- Calculates terminal value
- Discounts to present value
- Provides intrinsic value estimation

### 2. Comparable Analysis

- Compares with industry peers
- Uses multiple valuation ratios (P/E, P/B, P/S, EV/EBITDA)
- Calculates average peer valuation
- Identifies relative value opportunities

### 3. Technical Analysis

- Moving averages (SMA, EMA)
- Momentum indicators (RSI, MACD)
- Volatility indicators (Bollinger Bands)
- Support and resistance levels
- Buy/sell signals

## Configuration

### Backend Configuration

The backend automatically fetches stock data from Yahoo Finance. No additional configuration required.

### Mobile App Configuration

Update API base URL in `src/services/api.ts`:

```typescript
const API_BASE_URL = 'http://your-backend-url:8000';
```

## Development

### Adding New Analysis Methods

1. Extend the `StockValuationService` class in `backend/main.py`
2. Add new API endpoints
3. Update the mobile app API service
4. Create corresponding UI screens

### Customizing UI

- Modify styles in screen components
- Update color scheme in style objects
- Add new icons from @expo/vector-icons

## Deployment

### Backend Deployment

Deploy FastAPI backend to:

- **Heroku**: Add `Procfile` with `web: uvicorn main:app --host=0.0.0.0 --port=${PORT:-5000}`
- **Railway**: Connect GitHub repository
- **AWS/DigitalOcean**: Use Docker container

### Mobile App Deployment

- **App Store**: Use `expo build:ios`
- **Google Play**: Use `expo build:android`
- **Web**: Deploy build output to hosting service

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Support

For support, email <support@stockvaluation.com> or open an issue on GitHub.

## Roadmap

- [ ] Portfolio tracking and analysis
- [ ] Price alerts and notifications
- [ ] Advanced screening tools
- [ ] Monte Carlo simulations
- [ ] Options valuation
- [ ] Cryptocurrency analysis
- [ ] Real-time collaboration features

---

**Built with ❤️ for investors and financial professionals**
