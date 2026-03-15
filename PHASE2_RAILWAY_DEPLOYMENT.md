# 🚀 PHASE 2: RAILWAY BACKEND DEPLOYMENT

**Your GitHub Status:** ✅ Complete  
**Next Step:** Deploy FastAPI backend to Railway  
**Estimated Time:** 10-15 minutes (5 min setup + 3-5 min deployment)

---

## Overview

Railway will automatically:

- Read your Dockerfile
- Build Docker image
- Install dependencies from requirements.txt
- Start your FastAPI server
- Assign a public URL (like: `stock-api-xyz.up.railway.app`)
- Enable auto-restart on crash
- Provide SSL/HTTPS automatically

---

## Step 1: Create Railway Account

### 1.1 Open Railway

Go to: **<https://railway.app>**

You'll see the Railway homepage with a big blue button.

### 1.2 Click "Sign up"

Look for **"Sign up"** button (top right or center)

### 1.3 Click "Continue with GitHub"

Railway will show GitHub authorization dialog:

```
The user "quadriabiodun9911-rgb" has authorized your app
```

Click **"Authorize"** to allow Railway to access your repositories

✅ **You're now in Railway Dashboard**

---

## Step 2: Create New Project

### 2.1 Look for "New Project" Button

In the Railway dashboard, click **"New Project"** (usually top right)

You'll see two options:

```
┌─────────────────────┐
│   Blank Project     │
├─────────────────────┤
│   GitHub Repo       │  <- Select this one
│   (auto-deploy)     │
└─────────────────────┘
```

### 2.2 Click "GitHub Repo"

Railway will show your GitHub repositories

### 2.3 Find Your Repository

Look for: **`stock-valuation-app`**

Click on it to select it.

If you don't see it:

- Scroll down
- Click "Search repos"
- Type: `stock-valuation-app`

### 2.4 Click "Deploy Now"

Railway will:

1. Read your Dockerfile ✅
2. Detect Python dependencies ✅
3. Build Docker image (takes 1-2 min)
4. Start container (takes 1-2 min)
5. Assign URL (takes <30 sec)

⏳ **Total deployment time: 3-5 minutes**

---

## Step 3: Monitor Deployment (Recommended)

While Railway deploys, you'll see a deployment status page:

### 3.1 Watch the Build Process

```
Status: Building...

├─ Fetching Dockerfile
├─ Building image  [████████████░░░░░░░░░░░░░░] 50%
├─ Installing dependencies
├─ Starting container...
│
└─ ✅ Deployment Complete!
```

### 3.2 What Railway Does

Each step automatically:

**Build Phase (1-2 min):**

- Pulls Python base image
- Copies Dockerfile
- Installs `requirements.txt` packages:
  - FastAPI
  - Uvicorn
  - Websockets
  - yfinance
  - NumPy, Pandas, etc.

**Start Phase (<1 min):**

- Executes: `python main.py`
- Detects port 8000
- Exposes to internet
- Creates SSL certificate

---

## Step 4: Get Your Backend URL

### 4.1 Look for "Domains" Section

After deployment completes, you'll see a section showing your URL:

```
📍 DOMAINS
├─ stock-api-xyz.up.railway.app (auto-generated)
├─ Copy URL
└─ Custom Domain (optional)
```

### 4.2 Copy Your Backend URL

Click the URL or copy button.

Your URL will look like:

```
https://stock-api-xyz.up.railway.app
```

(The xyz part is unique to your deployment)

**📝 SAVE THIS URL** - You'll need it in Phase 3 for the frontend!

### 4.3 Test Your Backend URL

In your terminal, test if backend is responding:

```bash
curl https://[YOUR_RAILWAY_URL]/docs

# Replace [YOUR_RAILWAY_URL] with your actual URL
# Example: curl https://stock-api-xyz.up.railway.app/docs
```

**Expected output:** HTML page (Swagger API documentation)

---

