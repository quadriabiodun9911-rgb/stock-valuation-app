import urllib.request, json

BASE = "http://127.0.0.1:8001"

def get(path):
    try:
        with urllib.request.urlopen(f"{BASE}{path}", timeout=60) as r:
            return json.loads(r.read())
    except Exception as e:
        return {"__error__": str(e)}

def show(label, d, keys=None):
    if "__error__" in d:
        print(f"  FAIL: {d['__error__']}")
    elif "detail" in d:
        print(f"  ERROR RESPONSE: {d['detail']}")
    else:
        if keys:
            for k in keys:
                print(f"  {k}: {d.get(k, 'N/A')}")
        else:
            print(f"  Keys: {list(d.keys())[:12]}")

sep = "=" * 55

print(sep)
print("1. ROOT")
d = get("/")
show("root", d, ["message", "version", "status"])

print(sep)
print("2. HEALTH")
d = get("/health")
show("health", d, ["status", "environment", "database"])

print(sep)
print("3. READINESS")
d = get("/readiness")
show("readiness", d, ["status"])

print(sep)
print("4. STOCK DETAIL - AAPL")
d = get("/stock/AAPL")
show("aapl", d, ["symbol", "current_price", "market_cap", "pe_ratio",
                  "52_week_high", "52_week_low",
                  "volume", "beta", "dividend_yield"])

print(sep)
print("5. STOCK DETAIL - TSLA")
d = get("/stock/TSLA")
show("tsla", d, ["symbol", "current_price", "pe_ratio", "market_cap"])

print(sep)
print("6. STOCK DETAIL - MSFT")
d = get("/stock/MSFT")
show("msft", d, ["symbol", "current_price", "pe_ratio", "market_cap"])

print(sep)
print("7. STOCK DETAIL - INVALID SYMBOL")
d = get("/stock/XXXXXXINVALID")
if "__error__" in d or d.get("detail") or d.get("error"):
    msg = d.get("detail") or d.get("error") or str(d.get("__error__", ""))[:80]
    print(f"  Handled correctly: {msg}")
else:
    print(f"  Unexpected response: {d}")

print(sep)
print("8. SEARCH - 'Apple'")
d = get("/search?query=Apple")
if isinstance(d, list):
    print(f"  Results: {len(d)} items")
    if d:
        print(f"  First result: {d[0]}")
elif "__error__" in d:
    print(f"  FAIL: {d['__error__']}")
else:
    print(f"  Response: {d}")

print(sep)
print("9. TECHNICAL ANALYSIS - AAPL")
d = get("/analysis/technical/AAPL")
show("tech", d)

print(sep)
print("10. COMPARABLE VALUATION - AAPL")
d = get("/valuation/comparable/AAPL")
show("comparable", d)

print(sep)
print("11. FINANCIAL RATIOS - MSFT")
d = get("/analysis/ratios/MSFT")
show("ratios", d)

print(sep)
print("12. FINANCIAL GROWTH - AMZN")
d = get("/analysis/financial-growth/AMZN")
show("growth", d)

print(sep)
print("13. PRICE-EPS - GOOGL")
d = get("/analysis/price-eps/GOOGL")
show("price-eps", d)

print(sep)
print("14. COMPREHENSIVE ANALYSIS - AAPL")
d = get("/analysis/comprehensive/AAPL")
show("comprehensive", d)

print(sep)
print("15. SENSITIVITY ANALYSIS - AAPL")
d = get("/analysis/sensitivity/AAPL")
show("sensitivity", d)

print(sep)
print("16. PEER COMPARISON - AAPL")
d = get("/analysis/peer-comparison/AAPL")
show("peer", d)

print(sep)
print("17. FINANCIAL TEMPLATE - AAPL")
d = get("/financial-template/AAPL")
show("template", d)

print(sep)
print("DONE")
