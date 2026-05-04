# Complete Mobile Deployment Checklist

## Pre-Deployment Checklist

### Backend Setup ✅

- [ ] Backend deployed to Render/Railway/Fly.io
- [ ] Backend URL noted: `https://your-api-url.onrender.com`
- [ ] API keys configured (Alpha Vantage, IEX, etc.)
- [ ] CORS headers configured in backend
- [ ] Database (if used) is set up and migrated
- [ ] Error logging configured
- [ ] Rate limiting configured

### Mobile App Preparation

#### Code & Configuration

- [ ] Backend URL updated in `.env`
- [ ] App version updated in `app.json`
- [ ] All features tested in production mode
- [ ] TypeScript errors resolved: `npx tsc --noEmit`
- [ ] No console errors or warnings
- [ ] Offline mode tested (if applicable)
- [ ] All API calls working with production backend
- [ ] Performance tested on real device (not just simulator)

#### App Metadata

- [ ] App name finalized: "Stock Valuation"
- [ ] App description written (80 characters for iOS, 4000 for Android)
- [ ] Privacy policy created and hosted
- [ ] Terms of service created and hosted
- [ ] Company/developer name decided

#### Visual Assets

- [ ] App icon (1024x1024) created
- [ ] Icon is production-ready (not placeholder)
- [ ] Screenshots taken (minimum 4 per platform):
  - [ ] Home screen
  - [ ] Stock details
  - [ ] Market analysis
  - [ ] Watchlist
- [ ] Screenshots have proper dimensions:
  - [ ] iOS: 1242x2688 px (iPhone Pro Max)
  - [ ] Android: 1440x2560 px (9:16 ratio)
- [ ] Feature graphic for Android: 1024x500 px
- [ ] App preview video (optional but recommended)

#### Legal & Compliance

- [ ] Privacy policy completes all disclosures:
  - [ ] Data collection (location, stocks watched, etc.)
  - [ ] Data usage (market analysis, recommendations)
  - [ ] No personal data stored permanently
  - [ ] No third-party analytics tracking (or disclosed)
- [ ] Terms of service created
- [ ] Content rating form completed
- [ ] Target audience appropriate (18+)

### iOS App Store Specific

#### Account Setup

- [ ] Apple Developer account created
- [ ] Developer Program enrollment complete
- [ ] Developer certificates created
- [ ] Bundle identifier reserved: `com.yourname.stockvaluation`

#### App Store Connect

- [ ] App created in App Store Connect
- [ ] App information filled in completely
- [ ] Pricing set to Free
- [ ] Availability selected (worldwide or specific countries)
- [ ] Category: Finance
- [ ] Content rating completed

#### Build & Testing

- [ ] Xcode build successful: `eas build --platform ios`
- [ ] TestFlight beta testing completed
- [ ] Build tested on:
  - [ ] iPhone 14/15 (minimum)
  - [ ] iPad (if supporting)
- [ ] All features working on iOS
- [ ] No iOS-specific bugs

#### Submission Readiness

- [ ] All TestFlight feedback addressed
- [ ] App review guidelines complied with
- [ ] Screenshot sizes correct for all devices
- [ ] Promo code generated (if offering)
- [ ] Review information provided (if app needs special access)

### Android Google Play Specific

#### Account Setup

- [ ] Google Play Developer account created
- [ ] Developer account fee paid ($25)
- [ ] Keystore file created and backed up
- [ ] Keystore password saved securely

#### Play Console

- [ ] App created in Google Play Console
- [ ] Package name: `com.yourname.stockvaluation`
- [ ] App signing key configured
- [ ] App category: Finance

#### Build & Testing

- [ ] AAB build successful: `eas build --platform android`
- [ ] Internal testing track populated
- [ ] 2-3 beta testers provided feedback
- [ ] All feedback addressed
- [ ] App tested on:
  - [ ] Android 9 minimum
  - [ ] Android 14 (latest)
  - [ ] Different screen sizes (phone + tablet if supporting)
- [ ] All features working on Android
- [ ] No Android-specific bugs

#### Submission Readiness

- [ ] Store listing complete
- [ ] Graphics guidelines followed
- [ ] Content rating submitted
- [ ] Data safety form completed
- [ ] Privacy policy linked
- [ ] Contact email for support provided

---

## Deployment Order

### Step 1: Backend (Do First! ⚠️)

If not already done:

