"""
Stock Valuation API Backend
Comprehensive stock analysis and valuation platform
"""

from fastapi import FastAPI, HTTPException, Query, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import csv
import io
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
import requests
import logging
from dataclasses import dataclass
import json
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from alpha_vantage_provider import AlphaVantageProvider
from twelve_data_provider import TwelveDataProvider
from ai_endpoints import router as ai_router
from realtime_endpoints import router as realtime_router
from news_integration import router as news_router
from price_alerts import router as alerts_router
from trade_reasons import router as trade_reasons_router
from auth import router as auth_router, get_current_user, get_user_id
from portfolio_tracker import router as portfolio_tracker_router
from enhanced_charting import router as charting_router
from backtesting_engine import router as backtest_router
from social import router as social_router
from achievements import router as achievements_router
from briefing import router as briefing_router
from ai_chat import router as ai_chat_router
from referral import router as referral_router
from ai_service import get_efficiency_report, advisor as ai_advisor
from returns_calculator import (
    calculate_holding_period_years,
    calculate_investor_returns,
    estimate_dividend_income,
)
import database as db

# Load environment variables
load_dotenv()

# Set up logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO))
logger = logging.getLogger(__name__)

APP_ENV = os.getenv("APP_ENV", "development").lower()
API_KEY = os.getenv("API_KEY")
ENABLE_HTTPS_REDIRECT = os.getenv(
    "ENABLE_HTTPS_REDIRECT", "false"
).lower() == "true"
ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("ALLOWED_HOSTS", "*").split(",")
    if host.strip()
]
RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "120"))
_rate_limit_store: Dict[str, List[float]] = {}
_rate_limit_lock = threading.Lock()

# Initialize data providers
alpha_vantage = AlphaVantageProvider()
twelve_data = TwelveDataProvider()

# ── API Key Authentication ────────────────────────────────────────
# Set API_KEY env var to enable authentication. When unset, auth is disabled.

async def verify_api_key(request: Request):
    """Verify API key if one is configured."""
    if not API_KEY:
        return  # Auth disabled when no key is set
    auth_header = request.headers.get("Authorization", "")
    key = request.query_params.get("api_key") or (
        auth_header.removeprefix("Bearer ").strip() if auth_header.startswith("Bearer ") else ""
    )
    if key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")

app = FastAPI(
    title="Stock Valuation API",
    description="Comprehensive stock analysis and valuation platform with fundamental, technical, and AI-powered analysis",
    version="2.0.0"
)

# CORS middleware
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:8081,http://localhost:19006"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=600,
)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=ALLOWED_HOSTS or ["*"],
)

if APP_ENV == "production" and ENABLE_HTTPS_REDIRECT:
    app.add_middleware(HTTPSRedirectMiddleware)

# Public or exempt endpoints
_PUBLIC_PATHS = {"/", "/health", "/docs", "/openapi.json", "/redoc"}


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if (
        request.method == "OPTIONS"
        or request.url.path in _PUBLIC_PATHS
        or RATE_LIMIT_PER_MINUTE <= 0
    ):
        return await call_next(request)

    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"

    now = time.time()
    window_start = now - 60

    with _rate_limit_lock:
        request_times = _rate_limit_store.setdefault(client_ip, [])
        request_times[:] = [ts for ts in request_times if ts > window_start]

        if len(request_times) >= RATE_LIMIT_PER_MINUTE:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Try again later."},
            )

        request_times.append(now)

    return await call_next(request)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (time.perf_counter() - start) * 1000
        logger.exception(
            "Request failed: %s %s in %.2fms",
            request.method,
            request.url.path,
            duration_ms,
        )
        raise

    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s -> %s in %.2fms",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.middleware("http")
async def api_key_middleware(request: Request, call_next):
    if request.method == "OPTIONS" or request.url.path in _PUBLIC_PATHS:
        return await call_next(request)
    try:
        await verify_api_key(request)
    except HTTPException as exc:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )
    return await call_next(request)

# Initialize database
db.init_db()

# Include routers
app.include_router(auth_router)
app.include_router(ai_router)
app.include_router(realtime_router)
app.include_router(news_router)
app.include_router(alerts_router)
app.include_router(trade_reasons_router)
app.include_router(portfolio_tracker_router)
app.include_router(charting_router)
app.include_router(backtest_router)
app.include_router(social_router)
app.include_router(achievements_router)
app.include_router(briefing_router)
app.include_router(ai_chat_router)
app.include_router(referral_router)

# Pydantic models
class StockSymbol(BaseModel):
    symbol: str

class DCFParams(BaseModel):
    symbol: str
    growth_rate: float = 0.05  # 5% default
    discount_rate: float = 0.10  # 10% default
    terminal_growth_rate: float = 0.03  # 3% default

class ComparisonParams(BaseModel):
    symbols: List[str]
    metrics: List[str] = ["P/E", "P/B", "EV/EBITDA", "P/S"]

class UserFinancialData(BaseModel):
    symbol: str
    revenue: Optional[float] = None
    operating_income: Optional[float] = None
    net_income: Optional[float] = None
    total_assets: Optional[float] = None
    total_debt: Optional[float] = None
    cash_and_equivalents: Optional[float] = None
    shares_outstanding: Optional[float] = None
    capex: Optional[float] = None
    working_capital_change: Optional[float] = None
    tax_rate: Optional[float] = None
    depreciation: Optional[float] = None

class FCFValuationParams(BaseModel):
    symbol: str
    years_to_project: int = 5
    growth_rate: float = 0.05
    discount_rate: float = 0.10
    terminal_growth_rate: float = 0.03
    use_custom_data: bool = False
    custom_data: Optional[UserFinancialData] = None

class PortfolioPosition(BaseModel):
    symbol: str
    shares: float
    cost_basis: float

class PortfolioData(BaseModel):
    positions: List[PortfolioPosition]
    cash: float = 0.0
    last_updated: Optional[str] = None


class InvestorReturnRequest(BaseModel):
    symbol: Optional[str] = None
    shares: float
    purchase_price: float
    current_price: Optional[float] = None
    purchase_date: Optional[str] = None
    total_dividends: Optional[float] = None
    annual_dividend_per_share: Optional[float] = None
    inflation_rate_pct: float = 3.0
    transaction_cost_rate_pct: float = 0.25
    fixed_transaction_cost: float = 0.0


def _load_portfolio_data(user_id: int = 1) -> PortfolioData:
    data = db.get_portfolio(user_id)
    positions = [PortfolioPosition(**p) for p in data["positions"]]
    return PortfolioData(positions=positions, cash=data["cash"], last_updated=data["last_updated"])

def _save_portfolio_data(data: PortfolioData, user_id: int = 1) -> None:
    positions = [p.dict() for p in data.positions]
    db.save_portfolio(user_id, positions, data.cash)

def _get_price_on_or_after(history: pd.DataFrame, target_date: datetime) -> Optional[float]:
    if history is None or history.empty:
        return None
    index = history.index
    timestamp = pd.Timestamp(target_date)

    if hasattr(index, "tz"):
        if index.tz is not None:
            if timestamp.tzinfo is None:
                timestamp = timestamp.tz_localize(index.tz)
            else:
                timestamp = timestamp.tz_convert(index.tz)
        elif timestamp.tzinfo is not None:
            timestamp = timestamp.tz_convert(None)

    filtered = history[index >= timestamp]
    if filtered.empty:
        return None
    return float(filtered["Close"].iloc[0])

def _calculate_portfolio_risk_score(volatility: Optional[float]) -> float:
    if volatility is None:
        return 0.0
    score = min(10.0, max(0.0, (volatility / 0.4) * 10))
    return round(score, 1)

DEFAULT_NGX_SYMBOLS = [
    "DANGCEM.NG",
    "BUACEMENT.NG",
    "GTCO.NG",
    "MTNN.NG",
    "ZENITHBANK.NG",
    "NB.NG",
    "SEPLAT.NG",
    "AIRTELAFRI.NG",
    "FBNH.NG",
    "ACCESSCORP.NG",
]

def _normalize_ngx_symbol(symbol: str) -> str:
    raw = symbol.strip().upper()
    if "." in raw:
        return raw
    return f"{raw}.NG"

def _get_market_snapshot(symbols: List[str]) -> List[Dict[str, Any]]:
    def _fetch_one(symbol: str) -> Dict[str, Any]:
        data = valuation_service.get_stock_data(symbol, period="1mo")
        info = data.get("info", {})
        history = data.get("history")

        current_price = info.get("regularMarketPrice") or info.get("currentPrice")
        change_pct = info.get("regularMarketChangePercent")
        volume = info.get("regularMarketVolume") or info.get("volume")

        if history is not None and not history.empty:
            current_price = current_price or float(history["Close"].iloc[-1])
            if change_pct is None and len(history) >= 2:
                prev_close = float(history["Close"].iloc[-2])
                if prev_close > 0:
                    change_pct = (float(current_price) - prev_close) / prev_close * 100

        return {
            "symbol": symbol,
            "name": info.get("shortName") or info.get("longName") or symbol,
            "price": float(current_price or 0),
            "change_pct": float(change_pct or 0),
            "volume": int(volume or 0),
            "sector": info.get("sector", "Unknown") or "Unknown",
        }

    snapshots = []
    with ThreadPoolExecutor(max_workers=min(5, len(symbols))) as executor:
        future_to_sym = {executor.submit(_fetch_one, sym): sym for sym in symbols}
        for future in as_completed(future_to_sym):
            try:
                snapshots.append(future.result())
            except Exception as exc:
                sym = future_to_sym[future]
                logger.warning(f"Snapshot fetch failed for {sym}: {exc}")
                snapshots.append({
                    "symbol": sym, "name": sym, "price": 0,
                    "change_pct": 0, "volume": 0, "sector": "Unknown",
                })
    # Maintain original symbol order
    order = {s: i for i, s in enumerate(symbols)}
    snapshots.sort(key=lambda x: order.get(x["symbol"], 999))
    return snapshots

def _get_ngx_index() -> Optional[Dict[str, Any]]:
    try:
        symbol = "^NGSE"
        data = valuation_service.get_stock_data(symbol, period="1mo")
        info = data.get("info", {})
        history = data.get("history")

        current_price = info.get("regularMarketPrice") or info.get("currentPrice")
        change_pct = info.get("regularMarketChangePercent")

        if history is not None and not history.empty:
            current_price = current_price or float(history["Close"].iloc[-1])
            if change_pct is None and len(history) >= 2:
                prev_close = float(history["Close"].iloc[-2])
                if prev_close > 0:
                    change_pct = (float(current_price) - prev_close) / prev_close * 100

        return {
            "symbol": symbol,
            "name": info.get("shortName") or "NGX All-Share Index",
            "price": float(current_price or 0),
            "change_pct": float(change_pct or 0),
        }
    except Exception as exc:
        logger.warning(f"Failed to fetch NGX index: {exc}")
        return None

def _calculate_intrinsic_value(symbol: str) -> Dict[str, Any]:
    try:
        dcf = valuation_service.calculate_dcf_valuation(symbol)
        current_price = dcf.get("current_price") or 0
        intrinsic_value = dcf.get("intrinsic_value") or 0
        margin_of_safety = ((intrinsic_value - current_price) / intrinsic_value * 100) if intrinsic_value else 0
        signal = "Undervalued" if margin_of_safety >= 20 else "Fairly Valued" if margin_of_safety >= -10 else "Overvalued"
        return {
            "symbol": symbol,
            "market_price": current_price,
            "intrinsic_value": intrinsic_value,
            "margin_of_safety": margin_of_safety,
            "signal": signal,
        }
    except HTTPException as exc:
        logger.warning(f"DCF unavailable for {symbol}: {exc.detail}")
        data = valuation_service.get_stock_data(symbol, period="1y")
        info = data.get("info", {})
        current_price = info.get("currentPrice") or info.get("regularMarketPrice") or 0
        return {
            "symbol": symbol,
            "market_price": current_price,
            "intrinsic_value": current_price,
            "margin_of_safety": 0,
            "signal": "Insufficient data",
        }

def _build_alerts(symbols: List[str]) -> List[Dict[str, Any]]:
    alerts: List[Dict[str, Any]] = []
    for symbol in symbols:
        try:
            tech = valuation_service.calculate_technical_indicators(symbol, period="6mo")
            info = valuation_service.get_stock_data(symbol, period="6mo").get("info", {})
            current_price = tech.get("current_price", 0)
            resistance = tech["support_resistance"]["resistance"]
            support = tech["support_resistance"]["support"]
            avg_volume = info.get("averageVolume") or info.get("averageVolume10days") or 0
            volume = info.get("volume") or info.get("regularMarketVolume") or 0
            change_pct = info.get("regularMarketChangePercent") or 0

            if current_price and resistance and current_price > resistance:
                alerts.append({
                    "symbol": symbol,
                    "type": "price_breakout",
                    "message": "Price broke above resistance",
                    "value": current_price,
                })

            if change_pct and abs(change_pct) >= 5:
                alerts.append({
                    "symbol": symbol,
                    "type": "unusual_jump",
                    "message": "Unusual price move",
                    "value": change_pct,
                })

            if avg_volume and volume and volume > avg_volume * 1.8:
                alerts.append({
                    "symbol": symbol,
                    "type": "volume_spike",
                    "message": "Volume spike detected",
                    "value": volume,
                })

            sma_20 = tech["moving_averages"]["sma_20"]
            sma_50 = tech["moving_averages"]["sma_50"]
            if sma_20 and sma_50 and sma_20 > sma_50 and current_price > support:
                alerts.append({
                    "symbol": symbol,
                    "type": "trend_reversal",
                    "message": "Potential trend reversal",
                    "value": sma_20 - sma_50,
                })
        except Exception as exc:
            logger.warning(f"Alert evaluation failed for {symbol}: {exc}")
            continue
    return alerts

def _rank_symbols(symbols: List[str]) -> Dict[str, List[Dict[str, Any]]]:
    momentum_scores = []
    dividend_scores = []
    value_scores = []

    for symbol in symbols:
        try:
            data = valuation_service.get_stock_data(symbol, period="6mo")
            info = data.get("info", {})
            history = data.get("history")
            momentum = 0.0
            if history is not None and len(history) >= 20:
                start_price = float(history["Close"].iloc[0])
                end_price = float(history["Close"].iloc[-1])
                if start_price > 0:
                    momentum = (end_price - start_price) / start_price * 100

            dividend_yield = (info.get("dividendYield") or 0) * 100
            pe_ratio = info.get("trailingPE") or info.get("forwardPE") or 0
            value_score = 1 / pe_ratio if pe_ratio else 0

            momentum_scores.append({"symbol": symbol, "score": momentum})
            dividend_scores.append({"symbol": symbol, "score": dividend_yield})
            value_scores.append({"symbol": symbol, "score": value_score})
        except Exception as exc:
            logger.warning(f"Ranking evaluation failed for {symbol}: {exc}")
            continue

    momentum_scores.sort(key=lambda item: item["score"], reverse=True)
    dividend_scores.sort(key=lambda item: item["score"], reverse=True)
    value_scores.sort(key=lambda item: item["score"], reverse=True)

    return {
        "momentum": momentum_scores[:10],
        "dividend": dividend_scores[:10],
        "value": value_scores[:10],
    }

def _calculate_screener_score(metrics: Dict[str, Any]) -> float:
    momentum = metrics.get("momentum", 0)
    dividend = metrics.get("dividend_yield", 0)
    value = metrics.get("value_score", 0)
    volatility = metrics.get("volatility", 0) or 0

    score = (momentum * 0.4) + (dividend * 0.3) + (value * 0.3)
    score -= volatility * 5
    return round(score, 2)

def _get_screener_snapshot(symbols: List[str]) -> List[Dict[str, Any]]:
    results = []
    for symbol in symbols:
        try:
            data = valuation_service.get_stock_data(symbol, period="6mo")
            info = data.get("info", {})
            history = data.get("history")

            current_price = info.get("regularMarketPrice") or info.get("currentPrice")
            change_pct = info.get("regularMarketChangePercent") or 0
            volume = info.get("regularMarketVolume") or info.get("volume") or 0
            dividend_yield = (info.get("dividendYield") or 0) * 100
            pe_ratio = info.get("trailingPE") or info.get("forwardPE") or 0

            momentum = 0.0
            volatility = 0.0
            if history is not None and not history.empty:
                current_price = current_price or float(history["Close"].iloc[-1])
                start_price = float(history["Close"].iloc[0])
                if start_price > 0:
                    momentum = (float(current_price) - start_price) / start_price * 100
                returns = history["Close"].pct_change().dropna()
                if not returns.empty:
                    volatility = float(returns.std() * np.sqrt(252))

            value_score = (1 / pe_ratio * 100) if pe_ratio else 0

            metrics = {
                "symbol": symbol,
                "name": info.get("shortName") or info.get("longName") or symbol,
                "price": float(current_price or 0),
                "change_pct": float(change_pct or 0),
                "volume": int(volume or 0),
                "sector": info.get("sector", "Unknown") or "Unknown",
                "dividend_yield": float(dividend_yield or 0),
                "pe_ratio": float(pe_ratio or 0),
                "momentum": float(momentum or 0),
                "volatility": float(volatility or 0),
                "value_score": float(value_score or 0),
            }
            metrics["ai_score"] = _calculate_screener_score(metrics)
            metrics["signal"] = "Buy" if metrics["ai_score"] >= 8 else "Watch" if metrics["ai_score"] >= 4 else "Avoid"
            results.append(metrics)
        except Exception as exc:
            logger.warning(f"Screener snapshot failed for {symbol}: {exc}")
            continue
    return results

@dataclass
class ValuationResult:
    symbol: str
    current_price: float
    intrinsic_value: float
    upside_percentage: float
    valuation_method: str
    confidence_level: str

