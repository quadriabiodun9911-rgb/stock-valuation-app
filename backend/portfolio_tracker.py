"""
Portfolio Tracker Module
Manages user portfolio holdings, performance, and allocation
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import yfinance as yf
import json

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])

# Models
class PortfolioHolding(BaseModel):
    symbol: str
    shares: float
    purchase_price: float
    purchase_date: datetime
    notes: Optional[str] = None

class PortfolioRequest(BaseModel):
    holdings: List[PortfolioHolding]

class HoldingPerformance(BaseModel):
    symbol: str
    shares: float
    purchase_price: float
    current_price: float
    gain_loss: float
    gain_loss_percent: float
    current_value: float
    allocation_percent: float

class PortfolioSummary(BaseModel):
    total_invested: float
    total_current_value: float
    total_gain_loss: float
    total_gain_loss_percent: float
    holdings: List[HoldingPerformance]
    top_performers: List[HoldingPerformance]
    bottom_performers: List[HoldingPerformance]
    sector_allocation: dict

# Helper functions
def calculate_holding_performance(holding: PortfolioHolding, current_price: float):
    """Calculate performance metrics for a single holding"""
    current_value = holding.shares * current_price
    invested_value = holding.shares * holding.purchase_price
    gain_loss = current_value - invested_value
    gain_loss_percent = (gain_loss / invested_value * 100) if invested_value > 0 else 0
    
    return {
        'current_price': current_price,
        'current_value': current_value,
        'gain_loss': gain_loss,
        'gain_loss_percent': gain_loss_percent
    }

def get_sector_for_stock(symbol: str) -> str:
    """Get sector for a stock"""
    try:
        ticker = yf.Ticker(symbol)
        return ticker.info.get('sector', 'Unknown')
    except:
        return 'Unknown'

# Endpoints
@router.post("/add-holding")
async def add_holding(holding: PortfolioHolding):
    """Add a new holding to portfolio"""
    try:
        ticker = yf.Ticker(holding.symbol)
        current_price = ticker.info.get('currentPrice', ticker.info.get('regularMarketPrice', 0))
        
        if not current_price:
            raise HTTPException(status_code=400, detail="Invalid stock symbol")
        
        return {
            "status": "success",
            "holding": holding,
            "current_price": current_price,
            "current_value": holding.shares * current_price
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/calculate-portfolio")
async def calculate_portfolio(portfolio: PortfolioRequest):
    """Calculate full portfolio performance"""
    try:
        holdings_performance = []
        total_invested = 0
        total_current_value = 0
        sector_allocation = {}
        
        for holding in portfolio.holdings:
            try:
                ticker = yf.Ticker(holding.symbol)
                current_price = ticker.info.get('currentPrice', ticker.info.get('regularMarketPrice', 0))
                
                if not current_price:
                    continue
                
                perf = calculate_holding_performance(holding, current_price)
                sector = get_sector_for_stock(holding.symbol)
                
                invested = holding.shares * holding.purchase_price
                total_invested += invested
                total_current_value += perf['current_value']
                
                # Track sector allocation
                if sector not in sector_allocation:
                    sector_allocation[sector] = {'value': 0, 'percent': 0}
                sector_allocation[sector]['value'] += perf['current_value']
                
                holdings_performance.append({
                    'symbol': holding.symbol,
                    'shares': holding.shares,
                    'purchase_price': holding.purchase_price,
                    'current_price': perf['current_price'],
                    'gain_loss': perf['gain_loss'],
                    'gain_loss_percent': perf['gain_loss_percent'],
                    'current_value': perf['current_value'],
                    'sector': sector
                })
            except Exception as e:
                print(f"Error processing {holding.symbol}: {e}")
                continue
        
        # Calculate allocation percentages
        for sector in sector_allocation:
            sector_allocation[sector]['percent'] = (
                sector_allocation[sector]['value'] / total_current_value * 100
                if total_current_value > 0 else 0
            )
        
        # Calculate allocation percentage for holdings
        for holding in holdings_performance:
            holding['allocation_percent'] = (
                holding['current_value'] / total_current_value * 100
                if total_current_value > 0 else 0
            )
        
        # Sort for top/bottom performers
        sorted_holdings = sorted(holdings_performance, key=lambda x: x['gain_loss_percent'], reverse=True)
        
        total_gain_loss = total_current_value - total_invested
        total_gain_loss_percent = (total_gain_loss / total_invested * 100) if total_invested > 0 else 0
        
        return {
            'total_invested': round(total_invested, 2),
            'total_current_value': round(total_current_value, 2),
            'total_gain_loss': round(total_gain_loss, 2),
            'total_gain_loss_percent': round(total_gain_loss_percent, 2),
            'holdings': sorted(holdings_performance, key=lambda x: x['current_value'], reverse=True),
            'top_performers': sorted_holdings[:5],
            'bottom_performers': sorted_holdings[-5:] if len(sorted_holdings) > 5 else sorted_holdings,
            'sector_allocation': sector_allocation
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rebalance-recommendations")
async def rebalance_recommendations(portfolio: PortfolioRequest):
    """Get rebalancing recommendations based on target allocation"""
    try:
        summary = await calculate_portfolio(portfolio)
        
        # Target allocation: 60% stocks, 30% bonds, 10% cash (simplified)
        target_allocation = {
            'Technology': 0.20,
            'Healthcare': 0.15,
            'Financials': 0.15,
            'Industrials': 0.10,
            'Consumer': 0.10,
            'Energy': 0.05,
            'Other': 0.25
        }
        
        recommendations = []
        for sector, target_pct in target_allocation.items():
            current_pct = summary['sector_allocation'].get(sector, {}).get('percent', 0)
            diff = target_pct * 100 - current_pct
            
            if abs(diff) > 2:  # Only recommend if difference > 2%
                recommendations.append({
                    'sector': sector,
                    'target_percent': target_pct * 100,
                    'current_percent': current_pct,
                    'action': 'INCREASE' if diff > 0 else 'DECREASE',
                    'amount_percent': abs(diff)
                })
        
        return {
            'recommendations': sorted(recommendations, key=lambda x: abs(x['amount_percent']), reverse=True),
            'diversification_score': len([h for h in summary['holdings'] if h['allocation_percent'] > 0]) / max(len(summary['holdings']), 1) * 100
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/performance-by-period")
async def performance_by_period(holdings_json: str):
    """Get performance metrics for different time periods"""
    try:
        holdings = [PortfolioHolding(**h) for h in json.loads(holdings_json)]
        
        periods = {
            '1M': 30,
            '3M': 90,
            '6M': 180,
            '1Y': 365
        }
        
        period_data = {}
        for period_key, days in periods.items():
            total_change = 0
            count = 0
            
            for holding in holdings:
                try:
                    ticker = yf.Ticker(holding.symbol)
                    hist = ticker.history(period=f'{days}d')
                    if not hist.empty:
                        start_price = hist.iloc[0]['Close']
                        end_price = hist.iloc[-1]['Close']
                        change = ((end_price - start_price) / start_price * 100) if start_price > 0 else 0
                        total_change += change
                        count += 1
                except:
                    pass
            
            period_data[period_key] = round(total_change / max(count, 1), 2) if count > 0 else 0
        
        return period_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
