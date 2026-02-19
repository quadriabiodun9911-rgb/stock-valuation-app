"""
AI Analytics API Endpoints
FastAPI endpoints for AI-powered analytics features
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pandas as pd
import yfinance as yf
from ai_analytics import AIStockAnalytics
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI Analytics"])

# Initialize analytics engine
analytics = AIStockAnalytics()


# ============= REQUEST/RESPONSE MODELS =============

class PredictionRequest(BaseModel):
    symbol: str
    period: str = "1y"  # 1m, 3m, 6m, 1y


class PredictionResponse(BaseModel):
    symbol: str
    current_price: float
    predictions: Dict[str, float]
    confidence: float
    upside: float
    downside: float
    recommendation: str
    reasoning: List[str]


class TechnicalAnalysisResponse(BaseModel):
    symbol: str
    rsi: float
    macd: str
    trend: str
    support: float
    resistance: float
    momentum: float
    signals: List[str]


class ValuationResponse(BaseModel):
    symbol: str
    current_price: float
    intrinsic_value: float
    margin_of_safety: float
    valuation_range: Dict[str, float]
    methods: Dict[str, float]


class RecommendationResponse(BaseModel):
    symbol: str
    action: str
    confidence: float
    target_price: float
    stop_loss: float
    risk_reward_ratio: float
    catalysts: List[str]
    risks: List[str]


class RiskAssessmentResponse(BaseModel):
    symbol: str
    risk_level: str
    risk_score: float
    volatility: float
    max_drawdown: float
    beta: float
    var_95: float
    cvar_95: float


class AnomalyAlertResponse(BaseModel):
    symbol: str
    alerts: List[Dict[str, Any]]


class PortfolioAnalysisRequest(BaseModel):
    symbols: List[str]
    weights: List[float]


class PortfolioAnalysisResponse(BaseModel):
    concentration_score: float
    diversification_level: str
    num_holdings: int
    largest_position: float
    composition_metrics: Dict[str, Any]


# ============= PREDICTION ENDPOINTS =============

@router.post("/predict", response_model=PredictionResponse)
async def predict_stock_price(request: PredictionRequest):
    """
    Predict future stock price using AI models
    
    - **symbol**: Stock ticker symbol
    - **period**: Prediction period (1m, 3m, 6m, 1y)
    """
    try:
        # Fetch historical data
        stock = yf.Ticker(request.symbol)
        hist = stock.history(period="2y")
        current_price = hist['Close'].iloc[-1]
        
        if len(hist) < 60:
            raise HTTPException(
                status_code=400,
                detail="Insufficient historical data for prediction"
            )
        
        # Generate prediction
        prediction = analytics.predict_future_prices(
            request.symbol, hist, current_price
        )
        
        return PredictionResponse(
            symbol=prediction.symbol,
            current_price=prediction.current_price,
            predictions={
                "1_month": prediction.predicted_price_1m,
                "3_months": prediction.predicted_price_3m,
                "6_months": prediction.predicted_price_6m,
                "1_year": prediction.predicted_price_1y
            },
            confidence=prediction.confidence_score,
            upside=prediction.upside_potential,
            downside=prediction.downside_risk,
            recommendation=prediction.recommendation,
            reasoning=prediction.reasoning
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction error for {request.symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/technical-analysis/{symbol}", response_model=TechnicalAnalysisResponse)
async def analyze_technical(symbol: str):
    """
    Perform technical analysis on stock
    
    - **symbol**: Stock ticker symbol
    """
    try:
        stock = yf.Ticker(symbol)
        hist = stock.history(period="1y")
        
        if len(hist) < 50:
            raise HTTPException(
                status_code=400,
                detail="Insufficient data for technical analysis"
            )
        
        signals = analytics.analyze_technical_signals(hist, symbol)
        
        # Generate interpretation
        signal_list = []
        if signals.rsi > 70:
            signal_list.append("Overbought (RSI > 70)")
        elif signals.rsi < 30:
            signal_list.append("Oversold (RSI < 30)")
        
        if signals.macd_signal == "BULLISH":
            signal_list.append("Bullish MACD crossover")
        elif signals.macd_signal == "BEARISH":
            signal_list.append("Bearish MACD crossover")
        
        return TechnicalAnalysisResponse(
            symbol=symbol,
            rsi=signals.rsi,
            macd=signals.macd_signal,
            trend=signals.moving_avg_trend,
            support=signals.support_level,
            resistance=signals.resistance_level,
            momentum=signals.momentum_score,
            signals=signal_list if signal_list else ["No clear signals"]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Technical analysis error for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/intrinsic-value/{symbol}", response_model=ValuationResponse)
async def get_intrinsic_value(symbol: str):
    """
    Calculate intrinsic value using AI-based methods
    
    - **symbol**: Stock ticker symbol
    """
    try:
        stock = yf.Ticker(symbol)
        hist = stock.history(period="2y")
        current_price = hist['Close'].iloc[-1]
        
        # Get financial data
        info = stock.info
        
        valuation = analytics.estimate_intrinsic_value(
            symbol, current_price, info, hist
        )
        
        if not valuation:
            raise HTTPException(
                status_code=400,
                detail="Unable to calculate intrinsic value"
            )
        
        return ValuationResponse(
            symbol=symbol,
            current_price=valuation['current_price'],
            intrinsic_value=valuation['intrinsic_value'],
            margin_of_safety=valuation['margin_of_safety'],
            valuation_range=valuation['valuation_range'],
            methods={
                "dcf": valuation['dcf_value'],
                "relative": valuation['relative_value'],
                "asset_based": valuation['asset_value']
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Intrinsic value error for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommendation", response_model=RecommendationResponse)
async def get_ai_recommendation(request: PredictionRequest):
    """
    Get AI-powered stock recommendation
    
    - **symbol**: Stock ticker symbol
    """
    try:
        stock = yf.Ticker(request.symbol)
        hist = stock.history(period="2y")
        current_price = hist['Close'].iloc[-1]
        info = stock.info
        
        if len(hist) < 60:
            raise HTTPException(
                status_code=400,
                detail="Insufficient data for recommendation"
            )
        
        # Get all analyses
        prediction = analytics.predict_future_prices(
            request.symbol, hist, current_price
        )
        technical = analytics.analyze_technical_signals(hist, request.symbol)
        valuation = analytics.estimate_intrinsic_value(
            request.symbol, current_price, info, hist
        )
        
        # Generate recommendation
        recommendation = analytics.generate_ai_recommendation(
            request.symbol, current_price, prediction, technical, valuation
        )
        
        return RecommendationResponse(
            symbol=recommendation.symbol,
            action=recommendation.action,
            confidence=recommendation.confidence,
            target_price=recommendation.target_price,
            stop_loss=recommendation.stop_loss,
            risk_reward_ratio=recommendation.risk_reward_ratio,
            catalysts=recommendation.key_catalysts,
            risks=recommendation.risks
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Recommendation error for {request.symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/risk-assessment/{symbol}", response_model=RiskAssessmentResponse)
async def assess_stock_risk(symbol: str):
    """
    Assess risk level and metrics for stock
    
    - **symbol**: Stock ticker symbol
    """
    try:
        stock = yf.Ticker(symbol)
        hist = stock.history(period="2y")
        current_price = hist['Close'].iloc[-1]
        
        if len(hist) < 60:
            raise HTTPException(
                status_code=400,
                detail="Insufficient data for risk assessment"
            )
        
        prediction = analytics.predict_future_prices(
            symbol, hist, current_price
        )
        risk = analytics.assess_risk_level(symbol, hist, current_price, prediction)
        
        if not risk:
            raise HTTPException(
                status_code=400,
                detail="Unable to assess risk"
            )
        
        return RiskAssessmentResponse(
            symbol=symbol,
            risk_level=risk['risk_level'],
            risk_score=risk['risk_score'],
            volatility=risk['volatility'],
            max_drawdown=risk['max_drawdown'],
            beta=risk['beta'],
            var_95=risk['var_95'],
            cvar_95=risk['cvar_95']
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Risk assessment error for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/anomalies/{symbol}", response_model=AnomalyAlertResponse)
async def detect_anomalies(symbol: str):
    """
    Detect and report anomalies for stock
    
    - **symbol**: Stock ticker symbol
    """
    try:
        stock = yf.Ticker(symbol)
        hist = stock.history(period="3m")
        current_price = hist['Close'].iloc[-1]
        
        if len(hist) < 30:
            raise HTTPException(
                status_code=400,
                detail="Insufficient data for anomaly detection"
            )
        
        alerts = analytics.detect_anomalies(symbol, hist, current_price)
        
        alert_list = [
            {
                "type": alert.alert_type,
                "severity": alert.severity,
                "description": alert.description,
                "suggested_action": alert.suggested_action,
                "timestamp": alert.timestamp
            }
            for alert in alerts
        ]
        
        return AnomalyAlertResponse(
            symbol=symbol,
            alerts=alert_list if alert_list else []
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Anomaly detection error for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/portfolio-analysis", response_model=PortfolioAnalysisResponse)
async def analyze_portfolio(request: PortfolioAnalysisRequest):
    """
    Analyze portfolio composition and diversification
    
    - **symbols**: List of stock symbols
    - **weights**: Portfolio weights (must sum to 1.0)
    """
    try:
        if len(request.symbols) != len(request.weights):
            raise HTTPException(
                status_code=400,
                detail="Number of symbols must match number of weights"
            )
        
        if abs(sum(request.weights) - 1.0) > 0.01:
            raise HTTPException(
                status_code=400,
                detail="Weights must sum to 1.0"
            )
        
        analysis = analytics.analyze_portfolio_composition(
            request.symbols, request.weights
        )
        
        if not analysis:
            raise HTTPException(
                status_code=400,
                detail="Unable to analyze portfolio"
            )
        
        return PortfolioAnalysisResponse(
            concentration_score=analysis['concentration_score'],
            diversification_level=analysis['diversification_level'],
            num_holdings=analysis['number_of_holdings'],
            largest_position=analysis['largest_position'],
            composition_metrics={
                "hhi": analysis['hhi'],
                "smallest_position": analysis['smallest_position']
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Portfolio analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= COMPARISON ENDPOINTS =============

@router.get("/compare-stocks")
async def compare_stocks(symbols: List[str] = Query(...)):
    """
    Compare AI analysis across multiple stocks
    
    - **symbols**: List of stock ticker symbols to compare
    """
    try:
        if len(symbols) > 10:
            raise HTTPException(
                status_code=400,
                detail="Maximum 10 stocks for comparison"
            )
        
        comparisons = []
        
        for symbol in symbols:
            stock = yf.Ticker(symbol)
            hist = stock.history(period="2y")
            
            if len(hist) < 60:
                continue
            
            current_price = hist['Close'].iloc[-1]
            info = stock.info
            
            prediction = analytics.predict_future_prices(
                symbol, hist, current_price
            )
            technical = analytics.analyze_technical_signals(hist, symbol)
            risk = analytics.assess_risk_level(symbol, hist, current_price, prediction)
            
            comparisons.append({
                "symbol": symbol,
                "current_price": current_price,
                "upside_potential": prediction.upside_potential,
                "risk_level": risk.get('risk_level', 'UNKNOWN'),
                "trend": technical.moving_avg_trend,
                "recommendation": prediction.recommendation
            })
        
        return {
            "comparison": comparisons,
            "best_opportunity": max(
                comparisons,
                key=lambda x: x['upside_potential']
            ) if comparisons else None,
            "lowest_risk": min(
                comparisons,
                key=lambda x: x['risk_level']
            ) if comparisons else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Comparison error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= MARKET INSIGHTS =============

@router.get("/market-insights")
async def get_market_insights(symbols: List[str] = Query(...)):
    """
    Get aggregate market insights from multiple stocks
    """
    try:
        insights = {
            "timestamp": pd.Timestamp.now().isoformat(),
            "market_sentiment": "NEUTRAL",
            "stocks_analyzed": len(symbols),
            "bullish_count": 0,
            "bearish_count": 0,
            "average_upside": 0,
            "average_risk": 0,
            "key_opportunities": [],
            "key_risks": []
        }
        
        upsides = []
        risks = []
        sentiments = []
        
        for symbol in symbols[:5]:  # Limit to 5 for performance
            try:
                stock = yf.Ticker(symbol)
                hist = stock.history(period="2y")
                
                if len(hist) < 60:
                    continue
                
                current_price = hist['Close'].iloc[-1]
                info = stock.info
                
                prediction = analytics.predict_future_prices(
                    symbol, hist, current_price
                )
                
                upsides.append(prediction.upside_potential)
                risks.append(prediction.downside_risk)
                sentiments.append(prediction.recommendation)
                
                if "BUY" in prediction.recommendation:
                    insights["bullish_count"] += 1
                elif "SELL" in prediction.recommendation:
                    insights["bearish_count"] += 1
                
            except:
                continue
        
        if upsides:
            insights["average_upside"] = sum(upsides) / len(upsides)
        if risks:
            insights["average_risk"] = sum(risks) / len(risks)
        
        # Determine market sentiment
        if insights["bullish_count"] > insights["bearish_count"]:
            insights["market_sentiment"] = "BULLISH"
        elif insights["bearish_count"] > insights["bullish_count"]:
            insights["market_sentiment"] = "BEARISH"
        
        return insights
    
    except Exception as e:
        logger.error(f"Market insights error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
