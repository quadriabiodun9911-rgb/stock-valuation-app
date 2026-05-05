"""
Commodities & Crypto market data endpoints.

Commodities use yfinance futures symbols (e.g. GC=F for Gold).
Crypto uses yfinance USD pairs (e.g. BTC-USD).
"""

from fastapi import APIRouter, HTTPException
from typing import Any, Dict, List
import yfinance as yf
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/markets", tags=["Markets"])

# ── Symbol catalogues ─────────────────────────────────────────────

COMMODITIES: List[Dict[str, str]] = [
    {"symbol": "GC=F",  "name": "Gold",         "unit": "USD/oz",  "category": "Precious Metals"},
    {"symbol": "SI=F",  "name": "Silver",        "unit": "USD/oz",  "category": "Precious Metals"},
    {"symbol": "PL=F",  "name": "Platinum",      "unit": "USD/oz",  "category": "Precious Metals"},
    {"symbol": "PA=F",  "name": "Palladium",     "unit": "USD/oz",  "category": "Precious Metals"},
    {"symbol": "CL=F",  "name": "Crude Oil (WTI)", "unit": "USD/bbl", "category": "Energy"},
    {"symbol": "BZ=F",  "name": "Brent Crude",   "unit": "USD/bbl", "category": "Energy"},
    {"symbol": "NG=F",  "name": "Natural Gas",   "unit": "USD/MMBtu","category": "Energy"},
    {"symbol": "HG=F",  "name": "Copper",        "unit": "USD/lb",  "category": "Industrial Metals"},
    {"symbol": "ZW=F",  "name": "Wheat",         "unit": "USc/bu",  "category": "Agriculture"},
    {"symbol": "ZC=F",  "name": "Corn",          "unit": "USc/bu",  "category": "Agriculture"},
    {"symbol": "ZS=F",  "name": "Soybeans",      "unit": "USc/bu",  "category": "Agriculture"},
    {"symbol": "KC=F",  "name": "Coffee",        "unit": "USc/lb",  "category": "Agriculture"},
    {"symbol": "SB=F",  "name": "Sugar",         "unit": "USc/lb",  "category": "Agriculture"},
]

FOREX: List[Dict[str, str]] = [
    # Major pairs (vs USD)
    {"symbol": "EURUSD=X", "name": "Euro",             "base": "EUR", "quote": "USD", "category": "Major"},
    {"symbol": "GBPUSD=X", "name": "Pound Sterling",   "base": "GBP", "quote": "USD", "category": "Major"},
    {"symbol": "USDJPY=X", "name": "Japanese Yen",     "base": "USD", "quote": "JPY", "category": "Major"},
    {"symbol": "USDCHF=X", "name": "Swiss Franc",      "base": "USD", "quote": "CHF", "category": "Major"},
    {"symbol": "AUDUSD=X", "name": "Australian Dollar","base": "AUD", "quote": "USD", "category": "Major"},
    {"symbol": "USDCAD=X", "name": "Canadian Dollar",  "base": "USD", "quote": "CAD", "category": "Major"},
    {"symbol": "NZDUSD=X", "name": "New Zealand Dollar","base": "NZD","quote": "USD", "category": "Major"},
    # European
    {"symbol": "EURGBP=X", "name": "EUR/GBP",          "base": "EUR", "quote": "GBP", "category": "European"},
    {"symbol": "EURCHF=X", "name": "EUR/CHF",          "base": "EUR", "quote": "CHF", "category": "European"},
    {"symbol": "GBPJPY=X", "name": "GBP/JPY",          "base": "GBP", "quote": "JPY", "category": "European"},
    # Emerging Markets
    {"symbol": "USDCNY=X", "name": "Chinese Yuan",     "base": "USD", "quote": "CNY", "category": "Emerging Markets"},
    {"symbol": "USDINR=X", "name": "Indian Rupee",     "base": "USD", "quote": "INR", "category": "Emerging Markets"},
    {"symbol": "USDBRL=X", "name": "Brazilian Real",   "base": "USD", "quote": "BRL", "category": "Emerging Markets"},
    {"symbol": "USDMXN=X", "name": "Mexican Peso",     "base": "USD", "quote": "MXN", "category": "Emerging Markets"},
    {"symbol": "USDZAR=X", "name": "South African Rand","base": "USD","quote": "ZAR", "category": "Emerging Markets"},
    {"symbol": "USDNGN=X", "name": "Nigerian Naira",   "base": "USD", "quote": "NGN", "category": "Emerging Markets"},
]

