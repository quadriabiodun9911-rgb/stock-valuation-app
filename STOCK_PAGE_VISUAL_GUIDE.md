# Stock Page - Visual Layout Guide

## Screen Structure

```
┌─────────────────────────────────────┐
│  ← MTN                              │
│  ₦450.25                            │
│  +2.15%                             │
│  (Dark gradient header)             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Valuation Analysis                  │
├─────────┬─────────┬─────────────────┤
│ Current │Intrinsic│Margin of Safety │
│ Price   │ Value   │                 │
│ ₦450.25 │ ₦520.00 │      15.5%      │
├─────────┴─────────┴─────────────────┤
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Valuation Signal                    │
├──────────────────────────────────────┤
│ ╔════════════════════════════════╗  │
│ ║  Undervalued                 🟢║  │
│ ╚════════════════════════════════╝  │
│ Margin of Safety: 15.5% Upside      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Financial Health                    │
├──────┬──────────┬──────────────────┤
│Health│  Growth  │   Debt Ratio     │
│ 78/  │  65/     │      32%         │
│ 100  │  100     │                  │
│ █████│ ████     │ (Lower = Better) │
├──────┴──────────┴──────────────────┤
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Price History          [1Y][3Y][5Y] │
├─────────────────────────────────────┤
│                                     │
│       ╱╲╱╲        ╱╲               │
│      ╱  ╲  ╲      ╱  ╲             │
│     ╱    ╲  ╲╱╲  ╱    ╲╱╲          │
│    ╱      ╲        ╱     ╲         │
│                                     │
│  Jan    Mar    May    Jul    Sep    │
├─────────────────────────────────────┤
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Your Competitive Edge               │
├─────────────────────────────────────┤
│ 💡 Data-Driven Valuation            │
│    Algorithm-based intrinsic value  │
│    Margin of safety quantification  │
│                                     │
│ 📈 Growth & Health Metrics          │
│    Track growth trajectory          │
│    Financial health scores          │
│                                     │
│ 🛡️  Risk Assessment                 │
│    Debt ratios & valuation signals  │
│    Informed decision-making         │
├─────────────────────────────────────┤
└─────────────────────────────────────┘
```

## Component Breakdown

### 1. Header Section (Gradient)

```
┌────────────────────────┐
│ ← Symbol               │
│   Price               │
│   Change %            │
└────────────────────────┘
Size: Full width
Colors: Gradient (Dark Blue)
Back Button: Top-left
```

### 2. Valuation Snapshot (3-Column Grid)

```
┌────────┬────────┬────────┐
│Current │Intrinsic│Margin │
│ Price  │ Value  │Safety │
├────────┼────────┼────────┤
│₦450.25 │₦520.00 │ 15.5% │
└────────┴────────┴────────┘
Each Card:
- Label: Small gray text
- Value: Large bold numbers
- Unit: Tiny unit label
```

### 3. Valuation Signal Card

```
┌─────────────────────────┐
│ Valuation Signal        │
├─────────────────────────┤
│ [TEXT]         [ICON]   │
│ Undervalued     🟢      │
│                         │
│ Badge background color  │
│ matches signal type     │
└─────────────────────────┘
```

### 4. Financial Health (Score Cards)

```
┌──────────┬──────────┬──────────┐
│          │          │          │
│  ┌────┐  │  ┌────┐  │  ┌────┐  │
│  │ 78 │  │  │ 65 │  │  │ 32 │  │
│  │/100│  │  │/100│  │  │ %  │  │
│  └────┘  │  └────┘  │  └────┘  │
│ Health   │ Growth   │  Debt    │
│ Score    │ Score    │  Ratio   │
│ [Bar]    │ [Bar]    │ [Hint]   │
└──────────┴──────────┴──────────┘
```

### 5. Chart Section

```
┌──────────────────────────────────┐
│ Price History  [1Y][3Y][5Y]      │
├──────────────────────────────────┤
│                                  │
│  ╱╲      ╱╲       ╱╲            │
│ ╱  ╲    ╱  ╲     ╱  ╲           │
│╱    ╲╱╲╱    ╲╱╲╱    ╲╱╲        │
│                                  │
│ Jan  Feb  Mar  Apr  May  Jun     │
└──────────────────────────────────┘
Period Buttons:
- Default: Gray background
- Active: Blue background
- Text: Small, uppercase
```

### 6. Competitive Edge Section

```
┌──────────────────────────┐
│ Your Competitive Edge    │
├──────────────────────────┤
│ [Icon] Title             │
│        Description text  │
│                          │
│ [Icon] Title             │
│        Description text  │
│                          │
│ [Icon] Title             │
│        Description text  │
└──────────────────────────┘
Cards displayed in vertical list
Each has icon + title + description
```

## Color Code Reference

### Valuation Signals

```
Undervalued:  🟢 #10B981 (Green)
Fair:         🟡 #F59E0B (Amber)
Overvalued:   🔴 #EF4444 (Red)
```

### Score Bars

```
High Score:   🟢 #10B981 (Green)      70-100
Medium Score: 🟡 #F59E0B (Amber)      50-70
Low Score:    🔴 #EF4444 (Red)        0-50
```

### General UI

```
Background:   #0b1120 (Dark Blue)
Cards:        #1e293b (Slate)
Borders:      #334155 (Muted Gray)
Text Primary: #f8fafc (Off White)
Text Muted:   #94a3b8 (Gray)
```

## Interaction Flow

```
User Clicks Stock
    ↓
StockPage Mounts
    ↓
Show Loading State
    ↓
Fetch Data (Parallel):
├─ Stock Info
├─ Intrinsic Value
└─ Price History (1Y)
    ↓
Render:
├─ Header (Immediate)
├─ Snapshot Cards (Data loaded)
├─ Signal Card (Calculated)
├─ Health Cards (Calculated)
├─ Chart (Rendered)
└─ Edge Cards (Static)
    ↓
User Can:
├─ Select Chart Period (1Y/3Y/5Y)
└─ Go Back (Navigate back)
```

## Responsive Breakpoints

```
Screen Width | Adjustments
──────────────────────────
<360px       | Reduced padding
             | Smaller fonts
             | Stacked layout

360-600px    | Standard layout
             | Default sizing
             | 2-column for some sections

600px+       | Enhanced spacing
             | Larger fonts
             | Optimal layout
```

## Text Hierarchy

```
Level 1: Symbol (22px, Bold)
Level 2: Price (32px, Bold)
Level 3: Scores (24px, Bold)
Level 4: Card Values (18px, Bold)
Level 5: Labels (14px, Medium)
Level 6: Hints (12px, Regular)
Level 7: Small Text (11px, Regular)
```

## Spacing Standards

```
Section Margins:     20px horizontal
Card Padding:        16px
Grid Gap:            12px
Small Gap:           8px
Line Height:         1.5x font size
```

## Loading States

```
Initial Load:
├─ Header: Visible immediately
├─ Snapshot: Loading spinner
├─ Signal: Loading text
├─ Health: Loading spinner
├─ Chart: Loading spinner
└─ Edge: Visible immediately

Chart Period Change:
├─ Loading spinner overlays chart
└─ Data updates on completion

Error State:
├─ Error message displayed
├─ Retry option offered
└─ Fallback data shown
```

---

This layout ensures users can quickly understand:

1. **Is this stock undervalued?** (Signal card)
2. **How healthy is the company?** (Health scores)
3. **What's the historical trend?** (Chart)
4. **Why should I trust this analysis?** (Competitive edge)
