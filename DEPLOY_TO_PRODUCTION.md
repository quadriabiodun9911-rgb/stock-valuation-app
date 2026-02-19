# 🚀 PRODUCTION DEPLOYMENT GUIDE - Complete Instructions

**Status**: Ready for Deployment
**Date**: February 19, 2026
**Version**: 1.0.0 Production Ready

---

## 📋 Pre-Deployment Checklist

Before starting deployment:

- ✅ Code committed to Git (all changes saved)
- ✅ Backend tested locally on port 8000
- ✅ Mobile app tested locally on Expo
- ✅ Real-time WebSocket verified working
- ✅ AI analytics endpoints tested
- ✅ Documentation complete
- ✅ Environment variables documented
- ✅ Docker configuration ready

**Status**: ✅ ALL CHECKS PASSED - Ready to deploy

---

## 🎯 Deployment Overview

Your app will be deployed across two cloud platforms:

```
┌──────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                     │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  Mobile App (React Native Web)                               │
│  ├─ Platform: Vercel (vercel.com)                           │
│  ├─ URL: https://stock-app.vercel.app                       │
│  ├─ Auto-deploys from main branch                           │
│  └─ CDN global distribution                                 │
│                                                                │
│  Backend API (FastAPI)                                      │
│  ├─ Platform: Railway (railway.app)                        │
│  ├─ URL: https://stock-api.railway.app                    │
│  ├─ WebSocket: wss://stock-api.railway.app/realtime/...  │
│  ├─ Docker containerized                                   │
│  └─ Auto-restart on crash                                  │
│                                                                │
│  Monitoring                                                 │
│  ├─ Platform: Sentry (sentry.io)                          │
│  ├─ Error tracking enabled                                │
│  └─ Performance monitoring ready                          │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

---

## 📦 STEP 1: Verify GitHub Setup

### 1.1 Check Git Configuration

```bash
cd "/Users/abiodunquadri/kivy/new work foler /stock-valuation-app"

# Verify current branch
git branch -a

# Expected output: main (or master)
# with commits including "Add real-time features"
```

### 1.2 View Recent Commits

```bash
git log --oneline -5

# You should see:
# - Add project completion summary
# - Add real-time features: WebSocket streaming, alerts...
# - Previous commits
```

### 1.3 GitHub Repository Setup

**Option A: Using Existing Repository**
If you have a GitHub account with a repository:

```bash
# Remote should already be configured
git remote -v

# Should show:
# origin  https://github.com/YOUR_USERNAME/stock-valuation-app.git
```

**Option B: Create New Repository**
If you need to create a GitHub repo:

1. Go to <https://github.com/new>
2. Create repository named: `stock-valuation-app`
3. Add remote to your local repo:

```bash
git remote add origin https://github.com/YOUR_USERNAME/stock-valuation-app.git
git branch -M main
git push -u origin main
```

### 1.4 Push Code to GitHub

```bash
# Ensure all changes are committed
git add -A
git commit -m "Production deployment - Ready for Railway and Vercel"

# Push to GitHub
git push -u origin main
```

---

## 🔧 STEP 2: Deploy Backend to Railway

### 2.1 Create Railway Account

1. Visit <https://railway.app>
2. Sign in with GitHub
3. Authorize Railway access to your repositories

### 2.2 Create New Project in Railway

**Method 1: From GitHub (Recommended)**

1. Click "New Project" in Railway dashboard
2. Select "GitHub Repo"
3. Search for: `stock-valuation-app`
4. Click to connect
5. Select the repository
6. Railway auto-detects the Dockerfile

**Method 2: From CLI**

```bash
# Install Railway CLI (if needed)
npm install -g @railway/cli

# Or via Homebrew (macOS)
brew install railway

# Login to Railway
railway login

# Initialize project
cd "/Users/abiodunquadri/kivy/new work foler /stock-valuation-app"
railway init

# Deploy
railway deploy
```

### 2.3 Configure Environment Variables in Railway

In Railway Dashboard → Project Settings → Variables:

```
# Required variables
ENVIRONMENT=production
API_URL=https://stock-api.railway.app

# Optional: Premium data providers
ALPHA_VANTAGE_API_KEY=your_key_here
TWELVE_DATA_API_KEY=your_key_here

# Error tracking (setup later)
SENTRY_DSN=https://...@sentry.io/...
```

### 2.4 Railway Deployment Status

Railway will automatically:

- ✅ Build Docker image from Dockerfile
- ✅ Install Python dependencies
- ✅ Start FastAPI server on port 8000
- ✅ Assign public URL: `https://stock-api.railway.app`
- ✅ Enable auto-restart on crash
- ✅ Setup SSL/HTTPS automatically

**Expected deployment time**: 3-5 minutes

### 2.5 Verify Backend Deployment

After Railway shows "Success":

```bash
# Test API endpoint
curl https://stock-api.railway.app/docs

# Should return Swagger UI (HTML)

# Test real-time endpoint
curl https://stock-api.railway.app/realtime/streams/active

# Should return: {"active_streams":[],"count":0}

# Test WebSocket (requires wscat)
# npm install -g wscat
# wscat -c wss://stock-api.railway.app/realtime/ws/price/AAPL
```

