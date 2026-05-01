"""
Authentication Module
JWT-based user registration and login with password hashing.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timedelta
from typing import Optional
import jwt
import hashlib
import hmac
import os
import secrets
import logging
import database as db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# JWT configuration
JWT_SECRET = os.getenv("JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "72"))


# ── Password hashing (no bcrypt dependency — uses PBKDF2) ────────

def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
    return f"{salt}${dk.hex()}"


def _verify_password(password: str, stored: str) -> bool:
    salt, dk_hex = stored.split("$", 1)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
    return hmac.compare_digest(dk.hex(), dk_hex)


# ── JWT helpers ───────────────────────────────────────────────────

def create_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        data["sub"] = int(data["sub"])  # convert back to int
        return data
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ── Current user dependency ──────────────────────────────────────

async def get_current_user(request: Request) -> Optional[dict]:
    """Extract user from JWT token. Returns None if no token (guest mode)."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.removeprefix("Bearer ").strip()
    if not token:
        return None
    try:
        payload = decode_token(token)
        user = db.get_user_by_id(payload["sub"])
        if not user:
            return None
        return user
    except HTTPException:
        return None


async def require_auth(request: Request) -> dict:
    """Require authentication — raises 401 if no valid token."""
    user = await get_current_user(request)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


def get_user_id(user: Optional[dict]) -> int:
    """Return user_id from user dict, or 1 for guest mode."""
    return user["id"] if user else 1


async def get_user_id_dep(request: Request) -> int:
    """FastAPI dependency that resolves user_id from bearer token."""
    user = await get_current_user(request)
    return get_user_id(user)


# ── Request/Response models ──────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: str
    password: str


class PushTokenRequest(BaseModel):
    token: str


# ── Endpoints ─────────────────────────────────────────────────────

@router.post("/register")
async def register(req: RegisterRequest):
    """Create a new user account."""
    # Check existing
    if db.get_user_by_email(req.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    password_hash = _hash_password(req.password)
    try:
        user = db.create_user(req.email, req.username, password_hash)
    except Exception as e:
        if "UNIQUE" in str(e):
            raise HTTPException(status_code=400, detail="Username already taken")
        raise HTTPException(status_code=500, detail="Registration failed")

    token = create_token(user["id"], user["email"])
    return {
        "status": "success",
        "user": {"id": user["id"], "email": user["email"], "username": user["username"]},
        "token": token,
    }


@router.post("/login")
async def login(req: LoginRequest):
    """Authenticate and receive a JWT token."""
    user = db.get_user_by_email(req.email)
    if not user or not _verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user["id"], user["email"])
    return {
        "status": "success",
        "user": {"id": user["id"], "email": user["email"], "username": user["username"]},
        "token": token,
    }


@router.get("/me")
async def get_me(user: dict = Depends(require_auth)):
    """Get current user profile."""
    return {
        "id": user["id"],
        "email": user["email"],
        "username": user["username"],
        "created_at": user["created_at"],
    }


@router.post("/push-token")
async def register_push_token(req: PushTokenRequest, user: dict = Depends(require_auth)):
    """Register an Expo push notification token."""
    db.update_push_token(user["id"], req.token)
    return {"status": "success", "message": "Push token registered"}
