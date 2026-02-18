# Add this code to main.py after the last endpoint

@app.get("/smart-strategy")
async def get_smart_strategy(symbols: Optional[str] = None):
    """
    Professional hedge fund strategy: Value + Quality + Momentum.
    Returns scored stocks with BUY/HOLD/SELL recommendations.
    """
    # Default Nigerian stocks if none provided
    if symbols:
        symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    else:
        symbol_list = [
            "DANGCEM.NG", "ZENITHBANK.NG", "BUACEMENT.NG", "MTNN.NG",
            "NESTLE.NG", "GTCO.NG", "FBNH.NG", "UBA.NG", "SEPLAT.NG",
            "AIRTELAFRI.NG", "STANBIC.NG", "FLOURMILL.NG", "NB.NG",
            "ACCESSCORP.NG", "WAPCO.NG", "BUAFOODS.NG", "GUINNESS.NG"
        ]

    results = []

    for symbol in symbol_list:
        try:
            stock = yf.Ticker(symbol)
            info = stock.info
            hist = stock.history(period="1y")
            
            if hist.empty or 'currentPrice' not in info:
                continue

            current_price = info.get('currentPrice', info.get('regularMarketPrice', 0))
            if current_price == 0:
                continue

            # Layer 1: Value Score
            value_score = _calculate_value_score(info, current_price)
            
            # Layer 2: Quality Score
            quality_score = _calculate_quality_score(info)
            
            # Layer 3: Momentum Score
            momentum_score = _calculate_momentum_score(hist, current_price)
            
            # Overall score (weighted average)
            overall_score = (value_score * 0.4 + quality_score * 0.3 + momentum_score * 0.3)
            
            # Recommendation logic
            recommendation = _get_recommendation(value_score, quality_score, momentum_score, overall_score)
            
            # Confidence level
            confidence = _get_confidence_level(value_score, quality_score, momentum_score)
            
            # Position allocation (risk-adjusted)
            allocation = _calculate_allocation(overall_score, recommendation)
            
            # Calculate metrics for detail view
            intrinsic_value = _estimate_intrinsic_value(info, current_price)
            discount = ((intrinsic_value - current_price) / intrinsic_value * 100) if intrinsic_value > 0 else 0
            
            # Moving averages
            ma50 = hist['Close'].rolling(window=50).mean().iloc[-1] if len(hist) >= 50 else current_price
            ma200 = hist['Close'].rolling(window=200).mean().iloc[-1] if len(hist) >= 200 else current_price
            
            # Relative strength (price performance vs 1Y ago)
            year_ago_price = hist['Close'].iloc[0] if len(hist) > 0 else current_price
            relative_strength = ((current_price - year_ago_price) / year_ago_price * 100) if year_ago_price > 0 else 0

            results.append({
                "symbol": symbol.replace('.NG', ''),
                "companyName": info.get('longName', info.get('shortName', symbol)),
                "currentPrice": round(current_price, 2),
                "valueScore": round(value_score, 0),
                "qualityScore": round(quality_score, 0),
                "momentumScore": round(momentum_score, 0),
                "overallScore": round(overall_score, 0),
                "recommendation": recommendation,
                "confidence": confidence,
                "allocation": allocation,
                "intrinsicValue": round(intrinsic_value, 2),
                "discountToFairValue": round(discount, 1),
                "ma50": round(ma50, 2),
                "ma200": round(ma200, 2),
                "relativeStrength": round(relative_strength, 1),
                "fcfPositive": info.get('freeCashflow', 0) > 0,
                "revenueGrowth": info.get('revenueGrowth', 0) * 100 if info.get('revenueGrowth') else 0,
                "debtRatio": _calculate_debt_ratio(info),
                "profitMargin": info.get('profitMargins', 0) * 100 if info.get('profitMargins') else 0,
            })

        except Exception as e:
            logger.error(f"Error analyzing {symbol}: {str(e)}")
            continue

    # Sort by overall score (descending)
    results.sort(key=lambda x: x['overallScore'], reverse=True)

    return {
        "stocks": results,
        "total": len(results),
        "last_updated": datetime.now().isoformat(),
    }

def _calculate_value_score(info: dict, current_price: float) -> float:
    """Calculate value score based on price vs intrinsic value."""
    try:
        intrinsic_value = _estimate_intrinsic_value(info, current_price)
        if intrinsic_value <= 0:
            return 0
        
        discount = ((intrinsic_value - current_price) / intrinsic_value) * 100
        
        if discount >= 50:
            score = 100
        elif discount >= 30:
            score = 80 + (discount - 30) * 1.0
        elif discount >= 20:
            score = 60 + (discount - 20) * 2.0
        elif discount >= 10:
            score = 40 + (discount - 10) * 2.0
        elif discount >= 0:
            score = 20 + (discount) * 2.0
        else:
            score = max(0, 20 + discount)
        
        return min(100, max(0, score))
    except:
        return 0

