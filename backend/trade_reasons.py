"""
Trade Reasons Module
Tracks why users buy and sell stocks — crowd intelligence for future analysis.
Backed by SQLite.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import logging
import database as db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/trade-reasons", tags=["trade-reasons"])

# ── Predefined reason tags ────────────────────────────────────────
BUY_REASONS = [
    "Undervalued (fundamentals)",
    "Strong earnings growth",
    "Dividend income",
    "Technical breakout",
    "Sector rotation / macro trend",
    "Insider buying / institutional interest",
    "Product launch / catalyst",
    "Long-term hold conviction",
    "Analyst upgrade",
    "Other",
]

SELL_REASONS = [
    "Overvalued (fundamentals)",
    "Earnings miss / guidance cut",
    "Hit price target / take profits",
    "Technical breakdown",
    "Sector rotation out",
    "Insider selling / institutional exit",
    "Regulatory / legal risk",
    "Need cash / rebalance",
    "Analyst downgrade",
    "Other",
]


# ── Models ────────────────────────────────────────────────────────

class TradeReasonSubmit(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=10)
    action: Literal["buy", "sell"]
    reasons: List[str] = Field(..., min_length=1, max_length=5)
    note: Optional[str] = Field(None, max_length=280)
    confidence: Optional[int] = Field(None, ge=1, le=5)


# ── Endpoints ─────────────────────────────────────────────────────

@router.get("/tags")
async def get_reason_tags():
    """Return the predefined buy/sell reason tags."""
    return {"buy_reasons": BUY_REASONS, "sell_reasons": SELL_REASONS}


@router.post("/submit")
async def submit_trade_reason(body: TradeReasonSubmit):
    """Record why a user is buying or selling a stock."""
    entry = db.add_trade_reason(
        symbol=body.symbol.upper(),
        action=body.action,
        reasons=body.reasons,
        note=body.note,
        confidence=body.confidence,
    )
    return {"status": "saved", "entry": entry}


@router.get("/summary/{symbol}")
async def get_reason_summary(symbol: str):
    """Aggregated buy/sell reasons for a stock."""
    return db.get_trade_reason_summary(symbol)


@router.get("/trending")
async def get_trending_reasons(limit: int = 10):
    """Stocks with the most recent buy/sell reason submissions."""
    return {"trending": db.get_trending_reasons(limit)}


@router.get("/feed")
async def get_global_feed(limit: int = 30):
    """Latest trade-reason submissions across all stocks."""
    entries = db.get_trade_reasons(limit=limit)
    return {"feed": entries}
