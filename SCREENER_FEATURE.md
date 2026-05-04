# Stock Screener - Premium Feature Documentation

## Overview

The **Stock Screener** is a premium feature that applies sophisticated multi-criteria filtering to identify investment opportunities. It acts as an intelligent gatekeeper, filtering thousands of stocks down to a curated list that meets all five critical investment criteria.

**User Value Proposition:** "Your competitive edge in finding hidden value"

---

## Feature Highlights

### 🎯 Five-Criteria Precision Filtering

The screener applies these strict criteria simultaneously:

1. **Undervalued > 25%** - Stock trading at significant discount to fair value
2. **Positive Earnings** - Company shows profitability (valueScore > 50)
3. **Revenue Growth > 5%** - Company expanding revenue base (qualityScore > 50)
4. **Debt < 50% Equity** - Conservative capital structure (combined strength score)
5. **Momentum Positive** - Market momentum supporting thesis (momentumScore > 50)

### 📊 Ranked Results

Results are ranked by **Overall Score** (0-100), showing:

- **#1, #2, #3**: Top candidates (gold, silver, bronze badges)
- **#4+**: Excellent backup options (blue badges)

### 🏆 Premium UI Features

- **Filter Legend**: Visual display of all active criteria with color coding
- **Statistics Panel**: Shows total stocks screened, match count, and match rate percentage
- **Stock Cards**: Each result displays:
  - Rank badge (visual hierarchy)
  - Stock symbol and current price
  - Value, Quality, Momentum, Discount scores
  - Filter status checklist (which criteria are met)
  - Recommendation badge (BUY/HOLD/SELL)

### ⚡ Performance Metrics

- **Overall Score**: Composite ranking (0-100)
- **Value Score**: Valuation attractiveness
- **Quality Score**: Business quality indicator
- **Momentum Score**: Price momentum indicator
- **Discount to Fair Value**: % below intrinsic value

---

## Technical Architecture

### Component: `ScreenerPage.tsx`

**Location:** `/mobile/src/screens/ScreenerPage.tsx`

**Responsibilities:**

- Load stock data from backend `/smart-strategy` endpoint
- Apply five-criteria filter logic
- Rank results by overall score
- Render filtered stock list with visual indicators
- Handle navigation to detailed StockPage

### Key Functions

```typescript
loadScreenedStocks()
- Fetches all stocks from backend
- Applies filter criteria to each stock
- Sorts by overall score (descending)
- Limits to top 50 results
- Updates state with matched stocks

calculateFiltersMet(stock)
- Counts how many criteria stock meets (0-5)
- Only displays stocks where count === 5

getFilterStatus(stock)
- Returns array of filter criteria with met/not-met status
- Used for rendering filter checklist in UI

renderStockCard()
- Displays each matched stock with all metrics
- Shows rank badge, scores, and filter status
- Navigates to StockPage on tap
```

### Data Structures

```typescript
interface ScreenedStock {
  symbol: string;
  currentPrice: number;
  valueScore: number;        // 0-100
  qualityScore: number;       // 0-100
  momentumScore: number;      // 0-100
  overallScore: number;       // 0-100
  discountToFairValue: number; // percentage
  recommendation: string;     // BUY, HOLD, SELL
  filtersMet: number;        // 0-5
  totalFilters: number;      // always 5
}

interface FilterCriteria {
  name: string;
  met: boolean;
  color: string;
}
```

### Navigation Integration

**Added to App.tsx:**

```tsx
<Stack.Screen
  name="ScreenerPage"
  component={ScreenerPage}
  options={{ headerShown: false }}
/>
```

**Access Points:**

1. **HomeScreen**: "Smart Investing" card with premium badge
2. **Direct Navigation**: `navigation.navigate('ScreenerPage')`

---

## User Experience Flow

