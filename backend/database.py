"""
Database layer for local and production deployments.
Uses SQLite by default and supports PostgreSQL via DATABASE_URL.
"""
import sqlite3
import json
import os
import threading
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
DEFAULT_SQLITE_PATH = Path(__file__).parent / "data" / "stock_valuation.db"
DATA_DIR = Path(__file__).parent / "data"
USE_POSTGRES = DATABASE_URL.startswith(("postgres://", "postgresql://"))

if DATABASE_URL.startswith("sqlite:///"):
    sqlite_target = DATABASE_URL.replace("sqlite:///", "", 1)
    DB_PATH = Path(sqlite_target).expanduser()
    if not DB_PATH.is_absolute():
        DB_PATH = (Path(__file__).parent / DB_PATH).resolve()
else:
    DB_PATH = DEFAULT_SQLITE_PATH

_local = threading.local()


class DBRow(dict):
    """Row wrapper that supports both numeric and key access."""

    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self.values())[key]
        return super().__getitem__(key)


class PGCursorWrapper:
    def __init__(self, cursor, lastrowid: Optional[int] = None):
        self._cursor = cursor
        self.lastrowid = lastrowid

    @property
    def rowcount(self):
        return self._cursor.rowcount

    def fetchone(self):
        row = self._cursor.fetchone()
        return DBRow(row) if row else None

    def fetchall(self):
        return [DBRow(row) for row in self._cursor.fetchall()]


class PGConnectionWrapper:
    def __init__(self, conn):
        self._conn = conn

    def execute(self, query: str, params=()):
        from psycopg.rows import dict_row

        sql = query.rstrip().rstrip(";")
        normalized = " ".join(sql.lower().split())
        wants_lastrowid = (
            normalized.startswith("insert into")
            and "returning" not in normalized
            and "portfolio_meta" not in normalized
        )
        if wants_lastrowid:
            sql = f"{sql} RETURNING id"

        sql = sql.replace("?", "%s")
        cur = self._conn.cursor(row_factory=dict_row)
        cur.execute(sql, params)

        lastrowid = None
        if wants_lastrowid:
            row = cur.fetchone()
            if row:
                lastrowid = row["id"]

        return PGCursorWrapper(cur, lastrowid=lastrowid)

    def executescript(self, script: str):
        for statement in script.split(";"):
            statement = statement.strip()
            if statement:
                self.execute(statement)

    def commit(self):
        self._conn.commit()


def _get_conn():
    """Thread-local database connection with SQLite fallback and PostgreSQL support."""
    if not hasattr(_local, "conn") or _local.conn is None:
        if USE_POSTGRES:
            try:
                import psycopg
            except ImportError as exc:
                raise RuntimeError(
                    "psycopg is required when DATABASE_URL points to PostgreSQL"
                ) from exc

            conn = psycopg.connect(DATABASE_URL, autocommit=False)
            _local.conn = PGConnectionWrapper(conn)
        else:
            DB_PATH.parent.mkdir(parents=True, exist_ok=True)
            conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA foreign_keys=ON")
            _local.conn = conn
    return _local.conn


