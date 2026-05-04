"""
Daily Briefing, Earnings Calendar & Stock Recommendations
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional
import yfinance as yf
import datetime
import logging
from auth import get_current_user, get_user_id
import database as db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["briefing"])

MAJOR_INDICES = {
    "SPY": "S&P 500",
    "QQQ": "NASDAQ 100",
    "DIA": "Dow Jones",
    "IWM": "Russell 2000",
}


@router.get("/daily-briefing")
async def daily_briefing(user: dict = Depends(get_current_user)):
    """Morning market briefing with portfolio overnight change."""
    uid = get_user_id(user)
    conn = db._get_conn()

    # Market indices
    indices = []
    for symbol, name in MAJOR_INDICES.items():
        try:
            t = yf.Ticker(symbol)
            info = t.fast_info
            price = float(info.get("lastPrice", 0) or info.get("last_price", 0))
            prev = float(info.get("previousClose", 0) or info.get("previous_close", 0))
            change = price - prev if prev else 0
            change_pct = (change / prev * 100) if prev else 0
            indices.append({"symbol": symbol, "name": name, "price": round(price, 2),
                            "change": round(change, 2), "change_pct": round(change_pct, 2)})
        except Exception:
            pass

    # Portfolio overnight change
    holdings = conn.execute("SELECT symbol, shares, cost_basis FROM portfolio WHERE user_id = ? AND shares > 0", (uid,)).fetchall()
    portfolio_value = 0
    portfolio_prev = 0
    top_movers = []
    for h in holdings:
        try:
            t = yf.Ticker(h["symbol"])
            info = t.fast_info
            price = float(info.get("lastPrice", 0) or info.get("last_price", 0))
            prev = float(info.get("previousClose", 0) or info.get("previous_close", 0))
            portfolio_value += price * h["shares"]
            portfolio_prev += prev * h["shares"]
            change_pct = ((price - prev) / prev * 100) if prev else 0
            top_movers.append({"symbol": h["symbol"], "change_pct": round(change_pct, 2), "price": round(price, 2)})
        except Exception:
            pass

    top_movers.sort(key=lambda x: abs(x["change_pct"]), reverse=True)
    portfolio_change = portfolio_value - portfolio_prev
    portfolio_change_pct = (portfolio_change / portfolio_prev * 100) if portfolio_prev else 0

    # Market sentiment
    avg_change = sum(i["change_pct"] for i in indices) / len(indices) if indices else 0
    sentiment = "Bullish" if avg_change > 0.3 else "Bearish" if avg_change < -0.3 else "Neutral"

    # Trending sectors
    sector_etfs = {"XLK": "Technology", "XLF": "Financials", "XLE": "Energy", "XLV": "Healthcare", "XLI": "Industrials"}
    sectors = []
    for sym, name in list(sector_etfs.items())[:3]:
        try:
            t = yf.Ticker(sym)
            info = t.fast_info
            price = float(info.get("lastPrice", 0) or info.get("last_price", 0))
            prev = float(info.get("previousClose", 0) or info.get("previous_close", 0))
            pct = ((price - prev) / prev * 100) if prev else 0
            sectors.append({"name": name, "change_pct": round(pct, 2)})
        except Exception:
            pass

    now = datetime.datetime.now()
    return {
        "date": now.strftime("%A, %B %d, %Y"),
        "greeting": "Good morning" if now.hour < 12 else "Good afternoon" if now.hour < 18 else "Good evening",
        "sentiment": sentiment,
        "indices": indices,
        "portfolio": {
            "total_value": round(portfolio_value, 2),
            "overnight_change": round(portfolio_change, 2),
            "overnight_change_pct": round(portfolio_change_pct, 2),
        },
        "top_movers": top_movers[:5],
        "sectors": sectors,
    }


@router.get("/earnings-calendar")
async def earnings_calendar(
    days: int = Query(default=14, ge=1, le=90),
    user: dict = Depends(get_current_user)
):
    """Upcoming earnings for watchlist/portfolio stocks."""
    uid = get_user_id(user)
    conn = db._get_conn()

    # Get user's stocks (portfolio + watchlist via price_alerts)
    portfolio_symbols = [r["symbol"] for r in conn.execute(
        "SELECT DISTINCT symbol FROM portfolio WHERE user_id = ? AND shares > 0", (uid,)
    ).fetchall()]
    alert_symbols = [r["symbol"] for r in conn.execute(
        "SELECT DISTINCT symbol FROM price_alerts WHERE user_id = ?", (uid,)
    ).fetchall()]
    all_symbols = list(set(portfolio_symbols + alert_symbols))

    if not all_symbols:
        all_symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "JPM", "V", "JNJ"]

    today = datetime.date.today()
    end_date = today + datetime.timedelta(days=days)
    earnings = []

    for sym in all_symbols:
        try:
            t = yf.Ticker(sym)
            cal = t.calendar
            if cal is not None and not (hasattr(cal, 'empty') and cal.empty):
                if isinstance(cal, dict):
                    ed = cal.get("Earnings Date")
                    if ed:
                        dates = ed if isinstance(ed, list) else [ed]
                        for d in dates:
                            if hasattr(d, 'date'):
                                d = d.date()
                            elif isinstance(d, str):
                                d = datetime.datetime.strptime(d[:10], "%Y-%m-%d").date()
                            if today <= d <= end_date:
                                info = t.fast_info
                                price = float(info.get("lastPrice", 0) or info.get("last_price", 0))
                                in_portfolio = sym in portfolio_symbols
                                earnings.append({
                                    "symbol": sym,
                                    "date": str(d),
                                    "days_until": (d - today).days,
                                    "price": round(price, 2),
                                    "in_portfolio": in_portfolio,
                                })
        except Exception as e:
            logger.debug(f"Earnings lookup failed for {sym}: {e}")

    earnings.sort(key=lambda x: x["date"])

    return {"earnings": earnings, "period_days": days, "total": len(earnings)}


@router.get("/recommendations")
async def get_recommendations(user: dict = Depends(get_current_user)):
    """Personalized stock recommendations based on portfolio and watchlist."""
    uid = get_user_id(user)
    conn = db._get_conn()

    # Get user's current holdings
    holdings = [r["symbol"] for r in conn.execute(
        "SELECT DISTINCT symbol FROM portfolio WHERE user_id = ? AND shares > 0", (uid,)
    ).fetchall()]

    # Get sectors of current holdings
    user_sectors = set()
    for sym in holdings[:5]:
        try:
            t = yf.Ticker(sym)
            info = t.info
            sector = info.get("sector", "")
            if sector:
                user_sectors.add(sector)
        except Exception:
            pass

    # Curated recommendations by sector
    sector_recs = {
        "Technology": ["NVDA", "AMD", "CRM", "ADBE", "NOW", "PANW", "SNOW"],
        "Healthcare": ["UNH", "LLY", "ABBV", "TMO", "ISRG", "DXCM", "VEEV"],
        "Financial Services": ["V", "MA", "GS", "BLK", "SCHW", "ICE", "COIN"],
        "Consumer Cyclical": ["AMZN", "TSLA", "NKE", "SBUX", "LULU", "ABNB", "BKNG"],
        "Communication Services": ["GOOGL", "META", "NFLX", "DIS", "SPOT", "RBLX"],
        "Industrials": ["CAT", "HON", "GE", "RTX", "LMT", "DE", "UPS"],
        "Energy": ["XOM", "CVX", "COP", "SLB", "EOG", "OXY"],
    }

    recommendations = []
    # Add from user's sectors
    for sector in user_sectors:
        for rec_sector, stocks in sector_recs.items():
            if sector.lower() in rec_sector.lower() or rec_sector.lower() in sector.lower():
                for sym in stocks:
                    if sym not in holdings and len(recommendations) < 10:
                        try:
                            t = yf.Ticker(sym)
                            info = t.fast_info
                            price = float(info.get("lastPrice", 0) or info.get("last_price", 0))
                            mc = float(info.get("marketCap", 0) or info.get("market_cap", 0))
                            recommendations.append({
                                "symbol": sym,
                                "reason": f"Because you invest in {sector}",
                                "price": round(price, 2),
                                "market_cap": mc,
                            })
                        except Exception:
                            pass

    # Fill with popular picks if not enough
    popular = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "BRK-B", "JPM", "V"]
    for sym in popular:
        if sym not in holdings and len(recommendations) < 10:
            if not any(r["symbol"] == sym for r in recommendations):
                try:
                    t = yf.Ticker(sym)
                    info = t.fast_info
                    price = float(info.get("lastPrice", 0) or info.get("last_price", 0))
                    recommendations.append({
                        "symbol": sym,
                        "reason": "Popular among investors",
                        "price": round(price, 2),
                        "market_cap": 0,
                    })
                except Exception:
                    pass

    return {"recommendations": recommendations[:10]}