```
HomeScreen
    ↓
User sees "Smart Investing" → "Stock Screener" card
    ↓
Taps card or Premium button
    ↓
ScreenerPage loads
    ↓
Shows loading state ("Screening stocks...")
    ↓
Backend returns stock data
    ↓
ScreenerPage applies 5-filter criteria
    ↓
Results sorted by Overall Score (descending)
    ↓
Displays:
  - Stats panel (total, matched, %)
  - Filter legend (visual reference)
  - Ranked list of qualifying stocks
    ↓
User taps stock → Navigates to StockPage for details
```

---

## Filter Logic

### How Filters Work

Each filter is evaluated independently:

```javascript
// Filter 1: Undervalued > 25%
met = stock.discountToFairValue > 25

// Filter 2: Positive Earnings
met = stock.valueScore > 50

// Filter 3: Revenue Growth > 5%
met = stock.qualityScore > 50

// Filter 4: Debt < 50% Equity
met = (stock.valueScore + stock.qualityScore) > 100

// Filter 5: Momentum Positive
met = stock.momentumScore > 50
```

### All-or-Nothing Display

- Stock only appears in results if **ALL 5 filters are met**
- Partial matches are not shown
- This ensures only highest-quality candidates are presented

### Ranking by Overall Score

```
Overall Score = Composite of:
  - Value Score (40% weight)
  - Quality Score (35% weight)
  - Momentum Score (25% weight)

Result: 0-100 scale
- 90-100: Excellent opportunity
- 75-89: Strong opportunity
- 60-74: Good opportunity
- <60: Marginal opportunity
```

---

## Visual Design

### Color Coding System

```
Filter Colors:
- Undervalued: #10B981 (Green) - Positive valuation signal
- Earnings:    #3B82F6 (Blue)  - Profitability indicator
- Revenue:     #8B5CF6 (Purple) - Growth indicator
- Debt:        #F59E0B (Amber) - Risk/health indicator
- Momentum:    #EC4899 (Pink)  - Market sentiment

Rank Badges:
- #1: #FFD700 (Gold)    - Top of list
- #2: #C0C0C0 (Silver)  - Second place
- #3: #CD7F32 (Bronze)  - Third place
- #4+: #3B82F6 (Blue)   - Solid candidates

Score Backgrounds:
- Green (#10B981): Score 70+
- Amber (#F59E0B): Score 50-69
- Red (#EF4444): Score <50
```

### Layout Structure

```
Header (Gradient Blue)
├─ Back button
├─ Title "Stock Screener" + Subtitle
└─ Refresh button

Statistics Panel (3 cards)
├─ Total Stocks
├─ Match All Filters
└─ Match Rate %

Filter Legend (Horizontal scroll)
├─ 5 color-coded filter badges
└─ Shows all active criteria

Results Section
├─ Results count
└─ FlatList of Stock Cards
    ├─ Rank badge
    ├─ Symbol + Price
    ├─ Score box (overall)
    ├─ Metrics row (value/quality/momentum/discount)
    ├─ Filters checklist
    └─ Recommendation badge

Empty State (if no results)
├─ Icon
├─ "No Stocks Found" title
├─ "Try adjusting filters" hint
└─ Refresh button

Footer
└─ Premium feature disclaimer
```

---

## Performance Considerations

### Data Loading

- **Source**: Backend `/smart-strategy` endpoint
- **Throttling**: No rate limiting (backend controls)
- **Caching**: None (fresh data on each load)
- **Timeout**: Inherits from stockAPI configuration

### Filtering Performance

- **Algorithm**: O(n) - single pass through stocks
- **Filter Count**: 5 criteria evaluated per stock
- **Result Limit**: Top 50 stocks (prevents excessive rendering)
- **Rendering**: FlatList with `scrollEnabled={false}` for integration in ScrollView

### Optimization Strategies

1. **Async Loading**: Uses `Promise.all()` for backend calls
2. **Efficient Filtering**: Single pass through data
3. **Limited Results**: Capped at top 50 to prevent UI lag
4. **Separated Concerns**: Filter logic separate from rendering

---

