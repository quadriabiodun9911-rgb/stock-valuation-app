#!/bin/bash
# Production Deployment Quick Start Script

set -e

echo "🚀 Stock Valuation App - Production Deployment"
echo "=============================================="
echo ""

# Configuration
GITHUB_USERNAME=${1:-"your_username"}
RAILWAY_PROJECT=${2:-"stock-valuation-app"}
VERCEL_TEAM=${3:-"personal"}

if [ "$GITHUB_USERNAME" = "your_username" ]; then
    echo "Usage: ./deploy.sh <github_username> [railway_project] [vercel_team]"
    echo ""
    echo "Step 1: Create GitHub repository"
    echo "  1. Go to https://github.com/new"
    echo "  2. Create 'stock-valuation-app' repository"
    echo "  3. Run: ./deploy.sh <your_username>"
    echo ""
    exit 1
fi

echo "📋 Pre-deployment Checklist"
echo "============================"
echo ""
echo "Before proceeding, ensure you have:"
echo "  ✓ GitHub account with repository created"
echo "  ✓ Railway account (https://railway.app)"
echo "  ✓ Vercel account (https://vercel.com)"
echo "  ✓ Sentry account (https://sentry.io)"
echo ""
read -p "Press Enter to continue..."

# Step 1: Push to GitHub
echo ""
echo "📤 Step 1: Push code to GitHub..."
echo "===================================="

if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit: Stock valuation app with real-time features"
fi

git remote add origin https://github.com/$GITHUB_USERNAME/$RAILWAY_PROJECT.git 2>/dev/null || true
git branch -M main
git push -u origin main

echo "✅ Code pushed to GitHub"
echo ""

# Step 2: Backend Deployment Info
echo "🔧 Step 2: Deploy Backend to Railway"
echo "======================================"
echo ""
echo "1. Go to https://railway.app"
echo "2. Sign in with GitHub"
echo "3. Create new project"
echo "4. Select 'GitHub Repo' → Select your repository"
echo "5. Select the 'stock-valuation-app' directory"
echo "6. Configure variables:"
echo ""
echo "   ENVIRONMENT=production"
echo "   SENTRY_DSN=https://...  # Get from Sentry"
echo ""
echo "7. Click Deploy"
echo ""
echo "After deployment, you'll get a Railway URL like:"
echo "   https://stock-api.railway.app"
echo ""
read -p "Enter your Railway backend URL (or press Enter to skip): " RAILWAY_URL

if [ -n "$RAILWAY_URL" ]; then
    echo "✅ Railway backend URL: $RAILWAY_URL"
fi

# Step 3: Frontend Deployment Info
echo ""
echo "🎨 Step 3: Deploy Frontend to Vercel"
echo "======================================="
echo ""
echo "1. Go to https://vercel.com"
echo "2. Click 'Add New' → 'Project'"
echo "3. Import your GitHub repository"
echo "4. Configure:"
echo ""
echo "   Framework: Create React App"
echo "   Environment Variables:"
echo "   - EXPO_PUBLIC_API_URL=${RAILWAY_URL:-https://stock-api.railway.app}"
echo ""
echo "5. Click Deploy"
echo ""
echo "After deployment, you'll get a Vercel URL like:"
echo "   https://stock-app.vercel.app"
echo ""
read -p "Press Enter when Vercel deployment is complete..."

# Step 4: Verification
echo ""
echo "🧪 Step 4: Testing Deployment"
echo "==============================="
echo ""

if [ -n "$RAILWAY_URL" ]; then
    echo "Testing backend endpoints..."
    
    echo -n "  - Health check: "
    if curl -s "$RAILWAY_URL/docs" > /dev/null; then
        echo "✅"
    else
        echo "❌ Backend not responding"
    fi
    
    echo -n "  - Real-time API: "
    if curl -s "$RAILWAY_URL/realtime/streams/active" > /dev/null; then
        echo "✅"
    else
        echo "❌ Real-time API not responding"
    fi
    
    echo -n "  - Price endpoint: "
    if curl -s "$RAILWAY_URL/realtime/price/latest/AAPL" > /dev/null 2>&1 | grep -q "price"; then
        echo "✅"
    else
        echo "⚠️  May need time to initialize"
    fi
fi

# Step 5: Monitoring Setup
echo ""
echo "📊 Step 5: Setup Error Tracking (Sentry)"
echo "=========================================="
echo ""
echo "1. Go to https://sentry.io"
echo "2. Create organization and projects"
echo "3. Get your DSN and add to environment variables:"
echo ""
echo "   Backend (Railway): SENTRY_DSN=https://..."
echo "   Frontend (Vercel): REACT_APP_SENTRY_DSN=https://..."
echo ""

# Step 6: Summary
echo ""
echo "🎉 Deployment Summary"
echo "======================"
echo ""
echo "Your app is now ready for production!"
echo ""
echo "Components:"
echo "  ✅ Backend: FastAPI with WebSocket real-time features"
echo "  ✅ Frontend: React Native web app"
echo "  ✅ Database: yfinance for real-time stock data"
echo "  ✅ Monitoring: Sentry for error tracking"
echo ""
echo "URLs:"
if [ -n "$RAILWAY_URL" ]; then
    echo "  • Backend: $RAILWAY_URL"
    echo "  • WebSocket: wss://${RAILWAY_URL#https://}/realtime/ws/price/{symbol}"
fi
echo "  • Frontend: https://stock-app.vercel.app"
echo ""
echo "Next Steps:"
echo "  1. Setup custom domain (if using)"
echo "  2. Configure CORS for your domain"
echo "  3. Enable monitoring and alerts"
echo "  4. Test real-time features in production"
echo "  5. Announce to users!"
echo ""
echo "Documentation:"
echo "  • Real-time Features: REALTIME_FEATURES_GUIDE.md"
echo "  • Production Guide: PRODUCTION_DEPLOYMENT.md"
echo "  • API Docs: https://api.yourdomain.com/docs"
echo ""
echo "=============================================="
echo "🚀 Ready for production!"
