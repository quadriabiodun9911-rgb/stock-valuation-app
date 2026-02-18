# 📱 Visual UX Flow Guide

## App Navigation Map

```
┌─────────────────────────────────────────────────────────────┐
│                    STOCK VALUATION APP                      │
│                   (Simplified UX Flow)                      │
└─────────────────────────────────────────────────────────────┘

                          FIRST LAUNCH
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌──────▼──────┐          ┌────────▼────────┐
        │ Onboarding? │          │ User Taps Skip  │
        │ (4 Screens) │          │     or Done     │
        └──────┬──────┘          └────────┬────────┘
               │                          │
               └──────────┬───────────────┘
                          │
                ┌─────────▼─────────┐
                │   HOME SCREEN     │
                │  "Start Here" 🎯  │
                └────────┬──────────┘
                         │
        ┌────────────────┼────────────────┬────────────────┐
        │                │                │                │
    ┌───▼──────┐  ┌──────▼────────┐ ┌────▼──────┐  ┌────▼────────┐
    │   QUICK  │  │   SET ALERTS  │ │ PORTFOLIO │  │MARKET NEWS  │
    │VALUATION │  │   (Watchlist) │ │ (Holdings)│  │ (Analysis)  │
    └───┬──────┘  └──────┬────────┘ └────┬──────┘  └────┬────────┘
        │                │                │             │
        │         ┌──────▼─────┐     ┌───▼──┐    ┌───▼──┐
        │         │   Create   │     │View  │    │ Deep │
        │         │   Alerts   │     │All   │    │ Dive │
        │         │  (Price &  │     │Stock │    │Insights
        │         │  Day Move) │     │Data  │    └──────┘
        │         └────────────┘     └──────┘
        │
        ▼
    ┌─────────────────────────────────┐
    │   VALUATION SIMPLIFIED SCREEN   │
    │  (Main Feature - 2 Tabs)        │
    └────────────────┬────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
    ┌───▼─────────┐      ┌───────▼──────┐
    │  EPS × P/E  │      │  QUICK DCF   │
    │   TAB 1     │      │   TAB 2      │
    └───┬─────────┘      └───┬──────────┘
        │                    │
    ┌───▼─────────────┐  ┌───▼────────────────┐
    │  Input EPS      │  │ Input FCF          │
    │  Input P/E      │  │ Input Growth Rate  │
    │  Auto-Calculate │  │ Input Discount R.  │
    │                 │  │ Input Terminal Gr. │
    │  RESULT CARD    │  │ Input Share Count  │
    │  (Green)        │  │                    │
    │  ✓ Target: ₦37  │  │ RESULT CARD        │
    │  vs Current     │  │ (Blue)             │
    │  Signal: 📉     │  │ ✓ Fair Value: ₦45  │
    │                 │  │ Upside: +12.8%     │
    └─────────────────┘  └────────────────────┘
                         
                ┌──────────────────┐
                │  Settings Icon   │
                │    (Cog)         │
                │  Access Full     │
                │  Analysis Tabs   │
                └────────┬─────────┘
                         │
                ┌────────▼─────────┐
                │ FULL VALUATION   │
                │ (4-Tab Advanced) │
                │ 1. DCF Details   │
                │ 2. Comparables   │
                │ 3. Technical     │
                │ 4. Full Analysis │
                └──────────────────┘
```

---

## Screen-by-Screen Breakdown

### **1. ONBOARDING (First Time Only)**

```
┌──────────────────────────────┐
│ Screen 1: Stock Valuation    │  ┌─────────────────────┐
│ 📈 Icon                      │  │ Progress: ● ○ ○ ○   │
│                              │  └─────────────────────┘
│ Made Simple                  │
│ Professional analysis at     │  [Skip]      [Next →]
│ your fingertips              │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Screen 2: Smart Watchlist    │  ┌─────────────────────┐
│ 🔖 Icon                      │  │ Progress: ● ● ○ ○   │
│                              │  └─────────────────────┘
│ Track what matters           │
│ Set price alerts, monitor    │  [Skip]      [Next →]
│ daily moves...               │
└──────────────────────────────┘

(Similar for screens 3-4)
```

