# Stock Screener - Visual Architecture

## Screen Layout

### ScreenerPage - Full View

```
┌─────────────────────────────────────────────────────────┐
│ ← Stock Screener                              🔄        │  ← Header (Gradient)
│   Premium Filter Engine                                 │
└─────────────────────────────────────────────────────────┘

┌──────────────────┬──────────────────┬──────────────────┐
│ Total Stocks     │ Match All        │ Match Rate       │  ← Statistics Panel
│ 2500             │ 45               │ 1.8%             │
└──────────────────┴──────────────────┴──────────────────┘

ACTIVE FILTERS
┌─────────────────────────────────────────────────────────┐
│ 🟢 Undervalued > 25%  🔵 Positive Earnings            │
│ 🟣 Revenue > 5%       🟠 Debt < 50% Equity            │
│ 🔴 Momentum Positive                                    │
└─────────────────────────────────────────────────────────┘

PREMIUM RESULTS (45)

┌─────────────────────────────────────────────────────────┐
│ #1 MTN                                 Overall: 70      │  ← Rank #1 (Gold)
│ ₦450.25                                                 │
├─────────────────────────────────────────────────────────┤
│ Value: 75  Quality: 68  Momentum: 62  Discount: +28.5% │
├─────────────────────────────────────────────────────────┤
│ ✓ Undervalued   ✓ Earnings   ✓ Revenue   ✓ Debt   ✓ Mom│
├─────────────────────────────────────────────────────────┤
│ Recommendation: BUY                                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ #2 GTCO                                Overall: 68      │  ← Rank #2 (Silver)
│ ₦3,250.00                                               │
├─────────────────────────────────────────────────────────┤
│ Value: 72  Quality: 65  Momentum: 60  Discount: +26.2% │
├─────────────────────────────────────────────────────────┤
│ ✓ Undervalued   ✓ Earnings   ✓ Revenue   ✓ Debt   ✓ Mom│
├─────────────────────────────────────────────────────────┤
│ Recommendation: BUY                                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ #3 FLOURMILL                           Overall: 66      │  ← Rank #3 (Bronze)
│ ₦28.50                                                  │
├─────────────────────────────────────────────────────────┤
│ Value: 70  Quality: 63  Momentum: 58  Discount: +25.1% │
├─────────────────────────────────────────────────────────┤
│ ✓ Undervalued   ✓ Earnings   ✓ Revenue   ✓ Debt   ✓ Mom│
├─────────────────────────────────────────────────────────┤
│ Recommendation: HOLD                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ #4 CADBURY                             Overall: 64      │  ← Rank #4+ (Blue)
│ ₦12.50                                                  │
├─────────────────────────────────────────────────────────┤
│ Value: 68  Quality: 61  Momentum: 56  Discount: +24.3% │
├─────────────────────────────────────────────────────────┤
│ ✓ Undervalued   ✓ Earnings   ✓ Revenue   ✓ Debt   ✓ Mom│
├─────────────────────────────────────────────────────────┤
│ Recommendation: HOLD                                     │
└─────────────────────────────────────────────────────────┘

[... more stocks ...]

This premium screener runs algorithmic filters to identify
investment opportunities that meet all criteria.
```

---

## Component Hierarchy

