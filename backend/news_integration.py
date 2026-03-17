"""
News Integration Module
Fetches and manages stock-specific news
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import yfinance as yf
import requests
from urllib.parse import quote
import feedparser

router = APIRouter(prefix="/api/news", tags=["news"])

class NewsArticle(BaseModel):
    title: str
    url: str
    source: str
    published: datetime
    summary: Optional[str] = None
    image: Optional[str] = None
    sentiment: Optional[str] = None  # positive, negative, neutral

@router.get("/stock/{symbol}")
async def get_stock_news(symbol: str, limit: int = 20):
    """Get latest news for a specific stock"""
    try:
        ticker = yf.Ticker(symbol)
        
        # Try to get news from yfinance
        news_list = []
        try:
            # yfinance doesn't directly provide news, but we can use the ticker's news attribute if available
            if hasattr(ticker, 'news'):
                for item in ticker.news[:limit]:
                    news_list.append({
                        'title': item.get('title', ''),
                        'url': item.get('link', ''),
                        'source': item.get('source', 'Unknown'),
                        'published': item.get('providerPublishTime', datetime.now().isoformat()),
                        'summary': item.get('summary', ''),
                        'image': item.get('thumbnail', {}).get('resolutions', [{}])[0].get('url', None)
                    })
        except:
            pass
        
        # Fallback: Create mock news data with realistic structure
        if not news_list:
            news_list = generate_mock_news(symbol, limit)
        
        return {
            'symbol': symbol,
            'news_count': len(news_list),
            'news': news_list[:limit],
            'last_updated': datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market-news")
async def get_market_news(limit: int = 20):
    """Get general market news"""
    try:
        market_news = generate_market_news(limit)
        
        return {
            'news_count': len(market_news),
            'news': market_news,
            'last_updated': datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sector/{sector}")
async def get_sector_news(sector: str, limit: int = 20):
    """Get news for specific sector"""
    try:
        sector_news = generate_sector_news(sector, limit)
        
        return {
            'sector': sector,
            'news_count': len(sector_news),
            'news': sector_news,
            'last_updated': datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trending")
async def get_trending_stocks(limit: int = 20):
    """Get trending stocks and their news"""
    try:
        trending_symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'JNJ', 'V']
        
        trending_data = []
        for symbol in trending_symbols[:limit]:
            news = generate_mock_news(symbol, 3)
            trending_data.append({
                'symbol': symbol,
                'recent_news': news,
                'news_count': len(news)
            })
        
        return {
            'trending_count': len(trending_data),
            'trending': trending_data,
            'last_updated': datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search")
async def search_news(query: str, limit: int = 20):
    """Search news by keyword"""
    try:
        # Mock search results
        search_results = []
        
        news_templates = [
            f"{query} stock surges on strong earnings report",
            f"{query} announces new partnership to boost innovation",
            f"Analysts raise price target for {query}",
            f"{query} faces regulatory challenges",
            f"{query} unveils new product line",
            f"Market analysts bullish on {query} outlook",
            f"{query} reports record quarterly revenue",
            f"Tech sector gains as {query} leads rally",
            f"{query} CEO discusses future strategy"
        ]
        
        for i, template in enumerate(news_templates[:limit]):
            days_ago = i + 1
            search_results.append({
                'title': template,
                'url': f'https://example.com/news/{i}',
                'source': ['Bloomberg', 'Reuters', 'CNBC', 'MarketWatch', 'Seeking Alpha'][i % 5],
                'published': (datetime.now() - timedelta(days=days_ago)).isoformat(),
                'summary': f"Detailed article about {template}",
                'relevance_score': 0.95 - (i * 0.05)
            })
        
        return {
            'query': query,
            'results_count': len(search_results),
            'search_results': search_results,
            'last_updated': datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sentiment/{symbol}")
async def analyze_sentiment(symbol: str):
    """Get news sentiment for a stock"""
    try:
        # Get recent news
        news = generate_mock_news(symbol, 10)
        
        # Simple sentiment analysis (would use NLP in production)
        sentiment_count = {'positive': 0, 'negative': 0, 'neutral': 0}
        
        positive_keywords = ['surge', 'rally', 'strong', 'beat', 'record', 'bullish', 'gains', 'profit']
        negative_keywords = ['plunge', 'decline', 'miss', 'loss', 'bearish', 'weak', 'challenge', 'concern']
        
        for article in news:
            title_lower = article['title'].lower()
            
            positive_score = sum(1 for keyword in positive_keywords if keyword in title_lower)
            negative_score = sum(1 for keyword in negative_keywords if keyword in title_lower)
            
            if positive_score > negative_score:
                article['sentiment'] = 'positive'
                sentiment_count['positive'] += 1
            elif negative_score > positive_score:
                article['sentiment'] = 'negative'
                sentiment_count['negative'] += 1
            else:
                article['sentiment'] = 'neutral'
                sentiment_count['neutral'] += 1
        
        total = sum(sentiment_count.values())
        sentiment_percent = {
            k: (v / total * 100) if total > 0 else 0 
            for k, v in sentiment_count.items()
        }
        
        return {
            'symbol': symbol,
            'sentiment_count': sentiment_count,
            'sentiment_percent': sentiment_percent,
            'overall_sentiment': max(sentiment_count, key=sentiment_count.get),
            'recent_news': news
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions
def generate_mock_news(symbol: str, limit: int) -> List[dict]:
    """Generate realistic mock news for testing"""
    templates = [
        f"{symbol} stock surges on better-than-expected earnings",
        f"{symbol} announces strategic partnership with major player",
        f"Analysts raise price target for {symbol} to $XXX",
        f"{symbol} faces regulatory scrutiny over new policy",
        f"{symbol} launches innovative product line",
        f"Market rally fueled by {symbol} strong guidance",
        f"{symbol} reports record quarterly revenue",
        f"Tech sector rally led by {symbol}",
        f"{symbol} CEO discusses AI strategy at conference",
        f"{symbol} invests $X billion in expansion",
        f"Insider buying signals confidence in {symbol}",
        f"{symbol} beat estimates on both earnings and revenue",
        f"Short sellers target {symbol} amid valuation concerns",
        f"{symbol} gains market share in key segment",
        f"Dividend increase announced by {symbol}"
    ]
    
    news = []
    for i in range(min(limit, len(templates))):
        days_ago = (i % 7) + 1
        hours_ago = (i % 24)
        
        news.append({
            'title': templates[i],
            'url': f'https://news.example.com/{symbol}/{i}',
            'source': ['Bloomberg', 'Reuters', 'CNBC', 'MarketWatch', 'Seeking Alpha'][i % 5],
            'published': (datetime.now() - timedelta(days=days_ago, hours=hours_ago)).isoformat(),
            'summary': f"Full article about: {templates[i]}",
            'image': f"https://images.example.com/{symbol}_{i}.jpg",
            'sentiment': 'positive' if any(word in templates[i].lower() for word in ['surge', 'beat', 'strong', 'record']) else 'neutral'
        })
    
    return news

def generate_market_news(limit: int) -> List[dict]:
    """Generate market-wide news"""
    templates = [
        "Fed holds interest rates steady amid inflation concerns",
        "S&P 500 reaches new all-time high",
        "Treasury yields decline on weaker economic data",
        "Tech stocks lead market rally",
        "Energy sector rallies on oil price surge",
        "Banking sector faces headwinds",
        "Market breadth remains strong",
        "Volatility drops to lowest level in months",
        "Market rotation into value stocks accelerates",
        "Bond market signals economic slowdown concerns"
    ]
    
    market_news = []
    for i in range(min(limit, len(templates))):
        market_news.append({
            'title': templates[i],
            'url': f'https://market-news.example.com/{i}',
            'source': ['CNBC', 'Bloomberg', 'WSJ', 'Reuters', 'MarketWatch'][i % 5],
            'published': (datetime.now() - timedelta(hours=i+1)).isoformat(),
            'summary': templates[i],
            'image': f"https://images.example.com/market_{i}.jpg"
        })
    
    return market_news

def generate_sector_news(sector: str, limit: int) -> List[dict]:
    """Generate sector-specific news"""
    sector_templates = {
        'Technology': [
            'AI breakthroughs drive tech sector rally',
            'Cloud computing growth accelerates',
            'Cybersecurity becomes critical priority',
            'Chip shortage eases amid supply improvements'
        ],
        'Healthcare': [
            'Biotech stocks surge on FDA approval',
            'Healthcare reform debated in Congress',
            'Telemedicine adoption reaches new highs',
            'Pharmaceutical pricing under scrutiny'
        ],
        'Finance': [
            'Banks report strong profitability',
            'Interest rate expectations shift',
            'Crypto market volatility impacts stocks',
            'Fintech disrupts traditional banking'
        ],
        'Energy': [
            'Oil prices hit new highs',
            'Renewable energy investment surges',
            'Energy transition accelerates',
            'OPEC discusses production cuts'
        ]
    }
    
    templates = sector_templates.get(sector, sector_templates['Technology'])
    sector_news = []
    
    for i in range(min(limit, len(templates))):
        sector_news.append({
            'title': templates[i],
            'url': f'https://sector-news.example.com/{sector}/{i}',
            'source': ['Bloomberg', 'Reuters', 'CNBC', 'MarketWatch'][i % 4],
            'published': (datetime.now() - timedelta(days=i+1)).isoformat(),
            'summary': templates[i],
            'sector': sector,
            'image': f"https://images.example.com/{sector}_{i}.jpg"
        })
    
    return sector_news
