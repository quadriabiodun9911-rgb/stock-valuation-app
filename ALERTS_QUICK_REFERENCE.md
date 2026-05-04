# Smart Alerts System - Quick Reference

## Getting Started (30 seconds)

### To View Alerts

1. Tap **Smart Alerts** card on HomeScreen
2. Scroll through list of active alerts
3. Tap any alert to view full details

### To Create Alert

1. Tap **+** button (purple, top-right)
2. Enter stock symbol (e.g., MTN)
3. Choose alert type
4. Set threshold value
5. Tap **Create Alert**

## Alert Types at a Glance

| Type | Purpose | Trigger | Color |
|------|---------|---------|-------|
| **Fair Value** | Buy at fair price | Price = Fair Value | 🟢 Green |
| **Earnings** | Earnings events | EPS surprise/announcement | 🟠 Amber |
| **Momentum** | Breakout signals | Price/volume spike | 🔵 Blue |
| **Custom** | Personal targets | User-defined threshold | 🟣 Purple |

## Status Indicators

- 🔵 **Active** = Monitoring, waiting to trigger
- 🟢 **Triggered** = Condition met, action needed
- ⚫ **Dismissed** = Archived/acknowledged

## Quick Actions

| Action | Icon | Effect |
|--------|------|--------|
| Dismiss | ✓ | Mark as completed |
| Delete | 🗑️ | Remove permanently |
| Details | Card | View full information |
| Add | + | Create new alert |

## Filtering

**By Type:** All • Fair Value • Earnings • Momentum

**By Status:** All • Active • Triggered • Dismissed

## Common Scenarios

### Value Investor

```
Alert 1: MTN Fair Value ₦450
Alert 2: GTCO Fair Value ₦42
Alert 3: Earnings Earnings EPS > ₦2.50
```

### Momentum Trader

```
Alert 1: MTN Breakout ₦460
Alert 2: Volume Alert Volume > 2M
Alert 3: Take Profit ₦475
```

### Risk Manager

```
Alert 1: Stop Loss -10%
Alert 2: Take Profit +20%
Alert 3: Rebalance Signal Overvalued
```

## Tips & Tricks

### ✅ Best Practices

- Create 5-10 quality alerts (not 100+)
- Set realistic thresholds
- Review dismissed alerts weekly
- Use multiple alert types
- Check during market hours

### ❌ Common Mistakes

- Too many alerts (alert fatigue)
- Unrealistic thresholds
- Never reviewing dismissed alerts
- Ignoring triggered alerts
- Creating duplicate alerts

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Alert not triggering | Check threshold value, refresh app |
| Too many alerts | Delete low-priority ones, increase thresholds |
| Missed alerts | Check dismissed list, enable notifications |
| Stale data | Pull to refresh, check market hours |
| Wrong symbol | Delete and recreate with correct ticker |

## Performance Stats

- **Refresh Rate**: Every 60 seconds
- **Max Active Alerts**: Unlimited (recommend <20)
- **History Retention**: 90 days
- **Check Interval**: Real-time monitoring

## Mobile Integration

**HomeScreen Cards:**

- Smart Alerts (with status preview)
- Quick create option
- Live trigger count

**Navigation:**

- Accessible from any screen
- Deep linking support
- Back navigation

## API Reference (Backend)

```
POST /api/alerts          # Create alert
GET  /api/alerts          # List with filters
GET  /api/alerts/{id}     # Get details
PUT  /api/alerts/{id}     # Update
DELETE /api/alerts/{id}   # Delete

GET  /api/alerts/stats    # Dashboard stats
GET  /api/alerts/stock/{symbol}  # Stock alerts
POST /api/alerts/bulk/dismiss    # Dismiss multiple
```

## Settings (Future)

- [ ] Push notifications
- [ ] Email alerts
- [ ] SMS alerts
- [ ] Quiet hours
- [ ] Alert sounds
- [ ] Priority filtering

## Support

**Documentation**: See ALERTS_SYSTEM_GUIDE.md

**Backend Implementation**: See BACKEND_ALERTS_IMPLEMENTATION.md

**Troubleshooting**: Common issues and solutions below

## Common Questions

**Q: Why didn't my alert trigger?**
A: Check that market was open, threshold is correct, and data is updating.

**Q: Can I create alerts for multiple stocks?**
A: Yes, create separate alerts for each stock symbol.

**Q: Are my alerts saved?**
A: Yes, all alerts sync to your account on backend.

**Q: What if I dismiss an alert by mistake?**
A: Dismissed alerts appear in history; you can review and recreate.

**Q: How many alerts can I create?**
A: Unlimited, but recommend keeping <20 active for performance.

**Q: When do alerts trigger?**
A: When market data is available (NGX: 10AM-2:30PM WAT, US: 9:30AM-4PM EST).

## Feature Roadmap

### Coming Soon

- AI-powered alert suggestions
- Portfolio-wide alerts
- Email digest summaries
- Advanced technical indicators
- Sector-wide alerts
- Integration with portfolios

### In Development

- Push notifications
- SMS alerts
- Alert performance analytics
- Alert templates
- Collaborative alerts

## Keyboard Shortcuts (Mobile)

- **Pull Down**: Refresh alert list
- **Swipe Left**: Quick delete
- **Tap & Hold**: Context menu
- **Tap Card**: View full details

## Data Privacy

- Alerts are private to your account
- End-to-end encrypted
- 90-day retention
- Never shared with third parties
- GDPR compliant

## File Structure

```
stock-valuation-app/
├── mobile/src/
│   └── screens/
│       └── AlertsPage.tsx        # Main component
├── backend/app/
│   ├── api/
│   │   └── alerts.py            # API endpoints
│   ├── models/
│   │   └── alert.py             # Database models
│   ├── schemas/
│   │   └── alert.py             # Data schemas
│   └── services/
│       ├── alert_service.py     # Business logic
│       └── notification_service.py
├── ALERTS_SYSTEM_GUIDE.md       # Full guide
└── BACKEND_ALERTS_IMPLEMENTATION.md
```

## Quick Links

- **Main Guide**: ALERTS_SYSTEM_GUIDE.md
- **Backend Setup**: BACKEND_ALERTS_IMPLEMENTATION.md
- **Component**: AlertsPage.tsx
- **API Docs**: API_DOCUMENTATION.md

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Status**: Production Ready