```
App.tsx (Navigation Root)
│
└─ NavigationContainer
   └─ Tab.Navigator (Bottom Tabs)
      └─ HomeStack (Stack Navigator)
         └─ HomeScreen
            │
            └─ [Button "Smart Investing"] 
               └─ navigate('ScreenerPage')
         │
         └─ ScreenerPage (THIS COMPONENT)
            │
            ├─ Header (LinearGradient)
            │  ├─ Back Button
            │  ├─ Title
            │  └─ Refresh Button
            │
            ├─ ScrollView (Main Content)
            │  ├─ Statistics Panel (3 cards)
            │  │  ├─ Total Stocks Card
            │  │  ├─ Matched Stocks Card
            │  │  └─ Match Rate Card
            │  │
            │  ├─ Filter Legend (Horizontal Scroll)
            │  │  └─ 5 Filter Badges
            │  │
            │  ├─ Results Title
            │  │
            │  └─ FlatList (Stock Cards)
            │     └─ renderStockCard (repeated)
            │        ├─ Card Header
            │        │  ├─ Rank Badge
            │        │  ├─ Symbol Section
            │        │  └─ Score Box
            │        │
            │        ├─ Metrics Row
            │        │  ├─ Value Score
            │        │  ├─ Quality Score
            │        │  ├─ Momentum Score
            │        │  └─ Discount %
            │        │
            │        ├─ Filters Row
            │        │  └─ 5 Filter Checkboxes
            │        │
            │        └─ Recommendation Badge
            │
            └─ Footer (Text)

When Stock Tapped:
   └─ navigate('StockPage', { symbol })
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ ScreenerPage Component Mounted                          │
│ (useEffect hook triggered)                              │
└────────────────────────┬────────────────────────────────┘
                         │
                         ↓
            ┌────────────────────────────┐
            │  loadScreenedStocks()      │
            │  sets loading = true       │
            └────────────┬───────────────┘
                         │
                         ↓
         ┌───────────────────────────────────┐
         │ stockAPI.getSmartStrategy()       │
         │ (Async HTTP GET to backend)      │
         └────────────┬──────────────────────┘
                      │
                      ↓ [Response arrives]
         ┌──────────────────────────────┐
         │ response.stocks = 2500 items │
         └────────────┬─────────────────┘
                      │
                      ↓
         ┌──────────────────────────────────────┐
         │ filter() + map()                     │
         │ For each stock:                      │
         │ ├─ calculateFiltersMet(stock)       │
         │ ├─ Keep if === 5                    │
         │ └─ Transform to ScreenedStock       │
         └────────────┬─────────────────────────┘
                      │
                      ↓
         ┌──────────────────────────────────────┐
         │ sort((a,b) =>                        │
         │   b.overallScore - a.overallScore)  │
         │ (Highest scores first)              │
         └────────────┬─────────────────────────┘
                      │
                      ↓
         ┌──────────────────────────────────────┐
         │ slice(0, 50)                         │
         │ (Limit to top 50)                   │
         └────────────┬─────────────────────────┘
                      │
                      ↓
         ┌──────────────────────────────────────┐
         │ setStocks(screened)                 │
         │ setMatchedCount(screened.length)    │
         │ setLoading(false)                   │
         └────────────┬─────────────────────────┘
                      │
                      ↓
         ┌──────────────────────────────────────┐
         │ Component Re-Renders                 │
         │ - Statistics update                 │
         │ - FlatList displays results         │
         └──────────────────────────────────────┘
```

---

## Filter Evaluation Pipeline

```
Input: Single Stock Object
│
├─ Filter 1: discountToFairValue > 25?
│  └─ If NO → Failed, exit
│  └─ If YES → Continue
│
├─ Filter 2: valueScore > 50?
│  └─ If NO → Failed, exit
│  └─ If YES → Continue
│
├─ Filter 3: qualityScore > 50?
│  └─ If NO → Failed, exit
│  └─ If YES → Continue
│
├─ Filter 4: (valueScore + qualityScore) > 100?
│  └─ If NO → Failed, exit
│  └─ If YES → Continue
│
├─ Filter 5: momentumScore > 50?
│  └─ If NO → Failed, exit
│  └─ If YES → Continue
│
└─ Output: filtersMet = 5 ✓ (Stock qualifies)
   
Result: Only display if all 5 filters passed
```

---

## Rendering Pipeline

