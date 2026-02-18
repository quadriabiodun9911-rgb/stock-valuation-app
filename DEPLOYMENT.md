# 🚀 Stock Valuation App - Deployment Guide

## Project Status ✅

Your stock-valuation-app is now ready for deployment to GitHub, Railway, and Vercel!

### What's Been Done

- ✅ Git initialized locally in `/Users/abiodunquadri/kivy/new work foler /stock-valuation-app`
- ✅ All files committed with message: "Production deployment setup"
- ✅ Backend deployment files verified (Dockerfile, railway.json, requirements.txt)
- ✅ Frontend deployment files verified (vercel.json, package.json with build:web script)
- ✅ .gitignore configured to exclude node_modules, __pycache__, .env, etc.

---

## Step 1: Create GitHub Repository

Since no GitHub repository exists yet, you'll need to create one manually:

### Instructions

1. Go to [github.com/new](https://github.com/new)
2. Configure:
   - __Repository name:__ `stock-valuation-app`
   - __Description:__ Stock valuation analysis platform with FastAPI backend and React Native Expo mobile app
   - __Public/Private:__ Your choice
   - __Initialize with:__ None (we'll push existing code)
3. Click "Create repository"
4. Copy the repository URL (HTTPS or SSH)

### Push Local Code to GitHub

Run these commands in your terminal:

```bash
cd "/Users/abiodunquadri/kivy/new work foler /stock-valuation-app"

# Add GitHub as remote (replace YOUR_REPO_URL with your GitHub URL)
git remote add origin https://github.com/YOUR_USERNAME/stock-valuation-app.git

# Rename branch to main (if needed)
git branch -M main

# Push code to GitHub
git push -u origin main
```

After pushing, your repository URL will be:

- __HTTPS:__ `https://github.com/YOUR_USERNAME/stock-valuation-app.git`
- __SSH:__ `git@github.com:YOUR_USERNAME/stock-valuation-app.git`

---

## Step 2: Deploy Backend to Railway

### Prerequisites

- Railway account at [railway.app](https://railway.app)
- GitHub repository URL from Step 1

### Deployment Steps

1. __Connect to Railway:__
   - Go to [railway.app/dashboard](https://railway.app/dashboard)
   - Click "New Project" → "Deploy from GitHub"
   - Select your GitHub repository
   - Authorize Railway to access your GitHub account

2. __Configure Service:__
   - Select the repository branch (main)
   - Railway will automatically detect the `Dockerfile` in the backend folder
   - Click "Deploy"

3. __Set Environment Variables (if needed):__
   - In Railway dashboard, go to your project
   - Click the service that was created
   - Go to "Variables" tab
   - Add any API keys needed (e.g., Alpha Vantage, Twelve Data)
   - Example:

     ```
     ALPHA_VANTAGE_API_KEY=your_key_here
     TWELVE_DATA_API_KEY=your_key_here
     ```

4. __Get Backend URL:__
   - After deployment, Railway will generate a public URL
   - Format: `https://your-service-name.up.railway.app`
   - Save this URL for Vercel configuration

### Railway Configuration Files

- __Dockerfile__ - Located at: `/stock-valuation-app/backend/Dockerfile`
- __railway.json__ - Located at: `/stock-valuation-app/backend/railway.json`
- __requirements.txt__ - Located at: `/stock-valuation-app/backend/requirements.txt`

---

## Step 3: Deploy Frontend to Vercel

### Prerequisites

- Vercel account at [vercel.com](https://vercel.com)
- GitHub repository from Step 1
- Backend URL from Step 2

### Deployment Steps

1. __Connect to Vercel:__
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project" or "Add New..." → "Project"
   - Select "Import Git Repository"
   - Paste your GitHub repository URL
   - Select "Other" as framework

2. __Configure Build Settings:__
   - __Root Directory:__ Select `mobile` folder
   - __Build Command:__ `npm run build:web`
   - __Output Directory:__ `dist`
   - These are automatically detected from `vercel.json` in the mobile folder

3. __Environment Variables:__
   - Add environment variables for frontend:

     ```
     EXPO_PUBLIC_API_URL=https://your-railway-backend-url.up.railway.app
     ```

   - Replace with the actual Railway backend URL from Step 2

4. __Deploy:__
   - Click "Deploy"
   - Vercel will build and deploy automatically
   - Get your frontend URL: `https://your-project-name.vercel.app`

### Vercel Configuration Files

- __vercel.json__ - Located at: `/stock-valuation-app/mobile/vercel.json`
- __package.json__ - Located at: `/stock-valuation-app/mobile/package.json`
  - Contains script: `"build:web": "expo export --platform web"`

---

## Step 4: Connect Frontend to Backend

After both are deployed:

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your frontend project
3. Go to Settings → Environment Variables
4. Update `EXPO_PUBLIC_API_URL` with your Railway backend URL:

   ```
   EXPO_PUBLIC_API_URL=https://your-railway-backend-url.up.railway.app
   ```

5. Redeploy: Click "Deployments" → select latest → "Redeploy"

---

## Project Structure for Reference

```
stock-valuation-app/
├── backend/                    # FastAPI Backend
│   ├── main.py                 # API endpoints
│   ├── Dockerfile              # Container configuration
│   ├── railway.json            # Railway deployment config
│   ├── requirements.txt         # Python dependencies
│   ├── alpha_vantage_provider.py
│   ├── twelve_data_provider.py
│   └── smart_strategy_endpoint.py
│
├── mobile/                     # React Native Expo Frontend
│   ├── src/screens/            # UI screens
│   ├── src/services/           # API client (api.ts)
│   ├── vercel.json             # Vercel deployment config
│   ├── package.json            # Node dependencies
│   ├── app.json                # Expo configuration
│   └── dist/                   # Build output
│
└── .git/                       # Git repository
```

---

## Deployment URLs After Completion

Once deployed, you'll have:

| Service | Type | URL Pattern |
|---------|------|-----------|
| Backend | Railway | `https://your-service-name.up.railway.app` |
| Frontend | Vercel | `https://your-project-name.vercel.app` |
| Repository | GitHub | `https://github.com/YOUR_USERNAME/stock-valuation-app` |

---

## Key Files & Commands

### Local Development (Before Deployment)

```bash
# Backend
cd "/Users/abiodunquadri/kivy/new work foler /stock-valuation-app/backend"
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# Mobile (React Native)
cd "/Users/abiodunquadri/kivy/new work foler /stock-valuation-app/mobile"
npm install
npx expo start
```

### Git Commands

```bash
cd "/Users/abiodunquadri/kivy/new work foler /stock-valuation-app"

# View commit history
git log --oneline

# Make changes and commit
git add .
git commit -m "Your message"
git push origin main

# Pull latest changes
git pull origin main
```

---

## Troubleshooting

### Backend Issues

- __Port conflicts:__ Check `railway.json` port configuration
- __Dependencies:__ Ensure `requirements.txt` has all required packages
- __API keys:__ Verify environment variables in Railway dashboard

### Frontend Issues

- __Build errors:__ Check `package.json` for `build:web` script
- __API connection:__ Verify `EXPO_PUBLIC_API_URL` environment variable
- __Deployment timeout:__ Increase Vercel timeout in project settings

### Git Issues

- __Push rejected:__ Run `git pull origin main` first
- __Branch mismatch:__ Ensure you're on `main` branch with `git branch`

---

## Next Steps

1. ✅ Create GitHub repository at github.com/new
2. ✅ Push code: `git push -u origin main`
3. ✅ Deploy backend to Railway (copy Backend URL)
4. ✅ Deploy frontend to Vercel (set EXPO_PUBLIC_API_URL)
5. ✅ Test the application

Your deployment infrastructure is ready! 🎉