def _get_schema_sql() -> str:
    pk_type = "SERIAL PRIMARY KEY" if USE_POSTGRES else "INTEGER PRIMARY KEY AUTOINCREMENT"
    dt_type = "TIMESTAMP" if USE_POSTGRES else "TEXT"
    dt_default = "CURRENT_TIMESTAMP" if USE_POSTGRES else "(datetime('now'))"

    return f"""
        CREATE TABLE IF NOT EXISTS users (
            id          {pk_type},
            email       TEXT UNIQUE NOT NULL,
            username    TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            push_token  TEXT,
            created_at  {dt_type} NOT NULL DEFAULT {dt_default}
        );

        CREATE TABLE IF NOT EXISTS portfolio (
            id         {pk_type},
            user_id    INTEGER NOT NULL DEFAULT 1,
            symbol     TEXT NOT NULL,
            shares     REAL NOT NULL,
            cost_basis REAL NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS portfolio_meta (
            user_id    INTEGER PRIMARY KEY,
            cash       REAL NOT NULL DEFAULT 0.0,
            last_updated {dt_type},
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id         {pk_type},
            user_id    INTEGER NOT NULL DEFAULT 1,
            symbol     TEXT NOT NULL,
            action     TEXT NOT NULL,
            shares     REAL NOT NULL,
            price      REAL NOT NULL,
            total      REAL NOT NULL,
            date       TEXT,
            notes      TEXT,
            created_at {dt_type} NOT NULL DEFAULT {dt_default},
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS price_alerts (
            id           {pk_type},
            user_id      INTEGER NOT NULL DEFAULT 1,
            symbol       TEXT NOT NULL,
            target_price REAL NOT NULL,
            alert_type   TEXT NOT NULL,
            enabled      INTEGER NOT NULL DEFAULT 1,
            created_at   {dt_type} NOT NULL DEFAULT {dt_default},
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS trade_reasons (
            id         {pk_type},
            user_id    INTEGER,
            symbol     TEXT NOT NULL,
            action     TEXT NOT NULL,
            reasons    TEXT NOT NULL,
            note       TEXT,
            confidence INTEGER,
            timestamp  {dt_type} NOT NULL DEFAULT {dt_default}
        );

        CREATE TABLE IF NOT EXISTS social_posts (
            id         {pk_type},
            user_id    INTEGER NOT NULL,
            content    TEXT NOT NULL,
            symbol     TEXT,
            image_url  TEXT,
            likes      INTEGER NOT NULL DEFAULT 0,
            reposts    INTEGER NOT NULL DEFAULT 0,
            created_at {dt_type} NOT NULL DEFAULT {dt_default},
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS social_comments (
            id         {pk_type},
            post_id    INTEGER NOT NULL,
            user_id    INTEGER NOT NULL,
            content    TEXT NOT NULL,
            created_at {dt_type} NOT NULL DEFAULT {dt_default},
            FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS social_likes (
            id         {pk_type},
            post_id    INTEGER NOT NULL,
            user_id    INTEGER NOT NULL,
            created_at {dt_type} NOT NULL DEFAULT {dt_default},
            FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(post_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS friendships (
            id           {pk_type},
            requester_id INTEGER NOT NULL,
            addressee_id INTEGER NOT NULL,
            status       TEXT NOT NULL DEFAULT 'pending',
            created_at   {dt_type} NOT NULL DEFAULT {dt_default},
            FOREIGN KEY (requester_id) REFERENCES users(id),
            FOREIGN KEY (addressee_id) REFERENCES users(id),
            UNIQUE(requester_id, addressee_id)
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
            id          {pk_type},
            sender_id   INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            content     TEXT NOT NULL,
            read        INTEGER NOT NULL DEFAULT 0,
            created_at  {dt_type} NOT NULL DEFAULT {dt_default},
            FOREIGN KEY (sender_id) REFERENCES users(id),
            FOREIGN KEY (receiver_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS financial_uploads (
            id              {pk_type},
            user_id         INTEGER NOT NULL DEFAULT 1,
            company_name    TEXT NOT NULL,
            symbol          TEXT,
            statement_type  TEXT NOT NULL DEFAULT 'income_statement',
            data_json       TEXT NOT NULL,
            dcf_result_json TEXT,
            growth_json     TEXT,
            created_at      {dt_type} NOT NULL DEFAULT {dt_default},
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """


def _upsert_portfolio_meta(conn, user_id: int, cash: float, last_updated: Optional[str]):
    if USE_POSTGRES:
        conn.execute(
            """
            INSERT INTO portfolio_meta (user_id, cash, last_updated)
            VALUES (?, ?, ?)
            ON CONFLICT (user_id)
            DO UPDATE SET
                cash = EXCLUDED.cash,
                last_updated = EXCLUDED.last_updated
            """,
            (user_id, cash, last_updated),
        )
    else:
        conn.execute(
            "INSERT OR REPLACE INTO portfolio_meta (user_id, cash, last_updated) VALUES (?, ?, ?)",
            (user_id, cash, last_updated),
        )


def init_db():
    """Create tables if they don't exist, then migrate JSON data."""
    conn = _get_conn()
    conn.executescript(_get_schema_sql())
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
        _upsert_portfolio_meta(conn, 1, cash, last_updated)
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
    _upsert_portfolio_meta(conn, user_id, cash, datetime.now().isoformat())
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


# ── Social Posts CRUD ─────────────────────────────────────────────

def create_post(user_id: int, content: str, symbol: Optional[str] = None,
                image_url: Optional[str] = None) -> Dict[str, Any]:
    conn = _get_conn()
    cur = conn.execute(
        "INSERT INTO social_posts (user_id, content, symbol, image_url) VALUES (?, ?, ?, ?)",
        (user_id, content, symbol.upper() if symbol else None, image_url),
    )
    conn.commit()
    return get_post(cur.lastrowid, user_id)


