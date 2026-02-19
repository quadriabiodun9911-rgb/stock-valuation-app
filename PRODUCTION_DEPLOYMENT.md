# Production Deployment Guide

## Overview

Deploy your stock valuation app with real-time features to production across two platforms:

- **Backend**: Railway.app (FastAPI + WebSocket)
- **Frontend**: Vercel (Next.js/React Native Web)

This guide covers full production setup with monitoring and error tracking.

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│        Vercel (Production Frontend)             │
│  - React Native Web App                         │
│  - Auto-deployed from GitHub                    │
│  - CDN for static assets                        │
│  - Environment: PROD_API_URL                    │
└────────────┬────────────────────────────────────┘
             │ HTTPS
             │
┌────────────▼────────────────────────────────────┐
│        Railway (Production Backend)              │
│  - FastAPI + Uvicorn                            │
│  - WebSocket Support                            │
│  - Auto-restart on crash                        │
│  - PostgreSQL (optional)                        │
│  - Redis for caching (optional)                 │
└────────────┬────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────┐
│         External Services                        │
│  - yfinance (Stock data)                        │
│  - Sentry (Error tracking)                      │
│  - LogRocket (Session replay)                   │
│  - Datadog (Monitoring)                         │
└─────────────────────────────────────────────────┘
```

## Prerequisites

1. **GitHub Account**: Required for Railway/Vercel deployment
2. **Railway Account**: <https://railway.app> (free tier included)
3. **Vercel Account**: <https://vercel.com> (free tier included)
4. **Sentry Account**: <https://sentry.io> (error tracking)
5. **GitHub Repository**: Push code to GitHub first

## Step 1: Push Code to GitHub

```bash
cd "/Users/abiodunquadri/kivy/new work foler /stock-valuation-app"

# Initialize git (if not already done)
git init
git add .
git commit -m "Ready for production deployment with real-time features"

# Add GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/stock-valuation-app.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy Backend to Railway

### 2.1 Create Railway Account

1. Go to <https://railway.app>
2. Sign in with GitHub
3. Create a new project

### 2.2 Configure Backend for Railway

**1. Create railway.json** (already exists in your project)

```json
{
  "build": {
    "builder": "dockerfile"
  },
  "deploy": {
    "restartPolicyMaxRetries": 5,
    "restartPolicyWindowMs": 60000
  }
}
```

**2. Update Dockerfile** (if needed)

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "$PORT"]
```

**3. Set Environment Variables**

In Railway dashboard → Project Settings → Variables:

```
DATABASE_URL=postgresql://...  # Optional
REDIS_URL=redis://...           # Optional
SENTRY_DSN=https://...          # Error tracking
ENVIRONMENT=production
```

### 2.3 Deploy from GitHub

1. In Railway dashboard: "New" → "GitHub Repo"
2. Select your repository
3. Select the `stock-valuation-app` directory
4. Click "Deploy"

Railway will:

- Build Docker image
- Run Dockerfile
- Start FastAPI server
- Assign production URL (e.g., `https://stock-api.railway.app`)

### 2.4 Verify Deployment

```bash
# Get your Railway URL from dashboard
PROD_URL="https://stock-api.railway.app"

# Test API
curl "${PROD_URL}/docs"

# Test WebSocket (from your local machine)
wscat -c wss://${PROD_URL}/realtime/ws/price/AAPL

# Test real-time endpoints
curl "${PROD_URL}/realtime/streams/active"
curl "${PROD_URL}/realtime/price/latest/AAPL"
```

## Step 3: Deploy Frontend to Vercel

### 3.1 Prepare Mobile App for Web

Your React Native app needs a web build configuration:

**1. Install Vercel CLI**

```bash
npm install -g vercel
```

**2. Create .env.production**

In `stock-valuation-app/mobile/`:

```
EXPO_PUBLIC_API_URL=https://stock-api.railway.app
NODE_ENV=production
REACT_APP_API_BASE=https://stock-api.railway.app
```

**3. Ensure Expo Web Build**

