# Smart Alerts System - Comprehensive Guide

## Overview

The Smart Alerts System is an intelligent notification and monitoring feature in the Stock Valuation App that keeps investors informed about critical market opportunities and events. It provides real-time alerts for fair value reaching, earnings surprises, and momentum breakouts.

## Features

### 1. Alert Types

#### **Fair Value Alert**

- **Purpose**: Notifies when a stock reaches its intrinsic valuation
- **Use Case**: Perfect for value investors wanting to buy at fair price
- **Triggers**: Stock price equals or approaches the calculated fair value
- **Color**: Green (#10B981)
- **Icon**: Flag

#### **Earnings Surprise Alert**

- **Purpose**: Alerts about unexpected earnings events and announcements
- **Use Case**: For investors interested in earnings-driven opportunities
- **Triggers**: Earnings announcements, EPS surprises, guidance changes
- **Color**: Amber (#F59E0B)
- **Icon**: Trending Up

#### **Momentum Breakout Alert**

- **Purpose**: Signals strong technical momentum and volume breakouts
- **Use Case**: For momentum and trend-following traders
- **Triggers**: Price breaks above key levels, volume surge detected
- **Color**: Blue (#3B82F6)
- **Icon**: Rocket

#### **Custom Alerts**

- **Purpose**: User-defined price targets and conditions
- **Use Case**: Personalized monitoring based on your strategy
- **Triggers**: User-specified thresholds

### 2. Alert Status Types

- **Active**: Alert is monitoring and waiting for trigger condition
- **Triggered**: Alert condition has been met, action may be needed
- **Dismissed**: Alert has been acknowledged and archived

### 3. Alert Priority Levels

- **High**: Critical alerts requiring immediate attention
- **Medium**: Important alerts worth reviewing
- **Low**: Informational alerts for reference

## Using the Alerts System

### Creating an Alert

1. **Navigate to Smart Alerts**
   - From HomeScreen, tap the "Smart Alerts" card
   - Or access from the main navigation menu

2. **Tap the Add Button**
   - Press the purple "+" button in the top-right corner

3. **Fill Alert Details**
   - **Stock Symbol**: Enter the stock ticker (e.g., MTN, AAPL)
   - **Alert Type**: Select from Fair Value, Earnings, or Momentum
   - **Threshold Value**: Set the price or metric level to trigger alert

4. **Review & Create**
   - Check alert summary
   - Tap "Create Alert" to finalize

### Viewing Alerts

**Alert Dashboard Shows:**

- Total alerts across all statuses
- Count of active alerts
- Count of triggered alerts
- Breakdown by alert type

**Alert Cards Display:**

- Stock symbol and alert type
- Current status (Active/Triggered/Dismissed)
- Description of alert condition
- Current value vs. threshold
- Time since creation or trigger
- Quick action buttons

### Managing Alerts

**Filter by Type:**

- All: View all alerts
- Fair Value: Only valuation alerts
- Earnings: Only earnings-related alerts
- Momentum: Only technical alerts

**Filter by Status:**

- All: View all alerts
- Active: Only monitoring alerts
- Triggered: Only fired alerts
- Dismissed: Only dismissed alerts

**Alert Actions:**

- **Dismiss**: Mark as dismissed (checkmark icon)
- **Delete**: Permanently remove alert (trash icon)
- **View Details**: Tap card for full details modal

### Alert Details Modal

Shows complete information:

- Full alert title and description
- Stock symbol
- Current value
- Threshold value
- Alert status with color coding
- Priority level
- Creation timestamp
- Options to close or dismiss

## Technical Architecture

### Components

#### AlertsPage.tsx

Main component handling:

- Alert list management and display
- Filtering by type and status
- Modal for creating new alerts
- Alert detail viewing
- Alert dismissal and deletion

**Key Functions:**

```typescript
loadAlerts() - Fetch alerts from backend
filterAlerts() - Apply active filters
handleDismissAlert() - Mark alert as dismissed
handleAddAlert() - Create new alert
getAlertTypeIcon() - Return icon for alert type
getAlertTypeColor() - Return color for alert type
```

### State Management

**Alert Interface:**

```typescript
interface Alert {
  id: string;
  type: 'fair_value' | 'earnings_surprise' | 'momentum_breakout' | 'custom';
  symbol: string;
  title: string;
  description: string;
  condition: string;
  threshold?: number;
  currentValue?: number;
  status: 'active' | 'triggered' | 'dismissed';
  createdAt: Date;
  triggeredAt?: Date;
  color: string;
  icon: string;
}
```

**Alert Stats Interface:**

```typescript
interface AlertStats {
  total: number;
  active: number;
  triggered: number;
  dismissed: number;
  byType: Record<AlertType, number>;
}
```

### UI Theme

**Color Scheme:**

- Background: #0b1120 (Dark slate)
- Card Background: #1e293b (Slate)
- Primary: #3B82F6 (Blue)
- Fair Value: #10B981 (Green)
- Earnings: #F59E0B (Amber)
- Momentum: #3B82F6 (Blue)
- Text Primary: #f8fafc (White)
- Text Secondary: #94a3b8 (Gray)

**Styling Features:**

- Rounded corners (8-12px)
- Left border color coding by type
- Status badges with color indicators
- Icon containers with background
- Smooth animations and transitions

## Backend Integration

### API Endpoints (To be implemented)

```
POST /api/alerts/create
- Create new alert
- Body: { symbol, type, threshold }

GET /api/alerts
- Fetch all alerts
- Returns: Alert[]

GET /api/alerts/:id
- Get alert details
- Returns: Alert

PUT /api/alerts/:id/status
- Update alert status
- Body: { status: 'active' | 'triggered' | 'dismissed' }

DELETE /api/alerts/:id
- Delete alert

GET /api/alerts/stock/:symbol
- Get alerts for specific stock
- Returns: Alert[]
```

### Real-time Updates

**Planned Features:**

- WebSocket connection for real-time alert triggers
- Push notifications when alerts are triggered
- Email notifications for high-priority alerts
- SMS alerts for critical triggers

## Best Practices

### For Value Investors

1. Set up Fair Value alerts for undervalued stocks
2. Monitor earnings surprise alerts for potential buys
3. Use momentum alerts to confirm entries
4. Review dismissals weekly to find missed opportunities

### For Momentum Traders

1. Create momentum breakout alerts on key technical levels
2. Set multiple threshold levels for scaling entries
3. Use time-based reviews to validate setups
4. Combine with earnings calendar for event trading

### For Risk Management

1. Set price target alerts as exit signals
2. Create lower threshold alerts to limit losses
3. Monitor portfolio stocks regularly
4. Review triggered alerts within 24 hours

### General Tips

1. **Avoid Alert Fatigue**: Don't create too many alerts (target: 5-10 active)
2. **Review Regularly**: Check dismissed alerts to learn from missed opportunities
3. **Validate Conditions**: Ensure threshold values make sense before creating
4. **Track Results**: Keep notes on alert quality and success rate
5. **Update Thresholds**: Adjust based on market conditions and portfolio changes

## Advanced Features (Roadmap)

### Coming Soon

- [ ] Custom alert conditions (AND/OR logic)
- [ ] Multi-stock portfolio alerts
- [ ] AI-powered alert suggestions
- [ ] Alert history and analytics
- [ ] Integration with smart strategies
- [ ] Mobile push notifications
- [ ] Email digest summaries
- [ ] Alerts based on technical indicators
- [ ] Sector-wide alerts
- [ ] Earnings beat/miss predictions

### Performance Optimizations

- [ ] Alert caching with TTL
- [ ] Batch alert checks (reduce API calls)
- [ ] Local notification queue
- [ ] Incremental alert loading

## Troubleshooting

### Alert Not Triggering

**Check:**

1. Alert is in "Active" status (not dismissed)
2. Threshold value is set correctly
3. Stock data is updating (not stale)
4. Market hours (for NGX: 10:00 AM - 2:30 PM WAT)

**Solution:**

- Refresh the app (pull-to-refresh on alert list)
- Delete and recreate the alert
- Check internet connection

### Too Many Alerts

**Solutions:**

1. Filter to show only critical alerts
2. Dismiss non-actionable alerts
3. Increase threshold values to reduce triggers
4. Focus on high-priority stocks only

### Missed Alerts

**Reasons:**

1. Alert was dismissed automatically
2. Stock moved quickly past threshold
3. Market was closed when trigger occurred
4. App notification was missed

**Prevention:**

1. Enable push notifications
2. Check app regularly during market hours
3. Set email alerts for triggered events
4. Review dismissed alerts list weekly

## Settings & Preferences

### Notification Options (Future)

- [ ] Push notifications on/off
- [ ] Sound alerts
- [ ] Vibration alerts
- [ ] Email alerts
- [ ] Quiet hours setting

### Display Options

- [ ] Hide dismissed alerts
- [ ] Sort by date/type/priority
- [ ] Compact/detailed view toggle
- [ ] Dark/light theme

## Examples

### Example 1: Value Investor Setup

```
Alert 1: MTN Fair Value
- Type: Fair Value
- Threshold: ₦450
- Purpose: Buy when trading at fair value

Alert 2: GTCO Fair Value
- Type: Fair Value
- Threshold: ₦42.50
- Purpose: Monitor for entry point

Alert 3: Monthly Earnings
- Type: Earnings Surprise
- Threshold: Positive EPS surprise
- Purpose: Catch earnings winners
```

### Example 2: Momentum Trader Setup

```
Alert 1: MTN Breakout
- Type: Momentum Breakout
- Threshold: ₦460 (above resistance)
- Purpose: Confirm uptrend entry

Alert 2: Volume Spike
- Type: Momentum Breakout
- Threshold: 2M shares
- Purpose: Validate breakout strength

Alert 3: Take Profit
- Type: Custom
- Threshold: ₦475
- Purpose: Exit target
```

### Example 3: Conservative Investor Setup

```
Alert 1: Loss Limit
- Type: Custom
- Threshold: -10% from entry
- Purpose: Risk management

Alert 2: Dividend Alert
- Type: Earnings Surprise
- Threshold: Dividend announcement
- Purpose: Track income

Alert 3: Rebalance Signal
- Type: Fair Value
- Threshold: 30% overvalued
- Purpose: Portfolio rebalancing
```

## Support & Feedback

For issues or feature requests:

1. Check this documentation first
2. Review troubleshooting section
3. Contact support with alert details
4. Submit feature requests through app settings

## Conclusion

The Smart Alerts System empowers investors to:

- **Stay Informed**: Never miss important market events
- **Act Quickly**: Get timely notifications for opportunities
- **Trade Smarter**: Combine multiple alert types for confirmation
- **Reduce Stress**: Automated monitoring removes guesswork

Use alerts strategically to align with your investment goals and trading style!
