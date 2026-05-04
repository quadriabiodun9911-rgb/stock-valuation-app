"""
Achievements & Badges System
Tracks user milestones and awards badges for engagement.
"""
from fastapi import APIRouter, Depends
from datetime import datetime
import database as db
from auth import get_current_user, get_user_id, get_user_id_dep
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/achievements", tags=["achievements"])

# Achievement definitions
ACHIEVEMENTS = [
    {"id": "first_trade", "name": "First Trade", "description": "Execute your first trade", "icon": "🎯", "category": "trading", "points": 10},
    {"id": "five_trades", "name": "Active Trader", "description": "Complete 5 trades", "icon": "📊", "category": "trading", "points": 25},
    {"id": "twenty_trades", "name": "Market Veteran", "description": "Complete 20 trades", "icon": "🏆", "category": "trading", "points": 50},
    {"id": "fifty_trades", "name": "Trading Legend", "description": "Complete 50 trades", "icon": "👑", "category": "trading", "points": 100},
    {"id": "first_profit", "name": "First Profit", "description": "Make your first profitable trade", "icon": "💰", "category": "performance", "points": 15},
    {"id": "portfolio_10pct", "name": "Double Digits", "description": "Grow portfolio by 10%", "icon": "📈", "category": "performance", "points": 50},
    {"id": "diversified", "name": "Diversified", "description": "Hold 5 different stocks", "icon": "🌐", "category": "portfolio", "points": 20},
    {"id": "ten_stocks", "name": "Portfolio Pro", "description": "Hold 10 different stocks", "icon": "💼", "category": "portfolio", "points": 40},
    {"id": "watchlist_5", "name": "Market Watcher", "description": "Add 5 stocks to watchlist", "icon": "👁️", "category": "research", "points": 10},
    {"id": "first_valuation", "name": "Analyst", "description": "Run your first DCF valuation", "icon": "🔬", "category": "research", "points": 15},
    {"id": "social_post", "name": "Community Voice", "description": "Create your first social post", "icon": "💬", "category": "social", "points": 10},
    {"id": "five_friends", "name": "Networker", "description": "Connect with 5 friends", "icon": "🤝", "category": "social", "points": 25},
    {"id": "streak_3", "name": "3-Day Streak", "description": "Use the app 3 days in a row", "icon": "🔥", "category": "engagement", "points": 15},
    {"id": "streak_7", "name": "Week Warrior", "description": "Use the app 7 days in a row", "icon": "⚡", "category": "engagement", "points": 30},
    {"id": "streak_30", "name": "Monthly Master", "description": "Use the app 30 days in a row", "icon": "🌟", "category": "engagement", "points": 100},
    {"id": "referral_1", "name": "Ambassador", "description": "Refer your first friend", "icon": "📣", "category": "social", "points": 50},
]


def _ensure_table():
    conn = db._get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS achievements (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            achievement_id TEXT NOT NULL,
            unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, achievement_id)
        );
        CREATE TABLE IF NOT EXISTS user_streaks (
            user_id     INTEGER PRIMARY KEY,
            current_streak INTEGER NOT NULL DEFAULT 0,
            longest_streak INTEGER NOT NULL DEFAULT 0,
            last_active TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)
    conn.commit()


_ensure_table()


