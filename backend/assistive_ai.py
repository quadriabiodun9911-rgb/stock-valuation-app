"""Assistive AI endpoints for grounded valuation explanations."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from ai_service import advisor
from news_integration import _get_news
import database as db


router = APIRouter(prefix="/api/assistive", tags=["assistive-ai"])


class AssistiveBriefRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=10)
    analysis: Optional[Dict[str, Any]] = None
    risk_profile: Optional[str] = None
    time_horizon: Optional[str] = None


class AssistiveBriefResponse(BaseModel):
    symbol: str
    summary: str
    evidence: List[str]
    risks: List[str]
    next_actions: List[str]
    confidence: str
    used_ai: bool
    disclaimer: str


class AssistiveNewsImpactRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=10)
    limit: int = Field(6, ge=3, le=12)


class AssistiveNewsImpactResponse(BaseModel):
    symbol: str
    summary: str
    overall_sentiment: str
    evidence: List[str]
    risks: List[str]
    next_actions: List[str]
    headlines: List[str]
    used_ai: bool
    disclaimer: str


class AssistiveFeedbackRequest(BaseModel):
    symbol: Optional[str] = None
    brief_type: str = Field(..., min_length=1, max_length=40)
    helpful: bool
    comment: Optional[str] = Field(None, max_length=300)


class AssistiveEventRequest(BaseModel):
    event_name: str = Field(..., min_length=1, max_length=80)
    symbol: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


def build_assistive_brief(payload: AssistiveBriefRequest) -> Dict[str, Any]:
    """Create a deterministic valuation brief from known analysis fields."""
    analysis = payload.analysis or {}
    recommendation = analysis.get("recommendation", {})
    valuations = analysis.get("valuations", {})
    technical = analysis.get("technical_analysis", {})

    action = str(recommendation.get("action", "Watch")).title()
    confidence = str(recommendation.get("confidence", "Medium"))

    dcf = valuations.get("dcf", {})
    comparable = valuations.get("comparable", {})
    dcf_upside = dcf.get("upside")
    comparable_upside = comparable.get("upside")
    rsi = technical.get("rsi")
    support = technical.get("support")
    resistance = technical.get("resistance")

    evidence: List[str] = []
    risks: List[str] = []
    next_actions: List[str] = []

    if dcf_upside is not None:
        evidence.append(f"DCF upside estimate: {float(dcf_upside):+.1f}%")
    if comparable_upside is not None:
        evidence.append(
            f"Comparable valuation upside: {float(comparable_upside):+.1f}%"
        )
    if rsi is not None:
        evidence.append(f"RSI currently at {float(rsi):.1f}")
    if support is not None and resistance is not None:
        evidence.append(
            "Technical range: "
            f"support ${float(support):.2f}, "
            f"resistance ${float(resistance):.2f}"
        )

    if dcf_upside is not None and float(dcf_upside) < 0:
        risks.append("Intrinsic value estimate is below current market price.")
    if comparable_upside is not None and float(comparable_upside) < 0:
        risks.append("Peer-based valuation indicates limited upside.")
    if rsi is not None and float(rsi) > 70:
        risks.append(
            "Momentum is overbought; "
            "short-term pullback risk is elevated."
        )
    if rsi is not None and float(rsi) < 30:
        risks.append("Momentum is oversold; volatility can remain high.")
    if not risks:
        risks.append(
            "Market regime can shift; "
            "re-check thesis after major news or earnings."
        )

    if action.lower() == "buy":
        next_actions.extend(
            [
                "Use staged entries instead of one-time full position sizing.",
                "Set a risk limit using support level "
                "or portfolio max-loss rule.",
                "Revalidate assumptions at next earnings release.",
            ]
        )
    elif action.lower() == "sell":
        next_actions.extend(
            [
                "Review whether valuation downside "
                "is thesis-driven or sentiment-driven.",
                "Reduce exposure in tranches "
                "to avoid poor execution during volatility.",
                "Document re-entry criteria before exiting fully.",
            ]
        )
    else:
        next_actions.extend(
            [
                "Keep on watchlist and wait for stronger valuation "
                "or momentum confirmation.",
                "Track support/resistance behavior "
                "before changing position size.",
                "Set alert thresholds around key technical levels.",
            ]
        )

    persona_line = ""
    if payload.risk_profile or payload.time_horizon:
        persona_line = (
            f" for a {payload.risk_profile or 'balanced'} risk profile "
            f"and {payload.time_horizon or 'medium'} horizon"
        )

    summary = (
        f"{payload.symbol.upper()} currently reads as a "
        f"{action} setup{persona_line}. "
        f"Confidence is {confidence}. "
        "Focus on valuation signals and risk controls together, "
        "not on a single metric."
    )

    return {
        "symbol": payload.symbol.upper(),
        "summary": summary,
        "evidence": evidence or [
            "No structured analysis payload provided; "
            "using conservative guidance."
        ],
        "risks": risks,
        "next_actions": next_actions,
        "confidence": confidence,
        "used_ai": False,
        "disclaimer": "Educational support only. Not financial advice.",
    }


def build_news_impact_brief(
    symbol: str,
    articles: List[dict],
) -> Dict[str, Any]:
    sentiment_count = {"positive": 0, "negative": 0, "neutral": 0}
    headlines: List[str] = []

    for article in articles:
        sentiment = article.get("sentiment", "neutral")
        if sentiment not in sentiment_count:
            sentiment = "neutral"
        sentiment_count[sentiment] += 1
        title = article.get("title")
        if title:
            headlines.append(title)

    total = max(len(articles), 1)
    pos_pct = round(sentiment_count["positive"] / total * 100)
    neg_pct = round(sentiment_count["negative"] / total * 100)

    if sentiment_count["positive"] > sentiment_count["negative"]:
        overall = "positive"
    elif sentiment_count["negative"] > sentiment_count["positive"]:
        overall = "negative"
    else:
        overall = "neutral"

    evidence = [
        f"Analyzed {len(articles)} recent headlines for {symbol.upper()}.",
        f"Positive headlines: {sentiment_count['positive']} ({pos_pct}%).",
        f"Negative headlines: {sentiment_count['negative']} ({neg_pct}%).",
    ]

    risks = [
        "Headline sentiment can reverse quickly "
        "around earnings or macro events.",
        "News tone does not replace valuation and risk management discipline.",
    ]

    if overall == "positive":
        summary = (
            f"Recent news flow for {symbol.upper()} is skewing positive. "
            "Treat this as supportive context, not a standalone buy signal."
        )
        next_actions = [
            "Check whether positive news aligns with valuation upside.",
            "Use staged entries and pre-defined risk limits.",
            "Set alerts for earnings and guidance updates.",
        ]
    elif overall == "negative":
        summary = (
            f"Recent news flow for {symbol.upper()} is skewing negative. "
            "Prioritize downside control and thesis re-validation."
        )
        next_actions = [
            "Reassess support levels and stop-loss discipline.",
            "Review position sizing before adding exposure.",
            "Track catalyst dates that could shift sentiment.",
        ]
    else:
        summary = (
            f"Recent news flow for {symbol.upper()} is balanced. "
            "Wait for a stronger signal from fundamentals and price action."
        )
        next_actions = [
            "Monitor breakout/breakdown levels around support and resistance.",
            "Compare valuation gap before making allocation changes.",
            "Stay watchful for earnings or sector-level catalysts.",
        ]

    return {
        "symbol": symbol.upper(),
        "summary": summary,
        "overall_sentiment": overall,
        "evidence": evidence,
        "risks": risks,
        "next_actions": next_actions,
        "headlines": headlines[:5],
        "used_ai": False,
        "disclaimer": "Educational support only. Not financial advice.",
    }


@router.post("/valuation-brief", response_model=AssistiveBriefResponse)
async def valuation_brief(payload: AssistiveBriefRequest):
    """Return a grounded brief with evidence, risks, and next actions."""
    brief = build_assistive_brief(payload)

    # Optionally refine summary tone via configured AI provider.
    if advisor.enabled:
        base_summary = brief["summary"]
        prompt = (
            "Rewrite this in concise, plain investor language in <=80 words. "
            "Do not add new facts beyond the provided text.\n\n"
            f"Summary: {base_summary}"
        )
        enhanced, _metrics = await advisor.enhance_response(
            question=prompt,
            base_response=base_summary,
            stock_context={
                "symbol": brief["symbol"],
                "evidence": brief["evidence"],
            },
        )
        if enhanced and isinstance(enhanced, str):
            brief["summary"] = enhanced.strip()
            brief["used_ai"] = True

    return brief


@router.post("/news-impact", response_model=AssistiveNewsImpactResponse)
async def news_impact_brief(payload: AssistiveNewsImpactRequest):
    """Return a grounded news impact brief for a stock."""
    articles = _get_news(
        f"{payload.symbol} stock",
        payload.limit,
        symbol=payload.symbol,
    )
    brief = build_news_impact_brief(payload.symbol, articles)

    if advisor.enabled:
        enhanced, _metrics = await advisor.enhance_response(
            question=(
                "Rewrite this in concise plain investor language "
                "without adding new facts."
            ),
            base_response=brief["summary"],
            stock_context={
                "symbol": brief["symbol"],
                "headlines": brief["headlines"],
                "sentiment": brief["overall_sentiment"],
            },
        )
        if enhanced and isinstance(enhanced, str):
            brief["summary"] = enhanced.strip()
            brief["used_ai"] = True

    return brief


@router.post("/feedback")
async def submit_feedback(payload: AssistiveFeedbackRequest):
    """Capture user feedback for assistive brief quality measurement."""
    row = db.add_assistive_feedback(
        brief_type=payload.brief_type,
        helpful=payload.helpful,
        symbol=payload.symbol,
        comment=payload.comment,
    )
    return {"status": "ok", "feedback": row}


@router.post("/event")
async def track_event(payload: AssistiveEventRequest):
    """Capture assistive usage events for product analytics."""
    row = db.add_assistive_event(
        event_name=payload.event_name,
        symbol=payload.symbol,
        metadata=payload.metadata,
    )
    return {"status": "ok", "event": row}


@router.get("/metrics")
async def get_metrics():
    """Return aggregate feedback and usage metrics for assistive features."""
    return db.get_assistive_metrics()


@router.get("/metrics/dashboard")
async def get_metrics_dashboard(days: int = Query(30, ge=1, le=365)):
    """Return grouped assistive metrics by symbol and day."""
    return db.get_assistive_dashboard_metrics(days=days)
