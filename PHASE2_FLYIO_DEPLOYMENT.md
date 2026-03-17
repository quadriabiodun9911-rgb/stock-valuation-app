# 🚀 PHASE 2: FLY.IO BACKEND DEPLOYMENT

**Why Fly.io?**

- ✅ Genuinely free tier (3 shared VMs included!)
- ✅ Modern, blazing fast infrastructure
- ✅ Doesn't spin down services
- ✅ Global deployment (runs in multiple regions)
- ✅ Same Docker setup works perfectly
- ✅ Best free tier among all platforms
- ✅ Pay-as-you-go when you scale

**Your GitHub Status:** ✅ Complete  
**Next Step:** Deploy FastAPI backend to Fly.io  
**Estimated Time:** 15-20 minutes (including CLI install)

---

## Step 1: Install Flyctl CLI

Fly.io uses a command-line tool called `flyctl` to deploy.

### 1.1 Install on macOS

Open terminal and run:

```bash
curl -L https://fly.io/install.sh | sh
```

This downloads and installs flyctl (~50MB).

### 1.2 Verify Installation

After installation completes:

```bash
flyctl version

# Should output: Fly CLI v0.x.x
```

### 1.3 Authenticate

```bash
flyctl auth login
```

This opens browser to log in. You can:

- Create new Fly.io account (free)
- Or log in if you have one

---

## Step 2: Navigate to Your Project

In terminal, go to your project root:

```bash
cd "/Users/abiodunquadri/kivy/new work foler /stock-valuation-app"
```

---

## Step 3: Launch Your App on Fly.io

### 3.1 Run Launch Command

```bash
flyctl launch
```

This is the magic command that sets everything up!

### 3.2 Answer the Prompts

The CLI will ask questions:

```
? App Name: [your-app-name]
? Select Organization: personal (Free tier)
? Select Region: (choose nearest to you)
? Would you like to set up a Postgres database? No
? Would you like to set up an upstash redis cache? No
? Would you like to deploy now? Yes
```

**Recommended answers:**

```
App Name:        stock-api
Organization:    personal
Region:          Choose closest (e.g., iad = DC, pdx = Portland)
Postgres:        No (skip for now)
Redis:           No (skip for now)
Deploy Now:      Yes (deploy immediately)
```

### 3.3 Watch Deployment

After you say "Yes" to deploy, Fly.io will:

1. **Build Docker image** (1-2 min)
2. **Push to Fly registry** (<1 min)
3. **Start containers** (<1 min)
4. **Assign URL** (instant)

You'll see output like:

```
=== Building image with Docker ===
...
=== Pushing image to Fly ===
...
=== Creating app ===
=== Allocating IP address ===
=== Launching app ===
Monitoring Deployment...

 ✓ Machine started successfully
 
App 'stock-api' is now available at https://stock-api-abc123.fly.dev
```

**Total deployment: 3-5 minutes** ⏳

---

## Step 4: Get Your Backend URL

After successful deployment, you'll see:

```
https://stock-api-[random].fly.dev
```

This is your production backend URL!

**📝 SAVE THIS URL** - You need it for:

- Testing backend
- Phase 3 (Vercel frontend)

---

## Step 5: Test Your Backend

### 5.1 Test API Endpoint

In terminal:

```bash
curl https://stock-api-[YOUR_ID].fly.dev/docs

# Replace [YOUR_ID] with your actual ID
```

**Expected output:** HTML page (Swagger API documentation)

### 5.2 Test More Endpoints

**Health check:**

```bash
curl https://stock-api-[YOUR_ID].fly.dev/health
```

**Smart strategy:**

```bash
curl https://stock-api-[YOUR_ID].fly.dev/smart-strategy | head -50
```

**Real-time price:**

```bash
curl https://stock-api-[YOUR_ID].fly.dev/realtime/price/latest/AAPL
```

All should return data ✅

### 5.3 Test WebSocket (Optional)

```bash
npm install -g wscat

wscat -c wss://stock-api-[YOUR_ID].fly.dev/realtime/ws/price/AAPL

# Should see price updates every 5 seconds
```

---

## 🎁 What You Get with Fly.io

✅ Live FastAPI backend  
✅ Public HTTPS URL  
✅ WebSocket streaming working  
✅ All 19 API endpoints active  
✅ Global deployment (multiple regions!)  
✅ Auto-restart on crash  
✅ Auto-scale to handle traffic  
✅ Generous free tier (3 shared VMs)  

---

## 💰 Pricing

**Free Tier (Perfect for testing):**

- 3 shared-cpu-1x 256MB VMs
- Unlimited requests
- Generous bandwidth
- No credit card needed
- Stays running 24/7

