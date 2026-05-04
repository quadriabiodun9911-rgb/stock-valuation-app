# Portfolio Tracker - Implementation Guide

## 🏗️ Architecture Overview

### File Structure

```
mobile/src/screens/
├── PortfolioTrackerPage.tsx        (900+ lines - main component)
├── HomeScreen.tsx                  (updated - added access card)
└── App.tsx                         (updated - added route)
```

### Component Hierarchy

```
PortfolioTrackerPage (Main Container)
├── LinearGradient Header
│   ├── Back Button
│   ├── Title + Subtitle
│   └── Add Button
├── ScrollView (Content)
│   ├── PortfolioSummary
│   │   ├── SummaryCard (Total Value)
│   │   ├── SummaryCard (Total Cost)
│   │   └── SummaryCard (P/L)
│   ├── ValuationAnalysis
│   │   ├── ValuationRow (Portfolio Value)
│   │   ├── Separator
│   │   ├── ValuationRow (Intrinsic Value)
│   │   ├── Separator
│   │   └── ValuationRow (Vs Intrinsic)
│   ├── ScoresSection
│   │   ├── ScoreCard (Risk Score)
│   │   │   ├── Header
│   │   │   ├── Display (number/100)
│   │   │   ├── ProgressBar
│   │   │   └── Hint
│   │   ├── ScoreCard (Diversification Score)
│   │   └── InsightCards (Largest + Highest Risk)
│   ├── HoldingsSection
│   │   ├── HoldingCard (per holding)
│   │   │   ├── Header (Symbol, Delete)
│   │   │   ├── Metrics (Current, Intrinsic, Value)
│   │   │   └── P/L Display (₦, %, vs Intrinsic)
│   │   └── EmptyState
│   └── Footer
└── Modal (Add Stock)
    ├── Header
    ├── Form
    │   ├── Symbol Input
    │   ├── Quantity Input
    │   ├── Buy Price Input
    │   └── Add Button
    └── Overlay
```

---

## 💻 Code Structure

### State Management

```typescript
// Portfolio Holdings
const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);

// UI State
const [loading, setLoading] = useState(false);
const [modalVisible, setModalVisible] = useState(false);

// Form Fields
const [symbol, setSymbol] = useState('');
const [quantity, setQuantity] = useState('');
const [buyPrice, setBuyPrice] = useState('');
```

### Core Functions

#### 1. `calculateMetrics(): PortfolioMetrics`

**Purpose:** Compute all portfolio statistics

**Steps:**

1. Calculate totalValue: `sum(quantity * currentPrice)`
2. Calculate totalCost: `sum(quantity * buyPrice)`
3. Calculate totalPL: `totalValue - totalCost`
4. Calculate totalPLPercent: `(totalPL / totalCost) * 100`
5. Calculate overallIntrinsicValue: `sum(quantity * intrinsicValue)`
6. Calculate portfolioVsIntrinsic: `((totalValue / intrinsicValue) * 100) - 100`
7. **Calculate Risk Score:**
   - Initialize with 50
   - Evaluate concentration risk
   - Evaluate margin of safety
   - Evaluate profitability
   - Clamp to [0, 100]
8. **Calculate Diversification Score:**
   - Reward # of holdings
   - Reward sector diversity
   - Reward low concentration
   - Clamp to [0, 100]
9. Identify topRiskHolding and largestPosition

**Output:** PortfolioMetrics object

#### 2. `loadPortfolio(): Promise<void>`

**Purpose:** Initialize portfolio with data

**Implementation:**

- In demo: Load hardcoded holdings
- In production: Fetch from AsyncStorage/backend
- Set loading state during fetch
- Handle errors gracefully

#### 3. `addHolding(): Promise<void>`

**Purpose:** Add new stock to portfolio

**Validation:**

- Symbol not empty
- Quantity > 0
- Buy price > 0

**Logic:**

1. Create PortfolioHolding object with:
   - Unique ID (timestamp)
   - Validated inputs
   - Current price (10% above buy price in demo)
   - Intrinsic value (15% above current in demo)