```bash
# Push backend to Render/Railway/Fly.io
# Test it's working: curl https://your-api.onrender.com/docs
```

### Step 2: iOS App Store (Recommended First)

Why: iOS review takes 24-48 hours, can do Android while waiting

```bash
# 1. Update app.json with iOS bundle ID
# 2. Build with EAS
eas build --platform ios

# 3. Set up in App Store Connect
# 4. Submit beta to TestFlight first
# 5. Do 24hr beta testing
# 6. Submit for App Store review
```

**Expected timeline: 1 week** (2-3 days build/setup + 24hr beta + 24-48hr review)

### Step 3: Google Play (While iOS in Review)

```bash
# 1. Create keystore (if first time)
# 2. Update app.json with Android package name
# 3. Build with EAS
eas build --platform android

# 4. Set up in Play Console
# 5. Do internal testing (24hr minimum)
# 6. Submit for review
```

**Expected timeline: 3-5 days** (similar to iOS, but Google reviews faster)

---

## Testing Checklist (Before Each Store Submission)

### Core Features

- [ ] Splash screen displays correctly
- [ ] Home screen loads (0-3 seconds)
- [ ] API calls to backend work
- [ ] Stock search returns results
- [ ] Market analysis loads
- [ ] Watchlist saves (persists after app close)
- [ ] Settings accessible
- [ ] Settings persist across sessions

### Edge Cases

- [ ] App handles no internet gracefully
- [ ] App recovers from API timeout
- [ ] Large watchlist (100+ stocks) doesn't crash
- [ ] Rapid screen switching doesn't crash
- [ ] App memory usage reasonable (< 200MB)
- [ ] No console errors on production build

### Performance

- [ ] First load time < 3 seconds
- [ ] Market data update < 1 second
- [ ] Stock search < 500ms
- [ ] Scrolling smooth (no janky animations)
- [ ] App doesn't force close

### UI/UX

- [ ] All text readable (not too small)
- [ ] All buttons clickable (min 44x44 touch target)
- [ ] No broken images or placeholders
- [ ] Correct fonts/colors match design
- [ ] Dark mode works (if supported)
- [ ] Landscape orientation works (if supported)

---

## Post-Deployment Tasks

### After Both Apps Live

- [ ] Create social media posts announcing launch
- [ ] Send launch email to beta testers
- [ ] Submit app to product launch sites (ProductHunt, etc.)
- [ ] Update website with app store links
- [ ] Monitor user reviews on both stores
- [ ] Set up crash reporting (Sentry)
- [ ] Monitor API performance (backend logs)

### Regular Maintenance

- [ ] Weekly: Check crash reports
- [ ] Weekly: Monitor user reviews
- [ ] Monthly: Update dependencies
- [ ] Monthly: Review analytics
- [ ] Quarterly: Plan new features based on feedback

---

## Help & Troubleshooting

### Build Issues

```bash
# Clear cache if build fails
npm cache clean --force
npm install

# Rebuild from scratch
eas build --platform ios --clear-cache
eas build --platform android --clear-cache
```

### Submission Rejected?

Common reasons & fixes:

- **"App crashes on launch"** → Check logs in TestFlight/Internal Testing
- **"Privacy policy missing"** → Add privacy policy URL in metadata
- **"API key invalid"** → Verify backend is working, check CORS
- **"Screenshots don't match app"** → Update screenshots to reflect current UI

### After Approval

- [ ] Submit 1-star fix immediately if critical bug found
- [ ] Plan next feature release (v1.1)
- [ ] Schedule quarterly updates
- [ ] Request user reviews after 1 week

---

## Important Links

- **iOS**: <https://appstoreconnect.apple.com>
- **Android**: <https://play.google.com/console>
- **Expo Build**: <https://docs.expo.dev/eas-update/introduction/>
- **EAS Submit**: <https://docs.expo.dev/submit/introduction/>

---

## Quick Reference: Commands

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Build both
eas build --platform all

# Submit to app stores
eas submit --platform all

# Check build status
eas build:list

# View logs
eas build:view
```

---

**Status**: Ready for deployment ✅

When you're ready to deploy, start with [DEPLOY_TO_RENDER.sh](DEPLOY_TO_RENDER.sh) for backend, then follow [DEPLOY_TO_APP_STORE.sh](DEPLOY_TO_APP_STORE.sh) and [DEPLOY_TO_PLAY_STORE.sh](DEPLOY_TO_PLAY_STORE.sh) for mobile apps.
