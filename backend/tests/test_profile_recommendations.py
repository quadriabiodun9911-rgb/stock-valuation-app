import asyncio

import main


def test_profile_recommendations_for_wealth_builder_prioritizes_long_term_assets():
    result = asyncio.run(
        main.get_profile_recommendations(
            market="US",
            limit=3,
            persona="wealth_builder",
            riskTolerance="medium",
            primaryGoal="long_term_growth",
            timeHorizon="long",
        )
    )

    assert result["market"] == "US"
    assert result["persona"] == "wealth_builder"
    assert len(result["recommendations"]) == 3
    assert all("fitScore" in rec for rec in result["recommendations"])
    assert all(rec["horizon"] == "long" for rec in result["recommendations"])


def test_profile_recommendations_for_beginner_protector_include_low_risk_assets():
    result = asyncio.run(
        main.get_profile_recommendations(
            market="US",
            limit=5,
            persona="beginner_protector",
            riskTolerance="low",
            primaryGoal="avoid_losses",
            timeHorizon="long",
        )
    )

    assert len(result["recommendations"]) == 5
    assert any(rec["riskLevel"] == "low" for rec in result["recommendations"])
    assert all(len(rec["reasons"]) >= 1 for rec in result["recommendations"])
