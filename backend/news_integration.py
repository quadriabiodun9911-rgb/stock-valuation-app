"""
News Integration Module
Fetches real stock news from yfinance and Google News RSS feeds.
Falls back to generated summaries only when live sources are unavailable.
"""
import asyncio
from datetime import datetime
from html import unescape
from typing import List, Optional
from urllib.parse import quote
import logging
import re

from fastapi import APIRouter
from pydantic import BaseModel
import requests
import yfinance as yf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/news", tags=["news"])


def _clean_summary(text: str) -> str:
    """Convert RSS/HTML snippets into plain readable text."""
    if not text:
        return ""

    cleaned = re.sub(r"<[^>]+>", " ", text)
    cleaned = unescape(cleaned)
    return " ".join(cleaned.split()).strip()


class NewsArticle(BaseModel):
    title: str
    url: str
    source: str
    published: datetime
    summary: Optional[str] = None
    image: Optional[str] = None
    sentiment: Optional[str] = None  # positive, negative, neutral
    impact: Optional[str] = None
    why_it_matters: Optional[str] = None
    suggested_action: Optional[str] = None


# ── Real data fetchers ────────────────────────────────────────────

def _fetch_yfinance_news(symbol: str, limit: int) -> List[dict]:
    """Fetch news directly from yfinance."""
    try:
        ticker = yf.Ticker(symbol)
        raw = getattr(ticker, "news", None)
        if not raw:
            return []
        articles = []
        for item in raw[:limit]:
            # yfinance >= 0.2.31 returns {"id": ..., "content": {...}}
            content = item.get("content", item)

            title = content.get("title", "") or item.get("title", "")
            summary = _clean_summary(
                content.get("summary", "") or item.get("summary", "")
            )

            # URL
            canon = (
                content.get("canonicalUrl")
                or content.get("clickThroughUrl")
                or {}
            )
            url = canon.get("url", "") if isinstance(canon, dict) else ""
            url = url or item.get("link", "")

            # Publisher / source
            provider = content.get("provider") or {}
            if isinstance(provider, dict):
                source = provider.get("displayName", "")
            else:
                source = ""
            source = source or item.get("publisher", "Unknown") or "Unknown"

            # Publish time
            pub_date = content.get("pubDate") or content.get("displayTime")
            if isinstance(pub_date, str):
                published = pub_date
            elif isinstance(pub_date, (int, float)):
                published = datetime.fromtimestamp(pub_date).isoformat()
            else:
                ts = item.get("providerPublishTime")
                if isinstance(ts, (int, float)):
                    published = datetime.fromtimestamp(ts).isoformat()
                else:
                    published = datetime.now().isoformat()

            # Thumbnail
            thumb = content.get("thumbnail") or item.get("thumbnail") or {}
            resolutions = (
                thumb.get("resolutions", []) if isinstance(thumb, dict) else []
            )
            image_url = resolutions[0].get("url") if resolutions else None

            if not title:
                continue

            articles.append({
                "title": title,
                "url": url,
                "source": source,
                "published": published,
                "summary": summary,
                "image": image_url,
            })
        return articles
    except Exception as exc:
        logger.warning(f"yfinance news failed for {symbol}: {exc}")
        return []


def _fetch_google_news_rss(query: str, limit: int) -> List[dict]:
    """Fetch news from the Google News RSS feed (no API key required)."""
    try:
        import feedparser

        url = (
            "https://news.google.com/rss/search?"
            f"q={quote(query)}&hl=en-US&gl=US&ceid=US:en"
        )
        # Use requests to fetch the XML (avoids feedparser SSL issues)
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        feed = feedparser.parse(resp.text)
        articles = []
        for entry in feed.entries[:limit]:
            pub = entry.get("published_parsed")
            if pub:
                published = datetime(*pub[:6]).isoformat()
            else:
                published = datetime.now().isoformat()

            source_obj = entry.get("source")
            if isinstance(source_obj, dict):
                source = source_obj.get("title", "Google News")
            else:
                source = "Google News"

            articles.append(
                {
                    "title": entry.get("title", ""),
                    "url": entry.get("link", ""),
                    "source": source,
                    "published": published,
                    "summary": _clean_summary(entry.get("summary", "")),
                    "image": None,
                }
            )
        return articles
    except Exception as exc:
        logger.warning(f"Google News RSS failed for '{query}': {exc}")
        return []


def _get_news(
    query: str,
    limit: int,
    symbol: Optional[str] = None,
) -> List[dict]:
    """Try yfinance first (when a symbol is given), then Google RSS."""
    articles: List[dict] = []
    if symbol:
        articles = _fetch_yfinance_news(symbol, limit)
    if len(articles) < limit:
        rss = _fetch_google_news_rss(query, limit - len(articles))
        articles.extend(rss)
    return [_enrich_article(article) for article in articles[:limit]]


# ── Simple keyword sentiment ──────────────────────────────────────

