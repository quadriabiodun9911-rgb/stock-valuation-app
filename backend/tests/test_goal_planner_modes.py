import asyncio

import main


def test_goal_planner_supports_12_week_mode():
    req = main.GoalPlannerRequest(
        mode="12_week",
        targetAmount=2000,
        currentSavings=500,
        weeklyContribution=100,
        annualReturn=8,
        weeks=12,
        years=20,
        monthlyContribution=500,
        inflationRate=3,
    )

    result = asyncio.run(main.goal_planner(req))

    assert result["mode"] == "12_week"
    assert "weeklyProjection" in result
    assert len(result["weeklyProjection"]) == 12
    assert "requiredWeekly" in result
    assert "progressPercent" in result


def test_goal_planner_supports_long_term_mode():
    req = main.GoalPlannerRequest(
        mode="long_term",
        targetAmount=100000,
        currentSavings=5000,
        monthlyContribution=500,
        annualReturn=10,
        years=5,
        inflationRate=3,
    )

    result = asyncio.run(main.goal_planner(req))

    assert result["mode"] == "long_term"
    assert "yearlyProjection" in result
    assert len(result["yearlyProjection"]) == 5
    assert "requiredMonthly" in result