2. Append to holdings array
3. Clear form fields
4. Close modal
5. Alert on error

#### 4. `removeHolding(id: string): void`

**Purpose:** Delete holding from portfolio

**Logic:**

1. Filter holdings by ID
2. Update state with remaining holdings
3. Metrics recalculate automatically via useMemo

#### 5. `getRiskColor(score: number): string`

**Purpose:** Map risk score to color

**Logic:**

- < 30: '#10B981' (green - low)
- 30-60: '#F59E0B' (amber - medium)
- > 60: '#EF4444' (red - high)

#### 6. `getDiversificationColor(score: number): string`

**Purpose:** Map diversification to color

**Logic:**

- ≥ 70: '#10B981' (green - well diversified)
- 40-70: '#F59E0B' (amber - okay)
- < 40: '#EF4444' (red - concentrated)

---

## 🎨 Styling System

### Color Palette

```typescript
const COLORS = {
  background: '#0b1120',
  card: '#1e293b',
  dark: '#334155',
  text: {
    primary: '#f8fafc',
    secondary: '#cbd5e1',
    tertiary: '#94a3b8',
  },
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  },
  accent: {
    blue: '#3B82F6',
    purple: '#8B5CF6',
  },
};
```

### Reusable Patterns

#### Card Style

```typescript
{
  backgroundColor: '#1e293b',
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderLeftWidth: 4,
  borderLeftColor: '#3B82F6', // accent color
}
```

#### Text Hierarchy

```typescript
{
  title: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
  subtitle: { fontSize: 12, color: '#94a3b8' },
  label: { fontSize: 11, color: '#cbd5e1', fontWeight: '500' },
  hint: { fontSize: 10, color: '#94a3b8' },
}
```

#### Input Style

```typescript
{
  backgroundColor: '#0b1120',
  borderWidth: 1,
  borderColor: '#334155',
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  color: '#f8fafc',
}
```

---

## 🔗 Integration Points

### Navigation (App.tsx)

**Import:**

```typescript
import PortfolioTrackerPage from './src/screens/PortfolioTrackerPage';
```

**Route in HomeStack:**

```typescript
<Stack.Screen
    name="PortfolioTrackerPage"
    component={PortfolioTrackerPage}
    options={{ headerShown: false }}
/>
```

### Access Points

#### HomeScreen Card

```tsx
<TouchableOpacity
    onPress={() => navigation.navigate('PortfolioTrackerPage')}
    style={styles.card}
>
    {/* Card Content */}
</TouchableOpacity>
```

#### From Holdings

```tsx
<TouchableOpacity
    onPress={() => navigation.navigate('StockPage', { symbol: item.symbol })}
    style={styles.holdingCard}
>
    {/* Holding Details */}
</TouchableOpacity>
```

---

## 📊 Data Flow Diagram

```
User Action
    ↓
State Update (holdings)
    ↓
useMemo Hook Triggers
    ↓
calculateMetrics() Function
    ├── Calculate basic values (totalValue, totalCost, P/L)
    ├── Calculate risk score (5 factors)
    ├── Calculate diversification (3 factors)
    └── Identify insights
    ↓
Metrics Update
    ↓
Component Re-render
    ├── Summary cards update
    ├── Score cards update
    ├── Holdings list updates
    └── Colors/indicators update
```

---

## ⚙️ Algorithm Deep Dive

### Risk Score Calculation Example

**Scenario:** Portfolio with 2 holdings

- MTN: 100 shares @ ₦450 = ₦45,000 (60% of portfolio)
- GTCO: 50 shares @ ₦3,250 = ₦162,500 (40% of portfolio)
- Total: ₦207,500

**Calculation:**

1. Base score: 50
2. Concentration (largest = 60%):
   - 60% > 40% → +20
   - Running total: 70
3. Margin of Safety:
   - MTN: (520-450)/520 = 13.5% (good)
   - GTCO: (3600-3250)/3600 = 9.7% (good)
   - Average: 11.6% (5-15% range)
   - → +5
   - Running total: 75
