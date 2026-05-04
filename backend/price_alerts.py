"""
Price Alerts Module
Manages price target alerts and notifications — backed by SQLite.
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum
import yfinance as yf
import database as db
from auth import get_current_user, get_user_id, get_user_id_dep

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


@router.post("/create")
async def create_alert(alert: PriceAlert, user_id: int = Depends(get_user_id_dep)):
    """Create a new price alert"""
    try:
        ticker = yf.Ticker(alert.symbol)
        current_price = ticker.info.get('currentPrice', ticker.info.get('regularMarketPrice', 0))

        if not current_price:
            raise HTTPException(status_code=400, detail="Invalid stock symbol")

        # user_id is injected by dependency
        result = db.create_alert(user_id, alert.symbol, alert.target_price, alert.alert_type.value)

        return {
            "status": "success",
            "alert": result,
            "current_price": current_price,
            "message": f"Alert created: {alert.symbol} {alert.alert_type} ${alert.target_price}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_alerts(user_id: int = Depends(get_user_id_dep)):
    """Get all active alerts"""
    # user_id is injected by dependency
    alerts = db.get_alerts(user_id, enabled_only=True)
    return {"total": len(alerts), "alerts": alerts}

@router.post("/check-all")
async def check_all_alerts():
    """Check all alerts against current prices and send push notifications."""
    try:
        alerts = db.get_all_enabled_alerts()
        triggered = []
        alerts_status = {}

        for alert in alerts:
            try:
                ticker = yf.Ticker(alert["symbol"])
                current_price = ticker.info.get('currentPrice', ticker.info.get('regularMarketPrice', 0))
                if not current_price:
                    continue

                should_trigger = _check_trigger(alert["alert_type"], alert["target_price"], current_price)

                if should_trigger:
                    notification_msg = f"Alert: {alert['symbol']} is {alert['alert_type']} ${alert['target_price']}. Current price: ${current_price}"
                    triggered.append({
                        'alert': alert,
                        'current_price': current_price,
                        'notification': notification_msg,
                    })
                    # Send push notification if user has a push token
                    if alert.get("push_token"):
                        _send_expo_push(alert["push_token"], alert["symbol"], notification_msg)

                sym = alert["symbol"]
                if sym not in alerts_status:
                    alerts_status[sym] = []
                alerts_status[sym].append({
                    'current_price': current_price,
                    'target': alert["target_price"],
                    'type': alert["alert_type"],
                    'triggered': should_trigger,
                })
            except Exception as e:
                print(f"Error checking alert for {alert['symbol']}: {e}")
                continue

        return {
            "timestamp": datetime.now().isoformat(),
            "triggered_count": len(triggered),
            "triggered_alerts": triggered,
            "status_by_symbol": alerts_status,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check/{symbol}")
async def check_symbol_alerts(symbol: str, user_id: int = Depends(get_user_id_dep)):
    """Check alerts for specific symbol"""
    try:
        ticker = yf.Ticker(symbol)
        current_price = ticker.info.get('currentPrice', ticker.info.get('regularMarketPrice', 0))
        if not current_price:
            raise HTTPException(status_code=400, detail="Invalid stock symbol")

        # user_id is injected by dependency
        alerts = db.get_alerts(user_id, enabled_only=True)
        symbol_alerts = [a for a in alerts if a["symbol"] == symbol]
        triggered = [a for a in symbol_alerts if _check_trigger(a["alert_type"], a["target_price"], current_price)]

        return {
            'symbol': symbol,
            'current_price': current_price,
            'total_alerts': len(symbol_alerts),
            'triggered_alerts': len(triggered),
            'alerts': symbol_alerts,
            'triggered': triggered,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/{alert_id}")
async def delete_alert_endpoint(alert_id: int, user_id: int = Depends(get_user_id_dep)):
    """Delete a specific alert by ID"""
    # user_id is injected by dependency
    if db.delete_alert(user_id, alert_id):
        return {"status": "success", "message": "Alert deleted"}
    raise HTTPException(status_code=404, detail="Alert not found")

@router.get("/summary")
async def alert_summary(user_id: int = Depends(get_user_id_dep)):
    """Get summary of all alerts"""
    # user_id is injected by dependency
    alerts = db.get_alerts(user_id, enabled_only=False)
    enabled = [a for a in alerts if a.get("enabled")]
    disabled = [a for a in alerts if not a.get("enabled")]

    symbols = {}
    for alert in enabled:
        sym = alert["symbol"]
        if sym not in symbols:
            symbols[sym] = {'above': 0, 'below': 0}
        symbols[sym][alert["alert_type"]] += 1

    return {
        'total_alerts': len(alerts),
        'enabled': len(enabled),
        'disabled': len(disabled),
        'symbols_with_alerts': len(symbols),
        'breakdown_by_symbol': symbols,
    }


def _check_trigger(alert_type: str, target_price: float, current_price: float) -> bool:
    if alert_type == "above":
        return current_price >= target_price
    return current_price <= target_price


def _send_expo_push(token: str, symbol: str, message: str):
    """Send a push notification via Expo's push service."""
    try:
        import requests
        requests.post(
            "https://exp.host/--/api/v2/push/send",
            json={
                "to": token,
                "title": f"Price Alert: {symbol}",
                "body": message,
                "sound": "default",
                "data": {"symbol": symbol},
            },
            timeout=5,
        )
    except Exception as e:
        print(f"Push notification error: {e}")