```bash
cd stock-valuation-app/mobile
npx expo export:web
```

### 3.2 Deploy to Vercel

```bash
cd stock-valuation-app/mobile

# Option A: Using Vercel CLI
vercel --prod

# Option B: Using GitHub Integration
# 1. Connect GitHub repo in vercel.com dashboard
# 2. Vercel will auto-deploy on push to main
```

### 3.3 Configure Vercel Settings

**Build Settings:**

```
Framework: Create React App (or Expo)
Build Command: npm run build
Output Directory: dist (for Expo web) or build
```

**Environment Variables:**

```
EXPO_PUBLIC_API_URL=https://stock-api.railway.app
VITE_API_URL=https://stock-api.railway.app
```

**Advanced:**

- Enable "Automatic HTTPS"
- Set Regions: US + EU for better latency
- Enable "Edge Caching"

### 3.4 Verify Frontend

```bash
# Get Vercel URL from deployment
VERCEL_URL="https://stock-app.vercel.app"

# Test frontend
curl "${VERCEL_URL}"

# Test API integration
curl "${VERCEL_URL}/api/health"  # If you have health endpoint
```

## Step 4: Setup Error Tracking (Sentry)

### 4.1 Create Sentry Project

1. Go to <https://sentry.io>
2. Create new Organization
3. Create project for Python (Backend)
4. Create project for JavaScript (Frontend)

### 4.2 Integrate Backend Sentry

**In backend/main.py:**

```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1,
    environment="production"
)
```

**Add to backend requirements.txt:**

```
sentry-sdk>=1.40.0
```

### 4.3 Integrate Frontend Sentry

**In mobile/src/App.tsx:**

```typescript
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: "production",
  tracesSampleRate: 0.1,
});

export const App = Sentry.wrap((_props) => {
  return <YourAppComponent />;
});
```

**Add to mobile package.json:**

```json
"dependencies": {
  "@sentry/react-native": "^5.0.0"
}
```

### 4.4 Set Sentry DSN

In Railway → Variables:

```
SENTRY_DSN=https://[key]@[host].ingest.sentry.io/[projectid]
```

In Vercel → Environment Variables:

```
REACT_APP_SENTRY_DSN=https://[key]@[host].ingest.sentry.io/[projectid]
```

## Step 5: Domain & SSL Setup

### 5.1 Connect Custom Domain

**For Railway Backend:**

1. In Railway dashboard → Settings → Domains
2. Add custom domain: `api.yourdomain.com`
3. Update DNS CNAME to Railway's endpoint

**For Vercel Frontend:**

1. In Vercel dashboard → Settings → Domains
2. Add custom domain: `app.yourdomain.com`
3. Follow DNS setup instructions

### 5.2 Update API URLs

After domain setup, update environment variables:

**Backend (Railway):**

```
API_URL=https://api.yourdomain.com
```

**Frontend (Vercel):**

```
EXPO_PUBLIC_API_URL=https://api.yourdomain.com
```

## Step 6: Monitoring & Logging

### 6.1 Backend Monitoring

**Add Datadog Integration (Optional):**

```bash
# Install Datadog agent in Railway
pip install datadog
```

**Monitor Metrics:**

- Request latency (p50, p95, p99)
- WebSocket connection count
- Price update frequency
- Alert trigger rate
- Error rate

### 6.2 Frontend Monitoring

**Add LogRocket (Optional):**

```typescript
import LogRocket from "logrocket";

LogRocket.init("app/token");
LogRocket.getSessionURL((sessionURL) => {
  console.log("Session URL:", sessionURL);
});
```

### 6.3 Alerting

Set up alerts for:

- Backend error rate > 1%
- WebSocket disconnections > 5% of connections
- API latency p95 > 1000ms
- Frontend JavaScript errors

## Step 7: Continuous Deployment

### 7.1 GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          npm install -g @railway/cli
          railway deploy --service backend
      
      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: |
          npx vercel deploy --prod \
            --token ${{ secrets.VERCEL_TOKEN }}
