# Stock Valuation App - Complete Deployment Guide 2025

## Quick Summary

Deploy a **FastAPI backend** + **React Native mobile app**. Two deployment paths based on your needs.

---

## Part 1: Backend Deployment

### Option A: Cloud Deployment (Recommended for Production)

#### 1. **Render.com** (Easiest - Free tier available)

```bash
# 1. Create account at render.com
# 2. Push your backend to GitHub
# 3. In Render dashboard: New → Web Service
#    - Repository: your GitHub repo
#    - Build command: pip install -r backend/requirements.txt
#    - Start command: cd backend && python main.py
#    - Environment variables:
#      - PORT=8000
#      - Any API keys (Alpha Vantage, etc.)

# 4. Deploy! Get your URL: https://your-app.onrender.com
```

#### 2. **Railway.app** (Simple & fast)

```bash
# 1. Railway login via GitHub
# 2. New Project → GitHub Repo
# 3. Auto-detects FastAPI - configure:
#    - Root directory: backend
#    - Start command: python main.py
# 4. Set environment variables in dashboard
# 5. Deploy automatic on every push
```

#### 3. **Fly.io** (Most control)

```bash
# 1. Install Fly CLI: brew install flyctl
# 2. Create Dockerfile in backend:
#    - See example below
# 3. flyctl auth login
# 4. flyctl launch --name stock-valuation-api
# 5. flyctl deploy
```

**Fly.io Dockerfile Example:**

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["python", "main.py"]
```

#### 4. **AWS/Google Cloud** (Enterprise)

- EC2/Compute Engine instance + Docker
- More complex setup, but powerful scaling

---

### Option B: Local/Self-Hosted

#### VPS Deployment (DigitalOcean, Linode, Vultr)

```bash
# 1. SSH into server
ssh root@your-server-ip

# 2. Install dependencies
apt update && apt install -y python3.11 python3-pip git nginx

# 3. Clone your repo
git clone https://github.com/yourusername/stock-valuation-app.git
cd stock-valuation-app/backend

# 4. Create virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 5. Start with Gunicorn (production WSGI)
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 main:app

# 6. Use systemd for auto-restart
# Create /etc/systemd/system/stock-api.service:
[Unit]
Description=Stock Valuation API
After=network.target

[Service]
User=root
WorkingDirectory=/root/stock-valuation-app/backend
Environment="PATH=/root/stock-valuation-app/backend/venv/bin"
ExecStart=/root/stock-valuation-app/backend/venv/bin/gunicorn -w 4 -b 0.0.0.0:8000 main:app
Restart=always

[Install]
WantedBy=multi-user.target

# Enable and start:
systemctl enable stock-api
systemctl start stock-api
systemctl status stock-api
```

#### Nginx Reverse Proxy (Optional but Recommended)

```nginx
# /etc/nginx/sites-available/stock-api
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Enable and restart Nginx:
ln -s /etc/nginx/sites-available/stock-api /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## Part 2: Database Setup (Optional but Recommended)

### If you need persistent storage

#### PostgreSQL (Production)

```bash
# On your server:
apt install postgresql postgresql-contrib

# Create database and user:
sudo -u postgres psql

CREATE DATABASE stock_valuation;
CREATE USER app_user WITH PASSWORD 'your-secure-password';
ALTER ROLE app_user SET client_encoding TO 'utf8';
ALTER ROLE app_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE app_user SET default_transaction_deferrable TO on;
ALTER ROLE app_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE stock_valuation TO app_user;
```

#### Connect from FastAPI

```python
# In backend/main.py
from sqlalchemy import create_engine
DATABASE_URL = "postgresql://app_user:password@localhost/stock_valuation"
engine = create_engine(DATABASE_URL)
```

---

## Part 3: Mobile App Deployment

### iOS (Apple App Store)

#### Prerequisites

- Apple Developer account ($99/year)
- Mac with Xcode
- TestFlight for beta testing

#### Steps

```bash
# 1. Update app.json version
{
  "expo": {
    "version": "1.0.0"
  }
}

# 2. Build iOS production app
cd mobile
eas build --platform ios

# 3. Submit to App Store
# Use Xcode or Transporter app with .ipa file

# OR use Expo's managed publishing:
eas submit --platform ios
```

### Android (Google Play Store)

#### Prerequisites

- Google Play Developer account ($25 one-time)
- Keystore file for signing

#### Steps

```bash
# 1. Generate keystore (first time only)
cd mobile
keytool -genkey -v -keystore my-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias my-key-alias

# 2. Update app.json version
{
  "expo": {
    "version": "1.0.0"
  }
}

# 3. Build AAB (Android App Bundle)
eas build --platform android

# 4. Submit to Play Store
eas submit --platform android

# Answer prompts:
# - Use new or existing? → Use new key if first time
# - App signing? → Let Google manage it
```

### Both Platforms Together

```bash
# Build for both:
eas build --platform all

# Submit both:
eas submit --platform all
```

---

## Part 4: Complete Deployment Checklist

### Backend Pre-Deployment

