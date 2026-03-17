"""
Price Alerts Module
Manages price target alerts and notifications
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum
import yfinance as yf

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

class AlertType(str, Enum):
    ABOVE = "above"
    BELOW = "below"

class PriceAlert(BaseModel):
    symbol: str
    target_price: float
    alert_type: AlertType
    enabled: bool = True
    created_at: datetime = None

class AlertCheck(BaseModel):
    symbol: str
    current_price: float
    triggered_alerts: List[PriceAlert]

# In-memory storage (would be database in production)
active_alerts: List[PriceAlert] = []

@router.post("/create")
async def create_alert(alert: PriceAlert):
    """Create a new price alert"""
    try:
        ticker = yf.Ticker(alert.symbol)
        current_price = ticker.info.get('currentPrice', ticker.info.get('regularMarketPrice', 0))
        
        if not current_price:
            raise HTTPException(status_code=400, detail="Invalid stock symbol")
        
        alert.created_at = datetime.now()
        active_alerts.append(alert)
        
        return {
            "status": "success",
            "alert": alert,
            "current_price": current_price,
            "message": f"Alert created: {alert.symbol} {alert.alert_type} ${alert.target_price}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_alerts():
    """Get all active alerts"""
    enabled_alerts = [a for a in active_alerts if a.enabled]
    return {
        "total": len(enabled_alerts),
        "alerts": enabled_alerts
    }

@router.post("/check-all")
async def check_all_alerts():
    """Check all alerts against current prices"""
    try:
        triggered = []
        alerts_status = {}
        
        for alert in active_alerts:
            if not alert.enabled:
                continue
            
            try:
                ticker = yf.Ticker(alert.symbol)
                current_price = ticker.info.get('currentPrice', ticker.info.get('regularMarketPrice', 0))
                
                if not current_price:
                    continue
                
                # Check if alert should trigger
                should_trigger = False
                if alert.alert_type == AlertType.ABOVE and current_price >= alert.target_price:
                    should_trigger = True
                elif alert.alert_type == AlertType.BELOW and current_price <= alert.target_price:
                    should_trigger = True
                
                if should_trigger:
                    triggered.append({
                        'alert': alert,
                        'current_price': current_price,
                        'notification': f"Alert: {alert.symbol} is {alert.alert_type} ${alert.target_price}. Current price: ${current_price}"
                    })
                
                if alert.symbol not in alerts_status:
                    alerts_status[alert.symbol] = []
                alerts_status[alert.symbol].append({
                    'current_price': current_price,
                    'target': alert.target_price,
                    'type': alert.alert_type,
                    'triggered': should_trigger
                })
            except Exception as e:
                print(f"Error checking alert for {alert.symbol}: {e}")
                continue
        
        return {
            "timestamp": datetime.now(),
            "triggered_count": len(triggered),
            "triggered_alerts": triggered,
            "status_by_symbol": alerts_status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check/{symbol}")
async def check_symbol_alerts(symbol: str):
    """Check alerts for specific symbol"""
    try:
        ticker = yf.Ticker(symbol)
        current_price = ticker.info.get('currentPrice', ticker.info.get('regularMarketPrice', 0))
        
        if not current_price:
            raise HTTPException(status_code=400, detail="Invalid stock symbol")
        
        symbol_alerts = [a for a in active_alerts if a.symbol == symbol and a.enabled]
        triggered = []
        
        for alert in symbol_alerts:
            should_trigger = False
            if alert.alert_type == AlertType.ABOVE and current_price >= alert.target_price:
                should_trigger = True
            elif alert.alert_type == AlertType.BELOW and current_price <= alert.target_price:
                should_trigger = True
            
            if should_trigger:
                triggered.append(alert)
        
        return {
            'symbol': symbol,
            'current_price': current_price,
            'total_alerts': len(symbol_alerts),
            'triggered_alerts': len(triggered),
            'alerts': symbol_alerts,
            'triggered': triggered
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/{symbol}/{target_price}/{alert_type}")
async def delete_alert(symbol: str, target_price: float, alert_type: AlertType):
    """Delete a specific alert"""
    global active_alerts
    original_count = len(active_alerts)
    active_alerts = [
        a for a in active_alerts 
        if not (a.symbol == symbol and a.target_price == target_price and a.alert_type == alert_type)
    ]
    
    if len(active_alerts) < original_count:
        return {"status": "success", "message": "Alert deleted"}
    else:
        raise HTTPException(status_code=404, detail="Alert not found")

@router.post("/update/{old_target}/{alert_type}")
async def update_alert(symbol: str, old_target: float, alert_type: AlertType, new_alert: PriceAlert):
    """Update an existing alert"""
    try:
        global active_alerts
        
        # Find and remove old alert
        active_alerts = [
            a for a in active_alerts 
            if not (a.symbol == symbol and a.target_price == old_target and a.alert_type == alert_type)
        ]
        
        # Add new alert
        new_alert.created_at = datetime.now()
        active_alerts.append(new_alert)
        
        return {
            "status": "success",
            "message": "Alert updated",
            "new_alert": new_alert
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/summary")
async def alert_summary():
    """Get summary of all alerts"""
    enabled = [a for a in active_alerts if a.enabled]
    disabled = [a for a in active_alerts if not a.enabled]
    
    symbols = {}
    for alert in enabled:
        if alert.symbol not in symbols:
            symbols[alert.symbol] = {'above': 0, 'below': 0}
        symbols[alert.symbol][alert.alert_type] += 1
    
    return {
        'total_alerts': len(active_alerts),
        'enabled': len(enabled),
        'disabled': len(disabled),
        'symbols_with_alerts': len(symbols),
        'breakdown_by_symbol': symbols
    }
