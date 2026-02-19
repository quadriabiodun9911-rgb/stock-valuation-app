"""
Real-time WebSocket Server for Stock Price Updates
Provides live price streaming, alerts, and market updates
"""

import asyncio
import logging
from typing import Set, Dict, Optional
from datetime import datetime, timedelta
from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel
import yfinance as yf
import json

logger = logging.getLogger(__name__)


class PriceUpdate(BaseModel):
    """Real-time price update model"""
    symbol: str
    price: float
    timestamp: str
    change: float
    change_percent: float
    volume: int
    bid: float
    ask: float


class Alert(BaseModel):
    """Alert model for triggered conditions"""
    alert_id: str
    symbol: str
    alert_type: str  # "price_target", "moving_average_cross", "volume_spike", "rsi_extreme"
    message: str
    timestamp: str
    current_value: float
    threshold: float


class StockAlert(BaseModel):
    """User stock alert configuration"""
    symbol: str
    alert_type: str  # "price_above", "price_below", "volume_spike", "rsi_overbought", "rsi_oversold"
    threshold: float
    enabled: bool = True


class ConnectionManager:
    """Manages WebSocket connections and broadcasts"""
    
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.user_alerts: Dict[str, list] = {}
        self.last_prices: Dict[str, dict] = {}
        self.price_history: Dict[str, list] = {}
        
    async def connect(self, websocket: WebSocket, symbol: str):
        """Add a connection to track"""
        await websocket.accept()
        if symbol not in self.active_connections:
            self.active_connections[symbol] = set()
        self.active_connections[symbol].add(websocket)
        logger.info(f"Client connected to {symbol}. Total connections: {len(self.active_connections[symbol])}")
        
    async def disconnect(self, symbol: str, websocket: WebSocket):
        """Remove a connection"""
        if symbol in self.active_connections:
            self.active_connections[symbol].discard(websocket)
            if not self.active_connections[symbol]:
                del self.active_connections[symbol]
        logger.info(f"Client disconnected from {symbol}")
        
    async def broadcast_price(self, symbol: str, price_data: PriceUpdate):
        """Broadcast price update to all connected clients"""
        if symbol in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[symbol]:
                try:
                    await connection.send_json(
                        {
                            "type": "price_update",
                            "data": price_data.model_dump()
                        }
                    )
                except Exception as e:
                    logger.error(f"Error sending to client: {e}")
                    disconnected.add(connection)
            
            for conn in disconnected:
                await self.disconnect(symbol, conn)
    
    async def broadcast_alert(self, symbol: str, alert: Alert):
        """Broadcast alert to all connected clients"""
        if symbol in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[symbol]:
                try:
                    await connection.send_json(
                        {
                            "type": "alert",
                            "data": alert.model_dump()
                        }
                    )
                except Exception as e:
                    logger.error(f"Error sending alert to client: {e}")
                    disconnected.add(connection)
            
            for conn in disconnected:
                await self.disconnect(symbol, conn)
    
    async def broadcast_market_status(self, status: dict):
        """Broadcast market status to all connections"""
        for symbol in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[symbol]:
                try:
                    await connection.send_json(
                        {
                            "type": "market_status",
                            "data": status
                        }
                    )
                except Exception as e:
                    logger.error(f"Error sending market status: {e}")
                    disconnected.add(connection)
            
            for conn in disconnected:
                await self.disconnect(symbol, conn)
    
    def add_user_alert(self, symbol: str, alert_config: StockAlert):
        """Add an alert configuration for a user"""
        if symbol not in self.user_alerts:
            self.user_alerts[symbol] = []
        self.user_alerts[symbol].append(alert_config)
    
    def get_user_alerts(self, symbol: str) -> list:
        """Get all alerts for a symbol"""
        return self.user_alerts.get(symbol, [])
    
    def update_last_price(self, symbol: str, price_data: dict):
        """Store the last price for a symbol"""
        self.last_prices[symbol] = price_data
    
    def get_last_price(self, symbol: str) -> Optional[dict]:
        """Get the last known price for a symbol"""
        return self.last_prices.get(symbol)


