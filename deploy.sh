#!/bin/bash

# Stock Valuation App - Deployment Setup Script
# This script helps automate the deployment process

set -e

REPO_PATH="/Users/abiodunquadri/kivy/new work foler /stock-valuation-app"
GITHUB_USERNAME=""
RAILWAY_TOKEN=""
VERCEL_TOKEN=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if git is initialized
check_git_repo() {
    print_status "Checking git repository status..."
    cd "$REPO_PATH"
    
    if git rev-parse --git-dir > /dev/null 2>&1; then
        print_success "Git repository found"
        COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "0")
        print_success "Commits in repository: $COMMIT_COUNT"
    else
        print_error "Git repository not found. Run: git init"
        exit 1
    fi
}

# Display deployment checklist
show_checklist() {
    print_status "Deployment Checklist"
    echo ""
    echo "Before deploying, ensure you have:"
    echo ""
    echo "☐ GitHub Account (https://github.com)"
    echo "☐ Railway Account (https://railway.app)"
    echo "☐ Vercel Account (https://vercel.com)"
    echo ""
    echo "Files verified:"
    echo ""
    
    if [ -f "$REPO_PATH/backend/Dockerfile" ]; then
        print_success "Backend Dockerfile found"
    else
        print_error "Backend Dockerfile NOT found"
    fi
    
    if [ -f "$REPO_PATH/backend/railway.json" ]; then
        print_success "Backend railway.json found"
    else
        print_error "Backend railway.json NOT found"
    fi
    
    if [ -f "$REPO_PATH/backend/requirements.txt" ]; then
        print_success "Backend requirements.txt found"
    else
        print_error "Backend requirements.txt NOT found"
    fi
    
    if [ -f "$REPO_PATH/mobile/vercel.json" ]; then
        print_success "Frontend vercel.json found"
    else
        print_error "Frontend vercel.json NOT found"
    fi
    
    if [ -f "$REPO_PATH/mobile/package.json" ]; then
        BUILD_WEB=$(grep -c "build:web" "$REPO_PATH/mobile/package.json" || echo "0")
        if [ "$BUILD_WEB" -gt 0 ]; then
            print_success "Frontend package.json has build:web script"
        else
            print_error "Frontend package.json missing build:web script"
        fi
    else
        print_error "Frontend package.json NOT found"
    fi
    
    echo ""
}

# Show deployment instructions
show_deployment_instructions() {
    print_status "Deployment Instructions"
    echo ""
    echo "1. Create GitHub Repository"
    echo "   - Visit: https://github.com/new"
    echo "   - Name: stock-valuation-app"
    echo "   - Click: Create repository"
    echo ""
    echo "2. Push Code to GitHub"
    echo "   Run:"
    echo "   cd \"$REPO_PATH\""
    echo "   git remote add origin https://github.com/YOUR_USERNAME/stock-valuation-app.git"
    echo "   git branch -M main"
    echo "   git push -u origin main"
    echo ""
    echo "3. Deploy Backend to Railway"
    echo "   - Visit: https://railway.app/dashboard"
    echo "   - New Project → Deploy from GitHub"
    echo "   - Select your repository"
    echo "   - Railway auto-detects Dockerfile"
    echo "   - Save the generated URL"
    echo ""
    echo "4. Deploy Frontend to Vercel"
    echo "   - Visit: https://vercel.com/dashboard"
    echo "   - Add New → Project"
    echo "   - Import GitHub Repository"
    echo "   - Set Root Directory: mobile"
    echo "   - Add EXPO_PUBLIC_API_URL environment variable"
    echo ""
    echo "5. Test the Deployment"
    echo "   - Frontend: https://your-project-name.vercel.app"
    echo "   - Backend: https://xxx.up.railway.app/docs"
    echo ""
}

# Show git status
show_git_status() {
    print_status "Git Repository Status"
    cd "$REPO_PATH"
    echo ""
    echo "Current branch: $(git rev-parse --abbrev-ref HEAD)"
    echo "Latest commit: $(git log --oneline -1)"
    echo ""
    echo "File statistics:"
    git ls-files | wc -l | xargs echo "  Total files:"
    git log --oneline | wc -l | xargs echo "  Total commits:"
    echo ""
}

# Main menu
show_menu() {
    echo ""
    echo "======================================"
    echo "Stock Valuation App - Deployment Menu"
    echo "======================================"
    echo ""
    echo "1. Check repository status"
    echo "2. Show deployment checklist"
    echo "3. Show deployment instructions"
    echo "4. Show git status"
    echo "5. View full deployment guide"
    echo "6. Exit"
    echo ""
}

# View deployment guide
view_deployment_guide() {
    if [ -f "$REPO_PATH/DEPLOYMENT.md" ]; then
        less "$REPO_PATH/DEPLOYMENT.md"
    else
        print_error "DEPLOYMENT.md not found"
    fi
}

# Main loop
main() {
    while true; do
        show_menu
        read -p "Select an option (1-6): " choice
        
        case $choice in
            1)
                check_git_repo
                ;;
            2)
                show_checklist
                ;;
            3)
                show_deployment_instructions
                ;;
            4)
                show_git_status
                ;;
            5)
                view_deployment_guide
                ;;
            6)
                print_success "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please try again."
                ;;
        esac
    done
}

# Run main
main