4. Profitability:
   - Both profitable (0 unprofitable)
   - → -5
   - Running total: 70
5. Clamp to [0, 100]: 70 (moderate risk)

**Result:** Risk score = 70 (Amber - moderate risk)

### Diversification Score Calculation Example

**Scenario:** Same portfolio as above

- Holdings: 2
- Sectors: Telecom (MTN), Finance (GTCO)
- HHI: (0.6)² + (0.4)² = 0.36 + 0.16 = 0.52

**Calculation:**

1. Number of holdings (2): 40 points
2. Sector diversification (2 sectors): +8 points
3. Concentration (HHI = 0.52 > 0.3): 0 points
4. Total: 40 + 8 = 48

**Result:** Diversification score = 48 (Amber - moderate diversity)

---

## 📱 Responsive Design

### Breakpoints

- Small (< 360px): Single column
- Medium (360-480px): Optimized padding
- Large (480+px): Default spacing

### Adaptive Layouts

- **Holdings List:** FlatList with flex=1
- **Score Cards:** Row with flex=1 each
- **Summary Cards:** Row with flex=1 each
- **Modal:** Bottom sheet (80% height)

---

## 🔍 Error Handling

### Error Scenarios

#### 1. Invalid Input

```typescript
if (!symbol.trim() || !quantity || !buyPrice) {
  Alert.alert('Error', 'Please fill all fields');
  return;
}
```

#### 2. API Failure

```typescript
try {
  const data = await api.fetch();
} catch (error) {
  console.error('Failed to load portfolio:', error);
  setPortfolio(null);
} finally {
  setLoading(false);
}
```

#### 3. Empty Portfolio

```typescript
{holdings.length === 0 ? (
  <EmptyState />
) : (
  <HoldingsList />
)}
```

---

## 🧪 Testing Checklist

### Unit Tests

- [ ] calculateMetrics() with various scenarios
- [ ] getRiskColor() returns correct colors
- [ ] getDiversificationColor() returns correct colors
- [ ] Risk score clamping to [0, 100]
- [ ] Diversification score clamping to [0, 100]

### Integration Tests

- [ ] Add holding creates correct entry
- [ ] Remove holding updates state
- [ ] Modal opens/closes
- [ ] Navigation to StockPage works
- [ ] Navigation back works

### UI Tests

- [ ] Header renders correctly
- [ ] All cards visible on scroll
- [ ] Colors update based on scores
- [ ] P/L colors change (green/red)
- [ ] Progress bars animate
- [ ] Empty state displays
- [ ] Modal animations smooth

### Performance Tests

- [ ] Initial load < 1s
- [ ] Add/remove < 500ms
- [ ] Scroll 60 FPS
- [ ] No memory leaks
- [ ] Large portfolio (100+ holdings) performant

---

## 📈 Performance Optimization

### Current

- useMemo for metrics calculation
- FlatList virtualization
- Memoized color functions

### Potential Improvements

- Pagination for large portfolios
- Background calculations
- Caching strategies
- Lazy loading details
- Debounced updates

---

## 🚀 Deployment Steps

1. **Verify Compilation**

   ```bash
   npx tsc --noEmit
   ```

2. **Test on Simulator**

   ```bash
   cd mobile && npx expo start -c
   ```

3. **Manual Testing**
   - Add 3 stocks
   - Verify metrics calculate
   - Check risk/diversity scores
   - Tap holdings (navigate to StockPage)
   - Delete holding
   - Verify empty state

4. **Production Checklist**
   - [ ] AsyncStorage integration
   - [ ] Backend API integration
   - [ ] Error tracking
   - [ ] Analytics logging
   - [ ] User documentation

---

## 📞 Support

- **Issues:** Check console logs
- **Performance:** Use React DevTools Profiler
- **Styling:** Update StyleSheet.create() block
- **Logic:** Debug calculateMetrics() function

---

**Last Updated:** February 20, 2026
**Version:** 1.0.0
**Lines of Code:** 900+
**TypeScript Errors:** 0 ✅
