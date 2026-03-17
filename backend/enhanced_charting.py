"""
Enhanced Charting Module
Provides historical OHLC data and technical indicators
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import yfinance as yf
import pandas as pd
import numpy as np

router = APIRouter(prefix="/api/charts", tags=["charts"])

class OHLC(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int

class TechnicalIndicator(BaseModel):
    date: str
    value: float

class ChartData(BaseModel):
    symbol: str
    period: str
    ohlc_data: List[OHLC]
    sma_20: List[TechnicalIndicator]
    sma_50: List[TechnicalIndicator]
    ema_12: List[TechnicalIndicator]
    ema_26: List[TechnicalIndicator]
    rsi: List[TechnicalIndicator]
    macd: List[TechnicalIndicator]
    bollinger_bands: dict

@router.get("/ohlc/{symbol}")
async def get_ohlc_data(symbol: str, period: str = "1y"):
    """Get OHLC data for charting"""
    try:
        ticker = yf.Ticker(symbol)
        
        # Map period strings to yfinance periods
        period_map = {
            "1m": "1mo",
            "3m": "3mo",
            "6m": "6mo",
            "1y": "1y",
            "2y": "2y",
            "5y": "5y",
            "max": "max"
        }
        
        hist_period = period_map.get(period, "1y")
        hist = ticker.history(period=hist_period)
        
        ohlc_data = []
        for date, row in hist.iterrows():
            ohlc_data.append({
                'date': date.strftime('%Y-%m-%d'),
                'open': round(row['Open'], 2),
                'high': round(row['High'], 2),
                'low': round(row['Low'], 2),
                'close': round(row['Close'], 2),
                'volume': int(row['Volume'])
            })
        
        return {
            'symbol': symbol,
            'period': period,
            'data_points': len(ohlc_data),
            'ohlc_data': ohlc_data,
            'current_price': ohlc_data[-1]['close'] if ohlc_data else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/technical-indicators/{symbol}")
async def get_technical_indicators(symbol: str, period: str = "1y"):
    """Get technical indicators for a stock"""
    try:
        ticker = yf.Ticker(symbol)
        
        period_map = {
            "1m": "1mo",
            "3m": "3mo",
            "6m": "6mo",
            "1y": "1y",
            "2y": "2y",
            "5y": "5y"
        }
        
        hist_period = period_map.get(period, "1y")
        hist = ticker.history(period=hist_period)
        
        # Calculate SMA (Simple Moving Average)
        sma_20 = hist['Close'].rolling(window=20).mean()
        sma_50 = hist['Close'].rolling(window=50).mean()
        
        # Calculate EMA (Exponential Moving Average)
        ema_12 = hist['Close'].ewm(span=12, adjust=False).mean()
        ema_26 = hist['Close'].ewm(span=26, adjust=False).mean()
        
        # Calculate RSI (Relative Strength Index)
        rsi = calculate_rsi(hist['Close'], period=14)
        
        # Calculate MACD
        macd = ema_12 - ema_26
        macd_signal = macd.ewm(span=9, adjust=False).mean()
        
        # Calculate Bollinger Bands
        bb_sma = hist['Close'].rolling(window=20).mean()
        bb_std = hist['Close'].rolling(window=20).std()
        bb_upper = bb_sma + (bb_std * 2)
        bb_lower = bb_sma - (bb_std * 2)
        
        # Format data for response
        indicators = {
            'symbol': symbol,
            'period': period,
            'sma_20': format_indicator_data(sma_20),
            'sma_50': format_indicator_data(sma_50),
            'ema_12': format_indicator_data(ema_12),
            'ema_26': format_indicator_data(ema_26),
            'rsi': format_indicator_data(rsi),
            'macd': format_indicator_data(macd),
            'macd_signal': format_indicator_data(macd_signal),
            'bollinger_bands': {
                'upper': format_indicator_data(bb_upper),
                'middle': format_indicator_data(bb_sma),
                'lower': format_indicator_data(bb_lower)
            },
            'current_price': hist['Close'].iloc[-1],
            'date_range': {
                'start': hist.index[0].strftime('%Y-%m-%d'),
                'end': hist.index[-1].strftime('%Y-%m-%d')
            }
        }
        
        return indicators
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rsi/{symbol}")
async def get_rsi(symbol: str, period: str = "1y"):
    """Get RSI (Relative Strength Index)"""
    try:
        ticker = yf.Ticker(symbol)
        period_map = {
            "1m": "1mo", "3m": "3mo", "6m": "6mo", "1y": "1y", "2y": "2y", "5y": "5y"
        }
        hist_period = period_map.get(period, "1y")
        hist = ticker.history(period=hist_period)
        
        rsi = calculate_rsi(hist['Close'], period=14)
        rsi_data = format_indicator_data(rsi)
        
        # Identify overbought/oversold
        current_rsi = rsi.iloc[-1] if not pd.isna(rsi.iloc[-1]) else 0
        status = 'overbought' if current_rsi > 70 else 'oversold' if current_rsi < 30 else 'neutral'
        
        return {
            'symbol': symbol,
            'period': period,
            'rsi': rsi_data,
            'current_rsi': round(current_rsi, 2),
            'status': status,
            'signal': 'SELL' if status == 'overbought' else 'BUY' if status == 'oversold' else 'HOLD'
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/macd/{symbol}")
async def get_macd(symbol: str, period: str = "1y"):
    """Get MACD (Moving Average Convergence Divergence)"""
    try:
        ticker = yf.Ticker(symbol)
        period_map = {
            "1m": "1mo", "3m": "3mo", "6m": "6mo", "1y": "1y", "2y": "2y", "5y": "5y"
        }
        hist_period = period_map.get(period, "1y")
        hist = ticker.history(period=hist_period)
        
        ema_12 = hist['Close'].ewm(span=12, adjust=False).mean()
        ema_26 = hist['Close'].ewm(span=26, adjust=False).mean()
        macd = ema_12 - ema_26
        macd_signal = macd.ewm(span=9, adjust=False).mean()
        macd_histogram = macd - macd_signal
        
        macd_data = format_indicator_data(macd)
        signal_data = format_indicator_data(macd_signal)
        histogram_data = format_indicator_data(macd_histogram)
        
        # Get current values
        current_macd = macd.iloc[-1]
        current_signal = macd_signal.iloc[-1]
        current_histogram = macd_histogram.iloc[-1]
        
        # Determine signal
        if not pd.isna(current_macd) and not pd.isna(current_signal):
            if current_macd > current_signal:
                signal = 'BUY'
            else:
                signal = 'SELL'
        else:
            signal = 'NEUTRAL'
        
        return {
            'symbol': symbol,
            'period': period,
            'macd': macd_data,
            'signal': signal_data,
            'histogram': histogram_data,
            'current_macd': round(current_macd, 4) if not pd.isna(current_macd) else 0,
            'current_signal': round(current_signal, 4) if not pd.isna(current_signal) else 0,
            'current_histogram': round(current_histogram, 4) if not pd.isna(current_histogram) else 0,
            'trading_signal': signal
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/volatility/{symbol}")
async def get_volatility(symbol: str, period: str = "1y"):
    """Get volatility metrics"""
    try:
        ticker = yf.Ticker(symbol)
        period_map = {
            "1m": "1mo", "3m": "3mo", "6m": "6mo", "1y": "1y", "2y": "2y", "5y": "5y"
        }
        hist_period = period_map.get(period, "1y")
        hist = ticker.history(period=hist_period)
        
        # Calculate returns
        returns = hist['Close'].pct_change().dropna()
        
        # Calculate volatility metrics
        daily_volatility = returns.std()
        annual_volatility = daily_volatility * np.sqrt(252)  # 252 trading days
        
        # Calculate rolling volatility
        rolling_vol = returns.rolling(window=20).std() * np.sqrt(252)
        
        # Get current price info
        current_price = hist['Close'].iloc[-1]
        high_52w = hist['Close'].tail(252).max()
        low_52w = hist['Close'].tail(252).min()
        
        return {
            'symbol': symbol,
            'period': period,
            'daily_volatility': round(daily_volatility, 4),
            'annual_volatility': round(annual_volatility, 4),
            'current_price': round(current_price, 2),
            '52_week_high': round(high_52w, 2),
            '52_week_low': round(low_52w, 2),
            'price_range': {
                'low': round(hist['Close'].tail(252).min(), 2),
                'high': round(hist['Close'].tail(252).max(), 2),
                'average': round(hist['Close'].tail(252).mean(), 2)
            },
            'volatility_trend': format_indicator_data(rolling_vol)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/comparison/{symbols}")
async def compare_charts(symbols: str, period: str = "1y"):
    """Compare multiple stocks on a chart"""
    try:
        symbol_list = symbols.split(',')
        comparison_data = []
        
        period_map = {
            "1m": "1mo", "3m": "3mo", "6m": "6mo", "1y": "1y", "2y": "2y", "5y": "5y"
        }
        hist_period = period_map.get(period, "1y")
        
        for symbol in symbol_list:
            ticker = yf.Ticker(symbol.strip())
            hist = ticker.history(period=hist_period)
            
            # Normalize to percentage change from start
            normalized = ((hist['Close'] - hist['Close'].iloc[0]) / hist['Close'].iloc[0] * 100)
            
            comparison_data.append({
                'symbol': symbol.strip(),
                'data': format_comparison_data(normalized),
                'current_price': round(hist['Close'].iloc[-1], 2),
                'change_percent': round(normalized.iloc[-1], 2),
                'high': round(hist['High'].max(), 2),
                'low': round(hist['Low'].min(), 2)
            })
        
        return {
            'symbols': symbol_list,
            'period': period,
            'comparison': comparison_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions
def calculate_rsi(prices, period=14):
    """Calculate Relative Strength Index"""
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def format_indicator_data(series):
    """Format pandas series to list of dicts for API response"""
    return [
        {
            'date': index.strftime('%Y-%m-%d'),
            'value': round(value, 4) if not pd.isna(value) else None
        }
        for index, value in series.items()
    ]

def format_comparison_data(series):
    """Format comparison data"""
    return [
        {
            'date': index.strftime('%Y-%m-%d'),
            'change_percent': round(value, 2)
        }
        for index, value in series.items()
    ]
