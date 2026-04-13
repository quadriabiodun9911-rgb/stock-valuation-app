"""
Trade Reasons Module
Tracks why users buy and sell stocks — crowd intelligence for future analysis.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
from pathlib import Path
import json
import threading
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/trade-reasons", tags=["trade-reasons"])

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
REASONS_FILE = DATA_DIR / "trade_reasons.json"

_lock = threading.Lock()

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
    reasons: List[str] = Field(..., min_items=1, max_items=5)
    note: Optional[str] = Field(None, max_length=280)
    confidence: Optional[int] = Field(None, ge=1, le=5)


# ── Persistence ───────────────────────────────────────────────────

def _load() -> List[dict]:
    with _lock:
        if REASONS_FILE.exists():
            return json.loads(REASONS_FILE.read_text())
        return []


def _save(data: List[dict]):
    with _lock:
        REASONS_FILE.write_text(json.dumps(data, indent=2, default=str))


# ── Endpoints ─────────────────────────────────────────────────────

@router.get("/tags")
async def get_reason_tags():
    """Return the predefined buy/sell reason tags."""
    return {"buy_reasons": BUY_REASONS, "sell_reasons": SELL_REASONS}


@router.post("/submit")
async def submit_trade_reason(body: TradeReasonSubmit):
    """Record why a user is buying or selling a stock."""
    entry = {
        "symbol": body.symbol.upper(),
        "action": body.action,
        "reasons": body.reasons,
        "note": body.note,
        "confidence": body.confidence,
        "timestamp": datetime.now().isoformat(),
    }
    data = _load()
    data.append(entry)
    _save(data)
    return {"status": "saved", "entry": entry}


@router.get("/summary/{symbol}")
async def get_reason_summary(symbol: str):
    """Aggregated buy/sell reasons for a stock."""
    symbol = symbol.upper()
    data = _load()
    entries = [e for e in data if e["symbol"] == symbol]

    buy_entries = [e for e in entries if e["action"] == "buy"]
    sell_entries = [e for e in entries if e["action"] == "sell"]

    def _tally(entries: List[dict]) -> List[dict]:
        counts: dict[str, int] = {}
        for e in entries:
            for r in e.get("reasons", []):
                counts[r] = counts.get(r, 0) + 1
        total = sum(counts.values()) or 1
        return sorted(
            [{"reason": r, "count": c, "pct": round(c / total * 100, 1)} for r, c in counts.items()],
            key=lambda x: x["count"],
            reverse=True,
        )

    avg_buy_conf = (
        round(sum(e["confidence"] for e in buy_entries if e.get("confidence")) /
              max(sum(1 for e in buy_entries if e.get("confidence")), 1), 1)
    )
    avg_sell_conf = (
        round(sum(e["confidence"] for e in sell_entries if e.get("confidence")) /
              max(sum(1 for e in sell_entries if e.get("confidence")), 1), 1)
    )

    return {
        "symbol": symbol,
        "total_submissions": len(entries),
        "buy": {
            "count": len(buy_entries),
            "avg_confidence": avg_buy_conf,
            "top_reasons": _tally(buy_entries),
        },
        "sell": {
            "count": len(sell_entries),
            "avg_confidence": avg_sell_conf,
            "top_reasons": _tally(sell_entries),
        },
        "recent": entries[-10:][::-1],
    }


@router.get("/trending")
async def get_trending_reasons(limit: int = 10):
    """Stocks with the most recent buy/sell reason submissions."""
    data = _load()
    # Count per symbol, most recent first
    symbol_counts: dict[str, dict] = {}
    for e in data:
        sym = e["symbol"]
        if sym not in symbol_counts:
            symbol_counts[sym] = {"buy": 0, "sell": 0, "total": 0, "latest": e["timestamp"]}
        symbol_counts[sym][e["action"]] += 1
        symbol_counts[sym]["total"] += 1
        if e["timestamp"] > symbol_counts[sym]["latest"]:
            symbol_counts[sym]["latest"] = e["timestamp"]

    ranked = sorted(symbol_counts.items(), key=lambda x: x[1]["total"], reverse=True)[:limit]
    return {
        "trending": [
            {"symbol": sym, **counts} for sym, counts in ranked
        ]
    }


@router.get("/feed")
async def get_global_feed(limit: int = 30):
    """Latest trade-reason submissions across all stocks."""
    data = _load()
    return {"feed": data[-limit:][::-1]}
