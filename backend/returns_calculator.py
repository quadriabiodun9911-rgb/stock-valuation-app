from __future__ import annotations

from datetime import datetime
from typing import Iterable, Optional


def _to_float(value: object, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _parse_date(value: object) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.replace(tzinfo=None)

    text = str(value).strip()
    if not text:
        return None

    normalized = text.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(normalized)
        return dt.replace(tzinfo=None)
    except ValueError:
        pass

    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(text[:10], fmt)
        except ValueError:
            continue
    return None


def calculate_holding_period_years(
    dates: Optional[Iterable[object]],
    default_years: float = 1.0,
) -> float:
    parsed_dates = [dt for dt in (_parse_date(item) for item in (dates or [])) if dt is not None]
    if not parsed_dates:
        return max(default_years, 1 / 365.25)

    first_date = min(parsed_dates)
    years = (datetime.now() - first_date).days / 365.25
    return max(years, 1 / 365.25)


def estimate_dividend_income(
    dividends_series,
    shares: float,
    purchase_date: Optional[object] = None,
    fallback_annual_dividend: float = 0.0,
    holding_period_years: float = 1.0,
) -> float:
    shares = _to_float(shares)
    fallback_annual_dividend = _to_float(fallback_annual_dividend)

    try:
        if dividends_series is not None and not dividends_series.empty:
            filtered = dividends_series
            parsed_purchase_date = _parse_date(purchase_date)
            if parsed_purchase_date is not None:
                filtered = filtered[filtered.index.tz_localize(None) >= parsed_purchase_date] if getattr(filtered.index, "tz", None) is not None else filtered[filtered.index >= parsed_purchase_date]
            total = float(filtered.sum()) * shares
            return round(max(total, 0.0), 2)
    except Exception:
        pass

    estimate = shares * fallback_annual_dividend * max(_to_float(holding_period_years, 1.0), 0.0)
    return round(max(estimate, 0.0), 2)


def calculate_investor_returns(
    *,
    shares: float,
    purchase_price: float,
    current_price: float,
    total_dividends: float = 0.0,
    holding_period_years: float = 1.0,
    inflation_rate_pct: float = 3.0,
    transaction_cost_rate_pct: float = 0.25,
    fixed_transaction_cost: float = 0.0,
    explicit_transaction_costs: Optional[float] = None,
) -> dict:
    shares = _to_float(shares)
    purchase_price = _to_float(purchase_price)
    current_price = _to_float(current_price)
    total_dividends = _to_float(total_dividends)
    holding_period_years = max(_to_float(holding_period_years, 1.0), 1 / 365.25)
    inflation_rate_pct = max(_to_float(inflation_rate_pct), 0.0)
    transaction_cost_rate_pct = max(_to_float(transaction_cost_rate_pct), 0.0)
    fixed_transaction_cost = max(_to_float(fixed_transaction_cost), 0.0)

    purchase_value = shares * purchase_price
    market_value = shares * current_price
    capital_gain = market_value - purchase_value

    if explicit_transaction_costs is None:
        transaction_costs = ((purchase_value + market_value) * transaction_cost_rate_pct / 100.0) + fixed_transaction_cost
    else:
        transaction_costs = _to_float(explicit_transaction_costs)

    gross_return = capital_gain + total_dividends
    total_return = gross_return - transaction_costs
    total_return_pct = (total_return / purchase_value * 100.0) if purchase_value > 0 else 0.0

    inflation_factor = (1 + inflation_rate_pct / 100.0) ** holding_period_years
    inflation_impact = purchase_value * (inflation_factor - 1)
    real_return = total_return - inflation_impact
    real_return_pct = (real_return / purchase_value * 100.0) if purchase_value > 0 else 0.0

    annualized_return_pct = 0.0
    real_annualized_return_pct = 0.0
    if purchase_value > 0:
        ending_multiple = (purchase_value + total_return) / purchase_value
        real_multiple = (purchase_value + total_return) / (purchase_value * inflation_factor)

        if ending_multiple > 0:
            annualized_return_pct = ((ending_multiple ** (1 / holding_period_years)) - 1) * 100.0
        if real_multiple > 0:
            real_annualized_return_pct = ((real_multiple ** (1 / holding_period_years)) - 1) * 100.0

    return {
        "purchase_value": round(purchase_value, 2),
        "market_value": round(market_value, 2),
        "capital_gain": round(capital_gain, 2),
        "dividend_income": round(total_dividends, 2),
        "transaction_costs": round(transaction_costs, 2),
        "gross_return": round(gross_return, 2),
        "total_return": round(total_return, 2),
        "total_return_pct": round(total_return_pct, 2),
        "inflation_impact": round(inflation_impact, 2),
        "real_return": round(real_return, 2),
        "real_return_pct": round(real_return_pct, 2),
        "annualized_return_pct": round(annualized_return_pct, 2),
        "real_annualized_return_pct": round(real_annualized_return_pct, 2),
        "holding_period_years": round(holding_period_years, 2),
    }