class StockValuationService:
    def __init__(self):
        self.cache = {}
        self.cache_duration = 300  # 5 minutes
    
    def get_stock_data(self, symbol: str, period: str = "1y"):
        """Get stock data with caching"""
        cache_key = f"{symbol}_{period}"
        current_time = datetime.now()
        
        if cache_key in self.cache:
            cached_data, cached_time = self.cache[cache_key]
            if (current_time - cached_time).seconds < self.cache_duration:
                return cached_data
        
        try:
            stock = yf.Ticker(symbol)
            data = {
                'info': stock.info,
                'history': stock.history(period=period),
                'financials': stock.financials,
                'balance_sheet': stock.balance_sheet,
                'cashflow': stock.cashflow,
                'calendar': stock.calendar,
                'recommendations': stock.recommendations,
                'major_holders': stock.major_holders,
                'institutional_holders': stock.institutional_holders
            }
            
            self.cache[cache_key] = (data, current_time)
            return data
        except Exception as e:
            logger.error(f"Error fetching data for {symbol}: {e}")
            raise HTTPException(status_code=400, detail=f"Error fetching stock data: {str(e)}")
    
    def calculate_dcf_valuation(self, symbol: str, growth_rate: float = 0.05, 
                               discount_rate: float = 0.10, terminal_growth_rate: float = 0.03):
        """Discounted Cash Flow valuation"""
        try:
            data = self.get_stock_data(symbol)
            cashflow = data['cashflow']
            info = data['info']
            
            if cashflow.empty:
                raise ValueError("No cash flow data available")
            
            # Get free cash flow (most recent year)
            try:
                # Try different possible cash flow columns
                if 'Free Cash Flow' in cashflow.index:
                    current_fcf = cashflow.loc['Free Cash Flow'].iloc[0]
                elif 'Operating Cash Flow' in cashflow.index:
                    operating_cf = cashflow.loc['Operating Cash Flow'].iloc[0]
                    capex = cashflow.loc['Capital Expenditures'].iloc[0] if 'Capital Expenditures' in cashflow.index else 0
                    current_fcf = operating_cf + capex  # CapEx is usually negative
                else:
                    # Fallback calculation
                    current_fcf = cashflow.iloc[0, 0]  # First row, first column
            except Exception:
                raise HTTPException(status_code=400, detail="No free cash flow data available for DCF analysis")
            
            # Project cash flows for 5 years
            projected_fcf = []
            for year in range(1, 6):
                fcf = current_fcf * ((1 + growth_rate) ** year)
                projected_fcf.append(fcf)
            
            # Calculate terminal value
            terminal_fcf = projected_fcf[-1] * (1 + terminal_growth_rate)
            terminal_value = terminal_fcf / (discount_rate - terminal_growth_rate)
            
            # Discount all cash flows to present value
            pv_fcf = []
            for year, fcf in enumerate(projected_fcf, 1):
                pv = fcf / ((1 + discount_rate) ** year)
                pv_fcf.append(pv)
            
            pv_terminal = terminal_value / ((1 + discount_rate) ** 5)
            
            # Enterprise value
            enterprise_value = sum(pv_fcf) + pv_terminal
            
            # Calculate equity value
            total_cash = info.get('totalCash', 0) or 0
            total_debt = info.get('totalDebt', 0) or 0
            equity_value = enterprise_value + total_cash - total_debt
            
            # Per share value
            shares_outstanding = info.get('sharesOutstanding', 0) or info.get('impliedSharesOutstanding', 1)
            intrinsic_value = equity_value / shares_outstanding
            
            current_price = info.get('currentPrice', 0) or info.get('regularMarketPrice', 0)
            upside = ((intrinsic_value - current_price) / current_price) * 100 if current_price > 0 else 0
            
            return {
                'symbol': symbol,
                'current_price': current_price,
                'intrinsic_value': intrinsic_value,
                'upside_percentage': upside,
                'enterprise_value': enterprise_value,
                'equity_value': equity_value,
                'terminal_value': terminal_value,
                'projected_fcf': projected_fcf,
                'pv_fcf': pv_fcf,
                'assumptions': {
                    'growth_rate': growth_rate,
                    'discount_rate': discount_rate,
                    'terminal_growth_rate': terminal_growth_rate
                },
                'confidence_level': self._get_confidence_level(upside)
            }
            
        except Exception as e:
            logger.error(f"DCF calculation error for {symbol}: {e}")
            raise HTTPException(status_code=500, detail=f"DCF calculation failed: {str(e)}")
    
    def calculate_comparable_analysis(self, symbol: str, peer_symbols: List[str] = None):
        """Comparable company analysis"""
        try:
            if not peer_symbols:
                # Get sector peers (simplified - in real app, use sector API)
                data = self.get_stock_data(symbol)
                sector = data['info'].get('sector', '')
                # For demo, use some common stocks as peers
                peer_symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN'] if symbol not in ['AAPL', 'MSFT', 'GOOGL', 'AMZN'] else ['SPY', 'QQQ', 'IWM']
            
            # Get data for all companies
            all_symbols = [symbol] + peer_symbols
            company_data = {}
            
            for sym in all_symbols:
                try:
                    data = self.get_stock_data(sym)
                    info = data['info']
                    
                    company_data[sym] = {
                        'market_cap': info.get('marketCap', 0),
                        'pe_ratio': info.get('trailingPE', 0),
                        'pb_ratio': info.get('priceToBook', 0),
                        'ps_ratio': info.get('priceToSalesTrailing12Months', 0),
                        'ev_ebitda': info.get('enterpriseToEbitda', 0),
                        'current_price': info.get('currentPrice', 0),
                        'revenue': info.get('totalRevenue', 0),
                        'net_income': info.get('netIncomeToCommon', 0),
                        'book_value': info.get('bookValue', 0),
                        'enterprise_value': info.get('enterpriseValue', 0)
                    }
                except:
                    continue
            
            # Calculate peer averages
            peer_data = {k: v for k, v in company_data.items() if k != symbol}
            
            if not peer_data:
                raise ValueError("No peer data available")
            
            peer_averages = {}
            for metric in ['pe_ratio', 'pb_ratio', 'ps_ratio', 'ev_ebitda']:
                values = [data[metric] for data in peer_data.values() if data[metric] and data[metric] > 0]
                peer_averages[metric] = np.mean(values) if values else 0
            
            # Calculate implied valuations
            target_data = company_data[symbol]
            valuations = {}
            
            # P/E valuation
            if target_data['net_income'] and peer_averages['pe_ratio']:
                eps = target_data['net_income'] / (target_data['market_cap'] / target_data['current_price']) if target_data['current_price'] else 0
                valuations['pe_valuation'] = eps * peer_averages['pe_ratio']
            
            # P/B valuation
            if target_data['book_value'] and peer_averages['pb_ratio']:
                valuations['pb_valuation'] = target_data['book_value'] * peer_averages['pb_ratio']
            
            # P/S valuation
            if target_data['revenue'] and peer_averages['ps_ratio']:
                revenue_per_share = target_data['revenue'] / (target_data['market_cap'] / target_data['current_price']) if target_data['current_price'] else 0
                valuations['ps_valuation'] = revenue_per_share * peer_averages['ps_ratio']
            
            # Calculate average valuation
            valid_valuations = [v for v in valuations.values() if v > 0]
            avg_valuation = np.mean(valid_valuations) if valid_valuations else target_data['current_price']
            
            upside = ((avg_valuation - target_data['current_price']) / target_data['current_price']) * 100 if target_data['current_price'] > 0 else 0
            
            return {
                'symbol': symbol,
                'current_price': target_data['current_price'],
                'implied_valuations': valuations,
                'average_valuation': avg_valuation,
                'upside_percentage': upside,
                'peer_averages': peer_averages,
                'peer_symbols': peer_symbols,
                'target_metrics': {
                    'pe_ratio': target_data['pe_ratio'],
                    'pb_ratio': target_data['pb_ratio'],
                    'ps_ratio': target_data['ps_ratio'],
                    'ev_ebitda': target_data['ev_ebitda']
                },
                'confidence_level': self._get_confidence_level(upside)
            }
            
        except Exception as e:
            logger.error(f"Comparable analysis error for {symbol}: {e}")
            raise HTTPException(status_code=500, detail=f"Comparable analysis failed: {str(e)}")
    
    def calculate_technical_indicators(self, symbol: str, period: str = "1y"):
        """Calculate technical indicators"""
        try:
            data = self.get_stock_data(symbol, period)
            history = data['history']
            
            if history.empty:
                raise ValueError("No price history available")
            
            # Calculate technical indicators
            close_prices = history['Close']
            high_prices = history['High']
            low_prices = history['Low']
            volumes = history['Volume']
            
            # Simple Moving Averages
            sma_20 = close_prices.rolling(window=20).mean().iloc[-1]
            sma_50 = close_prices.rolling(window=50).mean().iloc[-1]
            sma_200 = close_prices.rolling(window=200).mean().iloc[-1]
            
            # Exponential Moving Averages
            ema_12 = close_prices.ewm(span=12).mean().iloc[-1]
            ema_26 = close_prices.ewm(span=26).mean().iloc[-1]
            
            # MACD
            macd = ema_12 - ema_26
            macd_signal = pd.Series([macd]).ewm(span=9).mean().iloc[0]
            macd_histogram = macd - macd_signal
            
            # RSI
            delta = close_prices.diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs)).iloc[-1]
            
            # Bollinger Bands
            bb_middle = close_prices.rolling(window=20).mean().iloc[-1]
            bb_std = close_prices.rolling(window=20).std().iloc[-1]
            bb_upper = bb_middle + (bb_std * 2)
            bb_lower = bb_middle - (bb_std * 2)
            
            current_price = close_prices.iloc[-1]
            
            # Support and Resistance levels
            recent_highs = high_prices.rolling(window=20).max()
            recent_lows = low_prices.rolling(window=20).min()
            resistance = recent_highs.iloc[-20:].max()
            support = recent_lows.iloc[-20:].min()
            
            return {
                'symbol': symbol,
                'current_price': current_price,
                'moving_averages': {
                    'sma_20': sma_20,
                    'sma_50': sma_50,
                    'sma_200': sma_200,
                    'ema_12': ema_12,
                    'ema_26': ema_26
                },
                'momentum_indicators': {
                    'rsi': rsi,
                    'macd': macd,
                    'macd_signal': macd_signal,
                    'macd_histogram': macd_histogram
                },
                'volatility_indicators': {
                    'bollinger_upper': bb_upper,
                    'bollinger_middle': bb_middle,
                    'bollinger_lower': bb_lower
                },
                'support_resistance': {
                    'resistance': resistance,
                    'support': support
                },
                'signals': self._generate_technical_signals(current_price, sma_20, sma_50, rsi, macd, bb_upper, bb_lower)
            }
            
        except Exception as e:
            logger.error(f"Technical analysis error for {symbol}: {e}")
            raise HTTPException(status_code=500, detail=f"Technical analysis failed: {str(e)}")

    def get_price_eps_series(self, symbol: str, period: str = "1y"):
        """Get aligned daily price and EPS series for visualization"""
        try:
            data = self.get_stock_data(symbol, period)
            history = data['history']
            info = data['info']

            if history.empty:
                raise ValueError("No price history available")

            prices = history['Close']
            price_index = prices.index

            # Compute daily EPS from PE ratio so EPS moves with price
            pe_ratio = info.get('trailingPE') or info.get('forwardPE')
            eps_series = None
            if pe_ratio and pe_ratio > 0:
                eps_daily = prices / pe_ratio
            else:
                # Get quarterly EPS from income statement or earnings (fallback)
                ticker = yf.Ticker(symbol)
                shares = info.get('sharesOutstanding', 0) or info.get('impliedSharesOutstanding', 0)

                try:
                    income_stmt = ticker.quarterly_income_stmt
                except Exception:
                    income_stmt = None

                if income_stmt is not None and not income_stmt.empty and shares:
                    net_income_row = None
                    for key in [
                        'Net Income',
                        'Net Income Common Stockholders',
                        'Net Income Applicable To Common Shares'
                    ]:
                        if key in income_stmt.index:
                            net_income_row = income_stmt.loc[key]
                            break

                    if net_income_row is not None:
                        eps_series = net_income_row / shares
                        eps_series.index = pd.to_datetime(eps_series.index)

                if eps_series is None or eps_series.empty:
                    quarterly_earnings = ticker.quarterly_earnings
                    if quarterly_earnings is not None and not quarterly_earnings.empty and shares:
                        eps_series = quarterly_earnings['Earnings'] / shares
                        eps_series.index = pd.to_datetime(eps_series.index)

                if eps_series is None or eps_series.empty:
                    trailing_eps = info.get('trailingEps') or info.get('forwardEps')
                    if trailing_eps is not None:
                        eps_series = pd.Series([trailing_eps], index=[price_index[0]])

                # Forward fill EPS values to daily frequency
                if eps_series is not None and not eps_series.empty:
                    eps_daily = eps_series.reindex(price_index, method='ffill')
                else:
                    eps_daily = pd.Series([None] * len(price_index), index=price_index)

            points = []
            for date, price in prices.items():
                eps_value = eps_daily.loc[date]
                points.append({
                    "date": date.strftime('%Y-%m-%d'),
                    "price": float(price) if price is not None else None,
                    "eps": float(eps_value) if eps_value is not None and not pd.isna(eps_value) else None
                })

            return {
                "symbol": symbol,
                "period": period,
                "points": points
            }

        except Exception as e:
            logger.error(f"Price/EPS series error for {symbol}: {e}")
            raise HTTPException(status_code=500, detail=f"Price/EPS series failed: {str(e)}")

    def get_financial_growth_metrics(self, symbol: str, period: str = "1y"):
        """Get growth metrics for revenue, earnings, price, and debt to equity"""
        try:
            data = self.get_stock_data(symbol, period)
            info = data['info']
            history = data['history']
            financials = data['financials']
            balance_sheet = data['balance_sheet']

            # Price growth over period
            price_growth = None
            if history is not None and not history.empty:
                start_price = history['Close'].iloc[0]
                end_price = history['Close'].iloc[-1]
                if start_price:
                    price_growth = ((end_price - start_price) / start_price) * 100

            # Revenue and earnings growth (YoY from financials)
            revenue_growth = info.get('revenueGrowth')
            earnings_growth = info.get('earningsGrowth')

            if revenue_growth is None and financials is not None and not financials.empty:
                if 'Total Revenue' in financials.index and financials.shape[1] >= 2:
                    latest = financials.loc['Total Revenue'].iloc[0]
                    prev = financials.loc['Total Revenue'].iloc[1]
                    if prev:
                        revenue_growth = (latest - prev) / prev

            if earnings_growth is None and financials is not None and not financials.empty:
                if 'Net Income' in financials.index and financials.shape[1] >= 2:
                    latest = financials.loc['Net Income'].iloc[0]
                    prev = financials.loc['Net Income'].iloc[1]
                    if prev:
                        earnings_growth = (latest - prev) / prev

            # Debt to equity growth (YoY)
            debt_to_equity_growth = None
            if balance_sheet is not None and not balance_sheet.empty and balance_sheet.shape[1] >= 2:
                total_assets_latest = balance_sheet.loc['Total Assets'].iloc[0] if 'Total Assets' in balance_sheet.index else None
                total_assets_prev = balance_sheet.loc['Total Assets'].iloc[1] if 'Total Assets' in balance_sheet.index else None
                total_debt_latest = info.get('totalDebt')
                total_debt_prev = info.get('totalDebt')

                if total_assets_latest is not None and total_assets_prev is not None:
                    equity_latest = total_assets_latest - (total_debt_latest or 0)
                    equity_prev = total_assets_prev - (total_debt_prev or 0)
                    if equity_latest and equity_prev:
                        dte_latest = (total_debt_latest or 0) / equity_latest
                        dte_prev = (total_debt_prev or 0) / equity_prev
                        if dte_prev:
                            debt_to_equity_growth = ((dte_latest - dte_prev) / dte_prev) * 100

            # EPS growth (quarterly)
            eps_growth = None
            quarterly_earnings = yf.Ticker(symbol).quarterly_earnings
            shares = info.get('sharesOutstanding', 0) or info.get('impliedSharesOutstanding', 1)
            if quarterly_earnings is not None and not quarterly_earnings.empty and shares:
                if quarterly_earnings.shape[0] >= 2:
                    latest_eps = quarterly_earnings['Earnings'].iloc[0] / shares
                    prev_eps = quarterly_earnings['Earnings'].iloc[1] / shares
                    if prev_eps:
                        eps_growth = ((latest_eps - prev_eps) / abs(prev_eps)) * 100

            return {
                "symbol": symbol,
                "period": period,
                "growth": {
                    "revenue_growth": (revenue_growth * 100) if revenue_growth is not None else None,
                    "earnings_growth": (earnings_growth * 100) if earnings_growth is not None else None,
                    "price_growth": price_growth,
                    "debt_to_equity_growth": debt_to_equity_growth,
                    "eps_growth": eps_growth
                }
            }
        except Exception as e:
            logger.error(f"Financial growth metrics error for {symbol}: {e}")
            raise HTTPException(status_code=500, detail=f"Financial growth metrics failed: {str(e)}")
    
    def _get_confidence_level(self, upside_percentage: float) -> str:
        """Determine confidence level based on upside percentage"""
        abs_upside = abs(upside_percentage)
        if abs_upside < 10:
            return "Low"
        elif abs_upside < 25:
            return "Medium"
        else:
            return "High"
    
    def calculate_fcf_valuation(self, symbol: str, years_to_project: int = 5, 
                               growth_rate: float = 0.05, discount_rate: float = 0.10,
                               terminal_growth_rate: float = 0.03, custom_data: UserFinancialData = None):
        """Enhanced Free Cash Flow valuation with user-customizable inputs"""
        try:
            data = self.get_stock_data(symbol)
            info = data['info']
            
            # Use custom data if provided, otherwise get from Yahoo Finance
            if custom_data:
                # Calculate FCF from user inputs
                operating_cash_flow = custom_data.net_income or 0
                if custom_data.depreciation:
                    operating_cash_flow += custom_data.depreciation
                if custom_data.working_capital_change:
                    operating_cash_flow -= custom_data.working_capital_change
                
                current_fcf = operating_cash_flow - (custom_data.capex or 0)
                shares_outstanding = custom_data.shares_outstanding or 1
                total_cash = custom_data.cash_and_equivalents or 0
                total_debt = custom_data.total_debt or 0
                current_price = info.get('currentPrice', 0) or info.get('regularMarketPrice', 0)
            else:
                # Get from Yahoo Finance
                cashflow = data['cashflow']
                if cashflow.empty:
                    raise ValueError("No cash flow data available")
                
                # Calculate FCF
                try:
                    if 'Free Cash Flow' in cashflow.index:
                        current_fcf = cashflow.loc['Free Cash Flow'].iloc[0]
                    elif 'Operating Cash Flow' in cashflow.index:
                        operating_cf = cashflow.loc['Operating Cash Flow'].iloc[0]
                        capex = cashflow.loc['Capital Expenditures'].iloc[0] if 'Capital Expenditures' in cashflow.index else 0
                        current_fcf = operating_cf + capex  # CapEx is usually negative
                    else:
                        current_fcf = cashflow.iloc[0, 0]
                except Exception:
                    raise HTTPException(status_code=400, detail="No free cash flow data available for DCF analysis")
                
                shares_outstanding = info.get('sharesOutstanding', 0) or info.get('impliedSharesOutstanding', 1)
                total_cash = info.get('totalCash', 0) or 0
                total_debt = info.get('totalDebt', 0) or 0
                current_price = info.get('currentPrice', 0) or info.get('regularMarketPrice', 0)
            
            # Project FCF for specified years
            projected_fcf = []
            growth_rates = []
            
            for year in range(1, years_to_project + 1):
                # Declining growth rate over time (more realistic)
                year_growth = growth_rate * (0.9 ** (year - 1))
                growth_rates.append(year_growth)
                fcf = current_fcf * ((1 + year_growth) ** year)
                projected_fcf.append(fcf)
            
            # Terminal value calculation
            terminal_fcf = projected_fcf[-1] * (1 + terminal_growth_rate)
            terminal_value = terminal_fcf / (discount_rate - terminal_growth_rate)
            
            # Discount to present value
            pv_fcf = []
            for year, fcf in enumerate(projected_fcf, 1):
                pv = fcf / ((1 + discount_rate) ** year)
                pv_fcf.append(pv)
            
            pv_terminal = terminal_value / ((1 + discount_rate) ** years_to_project)
            
            # Enterprise and equity value
            enterprise_value = sum(pv_fcf) + pv_terminal
            equity_value = enterprise_value + total_cash - total_debt
            intrinsic_value_per_share = equity_value / shares_outstanding
            
            # Calculate margins and ratios
            fcf_margin = (current_fcf / (custom_data.revenue if custom_data and custom_data.revenue else info.get('totalRevenue', current_fcf))) * 100 if (custom_data and custom_data.revenue) or info.get('totalRevenue') else 0
            fcf_yield = (current_fcf / info.get('marketCap', enterprise_value)) * 100 if info.get('marketCap') else 0
            
            upside = ((intrinsic_value_per_share - current_price) / current_price) * 100 if current_price > 0 else 0
            
            return {
                'symbol': symbol,
                'valuation_method': 'Free Cash Flow (FCF)',
                'current_price': current_price,
                'intrinsic_value': intrinsic_value_per_share,
                'upside_percentage': upside,
                'enterprise_value': enterprise_value,
                'equity_value': equity_value,
                'terminal_value': terminal_value,
                'current_fcf': current_fcf,
                'projected_fcf': projected_fcf,
                'pv_fcf': pv_fcf,
                'pv_terminal': pv_terminal,
                'fcf_margin': fcf_margin,
                'fcf_yield': fcf_yield,
                'growth_rates_used': growth_rates,
                'assumptions': {
                    'years_projected': years_to_project,
                    'initial_growth_rate': growth_rate,
                    'discount_rate': discount_rate,
                    'terminal_growth_rate': terminal_growth_rate,
                    'shares_outstanding': shares_outstanding,
                    'total_cash': total_cash,
                    'total_debt': total_debt
                },
                'confidence_level': self._get_confidence_level(upside),
                'data_source': 'custom' if custom_data else 'yahoo_finance'
            }
            
        except Exception as e:
            logger.error(f"FCF valuation error for {symbol}: {e}")
            raise HTTPException(status_code=500, detail=f"FCF valuation failed: {str(e)}")
    
    def get_financial_data_template(self, symbol: str):
        """Get financial data template with current values for user editing"""
        try:
            data = self.get_stock_data(symbol)
            info = data['info']
            financials = data['financials']
            balance_sheet = data['balance_sheet']
            cashflow = data['cashflow']
            
            # Extract current financial data
            template = {
                'symbol': symbol,
                'revenue': info.get('totalRevenue'),
                'operating_income': financials.loc['Operating Income'].iloc[0] if not financials.empty and 'Operating Income' in financials.index else None,
                'net_income': info.get('netIncomeToCommon'),
                'total_assets': balance_sheet.loc['Total Assets'].iloc[0] if not balance_sheet.empty and 'Total Assets' in balance_sheet.index else None,
                'total_debt': info.get('totalDebt'),
                'cash_and_equivalents': info.get('totalCash'),
                'shares_outstanding': info.get('sharesOutstanding') or info.get('impliedSharesOutstanding'),
                'capex': cashflow.loc['Capital Expenditures'].iloc[0] if not cashflow.empty and 'Capital Expenditures' in cashflow.index else None,
                'working_capital_change': None,  # Calculated field
                'tax_rate': info.get('effectiveForwardTaxRate', 0.21),  # Default 21%
                'depreciation': cashflow.loc['Depreciation'].iloc[0] if not cashflow.empty and 'Depreciation' in cashflow.index else None
            }
            
            # Remove None values and format
            formatted_template = {}
            for key, value in template.items():
                if value is not None:
                    if isinstance(value, (int, float)) and key != 'symbol':
                        formatted_template[key] = float(value)
                    else:
                        formatted_template[key] = value
                else:
                    formatted_template[key] = None
            
            return formatted_template
            
        except Exception as e:
            logger.error(f"Error getting financial template for {symbol}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to get financial template: {str(e)}")
    
    def calculate_financial_ratios(self, symbol: str, fcf_result: dict, custom_data: UserFinancialData = None):
        """Calculate comprehensive financial ratios"""
        try:
            data = self.get_stock_data(symbol)
            info = data['info']
            
            # Use custom data if provided, otherwise get from Yahoo Finance
            if custom_data:
                revenue = custom_data.revenue or 0
                net_income = custom_data.net_income or 0
                total_assets = custom_data.total_assets or 0
                total_debt = custom_data.total_debt or 0
                cash = custom_data.cash_and_equivalents or 0
                shares = custom_data.shares_outstanding or 1
            else:
                revenue = info.get('totalRevenue', 0)
                net_income = info.get('netIncomeToCommon', 0)
                total_assets = info.get('totalAssets', 0)
                total_debt = info.get('totalDebt', 0)
                cash = info.get('totalCash', 0)
                shares = info.get('sharesOutstanding', 1) or info.get('impliedSharesOutstanding', 1)
            
            # Basic calculations
            market_cap = fcf_result['current_price'] * shares
            book_value = total_assets - total_debt
            current_fcf = fcf_result['current_fcf']
            enterprise_value = fcf_result['enterprise_value']
            
            # Financial Ratios
            ratios = {
                'profitability_ratios': {
                    'roe': (net_income / book_value) * 100 if book_value > 0 else 0,  # Return on Equity
                    'roa': (net_income / total_assets) * 100 if total_assets > 0 else 0,  # Return on Assets
                    'fcf_margin': (current_fcf / revenue) * 100 if revenue > 0 else 0,  # FCF Margin
                    'net_margin': (net_income / revenue) * 100 if revenue > 0 else 0  # Net Profit Margin
                },
                'leverage_ratios': {
                    'debt_to_equity': total_debt / book_value if book_value > 0 else 0,
                    'debt_to_assets': total_debt / total_assets if total_assets > 0 else 0,
                    'interest_coverage': net_income / (total_debt * 0.05) if total_debt > 0 else 0  # Assuming 5% interest rate
                },
                'valuation_ratios': {
                    'pe_ratio': market_cap / net_income if net_income > 0 else 0,
                    'pb_ratio': market_cap / book_value if book_value > 0 else 0,
                    'ps_ratio': market_cap / revenue if revenue > 0 else 0,
                    'ev_to_fcf': enterprise_value / current_fcf if current_fcf > 0 else 0,
                    'price_to_fcf': fcf_result['current_price'] / (current_fcf / shares) if current_fcf > 0 else 0,
                    'fcf_yield': (current_fcf / market_cap) * 100 if market_cap > 0 else 0
                },
                'per_share_metrics': {
                    'fcf_per_share': current_fcf / shares,
                    'book_value_per_share': book_value / shares,
                    'revenue_per_share': revenue / shares,
                    'eps': net_income / shares
                },
                'growth_metrics': {
                    'fcf_growth_rate': fcf_result['assumptions']['initial_growth_rate'] * 100,
                    'terminal_growth_rate': fcf_result['assumptions']['terminal_growth_rate'] * 100,
                    'implied_growth_5y': ((fcf_result['projected_fcf'][-1] / current_fcf) ** (1/5) - 1) * 100
                }
            }
            
            return ratios
            
        except Exception as e:
            logger.error(f"Error calculating financial ratios for {symbol}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to calculate financial ratios: {str(e)}")
    
    def monte_carlo_simulation(self, symbol: str, scenarios: int = 1000, custom_data: UserFinancialData = None):
        """Run Monte Carlo simulation for valuation uncertainty"""
        try:
            import random
            
            results = []
            base_params = {
                'growth_rate': 0.05,
                'discount_rate': 0.10,
                'terminal_growth_rate': 0.03
            }
            
            for _ in range(scenarios):
                # Randomize parameters within reasonable ranges
                growth_rate = random.normalvariate(base_params['growth_rate'], 0.02)  # ±2% std dev
                discount_rate = random.normalvariate(base_params['discount_rate'], 0.015)  # ±1.5% std dev  
                terminal_growth = random.normalvariate(base_params['terminal_growth_rate'], 0.01)  # ±1% std dev
                
                # Ensure reasonable bounds
                growth_rate = max(0.01, min(0.15, growth_rate))
                discount_rate = max(0.05, min(0.20, discount_rate))
                terminal_growth = max(0.01, min(0.05, terminal_growth))
                
                try:
                    result = self.calculate_fcf_valuation(
                        symbol, 5, growth_rate, discount_rate, terminal_growth, custom_data
                    )
                    results.append({
                        'intrinsic_value': result['intrinsic_value'],
                        'upside_percentage': result['upside_percentage'],
                        'growth_rate': growth_rate,
                        'discount_rate': discount_rate,
                        'terminal_growth_rate': terminal_growth
                    })
                except:
                    continue
            
            if not results:
                raise ValueError("No valid simulation results")
            
            # Calculate statistics
            valuations = [r['intrinsic_value'] for r in results]
            upsides = [r['upside_percentage'] for r in results]
            
            return {
                'symbol': symbol,
                'simulation_count': len(results),
                'statistics': {
                    'mean_valuation': np.mean(valuations),
                    'median_valuation': np.median(valuations),
                    'std_valuation': np.std(valuations),
                    'min_valuation': np.min(valuations),
                    'max_valuation': np.max(valuations),
                    'percentile_5': np.percentile(valuations, 5),
                    'percentile_95': np.percentile(valuations, 95),
                    'mean_upside': np.mean(upsides),
                    'probability_positive': sum(1 for u in upsides if u > 0) / len(upsides) * 100
                },
                'results': results[:100]  # Return first 100 for analysis
            }
            
        except Exception as e:
            logger.error(f"Monte Carlo simulation error for {symbol}: {e}")
            raise HTTPException(status_code=500, detail=f"Monte Carlo simulation failed: {str(e)}")
    
    def _generate_technical_signals(self, current_price, sma_20, sma_50, rsi, macd, bb_upper, bb_lower):
        """Generate buy/sell signals based on technical indicators"""
        signals = []
        
        # Moving average signals
        if current_price > sma_20 > sma_50:
            signals.append({"type": "BUY", "indicator": "MA", "description": "Price above rising moving averages"})
        elif current_price < sma_20 < sma_50:
            signals.append({"type": "SELL", "indicator": "MA", "description": "Price below falling moving averages"})
        
        # RSI signals
        if rsi < 30:
            signals.append({"type": "BUY", "indicator": "RSI", "description": "Oversold condition"})
        elif rsi > 70:
            signals.append({"type": "SELL", "indicator": "RSI", "description": "Overbought condition"})
        
        # MACD signals
        if macd > 0:
            signals.append({"type": "BUY", "indicator": "MACD", "description": "Bullish momentum"})
        else:
            signals.append({"type": "SELL", "indicator": "MACD", "description": "Bearish momentum"})
        
        # Bollinger Band signals
        if current_price < bb_lower:
            signals.append({"type": "BUY", "indicator": "BB", "description": "Price near lower Bollinger Band"})
        elif current_price > bb_upper:
            signals.append({"type": "SELL", "indicator": "BB", "description": "Price near upper Bollinger Band"})
        
        return signals

