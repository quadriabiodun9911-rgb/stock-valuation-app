"""
Social Module — X-like social feed, friendships & chat.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
import logging
from auth import get_user_id_dep
import database as db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/social", tags=["social"])


# ── Models ────────────────────────────────────────────────────────

class CreatePost(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)
    symbol: Optional[str] = Field(None, max_length=10)


class CreateComment(BaseModel):
    content: str = Field(..., min_length=1, max_length=280)


class FriendAction(BaseModel):
    accept: bool


class SendMessage(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)


# ── Posts ─────────────────────────────────────────────────────────

@router.post("/posts")
async def create_post(body: CreatePost, user_id: int = Depends(get_user_id_dep)):
    post = db.create_post(user_id, body.content, body.symbol)
    return post


@router.get("/feed")
async def get_feed(limit: int = 50, offset: int = 0, user_id: int = Depends(get_user_id_dep)):
    return {"posts": db.get_social_feed(user_id, limit, offset)}


@router.get("/posts/{post_id}")
async def get_post(post_id: int, user_id: int = Depends(get_user_id_dep)):
    post = db.get_post(post_id, user_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.delete("/posts/{post_id}")
async def delete_post(post_id: int, user_id: int = Depends(get_user_id_dep)):
    if not db.delete_post(post_id, user_id):
        raise HTTPException(status_code=404, detail="Post not found or not yours")
    return {"status": "deleted"}


@router.post("/posts/{post_id}/like")
async def toggle_like(post_id: int, user_id: int = Depends(get_user_id_dep)):
    return db.toggle_like(post_id, user_id)


@router.get("/posts/{post_id}/comments")
async def get_comments(post_id: int):
    return {"comments": db.get_comments(post_id)}


@router.post("/posts/{post_id}/comments")
async def add_comment(post_id: int, body: CreateComment, user_id: int = Depends(get_user_id_dep)):
    return db.add_comment(post_id, user_id, body.content)


# ── Friends ───────────────────────────────────────────────────────

@router.get("/friends")
async def get_friends(user_id: int = Depends(get_user_id_dep)):
    return {"friends": db.get_friends(user_id)}


@router.get("/friends/requests")
async def get_friend_requests(user_id: int = Depends(get_user_id_dep)):
    return {"requests": db.get_friend_requests(user_id)}


@router.post("/friends/{addressee_id}")
async def send_friend_request(addressee_id: int, user_id: int = Depends(get_user_id_dep)):
    if addressee_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot friend yourself")
    return db.send_friend_request(user_id, addressee_id)


@router.put("/friends/requests/{request_id}")
async def respond_to_request(request_id: int, body: FriendAction, user_id: int = Depends(get_user_id_dep)):
    result = db.respond_friend_request(request_id, user_id, body.accept)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/users/search")
async def search_users(q: str, user_id: int = Depends(get_user_id_dep)):
    if len(q) < 2:
        raise HTTPException(status_code=400, detail="Query too short")
    return {"users": db.search_users(q, user_id)}


# ── Chat ──────────────────────────────────────────────────────────

@router.get("/chat/conversations")
async def get_conversations(user_id: int = Depends(get_user_id_dep)):
    return {"conversations": db.get_conversations(user_id)}


@router.get("/chat/{other_user_id}")
async def get_messages(other_user_id: int, limit: int = 50, offset: int = 0,
                       user_id: int = Depends(get_user_id_dep)):
    return {"messages": db.get_messages(user_id, other_user_id, limit, offset)}


@router.post("/chat/{receiver_id}")
async def send_message(receiver_id: int, body: SendMessage, user_id: int = Depends(get_user_id_dep)):
    if receiver_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    return db.send_message(user_id, receiver_id, body.content)