---

### **2. HOME SCREEN**

```
┌──────────────────────────────────────┐
│  Stock Valuation          [Menu]     │  ← Header
├──────────────────────────────────────┤
│                                      │
│  [Market Selection: NGX ▼]           │
│                                      │
├──────────────────────────────────────┤
│                                      │
│  START HERE                          │  ← Section Title
│  ┌──────────────┬──────────────┐     │
│  │    Quick     │   Set        │     │
│  │ Valuation 🔵 │  Alerts 🟢   │     │
│  │  EPS & DCF   │ Track prices │     │
│  └──────────────┴──────────────┘     │
│  ┌──────────────┬──────────────┐     │
│  │ Portfolio 🟠 │Market News 🟣│     │
│  │ Your holding │ Latest trends│     │
│  └──────────────┴──────────────┘     │
│                                      │
├──────────────────────────────────────┤
│  PORTFOLIO (if holdings exist)       │
│  Total: ₦250,000                     │
│  Profit: +₦12,500 (+5.3%)            │
│                                      │
│  ✓ APPLE.NG    ₦45,000  +2.1%        │
│  ✓ ZENITH.NG   ₦55,000  +3.5%        │
│                                      │
│  [View all 5 holdings →]             │
│                                      │
├──────────────────────────────────────┤
│  NGX Snapshot                        │
│  Index: ₦68,500  ↑ +1.2%             │
│                                      │
│  Top Gainers: GTCO +4.2% ...         │
│                                      │
│  Top Losers: STANBIC -2.1% ...       │
└──────────────────────────────────────┘
```

---

### **3. VALUATION SIMPLIFIED**

```
┌──────────────────────────────────────┐
│  ← APPLE.NG  ₦40.00          ⚙️     │  ← Header with settings
├──────────────────────────────────────┤
│                                      │
│  💡 EPS × P/E gives quick target     │  ← Helpful tip
│                                      │
│  [EPS×P/E] [Quick DCF]               │  ← Tabs
│                                      │
├──── TAB 1: EPS × P/E ──────────────┤
│                                      │
│  Earnings Per Share (EPS)            │
│  [💵 2.50         ]                  │
│  Annual earnings per share           │
│                                      │
│  Price-to-Earnings (P/E)             │
│  [📊 15.00        ]                  │
│  Market multiple                     │
│                                      │
├──────────────────────────────────────┤
│                                      │
│  ╔══════════════════════════════════╗
│  ║ TARGET PRICE                     ║
│  ║ ₦37.50                           ║
│  ║                                  ║
│  ║ Current: ₦40.00  ↓ Overvalued   ║
│  ║ Difference: -₦2.50  (-6.3%)      ║
│  ╚══════════════════════════════════╝
│                                      │
│  [← Back]        [Full Analysis →]   │
└──────────────────────────────────────┘

(Similar layout for Tab 2: Quick DCF)
```

---

### **4. PORTFOLIO QUICK**

```
┌──────────────────────────────────────┐
│  Portfolio Summary        [Refresh]  │  ← Header
├──────────────────────────────────────┤
│                                      │
│  ╔══════════════════════════════════╗
│  ║ Total Value: ₦250,000            ║
│  ║                                  ║
│  ║ Invested: ₦237,500               ║
│  ║ Profit: +₦12,500 (+5.3%)         ║
│  ╚══════════════════════════════════╝
│                                      │
│  HOLDINGS                            │
│  ┌──────────────────────────────────┐
│  │ APPLE.NG                         │
│  │ 1,000 shares @ ₦40.50            │
│  │                      ₦45,000     │
│  │                      +₦2,100 +4.8%
│  └──────────────────────────────────┘
│                                      │
│  ┌──────────────────────────────────┐
│  │ ZENITH.NG                        │
│  │ 500 shares @ ₦110.00             │
│  │                      ₦55,000     │
│  │                      +₦1,900 +3.6%
│  └──────────────────────────────────┘
│                                      │
│  QUICK ACTIONS                       │
│  [📊 Full Analysis]  [🔍 Screener]   │
│                                      │
└──────────────────────────────────────┘
```

