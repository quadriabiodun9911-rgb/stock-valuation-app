# UX Backlog (P1–P3) — Stock Valuation App

Last updated: 2026-03-13

## Goal

Move the app from feature-complete to frictionless for both first-time and returning users.

---

## P1 (Ship First)

### 1) Actionable Recommendation Strip (Home + Analysis + Stock Detail)

**Problem**

- Users see a lot of metrics but not a clear "what should I do now" decision.

**Scope**

- Add a compact recommendation strip at the top of key decision screens:
  - `mobile/src/screens/HomeScreen.tsx`
  - `mobile/src/screens/AnalysisScreen.tsx`
  - `mobile/src/screens/StockDetailScreen.tsx`

**Behavior**

- Label: `Buy`, `Hold`, `Review`, or `Avoid`
- One-line reason (max ~90 chars)
- Confidence indicator (`Low`, `Medium`, `High`)
- Optional CTA: `View Why`

**Acceptance criteria**

- Users can identify a recommended action in < 3 seconds.
- Recommendation is visible without scrolling on default device sizes.
- No blocking modal used for this guidance.

---

### 2) Beginner Mode (Progressive Disclosure)

**Problem**

- Advanced metrics can overwhelm new users.

**Scope**

- Add a `Beginner Mode` toggle in app settings/state.
- Hide advanced metrics/cards by default when enabled.
- Keep full data available in `Advanced` mode.

**Candidate screens**

- `mobile/src/screens/MarketAnalysisScreen.tsx`
- `mobile/src/screens/ValuationScreen.tsx`
- `mobile/src/screens/SmartStrategyScreen.tsx`

**Acceptance criteria**

- Beginner mode reduces visible metrics count by at least 30%.
- Users can switch modes without app restart.
- Core actions (search, analyze, add alert) remain accessible in both modes.

---

### 3) Web Startup Reliability (Expo web)

**Problem**

- Intermittent web startup issues (`Crc error`, web endpoint not binding to 19006).

**Scope**

- Identify and fix root cause (asset integrity or bundler/plugin issue).
- Ensure deterministic startup for `npx expo start --web`.

**Acceptance criteria**

- `npx expo start --web` starts successfully twice in a row on clean restart.
- `http://127.0.0.1:19006` returns HTTP 200.
- No CRC-related startup error in terminal logs.

---

## P2 (Next)

### 4) Unified Loading and Status Language

**Problem**

- Loading and status copy differs across screens.

**Scope**

- Standardize async states:
  - Loading
  - Empty
  - Success
  - Recoverable error
- Reuse banner and message patterns across major screens.

**Acceptance criteria**

- Shared wording style for all major data screens.
- Error messages include clear retry path.
- Fewer than 2 distinct loading visual patterns in core flows.

---

### 5) Empty-State Guided Onboarding

**Problem**

- New users can land in empty screens without clear sequence.

**Scope**

- Add 3-step inline guidance cards for first-run empty states:
  - Watchlist
  - Dashboard/Portfolio
  - Alerts

**Acceptance criteria**

- Each empty state has one primary CTA.
- Step-by-step helper appears until first successful action is completed.

---

### 6) Cross-Screen Interaction Sizing Completion

**Problem**

- Most screens are harmonized, but some secondary screens may still be outliers.

**Scope**

- Enforce interaction size baseline:
  - Secondary actions: `minHeight >= 40`
  - Primary CTAs: `minHeight >= 44`
- Audit remaining secondary screens and patch outliers.

**Acceptance criteria**

- No action-button outliers in target screen set.
- Touch targets meet baseline on iOS and Android.

---

## P3 (Polish + Confidence)

### 7) UX Regression Test Coverage

**Problem**

- Current tests cover app render but not key UX states.

**Scope**

- Add UI tests for:
  - Inline error banner rendering
  - Disabled state when required inputs are missing
  - Empty-state messaging on filtered/no-data screens

**Acceptance criteria**

- At least one test per critical flow family.
- Failing UX regressions are caught before release.

---

### 8) Per-Screen UX Health Scorecard

**Problem**

- No single view of UX quality status by screen.

**Scope**

- Create a lightweight scorecard (0–5) per screen for:
  - Clarity
  - Guidance
  - Error recovery
  - Interaction consistency
  - Performance perception

**Acceptance criteria**

- Scorecard covers all core navigation screens.
- Baseline and target scores defined before next release.

---

## Suggested Delivery Sequence

1. P1.3 Web reliability (unblocks reliable demos + QA)
2. P1.1 Recommendation strip
3. P1.2 Beginner mode
4. P2.4 Unified loading/status
5. P2.5 Empty-state onboarding
6. P2.6 Final interaction-size sweep
7. P3.7 UX regression tests
8. P3.8 UX health scorecard

---

## Definition of Done (UX)

- Core user can complete first value flow in < 2 minutes:
  - Search stock → run analysis → set alert
- No dead-end screen states without clear CTA.
- All primary actions visibly enabled/disabled with clear reason.
- Web and mobile launch paths reproducible with documented commands.