# Initialize service
valuation_service = StockValuationService()

# API Endpoints
@app.get("/")
async def root():
    return {"message": "Stock Valuation API", "version": "1.0.0", "features": ["DCF Analysis", "Comparable Analysis", "Technical Analysis"]}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "environment": APP_ENV,
        "database": "postgresql" if getattr(db, "USE_POSTGRES", False) else "sqlite",
    }

@app.get("/ai-metrics")
async def ai_efficiency_metrics():
    """Get AI efficiency metrics for testing and optimization."""
    return get_efficiency_report()

@app.get("/search")
async def search_stocks(
    query: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(10, ge=1, le=50)
):
    """Search stocks by company name or keyword"""
    if not query.strip():
        raise HTTPException(status_code=400, detail="Query is required")

    try:
        url = "https://query1.finance.yahoo.com/v1/finance/search"
        params = {
            "q": query.strip(),
            "quotesCount": limit,
            "newsCount": 0,
            "listsCount": 0,
            "enableFuzzyQuery": "true",
        }
        headers = {
            "User-Agent": "Mozilla/5.0 (StockValuationApp)"
        }
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        results = []
        for item in data.get("quotes", []):
            if item.get("quoteType") != "EQUITY":
                continue
            results.append({
                "symbol": item.get("symbol"),
                "shortname": item.get("shortname") or item.get("longname"),
                "longname": item.get("longname") or item.get("shortname"),
                "exchange": item.get("exchange"),
                "quote_type": item.get("quoteType"),
            })

        return {"query": query, "results": results}
    except Exception as e:
        logger.error(f"Search error for query '{query}': {e}")
        return {"query": query, "results": [], "error": "Search unavailable"}

@app.get("/stock/{symbol}")
async def get_stock_info(symbol: str):
    """Get basic stock information"""
    try:
        symbol_upper = symbol.upper()
        
        # Check if it's an NGX stock
        if '.NG' in symbol_upper or symbol_upper in ['DANGCEM', 'MTNN', 'GTCO', 'ZENITHBANK', 'NESTLE', 'BUACEMENT', 'NB', 'SEPLAT', 'AIRTELAFRI', 'FBNH', 'ACCESSCORP']:
            # Add .NG suffix if not present
            if '.NG' not in symbol_upper:
                symbol_upper = f"{symbol_upper}.NG"
            
            # Try multiple providers for NGX stocks
            errors = []
            
            # 1. Try Alpha Vantage
            if alpha_vantage.api_key and alpha_vantage.api_key != 'demo':
                try:
                    logger.info(f"Trying Alpha Vantage for {symbol_upper}")
                    av_data = alpha_vantage.get_stock_info(symbol_upper)
                    return {
                        "symbol": av_data['symbol'],
                        "company_name": av_data['company_name'],
                        "current_price": av_data['current_price'],
                        "market_cap": av_data.get('market_cap', 0),
                        "pe_ratio": av_data.get('pe_ratio', 0),
                        "sector": av_data.get('sector', 'N/A'),
                        "industry": av_data.get('industry', 'N/A'),
                        "dividend_yield": av_data.get('dividend_yield', 0),
                        "52_week_high": av_data.get('52_week_high', 0),
                        "52_week_low": av_data.get('52_week_low', 0),
                        "beta": av_data.get('beta', 0),
                        "volume": av_data.get('volume', 0),
                        "avg_volume": av_data.get('volume', 0),
                        "data_source": "Alpha Vantage"
                    }
                except Exception as av_error:
                    errors.append(f"Alpha Vantage: {str(av_error)[:50]}")
            else:
                errors.append("Alpha Vantage: No API key configured")
            
            # 2. Try Twelve Data
            if twelve_data.api_key and twelve_data.api_key != 'demo':
                try:
                    logger.info(f"Trying Twelve Data for {symbol_upper}")
                    td_data = twelve_data.get_stock_info(symbol_upper)
                    return {
                        "symbol": td_data['symbol'],
                        "company_name": td_data['company_name'],
                        "current_price": td_data['current_price'],
                        "market_cap": td_data.get('market_cap', 0),
                        "pe_ratio": td_data.get('pe_ratio', 0),
                        "sector": td_data.get('sector', 'N/A'),
                        "industry": td_data.get('industry', 'N/A'),
                        "dividend_yield": td_data.get('dividend_yield', 0),
                        "52_week_high": td_data.get('52_week_high', 0),
                        "52_week_low": td_data.get('52_week_low', 0),
                        "beta": td_data.get('beta', 0),
                        "volume": td_data.get('volume', 0),
                        "avg_volume": td_data.get('volume', 0),
                        "data_source": "Twelve Data"
                    }
                except Exception as td_error:
                    errors.append(f"Twelve Data: {str(td_error)[:50]}")
            else:
                errors.append("Twelve Data: No API key configured")
            
            # All providers failed
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "NGX_NOT_SUPPORTED",
                    "message": f"Nigerian Stock Exchange (NGX) stocks like {symbol_upper} are not available through any configured provider. Tested providers: {', '.join(errors)}",
                    "suggestion": "NGX stocks require special data access. Options: 1) Get API key from Alpha Vantage or Twelve Data and add to .env, 2) Contact NGX directly for official API (info@ngxgroup.com), 3) Use Nigerian fintech APIs (Mono, Okra)",
                    "symbol": symbol_upper,
                    "tested_providers": errors
                }
            )
        
        data = valuation_service.get_stock_data(symbol_upper)
        info = data['info']
        
        # Check if we got valid data
        if not info.get('longName') and not info.get('shortName'):
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "STOCK_NOT_FOUND",
                    "message": f"Stock symbol '{symbol_upper}' not found or has no available data.",
                    "suggestion": "Please verify the stock symbol and try again.",
                    "symbol": symbol_upper
                }
            )
        
        return {
            "symbol": symbol_upper,
            "company_name": info.get('longName', info.get('shortName', 'N/A')),
            "current_price": info.get('currentPrice', info.get('regularMarketPrice', 0)),
            "market_cap": info.get('marketCap', 0),
            "pe_ratio": info.get('trailingPE', 0),
            "sector": info.get('sector', 'N/A'),
            "industry": info.get('industry', 'N/A'),
            "dividend_yield": info.get('dividendYield', 0),
            "52_week_high": info.get('fiftyTwoWeekHigh', 0),
            "52_week_low": info.get('fiftyTwoWeekLow', 0),
            "beta": info.get('beta', 0),
            "volume": info.get('volume', 0),
            "avg_volume": info.get('averageVolume', 0)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching stock info for {symbol}: {e}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": "FETCH_ERROR",
                "message": f"Unable to fetch data for '{symbol}': {str(e)}",
                "symbol": symbol.upper()
            }
        )

@app.post("/valuation/dcf")
async def calculate_dcf(params: DCFParams):
    """Perform DCF valuation analysis"""
    result = valuation_service.calculate_dcf_valuation(
        params.symbol.upper(),
        params.growth_rate,
        params.discount_rate,
        params.terminal_growth_rate
    )
    return result

@app.get("/valuation/comparable/{symbol}")
async def calculate_comparable_valuation(symbol: str, peers: Optional[str] = None):
    """Perform comparable company analysis"""
    peer_list = peers.split(',') if peers else None
    result = valuation_service.calculate_comparable_analysis(symbol.upper(), peer_list)
    return result

@app.get("/analysis/technical/{symbol}")
async def get_technical_analysis(symbol: str, period: str = "1y"):
    """Get technical analysis indicators"""
    result = valuation_service.calculate_technical_indicators(symbol.upper(), period)
    return result

@app.get("/analysis/price-eps/{symbol}")
async def get_price_eps_series(symbol: str, period: str = "1y"):
    """Get daily price and EPS series for visualization"""
    result = valuation_service.get_price_eps_series(symbol.upper(), period)
    return result

@app.get("/analysis/financial-growth/{symbol}")
async def get_financial_growth(symbol: str, period: str = "1y"):
    """Get growth metrics for revenue, earnings, price, EPS, and debt to equity"""
    result = valuation_service.get_financial_growth_metrics(symbol.upper(), period)
    return result

