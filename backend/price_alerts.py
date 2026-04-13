"""
Price Alerts Module
Manages price target alerts and notifications
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum
from pathlib import Path
import json
import threading
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

# ── Persistent JSON storage ──────────────────────────────────────
ALERTS_PATH = Path(__file__).parent / "data" / "price_alerts.json"
_alerts_lock = threading.Lock()

def _load_alerts() -> List[PriceAlert]:
    with _alerts_lock:
        if not ALERTS_PATH.exists():
            return []
        try:
            with ALERTS_PATH.open("r", encoding="utf-8") as fh:
                raw = json.load(fh)
            return [PriceAlert(**item) for item in raw]
        except (json.JSONDecodeError, Exception):
            return []

def _save_alerts(alerts: List[PriceAlert]) -> None:
    with _alerts_lock:
        ALERTS_PATH.parent.mkdir(parents=True, exist_ok=True)
        payload = [a.dict() for a in alerts]
        # Convert datetime objects to ISO strings for JSON serialisation
        for item in payload:
            if item.get("created_at"):
                item["created_at"] = item["created_at"].isoformat() if not isinstance(item["created_at"], str) else item["created_at"]
        with ALERTS_PATH.open("w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2, default=str)

@router.post("/create")
async def create_alert(alert: PriceAlert):
    """Create a new price alert"""
    try:
        ticker = yf.Ticker(alert.symbol)
        current_price = ticker.info.get('currentPrice', ticker.info.get('regularMarketPrice', 0))
        
        if not current_price:
            raise HTTPException(status_code=400, detail="Invalid stock symbol")
        
        alert.created_at = datetime.now()
        alerts = _load_alerts()
        alerts.append(alert)
        _save_alerts(alerts)
        
        return {
            "status": "success",
            "alert": alert,
            "current_price": current_price,
            "message": f"Alert created: {alert.symbol} {alert.alert_type} ${alert.target_price}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_alerts():
    """Get all active alerts"""
    alerts = _load_alerts()
    enabled_alerts = [a for a in alerts if a.enabled]
    return {
        "total": len(enabled_alerts),
        "alerts": enabled_alerts
    }

@router.post("/check-all")
async def check_all_alerts():
    """Check all alerts against current prices"""
    try:
        alerts = _load_alerts()
        triggered = []
        alerts_status = {}
        
        for alert in alerts:
            if not alert.enabled:
                continue
            
            try:
                ticker = yf.Ticker(alert.symbol)
                current_price = ticker.info.get('currentPrice', ticker.info.get('regularMarketPrice', 0))
                
                if not current_price:
                    continue
                
                should_trigger = _check_alert_trigger(alert, current_price)
                
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
        
        alerts = _load_alerts()
        symbol_alerts = [a for a in alerts if a.symbol == symbol and a.enabled]
        triggered = [a for a in symbol_alerts if _check_alert_trigger(a, current_price)]
        
        return {
            'symbol': symbol,
            'current_price': current_price,
            'total_alerts': len(symbol_alerts),
            'triggered_alerts': len(triggered),
            'alerts': symbol_alerts,
            'triggered': triggered
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/{symbol}/{target_price}/{alert_type}")
async def delete_alert(symbol: str, target_price: float, alert_type: AlertType):
    """Delete a specific alert"""
    alerts = _load_alerts()
    original_count = len(alerts)
    alerts = [
        a for a in alerts 
        if not (a.symbol == symbol and a.target_price == target_price and a.alert_type == alert_type)
    ]
    
    if len(alerts) < original_count:
        _save_alerts(alerts)
        return {"status": "success", "message": "Alert deleted"}
    else:
        raise HTTPException(status_code=404, detail="Alert not found")

@router.post("/update/{old_target}/{alert_type}")
async def update_alert(symbol: str, old_target: float, alert_type: AlertType, new_alert: PriceAlert):
    """Update an existing alert"""
    try:
        alerts = _load_alerts()
        
        # Remove old alert
        alerts = [
            a for a in alerts 
            if not (a.symbol == symbol and a.target_price == old_target and a.alert_type == alert_type)
        ]
        
        # Add new alert
        new_alert.created_at = datetime.now()
        alerts.append(new_alert)
        _save_alerts(alerts)
        
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
    alerts = _load_alerts()
    enabled = [a for a in alerts if a.enabled]
    disabled = [a for a in alerts if not a.enabled]
    
    symbols = {}
    for alert in enabled:
        if alert.symbol not in symbols:
            symbols[alert.symbol] = {'above': 0, 'below': 0}
        symbols[alert.symbol][alert.alert_type] += 1
    
    return {
        'total_alerts': len(alerts),
        'enabled': len(enabled),
        'disabled': len(disabled),
        'symbols_with_alerts': len(symbols),
        'breakdown_by_symbol': symbols
    }


def _check_alert_trigger(alert: PriceAlert, current_price: float) -> bool:
    """Shared logic for checking if an alert should trigger."""
    if alert.alert_type == AlertType.ABOVE:
        return current_price >= alert.target_price
    return current_price <= alert.target_price
