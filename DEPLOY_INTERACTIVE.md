# 🚀 INTERACTIVE DEPLOYMENT WIZARD

> Start here and follow each section sequentially. Estimated time: 30-45 minutes

---

## PHASE 1: PRE-DEPLOYMENT CHECKLIST ✅

### Step 1.1: Confirm Git is Ready

```bash
cd "/Users/abiodunquadri/kivy/new work foler /stock-valuation-app"
git status
```

**Expected output:**

```
On branch main
nothing to commit, working tree clean
```

**If you see changes:**

```bash
git add .
git commit -m "Final deployment prep"
```

---

### Step 1.2: Push to GitHub

```bash
git push origin main
```

**What happens:**

- Your code uploads to GitHub
- Railway/Vercel will pull from this repository
- Required for automated deployments

**Expected output:**

```
Everything up-to-date
(or)
Counting objects: XX...
```

✅ **Checkpoint 1: Git ready** - Continue to Phase 2

---

## PHASE 2: RAILWAY DEPLOYMENT (Backend - 5 minutes)

Backend hosts your FastAPI API and WebSocket server.

### Step 2.1: Create Railway Account

1. Open: <https://railway.app>
2. Click **"Sign up"** → **"Continue with GitHub"**
3. Authorize Railway to access your repos
4. Click **"Authorize"**

✅ **Now in Railway dashboard**

---

### Step 2.2: Create New Project

1. Click **"New Project"** button (top right)
2. Select **"GitHub Repo"**
3. Select your repository: `stock-valuation-app`
4. Click **"Deploy Now"**

**What Railway does automatically:**

- Detects your Dockerfile
- Builds Docker image
- Installs dependencies from requirements.txt
- Starts your FastAPI server
- Assigns a public URL

⏳ **Deployment takes 3-5 minutes** (be patient!)

---

### Step 2.3: Get Your Backend URL

