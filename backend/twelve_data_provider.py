"""
Twelve Data Provider - Working provider with free tier
Supports international stocks with good reliability
"""

import os
import requests
import pandas as pd
from typing import Optional, Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class TwelveDataProvider:
    """
    Twelve Data API client - Best free alternative found
    
    Features:
    - 800 API calls per day (free tier)
    - Real-time and historical data
    - 100+ exchanges worldwide
    - Nigerian stocks: UNKNOWN (needs testing with real API key)
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Twelve Data provider
        
        Args:
            api_key: Twelve Data API key. If None, reads from TWELVE_DATA_API_KEY env var
        """
        self.api_key = api_key or os.getenv("TWELVE_DATA_API_KEY", "demo")
        self.base_url = "https://api.twelvedata.com"
        
        if not self.api_key or self.api_key == "demo":
            logger.warning("Using demo API key. Get free key from: https://twelvedata.com")
    
    def _make_request(self, endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Make API request"""
        params["apikey"] = self.api_key
        
        try:
            url = f"{self.base_url}/{endpoint}"
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Check for errors
            if data.get('status') == 'error':
                raise Exception(f"Twelve Data Error: {data.get('message', 'Unknown error')}")
            
            if 'code' in data and data['code'] >= 400:
                raise Exception(f"Twelve Data Error: {data.get('message', 'Unknown error')}")
            
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Twelve Data API request failed: {e}")
            raise Exception(f"Failed to fetch data from Twelve Data: {str(e)}")
    
    def get_quote(self, symbol: str) -> Dict[str, Any]:
        """Get real-time quote"""
        params = {"symbol": symbol}
        data = self._make_request("quote", params)
        
        return {
            "symbol": data.get("symbol", symbol),
            "name": data.get("name", ""),
            "exchange": data.get("exchange", ""),
            "currency": data.get("currency", "USD"),
            "price": float(data.get("close", 0)),
            "open": float(data.get("open", 0)),
            "high": float(data.get("high", 0)),
            "low": float(data.get("low", 0)),
            "volume": int(data.get("volume", 0)),
            "previous_close": float(data.get("previous_close", 0)),
            "change": float(data.get("change", 0)),
            "change_percent": float(data.get("percent_change", 0)),
        }
    
    def get_stock_info(self, symbol: str) -> Dict[str, Any]:
        """Get comprehensive stock information"""
        try:
            quote = self.get_quote(symbol)
            
            return {
                "symbol": symbol,
                "company_name": quote["name"],
                "current_price": quote["price"],
                "previous_close": quote["previous_close"],
                "open": quote["open"],
                "high": quote["high"],
                "low": quote["low"],
                "volume": quote["volume"],
                "change": quote["change"],
                "change_percent": quote["change_percent"],
                "exchange": quote["exchange"],
                "currency": quote["currency"],
                "market_cap": None,  # Not in basic quote
                "pe_ratio": None,
                "sector": None,
                "industry": None,
                "dividend_yield": None,
                "52_week_high": None,
                "52_week_low": None,
                "beta": None,
                "data_source": "Twelve Data"
            }
            
        except Exception as e:
            logger.error(f"Error fetching stock info for {symbol}: {e}")
            raise
    
    def test_ngx_support(self) -> bool:
        """Test if Twelve Data supports NGX stocks"""
        ngx_symbols = ["DANGCEM.NG", "NESTLE.NG", "MTNN.NG", "GTCO.NG"]
        
        print("\n🧪 Testing Twelve Data NGX Support\n")
        
        for symbol in ngx_symbols:
            try:
                data = self.get_quote(symbol)
                print(f"✅ {symbol}: ₦{data['price']:.2f} - SUPPORTED!")
                return True
            except Exception as e:
                print(f"❌ {symbol}: {str(e)[:60]}")
        
        print("\n❌ Twelve Data does not support NGX stocks")
        return False


def test_twelve_data():
    """Test Twelve Data integration"""
    provider = TwelveDataProvider()
    
    print("\n🔍 Testing Twelve Data Provider\n")
    
    # Test with Apple (baseline)
    print("1️⃣ Testing with AAPL (Apple)...")
    try:
        data = provider.get_stock_info("AAPL")
        print(f"✅ Success! Price: ${data['current_price']:.2f}")
        print(f"   Exchange: {data['exchange']}")
    except Exception as e:
        print(f"❌ Failed: {e}")
    
    # Test NGX
    provider.test_ngx_support()
    
    print("\n✅ Twelve Data test complete!")


if __name__ == "__main__":
    test_twelve_data()
