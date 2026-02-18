"""
Test Multiple Data Providers for NGX Support
Tests various APIs to find which ones support Nigerian Stock Exchange
"""

import requests
import json
from typing import Dict, Any, Optional

# Test symbols
NGX_SYMBOLS = [
    "DANGCEM",      # Dangote Cement
    "DANGCEM.NG",
    "NESTLE",       # Nestle Nigeria
    "NESTLE.NG",
    "MTNN",         # MTN Nigeria
    "MTNN.NG",
    "GTCO",         # GT Bank
    "GTCO.NG",
]

INTERNATIONAL_SYMBOL = "AAPL"  # For baseline testing


def test_fmp(symbol: str, api_key: str = "demo") -> Dict[str, Any]:
    """Test Financial Modeling Prep API"""
    print(f"\n🔍 Testing FMP for {symbol}...")
    
    try:
        # Test quote endpoint
        url = f"https://financialmodelingprep.com/api/v3/quote/{symbol}"
        params = {"apikey": api_key}
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data and len(data) > 0:
            quote = data[0]
            print(f"   ✅ SUCCESS! Price: ${quote.get('price', 'N/A')}")
            print(f"   Name: {quote.get('name', 'N/A')}")
            print(f"   Exchange: {quote.get('exchange', 'N/A')}")
            return {
                "provider": "FMP",
                "supported": True,
                "symbol": symbol,
                "data": quote
            }
        else:
            print(f"   ❌ No data returned")
            return {"provider": "FMP", "supported": False, "symbol": symbol}
            
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return {"provider": "FMP", "supported": False, "symbol": symbol, "error": str(e)}


def test_iex_cloud(symbol: str, api_key: str = "pk_test") -> Dict[str, Any]:
    """Test IEX Cloud API"""
    print(f"\n🔍 Testing IEX Cloud for {symbol}...")
    
    try:
        # Test quote endpoint
        url = f"https://cloud.iexapis.com/stable/stock/{symbol}/quote"
        params = {"token": api_key}
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data and 'latestPrice' in data:
            print(f"   ✅ SUCCESS! Price: ${data.get('latestPrice', 'N/A')}")
            print(f"   Name: {data.get('companyName', 'N/A')}")
            print(f"   Exchange: {data.get('primaryExchange', 'N/A')}")
            return {
                "provider": "IEX Cloud",
                "supported": True,
                "symbol": symbol,
                "data": data
            }
        else:
            print(f"   ❌ No data returned")
            return {"provider": "IEX Cloud", "supported": False, "symbol": symbol}
            
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return {"provider": "IEX Cloud", "supported": False, "symbol": symbol, "error": str(e)}