---

## User Journey Timelines

### **Timeline 1: New User (5 minutes)**

```
0:00 - App launches, sees onboarding
0:30 - Views all 4 onboarding screens  
1:00 - Lands on Home screen
1:30 - Clicks "Quick Valuation"
2:00 - Enters EPS (2.50) and P/E (15)
2:10 - Sees result instantly: ₦37.50
2:30 - Understands valuation basics
3:00 - Explores Portfolio view
4:00 - Checks Watchlist for alerts
5:00 - Done! App is intuitive
```

### **Timeline 2: Quick Calculation (2 minutes)**

```
0:00 - Opens app (skips onboarding)
0:30 - Taps "Quick Valuation"
1:00 - EPS×P/E tab already selected
1:15 - Enters 2 values (EPS, P/E)
1:30 - Gets result instantly
2:00 - Decides to check portfolio
```

### **Timeline 3: Deep Analysis (8 minutes)**

```
0:00 - Home screen
1:00 - "Quick Valuation" → DCF tab
2:00 - Enters all 5 DCF inputs
4:00 - Calculates and gets fair value
5:00 - Clicks settings icon for full analysis
6:00 - Explores all 4 detailed tabs
8:00 - Makes investment decision
```

---

## Color Psychology in UI

```
┌─────────────────────────────────────────┐
│           QUICK ACTIONS CARDS           │
├─────────────────────────────────────────┤
│                                         │
│ 🔵 Quick Valuation (Blue)               │
│ └─ "Go" action, primary feature         │
│                                         │
│ 🟢 Set Alerts (Green)                   │
│ └─ Positive, safe, monitoring           │
│                                         │
│ 🟠 Portfolio (Orange)                   │
│ └─ Neutral, informational               │
│                                         │
│ 🟣 Market News (Purple)                 │
│ └─ Educational, insights                │
│                                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│           RESULT CARDS COLORS           │
├─────────────────────────────────────────┤
│                                         │
│ ✓ EPS×P/E Result (Green)                │
│   └─ Success, ready to act              │
│                                         │
│ ✓ DCF Result (Blue)                     │
│   └─ Data-driven, analytical            │
│                                         │
│ ↑ Positive Return (Green)               │
│   └─ Good news, gain                    │
│                                         │
│ ↓ Negative Return (Red)                 │
│   └─ Alert, loss                        │
│                                         │
└─────────────────────────────────────────┘
```

---

## Information Architecture

```
HOME SCREEN
├── Onboarding (if new)
├── Market Selector
├── Portfolio Summary
│   ├── Total Value
│   ├── Holdings List
│   └── Risk Indicator
├── Quick Actions (4 cards)
│   ├── Quick Valuation
│   ├── Set Alerts
│   ├── Portfolio
│   └── Market News
├── NGX Snapshot
└── Featured Stocks

QUICK VALUATION
├── EPS×P/E Tab
│   ├── EPS Input
│   ├── P/E Input
│   ├── Real-time Result
│   └── Comparison Card
└── Quick DCF Tab
    ├── FCF Input
    ├── Growth Rate Input
    ├── Discount Rate Input
    ├── Terminal Growth Input
    ├── Share Count Input
    ├── Calculate Button
    └── Result Card

FULL ANALYSIS (Behind settings icon)
├── DCF Tab (advanced)
├── Comparable Tab
├── Technical Tab
└── Full Analysis Tab
```

---

## Accessibility Features

```
✓ Touch targets: 48x48px minimum
✓ Text contrast: WCAG AA compliant
✓ Font sizes: 13px+ for body text
✓ Icons + Labels: Never icon alone
✓ Colors: Not the only differentiator
✓ Help: Available via tooltips
✓ Keyboard: All actions keyboard accessible
✓ Haptic: Feedback on button press
```

---

**Visual Guide Complete** ✅

Print this for design review or user testing!