def _calculate_quality_score(info: dict) -> float:
    """Calculate quality score based on financial health."""
    try:
        score = 0
        
        # Free cash flow (25 points)
        fcf = info.get('freeCashflow', 0)
        if fcf > 0:
            score += 25
        
        # Revenue growth (25 points)
        revenue_growth = info.get('revenueGrowth', 0)
        if revenue_growth:
            if revenue_growth > 0.20:
                score += 25
            elif revenue_growth > 0.10:
                score += 20
            elif revenue_growth > 0:
                score += 15
        
        # Debt ratio (25 points)
        debt_ratio = _calculate_debt_ratio(info)
        if debt_ratio < 30:
            score += 25
        elif debt_ratio < 50:
            score += 15
        elif debt_ratio < 70:
            score += 10
        
        # Profit margin (25 points)
        profit_margin = info.get('profitMargins', 0)
        if profit_margin:
            if profit_margin > 0.20:
                score += 25
            elif profit_margin > 0.10:
                score += 20
            elif profit_margin > 0:
                score += 15
        
        return min(100, score)
    except:
        return 0

def _calculate_momentum_score(hist: pd.DataFrame, current_price: float) -> float:
    """Calculate momentum score based on technical indicators."""
    try:
        if hist.empty or len(hist) < 50:
            return 0
        
        score = 0
        
        # MA50 (33 points)
        ma50 = hist['Close'].rolling(window=50).mean().iloc[-1]
        if current_price > ma50:
            score += 33
        
        # MA200 (34 points)
        if len(hist) >= 200:
            ma200 = hist['Close'].rolling(window=200).mean().iloc[-1]
            if current_price > ma200:
                score += 34
        else:
            if current_price > ma50:
                score += 17
        
        # Relative strength (33 points)
        year_ago_price = hist['Close'].iloc[0]
        if year_ago_price > 0:
            performance = ((current_price - year_ago_price) / year_ago_price) * 100
            if performance > 20:
                score += 33
            elif performance > 10:
                score += 25
            elif performance > 0:
                score += 15
        
        return min(100, score)
    except:
        return 0

def _estimate_intrinsic_value(info: dict, current_price: float) -> float:
    """Estimate intrinsic value using simple PE-based method."""
    try:
        forward_pe = info.get('forwardPE', 0)
        trailing_pe = info.get('trailingPE', 0)
        eps = info.get('trailingEps', 0)
        
        if forward_pe and forward_pe > 0 and forward_pe < 100:
            fair_pe = min(forward_pe * 0.8, 20)
            if eps > 0:
                return eps * fair_pe
        
        if trailing_pe and trailing_pe > 0 and trailing_pe < 100:
            fair_pe = min(trailing_pe * 0.85, 20)
            if eps > 0:
                return eps * fair_pe
        
        book_value = info.get('bookValue', 0)
        if book_value > 0:
            return book_value * 1.2
        
        return current_price * 1.15
    except:
        return current_price * 1.15

def _get_recommendation(value_score: float, quality_score: float, momentum_score: float, overall_score: float) -> str:
    """Determine BUY/HOLD/SELL/AVOID recommendation."""
    if value_score >= 60 and quality_score >= 60 and momentum_score >= 60:
        return "BUY"
    
    passes = sum([value_score >= 60, quality_score >= 60, momentum_score >= 60])
    if passes >= 2 and overall_score >= 55:
        return "HOLD"
    
    if value_score >= 70 and overall_score >= 45:
        return "HOLD"
    
    if overall_score < 40:
        return "AVOID"
    
    return "SELL"

def _get_confidence_level(value_score: float, quality_score: float, momentum_score: float) -> str:
    """Determine confidence level based on score consistency."""
    avg_score = (value_score + quality_score + momentum_score) / 3
    std_dev = np.std([value_score, quality_score, momentum_score])
    
    if avg_score >= 70 and std_dev < 15:
        return "HIGH"
    
    if avg_score >= 50 or std_dev < 20:
        return "MEDIUM"
    
    return "LOW"

def _calculate_allocation(overall_score: float, recommendation: str) -> float:
    """Calculate suggested portfolio allocation (%)."""
    if recommendation == "AVOID" or recommendation == "SELL":
        return 0.0
    
    if recommendation == "HOLD":
        return min(5.0, overall_score / 20)
    
    base_allocation = overall_score / 10
    
    return min(10.0, max(3.0, base_allocation))
