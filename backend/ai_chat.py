"""
AI Chat Assistant & Options Calculator endpoints
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
import yfinance as yf
import math
import logging
from auth import get_current_user, get_user_id
import database as db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["ai-chat"])


class ChatMessage(BaseModel):
    message: str
    symbol: Optional[str] = None


@router.post("/ai-chat")
async def ai_chat(msg: ChatMessage, user: dict = Depends(get_current_user)):
    """AI-powered stock analysis chat. Uses real data to answer questions."""
    uid = get_user_id(user)
    question = msg.message.lower().strip()
    symbol = msg.symbol

    # Extract symbol from question if not provided
    if not symbol:
        words = question.upper().split()
        for w in words:
            w_clean = w.strip("?.,!\"'")
            if 2 <= len(w_clean) <= 5 and w_clean.isalpha():
                try:
                    t = yf.Ticker(w_clean)
                    p = t.fast_info.get("lastPrice") or t.fast_info.get("last_price")
                    if p and float(p) > 0:
                        symbol = w_clean
                        break
                except Exception:
                    pass

    # Portfolio context
    conn = db._get_conn()
    holdings = conn.execute(
        "SELECT symbol, shares, cost_basis FROM portfolio WHERE user_id = ? AND shares > 0", (uid,)
    ).fetchall()
    portfolio_symbols = [h["symbol"] for h in holdings]

    # Route question type
    if any(kw in question for kw in ["should i buy", "worth buying", "good buy", "buy or sell"]):
        return _buy_sell_analysis(symbol, holdings)
    elif any(kw in question for kw in ["portfolio", "my stocks", "my holdings"]):
        return _portfolio_summary(holdings)
    elif any(kw in question for kw in ["compare", "versus", " vs "]):
        return _compare_stocks(question, symbol)
    elif any(kw in question for kw in ["dividend", "yield", "payout"]):
        return _dividend_analysis(symbol)
    elif any(kw in question for kw in ["earnings", "revenue", "profit", "financials"]):
        return _financials_summary(symbol)
    elif any(kw in question for kw in ["risk", "volatility", "beta"]):
        return _risk_analysis(symbol)
    elif symbol:
        return _general_stock_info(symbol)
    else:
        return {
            "response": "I can help you with stock analysis! Try asking:\n\n"
                        "• \"Should I buy AAPL?\"\n"
                        "• \"Compare MSFT vs GOOGL\"\n"
                        "• \"What are NVDA's dividends?\"\n"
                        "• \"How risky is TSLA?\"\n"
                        "• \"How is my portfolio doing?\"\n"
                        "• \"Tell me about AMD\"",
            "type": "help",
            "data": None,
        }


def _buy_sell_analysis(symbol: str, holdings):
    if not symbol:
        return {"response": "Which stock are you asking about? Please include a ticker symbol.", "type": "clarification", "data": None}
    try:
        t = yf.Ticker(symbol)
        info = t.info
        fi = t.fast_info
        price = float(fi.get("lastPrice", 0) or fi.get("last_price", 0))
        pe = info.get("trailingPE") or info.get("forwardPE")
        target = info.get("targetMeanPrice")
        rec = info.get("recommendationKey", "none")
        beta = info.get("beta", 1)
        div_yield = info.get("dividendYield", 0)
        high52 = float(fi.get("yearHigh", 0) or fi.get("year_high", 0))
        low52 = float(fi.get("yearLow", 0) or fi.get("year_low", 0))

        signals = []
        score = 50  # neutral start

        if target and price:
            upside = ((target - price) / price) * 100
            if upside > 15:
                signals.append(f"📈 Analyst target ${target:.0f} suggests {upside:.0f}% upside")
                score += 15
            elif upside < -10:
                signals.append(f"📉 Analyst target ${target:.0f} suggests {abs(upside):.0f}% downside")
                score -= 15

        if pe:
            if pe < 15:
                signals.append(f"💰 P/E of {pe:.1f} is relatively cheap")
                score += 10
            elif pe > 40:
                signals.append(f"⚠️ P/E of {pe:.1f} is expensive")
                score -= 10

        if beta and beta > 1.5:
            signals.append(f"🎢 High beta ({beta:.2f}) — this stock is volatile")
            score -= 5
        elif beta and beta < 0.8:
            signals.append(f"🛡️ Low beta ({beta:.2f}) — relatively stable")
            score += 5

        if div_yield and div_yield > 0.02:
            signals.append(f"💵 Dividend yield: {div_yield*100:.1f}%")
            score += 5

        # Price relative to 52-week range
        if high52 and low52:
            range_pos = (price - low52) / (high52 - low52) * 100 if high52 != low52 else 50
            if range_pos < 30:
                signals.append(f"📊 Trading near 52-week lows ({range_pos:.0f}% of range)")
                score += 5
            elif range_pos > 85:
                signals.append(f"📊 Near 52-week highs ({range_pos:.0f}% of range)")
                score -= 5

        rec_map = {"strong_buy": "Strong Buy", "buy": "Buy", "hold": "Hold", "sell": "Sell", "strong_sell": "Strong Sell"}
        rec_label = rec_map.get(rec, rec.replace("_", " ").title())

        verdict = "🟢 Looks promising" if score >= 65 else "🟡 Mixed signals — research more" if score >= 40 else "🔴 Proceed with caution"

        name = info.get("shortName", symbol)
        response = f"**{name} ({symbol}) — ${price:.2f}**\n\n"
        response += f"Wall Street says: **{rec_label}**\n\n"
        response += "**Key Signals:**\n" + "\n".join(f"  {s}" for s in signals) + "\n\n"
        response += f"**My Take:** {verdict} (Score: {score}/100)"

        owned = any(h["symbol"] == symbol for h in holdings)
        if owned:
            h = next(x for x in holdings if x["symbol"] == symbol)
            gain = (price - h["cost_basis"]) / h["cost_basis"] * 100 if h["cost_basis"] else 0
            response += f"\n\n📌 You own {h['shares']:.0f} shares at ${h['cost_basis']:.2f} ({gain:+.1f}%)"

        return {"response": response, "type": "analysis", "data": {"score": score, "symbol": symbol, "price": price}}
    except Exception as e:
        return {"response": f"Couldn't analyze {symbol}: {str(e)}", "type": "error", "data": None}


def _portfolio_summary(holdings):
    if not holdings:
        return {"response": "You don't have any holdings yet. Start by making your first trade!", "type": "portfolio", "data": None}

    total_value = 0
    total_cost = 0
    details = []
    for h in holdings:
        try:
            t = yf.Ticker(h["symbol"])
            price = float(t.fast_info.get("lastPrice", 0) or t.fast_info.get("last_price", 0))
            value = price * h["shares"]
            cost = h["cost_basis"] * h["shares"]
            gain_pct = ((price - h["cost_basis"]) / h["cost_basis"] * 100) if h["cost_basis"] else 0
            total_value += value
            total_cost += cost
            details.append({"symbol": h["symbol"], "value": value, "gain_pct": gain_pct})
        except Exception:
            pass

    details.sort(key=lambda x: x["gain_pct"], reverse=True)
    total_gain = ((total_value - total_cost) / total_cost * 100) if total_cost else 0

    icon = "📈" if total_gain >= 0 else "📉"
    response = f"**Your Portfolio: ${total_value:,.2f}** {icon} {total_gain:+.1f}%\n\n"
    response += "**Holdings:**\n"
    for d in details:
        emoji = "🟢" if d["gain_pct"] >= 0 else "🔴"
        response += f"  {emoji} {d['symbol']}: ${d['value']:,.0f} ({d['gain_pct']:+.1f}%)\n"

    best = details[0] if details else None
    worst = details[-1] if details else None
    if best:
        response += f"\n🏆 Best: {best['symbol']} ({best['gain_pct']:+.1f}%)"
    if worst and worst != best:
        response += f"\n⚠️ Worst: {worst['symbol']} ({worst['gain_pct']:+.1f}%)"

    return {"response": response, "type": "portfolio", "data": {"total_value": total_value, "total_gain_pct": total_gain}}


def _compare_stocks(question: str, symbol: str):
    words = question.upper().split()
    symbols = []
    for w in words:
        w_clean = w.strip("?.,!\"'")
        if 2 <= len(w_clean) <= 5 and w_clean.isalpha() and w_clean not in ["COMPARE", "AND", "THE", "SHOULD", "WHICH", "BETWEEN", "VS", "VERSUS", "OR"]:
            symbols.append(w_clean)
    symbols = list(dict.fromkeys(symbols))[:2]
    if len(symbols) < 2:
        return {"response": "Please specify two stocks to compare, e.g. 'Compare AAPL vs MSFT'", "type": "clarification", "data": None}

    results = []
    for s in symbols:
        try:
            t = yf.Ticker(s)
            info = t.info
            fi = t.fast_info
            results.append({
                "symbol": s,
                "name": info.get("shortName", s),
                "price": float(fi.get("lastPrice", 0) or fi.get("last_price", 0)),
                "pe": info.get("trailingPE"),
                "market_cap": float(fi.get("marketCap", 0) or fi.get("market_cap", 0)),
                "dividend_yield": info.get("dividendYield", 0),
                "beta": info.get("beta"),
                "target": info.get("targetMeanPrice"),
            })
        except Exception:
            pass

    if len(results) < 2:
        return {"response": "Couldn't fetch data for both stocks.", "type": "error", "data": None}

    a, b = results
    response = f"**{a['name']} vs {b['name']}**\n\n"
    response += f"| Metric | {a['symbol']} | {b['symbol']} |\n|---|---|---|\n"
    response += f"| Price | ${a['price']:.2f} | ${b['price']:.2f} |\n"
    pe_a = f"{a['pe']:.1f}" if a['pe'] else "N/A"
    pe_b = f"{b['pe']:.1f}" if b['pe'] else "N/A"
    response += f"| P/E | {pe_a} | {pe_b} |\n"
    response += f"| Market Cap | ${a['market_cap']/1e9:.1f}B | ${b['market_cap']/1e9:.1f}B |\n"
    beta_a = f"{a['beta']:.2f}" if a['beta'] else "N/A"
    beta_b = f"{b['beta']:.2f}" if b['beta'] else "N/A"
    response += f"| Beta | {beta_a} | {beta_b} |\n"

    return {"response": response, "type": "comparison", "data": {"stocks": results}}


def _dividend_analysis(symbol: str):
    if not symbol:
        return {"response": "Which stock's dividends? Include a ticker.", "type": "clarification", "data": None}
    try:
        t = yf.Ticker(symbol)
        info = t.info
        div_yield = info.get("dividendYield", 0)
        div_rate = info.get("dividendRate", 0)
        payout = info.get("payoutRatio", 0)
        ex_date = info.get("exDividendDate")

        if not div_yield or div_yield == 0:
            return {"response": f"{symbol} doesn't currently pay dividends.", "type": "info", "data": None}

        response = f"**{symbol} Dividend Analysis**\n\n"
        response += f"💵 Yield: {div_yield*100:.2f}%\n"
        response += f"💰 Annual Rate: ${div_rate:.2f}/share\n"
        if payout:
            response += f"📊 Payout Ratio: {payout*100:.1f}%\n"
            if payout > 0.8:
                response += "⚠️ High payout ratio — sustainability risk\n"
            elif payout < 0.5:
                response += "✅ Conservative payout — room to grow\n"

        return {"response": response, "type": "dividend", "data": {"yield": div_yield, "rate": div_rate}}
    except Exception as e:
        return {"response": f"Couldn't get dividend data for {symbol}.", "type": "error", "data": None}


def _financials_summary(symbol: str):
    if not symbol:
        return {"response": "Which stock? Include a ticker.", "type": "clarification", "data": None}
    try:
        t = yf.Ticker(symbol)
        info = t.info
        name = info.get("shortName", symbol)
        revenue = info.get("totalRevenue", 0)
        profit = info.get("netIncomeToCommon", 0)
        margin = info.get("profitMargins", 0)
        growth = info.get("revenueGrowth", 0)

        response = f"**{name} Financials**\n\n"
        if revenue:
            response += f"💰 Revenue: ${revenue/1e9:.1f}B\n"
        if profit:
            response += f"📈 Net Income: ${profit/1e9:.1f}B\n"
        if margin:
            response += f"📊 Profit Margin: {margin*100:.1f}%\n"
        if growth:
            response += f"🚀 Revenue Growth: {growth*100:.1f}%\n"

        return {"response": response, "type": "financials", "data": None}
    except Exception:
        return {"response": f"Couldn't fetch financials for {symbol}.", "type": "error", "data": None}


def _risk_analysis(symbol: str):
    if not symbol:
        return {"response": "Which stock? Include a ticker.", "type": "clarification", "data": None}
    try:
        t = yf.Ticker(symbol)
        info = t.info
        fi = t.fast_info
        beta = info.get("beta", 1)
        high52 = float(fi.get("yearHigh", 0) or fi.get("year_high", 0))
        low52 = float(fi.get("yearLow", 0) or fi.get("year_low", 0))
        price = float(fi.get("lastPrice", 0) or fi.get("last_price", 0))

        response = f"**{symbol} Risk Profile**\n\n"
        if beta:
            risk_level = "High" if beta > 1.5 else "Medium" if beta > 0.8 else "Low"
            response += f"📊 Beta: {beta:.2f} ({risk_level} volatility)\n"
        if high52 and low52:
            range_val = ((price - low52) / (high52 - low52) * 100) if high52 != low52 else 50
            response += f"📈 52-Week Range: ${low52:.2f} — ${high52:.2f}\n"
            response += f"📍 Position: {range_val:.0f}% of range\n"
            drawdown = ((price - high52) / high52 * 100) if high52 else 0
            if drawdown < -20:
                response += f"⚠️ Down {abs(drawdown):.0f}% from 52-week high\n"

        return {"response": response, "type": "risk", "data": {"beta": beta}}
    except Exception:
        return {"response": f"Couldn't analyze risk for {symbol}.", "type": "error", "data": None}


def _general_stock_info(symbol: str):
    try:
        t = yf.Ticker(symbol)
        info = t.info
        fi = t.fast_info
        price = float(fi.get("lastPrice", 0) or fi.get("last_price", 0))
        name = info.get("shortName", symbol)
        sector = info.get("sector", "Unknown")
        mc = float(fi.get("marketCap", 0) or fi.get("market_cap", 0))
        pe = info.get("trailingPE")
        summary = info.get("longBusinessSummary", "")[:200]

        response = f"**{name} ({symbol}) — ${price:.2f}**\n\n"
        response += f"🏢 Sector: {sector}\n"
        response += f"💰 Market Cap: ${mc/1e9:.1f}B\n"
        if pe:
            response += f"📊 P/E Ratio: {pe:.1f}\n"
        if summary:
            response += f"\n{summary}..."

        return {"response": response, "type": "info", "data": {"symbol": symbol, "price": price}}
    except Exception:
        return {"response": f"Couldn't find data for {symbol}.", "type": "error", "data": None}


# ── Options Calculator ──
class OptionsCalcRequest(BaseModel):
    symbol: str
    option_type: str = "call"  # call or put
    strike_price: float
    premium: float
    contracts: int = 1
    expiry_days: int = 30


@router.post("/options-calculator")
async def calculate_options(req: OptionsCalcRequest, user: dict = Depends(get_current_user)):
    """Calculate options profit/loss scenarios."""
    try:
        t = yf.Ticker(req.symbol)
        fi = t.fast_info
        current_price = float(fi.get("lastPrice", 0) or fi.get("last_price", 0))

        shares_per_contract = 100
        total_contracts = req.contracts
        total_premium_paid = req.premium * shares_per_contract * total_contracts

        scenarios = []
        # Calculate P/L at various price points
        price_range = current_price * 0.3
        for pct in [-20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30]:
            test_price = current_price * (1 + pct / 100)

            if req.option_type == "call":
                intrinsic = max(0, test_price - req.strike_price)
            else:
                intrinsic = max(0, req.strike_price - test_price)

            profit = (intrinsic * shares_per_contract * total_contracts) - total_premium_paid
            roi = (profit / total_premium_paid * 100) if total_premium_paid else 0

            scenarios.append({
                "price": round(test_price, 2),
                "price_change_pct": pct,
                "intrinsic_value": round(intrinsic, 2),
                "profit_loss": round(profit, 2),
                "roi_pct": round(roi, 1),
            })

        # Key metrics
        if req.option_type == "call":
            breakeven = req.strike_price + req.premium
        else:
            breakeven = req.strike_price - req.premium

        max_loss = -total_premium_paid
        itm = current_price > req.strike_price if req.option_type == "call" else current_price < req.strike_price

        return {
            "symbol": req.symbol,
            "current_price": round(current_price, 2),
            "option_type": req.option_type,
            "strike_price": req.strike_price,
            "premium": req.premium,
            "contracts": req.contracts,
            "total_premium": round(total_premium_paid, 2),
            "breakeven": round(breakeven, 2),
            "max_loss": round(max_loss, 2),
            "in_the_money": itm,
            "scenarios": scenarios,
        }
    except Exception as e:
        logger.error(f"Options calc error: {e}")
        return {"error": str(e)}
