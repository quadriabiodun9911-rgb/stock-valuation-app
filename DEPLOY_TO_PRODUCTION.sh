#!/bin/bash

# Production Deployment Helper Script
# This script helps you deploy to production

set -e

echo "🚀 Stock Valuation App - Production Deployment Helper"
echo "======================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Menu
show_menu() {
    echo -e "${BLUE}Choose deployment option:${NC}"
    echo "1) Deploy Backend to Render.com (Recommended)"
    echo "2) Deploy Backend to Railway.app"
    echo "3) Deploy Backend to Fly.io"
    echo "4) Build Mobile for iOS"
    echo "5) Build Mobile for Android"
    echo "6) Setup Local Production Testing"
    echo "7) Create GitHub Repository"
    echo "8) View Production Deployment Guide"
    echo "9) Exit"
    echo ""
    read -p "Select option (1-9): " choice
}

# Option 1: Render Deployment
deploy_render() {
    echo -e "${BLUE}Render.com Deployment Setup${NC}"
    echo ""
    echo "1. Go to https://render.com"
    echo "2. Sign up with GitHub account"
    echo "3. Click 'New +' → 'Web Service'"
    echo "4. Connect this GitHub repository"
    echo "5. Use these settings:"
    echo ""
    echo "   Name: stock-valuation-api"
    echo "   Environment: Python 3.11"
    echo "   Build Command: pip install -r backend/requirements.txt"
    echo "   Start Command: cd backend && python main.py"
    echo ""
    echo "6. Add Environment Variables:"
    echo "   ENVIRONMENT=production"
    echo "   DATABASE_URL=postgresql://..."
    echo "   CORS_ORIGINS=https://your-domain.com,exp://"
    echo ""
    echo "7. Click 'Deploy'"
    echo ""
    read -p "Press Enter once deployment is complete..."
    echo -e "${GREEN}✅ Backend deployed to Render!${NC}"
}

# Option 2: Railway Deployment
deploy_railway() {
    echo -e "${BLUE}Railway.app Deployment Setup${NC}"
    echo ""
    echo "1. Go to https://railway.app"
    echo "2. Sign up with GitHub account"
    echo "3. Click 'New Project' → 'Deploy from GitHub'"
    echo "4. Select this repository"
    echo "5. Add Environment Variables:"
    echo "   ENVIRONMENT=production"
    echo "   DATABASE_URL=postgresql://..."
    echo "   PYTHONUNBUFFERED=1"
    echo ""
    echo "6. Railway auto-deploys!"
    echo ""
    read -p "Press Enter once deployment is complete..."
    echo -e "${GREEN}✅ Backend deployed to Railway!${NC}"
}

# Option 3: Fly.io Deployment
deploy_fly() {
    echo -e "${BLUE}Fly.io Deployment Setup${NC}"
    echo ""
    
    if ! command -v flyctl &> /dev/null; then
        echo -e "${YELLOW}Installing Fly CLI...${NC}"
        brew install flyctl
    fi
    
    cd backend
    
    if [ ! -f "fly.toml" ]; then
        echo -e "${YELLOW}Creating Fly config...${NC}"
        flyctl launch --name stock-valuation-api --yes
    fi
    
    echo -e "${YELLOW}Deploying to Fly.io...${NC}"
    flyctl deploy
    
    echo -e "${GREEN}✅ Backend deployed to Fly.io!${NC}"
    
    cd ..
}

# Option 4: Build iOS
build_ios() {
    echo -e "${BLUE}iOS Build Setup${NC}"
    echo ""
    echo "Prerequisites:"
    echo "1. Create Apple Developer Account (https://developer.apple.com)"
    echo "2. Install EAS CLI: npm install -g eas-cli"
    echo "3. Login to EAS: eas login"
    echo ""
    
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd mobile
        
        echo -e "${YELLOW}Building iOS app...${NC}"
        eas build --platform ios --wait
        
        echo -e "${GREEN}✅ iOS build complete!${NC}"
        echo "Download from: ~/Downloads/ios-build.ipa"
        echo ""
        echo "Next steps:"
        echo "1. Go to https://appstoreconnect.apple.com"
        echo "2. Create new app"
        echo "3. Upload the IPA file"
        echo "4. Submit for review"
        
        cd ..
    fi
}