- [ ] Update `requirements.txt` with all dependencies
- [ ] Set `DEBUG = False` in `main.py`
- [ ] Configure API keys as environment variables (not hardcoded)
- [ ] Test with production data (yfinance data)
- [ ] Add CORS for your mobile app domain
- [ ] Set up database (if using one)
- [ ] Configure logging to file
- [ ] Add error monitoring (Sentry optional)

### Mobile Pre-Deployment

- [ ] Update API_URL to production backend URL
- [ ] Test all endpoints with production backend
- [ ] Update app version number
- [ ] Create privacy policy & terms of service
- [ ] Add app icons (all sizes)
- [ ] Add app screenshots for store listing
- [ ] Test offline functionality
- [ ] Performance test on real device

### Post-Deployment

- [ ] Monitor backend logs
- [ ] Test mobile app via store
- [ ] Collect user feedback
- [ ] Monitor API usage/costs
- [ ] Set up auto-scaling (if needed)
- [ ] Plan update strategy

---

## Part 5: Environment Variables Checklist

### Backend (.env)

```env
# API Keys
ALPHA_VANTAGE_API_KEY=your_key
IEX_API_KEY=your_key

# Database (if using)
DATABASE_URL=postgresql://user:pass@localhost/db

# App Settings
DEBUG=False
CORS_ORIGINS=["https://your-app.com"]
LOG_LEVEL=INFO

# Optional: Sentry Error Tracking
SENTRY_DSN=your_sentry_url
```

### Mobile (.env)

```env
EXPO_PUBLIC_API_URL=https://your-backend.onrender.com
EXPO_PUBLIC_ENV=production
```

---

## Part 6: Recommended Deployment Stack (2025)

### Fastest Setup (15 minutes)

```
1. Backend → Render.com (Free tier)
   - Auto-deploys from GitHub
   - Includes SSL/HTTPS
   - 0.5 GB RAM free
   
2. Mobile → Expo Go (development)
   OR Google Play/App Store (production)
```

### Scalable Setup

```
1. Backend → Fly.io or Railway
   - Better performance
   - Auto-scaling available
   - CDN included
   
2. Database → Render PostgreSQL or Railway
   
3. Mobile → App Store + Play Store
```

### Enterprise Setup

```
1. Backend → AWS EC2 + RDS + CloudFront
   - Full control
   - Advanced security
   - Global CDN
   
2. Mobile → Enterprise developer accounts
```

---

## Part 7: Quick Start Deploy Commands

### Deploy Backend to Render (Fastest)

```bash
# 1. Push to GitHub
git push origin main

# 2. In Render.com dashboard:
#    - Connect GitHub repo
#    - Build: pip install -r backend/requirements.txt
#    - Start: cd backend && python main.py

# 3. Get your URL → Use as EXPO_PUBLIC_API_URL
```

### Deploy Mobile

```bash
# 1. Update backend URL
cd mobile
nano .env
# Set: EXPO_PUBLIC_API_URL=https://your-api.onrender.com

# 2. Build & submit
eas build --platform all
eas submit --platform all
```

---

## Part 8: Testing Production Deployment

### Backend Health Check

```bash
# Test backend is running:
curl https://your-backend-url.onrender.com/docs
# Should show Swagger API documentation

# Test specific endpoint:
curl https://your-backend-url.onrender.com/smart-strategy
```

### Mobile Testing

```bash
# Test with production backend:
npx expo start

# In simulator, verify API calls work:
# - Check that market data loads
# - Check that smart strategy works
# - Check that watchlist saves
```

---

## Part 9: Cost Breakdown

| Service | Free Tier | Paid Starting |
|---------|-----------|---------------|
| Render Backend | ✅ 0.5GB RAM | $7/month |
| Railway Backend | ✅ $5/month credit | $5/month+ |
| Fly.io | ✅ Limited | $0.15/hour |
| App Store | ❌ | $99/year (Apple) |
| Play Store | ❌ | $25 (one-time) |
| Database | ✅ Limited | $7/month |
| **Total (Free)** | | ~$0 + development |
| **Total (Recommended)** | | ~$150/year |

---

## Part 10: Troubleshooting

### Backend doesn't connect from mobile

```bash
# Check CORS in backend/main.py:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com", "exp://localhost"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Check API_URL in mobile .env matches exactly
```

### Mobile shows API connection error

```bash
# Test backend directly:
curl https://your-api-url/smart-strategy

# If fails: check backend logs on Render/Railway dashboard

# If works: check mobile code for typos in API_URL
```

### High latency on first request

- Normal (cold start on free tier)
- Free Render instances sleep after 15 min inactivity
- Upgrade to paid for always-on instances

---

## Summary

**Choose Your Path:**

🚀 **Fastest** → Render.com backend + Expo Go mobile (development) = **15 min**

📱 **Production** → Render backend + App Store/Play Store = **1-2 weeks** (app review)

🏢 **Enterprise** → AWS/GCP + dedicated database = **Custom**

**Next Steps:**

1. Choose deployment service ← **START HERE**
2. Set up backend
3. Update mobile `.env`
4. Test everything
5. Deploy mobile apps

Need help with a specific platform? Let me know!