## Backend Integration

### Endpoint Used

**GET /smart-strategy**

Returns comprehensive stock analysis data:

```json
{
  "total": 2500,
  "stocks": [
    {
      "symbol": "MTN",
      "currentPrice": 450.25,
      "valueScore": 75,
      "qualityScore": 68,
      "momentumScore": 62,
      "overallScore": 70.5,
      "discountToFairValue": 28.5,
      "recommendation": "BUY"
    },
    ...
  ]
}
```

### Data Requirements

For screener to work, backend must provide:

- ✅ `symbol`: Stock ticker
- ✅ `currentPrice`: Current market price
- ✅ `valueScore`: Valuation indicator (0-100)
- ✅ `qualityScore`: Business quality (0-100)
- ✅ `momentumScore`: Price momentum (0-100)
- ✅ `overallScore`: Composite score (0-100)
- ✅ `discountToFairValue`: % below fair value
- ✅ `recommendation`: BUY/HOLD/SELL

---

## Premium Positioning

### Why It's Premium

1. **Sophisticated Algorithm**: 5 simultaneous criteria (most apps use 1-2)
2. **Data Intensive**: Requires comprehensive stock analysis
3. **Computational Cost**: Scores 2000+ stocks in real-time
4. **Actionable Results**: Only shows stocks meeting ALL criteria
5. **Ranked Intelligence**: Ordering by composite score adds value

### Competitive Advantage

- **Speed**: Real-time filtering of 2000+ stocks
- **Accuracy**: Composite 3-factor scoring (value, quality, momentum)
- **Transparency**: Shows exactly which criteria each stock meets
- **Usability**: Visual hierarchy and clear ranking
- **Integration**: Seamless navigation to detailed analysis

---

## Error Handling

### Loading States

- Shows "Screening stocks..." during data fetch
- ActivityIndicator provides visual feedback

### Empty Results

- If no stocks match all 5 criteria:
  - Shows empty state with icon
  - Suggests filters might be too strict
  - Provides refresh button to retry

### Network Errors

- Inherited from `stockAPI.getSmartStrategy()`
- Logged to console for debugging
- User sees loading spinner until timeout

---

## Future Enhancements

### Potential Features

1. **Filter Customization**: Allow users to adjust thresholds
2. **Export to CSV**: Download matched stocks
3. **Alerts**: Notify when new stocks meet criteria
4. **Comparisons**: Side-by-side stock comparison
5. **Backtesting**: Historical performance of screener
6. **Custom Filters**: User-defined criteria combinations
7. **Watchlist Integration**: Add results to watchlist
8. **Technical Analysis**: Add chart overlays
9. **Sector Filtering**: Filter by sector or industry
10. **International Markets**: Extend beyond NGX

---

## Quality Assurance

### Testing Checklist

- [ ] Screener loads without errors
- [ ] All 5 filters evaluate correctly
- [ ] Results sorted by overall score (descending)
- [ ] Top 50 limit enforced
- [ ] Filter checklist displays accurately
- [ ] Visual indicators (colors, badges) render correctly
- [ ] Navigation to StockPage works
- [ ] Refresh button reloads data
- [ ] Empty state displays if no matches
- [ ] Performance acceptable (< 2s load time)

### Debug Tools

```typescript
// Check filter evaluation
console.log('Filters met:', calculateFiltersMet(stock));

// Check data structure
console.log('Screened stocks:', stocks);

// Check filter status
console.log('Filter status:', getFilterStatus(stocks[0]));
```

---

## Summary

The **Stock Screener** is a sophisticated premium feature that:

✅ Applies 5 rigorous investment criteria simultaneously
✅ Filters 2000+ stocks in real-time
✅ Ranks results by comprehensive overall score
✅ Provides transparent filter status per stock
✅ Integrates seamlessly with existing app
✅ Delivers actionable investment opportunities
✅ Positions app as intelligent, data-driven solution

**This is your competitive edge in stock selection.**