@app.get("/analysis/comprehensive/{symbol}")
async def get_comprehensive_analysis(symbol: str):
    """Get comprehensive valuation analysis (DCF + Comparable + Technical)"""
    try:
        # Get all three analyses
        dcf_result = valuation_service.calculate_dcf_valuation(symbol.upper())
        comp_result = valuation_service.calculate_comparable_analysis(symbol.upper())
        tech_result = valuation_service.calculate_technical_indicators(symbol.upper())
        
        # Combine results
        return {
            "symbol": symbol.upper(),
            "timestamp": datetime.now().isoformat(),
            "current_price": dcf_result['current_price'],
            "valuations": {
                "dcf": {
                    "intrinsic_value": dcf_result['intrinsic_value'],
                    "upside": dcf_result['upside_percentage'],
                    "confidence": dcf_result['confidence_level']
                },
                "comparable": {
                    "average_valuation": comp_result['average_valuation'],
                    "upside": comp_result['upside_percentage'],
                    "confidence": comp_result['confidence_level']
                }
            },
            "technical_analysis": {
                "signals": tech_result['signals'],
                "rsi": tech_result['momentum_indicators']['rsi'],
                "support": tech_result['support_resistance']['support'],
                "resistance": tech_result['support_resistance']['resistance']
            },
            "recommendation": get_overall_recommendation(dcf_result, comp_result, tech_result)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comprehensive analysis failed: {str(e)}")

def get_overall_recommendation(dcf_result, comp_result, tech_result):
    """Generate overall buy/hold/sell recommendation"""
    dcf_upside = dcf_result['upside_percentage']
    comp_upside = comp_result['upside_percentage']
    
    # Count buy signals from technical analysis
    buy_signals = sum(1 for signal in tech_result['signals'] if signal['type'] == 'BUY')
    sell_signals = sum(1 for signal in tech_result['signals'] if signal['type'] == 'SELL')
    
    # Average fundamental upside
    avg_upside = (dcf_upside + comp_upside) / 2
    
    # Generate recommendation
    if avg_upside > 15 and buy_signals >= sell_signals:
        return {"action": "BUY", "confidence": "High", "reasoning": "Strong fundamental value with positive technical signals"}
    elif avg_upside > 5 and buy_signals > sell_signals:
        return {"action": "BUY", "confidence": "Medium", "reasoning": "Moderate upside potential with technical support"}
    elif avg_upside < -15 or sell_signals > buy_signals + 1:
        return {"action": "SELL", "confidence": "High", "reasoning": "Overvalued with negative technical signals"}
    elif avg_upside < -5:
        return {"action": "SELL", "confidence": "Medium", "reasoning": "Limited upside potential"}
    else:
        return {"action": "HOLD", "confidence": "Medium", "reasoning": "Fair valuation with mixed signals"}

# New endpoints for FCF valuation and user financial data

@app.post("/valuation/fcf")
async def calculate_fcf_valuation(params: FCFValuationParams):
    """Perform Free Cash Flow valuation with optional custom financial data"""
    result = valuation_service.calculate_fcf_valuation(
        params.symbol.upper(),
        params.years_to_project,
        params.growth_rate,
        params.discount_rate,
        params.terminal_growth_rate,
        params.custom_data
    )
    return result

@app.get("/financial-template/{symbol}")
async def get_financial_template(symbol: str):
    """Get financial data template for user editing"""
    template = valuation_service.get_financial_data_template(symbol.upper())
    return {
        "symbol": symbol.upper(),
        "template": template,
        "description": {
            "revenue": "Total annual revenue/sales",
            "operating_income": "Earnings before interest and taxes (EBIT)",
            "net_income": "Net income after all expenses and taxes",
            "total_assets": "Total assets on balance sheet",
            "total_debt": "Total debt (short-term + long-term)",
            "cash_and_equivalents": "Cash and cash equivalents",
            "shares_outstanding": "Number of shares outstanding",
            "capex": "Capital expenditures (negative number)",
            "working_capital_change": "Change in working capital (optional)",
            "tax_rate": "Effective tax rate (as decimal, e.g., 0.21 for 21%)",
            "depreciation": "Depreciation and amortization expense"
        }
    }

@app.post("/analysis/scenario")
async def scenario_analysis(symbol: str, scenarios: List[FCFValuationParams]):
    """Run multiple valuation scenarios with different assumptions"""
    results = []
    
    for i, scenario in enumerate(scenarios):
        scenario.symbol = symbol.upper()
        result = valuation_service.calculate_fcf_valuation(
            scenario.symbol,
            scenario.years_to_project,
            scenario.growth_rate,
            scenario.discount_rate,
            scenario.terminal_growth_rate,
            scenario.custom_data
        )
        result['scenario_name'] = f"Scenario {i+1}"
        results.append(result)
    
    # Calculate scenario statistics
    valuations = [r['intrinsic_value'] for r in results]
    upsides = [r['upside_percentage'] for r in results]
    
    return {
        "symbol": symbol.upper(),
        "scenarios": results,
        "statistics": {
            "avg_valuation": np.mean(valuations),
            "min_valuation": np.min(valuations),
            "max_valuation": np.max(valuations),
            "std_valuation": np.std(valuations),
            "avg_upside": np.mean(upsides),
            "min_upside": np.min(upsides),
            "max_upside": np.max(upsides)
        }
    }

@app.get("/analysis/sensitivity/{symbol}")
async def sensitivity_analysis(symbol: str, base_growth: float = 0.05, base_discount: float = 0.10):
    """Perform sensitivity analysis on growth rate and discount rate"""
    results = []
    
    # Growth rate variations: -2%, -1%, base, +1%, +2%
    growth_variations = [base_growth - 0.02, base_growth - 0.01, base_growth, base_growth + 0.01, base_growth + 0.02]
    # Discount rate variations: -1%, -0.5%, base, +0.5%, +1%
    discount_variations = [base_discount - 0.01, base_discount - 0.005, base_discount, base_discount + 0.005, base_discount + 0.01]
    
    for growth in growth_variations:
        for discount in discount_variations:
            try:
                result = valuation_service.calculate_fcf_valuation(
                    symbol.upper(), 5, growth, discount, 0.03
                )
                results.append({
                    'growth_rate': growth,
                    'discount_rate': discount,
                    'intrinsic_value': result['intrinsic_value'],
                    'upside_percentage': result['upside_percentage']
                })
            except:
                continue
    
    return {
        "symbol": symbol.upper(),
        "base_assumptions": {"growth_rate": base_growth, "discount_rate": base_discount},
        "sensitivity_matrix": results
    }

@app.get("/analysis/ratios/{symbol}")
async def get_financial_ratios(symbol: str, custom_data: UserFinancialData = None):
    """Get comprehensive financial ratios analysis"""
    try:
        # First get a base FCF valuation
        fcf_result = valuation_service.calculate_fcf_valuation(symbol.upper())
        ratios = valuation_service.calculate_financial_ratios(symbol.upper(), fcf_result, custom_data)
        
        return {
            "symbol": symbol.upper(),
            "financial_ratios": ratios,
            "valuation_context": {
                "current_price": fcf_result['current_price'],
                "intrinsic_value": fcf_result['intrinsic_value'],
                "enterprise_value": fcf_result['enterprise_value']
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analysis/monte-carlo/{symbol}")
async def run_monte_carlo(symbol: str, scenarios: int = 1000, custom_data: UserFinancialData = None):
    """Run Monte Carlo simulation for valuation uncertainty analysis"""
    if scenarios > 5000:
        raise HTTPException(status_code=400, detail="Maximum 5000 scenarios allowed")
    
    try:
        result = valuation_service.monte_carlo_simulation(symbol.upper(), scenarios, custom_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analysis/stress-test/{symbol}")  
async def stress_test_valuation(symbol: str):
    """Stress test valuation under different market conditions"""
    try:
        stress_scenarios = [
            {"name": "Base Case", "growth": 0.05, "discount": 0.10, "terminal": 0.03},
            {"name": "Recession", "growth": -0.02, "discount": 0.15, "terminal": 0.01},
            {"name": "High Inflation", "growth": 0.03, "discount": 0.13, "terminal": 0.02},
            {"name": "Market Crash", "growth": -0.05, "discount": 0.18, "terminal": 0.01},
            {"name": "Economic Boom", "growth": 0.10, "discount": 0.08, "terminal": 0.04},
            {"name": "Interest Rate Spike", "growth": 0.04, "discount": 0.16, "terminal": 0.025}
        ]
        
        results = []
        for scenario in stress_scenarios:
            try:
                result = valuation_service.calculate_fcf_valuation(
                    symbol.upper(), 
                    5, 
                    scenario["growth"], 
                    scenario["discount"], 
                    scenario["terminal"]
                )
                results.append({
                    "scenario_name": scenario["name"],
                    "assumptions": scenario,
                    "intrinsic_value": result['intrinsic_value'],
                    "upside_percentage": result['upside_percentage'],
                    "confidence_level": result['confidence_level']
                })
            except:
                continue
        
        if not results:
            raise ValueError("No valid stress test results")
        
        # Calculate stress test statistics
        valuations = [r['intrinsic_value'] for r in results]
        upsides = [r['upside_percentage'] for r in results]
        
        return {
            "symbol": symbol.upper(),
            "stress_test_results": results,
            "summary": {
                "worst_case_valuation": min(valuations),
                "best_case_valuation": max(valuations),
                "average_valuation": np.mean(valuations),
                "worst_case_upside": min(upsides),
                "best_case_upside": max(upsides),
                "scenarios_with_positive_upside": sum(1 for u in upsides if u > 0),
                "downside_risk": abs(min(upsides)) if min(upsides) < 0 else 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analysis/peer-comparison/{symbol}")
async def advanced_peer_comparison(symbol: str, include_ratios: bool = True):
    """Advanced peer comparison with financial ratios"""
    try:
        # Get base company data
        base_data = valuation_service.get_stock_data(symbol.upper())
        sector = base_data['info'].get('sector', '')
        
        # Define sector peers (this would ideally come from a sector database)
        sector_peers = {
            'Technology': ['AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA'],
            'Healthcare': ['JNJ', 'PFE', 'ABBV', 'MRK', 'UNH'],
            'Financial Services': ['JPM', 'BAC', 'WFC', 'C', 'GS'],
            'Consumer Cyclical': ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE'],
            'Communication Services': ['GOOGL', 'META', 'DIS', 'NFLX', 'T']
        }
        
        peers = sector_peers.get(sector, ['SPY', 'QQQ', 'DIA'])
        peers = [p for p in peers if p != symbol.upper()][:5]  # Max 5 peers
        
        comparison_results = []
        target_fcf = valuation_service.calculate_fcf_valuation(symbol.upper())
        
        for peer in peers:
            try:
                peer_fcf = valuation_service.calculate_fcf_valuation(peer)
                peer_data = {
                    'symbol': peer,
                    'intrinsic_value': peer_fcf['intrinsic_value'],
                    'current_price': peer_fcf['current_price'],
                    'upside_percentage': peer_fcf['upside_percentage'],
                    'fcf_margin': peer_fcf['fcf_margin'],
                    'fcf_yield': peer_fcf['fcf_yield']
                }
                
                if include_ratios:
                    peer_ratios = valuation_service.calculate_financial_ratios(peer, peer_fcf)
                    peer_data['ratios'] = peer_ratios
                
                comparison_results.append(peer_data)
            except:
                continue
        
        # Calculate peer averages
        if comparison_results:
            peer_avg = {
                'avg_fcf_margin': np.mean([p['fcf_margin'] for p in comparison_results]),
                'avg_fcf_yield': np.mean([p['fcf_yield'] for p in comparison_results]),
                'avg_upside': np.mean([p['upside_percentage'] for p in comparison_results]),
                'median_valuation': np.median([p['intrinsic_value'] for p in comparison_results])
            }
        else:
            peer_avg = {}
        
        return {
            "symbol": symbol.upper(),
            "sector": sector,
            "target_company": {
                "intrinsic_value": target_fcf['intrinsic_value'],
                "current_price": target_fcf['current_price'],
                "upside_percentage": target_fcf['upside_percentage'],
                "fcf_margin": target_fcf['fcf_margin'],
                "fcf_yield": target_fcf['fcf_yield']
            },
            "peer_comparison": comparison_results,
            "peer_averages": peer_avg,
            "relative_ranking": {
                "fcf_margin_percentile": sum(1 for p in comparison_results if p['fcf_margin'] < target_fcf['fcf_margin']) / len(comparison_results) * 100 if comparison_results else 0,
                "fcf_yield_percentile": sum(1 for p in comparison_results if p['fcf_yield'] < target_fcf['fcf_yield']) / len(comparison_results) * 100 if comparison_results else 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/portfolio")
async def get_portfolio(
    inflation_rate: float = Query(3.0, ge=0, le=50),
    transaction_cost_rate: float = Query(0.25, ge=0, le=10),
):
    """Get portfolio holdings with valuation, performance, risk, and real return metrics."""
    portfolio = _load_portfolio_data()
    positions_output = []
    allocation_by_sector: Dict[str, float] = {}
    allocation_by_symbol: Dict[str, float] = {}

    total_value = 0.0
    total_cost = 0.0
    total_dividends = 0.0
    total_transaction_costs = 0.0
    total_inflation_impact = 0.0
    total_return = 0.0
    total_real_profit = 0.0

    now = datetime.now()
    period_dates = {
        "monthly": now - timedelta(days=30),
        "quarterly": now - timedelta(days=90),
        "ytd": datetime(now.year, 1, 1),
    }
    period_current = {key: 0.0 for key in period_dates}
    period_start = {key: 0.0 for key in period_dates}

    volatility_weighted = 0.0
    volatility_weight_sum = 0.0
    drawdown_weighted = 0.0

    transactions_by_symbol: Dict[str, List[Dict[str, Any]]] = {}
    try:
        for txn in db.get_transactions(1):
            txn_symbol = (txn.get("symbol") or "").upper()
            if txn_symbol:
                transactions_by_symbol.setdefault(txn_symbol, []).append(txn)
    except Exception as exc:
        logger.warning("Unable to load transaction history for portfolio adjustments: %s", exc)

    for position in portfolio.positions:
        symbol = position.symbol.upper()
        try:
            data = valuation_service.get_stock_data(symbol, period="1y")
            info = data.get("info", {})
            history = data.get("history")
        except Exception as exc:
            logger.warning(
                "Portfolio data fetch failed for %s, using fallback values: %s",
                symbol,
                exc,
            )
            info = {"sector": "Unknown"}
            history = None

        current_price = info.get("currentPrice") or info.get("regularMarketPrice")
        if not current_price and history is not None and not history.empty:
            current_price = float(history["Close"].iloc[-1])

        current_price = float(current_price or position.cost_basis or 0)
        market_value = position.shares * current_price
        cost_value = position.shares * position.cost_basis
        profit = market_value - cost_value
        profit_pct = (profit / cost_value * 100) if cost_value > 0 else 0
        sector = info.get("sector", "Unknown") or "Unknown"

        symbol_transactions = transactions_by_symbol.get(symbol, [])
        buy_dates = [t.get("date") for t in symbol_transactions if t.get("action") == "buy" and t.get("date")]
        purchase_date = min(buy_dates) if buy_dates else portfolio.last_updated
        holding_period_years = calculate_holding_period_years(buy_dates, default_years=1.0)

        explicit_transaction_costs = sum(
            float(t.get("fee", 0) or t.get("transactionCost", 0) or 0)
            for t in symbol_transactions
        )

        dividends_series = None
        try:
            dividends_series = yf.Ticker(symbol).dividends
        except Exception:
            dividends_series = None

        dividend_income = estimate_dividend_income(
            dividends_series,
            position.shares,
            purchase_date=purchase_date,
            fallback_annual_dividend=float(info.get("dividendRate") or 0),
            holding_period_years=holding_period_years,
        )

        return_metrics = calculate_investor_returns(
            shares=position.shares,
            purchase_price=position.cost_basis,
            current_price=current_price,
            total_dividends=dividend_income,
            holding_period_years=holding_period_years,
            inflation_rate_pct=inflation_rate,
            transaction_cost_rate_pct=transaction_cost_rate,
            explicit_transaction_costs=explicit_transaction_costs if explicit_transaction_costs > 0 else None,
        )

        positions_output.append({
            "symbol": symbol,
            "shares": position.shares,
            "cost_basis": position.cost_basis,
            "current_price": current_price,
            "market_value": market_value,
            "cost_value": cost_value,
            "profit": profit,
            "profit_pct": profit_pct,
            "sector": sector,
            "quantity": position.shares,
            "purchase_price": position.cost_basis,
            "current_value": market_value,
            "return_pct": return_metrics["total_return_pct"],
            "capital_gain": return_metrics["capital_gain"],
            "dividend_income": return_metrics["dividend_income"],
            "transaction_costs": return_metrics["transaction_costs"],
            "total_return": return_metrics["total_return"],
            "total_return_pct": return_metrics["total_return_pct"],
            "inflation_impact": return_metrics["inflation_impact"],
            "real_return": return_metrics["real_return"],
            "real_return_pct": return_metrics["real_return_pct"],
            "holding_period_years": return_metrics["holding_period_years"],
        })

        total_value += market_value
        total_cost += cost_value
        total_dividends += return_metrics["dividend_income"]
        total_transaction_costs += return_metrics["transaction_costs"]
        total_inflation_impact += return_metrics["inflation_impact"]
        total_return += return_metrics["total_return"]
        total_real_profit += return_metrics["real_return"]

        allocation_by_sector[sector] = allocation_by_sector.get(sector, 0.0) + market_value
        allocation_by_symbol[symbol] = allocation_by_symbol.get(symbol, 0.0) + market_value

        for key, start_date in period_dates.items():
            period_current[key] += market_value
            start_price = _get_price_on_or_after(history, start_date) if history is not None else None
            if start_price is None:
                period_start[key] += market_value
            else:
                period_start[key] += position.shares * start_price

        if history is not None and not history.empty:
            returns = history["Close"].pct_change().dropna()
            if not returns.empty:
                annualized_vol = float(returns.std() * np.sqrt(252))
                weight = market_value
                volatility_weighted += annualized_vol * weight
                volatility_weight_sum += weight

                rolling_max = history["Close"].cummax()
                drawdown = (history["Close"] / rolling_max - 1).min()
                drawdown_weighted += float(drawdown) * weight

    total_equity = total_value + portfolio.cash
    total_profit = total_value - total_cost
    total_profit_pct = (total_profit / total_cost * 100) if total_cost > 0 else 0
    total_return_pct = (total_return / total_cost * 100) if total_cost > 0 else 0
    total_real_profit_pct = (total_real_profit / total_cost * 100) if total_cost > 0 else 0

    best_performer = None
    worst_performer = None
    if positions_output:
        best_performer = max(positions_output, key=lambda item: item.get("real_return_pct", item["profit_pct"]))
        worst_performer = min(positions_output, key=lambda item: item.get("real_return_pct", item["profit_pct"]))

    performance = {}
    for key in period_dates.keys():
        start_value = period_start[key]
        current_value = period_current[key]
        profit_value = current_value - start_value
        profit_pct_value = (profit_value / start_value * 100) if start_value > 0 else 0
        performance[key] = {
            "profit": profit_value,
            "profit_pct": profit_pct_value,
        }

    volatility = (volatility_weighted / volatility_weight_sum) if volatility_weight_sum > 0 else None
    avg_drawdown = (drawdown_weighted / volatility_weight_sum) if volatility_weight_sum > 0 else None

    allocation_sector_list = [
        {"name": sector, "value": (value / total_value) if total_value > 0 else 0}
        for sector, value in allocation_by_sector.items()
    ]
    allocation_symbol_list = [
        {"symbol": symbol, "value": (value / total_value) if total_value > 0 else 0}
        for symbol, value in allocation_by_symbol.items()
    ]

    return {
        "positions": positions_output,
        "cash": portfolio.cash,
        "portfolio_value": total_value,
        "total_invested": total_cost,
        "summary": {
            "total_value": total_value,
            "total_cost": total_cost,
            "total_profit": total_profit,
            "total_profit_pct": total_profit_pct,
            "total_dividends": total_dividends,
            "total_transaction_costs": total_transaction_costs,
            "total_return": total_return,
            "total_return_pct": total_return_pct,
            "total_inflation_impact": total_inflation_impact,
            "total_real_profit": total_real_profit,
            "total_real_profit_pct": total_real_profit_pct,
            "total_equity": total_equity,
            "best_performer": best_performer,
            "worst_performer": worst_performer,
        },
        "performance": performance,
        "risk": {
            "volatility": volatility,
            "risk_score": _calculate_portfolio_risk_score(volatility),
            "max_drawdown": avg_drawdown,
        },
        "allocation": {
            "by_sector": allocation_sector_list,
            "by_symbol": allocation_symbol_list,
        },
        "last_updated": portfolio.last_updated,
    }

@app.put("/portfolio")
async def update_portfolio(payload: PortfolioData):
    """Update portfolio holdings."""
    _save_portfolio_data(payload)
    return {"status": "updated", "last_updated": datetime.now().isoformat()}


@app.post("/analysis/investor-returns")
async def analyze_investor_returns(req: InvestorReturnRequest):
    """Calculate investor returns including dividends, inflation, and transaction costs."""
    if req.shares <= 0 or req.purchase_price <= 0:
        raise HTTPException(status_code=400, detail="shares and purchase_price must be positive")

    current_price = req.current_price
    holding_period_years = calculate_holding_period_years([req.purchase_date], default_years=1.0)
    total_dividends = req.total_dividends

    if req.symbol:
        try:
            ticker = yf.Ticker(req.symbol.upper())
            info = ticker.info or {}
            if current_price is None:
                current_price = info.get("currentPrice") or info.get("regularMarketPrice") or req.purchase_price
            if total_dividends is None:
                total_dividends = estimate_dividend_income(
                    ticker.dividends,
                    req.shares,
                    purchase_date=req.purchase_date,
                    fallback_annual_dividend=float(req.annual_dividend_per_share or info.get("dividendRate") or 0),
                    holding_period_years=holding_period_years,
                )
        except Exception as exc:
            logger.warning("Investor return enrichment failed for %s: %s", req.symbol, exc)

    if current_price is None:
        current_price = req.purchase_price

    if total_dividends is None:
        fallback_dividend = float(req.annual_dividend_per_share or 0) * req.shares * holding_period_years
        total_dividends = fallback_dividend

    result = calculate_investor_returns(
        shares=req.shares,
        purchase_price=req.purchase_price,
        current_price=current_price,
        total_dividends=total_dividends,
        holding_period_years=holding_period_years,
        inflation_rate_pct=req.inflation_rate_pct,
        transaction_cost_rate_pct=req.transaction_cost_rate_pct,
        fixed_transaction_cost=req.fixed_transaction_cost,
    )

    return {
        "symbol": req.symbol.upper() if req.symbol else None,
        **result,
        "inputs": {
            "shares": req.shares,
            "purchase_price": req.purchase_price,
            "current_price": current_price,
            "purchase_date": req.purchase_date,
            "inflation_rate_pct": req.inflation_rate_pct,
            "transaction_cost_rate_pct": req.transaction_cost_rate_pct,
        },
    }

@app.get("/market/ngx/summary")
async def ngx_market_summary(symbols: Optional[str] = None):
    """Get NGX market summary with gainers, losers, volume leaders, and sector performance."""
    if symbols:
        symbol_list = [_normalize_ngx_symbol(s) for s in symbols.split(",") if s.strip()]
    else:
        portfolio = _load_portfolio_data()
        symbol_list = [_normalize_ngx_symbol(pos.symbol) for pos in portfolio.positions]
        if not symbol_list:
            symbol_list = DEFAULT_NGX_SYMBOLS

    snapshots = _get_market_snapshot(symbol_list)
    gainers = sorted(snapshots, key=lambda item: item["change_pct"], reverse=True)[:5]
    losers = sorted(snapshots, key=lambda item: item["change_pct"])[:5]
    volume_leaders = sorted(snapshots, key=lambda item: item["volume"], reverse=True)[:5]

    sector_groups: Dict[str, List[float]] = {}
    for quote in snapshots:
        sector_groups.setdefault(quote["sector"], []).append(quote["change_pct"])

    sectors = [
        {
            "sector": sector,
            "avg_change_pct": float(np.mean(changes)) if changes else 0,
            "count": len(changes),
        }
        for sector, changes in sector_groups.items()
    ]
    sectors.sort(key=lambda item: item["avg_change_pct"], reverse=True)

    return {
        "quotes": snapshots,
        "index": _get_ngx_index(),
        "gainers": gainers,
        "losers": losers,
        "volume_leaders": volume_leaders,
        "sectors": sectors,
        "source_symbols": symbol_list,
        "last_updated": datetime.now().isoformat(),
    }

# Generic market endpoints for international markets
@app.get("/market/us/summary")
async def us_market_summary(symbols: Optional[str] = None):
    """Get US market summary."""
    if symbols:
        symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    else:
        symbol_list = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX"]

    snapshots = _get_market_snapshot(symbol_list)
    gainers = sorted(snapshots, key=lambda item: item["change_pct"], reverse=True)[:5]
    losers = sorted(snapshots, key=lambda item: item["change_pct"])[:5]
    volume_leaders = sorted(snapshots, key=lambda item: item["volume"], reverse=True)[:5]

    sector_groups: Dict[str, List[float]] = {}
    for quote in snapshots:
        sector_groups.setdefault(quote["sector"], []).append(quote["change_pct"])

    sectors = [
        {
            "sector": sector,
            "avg_change_pct": float(np.mean(changes)) if changes else 0,
            "count": len(changes),
        }
        for sector, changes in sector_groups.items()
    ]
    sectors.sort(key=lambda item: item["avg_change_pct"], reverse=True)

    # Get SPY as index for US markets
    try:
        spy_index = _get_ngx_index()  # Reuses existing logic but for SPY
        spy_data = valuation_service.get_stock_data("SPY")
        spy_index = {"symbol": "SPY", "name": "S&P 500", "price": spy_data["info"].get("regularMarketPrice", 0), "change_pct": spy_data["info"].get("regularMarketChangePercent", 0)}
    except:
        spy_index = None

    return {
        "quotes": snapshots,
        "index": spy_index,
        "gainers": gainers,
        "losers": losers,
        "volume_leaders": volume_leaders,
        "sectors": sectors,
        "source_symbols": symbol_list,
        "last_updated": datetime.now().isoformat(),
    }

@app.get("/market/uk/summary")
async def uk_market_summary(symbols: Optional[str] = None):
    """Get UK stock market summary."""
    if symbols:
        symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    else:
        symbol_list = ["LLOY.L", "HSBA.L", "BARX.L", "AZN.L", "SHELL.L", "GSK.L", "ULVR.L"]

    snapshots = _get_market_snapshot(symbol_list)
    gainers = sorted(snapshots, key=lambda item: item["change_pct"], reverse=True)[:5]
    losers = sorted(snapshots, key=lambda item: item["change_pct"])[:5]
    volume_leaders = sorted(snapshots, key=lambda item: item["volume"], reverse=True)[:5]

    sector_groups: Dict[str, List[float]] = {}
    for quote in snapshots:
        sector_groups.setdefault(quote["sector"], []).append(quote["change_pct"])

    sectors = [
        {"sector": sector, "avg_change_pct": float(np.mean(changes)) if changes else 0, "count": len(changes)}
        for sector, changes in sector_groups.items()
    ]

    return {
        "quotes": snapshots,
        "index": None,
        "gainers": gainers,
        "losers": losers,
        "volume_leaders": volume_leaders,
        "sectors": sectors,
        "source_symbols": symbol_list,
        "last_updated": datetime.now().isoformat(),
    }

@app.get("/market/eu/summary")
async def eu_market_summary(symbols: Optional[str] = None):
    """Get European market summary."""
    if symbols:
        symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    else:
        symbol_list = ["SAP", "SIEMENS", "BMW", "LVMH.PA", "ASML.AS", "NOVO.CO", "TEL.DE"]

    snapshots = _get_market_snapshot(symbol_list)
    gainers = sorted(snapshots, key=lambda item: item["change_pct"], reverse=True)[:5]
    losers = sorted(snapshots, key=lambda item: item["change_pct"])[:5]

    return {
        "quotes": snapshots,
        "index": None,
        "gainers": gainers,
        "losers": losers,
        "volume_leaders": sorted(snapshots, key=lambda x: x["volume"], reverse=True)[:5],
        "sectors": [],
        "source_symbols": symbol_list,
        "last_updated": datetime.now().isoformat(),
    }


# Lightweight HTML dashboard for quick local checks (mobile web fallback)
from fastapi.responses import HTMLResponse


@app.get("/world-markets", response_class=HTMLResponse)
async def world_markets_page():
        html = """
        <!doctype html>
        <html>
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <title>World Markets - Stock Valuation</title>
            <style>
                body{font-family:system-ui, -apple-system, Roboto, 'Segoe UI', Arial; background:#0b1220; color:#e6eef8;}
                .container{max-width:980px;margin:24px auto;padding:16px}
                table{width:100%;border-collapse:collapse}
                th,td{padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.04);text-align:left}
                th{color:#9fb3d9;font-size:12px;text-transform:uppercase}
                .up{color:#10b981} .down{color:#ef4444}
            </style>
        </head>
        <body>
            <div class="container">
                <h2>World Markets Snapshot</h2>
                <p id="updated">Updating...</p>
                <table>
                    <thead>
                        <tr><th>Region</th><th>Symbol</th><th>Name</th><th>Price</th><th>Change %</th></tr>
                    </thead>
                    <tbody id="rows"></tbody>
                </table>
            </div>
            <script>
                const regions = ['us','uk','eu','asia','emerging','ngx'];
                async function load(){
                    const rows = document.getElementById('rows'); rows.innerHTML='';
                    for(const r of regions){
                        try{
                            const res = await fetch(`/market/${r}/summary`);
                            if(!res.ok) continue;
                            const json = await res.json();
                            const quotes = json.quotes || [];
                            for(const q of quotes){
                                const tr = document.createElement('tr');
                                const change = (q.change_pct||0).toFixed(2);
                                tr.innerHTML = `<td>${r.toUpperCase()}</td><td>${q.symbol||''}</td><td>${q.name||''}</td><td>${(q.price||q.last_price||0).toFixed ? (q.price||q.last_price||0).toFixed(2) : (q.price||q.last_price||0)}</td><td class="${change>=0?'up':'down'}">${change}%</td>`;
                                rows.appendChild(tr);
                            }
                        }catch(e){console.warn('skip',r,e)}
                    }
                    document.getElementById('updated').textContent = 'Last updated: ' + new Date().toLocaleTimeString();
                }
                load();
                setInterval(load, 60000);
            </script>
        </body>
        </html>
        """
        return HTMLResponse(content=html, status_code=200)

@app.get("/market/asia/summary")
async def asia_market_summary(symbols: Optional[str] = None):
    """Get Asian market summary."""
    if symbols:
        symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    else:
        symbol_list = ["7203.T", "0700.HK", "BABA", "TSM", "RELIANCE.NS", "INFY.NS", "603659.SS"]

    snapshots = _get_market_snapshot(symbol_list)
    gainers = sorted(snapshots, key=lambda item: item["change_pct"], reverse=True)[:5]
    losers = sorted(snapshots, key=lambda item: item["change_pct"])[:5]

    return {
        "quotes": snapshots,
        "index": None,
        "gainers": gainers,
        "losers": losers,
        "volume_leaders": sorted(snapshots, key=lambda x: x["volume"], reverse=True)[:5],
        "sectors": [],
        "source_symbols": symbol_list,
        "last_updated": datetime.now().isoformat(),
    }

@app.get("/market/emerging/summary")
async def emerging_market_summary(symbols: Optional[str] = None):
    """Get emerging markets summary."""
    if symbols:
        symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    else:
        symbol_list = ["RELIANCE.NS", "TCS.NS", "PETR4.SA", "INFY.NS", "SSNLF", "MT.AS", "EUOF.DE"]

    snapshots = _get_market_snapshot(symbol_list)
    gainers = sorted(snapshots, key=lambda item: item["change_pct"], reverse=True)[:5]
    losers = sorted(snapshots, key=lambda item: item["change_pct"])[:5]

    return {
        "quotes": snapshots,
        "index": None,
        "gainers": gainers,
        "losers": losers,
        "volume_leaders": sorted(snapshots, key=lambda x: x["volume"], reverse=True)[:5],
        "sectors": [],
        "source_symbols": symbol_list,
        "last_updated": datetime.now().isoformat(),
    }

@app.get("/market/ngx/alerts")
async def ngx_market_alerts(symbols: Optional[str] = None, include_premium: bool = False):
    """Premium: smart alerts based on technical triggers."""
    if not include_premium:
        return {
            "locked": True,
            "message": "Premium required for alerts.",
            "alerts": [],
        }

    if symbols:
        symbol_list = [_normalize_ngx_symbol(s) for s in symbols.split(",") if s.strip()]
    else:
        portfolio = _load_portfolio_data()
        symbol_list = [_normalize_ngx_symbol(pos.symbol) for pos in portfolio.positions]
        if not symbol_list:
            symbol_list = DEFAULT_NGX_SYMBOLS

    alerts = _build_alerts(symbol_list)
    return {
        "locked": False,
        "alerts": alerts,
        "source_symbols": symbol_list,
        "last_updated": datetime.now().isoformat(),
    }

@app.get("/market/ngx/rankings")
async def ngx_market_rankings(symbols: Optional[str] = None):
    """Daily rankings for momentum, dividend, and value."""
    if symbols:
        symbol_list = [_normalize_ngx_symbol(s) for s in symbols.split(",") if s.strip()]
    else:
        symbol_list = DEFAULT_NGX_SYMBOLS

    rankings = _rank_symbols(symbol_list)
    return {
        "rankings": rankings,
        "source_symbols": symbol_list,
        "last_updated": datetime.now().isoformat(),
    }

@app.get("/valuation/intrinsic/{symbol}")
async def intrinsic_value(symbol: str):
    """Intrinsic value summary (no price prediction)."""
    try:
        raw = symbol.strip().upper()
        ngx_bases = {s.replace(".NG", "") for s in DEFAULT_NGX_SYMBOLS}
        if raw.endswith(".NG") or raw in ngx_bases:
            normalized = _normalize_ngx_symbol(raw)
        else:
            normalized = raw
        result = _calculate_intrinsic_value(normalized)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.get("/market/ngx/screener")
async def ngx_screener(
    symbols: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_change: Optional[float] = None,
    min_volume: Optional[int] = None,
    min_dividend: Optional[float] = None,
    max_pe: Optional[float] = None,
    min_score: Optional[float] = None,
    min_momentum: Optional[float] = None,
    max_volatility: Optional[float] = None,
    sector: Optional[str] = None,
    signal: Optional[str] = None,
):
    """AI-powered NGX screener with configurable filters."""
    if symbols:
        symbol_list = [_normalize_ngx_symbol(s) for s in symbols.split(",") if s.strip()]
    else:
        symbol_list = DEFAULT_NGX_SYMBOLS

    snapshot = _get_screener_snapshot(symbol_list)

    def matches(item: Dict[str, Any]) -> bool:
        if min_price is not None and item["price"] < min_price:
            return False
        if max_price is not None and item["price"] > max_price:
            return False
        if min_change is not None and item["change_pct"] < min_change:
            return False
        if min_volume is not None and item["volume"] < min_volume:
            return False
        if min_dividend is not None and item["dividend_yield"] < min_dividend:
            return False
        if max_pe is not None and item["pe_ratio"] > 0 and item["pe_ratio"] > max_pe:
            return False
        if min_score is not None and item["ai_score"] < min_score:
            return False
        if min_momentum is not None and item["momentum"] < min_momentum:
            return False
        if max_volatility is not None and item["volatility"] > max_volatility:
            return False
        if sector and item["sector"].lower() != sector.lower():
            return False
        if signal and item["signal"].lower() != signal.lower():
            return False
        return True

    filtered = [item for item in snapshot if matches(item)]
    filtered.sort(key=lambda item: item["ai_score"], reverse=True)

    return {
        "results": filtered,
        "total": len(filtered),
        "source_symbols": symbol_list,
        "last_updated": datetime.now().isoformat(),
    }

# Generic screener endpoints for international markets
@app.get("/market/us/screener")
async def us_screener(
    symbols: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_change: Optional[float] = None,
    min_volume: Optional[int] = None,
    min_dividend: Optional[float] = None,
    max_pe: Optional[float] = None,
    min_score: Optional[float] = None,
    min_momentum: Optional[float] = None,
    max_volatility: Optional[float] = None,
    sector: Optional[str] = None,
    signal: Optional[str] = None,
):
    """US stock screener with configurable filters."""
    if symbols:
        symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    else:
        symbol_list = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX", "PYPL", "SQ"]

    snapshot = _get_screener_snapshot(symbol_list)

    def matches(item: Dict[str, Any]) -> bool:
        if min_price is not None and item["price"] < min_price:
            return False
        if max_price is not None and item["price"] > max_price:
            return False
        if min_change is not None and item["change_pct"] < min_change:
            return False
        if min_volume is not None and item["volume"] < min_volume:
            return False
        if min_dividend is not None and item["dividend_yield"] < min_dividend:
            return False
        if max_pe is not None and item["pe_ratio"] > 0 and item["pe_ratio"] > max_pe:
            return False
        if min_score is not None and item["ai_score"] < min_score:
            return False
        if min_momentum is not None and item["momentum"] < min_momentum:
            return False
        if max_volatility is not None and item["volatility"] > max_volatility:
            return False
        if sector and item["sector"].lower() != sector.lower():
            return False
        if signal and item["signal"].lower() != signal.lower():
            return False
        return True

    filtered = [item for item in snapshot if matches(item)]
    filtered.sort(key=lambda item: item["ai_score"], reverse=True)

    return {
        "results": filtered,
        "total": len(filtered),
        "source_symbols": symbol_list,
        "last_updated": datetime.now().isoformat(),
    }

@app.get("/market/uk/screener")
@app.get("/market/eu/screener")
@app.get("/market/asia/screener")
@app.get("/market/emerging/screener")
async def international_screener(
    symbols: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_change: Optional[float] = None,
    min_volume: Optional[int] = None,
    min_dividend: Optional[float] = None,
    max_pe: Optional[float] = None,
    min_score: Optional[float] = None,
    min_momentum: Optional[float] = None,
    max_volatility: Optional[float] = None,
    sector: Optional[str] = None,
    signal: Optional[str] = None,
):
    """International stock screener with configurable filters."""
    if symbols:
        symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    else:
        symbol_list = ["LLOY.L", "HSBA.L", "BARX.L", "AZN.L", "SAP", "BMW"]

    snapshot = _get_screener_snapshot(symbol_list)

    def matches(item: Dict[str, Any]) -> bool:
        if min_price is not None and item["price"] < min_price:
            return False
        if max_price is not None and item["price"] > max_price:
            return False
        if min_change is not None and item["change_pct"] < min_change:
            return False
        if min_volume is not None and item["volume"] < min_volume:
            return False
        if min_dividend is not None and item["dividend_yield"] < min_dividend:
            return False
        if max_pe is not None and item["pe_ratio"] > 0 and item["pe_ratio"] > max_pe:
            return False
        if min_score is not None and item["ai_score"] < min_score:
            return False
        if min_momentum is not None and item["momentum"] < min_momentum:
            return False
        if max_volatility is not None and item["volatility"] > max_volatility:
            return False
        if sector and item["sector"].lower() != sector.lower():
            return False
        if signal and item["signal"].lower() != signal.lower():
            return False
        return True

    filtered = [item for item in snapshot if matches(item)]
    filtered.sort(key=lambda item: item["ai_score"], reverse=True)

    return {
        "results": filtered,
        "total": len(filtered),
        "source_symbols": symbol_list,
        "last_updated": datetime.now().isoformat(),
    }

@app.get("/smart-strategy")
async def get_smart_strategy(symbols: Optional[str] = None, include_portfolio: bool = True, include_watchlist: bool = True):
    """
    Professional hedge fund strategy: Value + Quality + Momentum + Risk.
    Returns scored stocks with BUY/HOLD/SELL recommendations.
    Integrates user's portfolio and watchlist for personalized analysis.
    Results are cached for 5 minutes per symbol set.
    """
    # Build symbol list from multiple sources
    symbol_set = set()

    if symbols:
        symbol_set.update(s.strip().upper() for s in symbols.split(",") if s.strip())

    # Add portfolio stocks
    if include_portfolio:
        try:
            portfolio_data = _load_json("portfolio.json")
            for pos in portfolio_data.get("positions", []):
                sym = pos.get("symbol", "").upper()
                if sym:
                    symbol_set.add(sym)
        except Exception:
            pass

    # If still empty, use default universe
    if not symbol_set:
        symbol_set = {
            "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA",
            "META", "TSLA", "BRK-B", "JPM", "V",
            "JNJ", "WMT", "PG", "MA", "HD",
            "BAC", "DIS", "NFLX", "KO", "CSCO"
        }

    symbol_list = sorted(symbol_set)
    results = []

    for symbol in symbol_list:
        try:
            # Check cache first
            cached = _strategy_cache_get(symbol)
            if cached:
                results.append(cached)
                continue

            stock = yf.Ticker(symbol)
            info = stock.info
            hist = stock.history(period="1y")

            if hist.empty or 'currentPrice' not in info:
                continue

            current_price = info.get('currentPrice', info.get('regularMarketPrice', 0))
            if current_price == 0:
                continue

            # Layer 1: Value Score (sector-aware)
            value_score = _calculate_value_score(info, current_price)

            # Layer 2: Quality Score (expanded)
            quality_score = _calculate_quality_score(info)

            # Layer 3: Momentum Score (with RSI)
            momentum_score = _calculate_momentum_score(hist, current_price)

            # Layer 4: Risk Score (new)
            risk_score, risk_metrics = _calculate_risk_score(hist, info)

            # Overall score (4-layer weighted)
            overall_score = (value_score * 0.30 + quality_score * 0.25
                             + momentum_score * 0.25 + risk_score * 0.20)

            # Flexible weighted recommendation
            recommendation = _get_recommendation(value_score, quality_score, momentum_score, risk_score, overall_score)

            # Confidence level
            confidence = _get_confidence_level(value_score, quality_score, momentum_score, risk_score)

            # Position allocation (risk-adjusted)
            allocation = _calculate_allocation(overall_score, recommendation, risk_metrics)

            # Intrinsic value & discount
            intrinsic_value = _estimate_intrinsic_value(info, current_price)
            discount = ((intrinsic_value - current_price) / intrinsic_value * 100) if intrinsic_value > 0 else 0

            # Moving averages
            ma50 = hist['Close'].rolling(window=50).mean().iloc[-1] if len(hist) >= 50 else current_price
            ma200 = hist['Close'].rolling(window=200).mean().iloc[-1] if len(hist) >= 200 else current_price

            # Relative strength
            year_ago_price = hist['Close'].iloc[0] if len(hist) > 0 else current_price
            relative_strength = ((current_price - year_ago_price) / year_ago_price * 100) if year_ago_price > 0 else 0

            # RSI
            rsi = _calculate_rsi(hist)

            entry = {
                "symbol": symbol,
                "companyName": info.get('longName', info.get('shortName', symbol)),
                "currentPrice": round(current_price, 2),
                "valueScore": round(value_score, 0),
                "qualityScore": round(quality_score, 0),
                "momentumScore": round(momentum_score, 0),
                "riskScore": round(risk_score, 0),
                "overallScore": round(overall_score, 0),
                "recommendation": recommendation,
                "confidence": confidence,
                "allocation": allocation,
                "intrinsicValue": round(intrinsic_value, 2),
                "discountToFairValue": round(discount, 1),
                "ma50": round(ma50, 2),
                "ma200": round(ma200, 2),
                "relativeStrength": round(relative_strength, 1),
                "rsi": round(rsi, 1),
                "fcfPositive": info.get('freeCashflow', 0) > 0,
                "revenueGrowth": round(info.get('revenueGrowth', 0) * 100, 1) if info.get('revenueGrowth') else 0,
                "debtRatio": round(_calculate_debt_ratio(info), 1),
                "profitMargin": round(info.get('profitMargins', 0) * 100, 1) if info.get('profitMargins') else 0,
                "roe": round(info.get('returnOnEquity', 0) * 100, 1) if info.get('returnOnEquity') else 0,
                "currentRatio": round(info.get('currentRatio', 0), 2) if info.get('currentRatio') else 0,
                "beta": round(risk_metrics.get('beta', 1.0), 2),
                "volatility": round(risk_metrics.get('volatility', 0), 1),
                "maxDrawdown": round(risk_metrics.get('max_drawdown', 0), 1),
                "sharpeEstimate": round(risk_metrics.get('sharpe', 0), 2),
            }

            # Cache the result
            _strategy_cache_set(symbol, entry)
            results.append(entry)

        except Exception as e:
            logger.error(f"Error analyzing {symbol}: {str(e)}")
            continue

    # Sort by overall score (descending)
    results.sort(key=lambda x: x['overallScore'], reverse=True)

    return {
        "stocks": results,
        "total": len(results),
        "last_updated": datetime.now().isoformat(),
    }

# ── Strategy cache (5-minute TTL) ──────────────────────────────────────
_strategy_cache: dict = {}
_STRATEGY_CACHE_TTL = 300  # seconds

def _strategy_cache_get(symbol: str):
    entry = _strategy_cache.get(symbol)
    if entry and (datetime.now().timestamp() - entry["ts"]) < _STRATEGY_CACHE_TTL:
        return entry["data"]
    return None

def _strategy_cache_set(symbol: str, data: dict):
    _strategy_cache[symbol] = {"data": data, "ts": datetime.now().timestamp()}


# ── Sector-aware PE multiples ──────────────────────────────────────────
SECTOR_PE = {
    "Technology":        25,
    "Communication Services": 20,
    "Consumer Cyclical":  18,
    "Consumer Defensive": 20,
    "Healthcare":         18,
    "Financial Services": 13,
    "Industrials":        17,
    "Energy":             12,
    "Basic Materials":    14,
    "Real Estate":        18,
    "Utilities":          16,
}


def _calculate_rsi(hist, period=14) -> float:
    """Calculate 14-day RSI."""
    try:
        if len(hist) < period + 1:
            return 50.0
        close = hist['Close']
        delta = close.diff()
        gain = delta.clip(lower=0)
        loss = (-delta.clip(upper=0))
        avg_gain = gain.rolling(window=period, min_periods=period).mean()
        avg_loss = loss.rolling(window=period, min_periods=period).mean()
        rs = avg_gain / avg_loss.replace(0, 1e-10)
        rsi = 100 - (100 / (1 + rs))
        return float(rsi.iloc[-1])
    except Exception:
        return 50.0


def _calculate_risk_score(hist, info: dict) -> tuple:
    """
    Layer 4: Risk assessment.
    Returns (score 0-100, metrics dict).
    Higher score = lower risk = better.
    """
    metrics = {"beta": 1.0, "volatility": 0, "max_drawdown": 0, "sharpe": 0}
    try:
        if len(hist) < 30:
            return 50.0, metrics

        # Annualized volatility
        daily_returns = hist['Close'].pct_change().dropna()
        vol = float(daily_returns.std() * (252 ** 0.5) * 100)  # annualized %
        metrics["volatility"] = vol

        # Max drawdown
        cummax = hist['Close'].cummax()
        drawdown = ((hist['Close'] - cummax) / cummax * 100)
        max_dd = float(drawdown.min())
        metrics["max_drawdown"] = max_dd

        # Beta
        beta = info.get('beta', 1.0) or 1.0
        metrics["beta"] = beta

        # Sharpe estimate (annualized return / vol, risk-free ≈ 5%)
        total_return = (hist['Close'].iloc[-1] / hist['Close'].iloc[0]) - 1
        ann_return = total_return * (252 / len(hist))
        sharpe = ((ann_return - 0.05) / (vol / 100)) if vol > 0 else 0
        metrics["sharpe"] = sharpe

        # Score: lower vol, smaller drawdown, lower beta, higher Sharpe → better
        score = 0

        # Volatility component (30 pts) — under 20% annual is great
        if vol < 15:
            score += 30
        elif vol < 25:
            score += 25
        elif vol < 35:
            score += 18
        elif vol < 50:
            score += 10
        else:
            score += 5

        # Max drawdown component (25 pts)
        if max_dd > -10:
            score += 25
        elif max_dd > -20:
            score += 20
        elif max_dd > -30:
            score += 15
        elif max_dd > -50:
            score += 8
        else:
            score += 3

        # Beta component (25 pts)
        if beta < 0.8:
            score += 25
        elif beta < 1.0:
            score += 22
        elif beta < 1.2:
            score += 18
        elif beta < 1.5:
            score += 12
        else:
            score += 5

        # Sharpe component (20 pts)
        if sharpe > 1.5:
            score += 20
        elif sharpe > 1.0:
            score += 16
        elif sharpe > 0.5:
            score += 12
        elif sharpe > 0:
            score += 8
        else:
            score += 3

        return min(100, max(0, score)), metrics
    except Exception as e:
        logger.debug(f"Risk score error: {e}")
        return 50.0, metrics


def _calculate_value_score(info: dict, current_price: float) -> float:
    """Value score using sector-aware PE and multiple valuation methods."""
    try:
        intrinsic_value = _estimate_intrinsic_value(info, current_price)
        if intrinsic_value <= 0:
            return 0

        discount = ((intrinsic_value - current_price) / intrinsic_value) * 100

        if discount >= 50:
            score = 100
        elif discount >= 40:
            score = 90 + (discount - 40)
        elif discount >= 30:
            score = 80 + (discount - 30)
        elif discount >= 20:
            score = 70 + (discount - 20)
        elif discount >= 10:
            score = 55 + (discount - 10) * 1.5
        elif discount >= 0:
            score = 45 + discount
        elif discount >= -20:
            score = 30 + (discount + 20) * 0.75
        elif discount >= -50:
            score = 15 + (discount + 50) * 0.5
        else:
            score = max(0, 15 + (discount + 50) * 0.3)

        return min(100, max(0, score))
    except Exception:
        return 0


def _calculate_debt_ratio(info: dict) -> float:
    try:
        total_debt = info.get('totalDebt', 0)
        total_equity = info.get('totalStockholdersEquity', 0)
        if total_equity > 0 and total_debt >= 0:
            return (total_debt / total_equity) * 100
        return 0
    except Exception:
        return 0


def _calculate_quality_score(info: dict) -> float:
    """
    Expanded quality score: FCF, revenue growth, debt, profit margin,
    ROE, current ratio (6 metrics, ~17 pts each).
    """
    try:
        score = 0

        # Free cash flow (17 pts)
        if info.get('freeCashflow', 0) > 0:
            score += 17

        # Revenue growth (17 pts)
        rg = info.get('revenueGrowth', 0) or 0
        if rg > 0.20:
            score += 17
        elif rg > 0.10:
            score += 13
        elif rg > 0:
            score += 9

        # Debt ratio (17 pts)
        dr = _calculate_debt_ratio(info)
        if dr < 30:
            score += 17
        elif dr < 50:
            score += 12
        elif dr < 80:
            score += 6

        # Profit margin (17 pts)
        pm = info.get('profitMargins', 0) or 0
        if pm > 0.20:
            score += 17
        elif pm > 0.10:
            score += 13
        elif pm > 0:
            score += 8

        # ROE (16 pts) — new
        roe = info.get('returnOnEquity', 0) or 0
        if roe > 0.20:
            score += 16
        elif roe > 0.12:
            score += 12
        elif roe > 0.05:
            score += 8

        # Current ratio (16 pts) — new
        cr = info.get('currentRatio', 0) or 0
        if cr >= 1.5:
            score += 16
        elif cr >= 1.0:
            score += 12
        elif cr >= 0.7:
            score += 6

        return min(100, score)
    except Exception:
        return 0


def _calculate_momentum_score(hist, current_price: float) -> float:
    """Momentum score: MA50, MA200, relative strength, RSI."""
    try:
        if hist.empty or len(hist) < 50:
            return 0

        score = 0

        # MA50 (25 pts)
        ma50 = hist['Close'].rolling(window=50).mean().iloc[-1]
        if current_price > ma50:
            score += 25

        # MA200 (25 pts)
        if len(hist) >= 200:
            ma200 = hist['Close'].rolling(window=200).mean().iloc[-1]
            if current_price > ma200:
                score += 25
        elif current_price > ma50:
            score += 12

        # Relative strength — 1Y return (25 pts)
        year_ago = hist['Close'].iloc[0]
        if year_ago > 0:
            perf = ((current_price - year_ago) / year_ago) * 100
            if perf > 30:
                score += 25
            elif perf > 15:
                score += 20
            elif perf > 5:
                score += 15
            elif perf > 0:
                score += 10

        # RSI sweet spot (25 pts) — 40-65 is ideal entry, penalize extremes
        rsi = _calculate_rsi(hist)
        if 40 <= rsi <= 65:
            score += 25  # ideal zone
        elif 30 <= rsi < 40:
            score += 20  # approaching oversold — attractive
        elif 65 < rsi <= 75:
            score += 15  # slightly overbought
        elif rsi < 30:
            score += 12  # deeply oversold — risky but can bounce
        else:
            score += 5   # overbought >75

        return min(100, score)
    except Exception:
        return 0


def _estimate_intrinsic_value(info: dict, current_price: float) -> float:
    """Sector-aware intrinsic value using multiple methods."""
    try:
        intrinsic_values = []

        # Detect sector PE
        sector = info.get('sector', '')
        sector_pe = SECTOR_PE.get(sector, 15)

        eps = info.get('trailingEps', 0)
        book_value = info.get('bookValue', 0)

        # Method 1: Graham Number
        if eps > 0 and book_value > 0:
            intrinsic_values.append((22.5 * eps * book_value) ** 0.5)

        # Method 2: Sector-aware Earnings Power Value
        if eps > 0:
            intrinsic_values.append(eps * sector_pe)

        # Method 3: Book Value with quality premium
        roe = info.get('returnOnEquity', 0)
        if book_value > 0:
            mult = 1.5 if roe > 0.15 else 1.3 if roe > 0.10 else 1.0
            intrinsic_values.append(book_value * mult)

        # Method 4: DDM
        dividend = info.get('dividendRate', 0)
        if dividend > 0:
            growth = info.get('earningsGrowth', 0.05) or 0.05
            growth = min(max(growth, 0.01), 0.08)  # clamp 1-8%
            req_return = 0.10
            if growth < req_return:
                ddm = dividend / (req_return - growth)
                if 0 < ddm < current_price * 3:
                    intrinsic_values.append(ddm)

        # Method 5: FCF yield
        shares = info.get('sharesOutstanding', 0)
        fcf = info.get('freeCashflow', 0)
        if fcf > 0 and shares > 0:
            fcf_per_share = fcf / shares
            intrinsic_values.append(fcf_per_share * min(sector_pe, 15))

        if intrinsic_values:
            intrinsic_values.sort()
            mid = len(intrinsic_values) // 2
            if len(intrinsic_values) % 2 == 0:
                return (intrinsic_values[mid - 1] + intrinsic_values[mid]) / 2
            return intrinsic_values[mid]

        return current_price * 1.20
    except Exception:
        return current_price * 1.20


def _get_recommendation(value: float, quality: float, momentum: float, risk: float, overall: float) -> str:
    """Flexible weighted recommendation — no longer requires all layers to pass."""
    # Strong conviction BUY: overall >= 70 and at least 3 layers strong
    strong = sum([value >= 60, quality >= 60, momentum >= 55, risk >= 55])
    if overall >= 70 and strong >= 3:
        return "BUY"

    # Moderate BUY: overall >= 60 and at least 2 layers strong
    if overall >= 60 and strong >= 2:
        return "BUY"

    # HOLD: overall 45-60 or mixed signals
    if overall >= 45:
        return "HOLD"

    # SELL: below 35
    if overall < 35:
        return "SELL"

    return "AVOID"


def _get_confidence_level(value: float, quality: float, momentum: float, risk: float) -> str:
    scores = [value, quality, momentum, risk]
    avg = sum(scores) / 4
    std = float(np.std(scores))

    if avg >= 65 and std < 15:
        return "HIGH"
    if avg >= 45 or std < 20:
        return "MEDIUM"
    return "LOW"


def _calculate_allocation(overall: float, recommendation: str, risk_metrics: dict) -> float:
    """Risk-adjusted position sizing."""
    if recommendation in ("AVOID", "SELL"):
        return 0.0

    base = overall / 10  # 0-10%

    # Risk-adjust: high vol or high beta → smaller position
    vol = risk_metrics.get("volatility", 30)
    beta = risk_metrics.get("beta", 1.0)

    if vol > 40:
        base *= 0.6
    elif vol > 30:
        base *= 0.8

    if beta > 1.5:
        base *= 0.7
    elif beta > 1.2:
        base *= 0.85

    if recommendation == "HOLD":
        base = min(base, 5.0)

    return round(min(10.0, max(1.0, base)), 1)


# ── Financial Statements & Ratio Trends ─────────────────────────────────
@app.get("/financials/{symbol}")
async def get_financial_statements(symbol: str, period: str = "annual"):
    """
    Returns structured financial statements (income, balance sheet, cash flow)
    plus key ratio trends for investment decision-making.
    period: 'annual' or 'quarterly'
    """
    try:
        stock = yf.Ticker(symbol.upper())
        info = stock.info

        if period == "quarterly":
            inc = stock.quarterly_financials
            bs = stock.quarterly_balance_sheet
            cf = stock.quarterly_cashflow
        else:
            inc = stock.financials
            bs = stock.balance_sheet
            cf = stock.cashflow

        def _df_to_dict(df):
            """Convert yfinance DataFrame to {row_label: {date: value}} with dates as strings."""
            if df is None or df.empty:
                return {}
            result = {}
            for row in df.index:
                vals = {}
                for col in df.columns:
                    v = df.loc[row, col]
                    if pd.notna(v):
                        vals[col.strftime("%Y-%m-%d")] = float(v)
                if vals:
                    result[str(row)] = vals
            return result

        inc_dict = _df_to_dict(inc)
        bs_dict = _df_to_dict(bs)
        cf_dict = _df_to_dict(cf)

        # Get sorted date columns (most recent first)
        dates = []
        for df in [inc, bs, cf]:
            if df is not None and not df.empty:
                dates = [c.strftime("%Y-%m-%d") for c in df.columns]
                break

        # Build key metrics summary across years
        def _safe(d, key, date):
            try:
                return d.get(key, {}).get(date)
            except Exception:
                return None

        def _pct(a, b):
            if a is not None and b is not None and b != 0:
                return round((a - b) / abs(b) * 100, 1)
            return None

        key_metrics = []
        for i, date in enumerate(dates):
            prev_date = dates[i + 1] if i + 1 < len(dates) else None

            revenue = _safe(inc_dict, "Total Revenue", date)
            gross_profit = _safe(inc_dict, "Gross Profit", date)
            operating_income = _safe(inc_dict, "Operating Income", date) or _safe(inc_dict, "EBIT", date)
            net_income = _safe(inc_dict, "Net Income", date)
            total_assets = _safe(bs_dict, "Total Assets", date)
            total_liabilities = _safe(bs_dict, "Total Liabilities Net Minority Interest", date)
            total_equity = _safe(bs_dict, "Stockholders Equity", date) or _safe(bs_dict, "Total Stockholders Equity", date)
            total_debt = _safe(bs_dict, "Total Debt", date)
            current_assets = _safe(bs_dict, "Current Assets", date)
            current_liabilities = _safe(bs_dict, "Current Liabilities", date)
            op_cashflow = _safe(cf_dict, "Operating Cash Flow", date) or _safe(cf_dict, "Total Cash From Operating Activities", date)
            capex = _safe(cf_dict, "Capital Expenditure", date)
            fcf = (op_cashflow + capex) if op_cashflow is not None and capex is not None else None  # capex is negative

            prev_revenue = _safe(inc_dict, "Total Revenue", prev_date) if prev_date else None

            m = {
                "date": date,
                "revenue": revenue,
                "revenueGrowth": _pct(revenue, prev_revenue),
                "grossProfit": gross_profit,
                "grossMargin": round(gross_profit / revenue * 100, 1) if gross_profit and revenue else None,
                "operatingIncome": operating_income,
                "operatingMargin": round(operating_income / revenue * 100, 1) if operating_income and revenue else None,
                "netIncome": net_income,
                "netMargin": round(net_income / revenue * 100, 1) if net_income and revenue else None,
                "totalAssets": total_assets,
                "totalLiabilities": total_liabilities,
                "totalEquity": total_equity,
                "totalDebt": total_debt,
                "debtToEquity": round(total_debt / total_equity, 2) if total_debt and total_equity and total_equity != 0 else None,
                "currentRatio": round(current_assets / current_liabilities, 2) if current_assets and current_liabilities and current_liabilities != 0 else None,
                "operatingCashFlow": op_cashflow,
                "capex": capex,
                "freeCashFlow": fcf,
                "fcfMargin": round(fcf / revenue * 100, 1) if fcf and revenue and revenue != 0 else None,
                "roe": round(net_income / total_equity * 100, 1) if net_income and total_equity and total_equity != 0 else None,
                "roa": round(net_income / total_assets * 100, 1) if net_income and total_assets and total_assets != 0 else None,
            }
            key_metrics.append(m)

        return {
            "symbol": symbol.upper(),
            "companyName": info.get("shortName", symbol.upper()),
            "sector": info.get("sector", ""),
            "industry": info.get("industry", ""),
            "currency": info.get("currency", "USD"),
            "period": period,
            "dates": dates,
            "incomeStatement": inc_dict,
            "balanceSheet": bs_dict,
            "cashFlowStatement": cf_dict,
            "keyMetrics": key_metrics,
            "currentPrice": info.get("currentPrice") or info.get("regularMarketPrice"),
            "marketCap": info.get("marketCap"),
        }

    except Exception as e:
        logger.error(f"Error fetching financials for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Earnings Analysis ────────────────────────────────────────────────────
@app.get("/earnings/{symbol}")
async def get_earnings_analysis(symbol: str):
    """Earnings history with beat/miss tracking and EPS trends."""
    try:
        stock = yf.Ticker(symbol.upper())
        info = stock.info

        # Earnings dates with estimates vs actuals
        ed = stock.earnings_dates
        quarters = []
        if ed is not None and not ed.empty:
            for idx, row in ed.iterrows():
                event_type = row.get("Event Type", "")
                if event_type == "Meeting":
                    continue
                est = row.get("EPS Estimate")
                actual = row.get("Reported EPS")
                surprise = row.get("Surprise(%)")
                date_str = idx.strftime("%Y-%m-%d") if hasattr(idx, "strftime") else str(idx)
                q = {
                    "date": date_str,
                    "epsEstimate": float(est) if pd.notna(est) else None,
                    "epsActual": float(actual) if pd.notna(actual) else None,
                    "surprisePct": float(surprise) if pd.notna(surprise) else None,
                    "beat": bool(actual > est) if pd.notna(actual) and pd.notna(est) else None,
                }
                quarters.append(q)

        # Annual EPS from financials
        fin = stock.financials
        annual_eps = []
        if fin is not None and not fin.empty:
            for col in fin.columns:
                ni = fin.loc["Net Income", col] if "Net Income" in fin.index else None
                shares = fin.loc["Diluted Average Shares", col] if "Diluted Average Shares" in fin.index else None
                eps = float(ni / shares) if ni is not None and shares is not None and pd.notna(ni) and pd.notna(shares) and shares != 0 else None
                annual_eps.append({
                    "date": col.strftime("%Y-%m-%d"),
                    "eps": eps,
                    "netIncome": float(ni) if ni is not None and pd.notna(ni) else None,
                })

        # Stats
        beats = [q for q in quarters if q["beat"] is True]
        misses = [q for q in quarters if q["beat"] is False]
        total_reported = [q for q in quarters if q["beat"] is not None]

        return {
            "symbol": symbol.upper(),
            "companyName": info.get("shortName", symbol.upper()),
            "trailingEps": info.get("trailingEps"),
            "forwardEps": info.get("forwardEps"),
            "trailingPE": info.get("trailingPE"),
            "forwardPE": info.get("forwardPE"),
            "quarters": quarters,
            "annualEps": annual_eps,
            "stats": {
                "totalReported": len(total_reported),
                "beats": len(beats),
                "misses": len(misses),
                "beatRate": round(len(beats) / len(total_reported) * 100, 1) if total_reported else None,
                "avgSurprise": round(np.mean([q["surprisePct"] for q in quarters if q["surprisePct"] is not None]), 2) if any(q["surprisePct"] is not None for q in quarters) else None,
            },
        }
    except Exception as e:
        logger.error(f"Error fetching earnings for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Valuation History ────────────────────────────────────────────────────
@app.get("/valuation-history/{symbol}")
async def get_valuation_history(symbol: str):
    """Historical valuation multiples (P/E, P/B, P/S, EV/EBITDA) with current vs 5-year range."""
    try:
        stock = yf.Ticker(symbol.upper())
        info = stock.info

        current = {
            "pe": info.get("trailingPE"),
            "forwardPE": info.get("forwardPE"),
            "pb": info.get("priceToBook"),
            "ps": info.get("priceToSalesTrailing12Months"),
            "evEbitda": info.get("enterpriseToEbitda"),
            "evRevenue": info.get("enterpriseToRevenue"),
            "pegRatio": info.get("pegRatio"),
            "dividendYield": info.get("dividendYield"),
            "currentPrice": info.get("currentPrice") or info.get("regularMarketPrice"),
            "marketCap": info.get("marketCap"),
        }

        # Build historical multiples from annual financials + price history
        fin = stock.financials
        bs = stock.balance_sheet
        hist = stock.history(period="5y", interval="1mo")
        shares_outstanding = info.get("sharesOutstanding", 0)

        historical = []
        if fin is not None and not fin.empty and hist is not None and not hist.empty:
            # Normalize timezone to avoid comparison errors
            if hist.index.tz is not None:
                hist.index = hist.index.tz_localize(None)
            for col in fin.columns:
                date = col
                date_str = date.strftime("%Y-%m-%d")

                # Find closest price to this date
                price = None
                if not hist.empty:
                    closest_idx = hist.index.get_indexer([date], method="nearest")[0]
                    if 0 <= closest_idx < len(hist):
                        price = float(hist.iloc[closest_idx]["Close"])

                revenue = fin.loc["Total Revenue", col] if "Total Revenue" in fin.index else None
                net_income = fin.loc["Net Income", col] if "Net Income" in fin.index else None
                ebitda = fin.loc["EBITDA", col] if "EBITDA" in fin.index else None

                book_value = None
                if bs is not None and not bs.empty and date in bs.columns:
                    equity = bs.loc["Stockholders Equity", date] if "Stockholders Equity" in bs.index else None
                    if equity is not None and pd.notna(equity) and shares_outstanding:
                        book_value = float(equity) / shares_outstanding

                eps = float(net_income / shares_outstanding) if net_income is not None and pd.notna(net_income) and shares_outstanding else None

                h = {"date": date_str, "price": price}
                h["pe"] = round(price / eps, 1) if price and eps and eps > 0 else None
                h["pb"] = round(price / book_value, 1) if price and book_value and book_value > 0 else None
                h["ps"] = round(price * shares_outstanding / float(revenue), 1) if price and revenue and pd.notna(revenue) and float(revenue) > 0 else None
                h["evEbitda"] = round(price * shares_outstanding / float(ebitda), 1) if price and ebitda and pd.notna(ebitda) and float(ebitda) > 0 else None
                historical.append(h)

        # Calculate 5-year ranges for each multiple
        def _range(key):
            vals = [h[key] for h in historical if h.get(key) is not None and h[key] > 0]
            if not vals:
                return None
            return {
                "min": round(min(vals), 1),
                "max": round(max(vals), 1),
                "avg": round(np.mean(vals), 1),
                "median": round(np.median(vals), 1),
                "current": current.get(key),
            }

        ranges = {
            "pe": _range("pe"),
            "pb": _range("pb"),
            "ps": _range("ps"),
            "evEbitda": _range("evEbitda"),
        }

        # Where current sits in range (percentile)
        verdicts = {}
        for key, r in ranges.items():
            if r and r["current"] is not None:
                c = r["current"]
                if c <= r["avg"]:
                    verdicts[key] = "Below average — potentially undervalued"
                elif c <= r["max"] * 0.75:
                    verdicts[key] = "Near average — fairly valued"
                else:
                    verdicts[key] = "Above average — potentially overvalued"
            else:
                verdicts[key] = None

        return {
            "symbol": symbol.upper(),
            "companyName": info.get("shortName", symbol.upper()),
            "sector": info.get("sector", ""),
            "current": current,
            "historical": historical,
            "ranges": ranges,
            "verdicts": verdicts,
        }
    except Exception as e:
        logger.error(f"Error fetching valuation history for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Enhanced Peer Comparison ─────────────────────────────────────────────
SECTOR_PEERS = {
    "Technology": ["AAPL", "MSFT", "GOOGL", "META", "NVDA", "AVGO", "ORCL", "CRM", "AMD", "INTC"],
    "Healthcare": ["JNJ", "UNH", "PFE", "ABBV", "MRK", "LLY", "TMO", "ABT", "BMY", "AMGN"],
    "Financial Services": ["JPM", "BAC", "WFC", "GS", "MS", "C", "BLK", "SCHW", "AXP", "USB"],
    "Consumer Cyclical": ["AMZN", "TSLA", "HD", "MCD", "NKE", "SBUX", "TJX", "LOW", "BKNG", "CMG"],
    "Consumer Defensive": ["WMT", "PG", "KO", "PEP", "COST", "PM", "CL", "MDLZ", "MO", "KHC"],
    "Communication Services": ["GOOGL", "META", "DIS", "NFLX", "T", "VZ", "CMCSA", "TMUS", "CHTR", "EA"],
    "Energy": ["XOM", "CVX", "COP", "SLB", "EOG", "MPC", "PSX", "VLO", "OXY", "PXD"],
    "Industrials": ["UNP", "HON", "UPS", "CAT", "DE", "LMT", "RTX", "BA", "GE", "MMM"],
    "Real Estate": ["PLD", "AMT", "CCI", "EQIX", "PSA", "SPG", "O", "WELL", "DLR", "AVB"],
    "Utilities": ["NEE", "DUK", "SO", "D", "AEP", "SRE", "EXC", "XEL", "ED", "WEC"],
    "Basic Materials": ["LIN", "APD", "ECL", "SHW", "DD", "NEM", "FCX", "NUE", "DOW", "VMC"],
}


@app.get("/peer-compare/{symbol}")
async def get_peer_comparison_table(symbol: str, peers: Optional[str] = None):
    """
    Side-by-side financial comparison of a stock vs its sector peers.
    Custom peers can be passed as comma-separated symbols.
    """
    try:
        stock = yf.Ticker(symbol.upper())
        info = stock.info
        sector = info.get("sector", "")

        # Determine peer list
        if peers:
            peer_list = [p.strip().upper() for p in peers.split(",") if p.strip()]
        else:
            sector_list = SECTOR_PEERS.get(sector, [])
            peer_list = [p for p in sector_list if p != symbol.upper()][:5]

        # Fetch data for target + peers
        all_symbols = [symbol.upper()] + peer_list
        results = []

        for sym in all_symbols:
            try:
                s = yf.Ticker(sym)
                si = s.info
                fin = s.financials
                bs = s.balance_sheet
                cf = s.cashflow

                revenue = None
                net_income = None
                gross_profit = None
                op_income = None
                fcf = None
                total_equity = None
                total_debt_val = None
                total_assets = None
                current_assets = None
                current_liabs = None

                if fin is not None and not fin.empty:
                    col = fin.columns[0]
                    revenue = float(fin.loc["Total Revenue", col]) if "Total Revenue" in fin.index and pd.notna(fin.loc["Total Revenue", col]) else None
                    net_income = float(fin.loc["Net Income", col]) if "Net Income" in fin.index and pd.notna(fin.loc["Net Income", col]) else None
                    gross_profit = float(fin.loc["Gross Profit", col]) if "Gross Profit" in fin.index and pd.notna(fin.loc["Gross Profit", col]) else None
                    op_income = float(fin.loc["Operating Income", col]) if "Operating Income" in fin.index and pd.notna(fin.loc["Operating Income", col]) else None

                if bs is not None and not bs.empty:
                    col = bs.columns[0]
                    total_equity = float(bs.loc["Stockholders Equity", col]) if "Stockholders Equity" in bs.index and pd.notna(bs.loc["Stockholders Equity", col]) else None
                    total_debt_val = float(bs.loc["Total Debt", col]) if "Total Debt" in bs.index and pd.notna(bs.loc["Total Debt", col]) else None
                    total_assets = float(bs.loc["Total Assets", col]) if "Total Assets" in bs.index and pd.notna(bs.loc["Total Assets", col]) else None
                    current_assets = float(bs.loc["Current Assets", col]) if "Current Assets" in bs.index and pd.notna(bs.loc["Current Assets", col]) else None
                    current_liabs = float(bs.loc["Current Liabilities", col]) if "Current Liabilities" in bs.index and pd.notna(bs.loc["Current Liabilities", col]) else None

                if cf is not None and not cf.empty:
                    col = cf.columns[0]
                    op_cf = cf.loc["Operating Cash Flow", col] if "Operating Cash Flow" in cf.index else None
                    capex = cf.loc["Capital Expenditure", col] if "Capital Expenditure" in cf.index else None
                    if op_cf is not None and capex is not None and pd.notna(op_cf) and pd.notna(capex):
                        fcf = float(op_cf) + float(capex)

                price = si.get("currentPrice") or si.get("regularMarketPrice") or 0
                mktcap = si.get("marketCap") or 0

                results.append({
                    "symbol": sym,
                    "companyName": si.get("shortName", sym),
                    "isTarget": sym == symbol.upper(),
                    "price": price,
                    "marketCap": mktcap,
                    "pe": si.get("trailingPE"),
                    "forwardPE": si.get("forwardPE"),
                    "pb": si.get("priceToBook"),
                    "ps": si.get("priceToSalesTrailing12Months"),
                    "evEbitda": si.get("enterpriseToEbitda"),
                    "dividendYield": round(si.get("dividendYield", 0), 2) if si.get("dividendYield") else None,
                    "beta": si.get("beta"),
                    "revenue": revenue,
                    "netIncome": net_income,
                    "grossMargin": round(gross_profit / revenue * 100, 1) if gross_profit and revenue else None,
                    "operatingMargin": round(op_income / revenue * 100, 1) if op_income and revenue else None,
                    "netMargin": round(net_income / revenue * 100, 1) if net_income and revenue else None,
                    "roe": round(net_income / total_equity * 100, 1) if net_income and total_equity and total_equity != 0 else None,
                    "roa": round(net_income / total_assets * 100, 1) if net_income and total_assets and total_assets != 0 else None,
                    "debtToEquity": round(total_debt_val / total_equity, 2) if total_debt_val and total_equity and total_equity != 0 else None,
                    "currentRatio": round(current_assets / current_liabs, 2) if current_assets and current_liabs and current_liabs != 0 else None,
                    "fcf": fcf,
                    "fcfMargin": round(fcf / revenue * 100, 1) if fcf and revenue and revenue != 0 else None,
                    "revenueGrowth": round(si.get("revenueGrowth", 0) * 100, 1) if si.get("revenueGrowth") else None,
                    "earningsGrowth": round(si.get("earningsGrowth", 0) * 100, 1) if si.get("earningsGrowth") else None,
                })
            except Exception as ex:
                logger.warning(f"Peer compare: skipping {sym}: {ex}")
                continue

        # Calculate sector averages (excluding target)
        peers_only = [r for r in results if not r["isTarget"]]
        avg_keys = ["pe", "forwardPE", "pb", "ps", "evEbitda", "grossMargin", "operatingMargin", "netMargin", "roe", "roa", "debtToEquity", "currentRatio", "fcfMargin", "beta", "dividendYield"]
        sector_avg = {}
        for k in avg_keys:
            vals = [r[k] for r in peers_only if r.get(k) is not None]
            sector_avg[k] = round(np.mean(vals), 2) if vals else None

        return {
            "symbol": symbol.upper(),
            "sector": sector,
            "companies": results,
            "sectorAverage": sector_avg,
            "peerCount": len(peers_only),
        }
    except Exception as e:
        logger.error(f"Error in peer comparison for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ────────────────────────────────────────────────────────────────
#  DIVIDEND INCOME ANALYSIS
# ────────────────────────────────────────────────────────────────
@app.get("/dividends/{symbol}")
async def get_dividend_analysis(symbol: str):
    """Dividend history, yield analysis, income projection and DRIP simulation."""
    try:
        stock = yf.Ticker(symbol.upper())
        info = stock.info
        divs = stock.dividends

        current_price = info.get("currentPrice") or info.get("regularMarketPrice") or 0
        annual_dividend = info.get("dividendRate") or 0
        dividend_yield = info.get("dividendYield") or 0
        payout_ratio = info.get("payoutRatio")
        ex_date = info.get("exDividendDate")

        # Dividend history (last 5 years)
        history = []
        annual_totals = {}
        if divs is not None and not divs.empty:
            for date, amount in divs.items():
                d = date.strftime("%Y-%m-%d") if hasattr(date, 'strftime') else str(date)
                year = d[:4]
                history.append({"date": d, "amount": round(float(amount), 4)})
                annual_totals[year] = annual_totals.get(year, 0) + float(amount)

        annual_history = [{"year": y, "total": round(t, 4)} for y, t in sorted(annual_totals.items())]

        # Growth rate
        years_list = sorted(annual_totals.keys())
        growth_rates = []
        for i in range(1, len(years_list)):
            prev = annual_totals[years_list[i - 1]]
            curr = annual_totals[years_list[i]]
            if prev > 0:
                growth_rates.append((curr - prev) / prev)
        avg_growth = round(np.mean(growth_rates) * 100, 1) if growth_rates else 0

        # Income projection: $10k, $50k, $100k invested
        projections = []
        for investment in [10000, 50000, 100000]:
            if current_price > 0 and annual_dividend > 0:
                shares = investment / current_price
                annual_income = shares * annual_dividend
                monthly_income = annual_income / 12

                # 10-year DRIP projection
                drip_shares = shares
                drip_values = []
                div_rate = annual_dividend
                for yr in range(1, 11):
                    div_income = drip_shares * div_rate
                    new_shares = div_income / current_price
                    drip_shares += new_shares
                    div_rate *= (1 + avg_growth / 100)
                    drip_values.append({
                        "year": yr,
                        "shares": round(drip_shares, 2),
                        "annualIncome": round(drip_shares * div_rate, 2),
                        "portfolioValue": round(drip_shares * current_price, 2),
                    })

                projections.append({
                    "investment": investment,
                    "shares": round(shares, 2),
                    "annualIncome": round(annual_income, 2),
                    "monthlyIncome": round(monthly_income, 2),
                    "yieldOnCost": round(dividend_yield, 2),
                    "drip10Year": drip_values,
                })

        # Dividend safety score (0-100)
        safety = 50
        if payout_ratio is not None:
            if payout_ratio < 0.4:
                safety = 90
            elif payout_ratio < 0.6:
                safety = 75
            elif payout_ratio < 0.8:
                safety = 55
            else:
                safety = 30
        if avg_growth > 5:
            safety = min(100, safety + 10)
        if len(annual_history) >= 5:
            safety = min(100, safety + 5)

        return {
            "symbol": symbol.upper(),
            "companyName": info.get("shortName", symbol),
            "currentPrice": current_price,
            "annualDividend": annual_dividend,
            "dividendYield": round(dividend_yield, 2) if dividend_yield else 0,
            "payoutRatio": round(payout_ratio * 100, 1) if payout_ratio else None,
            "exDividendDate": ex_date,
            "dividendHistory": history[-20:],
            "annualHistory": annual_history,
            "avgGrowthRate": avg_growth,
            "yearsOfDividends": len(annual_history),
            "safetyScore": safety,
            "projections": projections,
        }
    except Exception as e:
        logger.error(f"Error in dividend analysis for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ────────────────────────────────────────────────────────────────
#  INVESTMENT GOAL PLANNER
# ────────────────────────────────────────────────────────────────
class GoalPlannerRequest(BaseModel):
    targetAmount: float = 1000000
    currentSavings: float = 0
    monthlyContribution: float = 500
    annualReturn: float = 10.0
    years: int = 20
    inflationRate: float = 3.0

@app.post("/goal-planner")
async def goal_planner(req: GoalPlannerRequest):
    """Calculate path to financial goal with year-by-year breakdown."""
    try:
        monthly_rate = req.annualReturn / 100 / 12
        inflation_monthly = req.inflationRate / 100 / 12
        real_monthly = monthly_rate - inflation_monthly
        total_months = req.years * 12

        # Nominal projection
        yearly_data = []
        balance = req.currentSavings
        total_contributed = req.currentSavings
        for year in range(1, req.years + 1):
            for _ in range(12):
                balance = balance * (1 + monthly_rate) + req.monthlyContribution
                total_contributed += req.monthlyContribution
            earnings = balance - total_contributed
            yearly_data.append({
                "year": year,
                "balance": round(balance, 2),
                "contributed": round(total_contributed, 2),
                "earnings": round(earnings, 2),
                "realBalance": round(balance / ((1 + req.inflationRate / 100) ** year), 2),
            })

        final_balance = balance
        goal_reached = final_balance >= req.targetAmount

        # Find year goal is reached
        goal_year = None
        for yd in yearly_data:
            if yd["balance"] >= req.targetAmount:
                goal_year = yd["year"]
                break

        # Calculate required monthly to hit goal
        if not goal_reached and total_months > 0:
            # FV = PV*(1+r)^n + PMT*((1+r)^n - 1)/r
            fv_factor = (1 + monthly_rate) ** total_months
            if monthly_rate > 0:
                needed_monthly = (req.targetAmount - req.currentSavings * fv_factor) / ((fv_factor - 1) / monthly_rate)
            else:
                needed_monthly = (req.targetAmount - req.currentSavings) / total_months
            required_monthly = max(0, round(needed_monthly, 2))
        else:
            required_monthly = req.monthlyContribution

        # Passive income at goal (4% rule)
        passive_monthly = round(req.targetAmount * 0.04 / 12, 2)
        passive_annual = round(req.targetAmount * 0.04, 2)

        # Milestone markers
        milestones = []
        for pct in [25, 50, 75, 100]:
            target = req.targetAmount * pct / 100
            for yd in yearly_data:
                if yd["balance"] >= target:
                    milestones.append({"percent": pct, "year": yd["year"], "amount": target})
                    break

        return {
            "goalAmount": req.targetAmount,
            "finalBalance": round(final_balance, 2),
            "goalReached": goal_reached,
            "goalYear": goal_year,
            "totalContributed": round(total_contributed, 2),
            "totalEarnings": round(final_balance - total_contributed, 2),
            "requiredMonthly": required_monthly,
            "passiveIncome": {"monthly": passive_monthly, "annual": passive_annual},
            "yearlyProjection": yearly_data,
            "milestones": milestones,
            "assumptions": {
                "annualReturn": req.annualReturn,
                "inflationRate": req.inflationRate,
                "realReturn": round(req.annualReturn - req.inflationRate, 1),
            },
        }
    except Exception as e:
        logger.error(f"Error in goal planner: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ────────────────────────────────────────────────────────────────
#  DCA (Dollar-Cost Averaging) CALCULATOR
# ────────────────────────────────────────────────────────────────
@app.get("/dca/{symbol}")
async def dca_calculator(
    symbol: str,
    monthly_amount: float = Query(500, ge=1),
    years: int = Query(5, ge=1, le=30),
):
    """Backtest DCA strategy: what if you invested $X/month for Y years?"""
    try:
        stock = yf.Ticker(symbol.upper())
        hist = stock.history(period=f"{years}y", interval="1mo")

        if hist is None or hist.empty:
            raise HTTPException(status_code=404, detail=f"No price history for {symbol}")

        if hist.index.tz is not None:
            hist.index = hist.index.tz_localize(None)

        total_invested = 0
        total_shares = 0
        monthly_data = []

        for i, (date, row) in enumerate(hist.iterrows()):
            price = float(row["Close"])
            if price <= 0:
                continue
            shares_bought = monthly_amount / price
            total_invested += monthly_amount
            total_shares += shares_bought
            portfolio_value = total_shares * price
            monthly_data.append({
                "date": date.strftime("%Y-%m-%d"),
                "price": round(price, 2),
                "sharesBought": round(shares_bought, 4),
                "totalShares": round(total_shares, 4),
                "totalInvested": round(total_invested, 2),
                "portfolioValue": round(portfolio_value, 2),
                "gainLoss": round(portfolio_value - total_invested, 2),
                "returnPct": round((portfolio_value / total_invested - 1) * 100, 1) if total_invested > 0 else 0,
            })

        if not monthly_data:
            raise HTTPException(status_code=404, detail="No valid price data")

        latest = monthly_data[-1]
        avg_cost = total_invested / total_shares if total_shares > 0 else 0
        current_price = latest["price"]

        # Compare vs lump sum
        first_price = monthly_data[0]["price"]
        lump_sum_total = monthly_amount * len(monthly_data)
        lump_sum_shares = lump_sum_total / first_price if first_price > 0 else 0
        lump_sum_value = lump_sum_shares * current_price

        # Annual returns
        annual_data = {}
        for m in monthly_data:
            yr = m["date"][:4]
            annual_data[yr] = m
        annual_summary = []
        for yr, m in sorted(annual_data.items()):
            annual_summary.append({
                "year": yr,
                "portfolioValue": m["portfolioValue"],
                "totalInvested": m["totalInvested"],
                "returnPct": m["returnPct"],
            })

        # Dividend income if applicable
        info = stock.info
        div_yield = info.get("dividendYield", 0) or 0
        est_annual_div_income = round(latest["portfolioValue"] * div_yield / 100, 2)

        return {
            "symbol": symbol.upper(),
            "companyName": info.get("shortName", symbol),
            "monthlyAmount": monthly_amount,
            "periodYears": years,
            "monthsInvested": len(monthly_data),
            "totalInvested": latest["totalInvested"],
            "currentValue": latest["portfolioValue"],
            "totalReturn": latest["gainLoss"],
            "totalReturnPct": latest["returnPct"],
            "totalShares": round(total_shares, 4),
            "avgCostBasis": round(avg_cost, 2),
            "currentPrice": current_price,
            "lumpSumComparison": {
                "lumpSumValue": round(lump_sum_value, 2),
                "dcaValue": latest["portfolioValue"],
                "dcaBetter": latest["portfolioValue"] > lump_sum_value,
                "difference": round(latest["portfolioValue"] - lump_sum_value, 2),
            },
            "estimatedAnnualDividendIncome": est_annual_div_income,
            "annualSummary": annual_summary,
            "monthlyData": monthly_data,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in DCA calculator for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ────────────────────────────────────────────────────────────────
#  ECONOMIC DASHBOARD — real-time macro snapshot
# ────────────────────────────────────────────────────────────────

SECTOR_ETFS = {
    "Technology": "XLK",
    "Healthcare": "XLV",
    "Financials": "XLF",
    "Energy": "XLE",
    "Consumer Discretionary": "XLY",
    "Consumer Staples": "XLP",
    "Industrials": "XLI",
    "Materials": "XLB",
    "Utilities": "XLU",
    "Real Estate": "XLRE",
    "Communication Services": "XLC",
}

MARKET_INDICES = {
    "S&P 500": "^GSPC",
    "Dow Jones": "^DJI",
    "NASDAQ": "^IXIC",
    "Russell 2000": "^RUT",
}

_econ_cache: Dict[str, Any] = {}
_econ_cache_time: float = 0


@app.get("/economic-dashboard")
async def economic_dashboard():
    """Economy snapshot: indices, sector performance, yields, volatility."""
    global _econ_cache, _econ_cache_time
    import time
    now = time.time()
    if _econ_cache and now - _econ_cache_time < 300:
        return _econ_cache

    try:
        # ── Market indices ──
        indices = []
        idx_symbols = list(MARKET_INDICES.values())
        idx_names = list(MARKET_INDICES.keys())

        def _fetch_quote(sym: str) -> dict:
            t = yf.Ticker(sym)
            h = t.history(period="5d")
            if h is None or len(h) < 2:
                return {}
            last = float(h["Close"].iloc[-1])
            prev = float(h["Close"].iloc[-2])
            chg = last - prev
            chg_pct = (chg / prev * 100) if prev else 0
            # YTD
            ytd_h = t.history(period="ytd")
            ytd_start = float(ytd_h["Close"].iloc[0]) if ytd_h is not None and len(ytd_h) > 0 else last
            ytd_pct = ((last - ytd_start) / ytd_start * 100) if ytd_start else 0
            return {
                "price": round(last, 2),
                "change": round(chg, 2),
                "changePct": round(chg_pct, 2),
                "ytdPct": round(ytd_pct, 2),
            }

        with ThreadPoolExecutor(max_workers=8) as pool:
            idx_futs = {pool.submit(_fetch_quote, sym): name for sym, name in zip(idx_symbols, idx_names)}
            for fut in as_completed(idx_futs):
                name = idx_futs[fut]
                try:
                    data = fut.result()
                    if data:
                        indices.append({"name": name, **data})
                except Exception:
                    pass

        # ── Sector performance ──
        sectors = []
        sec_items = list(SECTOR_ETFS.items())

        def _fetch_sector(pair):
            name, sym = pair
            try:
                t = yf.Ticker(sym)
                h = t.history(period="5d")
                if h is None or len(h) < 2:
                    return None
                last = float(h["Close"].iloc[-1])
                prev = float(h["Close"].iloc[-2])
                chg_pct = ((last - prev) / prev * 100) if prev else 0
                # 1-month
                h_1m = t.history(period="1mo")
                start_1m = float(h_1m["Close"].iloc[0]) if h_1m is not None and len(h_1m) > 0 else last
                mo_pct = ((last - start_1m) / start_1m * 100) if start_1m else 0
                return {
                    "sector": name,
                    "etf": sym,
                    "price": round(last, 2),
                    "dayChangePct": round(chg_pct, 2),
                    "monthChangePct": round(mo_pct, 2),
                }
            except Exception:
                return None

        with ThreadPoolExecutor(max_workers=6) as pool:
            sec_futs = list(pool.map(_fetch_sector, sec_items))
        sectors = [s for s in sec_futs if s]
        sectors.sort(key=lambda x: x["dayChangePct"], reverse=True)

        # ── Treasury yields & VIX ──
        bond_vix = {}
        for label, sym in [("treasury10Y", "^TNX"), ("treasury2Y", "^IRX"), ("vix", "^VIX")]:
            try:
                t = yf.Ticker(sym)
                h = t.history(period="5d")
                if h is not None and len(h) >= 2:
                    last = float(h["Close"].iloc[-1])
                    prev = float(h["Close"].iloc[-2])
                    bond_vix[label] = {
                        "value": round(last, 2),
                        "change": round(last - prev, 2),
                        "changePct": round((last - prev) / prev * 100, 2) if prev else 0,
                    }
            except Exception:
                pass

        # ── Market health assessment ──
        up_sectors = sum(1 for s in sectors if s["dayChangePct"] > 0)
        vix_val = bond_vix.get("vix", {}).get("value", 20)
        if vix_val < 15 and up_sectors >= 7:
            health = {"status": "Strong", "color": "green", "summary": "Low volatility, broad sector strength"}
        elif vix_val < 25 and up_sectors >= 5:
            health = {"status": "Stable", "color": "blue", "summary": "Normal conditions with mixed signals"}
        elif vix_val < 30:
            health = {"status": "Cautious", "color": "orange", "summary": "Elevated volatility, selective opportunities"}
        else:
            health = {"status": "Stressed", "color": "red", "summary": "High volatility, defensive positioning recommended"}

        result = {
            "indices": indices,
            "sectors": sectors,
            "yields": {
                "treasury10Y": bond_vix.get("treasury10Y"),
                "treasury2Y": bond_vix.get("treasury2Y"),
            },
            "vix": bond_vix.get("vix"),
            "marketHealth": health,
            "sectorCount": {"up": up_sectors, "down": len(sectors) - up_sectors},
            "timestamp": datetime.now().isoformat(),
        }
        _econ_cache = result
        _econ_cache_time = now
        return result
    except Exception as e:
        logger.error(f"Error in economic dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ────────────────────────────────────────────────────────────────
#  ECONOMIC IMPACT ANALYSIS — how macro affects a specific stock
# ────────────────────────────────────────────────────────────────
@app.get("/economic-impact/{symbol}")
async def economic_impact(symbol: str):
    """Analyse how economic conditions affect a company's performance & outlook."""
    try:
        stock = yf.Ticker(symbol.upper())
        info = stock.info
        sector = info.get("sector", "Unknown")
        industry = info.get("industry", "Unknown")
        beta = info.get("beta", 1.0) or 1.0
        current_price = info.get("currentPrice") or info.get("regularMarketPrice") or 0

        # ── Company financials snapshot ──
        revenue = info.get("totalRevenue", 0) or 0
        net_income = info.get("netIncomeToCommon", 0) or 0
        fcf = info.get("freeCashflow", 0) or 0
        op_margin = info.get("operatingMargins", 0) or 0
        revenue_growth = info.get("revenueGrowth", 0) or 0
        earnings_growth = info.get("earningsGrowth", 0) or 0
        debt_to_equity = info.get("debtToEquity", 0) or 0
        forward_pe = info.get("forwardPE", 0) or 0
        trailing_pe = info.get("trailingPE", 0) or 0

        # ── Fetch macro context in parallel ──
        macro = {}

        def _get_vix():
            h = yf.Ticker("^VIX").history(period="5d")
            if h is not None and len(h) > 0:
                return round(float(h["Close"].iloc[-1]), 2)
            return None

        def _get_yield_10y():
            h = yf.Ticker("^TNX").history(period="5d")
            if h is not None and len(h) > 0:
                return round(float(h["Close"].iloc[-1]), 2)
            return None

        def _get_sp500_ytd():
            t = yf.Ticker("^GSPC")
            h = t.history(period="ytd")
            if h is not None and len(h) > 1:
                return round((float(h["Close"].iloc[-1]) / float(h["Close"].iloc[0]) - 1) * 100, 2)
            return None

        def _get_sector_perf():
            etf = SECTOR_ETFS.get(sector)
            if not etf:
                return None
            h = yf.Ticker(etf).history(period="1mo")
            if h is not None and len(h) > 1:
                return round((float(h["Close"].iloc[-1]) / float(h["Close"].iloc[0]) - 1) * 100, 2)
            return None

        with ThreadPoolExecutor(max_workers=4) as pool:
            f_vix = pool.submit(_get_vix)
            f_yield = pool.submit(_get_yield_10y)
            f_sp = pool.submit(_get_sp500_ytd)
            f_sec = pool.submit(_get_sector_perf)
            macro["vix"] = f_vix.result()
            macro["treasury10Y"] = f_yield.result()
            macro["sp500YTD"] = f_sp.result()
            macro["sectorMonthPct"] = f_sec.result()

        # ── Interest rate sensitivity ──
        rate_sensitivity = "low"
        rate_impact = "neutral"
        if sector in ["Real Estate", "Utilities", "Financials"]:
            rate_sensitivity = "high"
            rate_impact = "Rising rates pressure valuations and borrowing costs"
        elif sector in ["Technology", "Consumer Discretionary"]:
            rate_sensitivity = "medium"
            rate_impact = "Higher rates compress growth multiples"
        elif debt_to_equity > 150:
            rate_sensitivity = "high"
            rate_impact = "Heavy debt load makes interest expense a significant factor"
        else:
            rate_impact = "Limited direct impact from rate changes"

        # ── Inflation exposure ──
        if sector in ["Energy", "Materials"]:
            inflation_exposure = {"level": "beneficiary", "detail": "Commodity-linked revenue tends to rise with inflation"}
        elif sector in ["Consumer Staples"]:
            inflation_exposure = {"level": "moderate", "detail": "Pricing power but margin pressure from input costs"}
        elif sector in ["Technology"]:
            inflation_exposure = {"level": "low", "detail": "Digital products have low input-cost sensitivity"}
        elif op_margin and op_margin > 0.25:
            inflation_exposure = {"level": "resilient", "detail": "High margins provide buffer against cost increases"}
        else:
            inflation_exposure = {"level": "moderate", "detail": "Some margin pressure possible from rising costs"}

        # ── Earnings outlook factors ──
        factors = []
        # 1. Revenue momentum
        if revenue_growth and revenue_growth > 0.1:
            factors.append({"factor": "Revenue Growth", "signal": "positive", "detail": f"Strong {round(revenue_growth*100,1)}% growth supports earnings expansion"})
        elif revenue_growth and revenue_growth > 0:
            factors.append({"factor": "Revenue Growth", "signal": "neutral", "detail": f"Modest {round(revenue_growth*100,1)}% growth — stable but not accelerating"})
        else:
            factors.append({"factor": "Revenue Growth", "signal": "negative", "detail": f"Revenue declining at {round((revenue_growth or 0)*100,1)}% — earnings at risk"})

        # 2. Margin health
        if op_margin and op_margin > 0.20:
            factors.append({"factor": "Operating Margin", "signal": "positive", "detail": f"{round(op_margin*100,1)}% margins — strong pricing power and cost control"})
        elif op_margin and op_margin > 0.10:
            factors.append({"factor": "Operating Margin", "signal": "neutral", "detail": f"{round(op_margin*100,1)}% margins — adequate but limited cushion"})
        else:
            factors.append({"factor": "Operating Margin", "signal": "negative", "detail": f"Thin {round((op_margin or 0)*100,1)}% margins — vulnerable to cost pressures"})

        # 3. Market volatility
        vix = macro.get("vix", 20)
        if vix and vix < 15:
            factors.append({"factor": "Market Volatility (VIX)", "signal": "positive", "detail": f"VIX at {vix} — low fear, supportive of equity valuations"})
        elif vix and vix < 25:
            factors.append({"factor": "Market Volatility (VIX)", "signal": "neutral", "detail": f"VIX at {vix} — normal range, standard uncertainty"})
        else:
            factors.append({"factor": "Market Volatility (VIX)", "signal": "negative", "detail": f"VIX at {vix} — elevated fear may compress multiples"})

        # 4. Interest rates
        t10 = macro.get("treasury10Y", 4.0)
        if t10 and t10 > 4.5:
            factors.append({"factor": "Interest Rates (10Y)", "signal": "negative", "detail": f"Yields at {t10}% — high discount rate lowers present value of future cash flows"})
        elif t10 and t10 > 3.5:
            factors.append({"factor": "Interest Rates (10Y)", "signal": "neutral", "detail": f"Yields at {t10}% — moderate, balanced impact"})
        else:
            factors.append({"factor": "Interest Rates (10Y)", "signal": "positive", "detail": f"Yields at {t10}% — low rates supportive for growth stocks"})

        # 5. Sector momentum
        sec_pct = macro.get("sectorMonthPct")
        if sec_pct is not None:
            if sec_pct > 3:
                factors.append({"factor": "Sector Momentum", "signal": "positive", "detail": f"{sector} ETF up {sec_pct}% this month — strong sector tailwind"})
            elif sec_pct > -3:
                factors.append({"factor": "Sector Momentum", "signal": "neutral", "detail": f"{sector} ETF {sec_pct:+.1f}% this month — muted sector trend"})
            else:
                factors.append({"factor": "Sector Momentum", "signal": "negative", "detail": f"{sector} ETF {sec_pct:+.1f}% this month — sector headwind"})

        # 6. Free cash flow strength
        if fcf and revenue:
            fcf_margin = fcf / revenue
            if fcf_margin > 0.15:
                factors.append({"factor": "Free Cash Flow", "signal": "positive", "detail": f"{round(fcf_margin*100,1)}% FCF margin — excellent cash generation for reinvestment & dividends"})
            elif fcf_margin > 0.05:
                factors.append({"factor": "Free Cash Flow", "signal": "neutral", "detail": f"{round(fcf_margin*100,1)}% FCF margin — adequate cash generation"})
            else:
                factors.append({"factor": "Free Cash Flow", "signal": "negative", "detail": f"{round(fcf_margin*100,1)}% FCF margin — limited cash for growth or shareholder returns"})

        # Overall economic outlook score
        pos = sum(1 for f in factors if f["signal"] == "positive")
        neg = sum(1 for f in factors if f["signal"] == "negative")
        total = len(factors)
        outlook_score = round((pos - neg) / total * 100) if total else 0
        if outlook_score > 30:
            outlook = "Favorable"
        elif outlook_score > -30:
            outlook = "Mixed"
        else:
            outlook = "Challenging"

        # ── Cash flow projection (simplified) ──
        cf_projections = []
        if fcf and revenue:
            base_growth = revenue_growth if revenue_growth else 0.05
            base_fcf = fcf
            for yr in range(1, 6):
                # Adjust growth for macro conditions
                macro_adj = 0
                if vix and vix > 25:
                    macro_adj -= 0.02
                if t10 and t10 > 4.5:
                    macro_adj -= 0.01
                if sec_pct and sec_pct > 0:
                    macro_adj += 0.01
                adj_growth = base_growth + macro_adj
                # Decay growth toward terminal rate
                yr_growth = adj_growth * (0.85 ** (yr - 1))
                base_fcf = base_fcf * (1 + yr_growth)
                cf_projections.append({
                    "year": yr,
                    "projectedFCF": round(base_fcf / 1e9, 2),
                    "growthRate": round(yr_growth * 100, 1),
                })

        return {
            "symbol": symbol.upper(),
            "companyName": info.get("shortName", symbol),
            "sector": sector,
            "industry": industry,
            "beta": round(beta, 2),
            "macro": macro,
            "interestRateSensitivity": {
                "level": rate_sensitivity,
                "detail": rate_impact,
            },
            "inflationExposure": inflation_exposure,
            "earningsFactors": factors,
            "outlookScore": outlook_score,
            "outlook": outlook,
            "cashFlowProjections": cf_projections,
            "financials": {
                "revenue": revenue,
                "netIncome": net_income,
                "freeCashFlow": fcf,
                "operatingMargin": round(op_margin * 100, 1) if op_margin else None,
                "revenueGrowth": round(revenue_growth * 100, 1) if revenue_growth else None,
                "earningsGrowth": round(earnings_growth * 100, 1) if earnings_growth else None,
                "debtToEquity": round(debt_to_equity, 1),
                "forwardPE": round(forward_pe, 1) if forward_pe else None,
                "trailingPE": round(trailing_pe, 1) if trailing_pe else None,
            },
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        logger.error(f"Error in economic impact for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ────────────────────────────────────────────────────────────────
#  NEWS IMPACT ON EARNINGS & CASH FLOW
# ────────────────────────────────────────────────────────────────

_ECON_KEYWORDS_POS = {"growth", "expansion", "strong", "recovery", "stimulus", "rate cut", "easing", "surge", "hiring", "boost"}
_ECON_KEYWORDS_NEG = {"recession", "contraction", "weak", "slowdown", "rate hike", "tightening", "inflation", "layoffs", "tariff", "shutdown", "crisis"}
_INDUSTRY_FACTORS = {
    "Technology": {"drivers": ["AI adoption", "cloud spending", "chip demand", "digital transformation"], "risks": ["regulation", "antitrust", "ad spending cuts"]},
    "Healthcare": {"drivers": ["aging population", "drug approvals", "M&A"], "risks": ["drug pricing reform", "patent cliffs", "trial failures"]},
    "Financials": {"drivers": ["rate environment", "loan demand", "capital markets"], "risks": ["credit losses", "regulation", "rate cuts"]},
    "Energy": {"drivers": ["oil prices", "demand recovery", "LNG exports"], "risks": ["renewable transition", "oversupply", "regulation"]},
    "Consumer Discretionary": {"drivers": ["consumer confidence", "employment", "wage growth"], "risks": ["inflation", "consumer debt", "spending pullback"]},
    "Consumer Staples": {"drivers": ["pricing power", "volume stability", "defensive demand"], "risks": ["input costs", "private labels", "margin pressure"]},
    "Industrials": {"drivers": ["infrastructure spending", "reshoring", "defense budgets"], "risks": ["supply chain", "labor costs", "economic slowdown"]},
    "Materials": {"drivers": ["commodity prices", "construction demand", "EV materials"], "risks": ["oversupply", "China slowdown", "environmental regulation"]},
    "Utilities": {"drivers": ["rate base growth", "renewables transition", "stable demand"], "risks": ["rate cases", "regulation", "extreme weather costs"]},
    "Real Estate": {"drivers": ["population growth", "occupancy rates", "rent growth"], "risks": ["rising rates", "remote work", "overbuilding"]},
    "Communication Services": {"drivers": ["streaming growth", "digital ads", "5G", "content"], "risks": ["subscriber churn", "regulation", "competition"]},
}


def _score_text_impact(text: str) -> dict:
    """Score a piece of text for positive/negative economic signals."""
    lower = text.lower()
    pos = sum(1 for w in _ECON_KEYWORDS_POS if w in lower)
    neg = sum(1 for w in _ECON_KEYWORDS_NEG if w in lower)
    if pos > neg:
        return {"sentiment": "positive", "score": min(pos, 5)}
    elif neg > pos:
        return {"sentiment": "negative", "score": -min(neg, 5)}
    return {"sentiment": "neutral", "score": 0}


@app.get("/news-impact/{symbol}")
async def news_impact_analysis(symbol: str):
    """3-layer news impact: economy → industry → company, with earnings/cash flow projection."""
    try:
        stock = yf.Ticker(symbol.upper())
        info = stock.info
        sector = info.get("sector", "Unknown")
        industry = info.get("industry", "Unknown")
        company_name = info.get("shortName", symbol)
        revenue = info.get("totalRevenue", 0) or 0
        fcf = info.get("freeCashflow", 0) or 0
        eps = info.get("trailingEps", 0) or 0
        forward_eps = info.get("forwardEps", 0) or 0

        from news_integration import _get_news, _score_sentiment

        # ── Layer 1: Economy news ──
        econ_news_raw = _get_news("US economy GDP inflation interest rates Federal Reserve", 10)
        econ_articles = []
        econ_score_total = 0
        for art in econ_news_raw:
            impact = _score_text_impact(art.get("title", "") + " " + (art.get("summary", "") or ""))
            art["impact"] = impact
            art["sentiment"] = _score_sentiment(art.get("title", ""))
            econ_articles.append(art)
            econ_score_total += impact["score"]
        econ_sentiment = "positive" if econ_score_total > 1 else ("negative" if econ_score_total < -1 else "neutral")

        # ── Layer 2: Industry/Sector news ──
        industry_news_raw = _get_news(f"{sector} {industry} sector industry outlook", 10)
        industry_articles = []
        industry_score_total = 0
        for art in industry_news_raw:
            impact = _score_text_impact(art.get("title", "") + " " + (art.get("summary", "") or ""))
            art["impact"] = impact
            art["sentiment"] = _score_sentiment(art.get("title", ""))
            industry_articles.append(art)
            industry_score_total += impact["score"]
        industry_sentiment = "positive" if industry_score_total > 1 else ("negative" if industry_score_total < -1 else "neutral")

        # ── Layer 3: Company news ──
        company_news_raw = _get_news(f"{symbol} {company_name} stock", 10, symbol=symbol.upper())
        company_articles = []
        company_score_total = 0
        for art in company_news_raw:
            impact = _score_text_impact(art.get("title", "") + " " + (art.get("summary", "") or ""))
            art["impact"] = impact
            art["sentiment"] = _score_sentiment(art.get("title", ""))
            company_articles.append(art)
            company_score_total += impact["score"]
        company_sentiment = "positive" if company_score_total > 1 else ("negative" if company_score_total < -1 else "neutral")

        # ── Composite impact score (-100 to +100) ──
        # Weights: company 50%, industry 30%, economy 20%
        max_possible = 50  # 10 articles * 5 max score
        econ_norm = (econ_score_total / max_possible * 100) if max_possible else 0
        ind_norm = (industry_score_total / max_possible * 100) if max_possible else 0
        co_norm = (company_score_total / max_possible * 100) if max_possible else 0
        composite = round(co_norm * 0.5 + ind_norm * 0.3 + econ_norm * 0.2)
        composite = max(-100, min(100, composite))

        # ── Projected earnings impact ──
        # Translate composite score to earnings adjustment
        earnings_adj_pct = composite * 0.05  # 1% earnings change per 20 pts
        projected_eps = round(eps * (1 + earnings_adj_pct / 100), 2) if eps else None
        projected_fcf = round(fcf * (1 + earnings_adj_pct / 100)) if fcf else None
        projected_revenue = round(revenue * (1 + earnings_adj_pct / 200)) if revenue else None  # half as sensitive

        # ── Industry-specific factors ──
        ind_factors = _INDUSTRY_FACTORS.get(sector, {"drivers": ["Company-specific factors"], "risks": ["Market conditions"]})

        # Overall signal
        if composite > 20:
            signal = {"direction": "Tailwind", "strength": "Strong" if composite > 40 else "Moderate", "color": "green"}
        elif composite > -20:
            signal = {"direction": "Neutral", "strength": "Mixed signals", "color": "blue"}
        else:
            signal = {"direction": "Headwind", "strength": "Strong" if composite < -40 else "Moderate", "color": "red"}

        return {
            "symbol": symbol.upper(),
            "companyName": company_name,
            "sector": sector,
            "industry": industry,
            "compositeScore": composite,
            "signal": signal,
            "layers": {
                "economy": {
                    "sentiment": econ_sentiment,
                    "score": econ_score_total,
                    "articles": econ_articles[:5],
                    "articleCount": len(econ_articles),
                },
                "industry": {
                    "sentiment": industry_sentiment,
                    "score": industry_score_total,
                    "articles": industry_articles[:5],
                    "articleCount": len(industry_articles),
                    "sectorDrivers": ind_factors["drivers"],
                    "sectorRisks": ind_factors["risks"],
                },
                "company": {
                    "sentiment": company_sentiment,
                    "score": company_score_total,
                    "articles": company_articles[:5],
                    "articleCount": len(company_articles),
                },
            },
            "earningsImpact": {
                "adjustmentPct": round(earnings_adj_pct, 2),
                "currentEPS": eps,
                "forwardEPS": forward_eps,
                "projectedEPS": projected_eps,
                "currentFCF": fcf,
                "projectedFCF": projected_fcf,
                "currentRevenue": revenue,
                "projectedRevenue": projected_revenue,
            },
            "sectorFactors": ind_factors,
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        logger.error(f"Error in news impact for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ────────────────────────────────────────────────────────────────
#  TRANSACTION HISTORY — SQLite backed
# ────────────────────────────────────────────────────────────────

class TransactionRequest(BaseModel):
    symbol: str
    action: str  # "buy" or "sell"
    shares: float
    price: float
    date: Optional[str] = None
    notes: Optional[str] = None


@app.post("/transactions")
async def add_transaction_endpoint(req: TransactionRequest, request: Request):
    """Record a buy/sell transaction."""
    if req.action not in ("buy", "sell"):
        raise HTTPException(status_code=400, detail="action must be 'buy' or 'sell'")
    if req.shares <= 0 or req.price <= 0:
        raise HTTPException(status_code=400, detail="shares and price must be positive")

    user = await get_current_user(request)
    user_id = get_user_id(user)
    txn = db.add_transaction(user_id, req.symbol.upper(), req.action, req.shares, req.price, req.date, req.notes)
    return {"message": "Transaction recorded", "transaction": txn}


@app.get("/transactions")
async def get_transactions_endpoint(symbol: Optional[str] = None, request: Request = None):
    """Get transaction history, optionally filtered by symbol."""
    user = await get_current_user(request)
    user_id = get_user_id(user)
    txns = db.get_transactions(user_id, symbol)

    # Calculate per-symbol summary
    holdings: Dict[str, Any] = {}
    for t in txns:
        sym = t["symbol"]
        if sym not in holdings:
            holdings[sym] = {"totalShares": 0, "totalCost": 0, "realized": 0}
        if t["action"] == "buy":
            holdings[sym]["totalShares"] += t["shares"]
            holdings[sym]["totalCost"] += t["total"]
        else:
            holdings[sym]["totalShares"] -= t["shares"]
            holdings[sym]["realized"] += t["total"]

    summary = []
    for sym, h in holdings.items():
        avg_cost = h["totalCost"] / h["totalShares"] if h["totalShares"] > 0 else 0
        try:
            info = yf.Ticker(sym).info
            curr_price = info.get("currentPrice") or info.get("regularMarketPrice") or 0
        except Exception:
            curr_price = 0
        market_value = round(h["totalShares"] * curr_price, 2)
        unrealized = round(market_value - h["totalCost"], 2) if h["totalShares"] > 0 else 0
        summary.append({
            "symbol": sym,
            "shares": round(h["totalShares"], 4),
            "avgCostBasis": round(avg_cost, 2),
            "currentPrice": curr_price,
            "marketValue": market_value,
            "totalCost": round(h["totalCost"], 2),
            "unrealizedPL": unrealized,
            "unrealizedPLPct": round(unrealized / h["totalCost"] * 100, 1) if h["totalCost"] > 0 else 0,
            "realizedPL": round(h["realized"], 2),
        })

    return {
        "transactions": sorted(txns, key=lambda x: x.get("date", ""), reverse=True),
        "summary": summary,
        "totalTransactions": len(txns),
    }


@app.delete("/transactions/{txn_id}")
async def delete_transaction_endpoint(txn_id: int, request: Request):
    """Delete a transaction by ID."""
    user = await get_current_user(request)
    user_id = get_user_id(user)
    if not db.delete_transaction(user_id, txn_id):
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted"}


# ── Financial Statement Upload & DCF/Growth Analysis ──────────────

ALLOWED_EXTENSIONS = {".csv"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


def _parse_csv_financial_data(content: str) -> Dict[str, Any]:
    """Parse a CSV financial statement into structured data.
    
    Supports two formats:
    1. Row-per-metric: Column A = metric name, remaining columns = yearly values
       e.g.  Revenue, 100000, 120000, 150000
    2. Column-per-metric: Header row has metric names, each row is a year
    """
    reader = csv.reader(io.StringIO(content))
    rows = [r for r in reader if any(cell.strip() for cell in r)]
    if len(rows) < 2:
        raise HTTPException(status_code=400, detail="CSV must have at least a header and one data row")

    # Detect orientation: if first column of row 1 looks like a number/year, it's column-per-metric
    header = [h.strip() for h in rows[0]]

    def _try_float(s: str) -> Optional[float]:
        s = s.strip().replace(",", "").replace("$", "").replace("(", "-").replace(")", "")
        try:
            return float(s)
        except (ValueError, TypeError):
            return None

    # Heuristic: if header[0] is a number (year), treat as column-per-metric
    if _try_float(header[0]) is not None or header[0].lower() in ("year", "period", "date"):
        # Column-per-metric: header = [Year, Revenue, NetIncome, …]
        years_data = []
        for row in rows[1:]:
            entry: Dict[str, Any] = {}
            for i, col_name in enumerate(header):
                val = row[i].strip() if i < len(row) else ""
                num = _try_float(val)
                entry[col_name] = num if num is not None else val
            years_data.append(entry)
        return {"format": "column_per_metric", "periods": years_data, "metrics": header}
    else:
        # Row-per-metric: each row = [MetricName, val1, val2, …]
        periods = header[1:]  # e.g. ["2021", "2022", "2023"]
        metrics: Dict[str, List[Optional[float]]] = {}
        for row in rows[1:]:
            name = row[0].strip() if row else ""
            values = [_try_float(c) for c in row[1:]]
            if name:
                metrics[name] = values
        return {"format": "row_per_metric", "periods": periods, "metrics": metrics}


# Canonical metric name lookup
_METRIC_ALIASES: Dict[str, List[str]] = {
    "revenue": ["revenue", "total revenue", "total_revenue", "sales", "net sales", "net_sales", "total sales"],
    "net_income": ["net income", "net_income", "earnings", "net earnings", "profit", "net profit"],
    "free_cash_flow": ["free cash flow", "free_cash_flow", "fcf"],
    "operating_income": ["operating income", "operating_income", "ebit", "operating profit"],
    "total_debt": ["total debt", "total_debt", "long term debt", "long_term_debt", "debt"],
    "cash": ["cash", "cash and equivalents", "cash_and_equivalents", "total cash"],
    "shares_outstanding": ["shares outstanding", "shares_outstanding", "diluted shares", "diluted_shares", "shares"],
    "capex": ["capex", "capital expenditures", "capital_expenditures", "capital expenditure", "capex_abs"],
    "depreciation": ["depreciation", "depreciation and amortization", "d&a", "depreciation_and_amortization"],
    "total_assets": ["total assets", "total_assets"],
    "total_equity": ["total equity", "total_equity", "shareholders equity", "stockholders equity"],
    "operating_cash_flow": ["operating cash flow", "operating_cash_flow", "cash from operations"],
    "tax_rate": ["tax rate", "tax_rate", "effective tax rate"],
}


def _resolve_metric(parsed: Dict[str, Any], canonical: str) -> List[Optional[float]]:
    """Find a metric by canonical name or alias in parsed data."""
    aliases = _METRIC_ALIASES.get(canonical, [canonical])
    if parsed["format"] == "row_per_metric":
        for alias in aliases:
            for key, vals in parsed["metrics"].items():
                if key.lower().strip() == alias:
                    return vals
        return []
    else:
        # column_per_metric
        for alias in aliases:
            for metric_name in parsed["metrics"]:
                if metric_name.lower().strip() == alias:
                    return [p.get(metric_name) for p in parsed["periods"]]
        return []


def _compute_growth(values: List[Optional[float]]) -> Dict[str, Any]:
    """Compute YoY growth rates and CAGR from a list of period values (oldest first)."""
    clean = [(i, v) for i, v in enumerate(values) if v is not None and v != 0]
    yoy = []
    for j in range(1, len(clean)):
        prev_val = clean[j - 1][1]
        cur_val = clean[j][1]
        if prev_val and prev_val != 0:
            yoy.append(round((cur_val - prev_val) / abs(prev_val) * 100, 2))
    cagr = None
    if len(clean) >= 2:
        first_val, last_val = clean[0][1], clean[-1][1]
        n = clean[-1][0] - clean[0][0]
        if n > 0 and first_val > 0 and last_val > 0:
            cagr = round(((last_val / first_val) ** (1 / n) - 1) * 100, 2)
    return {"values": values, "yoy_growth_pct": yoy, "cagr_pct": cagr, "latest": clean[-1][1] if clean else None}


def _run_dcf_from_upload(parsed: Dict[str, Any], discount_rate: float = 0.10,
                          terminal_growth_rate: float = 0.03, years: int = 5) -> Dict[str, Any]:
    """Run a DCF valuation using uploaded financial statement data."""
    fcf_values = _resolve_metric(parsed, "free_cash_flow")
    # Fallback: operating_cash_flow - capex
    if not any(v for v in fcf_values if v is not None):
        ocf = _resolve_metric(parsed, "operating_cash_flow")
        capex = _resolve_metric(parsed, "capex")
        if ocf:
            fcf_values = []
            for i in range(len(ocf)):
                o = ocf[i] if i < len(ocf) else None
                c = abs(capex[i]) if (capex and i < len(capex) and capex[i] is not None) else 0
                fcf_values.append(round(o - c, 2) if o is not None else None)

    # Fallback: net_income + depreciation - capex
    if not any(v for v in fcf_values if v is not None):
        ni = _resolve_metric(parsed, "net_income")
        dep = _resolve_metric(parsed, "depreciation")
        capex = _resolve_metric(parsed, "capex")
        if ni and any(v for v in ni if v is not None):
            fcf_values = []
            for i in range(len(ni)):
                n = ni[i] if i < len(ni) else 0
                d = dep[i] if (dep and i < len(dep) and dep[i]) else 0
                c = abs(capex[i]) if (capex and i < len(capex) and capex[i]) else 0
                fcf_values.append(round((n or 0) + (d or 0) - c, 2))

    if not any(v for v in fcf_values if v is not None):
        return {"error": "Could not determine Free Cash Flow from uploaded data. Include FCF, Operating Cash Flow, or Net Income columns."}

    current_fcf = next((v for v in reversed(fcf_values) if v is not None), 0)
    if current_fcf <= 0:
        return {"error": f"Latest FCF is {current_fcf}. DCF requires positive free cash flow.", "current_fcf": current_fcf}

    # Historical FCF growth rate
    fcf_growth = _compute_growth(fcf_values)
    implied_growth = (fcf_growth["cagr_pct"] / 100) if fcf_growth["cagr_pct"] and fcf_growth["cagr_pct"] > 0 else 0.05

    projected_fcf = []
    for yr in range(1, years + 1):
        yr_growth = implied_growth * (0.9 ** (yr - 1))
        projected_fcf.append(round(current_fcf * ((1 + yr_growth) ** yr), 2))

    terminal_fcf = projected_fcf[-1] * (1 + terminal_growth_rate)
    terminal_value = terminal_fcf / (discount_rate - terminal_growth_rate)

    pv_fcf = [round(f / ((1 + discount_rate) ** yr), 2) for yr, f in enumerate(projected_fcf, 1)]
    pv_terminal = round(terminal_value / ((1 + discount_rate) ** years), 2)

    enterprise_value = round(sum(pv_fcf) + pv_terminal, 2)

    # Equity value if debt/cash available
    cash_vals = _resolve_metric(parsed, "cash")
    debt_vals = _resolve_metric(parsed, "total_debt")
    shares_vals = _resolve_metric(parsed, "shares_outstanding")

    total_cash = next((v for v in reversed(cash_vals) if v is not None), 0) if cash_vals else 0
    total_debt = next((v for v in reversed(debt_vals) if v is not None), 0) if debt_vals else 0
    shares = next((v for v in reversed(shares_vals) if v is not None), 0) if shares_vals else 0

    equity_value = round(enterprise_value + total_cash - total_debt, 2)
    per_share = round(equity_value / shares, 2) if shares and shares > 0 else None

    return {
        "current_fcf": current_fcf,
        "implied_growth_rate": round(implied_growth * 100, 2),
        "projected_fcf": projected_fcf,
        "pv_fcf": pv_fcf,
        "terminal_value": round(terminal_value, 2),
        "pv_terminal": pv_terminal,
        "enterprise_value": enterprise_value,
        "equity_value": equity_value,
        "intrinsic_value_per_share": per_share,
        "shares_outstanding": shares,
        "total_cash": total_cash,
        "total_debt": total_debt,
        "assumptions": {
            "discount_rate": discount_rate,
            "terminal_growth_rate": terminal_growth_rate,
            "years_projected": years,
        },
    }


@app.post("/financial-upload")
async def upload_financial_statement(
    file: UploadFile = File(...),
    company_name: str = Form(...),
    symbol: str = Form(""),
    discount_rate: float = Form(0.10),
    terminal_growth_rate: float = Form(0.03),
    request: Request = None,
):
    """Upload a CSV financial statement, run DCF valuation and growth analysis."""
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Only CSV files are supported. Got: {ext}")

    raw = await file.read()
    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5 MB)")

    content = raw.decode("utf-8-sig", errors="replace")
    parsed = _parse_csv_financial_data(content)

    # DCF
    dcf_result = _run_dcf_from_upload(parsed, discount_rate, terminal_growth_rate)

    # Growth analysis for key metrics
    growth_metrics = {}
    for metric in ["revenue", "net_income", "free_cash_flow", "operating_income", "total_assets", "total_equity"]:
        vals = _resolve_metric(parsed, metric)
        if vals and any(v for v in vals if v is not None):
            growth_metrics[metric] = _compute_growth(vals)

    # Persist
    user_id = 1
    try:
        user = await get_current_user(request)
        user_id = get_user_id(user)
    except Exception:
        pass

    upload_id = db.save_financial_upload(
        user_id=user_id,
        company_name=company_name,
        symbol=symbol or None,
        statement_type="financial_statement",
        data_json=json.dumps(parsed),
        dcf_result_json=json.dumps(dcf_result),
        growth_json=json.dumps(growth_metrics),
    )

    return {
        "id": upload_id,
        "company_name": company_name,
        "symbol": symbol,
        "dcf": dcf_result,
        "growth": growth_metrics,
        "periods": parsed.get("periods", [p.get(parsed["metrics"][0]) for p in parsed.get("periods", [])] if parsed["format"] == "column_per_metric" else []),
    }


@app.get("/financial-uploads")
async def list_financial_uploads(request: Request):
    """List user's uploaded financial statements."""
    user_id = 1
    try:
        user = await get_current_user(request)
        user_id = get_user_id(user)
    except Exception:
        pass
    uploads = db.get_financial_uploads(user_id)
    results = []
    for u in uploads:
        results.append({
            "id": u["id"],
            "company_name": u["company_name"],
            "symbol": u["symbol"],
            "statement_type": u["statement_type"],
            "created_at": u["created_at"],
            "has_dcf": u["dcf_result_json"] is not None,
            "has_growth": u["growth_json"] is not None,
        })
    return {"uploads": results}


@app.get("/financial-uploads/{upload_id}")
async def get_financial_upload_detail(upload_id: int, request: Request):
    """Get full detail of an uploaded financial statement including DCF and growth results."""
    user_id = 1
    try:
        user = await get_current_user(request)
        user_id = get_user_id(user)
    except Exception:
        pass
    record = db.get_financial_upload(upload_id, user_id)
    if not record:
        raise HTTPException(status_code=404, detail="Upload not found")
    return {
        "id": record["id"],
        "company_name": record["company_name"],
        "symbol": record["symbol"],
        "statement_type": record["statement_type"],
        "created_at": record["created_at"],
        "data": json.loads(record["data_json"]) if record["data_json"] else None,
        "dcf": json.loads(record["dcf_result_json"]) if record["dcf_result_json"] else None,
        "growth": json.loads(record["growth_json"]) if record["growth_json"] else None,
    }


@app.delete("/financial-uploads/{upload_id}")
async def delete_financial_upload_endpoint(upload_id: int, request: Request):
    """Delete an uploaded financial statement."""
    user_id = 1
    try:
        user = await get_current_user(request)
        user_id = get_user_id(user)
    except Exception:
        pass
    if not db.delete_financial_upload(upload_id, user_id):
        raise HTTPException(status_code=404, detail="Upload not found")
    return {"message": "Upload deleted"}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)