def test_twelve_data(symbol: str, api_key: str = "demo") -> Dict[str, Any]:
    """Test Twelve Data API"""
    print(f"\n🔍 Testing Twelve Data for {symbol}...")
    
    try:
        # Test quote endpoint
        url = "https://api.twelvedata.com/quote"
        params = {
            "symbol": symbol,
            "apikey": api_key
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data and 'close' in data:
            print(f"   ✅ SUCCESS! Price: ${data.get('close', 'N/A')}")
            print(f"   Name: {data.get('name', 'N/A')}")
            print(f"   Exchange: {data.get('exchange', 'N/A')}")
            return {
                "provider": "Twelve Data",
                "supported": True,
                "symbol": symbol,
                "data": data
            }
        elif 'code' in data and data['code'] == 400:
            print(f"   ❌ {data.get('message', 'Symbol not found')}")
            return {"provider": "Twelve Data", "supported": False, "symbol": symbol}
        else:
            print(f"   ❌ No data returned")
            return {"provider": "Twelve Data", "supported": False, "symbol": symbol}
            
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return {"provider": "Twelve Data", "supported": False, "symbol": symbol, "error": str(e)}


def test_polygon_io(symbol: str, api_key: str = "demo") -> Dict[str, Any]:
    """Test Polygon.io API"""
    print(f"\n🔍 Testing Polygon.io for {symbol}...")
    
    try:
        # Test previous close endpoint
        url = f"https://api.polygon.io/v2/aggs/ticker/{symbol}/prev"
        params = {"apiKey": api_key}
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data and data.get('resultsCount', 0) > 0:
            results = data['results'][0]
            print(f"   ✅ SUCCESS! Price: ${results.get('c', 'N/A')}")
            print(f"   Volume: {results.get('v', 'N/A')}")
            return {
                "provider": "Polygon.io",
                "supported": True,
                "symbol": symbol,
                "data": results
            }
        else:
            print(f"   ❌ No data returned")
            return {"provider": "Polygon.io", "supported": False, "symbol": symbol}
            
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return {"provider": "Polygon.io", "supported": False, "symbol": symbol, "error": str(e)}


def test_marketstack(symbol: str, api_key: str = "demo") -> Dict[str, Any]:
    """Test Marketstack API"""
    print(f"\n🔍 Testing Marketstack for {symbol}...")
    
    try:
        # Test EOD endpoint
        url = "https://api.marketstack.com/v1/eod/latest"
        params = {
            "access_key": api_key,
            "symbols": symbol
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data and 'data' in data and len(data['data']) > 0:
            quote = data['data'][0]
            print(f"   ✅ SUCCESS! Price: ${quote.get('close', 'N/A')}")
            print(f"   Exchange: {quote.get('exchange', 'N/A')}")
            return {
                "provider": "Marketstack",
                "supported": True,
                "symbol": symbol,
                "data": quote
            }
        else:
            print(f"   ❌ No data returned")
            return {"provider": "Marketstack", "supported": False, "symbol": symbol}
            
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return {"provider": "Marketstack", "supported": False, "symbol": symbol, "error": str(e)}


def test_ngx_direct() -> Dict[str, Any]:
    """Test direct NGX website scraping"""
    print(f"\n🔍 Testing NGX Direct Website...")
    
    try:
        # Try to fetch from NGX website
        url = "https://ngxgroup.com/exchange/data/prices/"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        if response.status_code == 200:
            print(f"   ✅ Website accessible (status: {response.status_code})")
            print(f"   ⚠️  Scraping would require HTML parsing")
            return {
                "provider": "NGX Direct",
                "supported": True,
                "note": "Requires web scraping implementation"
            }
        else:
            print(f"   ❌ Website not accessible")
            return {"provider": "NGX Direct", "supported": False}
            
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return {"provider": "NGX Direct", "supported": False, "error": str(e)}


def main():
    """Run comprehensive provider tests"""
    
    print("="*70)
    print("🧪 TESTING DATA PROVIDERS FOR NGX SUPPORT")
    print("="*70)
    
    # Test baseline with international stock
    print("\n" + "="*70)
    print("📊 BASELINE TEST: Testing with AAPL (should work)")
    print("="*70)
    
    baseline_results = []
    baseline_results.append(test_fmp(INTERNATIONAL_SYMBOL))
    baseline_results.append(test_twelve_data(INTERNATIONAL_SYMBOL))
    
    # Test NGX symbols
    print("\n" + "="*70)
    print("🇳🇬 NGX STOCK TESTS: Testing Nigerian stocks")
    print("="*70)
    
    ngx_results = {}
    providers = [
        ("FMP", test_fmp),
        ("Twelve Data", test_twelve_data),
        ("IEX Cloud", test_iex_cloud),
        ("Polygon.io", test_polygon_io),
        ("Marketstack", test_marketstack),
    ]
    
    for provider_name, test_func in providers:
        ngx_results[provider_name] = []
        for symbol in NGX_SYMBOLS[:4]:  # Test first 4 symbols
            result = test_func(symbol)
            ngx_results[provider_name].append(result)
    
    # Test direct NGX
    ngx_direct = test_ngx_direct()
    
    # Summary
    print("\n" + "="*70)
    print("📋 SUMMARY REPORT")
    print("="*70)
    
    print("\n✅ Baseline Test Results (AAPL):")
    for result in baseline_results:
        status = "✅ WORKING" if result.get("supported") else "❌ FAILED"
        print(f"   {result['provider']}: {status}")
    
    print("\n🇳🇬 NGX Support Results:")
    for provider_name, results in ngx_results.items():
        success_count = sum(1 for r in results if r.get("supported"))
        total = len(results)
        status = "✅ SUPPORTED" if success_count > 0 else "❌ NOT SUPPORTED"
        print(f"   {provider_name}: {status} ({success_count}/{total} symbols)")
        
        # Show which symbols worked
        if success_count > 0:
            working_symbols = [r['symbol'] for r in results if r.get('supported')]
            print(f"      Working symbols: {', '.join(working_symbols)}")
    
    print(f"\n   NGX Direct Website: {'✅ POSSIBLE' if ngx_direct.get('supported') else '❌ NO ACCESS'}")
    if ngx_direct.get('supported'):
        print(f"      Note: {ngx_direct.get('note', '')}")
    
    # Recommendations
    print("\n" + "="*70)
    print("💡 RECOMMENDATIONS")
    print("="*70)
    
    # Find best provider
    best_provider = None
    best_count = 0
    
    for provider_name, results in ngx_results.items():
        success_count = sum(1 for r in results if r.get("supported"))
        if success_count > best_count:
            best_count = success_count
            best_provider = provider_name
    
    if best_provider and best_count > 0:
        print(f"\n✅ RECOMMENDED: {best_provider}")
        print(f"   - Supports {best_count} out of {len(NGX_SYMBOLS[:4])} tested NGX symbols")
        print(f"   - Can be integrated immediately")
        print(f"\n   Next steps:")
        print(f"   1. Get API key from {best_provider}")
        print(f"   2. Implement {best_provider} provider class")
        print(f"   3. Integrate into main.py")
    else:
        print("\n❌ NO PROVIDER SUPPORTS NGX STOCKS")
        print("\n   Alternative options:")
        print("   1. Contact NGX directly for official API access")
        print("      - Email: info@ngxgroup.com")
        print("      - Website: www.ngxgroup.com")
        print("\n   2. Implement web scraping from NGX website")
        print("      - Pros: Free, direct from source")
        print("      - Cons: Fragile, may violate ToS, maintenance overhead")
        print("\n   3. Use Nigerian fintech APIs:")
        print("      - Mono (mono.co)")
        print("      - Okra (okra.ng)")
        print("      - Flutterwave")
    
    print("\n" + "="*70)
    print("🏁 TEST COMPLETE")
    print("="*70)
    
    # Save results to file
    results_file = "ngx_provider_test_results.json"
    all_results = {
        "baseline": baseline_results,
        "ngx": ngx_results,
        "ngx_direct": ngx_direct,
        "recommendation": {
            "provider": best_provider,
            "success_count": best_count
        }
    }
    
    with open(results_file, 'w') as f:
        json.dump(all_results, f, indent=2)
    
    print(f"\n📄 Results saved to: {results_file}")


if __name__ == "__main__":
    main()
