from assistive_ai import (
    AssistiveBriefRequest,
    build_assistive_brief,
    build_news_impact_brief,
)


def test_build_assistive_brief_includes_grounded_sections():
    payload = AssistiveBriefRequest(
        symbol="AAPL",
        analysis={
            "recommendation": {"action": "buy", "confidence": "High"},
            "valuations": {
                "dcf": {"upside": 12.3},
                "comparable": {"upside": 8.1},
            },
            "technical_analysis": {
                "rsi": 62.5,
                "support": 180.0,
                "resistance": 205.0,
            },
        },
    )

    brief = build_assistive_brief(payload)

    assert brief["symbol"] == "AAPL"
    assert "Buy" in brief["summary"]
    assert brief["confidence"] == "High"
    assert len(brief["evidence"]) >= 3
    assert len(brief["risks"]) >= 1
    assert len(brief["next_actions"]) == 3
    assert brief["disclaimer"]


def test_build_assistive_brief_handles_missing_analysis():
    payload = AssistiveBriefRequest(symbol="MSFT")

    brief = build_assistive_brief(payload)

    assert brief["symbol"] == "MSFT"
    assert len(brief["evidence"]) == 1
    assert "No structured analysis payload" in brief["evidence"][0]


def test_build_news_impact_brief_generates_structured_response():
    articles = [
        {"title": "Stock rallies after strong guidance", "sentiment": "positive"},
        {"title": "Analysts cautious on margins", "sentiment": "negative"},
        {"title": "New product launch expected", "sentiment": "positive"},
    ]

    brief = build_news_impact_brief("AAPL", articles)

    assert brief["symbol"] == "AAPL"
    assert brief["overall_sentiment"] in {"positive", "negative", "neutral"}
    assert len(brief["evidence"]) >= 2
    assert len(brief["next_actions"]) == 3
    assert len(brief["headlines"]) == 3
