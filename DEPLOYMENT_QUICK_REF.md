# Quick Deployment Checklist

## ✅ Current Status

- [x] Local git repository initialized
- [x] All files committed: "Production deployment setup"
- [x] Backend Dockerfile ready
- [x] Railway.json configured
- [x] Requirements.txt verified
- [x] Vercel.json configured
- [x] Package.json has build:web script

## 🚀 Next Steps (Copy & Paste)

### 1. Create GitHub Repository

Visit: <https://github.com/new>

- Name: `stock-valuation-app`
- Make it public or private (your choice)
- DO NOT initialize with README/gitignore
- Copy the HTTPS URL

### 2. Add GitHub Remote & Push

```bash
cd "/Users/abiodunquadri/kivy/new work foler /stock-valuation-app"
git remote add origin https://github.com/YOUR_USERNAME/stock-valuation-app.git
git branch -M main
git push -u origin main
```

### 3. Deploy Backend to Railway

1. Go to <https://railway.app/dashboard>
2. Click "New Project" → "Deploy from GitHub"
3. Select your GitHub repository
4. Railway will auto-detect Dockerfile
5. Add environment variables if needed:
   - ALPHA_VANTAGE_API_KEY (optional)
   - TWELVE_DATA_API_KEY (optional)
6. Deploy and save the URL: `https://xxx.up.railway.app`

### 4. Deploy Frontend to Vercel

1. Go to <https://vercel.com/dashboard>
2. Click "Add New" → "Project"
3. Select "Import Git Repository"
4. Paste GitHub repository URL
5. Root Directory: `mobile`
6. Add environment variable:
   - EXPO_PUBLIC_API_URL = <https://xxx.up.railway.app>
7. Deploy

### 5. Test the Deployment

- Frontend: <https://your-project-name.vercel.app>
- Backend API: <https://xxx.up.railway.app/docs>
- Full test: Load frontend, check API connectivity

## 📱 Project URLs After Deployment

```
GitHub:  https://github.com/YOUR_USERNAME/stock-valuation-app
Railway: https://xxx.up.railway.app
Vercel:  https://your-project-name.vercel.app
```

## 📂 Key Deployment Files

```
backend/
  ├── Dockerfile
  ├── railway.json
  └── requirements.txt

mobile/
  ├── vercel.json
  ├── package.json (build:web script)
  └── src/services/api.ts (API configuration)
```

## ⚠️ Important Notes

- Replace `YOUR_USERNAME` with your GitHub username
- Replace `https://xxx.up.railway.app` with your actual Railway URL
- Railway takes 5-10 minutes to build and deploy
- Vercel takes 2-5 minutes to build and deploy
- After Railway deploy, update Vercel env variable and redeploy

## ✨ That's it

Your stock valuation app will be live at:

- **Backend:** `https://xxx.up.railway.app`
- **Frontend:** `https://your-project-name.vercel.app`
