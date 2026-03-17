# 🚀 Production Deployment Quick Start

## **5-Minute Backend Deployment (Render.com)**

### 1️⃣ **Prepare GitHub** (2 min)

```bash
# Initialize Git (if not done)
git init
git add .
git commit -m "Stock Valuation App - Ready for production"
git branch -M main
```

### 2️⃣ **Create GitHub Repo** (1 min)

1. Go to [github.com/new](https://github.com/new)
2. Create: `stock-valuation-app`
3. Push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/stock-valuation-app.git
git push -u origin main
```

### 3️⃣ **Deploy to Render** (2 min)

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click **"New +"** → **"Web Service"**
4. Select your GitHub repo
5. Configure:
   - **Name:** `stock-valuation-api`
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python main.py`
6. **Deploy!**

✅ **Your API is now live at:** `https://stock-valuation-api.onrender.com`

---

## **10-Minute Mobile Deployment (Expo)**

### 1️⃣ **Update API URL** (2 min)

```bash
cd mobile

# Local development
echo "EXPO_PUBLIC_APP_ENV=development" >> .env
echo "EXPO_PUBLIC_API_URL=http://localhost:8000" >> .env

# Production build (set in EAS or CI env vars)
# EXPO_PUBLIC_APP_ENV=production
# EXPO_PUBLIC_API_URL=https://stock-valuation-api.onrender.com
# EXPO_PUBLIC_SHOW_CONFIG_BANNER=false
```

### 1.5️⃣ **Set EAS Environment Variables** (2 min)

```bash
# Production
eas env:create --name EXPO_PUBLIC_APP_ENV --value production --scope project
eas env:create --name EXPO_PUBLIC_API_URL --value https://stock-valuation-api.onrender.com --scope project
eas env:create --name EXPO_PUBLIC_SHOW_CONFIG_BANNER --value false --scope project

# Optional preview QA (shows runtime config banner)
eas env:create --name EXPO_PUBLIC_APP_ENV --value staging --scope project --environment preview
eas env:create --name EXPO_PUBLIC_SHOW_CONFIG_BANNER --value true --scope project --environment preview
```

Use the startup banner only for internal QA/preview builds to verify environment and API endpoint quickly.

### 2️⃣ **Build for iOS** (5 min)

```bash
cd mobile
npm install -g eas-cli
eas login  # Use your Apple ID
eas build --platform ios --wait
```

✅ Download from `~/Downloads`

### 3️⃣ **Build for Android** (5 min)

```bash
eas build --platform android --wait
```

✅ Download from `~/Downloads`

---

## **App Store Submission**

### **iOS App Store** (3-7 days)

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Create App → Upload IPA
3. Fill details → Submit for review

### **Android Play Store** (2-4 hours)

1. Go to [play.google.com/console](https://play.google.com/console)
2. Create App → Upload AAB
3. Publish

---

## **⚡ Quick Reference**

| Action | Command | Time |
|--------|---------|------|
| Push to GitHub | `git push origin main` | 10s |
| Check Render logs | Visit Render dashboard | 5s |
| Test backend | `curl https://api.onrender.com/smart-strategy` | 5s |
| Rebuild mobile | `eas build --platform ios` | 5-10 min |
| Monitor app | Download from App/Play Store | 5 min |

---

## **🔗 Useful Links**

- Backend: `https://stock-valuation-api.onrender.com`
- Documentation: [PRODUCTION_DEPLOYMENT_2025.md](PRODUCTION_DEPLOYMENT_2025.md)
- Deployment script: `bash DEPLOY_TO_PRODUCTION.sh`

---

## **✅ Status**

- ✅ Backend ready
- ✅ Mobile ready
- ✅ All endpoints working
- ✅ Fully documented
- ⏳ Awaiting your deployment!

**Start with Step 1 above. You'll be live in minutes!** 🎉
