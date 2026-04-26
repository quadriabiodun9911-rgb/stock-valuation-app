# App Store Launch Execution Checklist

Purpose: run launch readiness as a pass/fail program for Google Play and Apple App Store.

How to use:
- Set one owner per row.
- Keep status to one of: Not Started, In Progress, Blocked, Done.
- Add evidence links or file paths for every completed row.
- Do not move to the next gate until all required rows in the current gate are Done.

## Release Scope
- Release name: v1.0 Store Launch
- Target markets: Google Play first, Apple App Store second
- Freeze date: Day 1 of launch sprint
- Android release lead: __________________
- iOS release lead: __________________
- Backend release lead: __________________

### v1 Launch Scope
- Must-work flows: Login, Home, Search, Stock Detail, Full Analysis, AI Chat
- Out of scope for launch gate: non-essential experimental surfaces, advanced social/community expansion, secondary planning tools that do not block the six must-work flows

### Release Criteria
- Zero known crashers on Login, Home, Search, Stock Detail, Full Analysis, and AI Chat
- No blocking spinner longer than 10 seconds on must-work flows
- Every API failure must show a friendly fallback message
- Full Analysis must remain usable when AI is unavailable
- Route-based valuation flows must not assume missing params crash-free

## Status Legend
- Not Started
- In Progress
- Blocked
- Done

## Gate 0: Scope Freeze (Required)

| Item | Owner | Status | Due Date | Evidence |
|---|---|---|---|---|
| Define must-work user flows: Login, Home, Search, Stock Detail, Full Analysis, AI Chat |  | Done |  | APP_STORE_LAUNCH_EXECUTION_CHECKLIST.md |
| Freeze v1 feature list and mark all non-launch features out of scope |  | Done |  | APP_STORE_LAUNCH_EXECUTION_CHECKLIST.md |
| Publish release criteria (no crash on must-work flows, no infinite spinner, friendly API error states) |  | Done |  | APP_STORE_LAUNCH_EXECUTION_CHECKLIST.md |
| Confirm production backend URL and environment strategy (no localhost assumptions) |  | In Progress |  | mobile/.env.example |

Gate rule: all rows Done before entering Gate 1.

## Gate 1: App Reliability (Required)

| Item | Owner | Status | Due Date | Evidence |
|---|---|---|---|---|
| Add route-param guards on all symbol-driven screens |  | In Progress |  | mobile/src/screens/ValuationScreen.tsx |
| Add global API timeout handling and non-blocking fallback messages |  | Done |  | mobile/src/services/api.ts |
| Add retry policy for transient network errors (single retry minimum) |  | Done |  | mobile/src/services/api.ts |
| Implement cached last-known-good data for key screens |  | In Progress |  | mobile/src/services/api.ts, mobile/src/utils/cache.ts |
| Ensure Full Analysis works under upstream rate limits with partial response behavior |  | Done |  | backend/main.py |
| Ensure AI recommendation failure does not block analysis UX |  | In Progress |  | mobile/src/screens/ValuationScreen.tsx |
| Verify no blocking spinner > 10 seconds on must-work flows |  | In Progress |  | Needs device test evidence |

Gate rule: all rows Done and verified on Android + iOS test devices.

## Gate 2: Backend Resilience (Required)

| Item | Owner | Status | Due Date | Evidence |
|---|---|---|---|---|
| Add short TTL server-side caching for market snapshots |  | Done |  | backend/main.py |
| Add throttling/de-duplication for repeated symbol requests |  | Done |  | backend/main.py |
| Return partial payloads instead of 500 when one upstream source fails |  | Done |  | backend/main.py |
| Add health and readiness checks for production monitoring |  | Done |  | backend/main.py |
| Define incident fallback mode for upstream rate-limit events |  | In Progress |  | Document in runbook next |

Gate rule: backend load test and error-rate trend accepted by release lead.

## Gate 3: Quality and Observability (Required)

