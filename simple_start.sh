#!/bin/bash

echo "🚀 Starting Stock Valuation App"
echo "================================"

# Check if in correct directory
if [ ! -f "README.md" ] || [ ! -d "backend" ] || [ ! -d "mobile" ]; then
    echo "❌ Please run this script from the stock-valuation-app directory"
    exit 1
fi

echo "🔍 Checking prerequisites..."

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Backend setup
echo "📦 Setting up backend..."
cd backend

if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing backend dependencies..."
pip install -r requirements.txt

echo "✅ Backend setup complete"

# Start backend in background
echo "🚀 Starting backend server..."
python main.py &
BACKEND_PID=$!
echo "Backend running with PID: $BACKEND_PID"

cd ../mobile

# Mobile setup
echo "📦 Setting up mobile app..."
if [ ! -d "node_modules" ]; then
    echo "Installing mobile dependencies..."
    npm install --legacy-peer-deps
fi

echo "✅ Mobile setup complete"

# Start mobile app
echo "🚀 Starting mobile app..."
npx expo start --web

# Cleanup function
cleanup() {
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep script running
wait