CRYPTOS: List[Dict[str, str]] = [
    {"symbol": "BTC-USD",  "name": "Bitcoin",       "category": "Store of Value"},
    {"symbol": "ETH-USD",  "name": "Ethereum",      "category": "Smart Contracts"},
    {"symbol": "BNB-USD",  "name": "BNB",           "category": "Exchange Token"},
    {"symbol": "SOL-USD",  "name": "Solana",        "category": "Smart Contracts"},
    {"symbol": "XRP-USD",  "name": "XRP",           "category": "Payments"},
    {"symbol": "ADA-USD",  "name": "Cardano",       "category": "Smart Contracts"},
    {"symbol": "DOGE-USD", "name": "Dogecoin",      "category": "Meme"},
    {"symbol": "AVAX-USD", "name": "Avalanche",     "category": "Smart Contracts"},
    {"symbol": "DOT-USD",  "name": "Polkadot",      "category": "Infrastructure"},
    {"symbol": "MATIC-USD","name": "Polygon",       "category": "Layer 2"},
    {"symbol": "LINK-USD", "name": "Chainlink",     "category": "Oracle"},
    {"symbol": "UNI7083-USD","name": "Uniswap",    "category": "DeFi"},
]

# ── Helpers ───────────────────────────────────────────────────────

def _safe_float(val: Any, default: float = 0.0) -> float:
    import math
    try:
        f = float(val) if val is not None else default
        return default if (math.isnan(f) or math.isinf(f)) else f
    except (TypeError, ValueError):
        return default


def _fetch_quote(symbol: str, meta: Dict[str, str]) -> Dict[str, Any]:
    """Fetch a single quote from yfinance and return a normalised dict."""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.fast_info

        price = _safe_float(getattr(info, "last_price", None))
        prev_close = _safe_float(getattr(info, "previous_close", None))
        high_52w = _safe_float(getattr(info, "year_high", None))
        low_52w = _safe_float(getattr(info, "year_low", None))

        # Fallback: pull from history if fast_info gave nothing
        if price == 0:
            hist = ticker.history(period="5d")
            if not hist.empty:
                price = _safe_float(hist["Close"].iloc[-1])
                if prev_close == 0 and len(hist) >= 2:
                    prev_close = _safe_float(hist["Close"].iloc[-2])

        change = price - prev_close if prev_close else 0.0
        change_pct = (change / prev_close * 100) if prev_close else 0.0

        return {
            **meta,
            "price": round(price, 4),
            "previous_close": round(prev_close, 4),
            "change": round(change, 4),
            "change_percent": round(change_pct, 2),
            "52_week_high": round(high_52w, 4),
            "52_week_low": round(low_52w, 4),
            "error": None,
        }
    except Exception as exc:
        logger.warning("Failed to fetch %s: %s", symbol, exc)
        return {
            **meta,
            "price": 0.0,
            "previous_close": 0.0,
            "change": 0.0,
            "change_percent": 0.0,
            "52_week_high": 0.0,
            "52_week_low": 0.0,
            "error": str(exc),
        }


def _fetch_many(items: List[Dict[str, str]], max_workers: int = 6) -> List[Dict[str, Any]]:
    """Fetch quotes concurrently."""
    results: Dict[str, Dict[str, Any]] = {}
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(_fetch_quote, item["symbol"], item): item["symbol"] for item in items}
        for fut in as_completed(futures):
            sym = futures[fut]
            results[sym] = fut.result()
    # preserve catalogue order
    return [results[item["symbol"]] for item in items if item["symbol"] in results]