| Item | Owner | Status | Due Date | Evidence |
|---|---|---|---|---|
| Integrate crash reporting in release builds |  | Not Started |  |  |
| Integrate client-side error logging for critical API failures |  | Not Started |  |  |
| Track screen load times on must-work flows |  | Not Started |  |  |
| Define release SLOs (crash-free sessions, API success rate, startup time) |  | Not Started |  |  |
| Build a release dashboard for go/no-go review |  | Not Started |  |  |

Gate rule: dashboard available and SLO thresholds agreed.

## Gate 4: Store Compliance and Metadata (Required)

| Item | Owner | Status | Due Date | Evidence |
|---|---|---|---|---|
| Privacy policy URL published and linked |  | Not Started |  |  |
| App support contact email and page set |  | Not Started |  |  |
| Google Play Data Safety completed |  | Not Started |  |  |
| Apple App Privacy questionnaire completed |  | Not Started |  |  |
| Store listing assets ready (icon, screenshots, descriptions) |  | Not Started |  |  |
| Age rating and content declarations completed |  | Not Started |  |  |

Gate rule: all compliance rows Done before binary submission.

## Gate 5: Release Builds and Signing (Required)

| Item | Owner | Status | Due Date | Evidence |
|---|---|---|---|---|
| Android signing keys validated and secure backup confirmed |  | Not Started |  |  |
| iOS certificates and provisioning profiles validated |  | Not Started |  |  |
| Android AAB release build produced |  | Not Started |  |  |
| iOS release archive produced |  | Not Started |  |  |
| Binary sanity test completed on physical devices |  | Not Started |  |  |

Gate rule: release candidates available for beta channels.

## Gate 6: Beta Rollout (Required)

| Item | Owner | Status | Due Date | Evidence |
|---|---|---|---|---|
| Google Play Internal Testing rollout completed |  | Not Started |  |  |
| TestFlight external testing group live |  | Not Started |  |  |
| Minimum tester count reached (target: 10+) |  | Not Started |  |  |
| Beta bug triage completed and P0/P1 fixed |  | Not Started |  |  |
| Release candidate sign-off by product + engineering |  | Not Started |  |  |

Gate rule: no open P0 issues, no unresolved blocker risk.

## Gate 7: Submission and Go-Live (Required)

| Item | Owner | Status | Due Date | Evidence |
|---|---|---|---|---|
| Submit Android production release |  | Not Started |  |  |
| Submit iOS production release |  | Not Started |  |  |
| Final go-live checklist run completed |  | Not Started |  |  |
| Post-release monitoring window staffed (first 48 hours) |  | Not Started |  |  |
| Rollback/mitigation plan confirmed |  | Not Started |  |  |

Gate rule: all rows Done.

## Weekly Operating Cadence
- Monday: choose top 5 launch blockers.
- Tuesday to Thursday: implement and verify fixes.
- Friday: full regression across must-work flows.
- Saturday: create release candidate build.
- Sunday: beta feedback triage and next-week plan.

## Go/No-Go Decision Template
- Decision date: __________________
- Decision owner: __________________
- Go or No-Go: __________________
- Open risks: __________________
- Mitigations: __________________
- Next review date: __________________

## Must-Work Flow Test Log

| Flow | Android | iOS | Result | Tester | Evidence |
|---|---|---|---|---|---|
| Login |  |  |  |  |  |
| Home |  |  |  |  |  |
| Search |  |  |  |  |  |
| Stock Detail |  |  |  |  |  |
| Full Analysis |  |  |  |  |  |
| AI Chat |  |  |  |  |  |

## Launch KPI Targets
- Crash-free sessions: >= 99.5%
- P95 app startup time: <= 3.0s
- API success rate on must-work flows: >= 99.0%
- Full Analysis success rate: >= 98.0%
- AI fallback UX success (no blocking): 100%

## Notes
- Keep this file updated daily during launch sprint.
- Every Done item must include evidence.