def check_and_award(user_id: int) -> list:
    """Check all achievement conditions and award any new ones. Returns newly awarded."""
    conn = db._get_conn()
    existing = {r["achievement_id"] for r in conn.execute(
        "SELECT achievement_id FROM achievements WHERE user_id = ?", (user_id,)
    ).fetchall()}

    newly_awarded = []

    # Trading achievements
    trade_count = conn.execute(
        "SELECT COUNT(*) as c FROM transactions WHERE user_id = ?", (user_id,)
    ).fetchone()["c"]

    for aid, threshold in [("first_trade", 1), ("five_trades", 5), ("twenty_trades", 20), ("fifty_trades", 50)]:
        if aid not in existing and trade_count >= threshold:
            _award(conn, user_id, aid)
            newly_awarded.append(aid)

    # Portfolio achievements
    holdings = conn.execute(
        "SELECT COUNT(DISTINCT symbol) as c FROM portfolio WHERE user_id = ? AND shares > 0", (user_id,)
    ).fetchone()["c"]

    for aid, threshold in [("diversified", 5), ("ten_stocks", 10)]:
        if aid not in existing and holdings >= threshold:
            _award(conn, user_id, aid)
            newly_awarded.append(aid)

    # Social achievements
    post_count = conn.execute(
        "SELECT COUNT(*) as c FROM social_posts WHERE user_id = ?", (user_id,)
    ).fetchone()["c"]
    if "social_post" not in existing and post_count >= 1:
        _award(conn, user_id, "social_post")
        newly_awarded.append("social_post")

    friend_count = conn.execute(
        "SELECT COUNT(*) as c FROM friendships WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted'",
        (user_id, user_id)
    ).fetchone()["c"]
    if "five_friends" not in existing and friend_count >= 5:
        _award(conn, user_id, "five_friends")
        newly_awarded.append("five_friends")

    # Streak achievements
    streak_row = conn.execute("SELECT current_streak FROM user_streaks WHERE user_id = ?", (user_id,)).fetchone()
    streak = streak_row["current_streak"] if streak_row else 0
    for aid, threshold in [("streak_3", 3), ("streak_7", 7), ("streak_30", 30)]:
        if aid not in existing and streak >= threshold:
            _award(conn, user_id, aid)
            newly_awarded.append(aid)

    # Referral
    referral_count = conn.execute(
        "SELECT COUNT(*) as c FROM referrals WHERE referrer_id = ? AND status = 'completed'",
        (user_id,)
    ).fetchone()["c"] if _table_exists(conn, "referrals") else 0
    if "referral_1" not in existing and referral_count >= 1:
        _award(conn, user_id, "referral_1")
        newly_awarded.append("referral_1")

    return newly_awarded


def _award(conn, user_id: int, achievement_id: str):
    try:
        conn.execute(
            "INSERT OR IGNORE INTO achievements (user_id, achievement_id) VALUES (?, ?)",
            (user_id, achievement_id)
        )
        conn.commit()
    except Exception as e:
        logger.error(f"Error awarding {achievement_id}: {e}")


def _table_exists(conn, table_name: str) -> bool:
    r = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,)).fetchone()
    return r is not None


def update_streak(user_id: int):
    conn = db._get_conn()
    today = datetime.now().strftime("%Y-%m-%d")
    row = conn.execute("SELECT * FROM user_streaks WHERE user_id = ?", (user_id,)).fetchone()
    if not row:
        conn.execute(
            "INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_active) VALUES (?, 1, 1, ?)",
            (user_id, today)
        )
    else:
        last = row["last_active"]
        if last == today:
            return  # Already counted today
        from datetime import timedelta
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        if last == yesterday:
            new_streak = row["current_streak"] + 1
        else:
            new_streak = 1
        longest = max(row["longest_streak"], new_streak)
        conn.execute(
            "UPDATE user_streaks SET current_streak = ?, longest_streak = ?, last_active = ? WHERE user_id = ?",
            (new_streak, longest, today, user_id)
        )
    conn.commit()


@router.get("")
async def get_achievements(user_id: int = Depends(get_user_id_dep)):
    uid = user_id
    conn = db._get_conn()

    # Update streak on each visit
    update_streak(uid)

    # Check for new achievements
    new = check_and_award(uid)

    # Get all unlocked
    unlocked = conn.execute(
        "SELECT achievement_id, unlocked_at FROM achievements WHERE user_id = ?", (uid,)
    ).fetchall()
    unlocked_map = {r["achievement_id"]: r["unlocked_at"] for r in unlocked}

    # Get streak info
    streak_row = conn.execute("SELECT * FROM user_streaks WHERE user_id = ?", (uid,)).fetchone()

    # Build response
    achievements = []
    total_points = 0
    for a in ACHIEVEMENTS:
        unlocked_at = unlocked_map.get(a["id"])
        is_unlocked = unlocked_at is not None
        if is_unlocked:
            total_points += a["points"]
        achievements.append({
            **a,
            "unlocked": is_unlocked,
            "unlocked_at": unlocked_at,
        })

    return {
        "achievements": achievements,
        "total_points": total_points,
        "unlocked_count": len(unlocked_map),
        "total_count": len(ACHIEVEMENTS),
        "current_streak": streak_row["current_streak"] if streak_row else 0,
        "longest_streak": streak_row["longest_streak"] if streak_row else 0,
        "newly_awarded": new,
    }
