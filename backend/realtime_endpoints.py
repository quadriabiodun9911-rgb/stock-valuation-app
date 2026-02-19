"""
Real-time WebSocket Endpoints
Provides WebSocket connections for live price updates and alerts
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from typing import List
import logging
from realtime_server import (
    connection_manager,
    price_stream_manager,
    StockAlert,
    PriceUpdate
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/realtime", tags=["realtime"])


@router.websocket("/ws/price/{symbol}")
async def websocket_price_endpoint(websocket: WebSocket, symbol: str):
    """
    WebSocket endpoint for real-time stock price updates
    
    Usage:
        ws://localhost:8000/realtime/ws/price/AAPL
    
    Messages received:
        - price_update: Current price with bid/ask and changes
        - alert: Alert triggered based on user configuration
        - market_status: Market open/closed status
    """
    symbol = symbol.upper()
    
    # Connect the websocket
    await connection_manager.connect(websocket, symbol)
    
    try:
        # Start streaming if not already streaming
        if symbol not in price_stream_manager.streaming_tasks:
            await price_stream_manager.start_streaming(symbol)
        
        # Send initial price if available
        last_price = connection_manager.get_last_price(symbol)
        if last_price:
            await websocket.send_json({
                "type": "price_update",
                "data": last_price
            })
        
        # Keep connection alive
        while True:
            data = await websocket.receive_text()
            # Echo back any incoming messages (optional keepalive)
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        await connection_manager.disconnect(symbol, websocket)
        logger.info(f"Client disconnected from {symbol}")
    except Exception as e:
        logger.error(f"WebSocket error for {symbol}: {e}")
        await connection_manager.disconnect(symbol, websocket)


@router.post("/alerts/set")
async def set_price_alert(alert_config: StockAlert):
    """
    Set a price alert for a stock
    
    Alert types:
    - price_above: Alert when price reaches or exceeds threshold
    - price_below: Alert when price drops to or below threshold
    - volume_spike: Alert when volume exceeds threshold
    """
    try:
        connection_manager.add_user_alert(alert_config.symbol, alert_config)
        return {
            "status": "success",
            "message": f"Alert set for {alert_config.symbol}",
            "alert": alert_config.model_dump()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set alert: {str(e)}")


@router.get("/alerts/{symbol}")
async def get_alerts(symbol: str):
    """Get all active alerts for a symbol"""
    try:
        symbol = symbol.upper()
        alerts = connection_manager.get_user_alerts(symbol)
        return {
            "symbol": symbol,
            "alert_count": len(alerts),
            "alerts": [alert.model_dump() for alert in alerts]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get alerts: {str(e)}")


@router.get("/price/latest/{symbol}")
async def get_latest_price(symbol: str):
    """Get the latest cached price for a symbol"""
    try:
        symbol = symbol.upper()
        price = connection_manager.get_last_price(symbol)
        
        if not price:
            # Fetch fresh data if not in cache
            import yfinance as yf
            ticker = yf.Ticker(symbol)
            data = ticker.history(period="1d")
            
            if data.empty:
                raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
            
            latest = data.iloc[-1]
            price = {
                "symbol": symbol,
                "price": float(latest['Close']),
                "timestamp": str(latest.name),
                "volume": int(latest['Volume'])
            }
            connection_manager.update_last_price(symbol, price)
        
        return price
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get price: {str(e)}")


@router.post("/stream/start/{symbol}")
async def start_price_stream(symbol: str):
    """Manually start streaming prices for a symbol"""
    try:
        symbol = symbol.upper()
        if symbol not in price_stream_manager.streaming_tasks:
            await price_stream_manager.start_streaming(symbol)
            return {
                "status": "success",
                "message": f"Started streaming {symbol}"
            }
        else:
            return {
                "status": "info",
                "message": f"Already streaming {symbol}"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start streaming: {str(e)}")


@router.post("/stream/stop/{symbol}")
async def stop_price_stream(symbol: str):
    """Stop streaming prices for a symbol"""
    try:
        symbol = symbol.upper()
        await price_stream_manager.stop_streaming(symbol)
        return {
            "status": "success",
            "message": f"Stopped streaming {symbol}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop streaming: {str(e)}")


@router.get("/streams/active")
async def get_active_streams():
    """Get list of all active price streams"""
    try:
        active = list(price_stream_manager.streaming_tasks.keys())
        return {
            "active_streams": active,
            "count": len(active)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get active streams: {str(e)}")