class PriceStreamManager:
    """Manages real-time price streaming"""
    
    def __init__(self, connection_manager: ConnectionManager):
        self.connection_manager = connection_manager
        self.streaming_tasks: Dict[str, asyncio.Task] = {}
        self.update_interval = 5  # Update every 5 seconds
        
    async def start_streaming(self, symbol: str):
        """Start streaming prices for a symbol"""
        if symbol in self.streaming_tasks:
            return  # Already streaming
        
        task = asyncio.create_task(self._stream_prices(symbol))
        self.streaming_tasks[symbol] = task
        logger.info(f"Started streaming {symbol}")
    
    async def stop_streaming(self, symbol: str):
        """Stop streaming prices for a symbol"""
        if symbol in self.streaming_tasks:
            self.streaming_tasks[symbol].cancel()
            del self.streaming_tasks[symbol]
            logger.info(f"Stopped streaming {symbol}")
    
    async def _stream_prices(self, symbol: str):
        """Internal method to stream prices continuously"""
        consecutive_errors = 0
        max_retries = 3
        
        while True:
            try:
                # Fetch current price data
                ticker = yf.Ticker(symbol)
                data = ticker.history(period="1d")
                
                if data.empty:
                    logger.warning(f"No data for {symbol}")
                    consecutive_errors += 1
                    if consecutive_errors >= max_retries:
                        await self.stop_streaming(symbol)
                        return
                    await asyncio.sleep(self.update_interval)
                    continue
                
                # Get latest price
                latest = data.iloc[-1]
                current_price = float(latest['Close'])
                
                # Calculate change
                if len(data) > 1:
                    previous_close = float(data.iloc[-2]['Close'])
                    change = current_price - previous_close
                    change_percent = (change / previous_close * 100) if previous_close != 0 else 0
                else:
                    change = 0
                    change_percent = 0
                
                volume = int(latest['Volume']) if 'Volume' in latest else 0
                
                # Get bid/ask (approximate using info)
                try:
                    info = ticker.info
                    bid = float(info.get('bid', current_price * 0.99))
                    ask = float(info.get('ask', current_price * 1.01))
                except:
                    bid = current_price * 0.99
                    ask = current_price * 1.01
                
                price_update = PriceUpdate(
                    symbol=symbol,
                    price=round(current_price, 2),
                    timestamp=datetime.now().isoformat(),
                    change=round(change, 2),
                    change_percent=round(change_percent, 2),
                    volume=volume,
                    bid=round(bid, 2),
                    ask=round(ask, 2)
                )
                
                # Store last price
                self.connection_manager.update_last_price(symbol, price_update.model_dump())
                
                # Broadcast to all connected clients
                await self.connection_manager.broadcast_price(symbol, price_update)
                
                # Check for alerts
                await self._check_alerts(symbol, price_update)
                
                consecutive_errors = 0
                await asyncio.sleep(self.update_interval)
                
            except asyncio.CancelledError:
                logger.info(f"Streaming task cancelled for {symbol}")
                break
            except Exception as e:
                logger.error(f"Error streaming {symbol}: {e}")
                consecutive_errors += 1
                if consecutive_errors >= max_retries:
                    await self.stop_streaming(symbol)
                    return
                await asyncio.sleep(self.update_interval * 2)
    
    async def _check_alerts(self, symbol: str, price_update: PriceUpdate):
        """Check if any alerts should be triggered"""
        alerts = self.connection_manager.get_user_alerts(symbol)
        
        for alert_config in alerts:
            if not alert_config.enabled:
                continue
            
            should_trigger = False
            alert_message = ""
            
            if alert_config.alert_type == "price_above":
                if price_update.price >= alert_config.threshold:
                    should_trigger = True
                    alert_message = f"{symbol} price ({price_update.price}) reached or exceeded ${alert_config.threshold}"
            
            elif alert_config.alert_type == "price_below":
                if price_update.price <= alert_config.threshold:
                    should_trigger = True
                    alert_message = f"{symbol} price ({price_update.price}) dropped to or below ${alert_config.threshold}"
            
            elif alert_config.alert_type == "volume_spike":
                if price_update.volume >= alert_config.threshold:
                    should_trigger = True
                    alert_message = f"{symbol} volume spike detected: {price_update.volume:,} shares"
            
            if should_trigger:
                alert = Alert(
                    alert_id=f"{symbol}_{datetime.now().timestamp()}",
                    symbol=symbol,
                    alert_type=alert_config.alert_type,
                    message=alert_message,
                    timestamp=datetime.now().isoformat(),
                    current_value=price_update.price,
                    threshold=alert_config.threshold
                )
                await self.connection_manager.broadcast_alert(symbol, alert)


# Global instances
connection_manager = ConnectionManager()
price_stream_manager = PriceStreamManager(connection_manager)
