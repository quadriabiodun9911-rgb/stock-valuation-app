# 🚀 RENDER DEPLOYMENT - LIVE GUIDE

Your Project: <https://dashboard.render.com/project/prj-d4ranochg0os73anq6i0>

---

## ✅ STEP 1: You're in Render Dashboard

You should see a dashboard with your project. Now you need to create a **Web Service** to deploy your backend.

---

## 📋 STEP 2: Create Web Service

### Look for "New +" Button

In your Render dashboard:

- Top right corner
- Click **"New +"** button

You'll see options:

```
├─ Web Service      <- CLICK THIS
├─ Static Site
├─ PostgreSQL
└─ Redis
```

---

## 🔗 STEP 3: Connect Your GitHub Repository

### 3.1 Select "Web Service"

After clicking "New +", you'll see a form.

### 3.2 Choose Deployment Method

```
[ ] Public GitHub repo URL
[ ] GitHub        <- SELECT THIS (auto-deploy on push)
[ ] GitLab
[ ] Bitbucket
```

Click **"GitHub"**

### 3.3 Grant GitHub Permission

If you haven't authorized Render yet:

1. Click "Connect account"
2. GitHub will ask permission
3. Click "Authorize" (one-time)
4. You're back in Render

### 3.4 Select Your Repository

Render shows your repos. Find and click:

```
stock-valuation-app
```

---

## ⚙️ STEP 4: Configure Deployment Settings

After selecting repository, you'll see a form with fields:

### 4.1 Basic Settings

```
Name:                    stock-api
Environment:             Docker (auto-detected ✓)
Region:                  (choose nearest to you)
Branch:                  main ✓
```

Keep these defaults - Render auto-detects your Dockerfile!

### 4.2 Build & Start Commands

```
Build Command:           (leave blank)
Start Command:           (leave blank)
```

✅ Leave blank! Your Dockerfile has these.

### 4.3 Environment Variables (Optional for now)

- Skip for now
- We'll add SENTRY_DSN later in Phase 4

### 4.4 Plan Selection

```
[ ] Pro ($19/mo)
[X] Free <- SELECT THIS
```

Choose **Free** tier

---

## 🚀 STEP 5: Create & Deploy

### 5.1 Click "Create Web Service"

Bottom of form, big blue button.

Render will:

1. Start building Docker image
2. Show live logs streaming
3. Deploy your backend
4. Assign public URL

### 5.2 Watch Deployment Logs

You'll see output like:

```
=== Building Docker image ===
Step 1/X : FROM python:3.9
...
Successfully built image

=== Starting service ===
Uvicorn server running on 0.0.0.0:8000
```

**Total time: 3-5 minutes** ⏳

### 5.3 Wait for "Live" Status

Once deployment completes, you'll see:

```
🟢 Live
https://stock-api-[random].onrender.com
```

Green checkmark = Ready! ✅

---

## 📝 STEP 6: Get Your Backend URL

After deployment shows **🟢 Live**:

### 6.1 Find Your URL

At the top of the service page:

```
https://stock-api-[something].onrender.com
```

### 6.2 Copy This URL

Click to copy or select and copy manually.

**📝 SAVE THIS!** You need it for:

- Testing backend
- Phase 3 (Vercel frontend)

---

## 🧪 STEP 7: Test Your Backend

Open terminal and test:

```bash
# Replace with your actual Render URL
curl https://stock-api-[YOUR_ID].onrender.com/docs

# Should return: HTML page (Swagger UI)
```

### Other Tests

**Health check:**

```bash
curl https://stock-api-[YOUR_ID].onrender.com/health
```

**Smart strategy:**

```bash
curl https://stock-api-[YOUR_ID].onrender.com/smart-strategy | head -50
```

**Real-time price:**

```bash
curl https://stock-api-[YOUR_ID].onrender.com/realtime/price/latest/AAPL
```

All should return data ✅

---

## 📊 WHAT'S HAPPENING IN RENDER

### Build Phase (1-2 min)

