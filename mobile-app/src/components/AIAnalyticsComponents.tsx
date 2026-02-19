/**
 * AI Analytics Components Library
 * React components for displaying AI-powered stock analytics
 */

import React, { useEffect, useState } from 'react';

// ============= PREDICTION CARD =============

export function PredictionCard({ 
  symbol, 
  onApiCall 
}: { 
  symbol: string;
  onApiCall: (symbol: string) => Promise<any>;
}) {
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        setLoading(true);
        const res = await onApiCall(symbol);
        setPrediction(res);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPrediction();
  }, [symbol, onApiCall]);

  if (loading) {
    return <div className="ai-card loading">Loading predictions...</div>;
  }

  if (error) {
    return <div className="ai-card error">Error: {error}</div>;
  }

  if (!prediction) {
    return <div className="ai-card">No data available</div>;
  }

  const getRecommendationColor = (recommendation: string) => {
    if (recommendation.includes('BUY')) return '#10b981';
    if (recommendation.includes('SELL')) return '#ef4444';
    return '#f59e0b';
  };

  return (
    <div className="ai-card prediction-card">
      <div className="card-header">
        <h3>{symbol} Price Prediction</h3>
        <span 
          className="recommendation-badge"
          style={{ backgroundColor: getRecommendationColor(prediction.recommendation) }}
        >
          {prediction.recommendation}
        </span>
      </div>

      <div className="card-content">
        <div className="metric-row">
          <span className="label">Current Price:</span>
          <span className="value">${prediction.current_price.toFixed(2)}</span>
        </div>

        <div className="predictions-grid">
          <div className="prediction-item">
            <span className="timeframe">1 Month</span>
            <span className="price">${prediction.predictions['1_month'].toFixed(2)}</span>
          </div>
          <div className="prediction-item">
            <span className="timeframe">3 Months</span>
            <span className="price">${prediction.predictions['3_months'].toFixed(2)}</span>
          </div>
          <div className="prediction-item">
            <span className="timeframe">6 Months</span>
            <span className="price">${prediction.predictions['6_months'].toFixed(2)}</span>
          </div>
          <div className="prediction-item">
            <span className="timeframe">1 Year</span>
            <span className="price">${prediction.predictions['1_year'].toFixed(2)}</span>
          </div>
        </div>

        <div className="metrics-section">
          <div className="metric">
            <span className="label">Upside Potential:</span>
            <span className="value positive">{prediction.upside.toFixed(1)}%</span>
          </div>
          <div className="metric">
            <span className="label">Downside Risk:</span>
            <span className="value negative">{prediction.downside.toFixed(1)}%</span>
          </div>
          <div className="metric">
            <span className="label">Confidence:</span>
            <span className="value">{(prediction.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="reasoning-section">
          <h4>Analysis Reasoning:</h4>
          <ul>
            {prediction.reasoning.map((reason: string, idx: number) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============= TECHNICAL ANALYSIS CARD =============

export function TechnicalAnalysisCard({
  symbol,
  technical
}: {
  symbol: string;
  technical: any;
}) {
  const getRSIStatus = (rsi: number) => {
    if (rsi > 70) return { text: 'Overbought', color: '#ef4444' };
    if (rsi < 30) return { text: 'Oversold', color: '#10b981' };
    return { text: 'Neutral', color: '#f59e0b' };
  };

  const rsiStatus = getRSIStatus(technical.rsi);

  return (
    <div className="ai-card technical-card">
      <h3>{symbol} Technical Analysis</h3>

      <div className="technical-grid">
        <div className="tech-item">
          <span className="label">RSI (14)</span>
          <div className="rsi-bar">
            <div 
              className="rsi-indicator"
              style={{ 
                left: `${technical.rsi}%`,
                backgroundColor: rsiStatus.color
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8em' }}>
            <span>0</span>
            <span style={{ color: rsiStatus.color, fontWeight: 'bold' }}>
              {technical.rsi.toFixed(1)} - {rsiStatus.text}
            </span>
            <span>100</span>
          </div>
        </div>

        <div className="tech-item">
          <span className="label">MACD Signal</span>
          <span 
            className="signal-badge"
            style={{
              backgroundColor: technical.macd === 'BULLISH' ? '#10b981' : 
                             technical.macd === 'BEARISH' ? '#ef4444' : '#f59e0b'
            }}
          >
            {technical.macd}
          </span>
        </div>

        <div className="tech-item">
          <span className="label">Trend</span>
          <span className="trend-value">{technical.trend}</span>
        </div>

        <div className="tech-item">
          <span className="label">Momentum</span>
          <div className="momentum-bar">
            <div 
              className="momentum-fill"
              style={{ width: `${technical.momentum}%` }}
            />
          </div>
          <span className="momentum-text">{technical.momentum.toFixed(1)}</span>
        </div>
      </div>

      <div className="support-resistance">
        <div className="sr-item">
          <span className="label">Support</span>
          <span className="value">${technical.support.toFixed(2)}</span>
        </div>
        <div className="sr-item">
          <span className="label">Resistance</span>
          <span className="value">${technical.resistance.toFixed(2)}</span>
        </div>
      </div>

      {technical.signals.length > 0 && (
        <div className="signals-list">
          <h4>Active Signals:</h4>
          <ul>
            {technical.signals.map((signal: string, idx: number) => (
              <li key={idx}>📊 {signal}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============= VALUATION CARD =============

export function ValuationCard({
  symbol,
  valuation
}: {
  symbol: string;
  valuation: any;
}) {
  const marginColor = valuation.margin_of_safety > 0 ? '#10b981' : '#ef4444';

  return (
    <div className="ai-card valuation-card">
      <h3>{symbol} Valuation Analysis</h3>

      <div className="valuation-main">
        <div className="valuation-item">
          <span className="label">Current Price</span>
          <span className="price">${valuation.current_price.toFixed(2)}</span>
        </div>

        <div className="valuation-item highlight">
          <span className="label">Intrinsic Value</span>
          <span className="price" style={{ color: '#3b82f6' }}>
            ${valuation.intrinsic_value.toFixed(2)}
          </span>
        </div>

        <div className="valuation-item">
          <span className="label">Margin of Safety</span>
          <span className="percentage" style={{ color: marginColor }}>
            {valuation.margin_of_safety.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="valuation-methods">
        <h4>Valuation Methods:</h4>
        <div className="methods-grid">
          <div className="method">
            <span className="method-name">DCF Method</span>
            <span className="method-value">${valuation.methods.dcf.toFixed(2)}</span>
          </div>
          <div className="method">
            <span className="method-name">Relative Value</span>
            <span className="method-value">${valuation.methods.relative.toFixed(2)}</span>
          </div>
          <div className="method">
            <span className="method-name">Asset-Based</span>
            <span className="method-value">${valuation.methods.asset_based.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="valuation-range">
        <span className="label">Fair Value Range:</span>
        <div className="range-display">
          <span className="range-low">${valuation.valuation_range.lower_bound.toFixed(2)}</span>
          <span className="range-line">—</span>
          <span className="range-high">${valuation.valuation_range.upper_bound.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

// ============= RISK ASSESSMENT CARD =============

export function RiskAssessmentCard({
  symbol,
  risk
}: {
  symbol: string;
  risk: any;
}) {
  const getRiskColor = (level: string) => {
    const colors: { [key: string]: string } = {
      'very_low': '#10b981',
      'low': '#6ee7b7',
      'moderate': '#f59e0b',
      'high': '#f97316',
      'very_high': '#ef4444'
    };
    return colors[level] || '#f59e0b';
  };

  return (
    <div className="ai-card risk-card">
      <h3>{symbol} Risk Assessment</h3>

      <div className="risk-level-main">
        <div 
          className="risk-badge"
          style={{ backgroundColor: getRiskColor(risk.risk_level) }}
        >
          {risk.risk_level.toUpperCase()}
        </div>
        <div className="risk-score-bar">
          <div 
            className="risk-score-fill"
            style={{ 
              width: `${risk.risk_score}%`,
              backgroundColor: getRiskColor(risk.risk_level)
            }}
          />
        </div>
        <span className="risk-score-text">Risk Score: {risk.risk_score.toFixed(1)}/100</span>
      </div>

      <div className="risk-metrics">
        <div className="risk-metric">
          <span className="metric-name">Volatility</span>
          <span className="metric-value">{(risk.volatility * 100).toFixed(2)}%</span>
        </div>
        <div className="risk-metric">
          <span className="metric-name">Max Drawdown</span>
          <span className="metric-value">{(risk.max_drawdown * 100).toFixed(2)}%</span>
        </div>
        <div className="risk-metric">
          <span className="metric-name">Beta</span>
          <span className="metric-value">{risk.beta.toFixed(2)}</span>
        </div>
      </div>

      <div className="risk-metrics">
        <div className="risk-metric">
          <span className="metric-name">VaR (95%)</span>
          <span className="metric-value">{(risk.var_95 * 100).toFixed(2)}%</span>
        </div>
        <div className="risk-metric">
          <span className="metric-name">CVaR (95%)</span>
          <span className="metric-value">{(risk.cvar_95 * 100).toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
}

// ============= RECOMMENDATION CARD =============

export function RecommendationCard({
  symbol,
  recommendation
}: {
  symbol: string;
  recommendation: any;
}) {
  const getActionColor = (action: string) => {
    if (action.includes('BUY')) return '#10b981';
    if (action.includes('SELL')) return '#ef4444';
    return '#f59e0b';
  };

  return (
    <div className="ai-card recommendation-card">
      <div className="rec-header">
        <h3>{symbol}</h3>
        <span 
          className="action-badge"
          style={{ backgroundColor: getActionColor(recommendation.action) }}
        >
          {recommendation.action}
        </span>
      </div>

      <div className="rec-main-metrics">
        <div className="metric-box">
          <span className="label">Target Price</span>
          <span className="value">${recommendation.target_price.toFixed(2)}</span>
        </div>
        <div className="metric-box">
          <span className="label">Stop Loss</span>
          <span className="value" style={{ color: '#ef4444' }}>
            ${recommendation.stop_loss.toFixed(2)}
          </span>
        </div>
        <div className="metric-box">
          <span className="label">Risk/Reward</span>
          <span className="value">{recommendation.risk_reward_ratio.toFixed(2)}:1</span>
        </div>
      </div>

      <div className="confidence-bar">
        <span className="label">Confidence</span>
        <div className="bar">
          <div 
            className="bar-fill"
            style={{ width: `${recommendation.confidence * 100}%` }}
          />
        </div>
        <span className="percentage">{(recommendation.confidence * 100).toFixed(0)}%</span>
      </div>

      <div className="catalysts-risks">
        <div className="section">
          <h4>🚀 Key Catalysts:</h4>
          <ul>
            {recommendation.catalysts.map((catalyst: string, idx: number) => (
              <li key={idx}>{catalyst}</li>
            ))}
          </ul>
        </div>

        <div className="section">
          <h4>⚠️ Key Risks:</h4>
          <ul>
            {recommendation.risks.map((risk: string, idx: number) => (
              <li key={idx}>{risk}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============= STOCK COMPARISON CARD =============

export function StockComparisonCard({
  comparison
}: {
  comparison: any[];
}) {
  return (
    <div className="ai-card comparison-card">
      <h3>Stock Comparison</h3>

      <div className="comparison-table">
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Price</th>
              <th>Upside</th>
              <th>Risk</th>
              <th>Trend</th>
              <th>Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((stock: any, idx: number) => (
              <tr key={idx}>
                <td className="symbol">{stock.symbol}</td>
                <td>${stock.current_price.toFixed(2)}</td>
                <td className={stock.upside_potential > 0 ? 'positive' : 'negative'}>
                  {stock.upside_potential.toFixed(1)}%
                </td>
                <td>{stock.risk_level}</td>
                <td>{stock.trend}</td>
                <td>
                  <span className="rec-badge" style={{
                    backgroundColor: stock.recommendation.includes('BUY') ? '#10b981' : 
                                    stock.recommendation.includes('SELL') ? '#ef4444' : '#f59e0b'
                  }}>
                    {stock.recommendation}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============= MARKET INSIGHTS CARD =============

export function MarketInsightsCard({
  insights
}: {
  insights: any;
}) {
  const getSentimentColor = (sentiment: string) => {
    if (sentiment === 'BULLISH') return '#10b981';
    if (sentiment === 'BEARISH') return '#ef4444';
    return '#f59e0b';
  };

  return (
    <div className="ai-card insights-card">
      <h3>Market Insights</h3>

      <div className="sentiment-section">
        <div 
          className="sentiment-badge"
          style={{ backgroundColor: getSentimentColor(insights.market_sentiment) }}
        >
          {insights.market_sentiment}
        </div>
      </div>

      <div className="insights-metrics">
        <div className="metric">
          <span className="label">Stocks Analyzed</span>
          <span className="value">{insights.stocks_analyzed}</span>
        </div>
        <div className="metric bullish">
          <span className="label">Bullish</span>
          <span className="value">{insights.bullish_count}</span>
        </div>
        <div className="metric bearish">
          <span className="label">Bearish</span>
          <span className="value">{insights.bearish_count}</span>
        </div>
      </div>

      <div className="averages">
        <div className="average">
          <span className="label">Avg Upside</span>
          <span className="value positive">{insights.average_upside.toFixed(1)}%</span>
        </div>
        <div className="average">
          <span className="label">Avg Risk</span>
          <span className="value negative">{insights.average_risk.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

// ============= ANOMALY ALERTS CARD =============

export function AnomalyAlertsCard({
  symbol,
  alerts
}: {
  symbol: string;
  alerts: any[];
}) {
  const getSeverityColor = (severity: string) => {
    const colors: { [key: string]: string } = {
      'LOW': '#10b981',
      'MEDIUM': '#f59e0b',
      'HIGH': '#f97316',
      'CRITICAL': '#ef4444'
    };
    return colors[severity] || '#f59e0b';
  };

  if (!alerts || alerts.length === 0) {
    return (
      <div className="ai-card alerts-card">
        <h3>{symbol} Alerts</h3>
        <p className="no-alerts">✓ No anomalies detected</p>
      </div>
    );
  }

  return (
    <div className="ai-card alerts-card">
      <h3>{symbol} Anomaly Alerts</h3>

      <div className="alerts-list">
        {alerts.map((alert: any, idx: number) => (
          <div key={idx} className="alert-item">
            <div className="alert-header">
              <span className="alert-type">{alert.type}</span>
              <span 
                className="severity"
                style={{ backgroundColor: getSeverityColor(alert.severity) }}
              >
                {alert.severity}
              </span>
            </div>
            <p className="alert-description">{alert.description}</p>
            <div className="alert-action">
              <span className="action-icon">💡</span>
              <span className="action-text">{alert.suggested_action}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============= STYLES =============

const styles = `
  .ai-card {
    background: white;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .ai-card h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
  }

  .ai-card h4 {
    margin: 12px 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
  }

  .metric-row, .metric-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
  }

  .label {
    color: #6b7280;
    font-size: 13px;
    font-weight: 500;
  }

  .value, .price, .percentage {
    font-weight: 600;
    color: #1f2937;
  }

  .positive {
    color: #10b981;
  }

  .negative {
    color: #ef4444;
  }

  .recommendation-badge, .signal-badge, .action-badge {
    padding: 4px 12px;
    border-radius: 4px;
    color: white;
    font-size: 12px;
    font-weight: 600;
  }

  .predictions-grid, .methods-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
    margin: 16px 0;
  }

  .prediction-item, .method {
    background: #f3f4f6;
    padding: 12px;
    border-radius: 6px;
    text-align: center;
  }

  .timeframe, .method-name {
    display: block;
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 4px;
  }

  .price, .method-value {
    display: block;
    font-size: 16px;
    font-weight: 700;
    color: #1f2937;
  }

  .rsi-bar, .momentum-bar, .bar {
    background: #e5e7eb;
    height: 24px;
    border-radius: 4px;
    position: relative;
    margin: 8px 0;
    overflow: hidden;
  }

  .rsi-indicator, .momentum-fill, .bar-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: #3b82f6;
    border-radius: 4px;
    transition: all 0.3s ease;
  }

  .reasoning-section, .catalysts-risks {
    margin-top: 16px;
  }

  .reasoning-section ul, .catalysts-risks ul {
    margin: 8px 0 0 20px;
    padding: 0;
    list-style: none;
  }

  .reasoning-section li, .catalysts-risks li {
    padding: 4px 0;
    color: #374151;
    font-size: 13px;
  }

  .reasoning-section li:before, .catalysts-risks li:before {
    content: "✓ ";
    color: #10b981;
    font-weight: 600;
    margin-right: 6px;
  }

  .comparison-table {
    overflow-x: auto;
    margin-top: 16px;
  }

  .comparison-table table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .comparison-table th {
    background: #f3f4f6;
    padding: 12px 8px;
    text-align: left;
    font-weight: 600;
    color: #374151;
    border-bottom: 1px solid #d1d5db;
  }

  .comparison-table td {
    padding: 12px 8px;
    border-bottom: 1px solid #e5e7eb;
  }

  .comparison-table .symbol {
    font-weight: 600;
    color: #1f2937;
  }

  .alert-item {
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .alert-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .alert-type {
    font-weight: 600;
    color: #1f2937;
    font-size: 13px;
  }

  .severity {
    padding: 2px 8px;
    border-radius: 3px;
    color: white;
    font-size: 11px;
    font-weight: 600;
  }

  .alert-description {
    margin: 8px 0;
    color: #374151;
    font-size: 13px;
  }

  .alert-action {
    display: flex;
    align-items: center;
    font-size: 12px;
    color: #6b7280;
  }

  .action-icon {
    margin-right: 8px;
  }

  .loading, .error {
    text-align: center;
    padding: 40px 20px;
    color: #6b7280;
  }

  .error {
    background: #fee2e2;
    color: #991b1b;
    border-radius: 6px;
  }

  @media (max-width: 640px) {
    .predictions-grid, .methods-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .comparison-table {
      font-size: 12px;
    }

    .comparison-table th, .comparison-table td {
      padding: 8px 4px;
    }
  }
`;

// Export styles as default
export const aiComponentStyles = styles;