```
State Update (setStocks)
│
↓
Component Re-Render (React)
│
├─ renderHeader()
│  ├─ LinearGradient
│  ├─ Back Button (TouchableOpacity)
│  ├─ Title + Subtitle
│  └─ Refresh Button
│
├─ ScrollView (Main content container)
│
│  ├─ renderStats()
│  │  ├─ View (stats container)
│  │  ├─ 3× StatCard (flex: 1)
│  │  │  ├─ Label Text
│  │  │  └─ Value Text
│  │  └─ Separator: 12px
│  │
│  ├─ renderFilterLegend()
│  │  ├─ Title Text
│  │  └─ ScrollView (horizontal)
│  │     ├─ 5× FilterBadge
│  │     │  ├─ Dot (color-coded)
│  │     │  └─ Text
│  │     └─ Gap: 8px
│  │
│  ├─ Conditional: loading?
│  │  ├─ YES → ActivityIndicator + "Screening..."
│  │  └─ NO → FlatList (below)
│  │
│  ├─ FlatList (if !loading)
│  │  ├─ data={stocks}
│  │  ├─ renderItem={renderStockCard}
│  │  └─ keyExtractor={(item) => item.symbol}
│  │
│  ├─ For each stock in FlatList:
│  │  └─ renderStockCard()
│  │     ├─ TouchableOpacity (tap handler)
│  │     │
│  │     ├─ cardHeader
│  │     │  ├─ rankBadge (#N)
│  │     │  ├─ symbolSection (MTN, ₦450)
│  │     │  └─ scoreContainer (Overall: 70)
│  │     │
│  │     ├─ metricsRow
│  │     │  ├─ Value Score
│  │     │  ├─ Quality Score
│  │     │  ├─ Momentum Score
│  │     │  └─ Discount %
│  │     │
│  │     ├─ filtersRow
│  │     │  └─ 5× filterCheck
│  │     │     ├─ Icon (checkmark or close)
│  │     │     └─ Text (filter name)
│  │     │
│  │     └─ recommendationBadge (BUY/HOLD/SELL)
│  │
│  ├─ ItemSeparator (12px gap)
│  │
│  └─ Footer Text
│     └─ "Premium screener disclaimer"

Result: Fully rendered ScreenerPage
```

---

## State Management

```
Component State:

const [stocks, setStocks] = useState<ScreenedStock[]>([])
│
├─ Holds: Array of 0-50 matched stocks
├─ Updated: After filtering & sorting
├─ Used by: FlatList (renderItem)
└─ Initial: Empty array []

const [loading, setLoading] = useState(true)
│
├─ Holds: Boolean (true while fetching)
├─ Updated: On load start/end
├─ Used by: Conditional rendering
└─ Initial: true (show loading state)

const [totalCount, setTotalCount] = useState(0)
│
├─ Holds: Total stocks from backend
├─ Updated: After fetch completes
├─ Used by: Statistics panel display
└─ Initial: 0

const [matchedCount, setMatchedCount] = useState(0)
│
├─ Holds: Stocks passing all 5 filters
├─ Updated: After filtering
├─ Used by: Statistics panel display
└─ Initial: 0
```

---

## Navigation Links

```
App.tsx (HomeStack)
│
├─ Screen: HomeMain
│  └─ HomeScreen
│     └─ [Card: "Smart Investing"]
│        └─ onPress → navigate('ScreenerPage')
│
└─ Screen: ScreenerPage
   ├─ ScreenerPage Component
   │  │
   │  └─ [Stock Card]
   │     └─ onPress → navigate('StockPage', { symbol })
   │
   └─ Back Button
      └─ onPress → navigation.goBack()
```

---

## Color Palette

```
Primary Colors:
├─ Background: #0b1120 (Dark blue)
├─ Surface: #1e293b (Card background)
└─ Primary: #3B82F6 (Blue accents)

Filter Colors:
├─ Undervalued: #10B981 (Green)
├─ Earnings: #3B82F6 (Blue)
├─ Revenue: #8B5CF6 (Purple)
├─ Debt: #F59E0B (Amber)
└─ Momentum: #EC4899 (Pink)

Rank Badge Colors:
├─ #1: #FFD700 (Gold)
├─ #2: #C0C0C0 (Silver)
├─ #3: #CD7F32 (Bronze)
└─ #4+: #3B82F6 (Blue)

Text Colors:
├─ Primary: #f8fafc (Off white)
├─ Secondary: #cbd5e1 (Light gray)
└─ Tertiary: #94a3b8 (Muted gray)

Recommendation Colors:
├─ BUY: #10B981 (Green)
├─ HOLD: #F59E0B (Amber)
└─ SELL: #EF4444 (Red)
```