---

## 🎨 STEP 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Account

1. Visit <https://vercel.com>
2. Sign up with GitHub
3. Authorize Vercel access to your repositories

### 3.2 Import Project to Vercel

**Method 1: Web Dashboard (Recommended)**

1. Login to Vercel Dashboard
2. Click "Add New" → "Project"
3. Select "Import Git Repository"
4. Search for: `stock-valuation-app`
5. Click "Import"

**Method 2: Vercel CLI**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project directory
cd "/Users/abiodunquadri/kivy/new work foler /stock-valuation-app/mobile"

# Interactive deployment
vercel

# Production deployment
vercel --prod
```

### 3.3 Configure Vercel Settings

In Vercel Project Settings:

**Build Configuration:**

```
Framework Preset: Create React App (or Next.js)
Build Command: npm run build:web (or npm run build)
Output Directory: .next (Next.js) or dist (CRA)
Install Command: npm install --legacy-peer-deps
```

**Environment Variables:**

```
EXPO_PUBLIC_API_URL=https://stock-api.railway.app
VITE_API_URL=https://stock-api.railway.app
NODE_ENV=production
REACT_APP_API_BASE=https://stock-api.railway.app
```

**Advanced:**

- Enable: Automatic HTTPS
- Regions: US East (default), EU (for global CDN)
- Enable: Edge Caching

### 3.4 Vercel Deployment Process

Vercel will:

- ✅ Build React Native web app
- ✅ Optimize assets for production
- ✅ Deploy to global CDN
- ✅ Assign public URL: `https://stock-app.vercel.app`
- ✅ Setup SSL/HTTPS (automatic)
- ✅ Enable auto-deployments from main branch

**Expected deployment time**: 2-4 minutes

### 3.5 Verify Frontend Deployment

After Vercel shows "Production" status:

```bash
# Test frontend
curl https://stock-app.vercel.app

# Should return HTML of the app

# Test API connection
# Open in browser: https://stock-app.vercel.app
# Check browser console for API calls
```

---

## 📊 STEP 4: Setup Error Tracking (Sentry)

### 4.1 Create Sentry Account

1. Visit <https://sentry.io>
2. Sign up (free tier available)
3. Create organization
4. Create two projects:
   - "stock-valuation-backend" (Python/FastAPI)
   - "stock-valuation-frontend" (JavaScript/React)

### 4.2 Get DSN Keys

For each project, Sentry provides a DSN (Data Source Name):

```
Format: https://[PUBLIC_KEY]@[HOST].ingest.sentry.io/[PROJECT_ID]

Example:
https://examplePublicKey@o0.ingest.sentry.io/1234567
```

### 4.3 Add to Environment Variables

**Railway (Backend):**

```
SENTRY_DSN=https://[YOUR_BACKEND_DSN]@o0.ingest.sentry.io/123456
```

**Vercel (Frontend):**

```
REACT_APP_SENTRY_DSN=https://[YOUR_FRONTEND_DSN]@o0.ingest.sentry.io/654321
```

### 4.4 Redeploy with Sentry

After adding DSN:

```bash
# Railway: Push changes (auto-deploys)
git push origin main

# Vercel: Automatic redeploy on Git push
# or manually: vercel --prod
```

---

## ✅ STEP 5: Post-Deployment Verification

### 5.1 Test Backend Endpoints

```bash
API_URL=https://stock-api.railway.app

# Test health check
curl $API_URL/docs

# Test real-time API
curl $API_URL/realtime/streams/active
curl $API_URL/realtime/price/latest/AAPL

# Test AI endpoints
curl $API_URL/api/ai/market-insights

# Test smart strategy
curl $API_URL/smart-strategy | head -50
```

### 5.2 Test Frontend

Open in browser:

```
https://stock-app.vercel.app
```

Check:

- ✅ Page loads without errors
- ✅ API calls connect to production backend
- ✅ Real-time price updates work
- ✅ No console errors
- ✅ Mobile responsive design works

### 5.3 Test WebSocket Connection

```bash
# Install wscat if needed
npm install -g wscat

# Test WebSocket
wscat -c wss://stock-api.railway.app/realtime/ws/price/AAPL

# You should see price updates every 5 seconds
# Type "ping" to test keepalive
```

### 5.4 Verify Error Tracking

**Backend:**

1. Trigger an error: `curl https://stock-api.railway.app/test-error`
2. Check Sentry dashboard for error report

**Frontend:**

1. Open DevTools (F12)
2. Trigger error: `throw new Error("test");`
3. Check Sentry dashboard

---

## 🌐 STEP 6: Setup Custom Domain (Optional)

### 6.1 Point Backend Domain

**For Railway:**

1. Go to Railway Settings → Domains
2. Add custom domain: `api.yourdomain.com`
3. Railway provides CNAME: `gateway.railway.app`
4. Add DNS record:

```
CNAME: api → gateway.railway.app
```

### 6.2 Point Frontend Domain

**For Vercel:**

