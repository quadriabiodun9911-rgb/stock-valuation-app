"""
FCS API stock data provider.

Docs: https://fcsapi.com/document/stock-api
Env:  FCS_API_KEY — set in .env or Render environment variables.
"""

import os
import logging
from typing import Any, Dict, Optional

import requests
import pandas as pd

logger = logging.getLogger(__name__)

_BASE_URL = "https://fcsapi.com/api-v3"
_TIMEOUT = 10  # seconds


class FCSProvider:
    """
    FCS API client following the same interface pattern as
    AlphaVantageProvider and TwelveDataProvider.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key: str = api_key or os.getenv("FCS_API_KEY", "")
        if not self.api_key:
            logger.warning(
                "FCS_API_KEY not set — FCSProvider will be skipped in the failover chain."
            )

    # ── helpers ──────────────────────────────────────────────────

    @property
    def enabled(self) -> bool:
        """True only when an API key is configured."""
        return bool(self.api_key)

    def _make_request(self, endpoint: str, params: Dict[str, Any]) -> Any:
        """
        GET {_BASE_URL}/{endpoint}, appending access_key automatically.

        Returns the parsed JSON body.
        Raises Exception on HTTP error, FCS error response, or empty data.
        """
        params = {**params, "access_key": self.api_key}
        url = f"{_BASE_URL}/{endpoint}"

        try:
            resp = requests.get(url, params=params, timeout=_TIMEOUT)
        except requests.RequestException as exc:
            raise Exception(f"FCS API network error: {exc}") from exc

        if resp.status_code != 200:
            raise Exception(
                f"FCS API HTTP {resp.status_code} for endpoint '{endpoint}'"
            )

        body = resp.json()

        # FCS returns {"status": false, "code": 4xx, "msg": "..."} on errors
        if not body.get("status", False):
            msg = body.get("msg", "unknown error")
            code = body.get("code", "?")
            raise Exception(f"FCS API error {code}: {msg}")

        return body

    @staticmethod
    def _safe_float(value: Any, default: float = 0.0) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    # ── public API ───────────────────────────────────────────────

    def get_quote(self, symbol: str) -> Dict[str, Any]:
        """
        Fetch the latest quote for *symbol*.

        Returns a normalised dict compatible with TwelveDataProvider.get_quote():
            symbol, name, exchange, currency,
            price, open, high, low, volume,
            previous_close, change, change_percent
        """
        data = self._make_request("stock/latest", {"symbol": symbol})

        response = data.get("response")
        if not response or not isinstance(response, list) or len(response) == 0:
            raise Exception(f"No quote data returned by FCS API for symbol: {symbol}")

        q = response[0]

        # FCS field map:
        #   o=open  h=high  l=low  c=close  v=volume
        #   ch=change  cp=change_percent  s=symbol  n=name  e=exchange
        price = self._safe_float(q.get("c") or q.get("lp"))  # close / last price
        return {
            "symbol": q.get("s", symbol).upper(),
            "name": q.get("n", ""),
            "exchange": q.get("e", ""),
            "currency": q.get("c2", ""),  # FCS uses 'c2' for currency in some responses
            "price": price,
            "open": self._safe_float(q.get("o")),
            "high": self._safe_float(q.get("h")),
            "low": self._safe_float(q.get("l")),
            "volume": int(self._safe_float(q.get("v"))),
            "previous_close": self._safe_float(q.get("pc", q.get("c"))),
            "change": self._safe_float(q.get("ch")),
            "change_percent": self._safe_float(q.get("cp")),
        }

    def get_stock_info(self, symbol: str) -> Dict[str, Any]:
        """
        Return a comprehensive stock info dict in the same shape expected
        by the /stock/{symbol} endpoint in main.py.
        """
        quote = self.get_quote(symbol)
        return {
            "symbol": quote["symbol"],
            "company_name": quote["name"],
            "current_price": quote["price"],
            "previous_close": quote["previous_close"],
            "open": quote["open"],
            "high": quote["high"],
            "low": quote["low"],
            "volume": quote["volume"],
            "change": quote["change"],
            "change_percent": quote["change_percent"],
            "exchange": quote["exchange"],
            "currency": quote["currency"],
            # FCS basic quote does not include fundamentals
            "market_cap": None,
            "pe_ratio": None,
            "sector": None,
            "industry": None,
            "dividend_yield": None,
            "52_week_high": None,
            "52_week_low": None,
            "beta": None,
            "data_source": "FCS API",
        }

    def get_history(self, symbol: str, period: str = "1y") -> pd.DataFrame:
        """
        Fetch OHLCV history and return a DataFrame with columns
        [open, high, low, close, volume] indexed by datetime — the same
        shape used by the yfinance history DataFrame.

        *period* is converted to an FCS ``period`` parameter:
            1d → 1D, 1w/5d → 1W, 1mo → 1M, 3mo → 3M, 6mo → 6M, 1y → 1Y,
            2y/5y/10y/max → 5Y  (FCS max is 5Y on most plans)
        """
        period_map = {
            "1d": "1D", "5d": "1W", "1wk": "1W", "1w": "1W",
            "1mo": "1M", "3mo": "3M", "6mo": "6M",
            "1y": "1Y", "2y": "5Y", "5y": "5Y", "10y": "5Y", "max": "5Y",
        }
        fcs_period = period_map.get(period.lower(), "1Y")

        data = self._make_request(
            "stock/history",
            {"symbol": symbol, "period": fcs_period}
        )

        response = data.get("response")
        if not response or not isinstance(response, list):
            raise Exception(f"No history data returned by FCS API for symbol: {symbol}")

        rows = []
        for bar in response:
            try:
                rows.append({
                    "datetime": pd.to_datetime(bar.get("t") or bar.get("tm") or bar.get("d")),
                    "open": self._safe_float(bar.get("o")),
                    "high": self._safe_float(bar.get("h")),
                    "low": self._safe_float(bar.get("l")),
                    "close": self._safe_float(bar.get("c")),
                    "volume": int(self._safe_float(bar.get("v"))),
                })
            except Exception:
                continue  # skip malformed bars

        if not rows:
            raise Exception(f"Could not parse history bars from FCS API for symbol: {symbol}")

        df = pd.DataFrame(rows).set_index("datetime").sort_index()
        df.columns = [c.lower() for c in df.columns]
        return df
