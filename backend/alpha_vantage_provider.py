"""
Alpha Vantage Data Provider
Provides stock data from Alpha Vantage API with support for international stocks
including potential Nigerian Stock Exchange (NGX) coverage
"""

import os
import requests
import pandas as pd
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class AlphaVantageProvider:
    """
    Alpha Vantage API client for fetching stock data
    
    Supports:
    - Global stock quotes
    - Historical data (daily, weekly, monthly)
    - Company overview/fundamentals
    - International exchanges (including potential NGX support)
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Alpha Vantage provider
        
        Args:
            api_key: Alpha Vantage API key. If None, reads from ALPHA_VANTAGE_API_KEY env var
        """
        self.api_key = api_key or os.getenv("ALPHA_VANTAGE_API_KEY")
        self.base_url = "https://www.alphavantage.co/query"
        
        if not self.api_key:
            logger.warning("No Alpha Vantage API key provided. Set ALPHA_VANTAGE_API_KEY environment variable.")
    
    def _make_request(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make API request to Alpha Vantage
        
        Args:
            params: Query parameters
            
        Returns:
            JSON response
            
        Raises:
            Exception: If API request fails
        """
        params["apikey"] = self.api_key
        
        try:
            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Check for API errors
            if "Error Message" in data:
                raise Exception(f"Alpha Vantage Error: {data['Error Message']}")
            
            if "Note" in data:
                # Rate limit message
                raise Exception(f"Alpha Vantage Rate Limit: {data['Note']}")
            
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Alpha Vantage API request failed: {e}")
            raise Exception(f"Failed to fetch data from Alpha Vantage: {str(e)}")
    
    def get_global_quote(self, symbol: str) -> Dict[str, Any]:
        """
        Get real-time quote for a symbol
        
        Args:
            symbol: Stock symbol (e.g., AAPL, DANGCEM.NG)
            
        Returns:
            Quote data with price, volume, etc.
        """
        params = {
            "function": "GLOBAL_QUOTE",
            "symbol": symbol
        }
        
        data = self._make_request(params)
        
        if "Global Quote" not in data or not data["Global Quote"]:
            raise Exception(f"No data found for symbol: {symbol}")
        
        quote = data["Global Quote"]
        
        # Parse the quote data
        return {
            "symbol": quote.get("01. symbol", symbol),
            "price": float(quote.get("05. price", 0)),
            "volume": int(quote.get("06. volume", 0)),
            "latest_trading_day": quote.get("07. latest trading day", ""),
            "previous_close": float(quote.get("08. previous close", 0)),
            "change": float(quote.get("09. change", 0)),
            "change_percent": quote.get("10. change percent", "0%").rstrip('%'),
            "open": float(quote.get("02. open", 0)),
            "high": float(quote.get("03. high", 0)),
            "low": float(quote.get("04. low", 0))
        }
    
    def get_company_overview(self, symbol: str) -> Dict[str, Any]:
        """
        Get company fundamental data
        
        Args:
            symbol: Stock symbol
            
        Returns:
            Company overview including financials, sector, etc.
        """
        params = {
            "function": "OVERVIEW",
            "symbol": symbol
        }
        
        data = self._make_request(params)
        
        if not data or "Symbol" not in data:
            raise Exception(f"No company overview found for symbol: {symbol}")
        
        return {
            "symbol": data.get("Symbol", symbol),
            "name": data.get("Name", ""),
            "description": data.get("Description", ""),
            "exchange": data.get("Exchange", ""),
            "currency": data.get("Currency", ""),
            "country": data.get("Country", ""),
            "sector": data.get("Sector", ""),
            "industry": data.get("Industry", ""),
            "market_cap": self._safe_float(data.get("MarketCapitalization")),
            "pe_ratio": self._safe_float(data.get("PERatio")),
            "peg_ratio": self._safe_float(data.get("PEGRatio")),
            "book_value": self._safe_float(data.get("BookValue")),
            "dividend_per_share": self._safe_float(data.get("DividendPerShare")),
            "dividend_yield": self._safe_float(data.get("DividendYield")),
            "eps": self._safe_float(data.get("EPS")),
            "revenue_ttm": self._safe_float(data.get("RevenueTTM")),
            "profit_margin": self._safe_float(data.get("ProfitMargin")),
            "operating_margin": self._safe_float(data.get("OperatingMarginTTM")),
            "return_on_assets": self._safe_float(data.get("ReturnOnAssetsTTM")),
            "return_on_equity": self._safe_float(data.get("ReturnOnEquityTTM")),
            "52_week_high": self._safe_float(data.get("52WeekHigh")),
            "52_week_low": self._safe_float(data.get("52WeekLow")),
            "50_day_ma": self._safe_float(data.get("50DayMovingAverage")),
            "200_day_ma": self._safe_float(data.get("200DayMovingAverage")),
            "beta": self._safe_float(data.get("Beta"))
        }
    
    def get_daily_history(self, symbol: str, outputsize: str = "compact") -> pd.DataFrame:
        """
        Get daily historical data
        
        Args:
            symbol: Stock symbol
            outputsize: 'compact' (100 days) or 'full' (20+ years)
            
        Returns:
            DataFrame with OHLCV data
        """
        params = {
            "function": "TIME_SERIES_DAILY",
            "symbol": symbol,
            "outputsize": outputsize
        }
        
        data = self._make_request(params)
        
        if "Time Series (Daily)" not in data:
            raise Exception(f"No historical data found for symbol: {symbol}")
        
        time_series = data["Time Series (Daily)"]
        
        # Convert to DataFrame
        df = pd.DataFrame.from_dict(time_series, orient='index')
        df.index = pd.to_datetime(df.index)
        df = df.sort_index()
        
        # Rename columns
        df.columns = ['open', 'high', 'low', 'close', 'volume']
        
        # Convert to numeric
        for col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        return df
    
    def get_stock_info(self, symbol: str) -> Dict[str, Any]:
        """
        Get comprehensive stock information combining quote and overview
        
        Args:
            symbol: Stock symbol
            
        Returns:
            Combined stock information
        """
        try:
            # Get quote data
            quote = self.get_global_quote(symbol)
            
            # Try to get company overview (may not be available for all stocks)
            try:
                overview = self.get_company_overview(symbol)
            except Exception as e:
                logger.warning(f"Could not fetch company overview for {symbol}: {e}")
                overview = {}
            
            # Combine data
            stock_info = {
                "symbol": symbol,
                "company_name": overview.get("name", ""),
                "current_price": quote["price"],
                "previous_close": quote["previous_close"],
                "open": quote["open"],
                "high": quote["high"],
                "low": quote["low"],
                "volume": quote["volume"],
                "change": quote["change"],
                "change_percent": float(quote["change_percent"]),
                "latest_trading_day": quote["latest_trading_day"],
                "market_cap": overview.get("market_cap"),
                "pe_ratio": overview.get("pe_ratio"),
                "sector": overview.get("sector", ""),
                "industry": overview.get("industry", ""),
                "dividend_yield": overview.get("dividend_yield"),
                "52_week_high": overview.get("52_week_high"),
                "52_week_low": overview.get("52_week_low"),
                "beta": overview.get("beta"),
                "eps": overview.get("eps"),
                "exchange": overview.get("exchange", ""),
                "country": overview.get("country", ""),
                "currency": overview.get("currency", ""),
                "data_source": "Alpha Vantage"
            }
            
            return stock_info
            
        except Exception as e:
            logger.error(f"Error fetching stock info for {symbol}: {e}")
            raise
    
    def test_ngx_support(self, symbol: str = "DANGCEM.NG") -> bool:
        """
        Test if Alpha Vantage supports NGX stocks
        
        Args:
            symbol: NGX symbol to test (default: DANGCEM.NG for Dangote Cement)
            
        Returns:
            True if NGX is supported, False otherwise
        """
        try:
            data = self.get_global_quote(symbol)
            logger.info(f"✅ NGX Support Test PASSED: Found data for {symbol}")
            logger.info(f"Price: {data['price']}, Exchange data available")
            return True
        except Exception as e:
            logger.warning(f"❌ NGX Support Test FAILED: {e}")
            return False
    
    @staticmethod
    def _safe_float(value: Any) -> Optional[float]:
        """Safely convert value to float"""
        if value is None or value == "None" or value == "":
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None


# Convenience function for testing
def test_alpha_vantage():
    """Test Alpha Vantage integration"""
    provider = AlphaVantageProvider()
    
    if not provider.api_key:
        print("❌ No API key found. Set ALPHA_VANTAGE_API_KEY environment variable.")
        return
    
    print("\n🔍 Testing Alpha Vantage Integration\n")
    
    # Test with Apple (should work)
    print("1️⃣ Testing with AAPL (Apple)...")
    try:
        data = provider.get_stock_info("AAPL")
        print(f"✅ Success! Price: ${data['current_price']:.2f}")
    except Exception as e:
        print(f"❌ Failed: {e}")
    
    # Test NGX support
    print("\n2️⃣ Testing NGX Support (DANGCEM.NG - Dangote Cement)...")
    ngx_supported = provider.test_ngx_support("DANGCEM.NG")
    
    if ngx_supported:
        print("✅ NGX stocks are supported by Alpha Vantage!")
    else:
        print("❌ NGX stocks are NOT supported by Alpha Vantage")
        print("   Trying alternative symbols...")
        
        # Try variations
        for symbol in ["DANGCEM", "DANGCEM.LA", "NESTLE.NG", "MTNN.NG"]:
            print(f"   Testing {symbol}...", end=" ")
            try:
                provider.get_global_quote(symbol)
                print("✅ Works!")
                break
            except:
                print("❌ Failed")
    
    print("\n✅ Alpha Vantage integration test complete!")


if __name__ == "__main__":
    test_alpha_vantage()