```

### 7.2 Enable Branch Previews

Both Railway and Vercel support automatic preview deployments:

1. Create PR to your repository
2. Railway/Vercel automatically deploy to preview URL
3. Test changes before merging to main

## Step 8: Production Checklist

Before going live, verify:

### Backend

- [ ] WebSocket endpoint is accessible: `wss://api.yourdomain.com/realtime/ws/price/{symbol}`
- [ ] CORS is properly configured for frontend domain
- [ ] Database (if using) is backed up
- [ ] Environment variables are set
- [ ] Sentry error tracking is active
- [ ] Rate limiting is configured (optional)
- [ ] Health check endpoint works

### Frontend

- [ ] API_URL environment variable points to production
- [ ] Sentry DSN is configured
- [ ] Service worker is enabled for offline support
- [ ] All real-time components import correct services
- [ ] Production build completes without errors
- [ ] Mobile app connects to production backend

### Infrastructure

- [ ] DNS is properly configured
- [ ] SSL/HTTPS is enabled
- [ ] CORS headers are correct
- [ ] WebSocket timeout is appropriate (30+ minutes)
- [ ] Rate limiting is in place
- [ ] Logging is configured
- [ ] Monitoring/alerting is active

## Step 9: Post-Deployment Monitoring

### First Week

1. Monitor error rate (should be < 1%)
2. Check WebSocket stability (should be > 99% uptime)
3. Review user feedback
4. Monitor database performance (if applicable)
5. Check frontend performance metrics

### Performance Targets

- API response time: < 200ms (p95)
- WebSocket latency: < 500ms (p95)
- Frontend load time: < 3s
- Error rate: < 0.5%
- Uptime: > 99.5%

### Monthly Maintenance

- Review error logs from Sentry
- Update dependencies
- Analyze user behavior
- Optimize slow endpoints
- Test disaster recovery

## Rollback Procedure

If issues occur after deployment:

**Railway Backend:**

```bash
railway logs -f  # Check logs
railway down     # Stop deployment
# Fix issue locally
git push         # Redeploy
```

**Vercel Frontend:**

```bash
vercel rollback  # Rollback to previous version
# Or redeploy: vercel --prod
```

## Cost Estimation

**Monthly costs (estimated):**

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Railway Backend | 5 GB RAM/500GB bandwidth | $5-50 |
| Vercel Frontend | Unlimited deployments | $0-20 |
| Sentry Error Tracking | 10k events/month | $0-50 |
| Custom Domain | (separate) | $10-15 |
| Database (if needed) | N/A | $10-50 |
| **Total (minimal)** | **Free** | **~$50-100** |

## Troubleshooting

### WebSocket Connection Fails in Production

**Solution:**

1. Check WebSocket is enabled on proxy (Railway has it enabled by default)
2. Verify SSL certificate (should be auto-managed by Railway/Vercel)
3. Test with: `curl -i -N -H "Connection: Upgrade" https://api.yourdomain.com/realtime/ws/price/AAPL`

### API CORS Errors

**Solution:**

```python
# In main.py, update CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.yourdomain.com", "https://app.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### High Latency

**Solution:**

1. Enable CDN caching for static assets
2. Optimize database queries
3. Reduce price update frequency
4. Add Redis caching layer

### Memory Leaks

**Solution:**

1. Monitor WebSocket connection count
2. Implement connection timeout
3. Use Railway's memory monitoring
4. Restart service daily (if needed)

## Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Deploy frontend to Vercel
3. ✅ Setup error tracking with Sentry
4. ✅ Configure custom domain
5. 🚀 Announce production launch
6. 📊 Monitor metrics and optimize
7. 🔄 Enable CI/CD for future updates

## Support Resources

- Railway Docs: <https://docs.railway.app>
- Vercel Docs: <https://vercel.com/docs>
- FastAPI Deployment: <https://fastapi.tiangolo.com/deployment>
- WebSocket Best Practices: <https://developer.mozilla.org/en-US/docs/Web/API/WebSocket>

---

**Questions?** Check your deployment platform's documentation or contact support.
