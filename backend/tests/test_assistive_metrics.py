import database as db


def test_assistive_feedback_and_metrics_flow():
    feedback = db.add_assistive_feedback(
        brief_type="valuation",
        helpful=True,
        symbol="AAPL",
        comment="Clear and useful",
    )
    assert feedback["brief_type"] == "valuation"
    assert feedback["helpful"] is True

    event = db.add_assistive_event(
        event_name="assistive_valuation_brief_generated",
        symbol="AAPL",
        metadata={"used_ai": False},
    )
    assert event["event_name"] == "assistive_valuation_brief_generated"

    metrics = db.get_assistive_metrics()
    assert metrics["total_feedback"] >= 1
    assert metrics["total_events"] >= 1
    assert "feedback_breakdown" in metrics
    assert "event_breakdown" in metrics

    dashboard = db.get_assistive_dashboard_metrics(days=30)
    assert dashboard["window_days"] == 30
    assert "feedback_by_symbol" in dashboard
    assert "feedback_by_day" in dashboard
    assert "events_by_symbol" in dashboard
    assert "events_by_day" in dashboard