# ── Endpoints ─────────────────────────────────────────────────────

@router.get("/commodities")
def get_all_commodities():
    """Return live prices for all tracked commodities."""
    data = _fetch_many(COMMODITIES)
    # group by category
    categories: Dict[str, List] = {}
    for item in data:
        cat = item.get("category", "Other")
        categories.setdefault(cat, []).append(item)

    return {
        "total": len(data),
        "categories": categories,
        "items": data,
    }


@router.get("/commodities/{symbol:path}")
def get_commodity(symbol: str):
    """Return live price for a single commodity symbol (e.g. GC=F)."""
    symbol = symbol.upper()
    meta = next((c for c in COMMODITIES if c["symbol"] == symbol), None)
    if not meta:
        # allow ad-hoc futures symbols
        meta = {"symbol": symbol, "name": symbol, "unit": "USD", "category": "Other"}
    result = _fetch_quote(symbol, meta)
    if result["price"] == 0 and result["error"]:
        raise HTTPException(status_code=404, detail=f"Could not fetch data for {symbol}: {result['error']}")
    return result


@router.get("/crypto")
def get_all_crypto():
    """Return live prices for all tracked cryptocurrencies."""
    data = _fetch_many(CRYPTOS)
    # sort by price descending (BTC first naturally)
    sorted_data = sorted(data, key=lambda x: x["price"], reverse=True)

    categories: Dict[str, List] = {}
    for item in sorted_data:
        cat = item.get("category", "Other")
        categories.setdefault(cat, []).append(item)

    return {
        "total": len(sorted_data),
        "categories": categories,
        "items": sorted_data,
    }


@router.get("/crypto/{symbol}")
def get_crypto(symbol: str):
    """Return live price for a single crypto (e.g. BTC-USD or BTC)."""
    symbol = symbol.upper()
    # accept bare ticker like BTC → BTC-USD
    if "-USD" not in symbol:
        symbol = f"{symbol}-USD"
    meta = next((c for c in CRYPTOS if c["symbol"] == symbol), None)
    if not meta:
        meta = {"symbol": symbol, "name": symbol, "category": "Crypto"}
    result = _fetch_quote(symbol, meta)
    if result["price"] == 0 and result["error"]:
        raise HTTPException(status_code=404, detail=f"Could not fetch data for {symbol}: {result['error']}")
    return result


# ── FX endpoints ──────────────────────────────────────────────────

@router.get("/fx")
def get_all_fx():
    """Return live rates for all tracked forex pairs."""
    data = _fetch_many(FOREX)

    categories: Dict[str, List] = {}
    for item in data:
        cat = item.get("category", "Other")
        categories.setdefault(cat, []).append(item)

    return {
        "total": len(data),
        "categories": categories,
        "items": data,
    }


@router.get("/fx/{pair}")
def get_fx_pair(pair: str):
    """Return live rate for a single FX pair (e.g. EURUSD, EUR/USD, or EURUSD=X)."""
    pair = pair.upper().replace("/", "").replace("-", "")
    # normalise to yfinance format: EURUSD → EURUSD=X
    if not pair.endswith("=X"):
        pair = f"{pair}=X"
    meta = next((f for f in FOREX if f["symbol"] == pair), None)
    if not meta:
        base = pair[:3]
        quote = pair[3:6] if len(pair) >= 9 else "USD"
        meta = {"symbol": pair, "name": f"{base}/{quote}", "base": base, "quote": quote, "category": "FX"}
    result = _fetch_quote(pair, meta)
    if result["price"] == 0 and result["error"]:
        raise HTTPException(status_code=404, detail=f"Could not fetch rate for {pair}: {result['error']}")
    return result
