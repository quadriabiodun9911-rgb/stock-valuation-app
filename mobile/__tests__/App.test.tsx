import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import App from '../App';

jest.mock('../src/services/api', () => {
    const buildStockInfo = (symbol: string) => ({
        symbol,
        company_name: `${symbol} Inc.`,
        current_price: 150,
        market_cap: 2_000_000_000_000,
        pe_ratio: 22,
        sector: 'Technology',
        industry: 'Software',
        dividend_yield: 0,
        '52_week_high': 180,
        '52_week_low': 120,
        beta: 1.1,
        volume: 10_000_000,
        avg_volume: 8_000_000,
    });

    return {
        stockAPI: {
            getStockInfo: jest.fn(async (symbol: string) => buildStockInfo(symbol)),
            searchStocks: jest.fn(async (query: string, limit: number) => ({
                query,
                results: [],
            })),
            calculateDCF: jest.fn(async () => ({
                symbol: 'AAPL',
                current_price: 150,
                intrinsic_value: 165,
                upside_percentage: 10,
                enterprise_value: 2_200_000_000_000,
                equity_value: 2_100_000_000_000,
                terminal_value: 1_800_000_000_000,
                projected_fcf: [100, 110, 120],
                pv_fcf: [90, 95, 100],
                assumptions: {
                    growth_rate: 0.08,
                    discount_rate: 0.1,
                    terminal_growth_rate: 0.03,
                },
                confidence_level: 'medium',
            })),
            getComparableAnalysis: jest.fn(async () => ({
                symbol: 'AAPL',
                current_price: 150,
                implied_valuations: {
                    pe_valuation: 160,
                    pb_valuation: 155,
                    ps_valuation: 158,
                },
                average_valuation: 158,
                upside_percentage: 5,
                peer_averages: {
                    pe_ratio: 20,
                    pb_ratio: 5,
                    ps_ratio: 6,
                    ev_ebitda: 15,
                },
                peer_symbols: ['MSFT', 'GOOGL'],
                target_metrics: {
                    pe_ratio: 22,
                    pb_ratio: 5.5,
                    ps_ratio: 6.2,
                    ev_ebitda: 16,
                },
                confidence_level: 'medium',
            })),
            getTechnicalAnalysis: jest.fn(async () => ({
                symbol: 'AAPL',
                current_price: 150,
                moving_averages: {
                    sma_20: 148,
                    sma_50: 145,
                    sma_200: 140,
                    ema_12: 149,
                    ema_26: 147,
                },
                momentum_indicators: {
                    rsi: 55,
                    macd: 1.2,
                    macd_signal: 1.0,
                    macd_histogram: 0.2,
                },
                volatility_indicators: {
                    bollinger_upper: 160,
                    bollinger_middle: 150,
                    bollinger_lower: 140,
                },
                support_resistance: {
                    resistance: 165,
                    support: 135,
                },
                signals: [],
            })),
            getPriceEpsSeries: jest.fn(async (symbol: string, period: string) => ({
                symbol,
                period,
                points: [
                    { date: '2024-01-01', price: 140, eps: 5 },
                    { date: '2024-02-01', price: 145, eps: 5.1 },
                    { date: '2024-03-01', price: 150, eps: 5.2 },
                ],
            })),
            getFinancialGrowthMetrics: jest.fn(async (symbol: string, period: string) => ({
                symbol,
                period,
                growth: {
                    revenue_growth: 0.1,
                    earnings_growth: 0.12,
                    price_growth: 0.08,
                    debt_to_equity_growth: -0.02,
                    eps_growth: 0.11,
                },
            })),
            getComprehensiveAnalysis: jest.fn(async (symbol: string) => ({
                symbol,
                timestamp: new Date().toISOString(),
                current_price: 150,
                valuations: {
                    dcf: { intrinsic_value: 165, upside: 10, confidence: 'medium' },
                    comparable: { average_valuation: 158, upside: 5, confidence: 'medium' },
                },
                technical_analysis: {
                    signals: [],
                    rsi: 55,
                    support: 135,
                    resistance: 165,
                },
                recommendation: {
                    action: 'Hold',
                    confidence: 'medium',
                    reasoning: 'Stable fundamentals with moderate upside.',
                },
            })),
            getPortfolio: jest.fn(async () => ({
                positions: [
                    {
                        symbol: 'DANGCEM.NG',
                        shares: 10,
                        cost_basis: 290,
                        current_price: 310,
                        market_value: 3100,
                        cost_value: 2900,
                        profit: 200,
                        profit_pct: 6.9,
                        sector: 'Materials',
                    },
                ],
                cash: 1500,
                summary: {
                    total_value: 3100,
                    total_cost: 2900,
                    total_profit: 200,
                    total_profit_pct: 6.9,
                    total_equity: 4600,
                    best_performer: {
                        symbol: 'DANGCEM.NG',
                        shares: 10,
                        cost_basis: 290,
                        current_price: 310,
                        market_value: 3100,
                        cost_value: 2900,
                        profit: 200,
                        profit_pct: 6.9,
                        sector: 'Materials',
                    },
                    worst_performer: {
                        symbol: 'DANGCEM.NG',
                        shares: 10,
                        cost_basis: 290,
                        current_price: 310,
                        market_value: 3100,
                        cost_value: 2900,
                        profit: 200,
                        profit_pct: 6.9,
                        sector: 'Materials',
                    },
                },
                performance: {
                    monthly: { profit: 120, profit_pct: 2.6 },
                    quarterly: { profit: 180, profit_pct: 4.1 },
                    ytd: { profit: 200, profit_pct: 6.9 },
                },
                risk: {
                    volatility: 0.22,
                    risk_score: 5.4,
                    max_drawdown: -0.08,
                },
                allocation: {
                    by_sector: [{ name: 'Materials', value: 1 }],
                    by_symbol: [{ symbol: 'DANGCEM.NG', value: 1 }],
                },
                last_updated: new Date().toISOString(),
            })),
            updatePortfolio: jest.fn(async () => ({
                status: 'updated',
                last_updated: new Date().toISOString(),
            })),
            getNgxMarketSummary: jest.fn(async () => ({
                quotes: [
                    {
                        symbol: 'DANGCEM.NG',
                        name: 'Dangote Cement',
                        price: 310,
                        change_pct: 1.4,
                        volume: 120000,
                        sector: 'Materials',
                    },
                ],
                gainers: [
                    {
                        symbol: 'DANGCEM.NG',
                        name: 'Dangote Cement',
                        price: 310,
                        change_pct: 1.4,
                        volume: 120000,
                        sector: 'Materials',
                    },
                ],
                losers: [
                    {
                        symbol: 'DANGCEM.NG',
                        name: 'Dangote Cement',
                        price: 310,
                        change_pct: -0.8,
                        volume: 120000,
                        sector: 'Materials',
                    },
                ],
                volume_leaders: [
                    {
                        symbol: 'DANGCEM.NG',
                        name: 'Dangote Cement',
                        price: 310,
                        change_pct: 1.4,
                        volume: 120000,
                        sector: 'Materials',
                    },
                ],
                sectors: [
                    { sector: 'Materials', avg_change_pct: 1.4, count: 1 },
                ],
                source_symbols: ['DANGCEM.NG'],
                last_updated: new Date().toISOString(),
            })),
            getNgxMarketAlerts: jest.fn(async () => ({
                locked: true,
                message: 'Premium required for alerts.',
                alerts: [],
            })),
            getNgxMarketRankings: jest.fn(async () => ({
                rankings: {
                    momentum: [{ symbol: 'DANGCEM.NG', score: 4.2 }],
                    dividend: [{ symbol: 'ZENITHBANK.NG', score: 6.1 }],
                    value: [{ symbol: 'GTCO.NG', score: 0.08 }],
                },
                source_symbols: ['DANGCEM.NG'],
                last_updated: new Date().toISOString(),
            })),
            getIntrinsicValue: jest.fn(async () => ({
                symbol: 'DANGCEM.NG',
                market_price: 310,
                intrinsic_value: 420,
                margin_of_safety: 26.2,
                signal: 'Undervalued',
            })),
        },
    };
});

describe('App', () => {
    it('renders without crashing', async () => {
        const { getByTestId } = render(<App />);

        await waitFor(() => {
            expect(getByTestId('app-root')).toBeTruthy();
        });
    });
});