1. Render pulls your `main` branch from GitHub
2. Reads Dockerfile
3. Downloads Python 3.9 base image
4. Runs: `pip install -r requirements.txt`
5. Builds Docker image (~1-2 GB)

### Start Phase (<1 min)

1. Container starts
2. Runs: `python main.py`
3. FastAPI starts on port 8000
4. SSL certificate created
5. Public URL assigned

### Live Phase (Instant)

1. Backend accessible on internet
2. Auto-restart if crashes
3. Ready for requests

---

## 🎯 QUICK CHECKLIST

As you're deploying:

- [ ] Clicked "New +" in Render dashboard
- [ ] Selected "Web Service"
- [ ] Selected "GitHub" (with authorization)
- [ ] Selected `stock-valuation-app` repo
- [ ] Name: `stock-api`
- [ ] Environment: Docker (auto)
- [ ] Branch: main
- [ ] Plan: Free
- [ ] Clicked "Create Web Service"
- [ ] Watching deployment logs (3-5 min)
- [ ] Status changed to 🟢 Live
- [ ] Copied your Render URL
- [ ] Tested with curl /docs endpoint

---

## ❓ COMMON ISSUES & FIXES

### Issue: Build fails

**Check logs:**

1. Click "Logs" tab
2. Look for error messages
3. Common causes:
   - Dockerfile syntax error
   - Missing file: requirements.txt
   - Python version mismatch

**Fix:**

- Check Dockerfile in your repo
- Verify requirements.txt exists
- Check branch is "main"

### Issue: Deployment hangs

**Wait longer:**

- First deployment: 5-10 min (pulling images)
- Subsequent: 2-3 min (cached images)
- Very normal, be patient!

### Issue: Status stays "Deploying"

**Check:**

1. Are logs still scrolling? (Still building)
2. Any errors in logs? (Click "Logs" tab)
3. Out of memory? (Unlikely on Free tier)
4. Stuck for >15 min? Restart service

### Issue: Can't connect to URL

**Verify:**

1. Status shows 🟢 Live (not yellow/red)
2. URL is HTTPS, not HTTP
3. Wait 1 min after "Live" status
4. Try: `curl -v https://[URL]/health`

### Issue: WebSocket won't connect

**Check:**

1. URL starts with `wss://` (not `ws://`)
2. Backend is running (check Logs)
3. Try: `wscat -c wss://[URL]/realtime/ws/price/AAPL`

---

## 📞 RENDER SUPPORT

**Dashboard:** <https://dashboard.render.com>  
**Logs location:** Click service → "Logs" tab  
**Docs:** <https://render.com/docs>  

---

## 🎁 AFTER DEPLOYMENT

Once you have your Render URL:

1. **Tell me your URL**
   - Example: `https://stock-api-abc123.onrender.com`

2. **I'll create Phase 3 guide**
   - Frontend deployment to Vercel
   - Set up environment variables
   - Connect backend to frontend

3. **Then Phase 3: Vercel Frontend**
   - Similar to Render (GitHub auto-deploy)
   - React Native web app
   - ~10 minutes

---

## ✨ YOU'RE ALMOST THERE

```
✅ Phase 1: Git & GitHub - DONE
🔄 Phase 2: Render Backend - IN PROGRESS (You are here!)
⏳ Phase 3: Vercel Frontend - Coming next
⏳ Phase 4: Sentry Monitoring - After that
✅ Phase 5: Production Live! - Final
```

---

## 📝 YOUR RENDER DASHBOARD

**URL:** <https://dashboard.render.com/project/prj-d4ranochg0os73anq6i0>

**What you'll see:**

- Service name: `stock-api`
- Status: 🟢 Live (when ready)
- Region: Your chosen region
- Plan: Free
- Public URL: `https://stock-api-[ID].onrender.com`

---

**Ready? Go to your Render dashboard and create that Web Service!** 🚀

Tell me when:

1. Deployment completes (shows 🟢 Live)
2. You've copied your URL
3. You've tested with curl

Then I'll help you with Phase 3! 🎉