def get_post(post_id: int, viewer_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    conn = _get_conn()
    row = conn.execute("""
        SELECT p.*, u.username,
               (SELECT COUNT(*) FROM social_likes WHERE post_id = p.id) as like_count,
               (SELECT COUNT(*) FROM social_comments WHERE post_id = p.id) as comment_count
        FROM social_posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
    """, (post_id,)).fetchone()
    if not row:
        return None
    d = dict(row)
    if viewer_id:
        liked = conn.execute(
            "SELECT 1 FROM social_likes WHERE post_id = ? AND user_id = ?", (post_id, viewer_id)
        ).fetchone()
        d["liked_by_me"] = liked is not None
    else:
        d["liked_by_me"] = False
    return d


def get_social_feed(user_id: int, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    conn = _get_conn()
    rows = conn.execute("""
        SELECT p.*, u.username,
               (SELECT COUNT(*) FROM social_likes WHERE post_id = p.id) as like_count,
               (SELECT COUNT(*) FROM social_comments WHERE post_id = p.id) as comment_count
        FROM social_posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
    """, (limit, offset)).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        liked = conn.execute(
            "SELECT 1 FROM social_likes WHERE post_id = ? AND user_id = ?", (d["id"], user_id)
        ).fetchone()
        d["liked_by_me"] = liked is not None
        result.append(d)
    return result


def toggle_like(post_id: int, user_id: int) -> Dict[str, Any]:
    conn = _get_conn()
    existing = conn.execute(
        "SELECT id FROM social_likes WHERE post_id = ? AND user_id = ?", (post_id, user_id)
    ).fetchone()
    if existing:
        conn.execute("DELETE FROM social_likes WHERE id = ?", (existing["id"],))
        liked = False
    else:
        conn.execute("INSERT INTO social_likes (post_id, user_id) VALUES (?, ?)", (post_id, user_id))
        liked = True
    conn.commit()
    count = conn.execute("SELECT COUNT(*) as c FROM social_likes WHERE post_id = ?", (post_id,)).fetchone()["c"]
    return {"liked": liked, "like_count": count}


def add_comment(post_id: int, user_id: int, content: str) -> Dict[str, Any]:
    conn = _get_conn()
    cur = conn.execute(
        "INSERT INTO social_comments (post_id, user_id, content) VALUES (?, ?, ?)",
        (post_id, user_id, content),
    )
    conn.commit()
    row = conn.execute("""
        SELECT c.*, u.username FROM social_comments c
        JOIN users u ON c.user_id = u.id WHERE c.id = ?
    """, (cur.lastrowid,)).fetchone()
    return dict(row)


def get_comments(post_id: int, limit: int = 50) -> List[Dict[str, Any]]:
    conn = _get_conn()
    rows = conn.execute("""
        SELECT c.*, u.username FROM social_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC LIMIT ?
    """, (post_id, limit)).fetchall()
    return [dict(r) for r in rows]


def delete_post(post_id: int, user_id: int) -> bool:
    conn = _get_conn()
    cur = conn.execute("DELETE FROM social_posts WHERE id = ? AND user_id = ?", (post_id, user_id))
    conn.commit()
    return cur.rowcount > 0


# ── Friendships CRUD ──────────────────────────────────────────────

def send_friend_request(requester_id: int, addressee_id: int) -> Dict[str, Any]:
    conn = _get_conn()
    # Check if already exists in either direction
    existing = conn.execute("""
        SELECT * FROM friendships
        WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
    """, (requester_id, addressee_id, addressee_id, requester_id)).fetchone()
    if existing:
        return {"status": dict(existing)["status"], "message": "Friendship already exists"}
    conn.execute(
        "INSERT INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, 'pending')",
        (requester_id, addressee_id),
    )
    conn.commit()
    return {"status": "pending", "message": "Friend request sent"}


def respond_friend_request(friendship_id: int, user_id: int, accept: bool) -> Dict[str, Any]:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM friendships WHERE id = ? AND addressee_id = ?",
                       (friendship_id, user_id)).fetchone()
    if not row:
        return {"error": "Request not found"}
    new_status = "accepted" if accept else "rejected"
    conn.execute("UPDATE friendships SET status = ? WHERE id = ?", (new_status, friendship_id))
    conn.commit()
    return {"status": new_status}


def get_friends(user_id: int) -> List[Dict[str, Any]]:
    conn = _get_conn()
    rows = conn.execute("""
        SELECT u.id, u.username, u.email, f.created_at as friends_since
        FROM friendships f
        JOIN users u ON (CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END) = u.id
        WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'accepted'
    """, (user_id, user_id, user_id)).fetchall()
    return [dict(r) for r in rows]


def get_friend_requests(user_id: int) -> List[Dict[str, Any]]:
    conn = _get_conn()
    rows = conn.execute("""
        SELECT f.id, f.requester_id, u.username, f.created_at
        FROM friendships f
        JOIN users u ON f.requester_id = u.id
        WHERE f.addressee_id = ? AND f.status = 'pending'
        ORDER BY f.created_at DESC
    """, (user_id,)).fetchall()
    return [dict(r) for r in rows]


def search_users(query: str, current_user_id: int, limit: int = 20) -> List[Dict[str, Any]]:
    conn = _get_conn()
    rows = conn.execute("""
        SELECT id, username, email FROM users
        WHERE id != ? AND (username LIKE ? OR email LIKE ?)
        LIMIT ?
    """, (current_user_id, f"%{query}%", f"%{query}%", limit)).fetchall()
    return [dict(r) for r in rows]


# ── Chat Messages CRUD ───────────────────────────────────────────

def send_message(sender_id: int, receiver_id: int, content: str) -> Dict[str, Any]:
    conn = _get_conn()
    cur = conn.execute(
        "INSERT INTO chat_messages (sender_id, receiver_id, content) VALUES (?, ?, ?)",
        (sender_id, receiver_id, content),
    )
    conn.commit()
    row = conn.execute("""
        SELECT m.*, u.username as sender_username FROM chat_messages m
        JOIN users u ON m.sender_id = u.id WHERE m.id = ?
    """, (cur.lastrowid,)).fetchone()
    return dict(row)


def get_conversations(user_id: int) -> List[Dict[str, Any]]:
    """Get list of conversations with last message preview."""
    conn = _get_conn()
    rows = conn.execute("""
        SELECT
            CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as other_user_id,
            u.username as other_username,
            m.content as last_message,
            m.created_at as last_message_at,
            (SELECT COUNT(*) FROM chat_messages
             WHERE sender_id = u.id AND receiver_id = ? AND read = 0) as unread_count
        FROM chat_messages m
        JOIN users u ON (CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END) = u.id
        WHERE m.sender_id = ? OR m.receiver_id = ?
        GROUP BY other_user_id
        ORDER BY m.created_at DESC
    """, (user_id, user_id, user_id, user_id, user_id)).fetchall()
    return [dict(r) for r in rows]


def get_messages(user_id: int, other_user_id: int, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    conn = _get_conn()
    # Mark messages as read
    conn.execute(
        "UPDATE chat_messages SET read = 1 WHERE sender_id = ? AND receiver_id = ? AND read = 0",
        (other_user_id, user_id),
    )
    conn.commit()
    rows = conn.execute("""
        SELECT m.*, u.username as sender_username FROM chat_messages m
        JOIN users u ON m.sender_id = u.id
        WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
        ORDER BY m.created_at DESC LIMIT ? OFFSET ?
    """, (user_id, other_user_id, other_user_id, user_id, limit, offset)).fetchall()
    return [dict(r) for r in reversed(rows)]


# ── Financial Uploads ─────────────────────────────────────────────

def save_financial_upload(user_id: int, company_name: str, symbol: Optional[str],
                          statement_type: str, data_json: str,
                          dcf_result_json: Optional[str] = None,
                          growth_json: Optional[str] = None) -> int:
    conn = _get_conn()
    cur = conn.execute(
        """INSERT INTO financial_uploads
           (user_id, company_name, symbol, statement_type, data_json, dcf_result_json, growth_json)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (user_id, company_name, symbol, statement_type, data_json, dcf_result_json, growth_json),
    )
    conn.commit()
    return cur.lastrowid


def get_financial_uploads(user_id: int, limit: int = 20) -> List[Dict[str, Any]]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM financial_uploads WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
        (user_id, limit),
    ).fetchall()
    return [dict(r) for r in rows]


def get_financial_upload(upload_id: int, user_id: int) -> Optional[Dict[str, Any]]:
    conn = _get_conn()
    row = conn.execute(
        "SELECT * FROM financial_uploads WHERE id = ? AND user_id = ?",
        (upload_id, user_id),
    ).fetchone()
    return dict(row) if row else None


def delete_financial_upload(upload_id: int, user_id: int) -> bool:
    conn = _get_conn()
    cur = conn.execute(
        "DELETE FROM financial_uploads WHERE id = ? AND user_id = ?",
        (upload_id, user_id),
    )
    conn.commit()
    return cur.rowcount > 0
