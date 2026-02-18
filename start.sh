#!/bin/bash

echo "🚀 Starting Stock Valuation App"
echo "================================"

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "mobile" ]; then
    echo "❌ Error: Please run this script from the stock-valuation-app directory"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists python3; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

if ! command_exists node; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is required but not installed."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt
echo "✅ Backend dependencies installed"
cd ..

# Install mobile app dependencies
echo "📦 Installing mobile app dependencies..."
cd mobile
npm install
echo "✅ Mobile app dependencies installed"
cd ..

# Start backend in background
echo "🚀 Starting backend server..."
cd backend
source venv/bin/activate
python main.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Backend started successfully at http://localhost:8000"
else
    echo "❌ Backend failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start mobile app
echo "📱 Starting mobile app..."
cd mobile
npx expo start --web &
MOBILE_PID=$!
cd ..

echo ""
echo "🎉 Stock Valuation App is now running!"
echo "================================"
echo "📊 Backend API: http://localhost:8000"
echo "📱 Mobile App: http://localhost:8081"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID 2>/dev/null
    kill $MOBILE_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set up trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user input
wait