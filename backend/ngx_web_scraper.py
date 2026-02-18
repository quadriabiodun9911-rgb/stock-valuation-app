"""
NGX Web Scraper - Direct data from Nigerian Stock Exchange website
Scrapes real-time stock data from NGX Group website
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime
import json
import time

logger = logging.getLogger(__name__)


class NGXWebScraper:
    """
    Scrapes stock data directly from NGX Group website
    
    Warning: Web scraping may violate Terms of Service.
    Use only as last resort if no official API is available.
    """
    
    def __init__(self):
        self.base_url = "https://ngxgroup.com"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
        # Cache to avoid excessive requests
        self.cache = {}
        self.cache_duration = 300  # 5 minutes
    
    def _get_cached(self, key: str) -> Optional[Any]:
        """Get cached data if still valid"""
        if key in self.cache:
            data, timestamp = self.cache[key]
            if time.time() - timestamp < self.cache_duration:
                return data
        return None
    
    def _set_cache(self, key: str, data: Any):
        """Store data in cache"""
        self.cache[key] = (data, time.time())
    
    def get_market_data(self) -> List[Dict[str, Any]]:
        """
        Scrape current market data from NGX website
        
        Returns:
            List of stock data dictionaries
        """
        # Check cache first
        cached = self._get_cached("market_data")
        if cached:
            logger.info("Returning cached market data")
            return cached
        
        try:
            # Try multiple possible URLs
            urls_to_try = [
                "https://ngxgroup.com/exchange/data/prices/",
                "https://ngxgroup.com/exchange/market-data/",
                "https://www.ngxgroup.com/exchange/data/",
            ]
            
            for url in urls_to_try:
                try:
                    logger.info(f"Attempting to scrape: {url}")
                    response = self.session.get(url, timeout=15)
                    
                    if response.status_code == 200:
                        soup = BeautifulSoup(response.content, 'html.parser')
                        
                        # Look for data tables
                        tables = soup.find_all('table')
                        
                        if tables:
                            logger.info(f"Found {len(tables)} tables")
                            
                            # Try to parse the first table
                            df = pd.read_html(str(tables[0]))[0]
                            
                            # Convert to list of dicts
                            stocks = []
                            for _, row in df.iterrows():
                                stock = {
                                    "symbol": str(row.get('Symbol', '')).strip(),
                                    "name": str(row.get('Name', '')).strip(),
                                    "price": self._parse_price(row.get('Price', 0)),
                                    "change": self._parse_price(row.get('Change', 0)),
                                    "change_percent": self._parse_percent(row.get('Change%', 0)),
                                    "volume": self._parse_volume(row.get('Volume', 0)),
                                    "data_source": "NGX Web Scraper"
                                }
                                stocks.append(stock)
                            
                            if stocks:
                                logger.info(f"Successfully scraped {len(stocks)} stocks")
                                self._set_cache("market_data", stocks)
                                return stocks
                
                except Exception as url_error:
                    logger.warning(f"Failed to scrape {url}: {url_error}")
                    continue
            
            # If we get here, all URLs failed
            raise Exception("Could not scrape data from any NGX URL")
            
        except Exception as e:
            logger.error(f"Error scraping NGX website: {e}")
            raise
    
    def get_stock_info(self, symbol: str) -> Dict[str, Any]:
        """
        Get information for a specific stock
        
        Args:
            symbol: Stock symbol (e.g., DANGCEM, NESTLE)
            
        Returns:
            Stock information dictionary
        """
        # Remove .NG suffix if present
        symbol = symbol.replace('.NG', '').strip().upper()
        
        # Try to get from market data first
        try:
            market_data = self.get_market_data()
            
            # Find matching stock
            for stock in market_data:
                if stock['symbol'].upper() == symbol:
                    return {
                        "symbol": f"{symbol}.NG",
                        "company_name": stock['name'],
                        "current_price": stock['price'],
                        "change": stock['change'],
                        "change_percent": stock['change_percent'],
                        "volume": stock['volume'],
                        "market_cap": None,  # Not available from scraping
                        "pe_ratio": None,
                        "sector": None,
                        "industry": None,
                        "dividend_yield": None,
                        "52_week_high": None,
                        "52_week_low": None,
                        "beta": None,
                        "data_source": "NGX Web Scraper"
                    }
            
            raise Exception(f"Stock {symbol} not found in NGX market data")
            
        except Exception as e:
            logger.error(f"Error getting stock info for {symbol}: {e}")
            raise
    
    def test_connection(self) -> bool:
        """Test if NGX website is accessible"""
        try:
            response = self.session.get("https://ngxgroup.com", timeout=10)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"NGX website connection test failed: {e}")
            return False
    
    @staticmethod
    def _parse_price(value: Any) -> float:
        """Parse price value from various formats"""
        try:
            if isinstance(value, (int, float)):
                return float(value)
            # Remove currency symbols and commas
            cleaned = str(value).replace('₦', '').replace('NGN', '').replace(',', '').strip()
            return float(cleaned) if cleaned else 0.0
        except (ValueError, AttributeError):
            return 0.0
    
    @staticmethod
    def _parse_percent(value: Any) -> float:
        """Parse percentage value"""
        try:
            if isinstance(value, (int, float)):
                return float(value)
            cleaned = str(value).replace('%', '').strip()
            return float(cleaned) if cleaned else 0.0
        except (ValueError, AttributeError):
            return 0.0
    
    @staticmethod
    def _parse_volume(value: Any) -> int:
        """Parse volume value"""
        try:
            if isinstance(value, int):
                return value
            cleaned = str(value).replace(',', '').strip()
            return int(float(cleaned)) if cleaned else 0
        except (ValueError, AttributeError):
            return 0


def test_ngx_scraper():
    """Test NGX web scraper"""
    print("\n🕷️  Testing NGX Web Scraper\n")
    
    scraper = NGXWebScraper()
    
    # Test connection
    print("1️⃣ Testing NGX website connection...")
    if scraper.test_connection():
        print("   ✅ NGX website is accessible")
    else:
        print("   ❌ Cannot connect to NGX website")
        return
    
    # Try to get market data
    print("\n2️⃣ Attempting to scrape market data...")
    try:
        stocks = scraper.get_market_data()
        print(f"   ✅ Successfully scraped {len(stocks)} stocks")
        
        # Show first 5
        print("\n   Top 5 stocks:")
        for stock in stocks[:5]:
            print(f"      {stock['symbol']}: ₦{stock['price']:.2f} ({stock['change_percent']:+.2f}%)")
    
    except Exception as e:
        print(f"   ❌ Scraping failed: {e}")
        print("\n   This could mean:")
        print("      - NGX website structure has changed")
        print("      - Website is blocking automated requests")
        print("      - Data is loaded dynamically via JavaScript")
        return
    
    # Try specific stocks
    print("\n3️⃣ Testing specific stock lookup...")
    test_symbols = ["DANGCEM", "NESTLE", "MTNN", "GTCO"]
    
    for symbol in test_symbols:
        try:
            stock_info = scraper.get_stock_info(symbol)
            print(f"   ✅ {symbol}: ₦{stock_info['current_price']:.2f}")
        except Exception as e:
            print(f"   ❌ {symbol}: {str(e)[:50]}")
    
    print("\n✅ NGX Web Scraper test complete!")


if __name__ == "__main__":
    test_ngx_scraper()