## Step 5: Verify Backend is Working

### 5.1 Test API Endpoints

Test the main endpoints:

**Test 1: Health Check**

```bash
curl https://[YOUR_RAILWAY_URL]/health

# Expected: {"status": "healthy"}
```

**Test 2: Smart Strategy (AI Analysis)**

```bash
curl https://[YOUR_RAILWAY_URL]/smart-strategy | head -100

# Expected: JSON with stock recommendations
```

**Test 3: Real-Time Price**

```bash
curl https://[YOUR_RAILWAY_URL]/realtime/price/latest/AAPL

# Expected: {"symbol": "AAPL", "price": 264.35, ...}
```

### 5.2 Check WebSocket (Optional Advanced Test)

If you have `wscat` installed:

```bash
npm install -g wscat

# Test WebSocket connection
wscat -c wss://[YOUR_RAILWAY_URL]/realtime/ws/price/AAPL

# You should see price updates every 5 seconds:
# {"symbol": "AAPL", "price": 264.35, ...}
```

---

## Step 6: Configure Environment Variables (Optional)

If you need to set environment variables (like `SENTRY_DSN` later):

### 6.1 Go to Project Settings

1. In Railway, click your project
2. Click **"Variables"** tab

### 6.2 Add Variables

```
Variable Name: ENVIRONMENT
Value: production

Variable Name: LOG_LEVEL
Value: info
```

1. Click **"Add Variable"**
2. Railway auto-redeploys ✅

---

## Step 7: Check Deployment Logs (If Issues)

If something went wrong:

### 7.1 View Logs

1. Click your Railway project
2. Click **"Logs"** tab
3. Look for error messages

### 7.2 Common Issues

**Issue: Port already in use**

```
ERROR: bind: address already in use
```

Fix: Railway will automatically pick a different port - check the URL

**Issue: Dependencies failed**

```
ERROR: pip install failed
```

Fix: Check requirements.txt has correct package names

**Issue: Main.py not found**

```
ERROR: cannot find main.py
```

Fix: Dockerfile should reference correct path

---

## ✅ Phase 2 Complete

When you see:

```
✅ Deployment Successful
URL: https://stock-api-xyz.up.railway.app
Status: Running
```

**You've completed Phase 2!**

---

## 📋 Phase 2 Checklist

Before moving to Phase 3:

- [ ] Railway account created
- [ ] GitHub authorized with Railway
- [ ] Repository connected
- [ ] Deployment completed (took 3-5 min)
- [ ] Backend URL obtained
- [ ] Health check endpoint working
- [ ] Smart strategy endpoint working
- [ ] Real-time price endpoint working

---

## 📝 Your Backend URL (Save This!)

```
BACKEND_URL: https://[YOUR_RAILWAY_URL]

Examples of what to expect:
- API Docs: https://[YOUR_RAILWAY_URL]/docs
- Health: https://[YOUR_RAILWAY_URL]/health
- Smart Strategy: https://[YOUR_RAILWAY_URL]/smart-strategy
- Real-time: wss://[YOUR_RAILWAY_URL]/realtime/ws/price/AAPL
```

---

## 🎯 Next Steps

1. **Note your Backend URL** - You need this for Phase 3
2. **Keep Railway tab open** - For reference during Phase 3
3. **When ready:** Proceed to **PHASE 3: Vercel Frontend Deployment**

---

## 📞 Help

**Railway Dashboard:** <https://railway.app>  
**Railway Logs:** Click project → Logs tab  
**Railway Docs:** <https://docs.railway.app>  

**Common Issues?**

- Backend not responding → Check Logs tab
- Dockerfile error → Verify Dockerfile syntax
- Port conflict → Railway auto-resolves, check URL

---

**Time Elapsed: 10-15 minutes**  
**Backend Status: ✅ DEPLOYED**  
**Next: Phase 3 - Frontend Deployment**

Ready? Continue when you have your Railway URL! 🚀