# Option 5: Build Android
build_android() {
    echo -e "${BLUE}Android Build Setup${NC}"
    echo ""
    echo "Prerequisites:"
    echo "1. Create Google Play Developer Account (https://play.google.com/console)"
    echo "2. Install EAS CLI: npm install -g eas-cli"
    echo "3. Login to EAS: eas login"
    echo ""
    
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd mobile
        
        echo -e "${YELLOW}Building Android app...${NC}"
        eas build --platform android --wait
        
        echo -e "${GREEN}✅ Android build complete!${NC}"
        echo "Download from: ~/Downloads/android-build.aab"
        echo ""
        echo "Next steps:"
        echo "1. Go to https://play.google.com/console"
        echo "2. Create new app"
        echo "3. Upload the AAB file"
        echo "4. Publish"
        
        cd ..
    fi
}

# Option 6: Local Production Testing
setup_local_prod() {
    echo -e "${BLUE}Setting Up Local Production Testing${NC}"
    echo ""
    echo -e "${YELLOW}Stopping existing processes...${NC}"
    pkill -f "main.py" || true
    pkill -f "expo start" || true
    sleep 2
    
    echo -e "${YELLOW}Starting production-like backend...${NC}"
    cd backend
    export ENVIRONMENT=production
    python main.py > /tmp/backend_prod.log 2>&1 &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
    
    sleep 3
    
    echo -e "${YELLOW}Starting mobile app...${NC}"
    cd ../mobile
    npx expo start > /tmp/expo_prod.log 2>&1 &
    EXPO_PID=$!
    echo "Expo PID: $EXPO_PID"
    
    sleep 5
    
    echo -e "${GREEN}✅ Production environment ready!${NC}"
    echo ""
    echo "Testing backend connection..."
    if curl -s http://localhost:8000/smart-strategy > /tmp/test.json; then
        COUNT=$(grep -o '"symbol"' /tmp/test.json | wc -l)
        echo -e "${GREEN}✅ Backend responding! Analyzed $COUNT stocks${NC}"
    else
        echo -e "${RED}❌ Backend not responding${NC}"
    fi
    
    echo ""
    echo "Backend logs: tail -f /tmp/backend_prod.log"
    echo "Expo logs: tail -f /tmp/expo_prod.log"
    echo "Stop all: pkill -f main.py && pkill -f expo"
}

# Option 7: Create GitHub Repository
setup_github() {
    echo -e "${BLUE}GitHub Repository Setup${NC}"
    echo ""
    
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo -e "${YELLOW}Initializing Git repository...${NC}"
        git init
        git add .
        git commit -m "Initial commit: Stock Valuation App"
        echo ""
        echo "Now:"
        echo "1. Go to https://github.com/new"
        echo "2. Create new repository: stock-valuation-app"
        echo "3. Run:"
        echo "   git remote add origin https://github.com/YOUR_USERNAME/stock-valuation-app.git"
        echo "   git branch -M main"
        echo "   git push -u origin main"
    else
        echo -e "${YELLOW}Git already initialized${NC}"
        echo ""
        echo "To push to GitHub:"
        echo "1. Go to https://github.com/new"
        echo "2. Create repository: stock-valuation-app"
        echo "3. Run:"
        echo "   git remote add origin https://github.com/YOUR_USERNAME/stock-valuation-app.git"
        echo "   git branch -M main"
        echo "   git push -u origin main"
    fi
}

# Option 8: View deployment guide
view_guide() {
    if command -v less &> /dev/null; then
        less PRODUCTION_DEPLOYMENT_2025.md
    else
        cat PRODUCTION_DEPLOYMENT_2025.md
    fi
}

# Main loop
while true; do
    show_menu
    
    case $choice in
        1) deploy_render ;;
        2) deploy_railway ;;
        3) deploy_fly ;;
        4) build_ios ;;
        5) build_android ;;
        6) setup_local_prod ;;
        7) setup_github ;;
        8) view_guide ;;
        9) 
            echo -e "${GREEN}Goodbye! 👋${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
    echo ""
done
