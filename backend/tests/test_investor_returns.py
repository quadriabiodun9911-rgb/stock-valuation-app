import asyncio
from types import SimpleNamespace

import pytest

import main
from returns_calculator import calculate_investor_returns


def test_calculate_investor_returns_includes_dividends_fees_and_inflation():
    result = calculate_investor_returns(
        shares=10,
        purchase_price=100.0,
        current_price=120.0,
        total_dividends=50.0,
        holding_period_years=2.0,
        inflation_rate_pct=5.0,
        transaction_cost_rate_pct=1.0,
    )

    assert result["purchase_value"] == pytest.approx(1000.0)
    assert result["market_value"] == pytest.approx(1200.0)
    assert result["capital_gain"] == pytest.approx(200.0)
    assert result["dividend_income"] == pytest.approx(50.0)
    assert result["transaction_costs"] == pytest.approx(22.0)
    assert result["total_return"] == pytest.approx(228.0)
    assert result["total_return_pct"] == pytest.approx(22.8)
    assert result["inflation_impact"] == pytest.approx(102.5)
    assert result["real_return"] == pytest.approx(125.5)
    assert result["real_return_pct"] == pytest.approx(12.55)


def test_calculate_investor_returns_handles_flat_position():
    result = calculate_investor_returns(
        shares=5,
        purchase_price=50.0,
        current_price=50.0,
        total_dividends=0.0,
        holding_period_years=1.0,
        inflation_rate_pct=0.0,
        transaction_cost_rate_pct=0.0,
    )

    assert result["total_return"] == pytest.approx(0.0)
    assert result["real_return"] == pytest.approx(0.0)
    assert result["annualized_return_pct"] == pytest.approx(0.0)


def test_calculate_investor_returns_includes_tax_impact_fields():
    result = calculate_investor_returns(
        shares=10,
        purchase_price=100.0,
        current_price=120.0,
        total_dividends=0.0,
        holding_period_years=1.0,
        inflation_rate_pct=0.0,
        transaction_cost_rate_pct=0.0,
        capital_gains_tax_rate_pct=10.0,
    )

    assert result["total_return"] == pytest.approx(200.0)
    assert result["tax_impact"] == pytest.approx(20.0)
    assert result["after_tax_return"] == pytest.approx(180.0)
    assert result["real_after_tax_return"] == pytest.approx(180.0)
    assert isinstance(result["opportunities"], list)
    assert any(item["title"] == "Improve Tax Efficiency" for item in result["opportunities"])


def test_get_portfolio_handles_rate_limited_market_data(monkeypatch):
    fake_portfolio = SimpleNamespace(
        positions=[SimpleNamespace(symbol="AAPL", shares=2, cost_basis=150.0)],
        cash=100.0,
        last_updated="2026-04-16T00:00:00",
    )

    monkeypatch.setattr(main, "_load_portfolio_data", lambda: fake_portfolio)
    monkeypatch.setattr(main.db, "get_transactions", lambda user_id=1: [])

    def raise_rate_limit(*args, **kwargs):
        raise Exception("Too Many Requests")

    monkeypatch.setattr(main.valuation_service, "get_stock_data", raise_rate_limit)

    result = asyncio.run(main.get_portfolio())

    assert result["summary"]["total_cost"] == pytest.approx(300.0)
    assert result["summary"]["total_equity"] == pytest.approx(400.0)
    assert result["positions"][0]["current_price"] == pytest.approx(150.0)
    assert result["positions"][0]["real_return_pct"] <= result["positions"][0]["total_return_pct"]