---

## Responsive Design

```
Screen Size Handling:

Small Devices (< 360px):
├─ Reduced padding (8px)
├─ Smaller fonts (12-14px)
├─ Single column layout
└─ Compact cards

Medium Devices (360-600px):
├─ Standard padding (16px)
├─ Normal fonts (13-16px)
├─ 2-column layout where applicable
└─ Full feature set

Large Devices (600px+):
├─ Enhanced padding (20px)
├─ Larger fonts (16-18px)
├─ Optimal layout
└─ All features visible

iPad/Tablet:
├─ Window.Dimensions.get('window')
├─ Adapt width calculations
├─ Landscape orientation support
└─ Side-by-side layout possible
```

---

## Performance Optimization

```
Loading Optimization:
├─ Backend call (Promise-based)
├─ Parallel data fetch
└─ Async/await pattern

Filtering Optimization:
├─ Single pass through 2000+ stocks
├─ O(n) complexity
└─ < 500ms for full dataset

Rendering Optimization:
├─ FlatList (virtualized)
├─ 50 items max (not 2000)
├─ keyExtractor (symbols unique)
└─ ScrollEnabled=false in ScrollView

Memory Optimization:
├─ Filter criteria kept in scope
├─ No unnecessary data duplication
└─ Cleanup on unmount
```

---

## Error Handling Flow

```
Try to load stocks
│
├─ Success → Process data → Render
│
└─ Error → Catch block
   ├─ console.error() logged
   ├─ setLoading(false)
   └─ Render empty state
      └─ User sees "No Stocks Found"
         └─ Can tap Refresh button
            └─ Retry loadScreenedStocks()
```

---

## User Interaction Map

```
User Actions:

1. Opens app → See HomeScreen
   └─ New "Smart Investing" section visible

2. Taps "Smart Investing" card
   └─ Navigate to ScreenerPage
      └─ Loading state shows

3. Data loads (1-3 seconds)
   └─ FlatList populates with results

4. User scrolls down
   └─ See more stocks ranked #5, #6, etc.
   └─ Scroll performance smooth (FlatList)

5. Taps on stock card (e.g., MTN)
   └─ Navigate to StockPage
      └─ See detailed analysis
         └─ Current Price
         └─ Intrinsic Value
         └─ Margin of Safety
         └─ Health Scores
         └─ Charts

6. Taps back
   └─ Return to ScreenerPage
      └─ Data still in memory
      └─ No reload needed

7. Taps Refresh button (top-right)
   └─ Reload all data
   └─ Show loading state again
   └─ Re-fetch from backend

8. Taps back button
   └─ Navigate back to HomeScreen
      └─ App continues
```

---

## Summary: Architecture Layers

```
┌─────────────────────────────────────────┐
│ Presentation Layer (React Components)   │
│ ├─ Header                              │
│ ├─ Statistics                          │
│ ├─ Filter Legend                       │
│ ├─ Stock Cards (FlatList)              │
│ └─ Loading/Empty States                │
└──────────────┬──────────────────────────┘
               │
┌──────────────↓──────────────────────────┐
│ Business Logic Layer (Filtering)        │
│ ├─ calculateFiltersMet()               │
│ ├─ getFilterStatus()                   │
│ └─ Sorting/Limiting                    │
└──────────────┬──────────────────────────┘
               │
┌──────────────↓──────────────────────────┐
│ State Management Layer (React Hooks)    │
│ ├─ stocks                              │
│ ├─ loading                             │
│ ├─ totalCount                          │
│ └─ matchedCount                        │
└──────────────┬──────────────────────────┘
               │
┌──────────────↓──────────────────────────┐
│ API Layer (Backend Integration)         │
│ ├─ stockAPI.getSmartStrategy()         │
│ └─ Response: 2000+ stocks              │
└──────────────┬──────────────────────────┘
               │
┌──────────────↓──────────────────────────┐
│ Backend (FastAPI)                      │
│ └─ GET /smart-strategy                 │
└─────────────────────────────────────────┘
```

---

This visual architecture shows exactly how the Stock Screener works, from user interaction through backend integration.