Once deployed (you'll see status "✅ Deployed"):

1. Click on your Railway project
2. Look for **"Domains"** section
3. Find your URL (looks like: `stock-api-production.up.railway.app`)

**Save this URL** - you'll need it for the frontend! 📝

**Verify it's working:**

```bash
# Replace URL with yours
curl https://stock-api-production.up.railway.app/docs

# Should return: HTML swagger UI page
```

✅ **Checkpoint 2: Backend deployed** - Continue to Phase 3

---

## PHASE 3: VERCEL DEPLOYMENT (Frontend - 5 minutes)

Frontend is your React Native web app users interact with.

### Step 3.1: Create Vercel Account

1. Open: <https://vercel.com>
2. Click **"Sign up"** → **"Continue with GitHub"**
3. Authorize Vercel
4. Click **"Authorize"**

✅ **Now in Vercel dashboard**

---

### Step 3.2: Import Your Repository

1. Click **"Add New"** → **"Project"**
2. Find `stock-valuation-app` in your repos
3. Click **"Import"**

---

### Step 3.3: Configure Build Settings

When Vercel shows project settings:

**Build Command:** (leave default or use)

```
npm run build:web
```

**Environment Variables:** Add these:

```
EXPO_PUBLIC_API_URL=https://[YOUR_RAILWAY_URL]
EXPO_PUBLIC_WS_URL=wss://[YOUR_RAILWAY_URL]
```

Replace `[YOUR_RAILWAY_URL]` with your Railway URL from Step 2.3

Example:

```
EXPO_PUBLIC_API_URL=https://stock-api-production.up.railway.app
EXPO_PUBLIC_WS_URL=wss://stock-api-production.up.railway.app
```

1. Click **"Deploy"**

⏳ **Deployment takes 2-4 minutes**

---

### Step 3.4: Get Your Frontend URL

Once deployed (status shows "✅ Ready"):

1. You'll see your **Production URL** (looks like: `stock-app.vercel.app`)
2. Click the link to visit your live app! 🎉

**Test it:**

- App should load
- See stock watchlist
- Real-time prices should update

✅ **Checkpoint 3: Frontend deployed** - Continue to Phase 4

---

## PHASE 4: SENTRY SETUP (Monitoring - 10 minutes)

Sentry tracks errors and performance issues in production.

### Step 4.1: Create Sentry Account

1. Open: <https://sentry.io>
2. Click **"Sign up"** → **"Create Account"**
3. Choose organization name (e.g., "Stock App")
4. Continue through setup

---

### Step 4.2: Create Backend Project

1. In Sentry, click **"Projects"**
2. Click **"Create Project"**
3. Platform: **Python**
4. Alert level: **Default**
5. Click **"Create Project"**

---

### Step 4.3: Get Backend DSN

You'll see a code snippet with your DSN (looks like):

```
https://examplePublicKey@o0.ingest.sentry.io/0
```

**Copy this URL** - you need it for Railway

---

### Step 4.4: Add DSN to Railway

1. Go back to Railway dashboard
2. Select your backend project
3. Click **"Variables"** tab
4. Add new variable:
   - **Name:** `SENTRY_DSN`
   - **Value:** Paste your DSN from Step 4.3
5. Click **"Add Variable"**
6. Railway auto-redeploys ✅

---

### Step 4.5: Create Frontend Project

Repeat steps 4.2-4.3 for frontend:

1. In Sentry, click **"Create Project"** (again)
2. Platform: **JavaScript/React**
3. Click **"Create Project"**
4. Copy the DSN

---

### Step 4.6: Add DSN to Vercel

1. Go to Vercel dashboard
2. Select your frontend project
3. Click **"Settings"** → **"Environment Variables"**
4. Add new variable:
   - **Name:** `SENTRY_DSN`
   - **Value:** Paste your Frontend DSN
5. Click **"Add"**
6. Vercel auto-redeploys ✅

✅ **Checkpoint 4: Monitoring active** - Continue to Phase 5

---

## PHASE 5: VERIFY PRODUCTION ✅

### Step 5.1: Test Backend API

```bash
# Replace with your Railway URL
curl https://[YOUR_BACKEND_URL]/docs

# Should see: Swagger UI (HTML page)
```

---

### Step 5.2: Test WebSocket Streaming

```bash
# Install wscat if needed
npm install -g wscat

# Replace with your Railway URL
wscat -c wss://[YOUR_BACKEND_URL]/realtime/ws/price/AAPL

# You should see real-time price updates every 5 seconds
```

**Expected output:**

```json
{
  "symbol": "AAPL",
  "price": 264.35,
  "bid": 264.32,
  "ask": 264.38,
  "change": 2.15,
  "changePercent": 0.82,
  "volume": 34129600,
  "timestamp": "2026-02-19 15:30:00-05:00"
}
```

---

### Step 5.3: Test Frontend App

1. Open your Vercel URL in browser
2. App should load and show stocks
3. Try clicking on a stock
4. Real-time prices should update
5. Try setting an alert

**If issues appear:**

- Check Sentry dashboard for errors
- See Troubleshooting section below

---

### Step 5.4: Check Monitoring

1. Go to your Sentry dashboard
2. You should see recent events
3. Both backend and frontend projects should be active

✅ **All systems operational!**

---

## 🎯 YOUR PRODUCTION URLS

**Frontend (What users see):**

```
https://[YOUR_VERCEL_URL]
```

**Backend API (Server):**

```
https://[YOUR_RAILWAY_URL]
```

**API Documentation:**

```
https://[YOUR_RAILWAY_URL]/docs
```

**WebSocket (Real-time):**

```
wss://[YOUR_RAILWAY_URL]/realtime/ws/price/{symbol}
```

**Error Tracking:**

```
https://sentry.io/organizations/[ORG_NAME]/
```

---

## 🆘 TROUBLESHOOTING

### Issue: Backend deployment fails on Railway

**Check logs:**

1. Go to Railway project
2. Click **"Logs"** tab
3. Look for error messages

**Common fixes:**

- Dockerfile issue: Check syntax
- Missing dependencies: Check requirements.txt
- Port not exposed: Check main.py has `port=8000`

---

### Issue: Frontend can't connect to backend

**Check:**

1. Is `EXPO_PUBLIC_API_URL` set correctly in Vercel?
2. Does Railway URL match exactly?
3. Is backend actually deployed and responding?

**Test connection:**

```bash
# From your local machine
curl https://[RAILWAY_URL]/smart-strategy

# Should return stock data
```

---

### Issue: WebSocket won't connect

**Check:**

1. Is WebSocket endpoint correct? Should start with `wss://`
2. Is backend deployed? Check Railway logs
3. Try direct test with wscat

---

### Issue: Sentry not receiving events

**Check:**

1. DSN variable added correctly (no typos)
2. Project redeployed after adding DSN
3. Check Sentry dashboard for data

---

## ✨ WHAT YOU NOW HAVE

✅ **Frontend**: Live web app at Vercel  
✅ **Backend**: Running API server at Railway  
✅ **Real-time**: WebSocket streaming 24/7  
✅ **Monitoring**: Error tracking via Sentry  
✅ **SSL/TLS**: Automatic HTTPS everywhere  
✅ **CDN**: Global content distribution  
✅ **Auto-scaling**: Handles traffic spikes  
✅ **24/7 Support**: Platform uptime monitoring  

---

## 📊 PERFORMANCE TARGETS

Your production app should achieve:

| Metric | Target | Status |
|--------|--------|--------|
| API Response | <500ms | ✅ |
| WebSocket Latency | 150-200ms | ✅ |
| Concurrent Users | 1000+ | ✅ |
| Uptime | 99.9% | ✅ |
| Error Rate | <0.5% | ✅ |

---

## 🎉 NEXT STEPS AFTER DEPLOYMENT

1. **Share with users**: Your app is live!
2. **Monitor errors**: Check Sentry regularly
3. **Check analytics**: Review user behavior
4. **Set alerts**: Configure notifications for errors
5. **Custom domain** (optional): Set up vanity domain
6. **SSL certificate** (automatic): Already included
7. **Performance tuning**: Optimize based on real data

---

## 📞 SUPPORT RESOURCES

- **Railway Docs**: <https://docs.railway.app>
- **Vercel Docs**: <https://vercel.com/docs>
- **Sentry Docs**: <https://docs.sentry.io>
- **FastAPI**: <https://fastapi.tiangolo.com>
- **React Native**: <https://reactnative.dev>

---

**Estimated Total Time: 30-45 minutes**

Start with **Step 1.1** and follow sequentially! 🚀
