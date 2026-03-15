# 🚀 PHASE 2: RENDER BACKEND DEPLOYMENT

**Why Render?**

- ✅ Easiest alternative to Railway
- ✅ Identical GitHub auto-deploy workflow  
- ✅ Free tier actually works (doesn't spin down)
- ✅ 3-5 minute deployment
- ✅ Same Docker setup works perfectly

**Your GitHub Status:** ✅ Complete  
**Next Step:** Deploy FastAPI backend to Render  
**Estimated Time:** 10-15 minutes (5 min setup + 3-5 min deployment)

---

## Step 1: Create Render Account

### 1.1 Go to Render

Open: **<https://render.com>**

### 1.2 Click "Get Started"

Look for big blue button on homepage

### 1.3 Sign Up with GitHub

1. Click **"Sign up with GitHub"**
2. GitHub will ask permission
3. Click **"Authorize RenderDeploy"** (one-time)
4. You're now in Render dashboard ✅

---

## Step 2: Create New Web Service

### 2.1 Look for Dashboard

After signing in, you'll see Render dashboard with option to create service.

### 2.2 Click "New +"

Top right of dashboard:

```
[ New + ]
```

### 2.3 Select "Web Service"

```
├─ Web Service      <- Click this
├─ Static Site
├─ PostgreSQL
└─ Redis
```

---

## Step 3: Connect Your Repository

### 3.1 Select Your GitHub Repo

Render will show your GitHub repositories.

Find: **`stock-valuation-app`**

Click on it to select it.

**If you don't see it:**

- Click "Connect account"
- Grant Render access to more repos

### 3.2 Enter Service Details

Render will show a form:

```
Name:                 stock-api
Environment:          Docker
Branch:               main
Root Directory:       (leave blank)
```

**Keep these settings:**

- **Name:** `stock-api` (or anything, Render generates URL)
- **Environment:** Docker (auto-detected)
- **Branch:** main ✅
- **Build Command:** (leave blank - Dockerfile detected)
- **Start Command:** (leave blank - Dockerfile detected)

### 3.3 Scroll Down - Set Plan

```
Plan: Free
```

Select **Free** tier (generous for testing)

### 3.4 Click "Create Web Service"

Render will:

1. Read your Dockerfile ✅
2. Build Docker image (1-2 min) ⏳
3. Start container (<1 min) ⏳
4. Assign URL (instant) ✅

---

## Step 4: Monitor Deployment

### 4.1 Watch Build Progress

You'll see deployment logs streaming:

```
=== Building stock-api ===

Step 1/X : FROM python:3.9
Step 2/X : WORKDIR /app
...
Successfully built...

=== Starting Service ===
Uvicorn running on 0.0.0.0:8000
```

### 4.2 What's Happening

**Build Phase (1-2 min):**

- Pulls Python base image
- Installs requirements.txt
- Builds Docker image

**Start Phase (<1 min):**

- Container starts
- Port 8000 exposed
- SSL cert created
- URL assigned

⏳ **Total: 3-5 minutes**

---

## Step 5: Get Your Backend URL

### 5.1 Look for Service URL

After deployment completes (status shows green checkmark ✅):

At the top of the page, you'll see:

```
🟢 Live
https://stock-api-xyz.onrender.com
```

**Your URL format:** `https://stock-api-[random].onrender.com`

### 5.2 Copy Your URL

Click the URL to copy it:

```
https://stock-api-xyz.onrender.com
```

**📝 SAVE THIS URL** - You'll need it for Phase 3!

---

## Step 6: Test Your Backend

### 6.1 Test API Endpoint

In your terminal, test if backend is working:

```bash
curl https://[YOUR_RENDER_URL]/docs

# Replace [YOUR_RENDER_URL] with your actual URL
# Example: curl https://stock-api-xyz.onrender.com/docs
```

**Expected output:** HTML page (Swagger API documentation)

### 6.2 Test More Endpoints

**Health check:**

```bash
curl https://[YOUR_RENDER_URL]/health
```

**Smart strategy:**

```bash
curl https://[YOUR_RENDER_URL]/smart-strategy | head -50
```

**Real-time price:**

```bash
curl https://[YOUR_RENDER_URL]/realtime/price/latest/AAPL
```

All should return JSON data ✅

### 6.3 Test WebSocket (Optional)

If you have `wscat` installed:

```bash
npm install -g wscat

# Test WebSocket
wscat -c wss://[YOUR_RENDER_URL]/realtime/ws/price/AAPL

# Should see price updates every 5 seconds
```

---

## Step 7: Verify Everything Works

### 7.1 Check Dashboard Status

In Render dashboard:

- Status should show: **🟢 Live**
- No error messages in logs
- Uptime counter started

### 7.2 View Logs Anytime

In Render, click **"Logs"** tab to see:

- Application output
- Any errors
- Performance metrics

### 7.3 Auto-Deploy Enabled

Every time you push to GitHub:

```bash
git push origin main
```

Render automatically:

1. Detects new code
2. Rebuilds Docker image
3. Deploys new version
4. No downtime! ✅

---

## 🎁 What You Get with Render

✅ Live FastAPI backend on internet  
✅ 24/7 uptime (with free tier)  
✅ Auto-restart if crash  
✅ SSL/HTTPS automatic  
✅ Auto-deploy on git push  
✅ Performance monitoring  
✅ Generous free tier  

---

## ⚠️ Important Notes

**Free Tier Limits:**

- No auto-spin down (stays running!)
- 750 free compute hours/month (plenty)
- 100GB data transfer/month
- Good for development & small apps

**When to Upgrade:**

- Heavy production traffic
- Need dedicated resources
- Want priority support

For now, **Free tier is perfect!** ✅

---

## 📋 Phase 2 Checklist

Before moving to Phase 3:

- [ ] Render account created
- [ ] GitHub authorized with Render
- [ ] Repository connected
- [ ] Deployment completed (3-5 min)
- [ ] Backend URL obtained
- [ ] Health check endpoint working
- [ ] Smart strategy endpoint working
- [ ] Real-time price endpoint working

---

## 📝 Your Backend URL (Save This!)

```
BACKEND_URL: https://[YOUR_RENDER_URL]

Examples:
- API Docs: https://[YOUR_RENDER_URL]/docs
- Health: https://[YOUR_RENDER_URL]/health
- Smart Strategy: https://[YOUR_RENDER_URL]/smart-strategy
- Real-time: wss://[YOUR_RENDER_URL]/realtime/ws/price/AAPL
```

---

## 🔧 If Something Goes Wrong

### Deployment fails?

1. Click **"Logs"** tab in Render
2. Look for error messages
3. Common issues:
   - Dockerfile syntax error
   - Missing dependencies in requirements.txt
   - Port not set correctly

### Can't connect to backend?

1. Check URL is correct (copy from Render dashboard)
2. Check HTTP vs HTTPS (must be HTTPS)
3. Verify status shows 🟢 Live
4. Check CORS if frontend can't reach backend

### Want to see detailed logs?

```
Render Dashboard → Your Service → Logs tab
```

---

## 🎯 Next Steps

1. **Go to <https://render.com>**
2. **Sign up with GitHub**
3. **Create Web Service** (select your repo)
4. **Wait 3-5 minutes** for deployment
5. **Copy your URL**
6. **Test with curl** (verify working)
7. **Come back with your URL** ✅

Then we'll proceed to **Phase 3: Vercel Frontend Deployment**

---

## 📞 Help Resources

**Render Dashboard:** <https://dashboard.render.com>  
**Render Docs:** <https://render.com/docs>  
**GitHub Deploys:** <https://render.com/docs/deploy-from-github>  

---

**Time Elapsed: 10-15 minutes**  
**Backend Status: Ready to Deploy**  
**Next: Phase 3 - Frontend Deployment to Vercel**

Ready? Go to <https://render.com> now! 🚀
