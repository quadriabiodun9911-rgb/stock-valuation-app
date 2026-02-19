"""
AI-Powered Stock Analytics Module
Provides advanced analytics, predictions, and intelligent recommendations
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any
import logging
from dataclasses import dataclass
from enum import Enum
import json

logger = logging.getLogger(__name__)


class RiskLevel(Enum):
    VERY_LOW = "very_low"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    VERY_HIGH = "very_high"


class TrendDirection(Enum):
    STRONG_UPTREND = "strong_uptrend"
    UPTREND = "uptrend"
    SIDEWAYS = "sideways"
    DOWNTREND = "downtrend"
    STRONG_DOWNTREND = "strong_downtrend"


@dataclass
class StockPrediction:
    """Stock price prediction data"""
    symbol: str
    current_price: float
    predicted_price_1m: float
    predicted_price_3m: float
    predicted_price_6m: float
    predicted_price_1y: float
    confidence_score: float
    upside_potential: float
    downside_risk: float
    recommendation: str
    reasoning: List[str]


@dataclass
class TechnicalSignals:
    """Technical analysis signals"""
    rsi: float
    macd_signal: str
    moving_avg_trend: str
    support_level: float
    resistance_level: float
    momentum_score: float


@dataclass
class AIRecommendation:
    """AI-based stock recommendation"""
    symbol: str
    action: str  # BUY, HOLD, SELL
    confidence: float
    target_price: float
    stop_loss: float
    risk_reward_ratio: float
    key_catalysts: List[str]
    risks: List[str]


@dataclass
class AnomalyAlert:
    """Anomaly detection alert"""
    symbol: str
    alert_type: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    description: str
    timestamp: str
    suggested_action: str


class AIStockAnalytics:
    """Advanced AI-powered stock analytics engine"""
    
    def __init__(self):
        self.short_term_window = 20  # 1 month
        self.medium_term_window = 63  # 3 months
        self.long_term_window = 252  # 1 year
        
    # ============= PRICE PREDICTION =============
    
    def predict_future_prices(self, 
                            symbol: str,
                            historical_data: pd.DataFrame,
                            current_price: float) -> StockPrediction:
        """
        Predict future stock prices using multiple methods
        """
        try:
            # Ensure we have enough data
            if len(historical_data) < 60:
                logger.warning(f"Insufficient data for {symbol}")
                return self._default_prediction(symbol, current_price)
            
            # Extract prices
            prices = historical_data['Close'].values
            returns = np.diff(prices) / prices[:-1]
            
            # Calculate prediction parameters
            mean_return = np.mean(returns)
            volatility = np.std(returns)
            
            # Multi-horizon predictions
            pred_1m = self._monte_carlo_prediction(prices[-1], mean_return, volatility, 21)
            pred_3m = self._monte_carlo_prediction(prices[-1], mean_return, volatility, 63)
            pred_6m = self._monte_carlo_prediction(prices[-1], mean_return, volatility, 126)
            pred_1y = self._monte_carlo_prediction(prices[-1], mean_return, volatility, 252)
            
            # Calculate confidence based on data quality and stability
            confidence = self._calculate_prediction_confidence(returns, volatility)
            
            # Calculate upside/downside potential
            upside = ((pred_1y - current_price) / current_price) * 100
            downside = self._estimate_downside_risk(prices, volatility)
            
            # Generate recommendation
            recommendation = self._generate_price_recommendation(
                upside, downside, confidence
            )
            
            # Reasoning
            reasoning = self._generate_prediction_reasoning(
                mean_return, volatility, upside, confidence
            )
            
            return StockPrediction(
                symbol=symbol,
                current_price=current_price,
                predicted_price_1m=pred_1m,
                predicted_price_3m=pred_3m,
                predicted_price_6m=pred_6m,
                predicted_price_1y=pred_1y,
                confidence_score=confidence,
                upside_potential=upside,
                downside_risk=downside,
                recommendation=recommendation,
                reasoning=reasoning
            )
            
        except Exception as e:
            logger.error(f"Error predicting prices for {symbol}: {str(e)}")
            return self._default_prediction(symbol, current_price)
    
    def _monte_carlo_prediction(self, 
                               current_price: float,
                               mean_return: float,
                               volatility: float,
                               days: int,
                               simulations: int = 1000) -> float:
        """Monte Carlo simulation for price prediction"""
        dt = 1/252  # Daily
        results = []
        
        for _ in range(simulations):
            price = current_price
            for _ in range(days):
                random_return = np.random.normal(mean_return * dt, volatility * np.sqrt(dt))
                price *= (1 + random_return)
            results.append(price)
        
        # Return median prediction
        return float(np.median(results))
    
    def _calculate_prediction_confidence(self, 
                                        returns: np.ndarray,
                                        volatility: float) -> float:
        """Calculate confidence in prediction"""
        # Lower volatility = higher confidence
        # Longer stable history = higher confidence
        volatility_factor = max(0, 1 - (volatility / 0.05))  # 5% volatility = 0 confidence
        return min(0.95, max(0.3, volatility_factor))
    
    def _estimate_downside_risk(self, prices: np.ndarray, volatility: float) -> float:
        """Estimate downside risk percentage"""
        max_drawdown = self._calculate_max_drawdown(prices)
        return max_drawdown * 100
    
    def _calculate_max_drawdown(self, prices: np.ndarray) -> float:
        """Calculate maximum drawdown"""
        cummax = np.maximum.accumulate(prices)
        drawdown = (prices - cummax) / cummax
        return float(np.min(drawdown))
    
    def _generate_price_recommendation(self, 
                                      upside: float,
                                      downside: float,
                                      confidence: float) -> str:
        """Generate recommendation based on risk/reward"""
        risk_reward_ratio = upside / abs(downside) if downside != 0 else 0
        
        if confidence < 0.4:
            return "HOLD"
        
        if upside > 25 and risk_reward_ratio > 2:
            return "STRONG_BUY"
        elif upside > 15 and risk_reward_ratio > 1.5:
            return "BUY"
        elif upside > 5 and risk_reward_ratio > 1:
            return "BUY"
        elif abs(upside) < 5:
            return "HOLD"
        else:
            return "SELL"
    
    def _generate_prediction_reasoning(self,
                                      mean_return: float,
                                      volatility: float,
                                      upside: float,
                                      confidence: float) -> List[str]:
        """Generate reasoning for prediction"""
        reasoning = []
        
        if mean_return > 0.001:
            reasoning.append("Positive historical momentum")
        elif mean_return < -0.001:
            reasoning.append("Negative historical momentum")
        
        if volatility > 0.03:
            reasoning.append("High volatility - increased uncertainty")
        else:
            reasoning.append("Low volatility - stable movement")
        
        if upside > 20:
            reasoning.append("Significant upside potential identified")
        elif upside < -20:
            reasoning.append("Significant downside risk identified")
        
        if confidence > 0.8:
            reasoning.append("High prediction confidence based on historical patterns")
        elif confidence < 0.5:
            reasoning.append("Low prediction confidence - recommend caution")
        
        return reasoning
    
    def _default_prediction(self, symbol: str, current_price: float) -> StockPrediction:
        """Default prediction when analysis fails"""
        return StockPrediction(
            symbol=symbol,
            current_price=current_price,
            predicted_price_1m=current_price,
            predicted_price_3m=current_price,
            predicted_price_6m=current_price,
            predicted_price_1y=current_price,
            confidence_score=0.1,
            upside_potential=0.0,
            downside_risk=0.0,
            recommendation="HOLD",
            reasoning=["Insufficient data for prediction"]
        )
    
    # ============= TECHNICAL ANALYSIS =============
    
    def analyze_technical_signals(self, 
                                 historical_data: pd.DataFrame,
                                 symbol: str) -> TechnicalSignals:
        """Comprehensive technical analysis"""
        try:
            prices = historical_data['Close'].values
            
            # Calculate indicators
            rsi = self._calculate_rsi(prices)
            macd_signal = self._calculate_macd_signal(prices)
            ma_trend = self._analyze_moving_averages(prices)
            support, resistance = self._identify_support_resistance(prices)
            momentum = self._calculate_momentum_score(prices)
            
            return TechnicalSignals(
                rsi=rsi,
                macd_signal=macd_signal,
                moving_avg_trend=ma_trend,
                support_level=support,
                resistance_level=resistance,
                momentum_score=momentum
            )
        except Exception as e:
            logger.error(f"Error analyzing technical signals for {symbol}: {str(e)}")
            return self._default_technical_signals()
    
    def _calculate_rsi(self, prices: np.ndarray, period: int = 14) -> float:
        """Calculate Relative Strength Index"""
        if len(prices) < period + 1:
            return 50.0
        
        deltas = np.diff(prices)
        gains = deltas.copy()
        losses = deltas.copy()
        
        gains[gains < 0] = 0
        losses[losses > 0] = 0
        losses = np.abs(losses)
        
        avg_gain = np.mean(gains[-period:])
        avg_loss = np.mean(losses[-period:])
        
        if avg_loss == 0:
            return 100.0 if avg_gain > 0 else 50.0
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return float(rsi)
    
    def _calculate_macd_signal(self, prices: np.ndarray) -> str:
        """Calculate MACD signal"""
        if len(prices) < 26:
            return "NEUTRAL"
        
        ema_12 = self._calculate_ema(prices, 12)
        ema_26 = self._calculate_ema(prices, 26)
        macd = ema_12 - ema_26
        
        signal_line = self._calculate_ema(np.array([macd]), 9)
        
        if macd > signal_line[-1]:
            return "BULLISH"
        elif macd < signal_line[-1]:
            return "BEARISH"
        else:
            return "NEUTRAL"
    
    def _calculate_ema(self, prices: np.ndarray, period: int) -> np.ndarray:
        """Calculate Exponential Moving Average"""
        if len(prices) < period:
            return prices
        
        multiplier = 2 / (period + 1)
        ema = np.zeros(len(prices))
        ema[0] = prices[0]
        
        for i in range(1, len(prices)):
            ema[i] = prices[i] * multiplier + ema[i-1] * (1 - multiplier)
        
        return ema
    
    def _analyze_moving_averages(self, prices: np.ndarray) -> str:
        """Analyze moving average trends"""
        if len(prices) < 200:
            return "INSUFFICIENT_DATA"
        
        ma_50 = np.mean(prices[-50:])
        ma_200 = np.mean(prices[-200:])
        current = prices[-1]
        
        if current > ma_50 > ma_200:
            return "STRONG_UPTREND"
        elif current > ma_50:
            return "UPTREND"
        elif current < ma_50 < ma_200:
            return "STRONG_DOWNTREND"
        elif current < ma_50:
            return "DOWNTREND"
        else:
            return "SIDEWAYS"
    
    def _identify_support_resistance(self, 
                                    prices: np.ndarray,
                                    window: int = 20) -> Tuple[float, float]:
        """Identify support and resistance levels"""
        if len(prices) < window:
            return prices.min(), prices.max()
        
        recent = prices[-window:]
        support = float(np.min(recent))
        resistance = float(np.max(recent))
        
        return support, resistance
    
    def _calculate_momentum_score(self, prices: np.ndarray) -> float:
        """Calculate momentum score (0-100)"""
        if len(prices) < 20:
            return 50.0
        
        returns = np.diff(prices[-20:]) / prices[-20:-1]
        momentum = np.mean(returns) * 1000  # Scale up
        
        # Normalize to 0-100
        momentum_score = 50 + (momentum * 10)
        return float(np.clip(momentum_score, 0, 100))
    
    def _default_technical_signals(self) -> TechnicalSignals:
        """Default technical signals"""
        return TechnicalSignals(
            rsi=50.0,
            macd_signal="NEUTRAL",
            moving_avg_trend="INSUFFICIENT_DATA",
            support_level=0.0,
            resistance_level=0.0,
            momentum_score=50.0
        )
    
    # ============= INTRINSIC VALUE ANALYSIS =============
    
    def estimate_intrinsic_value(self,
                                symbol: str,
                                current_price: float,
                                financial_data: Dict[str, Any],
                                historical_data: pd.DataFrame) -> Dict[str, Any]:
        """Estimate intrinsic value using multiple methods"""
        try:
            pe_ratio = financial_data.get('trailingPE', 0)
            pb_ratio = financial_data.get('priceToBook', 0)
            earnings_growth = financial_data.get('earningsGrowth', 0.1)
            
            # DCF-based valuation
            dcf_value = self._estimate_dcf_value(
                symbol, financial_data, earnings_growth
            )
            
            # Relative valuation
            relative_value = self._estimate_relative_value(financial_data)
            
            # Asset-based valuation
            asset_value = self._estimate_asset_value(financial_data)
            
            # Average intrinsic value
            intrinsic_value = np.mean([
                dcf_value, relative_value, asset_value
            ])
            
            margin_of_safety = ((intrinsic_value - current_price) / intrinsic_value) * 100
            
            return {
                'dcf_value': dcf_value,
                'relative_value': relative_value,
                'asset_value': asset_value,
                'intrinsic_value': intrinsic_value,
                'current_price': current_price,
                'margin_of_safety': margin_of_safety,
                'valuation_range': {
                    'lower_bound': intrinsic_value * 0.85,
                    'upper_bound': intrinsic_value * 1.15
                }
            }
        except Exception as e:
            logger.error(f"Error estimating intrinsic value for {symbol}: {str(e)}")
            return {}
    
    def _estimate_dcf_value(self,
                           symbol: str,
                           financial_data: Dict[str, Any],
                           growth_rate: float) -> float:
        """DCF-based valuation"""
        try:
            shares_outstanding = financial_data.get('sharesOutstanding', 1)
            net_income = financial_data.get('netIncome', 0)
            
            if net_income <= 0 or shares_outstanding == 0:
                return 0
            
            eps = net_income / shares_outstanding
            current_pe = financial_data.get('trailingPE', 15)
            
            # Simple DCF: assume earnings grow at growth_rate
            future_eps = eps * ((1 + growth_rate) ** 5)
            normalized_pe = max(10, min(20, current_pe))
            
            dcf_value = future_eps * normalized_pe / (1.10 ** 5)
            
            return float(max(0, dcf_value))
        except:
            return 0
    
    def _estimate_relative_value(self, financial_data: Dict[str, Any]) -> float:
        """Relative valuation based on peer multiples"""
        try:
            current_price = financial_data.get('currentPrice', 0)
            pe = financial_data.get('trailingPE', 15)
            eps = current_price / pe if pe > 0 else 0
            
            # Use industry average PE (assuming 15 as default)
            industry_pe = 15
            fair_value = eps * industry_pe
            
            return float(max(0, fair_value))
        except:
            return 0
    
    def _estimate_asset_value(self, financial_data: Dict[str, Any]) -> float:
        """Asset-based valuation"""
        try:
            pb_ratio = financial_data.get('priceToBook', 1)
            current_price = financial_data.get('currentPrice', 0)
            
            book_value_per_share = current_price / pb_ratio if pb_ratio > 0 else 0
            asset_value = book_value_per_share * 1.2  # Apply 20% premium for intangibles
            
            return float(max(0, asset_value))
        except:
            return 0
    
    # ============= AI RECOMMENDATIONS =============
    
    def generate_ai_recommendation(self,
                                  symbol: str,
                                  current_price: float,
                                  prediction: StockPrediction,
                                  technical_signals: TechnicalSignals,
                                  valuation: Dict[str, Any]) -> AIRecommendation:
        """Generate AI-powered stock recommendation"""
        try:
            # Score factors
            price_score = self._score_price_prediction(prediction)
            technical_score = self._score_technical_signals(technical_signals)
            valuation_score = self._score_valuation(current_price, valuation)
            
            # Combined score
            combined_score = (price_score + technical_score + valuation_score) / 3
            
            # Action
            action = self._determine_action(combined_score, prediction)
            confidence = prediction.confidence_score
            
            # Target price
            target_price = prediction.predicted_price_1y
            stop_loss = current_price * 0.90
            risk_reward = (target_price - current_price) / (current_price - stop_loss) if current_price != stop_loss else 0
            
            # Catalysts and risks
            catalysts = self._identify_catalysts(symbol, prediction, valuation)
            risks = self._identify_risks(symbol, prediction, technical_signals)
            
            return AIRecommendation(
                symbol=symbol,
                action=action,
                confidence=confidence,
                target_price=target_price,
                stop_loss=stop_loss,
                risk_reward_ratio=risk_reward,
                key_catalysts=catalysts,
                risks=risks
            )
        except Exception as e:
            logger.error(f"Error generating recommendation for {symbol}: {str(e)}")
            return AIRecommendation(
                symbol=symbol,
                action="HOLD",
                confidence=0.0,
                target_price=current_price,
                stop_loss=current_price * 0.9,
                risk_reward_ratio=0,
                key_catalysts=[],
                risks=["Unable to generate recommendation"]
            )
    
    def _score_price_prediction(self, prediction: StockPrediction) -> float:
        """Score based on price prediction"""
        upside = prediction.upside_potential
        confidence = prediction.confidence_score
        
        # Higher upside and confidence = higher score
        score = (upside / 100 * 50) + (confidence * 50)
        return float(np.clip(score, 0, 100))
    
    def _score_technical_signals(self, signals: TechnicalSignals) -> float:
        """Score based on technical signals"""
        score = 50  # Neutral starting point
        
        # RSI scoring
        if signals.rsi > 70:
            score -= 10  # Overbought
        elif signals.rsi < 30:
            score += 10  # Oversold (buying opportunity)
        
        # MACD scoring
        if signals.macd_signal == "BULLISH":
            score += 15
        elif signals.macd_signal == "BEARISH":
            score -= 15
        
        # Momentum scoring
        score += (signals.momentum_score - 50) * 0.3
        
        return float(np.clip(score, 0, 100))
    
    def _score_valuation(self, 
                        current_price: float,
                        valuation: Dict[str, Any]) -> float:
        """Score based on valuation"""
        if not valuation or 'intrinsic_value' not in valuation:
            return 50
        
        intrinsic = valuation['intrinsic_value']
        margin = valuation.get('margin_of_safety', 0)
        
        # Positive margin of safety = undervalued
        score = 50 + (margin / 50 * 50)
        
        return float(np.clip(score, 0, 100))
    
    def _determine_action(self, score: float, prediction: StockPrediction) -> str:
        """Determine action based on combined score"""
        if score >= 80 and prediction.upside_potential > 20:
            return "STRONG_BUY"
        elif score >= 65 and prediction.upside_potential > 10:
            return "BUY"
        elif score <= 20 and prediction.upside_potential < -10:
            return "STRONG_SELL"
        elif score <= 35 and prediction.upside_potential < 0:
            return "SELL"
        else:
            return "HOLD"
    
    def _identify_catalysts(self, 
                           symbol: str,
                           prediction: StockPrediction,
                           valuation: Dict[str, Any]) -> List[str]:
        """Identify key catalysts"""
        catalysts = []
        
        if prediction.upside_potential > 25:
            catalysts.append("Strong upside potential")
        
        if valuation and valuation.get('margin_of_safety', 0) > 20:
            catalysts.append("Significant margin of safety")
        
        if prediction.confidence_score > 0.8:
            catalysts.append("Strong historical pattern confirmation")
        
        return catalysts if catalysts else ["Stable fundamentals"]
    
    def _identify_risks(self,
                       symbol: str,
                       prediction: StockPrediction,
                       technical_signals: TechnicalSignals) -> List[str]:
        """Identify key risks"""
        risks = []
        
        if prediction.downside_risk > 15:
            risks.append(f"Significant downside risk: {prediction.downside_risk:.1f}%")
        
        if technical_signals.macd_signal == "BEARISH":
            risks.append("Bearish technical signals")
        
        if technical_signals.rsi > 70:
            risks.append("Stock appears overbought")
        
        if prediction.confidence_score < 0.5:
            risks.append("Low prediction confidence")
        
        return risks if risks else ["Low identified risks"]
    
    # ============= ANOMALY DETECTION =============
    
    def detect_anomalies(self,
                        symbol: str,
                        historical_data: pd.DataFrame,
                        current_price: float) -> List[AnomalyAlert]:
        """Detect market anomalies and alert"""
        alerts = []
        
        try:
            prices = historical_data['Close'].values
            volumes = historical_data.get('Volume', pd.Series()).values if 'Volume' in historical_data else None
            
            # Price anomalies
            price_anomalies = self._detect_price_anomalies(prices, current_price)
            alerts.extend(price_anomalies)
            
            # Volume anomalies
            if volumes is not None and len(volumes) > 0:
                volume_anomalies = self._detect_volume_anomalies(volumes)
                alerts.extend(volume_anomalies)
            
            # Volatility anomalies
            volatility_anomalies = self._detect_volatility_anomalies(prices)
            alerts.extend(volatility_anomalies)
            
        except Exception as e:
            logger.error(f"Error detecting anomalies for {symbol}: {str(e)}")
        
        return alerts
    
    def _detect_price_anomalies(self, 
                               prices: np.ndarray,
                               current_price: float) -> List[AnomalyAlert]:
        """Detect price anomalies"""
        alerts = []
        
        try:
            # Calculate z-score for current price
            mean_price = np.mean(prices[-20:])
            std_price = np.std(prices[-20:])
            
            if std_price > 0:
                z_score = abs((current_price - mean_price) / std_price)
                
                if z_score > 3:
                    alerts.append(AnomalyAlert(
                        symbol="",
                        alert_type="EXTREME_PRICE_MOVEMENT",
                        severity="CRITICAL",
                        description=f"Extreme price movement detected (z-score: {z_score:.2f})",
                        timestamp=datetime.now().isoformat(),
                        suggested_action="Review market news and consider limiting exposure"
                    ))
                elif z_score > 2:
                    alerts.append(AnomalyAlert(
                        symbol="",
                        alert_type="SIGNIFICANT_PRICE_MOVEMENT",
                        severity="HIGH",
                        description=f"Significant price movement detected (z-score: {z_score:.2f})",
                        timestamp=datetime.now().isoformat(),
                        suggested_action="Monitor for potential trend reversal"
                    ))
        except:
            pass
        
        return alerts
    
    def _detect_volume_anomalies(self, volumes: np.ndarray) -> List[AnomalyAlert]:
        """Detect volume anomalies"""
        alerts = []
        
        try:
            if len(volumes) < 5:
                return alerts
            
            mean_volume = np.mean(volumes[-20:])
            current_volume = volumes[-1]
            
            if mean_volume > 0:
                volume_ratio = current_volume / mean_volume
                
                if volume_ratio > 3:
                    alerts.append(AnomalyAlert(
                        symbol="",
                        alert_type="UNUSUAL_VOLUME",
                        severity="HIGH",
                        description=f"Unusual volume spike detected ({volume_ratio:.1f}x average)",
                        timestamp=datetime.now().isoformat(),
                        suggested_action="Check for news or earnings announcement"
                    ))
        except:
            pass
        
        return alerts
    
    def _detect_volatility_anomalies(self, prices: np.ndarray) -> List[AnomalyAlert]:
        """Detect volatility anomalies"""
        alerts = []
        
        try:
            if len(prices) < 30:
                return alerts
            
            recent_vol = np.std(np.diff(prices[-20:]) / prices[-20:-1])
            historical_vol = np.std(np.diff(prices[-100:-20]) / prices[-100:-21])
            
            if historical_vol > 0:
                vol_ratio = recent_vol / historical_vol
                
                if vol_ratio > 2:
                    alerts.append(AnomalyAlert(
                        symbol="",
                        alert_type="INCREASED_VOLATILITY",
                        severity="MEDIUM",
                        description=f"Volatility significantly increased ({vol_ratio:.1f}x historical)",
                        timestamp=datetime.now().isoformat(),
                        suggested_action="Consider reducing position size or using protective options"
                    ))
        except:
            pass
        
        return alerts
    
    # ============= RISK ASSESSMENT =============
    
    def assess_risk_level(self,
                         symbol: str,
                         historical_data: pd.DataFrame,
                         current_price: float,
                         prediction: StockPrediction) -> Dict[str, Any]:
        """Comprehensive risk assessment"""
        try:
            prices = historical_data['Close'].values
            
            # Calculate risk metrics
            volatility = np.std(np.diff(prices) / prices[:-1])
            max_drawdown = abs(self._calculate_max_drawdown(prices))
            beta_estimate = self._estimate_beta(prices)
            var_95 = self._calculate_var(prices, 0.95)
            cvar_95 = self._calculate_cvar(prices, 0.95)
            
            # Determine risk level
            risk_level = self._determine_risk_level(
                volatility, max_drawdown, beta_estimate
            )
            
            return {
                'risk_level': risk_level,
                'volatility': volatility,
                'max_drawdown': max_drawdown,
                'beta': beta_estimate,
                'var_95': var_95,
                'cvar_95': cvar_95,
                'downside_risk': prediction.downside_risk,
                'risk_score': self._calculate_risk_score(
                    volatility, max_drawdown, beta_estimate
                )
            }
        except Exception as e:
            logger.error(f"Error assessing risk for {symbol}: {str(e)}")
            return {}
    
    def _estimate_beta(self, prices: np.ndarray) -> float:
        """Estimate beta (simplified - would need market data for true beta)"""
        if len(prices) < 2:
            return 1.0
        
        returns = np.diff(prices) / prices[:-1]
        volatility = np.std(returns)
        
        # Simplified: assume market volatility of ~15%
        market_vol = 0.15
        beta = volatility / market_vol if market_vol > 0 else 1.0
        
        return float(np.clip(beta, 0.5, 3.0))
    
    def _calculate_var(self, prices: np.ndarray, confidence: float = 0.95) -> float:
        """Calculate Value at Risk"""
        if len(prices) < 2:
            return 0
        
        returns = np.diff(prices) / prices[:-1]
        var = np.percentile(returns, (1 - confidence) * 100)
        
        return float(var)
    
    def _calculate_cvar(self, prices: np.ndarray, confidence: float = 0.95) -> float:
        """Calculate Conditional Value at Risk (Expected Shortfall)"""
        if len(prices) < 2:
            return 0
        
        returns = np.diff(prices) / prices[:-1]
        var = np.percentile(returns, (1 - confidence) * 100)
        cvar = returns[returns <= var].mean()
        
        return float(cvar)
    
    def _determine_risk_level(self,
                             volatility: float,
                             max_drawdown: float,
                             beta: float) -> str:
        """Determine overall risk level"""
        # Simple scoring
        vol_score = min(volatility * 1000, 1)  # 10% vol = 1
        dd_score = min(max_drawdown * 2, 1)     # 50% DD = 1
        beta_score = min((beta - 0.5) / 1.5, 1) # Beta 2 = 1
        
        total_score = (vol_score + dd_score + beta_score) / 3
        
        if total_score < 0.2:
            return RiskLevel.VERY_LOW.value
        elif total_score < 0.4:
            return RiskLevel.LOW.value
        elif total_score < 0.6:
            return RiskLevel.MODERATE.value
        elif total_score < 0.8:
            return RiskLevel.HIGH.value
        else:
            return RiskLevel.VERY_HIGH.value
    
    def _calculate_risk_score(self,
                             volatility: float,
                             max_drawdown: float,
                             beta: float) -> float:
        """Calculate numerical risk score (0-100)"""
        vol_component = min(volatility * 1000, 100)
        dd_component = min(max_drawdown * 200, 100)
        beta_component = min((beta / 2) * 100, 100)
        
        score = (vol_component + dd_component + beta_component) / 3
        
        return float(np.clip(score, 0, 100))
    
    # ============= PORTFOLIO ANALYSIS =============
    
    def analyze_portfolio_composition(self,
                                     symbols: List[str],
                                     weights: List[float]) -> Dict[str, Any]:
        """Analyze portfolio composition and diversity"""
        if len(symbols) != len(weights) or sum(weights) != 1.0:
            return {}
        
        try:
            # Herfindahl-Hirschman Index (HHI) for concentration
            hhi = sum(w**2 for w in weights)
            
            # Concentration score (0-100, higher = more concentrated)
            concentration_score = (hhi - 1/len(symbols)) / (1 - 1/len(symbols)) * 100
            
            # Diversification assessment
            if concentration_score < 20:
                diversification = "Well-diversified"
            elif concentration_score < 50:
                diversification = "Moderately diversified"
            else:
                diversification = "Concentrated"
            
            return {
                'concentration_score': concentration_score,
                'diversification_level': diversification,
                'number_of_holdings': len(symbols),
                'largest_position': max(weights) * 100,
                'smallest_position': min(weights) * 100,
                'hhi': hhi
            }
        except Exception as e:
            logger.error(f"Error analyzing portfolio: {str(e)}")
            return {}


# Example usage
if __name__ == "__main__":
    analytics = AIStockAnalytics()
    print("AI Stock Analytics module loaded successfully")
