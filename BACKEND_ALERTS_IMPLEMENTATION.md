# Smart Alerts System - Backend Implementation Guide

## Overview

This guide covers the backend architecture for implementing the Smart Alerts System in the FastAPI backend of the Stock Valuation App.

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── alerts.py          # Alert API endpoints
│   │   └── ...
│   ├── models/
│   │   ├── alert.py           # SQLAlchemy models
│   │   └── ...
│   ├── schemas/
│   │   ├── alert.py           # Pydantic schemas
│   │   └── ...
│   ├── services/
│   │   ├── alert_service.py   # Business logic
│   │   ├── notification_service.py  # Notifications
│   │   └── ...
│   ├── utils/
│   │   └── alert_engine.py    # Alert processing engine
│   └── main.py
└── ...
```

## Database Models

### SQLAlchemy Model - `app/models/alert.py`

```python
from sqlalchemy import Column, String, Float, DateTime, Enum, Integer, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()

class AlertType(str, enum.Enum):
    FAIR_VALUE = "fair_value"
    EARNINGS_SURPRISE = "earnings_surprise"
    MOMENTUM_BREAKOUT = "momentum_breakout"
    CUSTOM = "custom"

class AlertStatus(str, enum.Enum):
    ACTIVE = "active"
    TRIGGERED = "triggered"
    DISMISSED = "dismissed"

class AlertPriority(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    symbol = Column(String, index=True, nullable=False)
    market = Column(String, default="NGX")  # NGX, US, UK, EU, ASIA
    
    # Alert metadata
    type = Column(String, default=AlertType.CUSTOM)  # Alert type
    status = Column(String, default=AlertStatus.ACTIVE)  # Current status
    priority = Column(String, default=AlertPriority.MEDIUM)
    
    # Alert conditions
    title = Column(String)
    description = Column(String)
    condition = Column(String)  # Readable condition description
    threshold = Column(Float, nullable=True)  # Target value
    current_value = Column(Float, nullable=True)  # Last known value
    
    # Advanced conditions (JSON for flexibility)
    condition_logic = Column(String, nullable=True)  # {"type": ">, value": 100}
    
    # Timing
    created_at = Column(DateTime, default=datetime.utcnow)
    triggered_at = Column(DateTime, nullable=True)
    dismissed_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)  # Auto-dismiss after date
    
    # Notification settings
    notify_push = Column(Boolean, default=True)
    notify_email = Column(Boolean, default=False)
    notify_sms = Column(Boolean, default=False)
    
    # Metadata
    color = Column(String)  # UI color
    icon = Column(String)   # UI icon name
    tags = Column(String)   # Comma-separated tags
    
    def is_active(self) -> bool:
        return self.status == AlertStatus.ACTIVE
    
    def is_expired(self) -> bool:
        if self.expires_at:
            return datetime.utcnow() > self.expires_at
        return False

class AlertHistory(Base):
    __tablename__ = "alert_history"
    
    id = Column(String, primary_key=True, index=True)
    alert_id = Column(String, ForeignKey("alerts.id"))
    
    # Event details
    event_type = Column(String)  # "triggered", "dismissed", "updated"
    old_value = Column(Float, nullable=True)
    new_value = Column(Float, nullable=True)
    
    timestamp = Column(DateTime, default=datetime.utcnow)
    notes = Column(String, nullable=True)
```

## Pydantic Schemas

### Alert Schemas - `app/schemas/alert.py`

```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum

class AlertTypeEnum(str, Enum):
    FAIR_VALUE = "fair_value"
    EARNINGS_SURPRISE = "earnings_surprise"
    MOMENTUM_BREAKOUT = "momentum_breakout"
    CUSTOM = "custom"

class AlertStatusEnum(str, Enum):
    ACTIVE = "active"
    TRIGGERED = "triggered"
    DISMISSED = "dismissed"

