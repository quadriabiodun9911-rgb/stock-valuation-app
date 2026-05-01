"""Quick endpoint probe for specific failing routes."""
import urllib.request
import urllib.error
import json

BASE = "http://127.0.0.1:8020"

def req(method, path, body=None, token=None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    rq = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(rq, timeout=15) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())
    except Exception as e:
        return 0, str(e)

# Login
status, resp = req("POST", "/auth/login", {"email": "smoke_x@test.com", "password": "Test1234!"})
tok = resp.get("token", "") if isinstance(resp, dict) else ""
print(f"AUTH login: {status}  token={'YES' if tok else 'NO'}")

# Social feed
status, resp = req("GET", "/api/social/feed", token=tok)
print(f"SOCIAL feed: {status}  resp={json.dumps(resp)[:200]}")

# Social post create
status, resp = req("POST", "/api/social/posts", {"content": "test post", "symbol": "AAPL"}, tok)
print(f"SOCIAL post create: {status}  resp={json.dumps(resp)[:200]}")

# News
status, resp = req("GET", "/api/news/stock/AAPL?limit=3")
print(f"NEWS /api/news/stock/AAPL: {status}  resp={json.dumps(resp)[:200]}")

# Portfolio PUT with correct field name
status, resp = req("PUT", "/portfolio", {
    "positions": [{"symbol": "AAPL", "shares": 10, "cost_basis": 150.0}],
    "cash": 1000.0
}, tok)
print(f"PORTFOLIO PUT (positions): {status}  resp={json.dumps(resp)[:200]}")

# Comparable valuation check
status, resp = req("GET", "/valuation/comparable/AAPL", token=tok)
has_value = any(k in resp for k in ["average_valuation", "implied_valuations", "estimated_value"]) if isinstance(resp, dict) else False
print(f"COMPARABLE valuation: {status}  has_value={has_value}  keys={list(resp.keys())[:5] if isinstance(resp, dict) else resp}")