_POS = {
    "surge",
    "rally",
    "strong",
    "beat",
    "record",
    "bullish",
    "gains",
    "profit",
    "soar",
    "upgrade",
}
_NEG = {
    "plunge",
    "decline",
    "miss",
    "loss",
    "bearish",
    "weak",
    "challenge",
    "concern",
    "downgrade",
    "crash",
}


def _score_sentiment(title: str) -> str:
    lower = title.lower()
    pos = sum(1 for w in _POS if w in lower)
    neg = sum(1 for w in _NEG if w in lower)
    if pos > neg:
        return "positive"
    if neg > pos:
        return "negative"
    return "neutral"


def _enrich_article(article: dict) -> dict:
    sentiment = article.get("sentiment") or _score_sentiment(
        article.get("title", "")
    )
    summary = article.get("summary") or (
        "This update may affect sentiment, valuation, "
        "or near-term risk."
    )

    if sentiment == "positive":
        impact = "Positive catalyst"
        action = (
            "Review whether the thesis is strengthening "
            "before buying or adding."
        )
    elif sentiment == "negative":
        impact = "Risk alert"
        action = (
            "Re-check downside risk and avoid reacting "
            "emotionally to the headline."
        )
    else:
        impact = "Monitor"
        action = (
            "Keep this on watch and wait for clearer "
            "confirmation before acting."
        )

    article["sentiment"] = sentiment
    article["impact"] = impact
    article["why_it_matters"] = summary
    article["suggested_action"] = action
    return article


# ── Endpoints ─────────────────────────────────────────────────────

@router.get("/stock/{symbol}")
async def get_stock_news(symbol: str, limit: int = 20):
    """Get latest news for a specific stock"""
    news_list = _get_news(f"{symbol} stock", limit, symbol=symbol)
    return {
        "symbol": symbol,
        "news_count": len(news_list),
        "news": news_list,
        "last_updated": datetime.now(),
    }


@router.get("/market-news")
async def get_market_news(limit: int = 20):
    """Get general market news"""
    news_list = _get_news("stock market finance", limit)

    # Fallback: fetch news for major proxies when generic query returns nothing
    if not news_list:
        fallback_symbols = ["AAPL", "MSFT", "SPY", "NVDA"]
        seen_titles: set = set()
        for sym in fallback_symbols:
            if len(news_list) >= limit:
                break
            for item in _get_news(f"{sym} stock", 5, symbol=sym):
                t = item.get("title", "")
                if t not in seen_titles:
                    seen_titles.add(t)
                    news_list.append(item)

    return {
        "news_count": len(news_list),
        "news": news_list[:limit],
        "last_updated": datetime.now(),
    }


@router.get("/sector/{sector}")
async def get_sector_news(sector: str, limit: int = 20):
    """Get news for specific sector"""
    news_list = _get_news(f"{sector} sector stocks", limit)
    return {
        "sector": sector,
        "news_count": len(news_list),
        "news": news_list,
        "last_updated": datetime.now(),
    }


@router.get("/trending")
async def get_trending_stocks(limit: int = 10):
    """Get trending stocks and their news"""
    trending_symbols = [
        "AAPL",
        "MSFT",
        "GOOGL",
        "AMZN",
        "NVDA",
        "META",
        "TSLA",
        "BRK-B",
        "JNJ",
        "V",
    ]
    symbols = trending_symbols[:limit]

    async def fetch_one(symbol: str) -> dict:
        news = await asyncio.get_event_loop().run_in_executor(
            None, lambda: _get_news(f"{symbol} stock", 3, symbol=symbol)
        )
        return {"symbol": symbol, "recent_news": news, "news_count": len(news)}

    trending_data = await asyncio.gather(*[fetch_one(s) for s in symbols])
    return {
        "trending_count": len(trending_data),
        "trending": list(trending_data),
        "last_updated": datetime.now(),
    }


@router.get("/search")
async def search_news(query: str, limit: int = 20):
    """Search news by keyword"""
    results = _get_news(query, limit)
    for i, article in enumerate(results):
        article["relevance_score"] = round(0.95 - i * 0.03, 2)
    return {
        "query": query,
        "results_count": len(results),
        "search_results": results,
        "last_updated": datetime.now(),
    }


@router.get("/sentiment/{symbol}")
async def analyze_sentiment(symbol: str):
    """Get news sentiment for a stock"""
    news = _get_news(f"{symbol} stock", 10, symbol=symbol)

    sentiment_count = {"positive": 0, "negative": 0, "neutral": 0}
    for article in news:
        s = _score_sentiment(article.get("title", ""))
        article["sentiment"] = s
        sentiment_count[s] += 1

    total = sum(sentiment_count.values()) or 1
    sentiment_pct = {
        k: round(v / total * 100, 1)
        for k, v in sentiment_count.items()
    }

    return {
        "symbol": symbol,
        "sentiment_count": sentiment_count,
        "sentiment_percent": sentiment_pct,
        "overall_sentiment": max(sentiment_count, key=sentiment_count.get),
        "recent_news": news,
    }