class AlertPriorityEnum(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class AlertBase(BaseModel):
    symbol: str
    type: AlertTypeEnum
    title: str
    description: str
    condition: str
    threshold: Optional[float] = None
    priority: AlertPriorityEnum = AlertPriorityEnum.MEDIUM

class AlertCreate(AlertBase):
    market: str = "NGX"
    notify_push: bool = True
    notify_email: bool = False
    notify_sms: bool = False

class AlertUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    threshold: Optional[float] = None
    status: Optional[AlertStatusEnum] = None
    priority: Optional[AlertPriorityEnum] = None

class AlertResponse(AlertBase):
    id: str
    user_id: str
    status: AlertStatusEnum
    current_value: Optional[float] = None
    created_at: datetime
    triggered_at: Optional[datetime] = None
    dismissed_at: Optional[datetime] = None
    color: str
    icon: str
    
    class Config:
        from_attributes = True

class AlertListResponse(BaseModel):
    alerts: List[AlertResponse]
    total: int
    active: int
    triggered: int
    dismissed: int
    by_type: dict

class AlertHistoryResponse(BaseModel):
    id: str
    alert_id: str
    event_type: str
    old_value: Optional[float]
    new_value: Optional[float]
    timestamp: datetime
    notes: Optional[str]

class AlertStatsResponse(BaseModel):
    total_alerts: int
    active_alerts: int
    triggered_alerts: int
    dismissed_alerts: int
    by_type: dict
    by_priority: dict
    by_status: dict
```

## API Endpoints

### Alert Endpoints - `app/api/alerts.py`

```python
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from app.models.alert import Alert, AlertHistory, AlertStatus, AlertType, AlertPriority
from app.schemas.alert import (
    AlertCreate, AlertUpdate, AlertResponse, AlertListResponse,
    AlertHistoryResponse, AlertStatsResponse
)
from app.services.alert_service import AlertService
from app.utils.auth import get_current_user
from app.utils.database import get_db

router = APIRouter(prefix="/api/alerts", tags=["alerts"])
alert_service = AlertService()

# ============== CREATE ALERTS ==============

@router.post("/", response_model=AlertResponse)
async def create_alert(
    alert_data: AlertCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new alert for the current user."""
    try:
        alert = await alert_service.create_alert(
            user_id=current_user.id,
            alert_data=alert_data,
            db=db
        )
        return alert
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============== READ ALERTS ==============

@router.get("/", response_model=AlertListResponse)
async def list_alerts(
    status: Optional[str] = Query(None),
    alert_type: Optional[str] = Query(None),
    symbol: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(50),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List alerts with filtering options.
    
    Query Parameters:
    - status: Filter by status (active, triggered, dismissed)
    - alert_type: Filter by type (fair_value, earnings_surprise, momentum_breakout)
    - symbol: Filter by stock symbol
    - priority: Filter by priority (high, medium, low)
    - skip: Pagination offset
    - limit: Pagination limit
    """
    alerts = await alert_service.list_alerts(
        user_id=current_user.id,
        status=status,
        alert_type=alert_type,
        symbol=symbol,
        priority=priority,
        skip=skip,
        limit=limit,
        db=db
    )
    return alerts

@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a specific alert."""
    alert = await alert_service.get_alert(
        user_id=current_user.id,
        alert_id=alert_id,
        db=db
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert

@router.get("/{alert_id}/history", response_model=List[AlertHistoryResponse])
async def get_alert_history(
    alert_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get history/audit trail for an alert."""
    history = await alert_service.get_alert_history(
        user_id=current_user.id,
        alert_id=alert_id,
        db=db
    )
    return history

# ============== UPDATE ALERTS ==============

@router.put("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: str,
    alert_update: AlertUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an alert's properties."""
    try:
        alert = await alert_service.update_alert(
            user_id=current_user.id,
            alert_id=alert_id,
            update_data=alert_update,
            db=db
        )
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        return alert
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{alert_id}/status", response_model=AlertResponse)
async def update_alert_status(
    alert_id: str,
    status: str = Body(...),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update alert status (active, triggered, dismissed)."""
    try:
        alert = await alert_service.update_alert_status(
            user_id=current_user.id,
            alert_id=alert_id,
            new_status=status,
            db=db
        )
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        return alert
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============== DELETE ALERTS ==============

@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an alert."""
    success = await alert_service.delete_alert(
        user_id=current_user.id,
        alert_id=alert_id,
        db=db
    )
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert deleted successfully"}

@router.delete("/")
async def clear_dismissed_alerts(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clear all dismissed alerts."""
    count = await alert_service.clear_dismissed_alerts(
        user_id=current_user.id,
        db=db
    )
    return {"message": f"Deleted {count} dismissed alerts"}

# ============== STATISTICS ==============

@router.get("/stats", response_model=AlertStatsResponse)
async def get_alert_stats(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get alert statistics for dashboard."""
    stats = await alert_service.get_alert_stats(
        user_id=current_user.id,
        db=db
    )
    return stats

# ============== BULK OPERATIONS ==============

@router.post("/bulk/dismiss")
async def dismiss_multiple_alerts(
    alert_ids: List[str] = Body(...),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Dismiss multiple alerts at once."""
    count = await alert_service.dismiss_multiple_alerts(
        user_id=current_user.id,
        alert_ids=alert_ids,
        db=db
    )
    return {"message": f"Dismissed {count} alerts"}

@router.post("/bulk/delete")
async def delete_multiple_alerts(
    alert_ids: List[str] = Body(...),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete multiple alerts at once."""
    count = await alert_service.delete_multiple_alerts(
        user_id=current_user.id,
        alert_ids=alert_ids,
        db=db
    )
    return {"message": f"Deleted {count} alerts"}

# ============== SUBSCRIPTIONS ==============

@router.get("/stock/{symbol}/active")
async def get_stock_alerts(
    symbol: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all active alerts for a specific stock."""
    alerts = await alert_service.get_stock_alerts(
        user_id=current_user.id,
        symbol=symbol,
        db=db
    )
    return {"symbol": symbol, "alerts": alerts}
```

## Service Layer

### Alert Service - `app/services/alert_service.py`

```python
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from app.models.alert import Alert, AlertHistory, AlertStatus, AlertType, AlertPriority
from app.schemas.alert import AlertCreate, AlertUpdate, AlertResponse, AlertListResponse
from app.services.notification_service import NotificationService
from app.utils.alert_engine import AlertEngine

class AlertService:
    def __init__(self):
        self.notification_service = NotificationService()
        self.alert_engine = AlertEngine()
    
    async def create_alert(
        self,
        user_id: str,
        alert_data: AlertCreate,
        db: Session
    ) -> AlertResponse:
        """Create a new alert."""
        # Validate stock exists
        if not await self.alert_engine.validate_stock(alert_data.symbol):
            raise ValueError(f"Stock symbol {alert_data.symbol} not found")
        
        alert = Alert(
            id=str(uuid.uuid4()),
            user_id=user_id,
            symbol=alert_data.symbol,
            market=alert_data.market,
            type=alert_data.type.value,
            title=alert_data.title,
            description=alert_data.description,
            condition=alert_data.condition,
            threshold=alert_data.threshold,
            priority=alert_data.priority.value,
            notify_push=alert_data.notify_push,
            notify_email=alert_data.notify_email,
            notify_sms=alert_data.notify_sms,
            color=self._get_alert_color(alert_data.type),
            icon=self._get_alert_icon(alert_data.type),
        )
        
        db.add(alert)
        db.commit()
        db.refresh(alert)
        
        # Log creation
        await self._log_alert_history(
            db=db,
            alert_id=alert.id,
            event_type="created",
            notes=f"Alert created by user"
        )
        
        return AlertResponse.from_orm(alert)
    
    async def list_alerts(
        self,
        user_id: str,
        status: Optional[str] = None,
        alert_type: Optional[str] = None,
        symbol: Optional[str] = None,
        priority: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
        db: Session = None
    ) -> AlertListResponse:
        """List alerts with filtering."""
        query = db.query(Alert).filter(Alert.user_id == user_id)
        
        if status:
            query = query.filter(Alert.status == status)
        if alert_type:
            query = query.filter(Alert.type == alert_type)
        if symbol:
            query = query.filter(Alert.symbol == symbol)
        if priority:
            query = query.filter(Alert.priority == priority)
        
        # Get counts before pagination
        total = query.count()
        active = query.filter(Alert.status == AlertStatus.ACTIVE.value).count()
        triggered = query.filter(Alert.status == AlertStatus.TRIGGERED.value).count()
        dismissed = query.filter(Alert.status == AlertStatus.DISMISSED.value).count()
        
        # Get by_type stats
        by_type = {}
        for alert_type in AlertType:
            by_type[alert_type.value] = (
                query.filter(Alert.type == alert_type.value).count()
            )
        
        # Apply pagination
        alerts = query.offset(skip).limit(limit).all()
        
        return AlertListResponse(
            alerts=[AlertResponse.from_orm(a) for a in alerts],
            total=total,
            active=active,
            triggered=triggered,
            dismissed=dismissed,
            by_type=by_type
        )
    
    async def update_alert_status(
        self,
        user_id: str,
        alert_id: str,
        new_status: str,
        db: Session
    ) -> Optional[AlertResponse]:
        """Update alert status."""
        alert = db.query(Alert).filter(
            and_(Alert.id == alert_id, Alert.user_id == user_id)
        ).first()
        
        if not alert:
            return None
        
        old_status = alert.status
        alert.status = new_status
        
        if new_status == AlertStatus.TRIGGERED.value:
            alert.triggered_at = datetime.utcnow()
        elif new_status == AlertStatus.DISMISSED.value:
            alert.dismissed_at = datetime.utcnow()
        
        db.commit()
        db.refresh(alert)
        
        # Log status change
        await self._log_alert_history(
            db=db,
            alert_id=alert.id,
            event_type="status_changed",
            notes=f"Status changed from {old_status} to {new_status}"
        )
        
        # Send notification if triggered
        if new_status == AlertStatus.TRIGGERED.value:
            await self.notification_service.send_alert_notification(
                user_id=user_id,
                alert=alert
            )
        
        return AlertResponse.from_orm(alert)
    
    async def _log_alert_history(
        self,
        db: Session,
        alert_id: str,
        event_type: str,
        notes: Optional[str] = None
    ):
        """Log alert history for audit trail."""
        history = AlertHistory(
            id=str(uuid.uuid4()),
            alert_id=alert_id,
            event_type=event_type,
            notes=notes,
            timestamp=datetime.utcnow()
        )
        db.add(history)
        db.commit()
    
    @staticmethod
    def _get_alert_color(alert_type) -> str:
        colors = {
            AlertType.FAIR_VALUE: "#10B981",
            AlertType.EARNINGS_SURPRISE: "#F59E0B",
            AlertType.MOMENTUM_BREAKOUT: "#3B82F6",
            AlertType.CUSTOM: "#8B5CF6",
        }
        return colors.get(alert_type, "#6B7280")
    
    @staticmethod
    def _get_alert_icon(alert_type) -> str:
        icons = {
            AlertType.FAIR_VALUE: "flag",
            AlertType.EARNINGS_SURPRISE: "trending-up",
            AlertType.MOMENTUM_BREAKOUT: "rocket",
            AlertType.CUSTOM: "settings",
        }
        return icons.get(alert_type, "alert-circle")
```

## Main Application Setup

### Update `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import alerts, stocks, portfolio, dashboard
from app.services.alert_monitor import AlertMonitor
from contextlib import asynccontextmanager

# Initialize alert monitor
alert_monitor = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global alert_monitor
    alert_monitor = AlertMonitor()
    await alert_monitor.start()
    print("✅ Alert monitor started")
    
    yield
    
    # Shutdown
    await alert_monitor.stop()
    print("❌ Alert monitor stopped")

app = FastAPI(
    title="Stock Valuation API",
    description="API for stock valuation and alerts",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(alerts.router)
app.include_router(stocks.router)
app.include_router(portfolio.router)
app.include_router(dashboard.router)

@app.get("/health")
async def health():
    return {"status": "ok", "alert_monitor": "active"}
```

## Background Alert Monitor

### Alert Monitor - `app/services/alert_monitor.py`

```python
import asyncio
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional

from app.models.alert import Alert, AlertStatus
from app.services.notification_service import NotificationService
from app.utils.database import SessionLocal
from app.utils.alert_engine import AlertEngine

class AlertMonitor:
    """Background service that monitors and processes active alerts."""
    
    def __init__(self):
        self.notification_service = NotificationService()
        self.alert_engine = AlertEngine()
        self.is_running = False
        self.check_interval = 60  # seconds
    
    async def start(self):
        """Start the alert monitor."""
        self.is_running = True
        asyncio.create_task(self._monitor_loop())
    
    async def stop(self):
        """Stop the alert monitor."""
        self.is_running = False
    
    async def _monitor_loop(self):
        """Main monitoring loop."""
        while self.is_running:
            try:
                await self._check_alerts()
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                print(f"Error in alert monitor: {e}")
                await asyncio.sleep(self.check_interval)
    
    async def _check_alerts(self):
        """Check all active alerts against current market data."""
        db = SessionLocal()
        try:
            # Get all active alerts
            alerts = db.query(Alert).filter(
                Alert.status == AlertStatus.ACTIVE.value
            ).all()
            
            for alert in alerts:
                await self._evaluate_alert(alert, db)
        
        finally:
            db.close()
    
    async def _evaluate_alert(self, alert: Alert, db: Session):
        """Evaluate a single alert."""
        try:
            # Get current stock data
            current_value = await self.alert_engine.get_current_price(alert.symbol)
            
            if current_value is None:
                return
            
            # Update current value
            alert.current_value = current_value
            
            # Check if alert should trigger
            should_trigger = await self._check_trigger_condition(alert, current_value)
            
            if should_trigger:
                alert.status = AlertStatus.TRIGGERED.value
                alert.triggered_at = datetime.utcnow()
                db.commit()
                
                # Send notification
                await self.notification_service.send_alert_notification(
                    user_id=alert.user_id,
                    alert=alert
                )
            
            else:
                db.commit()
        
        except Exception as e:
            print(f"Error evaluating alert {alert.id}: {e}")
    
    async def _check_trigger_condition(
        self,
        alert: Alert,
        current_value: float
    ) -> bool:
        """Check if alert condition is met."""
        if alert.threshold is None:
            return False
        
        if alert.type == "fair_value":
            # Trigger when price reaches fair value (±2% tolerance)
            tolerance = alert.threshold * 0.02
            return (
                alert.threshold - tolerance <= current_value <= alert.threshold + tolerance
            )
        
        elif alert.type == "momentum_breakout":
            # Trigger when price breaks above threshold
            return current_value >= alert.threshold
        
        elif alert.type == "earnings_surprise":
            # Would check earnings data
            return False
        
        elif alert.type == "custom":
            # Check custom condition logic
            return current_value >= alert.threshold
        
        return False
```

## Notification Service

### Notification Service - `app/services/notification_service.py`

```python
from app.models.alert import Alert
import asyncio

class NotificationService:
    """Handle sending notifications for triggered alerts."""
    
    async def send_alert_notification(self, user_id: str, alert: Alert):
        """Send notification when alert is triggered."""
        
        tasks = []
        
        if alert.notify_push:
            tasks.append(self._send_push_notification(user_id, alert))
        
        if alert.notify_email:
            tasks.append(self._send_email_notification(user_id, alert))
        
        if alert.notify_sms:
            tasks.append(self._send_sms_notification(user_id, alert))
        
        if tasks:
            await asyncio.gather(*tasks)
    
    async def _send_push_notification(self, user_id: str, alert: Alert):
        """Send push notification."""
        # Implementation using Firebase Cloud Messaging
        print(f"Push notification for user {user_id}: {alert.title}")
    
    async def _send_email_notification(self, user_id: str, alert: Alert):
        """Send email notification."""
        # Implementation using email service
        print(f"Email notification for user {user_id}: {alert.title}")
    
    async def _send_sms_notification(self, user_id: str, alert: Alert):
        """Send SMS notification."""
        # Implementation using SMS service
        print(f"SMS notification for user {user_id}: {alert.title}")
```

## Database Migration

Create Alembic migration:

```bash
alembic revision --autogenerate -m "Add alerts tables"
```

Migration file will automatically detect the new Alert and AlertHistory models.

## Testing

### Test File - `tests/test_alerts.py`

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def auth_headers():
    # Login and get token
    response = client.post("/auth/login", json={
        "email": "test@example.com",
        "password": "password"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_create_alert(auth_headers):
    response = client.post(
        "/api/alerts/",
        json={
            "symbol": "AAPL",
            "type": "fair_value",
            "title": "AAPL Fair Value Alert",
            "description": "Alert for fair value",
            "condition": "price >= 150",
            "threshold": 150
        },
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["symbol"] == "AAPL"

def test_list_alerts(auth_headers):
    response = client.get("/api/alerts/", headers=auth_headers)
    assert response.status_code == 200
    assert "alerts" in response.json()

def test_update_alert_status(auth_headers):
    # First create alert
    create_response = client.post(
        "/api/alerts/",
        json={"symbol": "AAPL", "type": "fair_value", ...},
        headers=auth_headers
    )
    alert_id = create_response.json()["id"]
    
    # Update status
    response = client.put(
        f"/api/alerts/{alert_id}/status",
        json={"status": "triggered"},
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "triggered"
```

## Deployment Considerations

1. **Database**: Use PostgreSQL for production
2. **Caching**: Implement Redis for stock data caching
3. **Message Queue**: Use Celery + RabbitMQ for background jobs
4. **Notifications**: Integrate Firebase/SendGrid/Twilio
5. **Monitoring**: Add logging and error tracking (Sentry)
6. **Rate Limiting**: Implement per-user alert limits
7. **Auto-scaling**: Handle multiple instances with shared state

## Conclusion

This backend implementation provides a robust, scalable alerts system with:

- Full CRUD operations
- Real-time monitoring
- Multi-channel notifications
- Audit logging
- Flexible alert conditions
- Performance optimization

Integrate with the mobile frontend for a complete stock monitoring solution!