1. Go to Vercel Settings → Domains
2. Add custom domain: `app.yourdomain.com`
3. Follow Vercel's DNS setup instructions
4. Typically add CNAME:

```
CNAME: app → cname.vercel-dns.com
```

### 6.3 Update API URLs

After domain setup, update environment variables:

**Railway:**

```
API_URL=https://api.yourdomain.com
```

**Vercel:**

```
EXPO_PUBLIC_API_URL=https://api.yourdomain.com
```

Then redeploy.

---

## 📈 STEP 7: Configure Monitoring & Alerts

### 7.1 Enable Railway Monitoring

In Railway Dashboard:

1. Project → Deployments
2. View logs in real-time
3. Monitor CPU/Memory usage
4. View error rate

### 7.2 Enable Vercel Analytics

In Vercel Dashboard:

1. Project → Analytics (Web Analytics)
2. View page views, bounce rate
3. Monitor performance metrics

### 7.3 Setup Sentry Alerts

In Sentry Dashboard:

1. Alerts → Create Alert Rule
2. Trigger on: Error rate > 1%
3. Notify: Email, Slack (if connected)

### 7.4 Performance Monitoring

Monitor these metrics:

| Metric | Target | Monitor |
|--------|--------|---------|
| API Response Time | <500ms | Railway logs |
| Error Rate | <1% | Sentry |
| Uptime | >99% | Railway/Vercel |
| WebSocket Connections | >100/min | App metrics |

---

## 🔐 Security Checklist

Before announcing production:

- ✅ CORS properly configured for frontend domain
- ✅ Environment variables not exposed in code
- ✅ API keys stored securely (Railway/Vercel env vars)
- ✅ HTTPS/SSL enabled (automatic on both platforms)
- ✅ Rate limiting configured (if needed)
- ✅ Error messages don't expose system details
- ✅ Database backups enabled (if using DB)
- ✅ Error tracking (Sentry) enabled

---

## 📝 Deployment Troubleshooting

### Issue: Build fails on Railway

**Solution:**

```bash
# Check logs
railway logs

# Common issues:
# - Missing dependencies in requirements.txt
# - Python version mismatch
# - Port not set to $PORT environment variable
```

### Issue: WebSocket fails in production

**Solution:**

```bash
# Verify WebSocket is enabled
wscat -c wss://stock-api.railway.app/realtime/ws/price/AAPL

# Check:
# - Railway supports WebSocket ✓
# - Proxy configured for WebSocket ✓
# - Port forwarding correct ✓
```

### Issue: CORS errors on frontend

**Solution:**

Update `main.py` CORS configuration:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://stock-app.vercel.app",
        "https://app.yourdomain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Then redeploy.

### Issue: High latency or errors

**Solution:**

1. Check Railway resources (CPU/Memory)
2. Scale up if needed: Railway Dashboard → Deploy → Scale
3. Check yfinance API rate limits
4. Review Sentry errors for patterns

---

## 🎉 Deployment Success Checklist

After deployment, verify:

- ✅ Backend API responds: `curl https://stock-api.railway.app/docs`
- ✅ Frontend loads: `https://stock-app.vercel.app`
- ✅ Real-time prices update
- ✅ Alerts work correctly
- ✅ No errors in Sentry dashboard
- ✅ Response times acceptable
- ✅ WebSocket stable
- ✅ Mobile app responsive
- ✅ Custom domain working (if configured)
- ✅ SSL/HTTPS working
- ✅ Monitoring dashboards active

---

## 📊 Production URLs

After successful deployment:

```
Frontend:
  https://stock-app.vercel.app
  (or https://app.yourdomain.com if custom domain)

Backend API:
  https://stock-api.railway.app
  (or https://api.yourdomain.com if custom domain)

API Documentation:
  https://stock-api.railway.app/docs

WebSocket Stream:
  wss://stock-api.railway.app/realtime/ws/price/{symbol}

Monitoring:
  Sentry: https://sentry.io/organizations/your-org
  Railway: https://railway.app/projects
  Vercel: https://vercel.com/projects
```

---

## 🚀 Next Steps

1. ✅ Complete all deployment steps above
2. ✅ Verify all production URLs working
3. ✅ Test with real user data
4. ✅ Monitor error tracking (first 24 hours critical)
5. ✅ Gather user feedback
6. ✅ Setup automated backups
7. ✅ Plan monitoring and scaling

---

## 📞 Support

### Documentation

- Real-Time Features: See REALTIME_FEATURES_GUIDE.md
- Architecture: See ARCHITECTURE.md
- Quick Start: See QUICK_START.md

### Deployment Platforms

- Railway: <https://docs.railway.app>
- Vercel: <https://vercel.com/docs>
- Sentry: <https://docs.sentry.io>

### Getting Help

- Check platform-specific documentation
- Review deployment logs
- Monitor error tracking dashboard
- Contact platform support if needed

---

**Status**: 🟢 **READY FOR PRODUCTION DEPLOYMENT**

**Estimated Time to Live**: 15-30 minutes

**Next Action**: Follow the step-by-step instructions above to deploy your app!

---

*Production Deployment Guide*
*Version 1.0.0*
*Generated: February 19, 2026*
