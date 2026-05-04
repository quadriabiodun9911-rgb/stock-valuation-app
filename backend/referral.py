"""
Referral System
Users can generate referral codes and track referrals.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import database as db
from auth import get_current_user, get_user_id
import hashlib
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/referrals", tags=["referrals"])


def _ensure_table():
    conn = db._get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS referrals (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            referrer_id INTEGER NOT NULL,
            referee_id  INTEGER,
            code        TEXT NOT NULL,
            status      TEXT NOT NULL DEFAULT 'pending',
            bonus_cash  REAL NOT NULL DEFAULT 10000,
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            completed_at TEXT,
            FOREIGN KEY (referrer_id) REFERENCES users(id),
            FOREIGN KEY (referee_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS referral_codes (
            user_id     INTEGER PRIMARY KEY,
            code        TEXT UNIQUE NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)
    conn.commit()


_ensure_table()


def _generate_code(user_id: int) -> str:
    raw = f"stockval_{user_id}_ref"
    return hashlib.md5(raw.encode()).hexdigest()[:8].upper()


@router.get("/my-code")
async def get_referral_code(user: dict = Depends(get_current_user)):
    uid = get_user_id(user)
    conn = db._get_conn()
    row = conn.execute("SELECT code FROM referral_codes WHERE user_id = ?", (uid,)).fetchone()
    if not row:
        code = _generate_code(uid)
        conn.execute("INSERT INTO referral_codes (user_id, code) VALUES (?, ?)", (uid, code))
        conn.commit()
    else:
        code = row["code"]

    referrals = conn.execute(
        "SELECT * FROM referrals WHERE referrer_id = ? ORDER BY created_at DESC", (uid,)
    ).fetchall()

    return {
        "code": code,
        "share_message": f"Join me on StockVal! Use code {code} to get $10,000 in virtual trading cash. Download now!",
        "total_referrals": len(referrals),
        "completed": sum(1 for r in referrals if r["status"] == "completed"),
        "pending": sum(1 for r in referrals if r["status"] == "pending"),
        "total_bonus_earned": sum(r["bonus_cash"] for r in referrals if r["status"] == "completed"),
        "referrals": [dict(r) for r in referrals],
    }


class RedeemCode(BaseModel):
    code: str


@router.post("/redeem")
async def redeem_referral(req: RedeemCode, user: dict = Depends(get_current_user)):
    uid = get_user_id(user)
    conn = db._get_conn()
    code = req.code.strip().upper()

    # Find referrer
    ref_row = conn.execute("SELECT user_id FROM referral_codes WHERE code = ?", (code,)).fetchone()
    if not ref_row:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    if ref_row["user_id"] == uid:
        raise HTTPException(status_code=400, detail="Can't use your own referral code")

    # Check if already redeemed
    existing = conn.execute(
        "SELECT id FROM referrals WHERE referrer_id = ? AND referee_id = ?",
        (ref_row["user_id"], uid)
    ).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="You've already used a referral code")

    # Create referral and add bonus cash to both
    bonus = 10000.0
    conn.execute(
        "INSERT INTO referrals (referrer_id, referee_id, code, status, bonus_cash, completed_at) VALUES (?, ?, ?, 'completed', ?, datetime('now'))",
        (ref_row["user_id"], uid, code, bonus)
    )

    # Add cash to referee
    meta = conn.execute("SELECT cash FROM portfolio_meta WHERE user_id = ?", (uid,)).fetchone()
    if meta:
        conn.execute("UPDATE portfolio_meta SET cash = cash + ? WHERE user_id = ?", (bonus, uid))
    else:
        conn.execute("INSERT INTO portfolio_meta (user_id, cash) VALUES (?, ?)", (uid, bonus))

    # Add cash to referrer
    meta_r = conn.execute("SELECT cash FROM portfolio_meta WHERE user_id = ?", (ref_row["user_id"],)).fetchone()
    if meta_r:
        conn.execute("UPDATE portfolio_meta SET cash = cash + ? WHERE user_id = ?", (bonus, ref_row["user_id"]))
    else:
        conn.execute("INSERT INTO portfolio_meta (user_id, cash) VALUES (?, ?)", (ref_row["user_id"], bonus))

    conn.commit()

    return {
        "message": f"Referral redeemed! You and your friend each received ${bonus:,.0f} virtual trading cash!",
        "bonus_cash": bonus,
    }
