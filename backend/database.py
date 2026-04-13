"""
SQLite Database Layer
Replaces JSON file storage with a proper relational database.
Auto-migrates existing JSON data on first run.
"""
import sqlite3
import json
import threading
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent / "data" / "stock_valuation.db"
DATA_DIR = Path(__file__).parent / "data"
_local = threading.local()


def _get_conn() -> sqlite3.Connection:
    """Thread-local SQLite connection."""
    if not hasattr(_local, "conn") or _local.conn is None:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        _local.conn = conn
    return _local.conn


def init_db():
    """Create tables if they don't exist, then migrate JSON data."""
    conn = _get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            email       TEXT UNIQUE NOT NULL,
            username    TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            push_token  TEXT,
            created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS portfolio (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL DEFAULT 1,
            symbol     TEXT NOT NULL,
            shares     REAL NOT NULL,
            cost_basis REAL NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS portfolio_meta (
            user_id    INTEGER PRIMARY KEY DEFAULT 1,
            cash       REAL NOT NULL DEFAULT 0.0,
            last_updated TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL DEFAULT 1,
            symbol     TEXT NOT NULL,
            action     TEXT NOT NULL,
            shares     REAL NOT NULL,
            price      REAL NOT NULL,
            total      REAL NOT NULL,
            date       TEXT,
            notes      TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS price_alerts (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id      INTEGER NOT NULL DEFAULT 1,
            symbol       TEXT NOT NULL,
            target_price REAL NOT NULL,
            alert_type   TEXT NOT NULL,
            enabled      INTEGER NOT NULL DEFAULT 1,
            created_at   TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS trade_reasons (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER,
            symbol     TEXT NOT NULL,
            action     TEXT NOT NULL,
            reasons    TEXT NOT NULL,
            note       TEXT,
            confidence INTEGER,
            timestamp  TEXT NOT NULL DEFAULT (datetime('now'))
        );
    """)
    conn.commit()
    _migrate_json_data(conn)


# ── JSON → SQLite migration ──────────────────────────────────────

def _migrate_json_data(conn: sqlite3.Connection):
    """One-time import of existing JSON files into SQLite."""
    # Ensure default local user exists for migration (user_id=1)
    existing = conn.execute("SELECT COUNT(*) FROM users WHERE id = 1").fetchone()[0]
    if existing == 0:
        conn.execute(
            "INSERT INTO users (id, email, username, password_hash) VALUES (1, 'local@device', 'local', 'none')"
        )
        conn.commit()
    _migrate_portfolio(conn)
    _migrate_transactions(conn)
    _migrate_price_alerts(conn)
    _migrate_trade_reasons(conn)


def _migrate_portfolio(conn: sqlite3.Connection):
    path = DATA_DIR / "portfolio.json"
    if not path.exists():
        return
    existing = conn.execute("SELECT COUNT(*) FROM portfolio").fetchone()[0]
    if existing > 0:
        return  # already migrated
    try:
        data = json.loads(path.read_text())
        for pos in data.get("positions", []):
            conn.execute(
                "INSERT INTO portfolio (user_id, symbol, shares, cost_basis) VALUES (1, ?, ?, ?)",
                (pos["symbol"], pos["shares"], pos["cost_basis"]),
            )
        cash = data.get("cash", 0.0)
        last_updated = data.get("last_updated")
        conn.execute(
            "INSERT OR REPLACE INTO portfolio_meta (user_id, cash, last_updated) VALUES (1, ?, ?)",
            (cash, last_updated),
        )
        conn.commit()
        logger.info(f"Migrated {len(data.get('positions', []))} portfolio positions from JSON")
    except Exception as e:
        logger.error(f"Portfolio migration error: {e}")


def _migrate_transactions(conn: sqlite3.Connection):
    path = DATA_DIR / "transactions.json"
    if not path.exists():
        return
    existing = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
    if existing > 0:
        return
    try:
        data = json.loads(path.read_text())
        for t in data:
            conn.execute(
                "INSERT INTO transactions (user_id, symbol, action, shares, price, total, date, notes, created_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)",
                (t["symbol"], t["action"], t["shares"], t["price"], t.get("total", t["shares"] * t["price"]),
                 t.get("date"), t.get("notes"), t.get("createdAt", datetime.now().isoformat())),
            )
        conn.commit()
        logger.info(f"Migrated {len(data)} transactions from JSON")
    except Exception as e:
        logger.error(f"Transaction migration error: {e}")


def _migrate_price_alerts(conn: sqlite3.Connection):
    path = DATA_DIR / "price_alerts.json"
    if not path.exists():
        return
    existing = conn.execute("SELECT COUNT(*) FROM price_alerts").fetchone()[0]
    if existing > 0:
        return
    try:
        data = json.loads(path.read_text())
        for a in data:
            conn.execute(
                "INSERT INTO price_alerts (user_id, symbol, target_price, alert_type, enabled, created_at) VALUES (1, ?, ?, ?, ?, ?)",
                (a["symbol"], a["target_price"], a["alert_type"], 1 if a.get("enabled", True) else 0,
                 a.get("created_at", datetime.now().isoformat())),
            )
        conn.commit()
        logger.info(f"Migrated {len(data)} price alerts from JSON")
    except Exception as e:
        logger.error(f"Price alerts migration error: {e}")


def _migrate_trade_reasons(conn: sqlite3.Connection):
    path = DATA_DIR / "trade_reasons.json"
    if not path.exists():
        return
    existing = conn.execute("SELECT COUNT(*) FROM trade_reasons").fetchone()[0]
    if existing > 0:
        return
    try:
        data = json.loads(path.read_text())
        for r in data:
            reasons_json = json.dumps(r.get("reasons", []))
            conn.execute(
                "INSERT INTO trade_reasons (symbol, action, reasons, note, confidence, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
                (r["symbol"], r["action"], reasons_json, r.get("note"), r.get("confidence"),
                 r.get("timestamp", datetime.now().isoformat())),
            )
        conn.commit()
        logger.info(f"Migrated {len(data)} trade reasons from JSON")
    except Exception as e:
        logger.error(f"Trade reasons migration error: {e}")


# ── User CRUD ─────────────────────────────────────────────────────

def create_user(email: str, username: str, password_hash: str) -> Dict[str, Any]:
    conn = _get_conn()
    cur = conn.execute(
        "INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)",
        (email, username, password_hash),
    )
    conn.commit()
    return {"id": cur.lastrowid, "email": email, "username": username}


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    return dict(row) if row else None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


def update_push_token(user_id: int, token: str):
    conn = _get_conn()
    conn.execute("UPDATE users SET push_token = ? WHERE id = ?", (token, user_id))
    conn.commit()


# ── Portfolio CRUD ────────────────────────────────────────────────

def get_portfolio(user_id: int = 1) -> Dict[str, Any]:
    conn = _get_conn()
    rows = conn.execute("SELECT * FROM portfolio WHERE user_id = ?", (user_id,)).fetchall()
    meta = conn.execute("SELECT * FROM portfolio_meta WHERE user_id = ?", (user_id,)).fetchone()
    positions = [{"symbol": r["symbol"], "shares": r["shares"], "cost_basis": r["cost_basis"]} for r in rows]
    cash = meta["cash"] if meta else 0.0
    last_updated = meta["last_updated"] if meta else None
    return {"positions": positions, "cash": cash, "last_updated": last_updated}


def save_portfolio(user_id: int, positions: List[Dict], cash: float = 0.0):
    conn = _get_conn()
    conn.execute("DELETE FROM portfolio WHERE user_id = ?", (user_id,))
    for p in positions:
        conn.execute(
            "INSERT INTO portfolio (user_id, symbol, shares, cost_basis) VALUES (?, ?, ?, ?)",
            (user_id, p["symbol"], p["shares"], p["cost_basis"]),
        )
    conn.execute(
        "INSERT OR REPLACE INTO portfolio_meta (user_id, cash, last_updated) VALUES (?, ?, ?)",
        (user_id, cash, datetime.now().isoformat()),
    )
    conn.commit()


# ── Transaction CRUD ──────────────────────────────────────────────

def add_transaction(user_id: int, symbol: str, action: str, shares: float,
                    price: float, date: Optional[str] = None, notes: Optional[str] = None) -> Dict[str, Any]:
    conn = _get_conn()
    total = round(shares * price, 2)
    date = date or datetime.now().strftime("%Y-%m-%d")
    cur = conn.execute(
        "INSERT INTO transactions (user_id, symbol, action, shares, price, total, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (user_id, symbol, action, shares, price, total, date, notes),
    )
    conn.commit()
    return {
        "id": cur.lastrowid, "symbol": symbol, "action": action,
        "shares": shares, "price": price, "total": total,
        "date": date, "notes": notes, "createdAt": datetime.now().isoformat(),
    }


def get_transactions(user_id: int = 1, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = _get_conn()
    if symbol:
        rows = conn.execute(
            "SELECT * FROM transactions WHERE user_id = ? AND symbol = ? ORDER BY date DESC",
            (user_id, symbol.upper()),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC",
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def delete_transaction(user_id: int, txn_id: int) -> bool:
    conn = _get_conn()
    cur = conn.execute("DELETE FROM transactions WHERE id = ? AND user_id = ?", (txn_id, user_id))
    conn.commit()
    return cur.rowcount > 0


# ── Price Alerts CRUD ─────────────────────────────────────────────

def create_alert(user_id: int, symbol: str, target_price: float, alert_type: str) -> Dict[str, Any]:
    conn = _get_conn()
    cur = conn.execute(
        "INSERT INTO price_alerts (user_id, symbol, target_price, alert_type) VALUES (?, ?, ?, ?)",
        (user_id, symbol, target_price, alert_type),
    )
    conn.commit()
    return {"id": cur.lastrowid, "symbol": symbol, "target_price": target_price,
            "alert_type": alert_type, "enabled": True, "created_at": datetime.now().isoformat()}


def get_alerts(user_id: int = 1, enabled_only: bool = True) -> List[Dict[str, Any]]:
    conn = _get_conn()
    if enabled_only:
        rows = conn.execute("SELECT * FROM price_alerts WHERE user_id = ? AND enabled = 1", (user_id,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM price_alerts WHERE user_id = ?", (user_id,)).fetchall()
    return [dict(r) for r in rows]


def delete_alert(user_id: int, alert_id: int) -> bool:
    conn = _get_conn()
    cur = conn.execute("DELETE FROM price_alerts WHERE id = ? AND user_id = ?", (alert_id, user_id))
    conn.commit()
    return cur.rowcount > 0


def get_all_enabled_alerts() -> List[Dict[str, Any]]:
    """Get all enabled alerts across all users (for background checking)."""
    conn = _get_conn()
    rows = conn.execute("SELECT pa.*, u.push_token FROM price_alerts pa LEFT JOIN users u ON pa.user_id = u.id WHERE pa.enabled = 1").fetchall()
    return [dict(r) for r in rows]


# ── Trade Reasons CRUD ────────────────────────────────────────────

def add_trade_reason(symbol: str, action: str, reasons: List[str],
                     note: Optional[str] = None, confidence: Optional[int] = None,
                     user_id: Optional[int] = None) -> Dict[str, Any]:
    conn = _get_conn()
    reasons_json = json.dumps(reasons)
    ts = datetime.now().isoformat()
    cur = conn.execute(
        "INSERT INTO trade_reasons (user_id, symbol, action, reasons, note, confidence, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (user_id, symbol, action, reasons_json, note, confidence, ts),
    )
    conn.commit()
    return {"id": cur.lastrowid, "symbol": symbol, "action": action,
            "reasons": reasons, "note": note, "confidence": confidence, "timestamp": ts}


def get_trade_reasons(symbol: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    conn = _get_conn()
    if symbol:
        rows = conn.execute(
            "SELECT * FROM trade_reasons WHERE symbol = ? ORDER BY timestamp DESC LIMIT ?",
            (symbol.upper(), limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM trade_reasons ORDER BY timestamp DESC LIMIT ?", (limit,)
        ).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["reasons"] = json.loads(d["reasons"]) if isinstance(d["reasons"], str) else d["reasons"]
        result.append(d)
    return result


def get_trade_reason_summary(symbol: str) -> Dict[str, Any]:
    conn = _get_conn()
    rows = conn.execute("SELECT * FROM trade_reasons WHERE symbol = ?", (symbol.upper(),)).fetchall()
    entries = [dict(r) for r in rows]
    for e in entries:
        e["reasons"] = json.loads(e["reasons"]) if isinstance(e["reasons"], str) else e["reasons"]

    buy_entries = [e for e in entries if e["action"] == "buy"]
    sell_entries = [e for e in entries if e["action"] == "sell"]

    def _tally(items):
        counts = {}
        for e in items:
            for r in e.get("reasons", []):
                counts[r] = counts.get(r, 0) + 1
        total = sum(counts.values()) or 1
        return sorted(
            [{"reason": r, "count": c, "pct": round(c / total * 100, 1)} for r, c in counts.items()],
            key=lambda x: x["count"], reverse=True,
        )

    avg_buy = round(sum(e["confidence"] for e in buy_entries if e.get("confidence")) /
                    max(sum(1 for e in buy_entries if e.get("confidence")), 1), 1)
    avg_sell = round(sum(e["confidence"] for e in sell_entries if e.get("confidence")) /
                     max(sum(1 for e in sell_entries if e.get("confidence")), 1), 1)

    return {
        "symbol": symbol.upper(),
        "total_submissions": len(entries),
        "buy": {"count": len(buy_entries), "avg_confidence": avg_buy, "top_reasons": _tally(buy_entries)},
        "sell": {"count": len(sell_entries), "avg_confidence": avg_sell, "top_reasons": _tally(sell_entries)},
        "recent": entries[-10:][::-1],
    }


def get_trending_reasons(limit: int = 10) -> List[Dict[str, Any]]:
    conn = _get_conn()
    rows = conn.execute("""
        SELECT symbol, 
               SUM(CASE WHEN action='buy' THEN 1 ELSE 0 END) as buy_count,
               SUM(CASE WHEN action='sell' THEN 1 ELSE 0 END) as sell_count,
               COUNT(*) as total,
               MAX(timestamp) as latest
        FROM trade_reasons
        GROUP BY symbol
        ORDER BY total DESC
        LIMIT ?
    """, (limit,)).fetchall()
    return [{"symbol": r["symbol"], "buy": r["buy_count"], "sell": r["sell_count"],
             "total": r["total"], "latest": r["latest"]} for r in rows]
