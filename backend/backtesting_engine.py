"""
Backtesting Engine Module
Simulates trading strategies on historical data
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import yfinance as yf
import pandas as pd
import numpy as np

router = APIRouter(prefix="/api/backtest", tags=["backtesting"])

class BacktestRequest(BaseModel):
    symbol: str
    strategy: str  # "momentum", "mean_reversion", "moving_average", "rsi_oversold", "macd_crossover"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    initial_capital: float = 10000
    position_size: float = 0.8  # 80% of capital per trade

class BacktestResult(BaseModel):
    symbol: str
    strategy: str
    period: str
    trades: List[Dict]
    total_return: float
    annual_return: float
    win_rate: float
    max_drawdown: float
    sharpe_ratio: float
    sortino_ratio: float
    profit_factor: float
    initial_capital: float
    final_value: float

@router.post("/run")
async def run_backtest(request: BacktestRequest):
    """Run a backtest on a given strategy"""
    try:
        ticker = yf.Ticker(request.symbol)
        
        # Get historical data
        if request.start_date and request.end_date:
            if request.start_date >= request.end_date:
                raise HTTPException(status_code=400, detail="start_date must be before end_date")
            hist = ticker.history(start=request.start_date, end=request.end_date)
        else:
            hist = ticker.history(period="5y")
        
        if hist.empty:
            raise HTTPException(status_code=400, detail="No historical data available")
        
        # Generate trading signals based on strategy
        if request.strategy == "momentum":
            signals = generate_momentum_signals(hist)
        elif request.strategy == "mean_reversion":
            signals = generate_mean_reversion_signals(hist)
        elif request.strategy == "moving_average":
            signals = generate_moving_average_signals(hist)
        elif request.strategy == "rsi_oversold":
            signals = generate_rsi_signals(hist)
        elif request.strategy == "macd_crossover":
            signals = generate_macd_signals(hist)
        else:
            raise HTTPException(status_code=400, detail="Unknown strategy")
        
        # Simulate trades
        trades, equity_curve = simulate_trades(hist, signals, request.initial_capital, request.position_size)
        
        # Calculate metrics
        metrics = calculate_backtest_metrics(trades, equity_curve, hist, request.initial_capital)
        
        return {
            'symbol': request.symbol,
            'strategy': request.strategy,
            'period': f"{hist.index[0].strftime('%Y-%m-%d')} to {hist.index[-1].strftime('%Y-%m-%d')}",
            'trades': trades,
            'equity_curve': format_equity_curve(equity_curve),
            'total_return': metrics['total_return'],
            'annual_return': metrics['annual_return'],
            'win_rate': metrics['win_rate'],
            'max_drawdown': metrics['max_drawdown'],
            'sharpe_ratio': metrics['sharpe_ratio'],
            'sortino_ratio': metrics['sortino_ratio'],
            'profit_factor': metrics['profit_factor'],
            'total_trades': len(trades),
            'winning_trades': len([t for t in trades if t['profit'] > 0]),
            'losing_trades': len([t for t in trades if t['profit'] < 0]),
            'initial_capital': request.initial_capital,
            'final_value': equity_curve[-1] if equity_curve else request.initial_capital,
            'total_profit': equity_curve[-1] - request.initial_capital if equity_curve else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/strategies")
async def list_strategies():
    """List available strategies"""
    return {
        'strategies': [
            {
                'name': 'momentum',
                'description': 'Trades based on price momentum',
                'entry': 'Buy when 20-day momentum > threshold',
                'exit': 'Sell when momentum turns negative'
            },
            {
                'name': 'mean_reversion',
                'description': 'Trades mean reversion signals',
                'entry': 'Buy when price falls below lower band',
                'exit': 'Sell when price returns to middle band'
            },
            {
                'name': 'moving_average',
                'description': 'Classic moving average crossover',
                'entry': 'Buy when SMA20 > SMA50',
                'exit': 'Sell when SMA20 < SMA50'
            },
            {
                'name': 'rsi_oversold',
                'description': 'Trades RSI oversold/overbought conditions',
                'entry': 'Buy when RSI < 30 (oversold)',
                'exit': 'Sell when RSI > 70 (overbought)'
            },
            {
                'name': 'macd_crossover',
                'description': 'MACD signal line crossover',
                'entry': 'Buy when MACD > Signal',
                'exit': 'Sell when MACD < Signal'
            }
        ]
    }

@router.post("/compare-strategies")
async def compare_strategies(symbol: str, start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Compare all strategies on the same stock"""
    try:
        strategies = ['momentum', 'mean_reversion', 'moving_average', 'rsi_oversold', 'macd_crossover']
        results = []
        
        for strategy in strategies:
            try:
                request = BacktestRequest(
                    symbol=symbol,
                    strategy=strategy,
                    start_date=start_date,
                    end_date=end_date
                )
                result = await run_backtest(request)
                results.append(result)
            except:
                pass
        
        # Sort by total return
        results.sort(key=lambda x: x['total_return'], reverse=True)
        
        return {
            'symbol': symbol,
            'strategies_compared': len(results),
            'results': results,
            'best_strategy': results[0]['strategy'] if results else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/optimization-suggestions/{symbol}")
async def optimization_suggestions(symbol: str):
    """Get optimization suggestions based on backtest results"""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="5y")
        
        suggestions = []
        
        # Analyze volatility
        returns = hist['Close'].pct_change().dropna()
        volatility = returns.std() * np.sqrt(252)
        
        if volatility > 0.35:
            suggestions.append({
                'area': 'risk_management',
                'suggestion': 'High volatility detected. Consider reducing position size.',
                'current_value': volatility,
                'recommendation': 'Reduce position size from 80% to 50%'
            })
        
        # Analyze trend
        sma50 = hist['Close'].rolling(window=50).mean()
        current_above_sma = hist['Close'].iloc[-1] > sma50.iloc[-1]
        
        if current_above_sma:
            suggestions.append({
                'area': 'strategy_selection',
                'suggestion': 'Stock is in uptrend. Momentum strategies may work better.',
                'recommendation': 'Use momentum or moving average strategies'
            })
        else:
            suggestions.append({
                'area': 'strategy_selection',
                'suggestion': 'Stock is in downtrend. Mean reversion may work better.',
                'recommendation': 'Use mean reversion or RSI strategies'
            })
        
        # Analyze win rate potential
        returns_positive = len(returns[returns > 0])
        positive_rate = returns_positive / len(returns)
        
        if positive_rate > 0.55:
            suggestions.append({
                'area': 'market_condition',
                'suggestion': 'Positive days are frequent. Consider trend-following strategies.',
                'current_value': positive_rate * 100,
                'recommendation': 'Focus on momentum or moving average strategies'
            })
        
        return {
            'symbol': symbol,
            'suggestions': suggestions,
            'analysis_period': f"{hist.index[0].strftime('%Y-%m-%d')} to {hist.index[-1].strftime('%Y-%m-%d')}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions
def generate_momentum_signals(hist):
    """Generate momentum-based signals"""
    returns = hist['Close'].pct_change(20)  # 20-day momentum
    signals = np.zeros(len(hist))
    
    for i in range(20, len(hist)):
        if returns.iloc[i] > 0.05:  # 5% threshold
            signals[i] = 1  # Buy signal
        elif returns.iloc[i] < -0.05:
            signals[i] = -1  # Sell signal
    
    return signals

def generate_mean_reversion_signals(hist):
    """Generate mean reversion signals"""
    sma20 = hist['Close'].rolling(window=20).mean()
    std20 = hist['Close'].rolling(window=20).std()
    upper_band = sma20 + 2 * std20
    lower_band = sma20 - 2 * std20
    
    signals = np.zeros(len(hist))
    for i in range(20, len(hist)):
        if hist['Close'].iloc[i] < lower_band.iloc[i]:
            signals[i] = 1  # Buy
        elif hist['Close'].iloc[i] > upper_band.iloc[i]:
            signals[i] = -1  # Sell
    
    return signals

def generate_moving_average_signals(hist):
    """Generate moving average crossover signals"""
    sma20 = hist['Close'].rolling(window=20).mean()
    sma50 = hist['Close'].rolling(window=50).mean()
    
    signals = np.zeros(len(hist))
    for i in range(50, len(hist)):
        if sma20.iloc[i] > sma50.iloc[i] and sma20.iloc[i-1] <= sma50.iloc[i-1]:
            signals[i] = 1  # Buy signal
        elif sma20.iloc[i] < sma50.iloc[i] and sma20.iloc[i-1] >= sma50.iloc[i-1]:
            signals[i] = -1  # Sell signal
    
    return signals

def generate_rsi_signals(hist):
    """Generate RSI-based signals"""
    delta = hist['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    rsi = rsi.fillna(50)  # Neutral RSI when loss is zero
    
    signals = np.zeros(len(hist))
    for i in range(14, len(hist)):
        if rsi.iloc[i] < 30:
            signals[i] = 1  # Buy
        elif rsi.iloc[i] > 70:
            signals[i] = -1  # Sell
    
    return signals

def generate_macd_signals(hist):
    """Generate MACD crossover signals"""
    ema12 = hist['Close'].ewm(span=12, adjust=False).mean()
    ema26 = hist['Close'].ewm(span=26, adjust=False).mean()
    macd = ema12 - ema26
    signal_line = macd.ewm(span=9, adjust=False).mean()
    
    signals = np.zeros(len(hist))
    for i in range(26, len(hist)):
        if macd.iloc[i] > signal_line.iloc[i] and macd.iloc[i-1] <= signal_line.iloc[i-1]:
            signals[i] = 1  # Buy
        elif macd.iloc[i] < signal_line.iloc[i] and macd.iloc[i-1] >= signal_line.iloc[i-1]:
            signals[i] = -1  # Sell
    
    return signals

def simulate_trades(hist, signals, initial_capital, position_size):
    """Simulate trades based on signals"""
    trades = []
    equity_curve = [initial_capital]
    current_capital = initial_capital
    position = None
    
    for i in range(len(signals)):
        if signals[i] == 1 and position is None:  # Buy signal
            position = {
                'entry_date': hist.index[i],
                'entry_price': hist['Close'].iloc[i],
                'shares': int((current_capital * position_size) / hist['Close'].iloc[i])
            }
        
        elif signals[i] == -1 and position is not None:  # Sell signal
            exit_price = hist['Close'].iloc[i]
            profit = (exit_price - position['entry_price']) * position['shares']
            profit_pct = ((exit_price - position['entry_price']) / position['entry_price']) * 100
            
            trades.append({
                'entry_date': position['entry_date'].strftime('%Y-%m-%d'),
                'exit_date': hist.index[i].strftime('%Y-%m-%d'),
                'entry_price': round(position['entry_price'], 2),
                'exit_price': round(exit_price, 2),
                'shares': position['shares'],
                'profit': round(profit, 2),
                'profit_percent': round(profit_pct, 2)
            })
            
            current_capital += profit
            position = None
        
        equity_curve.append(current_capital)
    
    return trades, equity_curve

def calculate_backtest_metrics(trades, equity_curve, hist, initial_capital):
    """Calculate backtest performance metrics"""
    if not trades or not equity_curve:
        return {
            'total_return': 0,
            'annual_return': 0,
            'win_rate': 0,
            'max_drawdown': 0,
            'sharpe_ratio': 0,
            'sortino_ratio': 0,
            'profit_factor': 0
        }
    
    final_value = equity_curve[-1]
    total_return = ((final_value - initial_capital) / initial_capital) * 100
    
    # Annual return
    days = len(hist)
    years = max(days / 365, 0.01)  # Avoid division by zero for very short periods
    annual_return = ((final_value / initial_capital) ** (1 / years) - 1) * 100 if initial_capital > 0 else 0
    
    # Win rate
    winning_trades = len([t for t in trades if t['profit'] > 0])
    win_rate = (winning_trades / len(trades)) * 100 if trades else 0
    
    # Max drawdown
    equity_array = np.array(equity_curve)
    running_max = np.maximum.accumulate(equity_array)
    drawdown = (equity_array - running_max) / running_max
    max_drawdown = np.min(drawdown) * 100
    
    # Sharpe ratio
    returns = np.diff(equity_curve) / equity_curve[:-1]
    excess_returns = returns - 0.02/252  # Assuming 2% risk-free rate
    sharpe_ratio = np.mean(excess_returns) / np.std(excess_returns) * np.sqrt(252) if np.std(excess_returns) > 0 else 0
    
    # Sortino ratio (only penalizes downside volatility)
    downside_returns = returns[returns < 0]
    downside_std = np.std(downside_returns) if len(downside_returns) > 0 else 0
    sortino_ratio = np.mean(excess_returns) / downside_std * np.sqrt(252) if downside_std > 0 else 0
    
    # Profit factor
    total_profit = sum([t['profit'] for t in trades if t['profit'] > 0])
    total_loss = abs(sum([t['profit'] for t in trades if t['profit'] < 0]))
    profit_factor = total_profit / total_loss if total_loss > 0 else 0
    
    return {
        'total_return': round(total_return, 2),
        'annual_return': round(annual_return, 2),
        'win_rate': round(win_rate, 2),
        'max_drawdown': round(max_drawdown, 2),
        'sharpe_ratio': round(sharpe_ratio, 2),
        'sortino_ratio': round(sortino_ratio, 2),
        'profit_factor': round(profit_factor, 2)
    }

def format_equity_curve(equity_curve):
    """Format equity curve for response"""
    # Return every nth point to reduce data size
    step = max(1, len(equity_curve) // 100)
    return [round(val, 2) for val in equity_curve[::step]]
