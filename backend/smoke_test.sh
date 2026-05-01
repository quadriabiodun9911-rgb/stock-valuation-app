#!/usr/bin/env bash
set -euo pipefail
BASE=http://127.0.0.1:8020
CURL="curl -sS --max-time 15"
PASS=0; FAIL=0

check() {
  local label="$1"; local result="$2"; local expect="$3"
  if echo "$result" | grep -qi "$expect"; then
    echo "  PASS  $label"
    PASS=$((PASS+1))
  else
    echo "  FAIL  $label => $result"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "━━━ AUTH ━━━"
REG=$(curl -sS -X POST $BASE/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"smoketest_x","email":"smoke_x@test.com","password":"Test1234!"}')
TOK=$(echo $REG | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("token",""))' 2>/dev/null)
if [ -z "$TOK" ]; then
  # maybe already registered — try login
  LOGIN=$(curl -sS -X POST $BASE/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"smoke_x@test.com","password":"Test1234!"}')
  TOK=$(echo $LOGIN | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("token",""))' 2>/dev/null)
fi
check "register/login" "$TOK" "."  # any token = pass
AUTH="Authorization: Bearer $TOK"

echo ""
echo "━━━ STOCK DATA ━━━"
R=$(curl -sS --max-time 8 "$BASE/stock/AAPL" -H "$AUTH")
check "stock info AAPL" "$R" "symbol\|current_price\|price"

R=$(curl -sS --max-time 8 "$BASE/search?query=Apple&limit=3")
check "stock search" "$R" "result\|Apple\|AAPL"

echo ""
echo "━━━ VALUATIONS ━━━"
R=$(curl -sS --max-time 15 -X POST $BASE/valuation/dcf -H 'Content-Type: application/json' -H "$AUTH" -d '{"symbol":"AAPL"}')
check "DCF valuation" "$R" "intrinsic\|dcf\|value"

R=$(curl -sS --max-time 20 "$BASE/valuation/comparable/AAPL" -H "$AUTH")
check "Comparable valuation" "$R" "value\|estimate\|comparable"

echo ""
echo "━━━ TECHNICAL ANALYSIS ━━━"
R=$(curl -sS --max-time 20 "$BASE/analysis/technical/AAPL" -H "$AUTH")
check "Technical indicators" "$R" "rsi\|signal\|moving\|technical"

echo ""
echo "━━━ PORTFOLIO ━━━"
R=$(curl -sS --max-time 10 $BASE/portfolio -H "$AUTH")
check "Portfolio GET" "$R" "holding\|portfolio\|\[\]"

R=$(curl -sS -X PUT $BASE/portfolio \
  -H 'Content-Type: application/json' -H "$AUTH" \
  -d '{"positions":[{"symbol":"AAPL","shares":10,"cost_basis":150}],"cash":1000}')
check "Portfolio PUT/update" "$R" "success\|message\|updated\|portfolio"

echo ""
echo "━━━ RECOMMENDATIONS ━━━"
R=$(curl -sS --max-time 10 $BASE/recommendations/public)
check "Public recommendations" "$R" "."  # any JSON = pass

echo ""
echo "━━━ SOCIAL FEED ━━━"
R=$(curl -sS --max-time 10 "$BASE/api/social/feed" -H "$AUTH")
check "Social feed GET" "$R" "post\|feed\|\[\]"

R=$(curl -sS --max-time 10 -X POST $BASE/api/social/posts \
  -H 'Content-Type: application/json' -H "$AUTH" \
  -d '{"content":"smoke test","symbol":"AAPL"}')
check "Social post create" "$R" "id\|content\|post"

echo ""
echo "━━━ ASSISTIVE AI ━━━"
R=$(curl -sS --max-time 10 -X POST $BASE/api/assistive/valuation-brief \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"AAPL","analysis":{"recommendation":{"action":"buy","confidence":"High"},"valuations":{"dcf":{"upside":12}},"technical_analysis":{"rsi":62}}}')
check "Assistive valuation brief" "$R" "brief\|confidence\|summary\|recommendation"

R=$(curl -sS --max-time 10 -X POST $BASE/api/assistive/news-impact \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"AAPL","limit":3}')
check "Assistive news impact" "$R" "sentiment\|impact\|news"

echo ""
echo "━━━ AI CHAT ━━━"
R=$(curl -sS --max-time 15 -X POST $BASE/ai-chat \
  -H 'Content-Type: application/json' -H "$AUTH" \
  -d '{"message":"Is AAPL a good buy?"}')
check "AI chat" "$R" "response\|message\|answer\|AAPL\|stock"

echo ""
echo "━━━ NEWS ━━━"
R=$(curl -sS --max-time 15 "$BASE/api/news/stock/AAPL?limit=3")
check "News feed AAPL" "$R" "title\|article\|news\|\[\]"

echo ""
echo "━━━ PRICE ALERTS ━━━"
R=$(curl -sS $BASE/api/alerts/list -H "$AUTH")
check "Price alerts GET" "$R" "alert\|\[\]"

echo ""
echo "━━━ ACHIEVEMENTS ━━━"
R=$(curl -sS --max-time 10 $BASE/achievements -H "$AUTH")
check "Achievements GET" "$R" "achievement\|badge\|\[\]"

echo ""
echo "━━━ TRADE REASONS ━━━"
R=$(curl -sS --max-time 10 -X POST $BASE/api/trade-reasons/submit \
  -H 'Content-Type: application/json' -H "$AUTH" \
  -d '{"symbol":"AAPL","reason":"Strong earnings","trade_type":"buy"}')
check "Trade reason POST" "$R" "id\|reason\|message\|trade"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━"
echo "PASSED: $PASS  FAILED: $FAIL"
echo "━━━━━━━━━━━━━━━━━━━━━━"
