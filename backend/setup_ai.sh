#!/bin/bash
# Setup and Test AI Analytics

echo "🚀 Stock Valuation App - AI Analytics Quick Test"
echo "================================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from correct directory
if [ ! -f "main.py" ]; then
    echo -e "${YELLOW}⚠️  Please run from stock-valuation-app/backend directory${NC}"
    echo "Usage: cd stock-valuation-app/backend && bash setup_ai.sh"
    exit 1
fi

echo -e "${BLUE}Step 1: Checking Python Installation${NC}"
python --version

echo ""
echo -e "${BLUE}Step 2: Installing Requirements${NC}"
pip install -r requirements.txt 2>/dev/null && echo -e "${GREEN}✓ Requirements installed${NC}" || echo -e "${YELLOW}Some packages may need manual install${NC}"

echo ""
echo -e "${BLUE}Step 3: Verifying AI Files${NC}"
if [ -f "ai_analytics.py" ]; then
    echo -e "${GREEN}✓ ai_analytics.py exists ($(wc -l < ai_analytics.py) lines)${NC}"
else
    echo -e "${YELLOW}✗ ai_analytics.py not found${NC}"
fi

if [ -f "ai_endpoints.py" ]; then
    echo -e "${GREEN}✓ ai_endpoints.py exists ($(wc -l < ai_endpoints.py) lines)${NC}"
else
    echo -e "${YELLOW}✗ ai_endpoints.py not found${NC}"
fi

echo ""
echo -e "${BLUE}Step 4: Documentation Files${NC}"
for doc in QUICK_START.md AI_FEATURES_GUIDE.md AI_INTEGRATION_GUIDE.md ARCHITECTURE.md; do
    if [ -f "../$doc" ]; then
        echo -e "${GREEN}✓ $doc${NC}"
    else
        echo -e "${YELLOW}✗ $doc not found${NC}"
    fi
done

echo ""
echo -e "${BLUE}Step 5: Ready to Start Backend${NC}"
echo "Commands to run:"
echo "1. Start backend:"
echo "   python main.py"
echo ""
echo "2. In another terminal, test endpoints:"
echo "   curl http://localhost:8000/docs"
echo ""
echo "3. Test prediction:"
echo "   curl -X POST http://localhost:8000/api/ai/predict \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"symbol\": \"AAPL\"}'"
echo ""

echo -e "${GREEN}✅ Setup complete! Ready to go.${NC}"
echo ""
echo "📚 Documentation:"
echo "   • Quick Start: ../QUICK_START.md"
echo "   • Features: ../AI_FEATURES_GUIDE.md"
echo "   • Integration: ../AI_INTEGRATION_GUIDE.md"
echo "   • Architecture: ../ARCHITECTURE.md"
echo "   • Index: ../INDEX.md"
echo ""