**Paid Tier (When you scale):**

- Dedicated VMs: $3/month each
- Full isolation
- Better performance
- Priority support

---

## 🔧 Useful Fly.io Commands

After deployment, you can manage your app:

### View Logs

```bash
flyctl logs
```

### Check Status

```bash
flyctl status
```

### Restart App

```bash
flyctl restart
```

### Scale Machines

```bash
flyctl scale count 2  # Run 2 instances
```

### SSH into Machine

```bash
flyctl ssh console
```

---

## 🔄 Auto-Deploy with GitHub

Fly.io doesn't auto-deploy like Render/Railway, but you can manually redeploy:

### Deploy New Changes

After pushing to GitHub:

```bash
git push origin main
flyctl deploy
```

Or set up GitHub Actions for auto-deploy (advanced).

---

## ⚠️ Important Notes

### First Deployment

- Takes 5-10 minutes (pulling base images)
- Normal and expected!

### Subsequent Deployments

- Takes 2-3 minutes (images cached)
- Much faster!

### Free Tier Limits

- 3 shared VMs included
- 3 GB storage per app
- No forced auto-scaling
- Excellent for development!

### When to Upgrade

- When you need dedicated resources
- More than 3 concurrent machines
- Priority support

---

## 📋 Phase 2 Checklist

Before moving to Phase 3:

- [ ] Installed flyctl CLI
- [ ] Ran `flyctl auth login` (authenticated)
- [ ] Navigated to project directory
- [ ] Ran `flyctl launch` (deployment started)
- [ ] Answered deployment questions
- [ ] Selected "Yes" to deploy now
- [ ] Watched deployment complete (3-5 min)
- [ ] Got your Fly.io URL
- [ ] Tested with curl /docs endpoint
- [ ] Confirmed backend is working

---

## 📝 Your Backend URL (Save This!)

```
BACKEND_URL: https://stock-api-[YOUR_ID].fly.dev

Examples:
- API Docs: https://stock-api-[YOUR_ID].fly.dev/docs
- Health: https://stock-api-[YOUR_ID].fly.dev/health
- Smart Strategy: https://stock-api-[YOUR_ID].fly.dev/smart-strategy
- Real-time: wss://stock-api-[YOUR_ID].fly.dev/realtime/ws/price/AAPL
```

---

## 🆘 Troubleshooting

### Issue: `flyctl` command not found

**Fix:**

```bash
# Reinstall
curl -L https://fly.io/install.sh | sh

# Or add to PATH
export PATH="$HOME/.fly/bin:$PATH"
```

### Issue: Deployment fails

**Check logs:**

```bash
flyctl logs
```

Look for error messages. Common issues:

- Dockerfile syntax error
- Missing requirements.txt
- Port not 8000

### Issue: Can't log in

**Fix:**

```bash
flyctl auth logout
flyctl auth login
# Open browser link that appears
```

### Issue: Deployment times out

**Wait longer:** First deployment can take 10+ minutes pulling images. Be patient!

### Issue: App starts but returns errors

**Check logs:**

```bash
flyctl logs --follow  # Watch logs in real-time
```

---

## 📞 Fly.io Resources

**Fly.io Dashboard:** <https://fly.io/dashboard>  
**Flyctl Docs:** <https://fly.io/docs/flyctl/>  
**Python Deployment:** <https://fly.io/docs/languages-and-frameworks/python/>  
**Getting Started:** <https://fly.io/docs/getting-started/>  

---

## ✨ Quick Summary

### 5-Step Setup (15 minutes)

1. **Install flyctl:**

   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Authenticate:**

   ```bash
   flyctl auth login
   ```

3. **Navigate to project:**

   ```bash
   cd "/Users/abiodunquadri/kivy/new work foler /stock-valuation-app"
   ```

4. **Launch app:**

   ```bash
   flyctl launch
   # Answer questions, say Yes to deploy
   ```

5. **Wait 3-5 minutes for deployment** ⏳

**You're done!** Backend is now live on Fly.io 🚀

---

## 🎯 Next Steps

1. **Install flyctl and authenticate**
2. **Run `flyctl launch` in your project**
3. **Wait for deployment to complete**
4. **Get your Fly.io URL**
5. **Test with curl**
6. **Come back with your URL**

Then we'll proceed to **Phase 3: Vercel Frontend Deployment**

---

**Ready? Start here:**

```bash
# Step 1: Install
curl -L https://fly.io/install.sh | sh

# Step 2: Login
flyctl auth login

# Step 3: Deploy
cd "/Users/abiodunquadri/kivy/new work foler /stock-valuation-app"
flyctl launch
```

Let me know when you see your Fly.io URL! 🚀
