// API Configuration
import Constants from 'expo-constants';

const resolveApiBaseUrl = () => {
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl) return envUrl;

    const hostUri =
        Constants.expoConfig?.hostUri ||
        Constants.expoConfig?.debuggerHost ||
        Constants.manifest?.hostUri ||
        Constants.manifest?.debuggerHost ||
        Constants.manifest2?.extra?.expoClient?.hostUri;
    if (hostUri) {
        const host = hostUri.split(':')[0];
        return `http://${host}:8000`;
    }

    return 'http://localhost:8000';
};

const API_BASE_URL = resolveApiBaseUrl();

// Export for screens that need the raw URL (e.g. axios calls)
export const API_URL = API_BASE_URL;

export interface StockInfo {
    symbol: string;
    company_name: string;
    current_price: number;
    market_cap: number;
    pe_ratio: number;
    sector: string;
    industry: string;
    dividend_yield: number;
    '52_week_high': number;
    '52_week_low': number;
    beta: number;
    volume: number;
    avg_volume: number;
}

export interface DCFParams {
    symbol: string;
    growth_rate: number;
    discount_rate: number;
    terminal_growth_rate: number;
}

export interface DCFResult {
    symbol: string;
    current_price: number;
    intrinsic_value: number;
    upside_percentage: number;
    enterprise_value: number;
    equity_value: number;
    terminal_value: number;
    projected_fcf: number[];
    pv_fcf: number[];
    assumptions: {
        growth_rate: number;
        discount_rate: number;
        terminal_growth_rate: number;
    };
    confidence_level: string;
}

export interface UserFinancialData {
    symbol: string;
    revenue?: number;
    operating_income?: number;
    net_income?: number;
    total_assets?: number;
    total_debt?: number;
    cash_and_equivalents?: number;
    shares_outstanding?: number;
    capex?: number;
    working_capital_change?: number;
    tax_rate?: number;
    depreciation?: number;
}

export interface FCFValuationParams {
    symbol: string;
    years_to_project: number;
    growth_rate: number;
    discount_rate: number;
    terminal_growth_rate: number;
    use_custom_data: boolean;
    custom_data?: UserFinancialData;
}

export interface FCFResult {
    symbol: string;
    valuation_method: string;
    current_price: number;
    intrinsic_value: number;
    upside_percentage: number;
    enterprise_value: number;
    equity_value: number;
    terminal_value: number;
    current_fcf: number;
    projected_fcf: number[];
    pv_fcf: number[];
    pv_terminal: number;
    fcf_margin: number;
    fcf_yield: number;
    growth_rates_used: number[];
    assumptions: {
        years_projected: number;
        initial_growth_rate: number;
        discount_rate: number;
        terminal_growth_rate: number;
        shares_outstanding: number;
        total_cash: number;
        total_debt: number;
    };
    confidence_level: string;
    data_source: 'custom' | 'yahoo_finance';
}

export interface ComparableResult {
    symbol: string;
    current_price: number;
    implied_valuations: {
        pe_valuation?: number;
        pb_valuation?: number;
        ps_valuation?: number;
    };
    average_valuation: number;
    upside_percentage: number;
    peer_averages: {
        pe_ratio: number;
        pb_ratio: number;
        ps_ratio: number;
        ev_ebitda: number;
    };
    peer_symbols: string[];
    target_metrics: {
        pe_ratio: number;
        pb_ratio: number;
        ps_ratio: number;
        ev_ebitda: number;
    };
    confidence_level: string;
}

export interface TechnicalResult {
    symbol: string;
    current_price: number;
    moving_averages: {
        sma_20: number;
        sma_50: number;
        sma_200: number;
        ema_12: number;
        ema_26: number;
    };
    momentum_indicators: {
        rsi: number;
        macd: number;
        macd_signal: number;
        macd_histogram: number;
    };
    volatility_indicators: {
        bollinger_upper: number;
        bollinger_middle: number;
        bollinger_lower: number;
    };
    support_resistance: {
        resistance: number;
        support: number;
    };
    signals: Array<{
        type: string;
        indicator: string;
        description: string;
    }>;
}

export interface ComprehensiveResult {
    symbol: string;
    timestamp: string;
    current_price: number;
    valuations: {
        dcf: {
            intrinsic_value: number;
            upside: number;
            confidence: string;
        };
        comparable: {
            average_valuation: number;
            upside: number;
            confidence: string;
        };
    };
    technical_analysis: {
        signals: Array<{
            type: string;
            indicator: string;
            description: string;
        }>;
        rsi: number;
        support: number;
        resistance: number;
    };
    recommendation: {
        action: string;
        confidence: string;
        reasoning: string;
    };
}

export interface PriceEpsPoint {
    date: string;
    price: number | null;
    eps: number | null;
}

export interface PriceEpsSeries {
    symbol: string;
    period: string;
    points: PriceEpsPoint[];
}

export interface SearchResult {
    symbol: string;
    shortname?: string;
    longname?: string;
    exchange?: string;
    quote_type?: string;
}

export interface SearchResponse {
    query: string;
    results: SearchResult[];
}

export interface FinancialGrowthMetrics {
    symbol: string;
    period: string;
    growth: {
        revenue_growth: number | null;
        earnings_growth: number | null;
        price_growth: number | null;
        debt_to_equity_growth: number | null;
        eps_growth: number | null;
    };
}

export interface PortfolioPosition {
    symbol: string;
    shares: number;
    cost_basis: number;
    current_price: number;
    market_value: number;
    cost_value: number;
    profit: number;
    profit_pct: number;
    sector: string;
}

export interface PortfolioSummary {
    total_value: number;
    total_cost: number;
    total_profit: number;
    total_profit_pct: number;
    total_equity: number;
    best_performer?: PortfolioPosition | null;
    worst_performer?: PortfolioPosition | null;
}

export interface PortfolioPerformance {
    profit: number;
    profit_pct: number;
}

export interface PortfolioRisk {
    volatility: number | null;
    risk_score: number;
    max_drawdown: number | null;
}

export interface PortfolioAllocationEntry {
    name?: string;
    symbol?: string;
    value: number;
}

export interface PortfolioResponse {
    positions: PortfolioPosition[];
    cash: number;
    summary: PortfolioSummary;
    performance: {
        monthly: PortfolioPerformance;
        quarterly: PortfolioPerformance;
        ytd: PortfolioPerformance;
    };
    risk: PortfolioRisk;
    allocation: {
        by_sector: PortfolioAllocationEntry[];
        by_symbol: PortfolioAllocationEntry[];
    };
    last_updated?: string;
}

export interface MarketQuote {
    symbol: string;
    name: string;
    price: number;
    change_pct: number;
    volume: number;
    sector: string;
}

export interface SectorPerformance {
    sector: string;
    avg_change_pct: number;
    count: number;
}

export interface MarketSummaryResponse {
    quotes: MarketQuote[];
    index?: {
        symbol: string;
        name: string;
        price: number;
        change_pct: number;
    } | null;
    gainers: MarketQuote[];
    losers: MarketQuote[];
    volume_leaders: MarketQuote[];
    sectors: SectorPerformance[];
    source_symbols: string[];
    last_updated: string;
}

export interface MarketAlert {
    symbol: string;
    type: 'price_breakout' | 'unusual_jump' | 'volume_spike' | 'trend_reversal';
    message: string;
    value: number;
}

export interface MarketAlertsResponse {
    locked: boolean;
    message?: string;
    alerts: MarketAlert[];
    source_symbols?: string[];
    last_updated?: string;
}

export interface RankingEntry {
    symbol: string;
    score: number;
}

export interface MarketRankingsResponse {
    rankings: {
        momentum: RankingEntry[];
        dividend: RankingEntry[];
        value: RankingEntry[];
    };
    source_symbols: string[];
    last_updated: string;
}

export interface IntrinsicValueResponse {
    symbol: string;
    market_price: number;
    intrinsic_value: number;
    margin_of_safety: number;
    signal: string;
}

export interface ScreenerResult {
    symbol: string;
    name: string;
    price: number;
    change_pct: number;
    volume: number;
    sector: string;
    dividend_yield: number;
    pe_ratio: number;
    momentum: number;
    volatility: number;
    value_score: number;
    ai_score: number;
    signal: 'Buy' | 'Watch' | 'Avoid';
}

export interface ScreenerResponse {
    results: ScreenerResult[];
    total: number;
    source_symbols: string[];
    last_updated: string;
}

export type Market = 'US' | 'NGX' | 'UK' | 'EU' | 'ASIA' | 'EMERGING';

export interface MarketInfo {
    code: Market;
    name: string;
    description: string;
    region: string;
    mainIndices: string[];
    tradingHours: string;
    timezone: string;
    featured_stocks: string[];
}

export const AVAILABLE_MARKETS: Record<Market, MarketInfo> = {
    US: {
        code: 'US',
        name: 'US Stock Market',
        description: 'NASDAQ, NYSE, AMEX exchanges',
        region: 'North America',
        mainIndices: ['SPY', 'QQQ', 'IWM'],
        tradingHours: '09:30 - 16:00 EST',
        timezone: 'EST',
        featured_stocks: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA'],
    },
    UK: {
        code: 'UK',
        name: 'UK Stock Market',
        description: 'London Stock Exchange (LSE)',
        region: 'Europe',
        mainIndices: ['FTSE', 'FTAI', 'FTMC'],
        tradingHours: '08:00 - 16:30 GMT',
        timezone: 'GMT',
        featured_stocks: ['LLOY.L', 'HSBA.L', 'BARX.L', 'AZN.L', 'SHELL.L'],
    },
    EU: {
        code: 'EU',
        name: 'European Markets',
        description: 'Eurozone exchanges (Deutsche Börse, Euronext, etc.)',
        region: 'Europe',
        mainIndices: ['DAX', 'CAC40', 'AMS.AS'],
        tradingHours: '09:00 - 17:30 CET',
        timezone: 'CET',
        featured_stocks: ['SAP', 'SIEMENS', 'BMW', 'LVMH.PA', 'ASML.AS'],
    },
    ASIA: {
        code: 'ASIA',
        name: 'Asian Markets',
        description: 'Tokyo, Hong Kong, Singapore exchanges',
        region: 'Asia',
        mainIndices: ['N225', 'HSI', 'STI'],
        tradingHours: '08:00 - 18:00 JST / HKT',
        timezone: 'JST / HKT',
        featured_stocks: ['7203.T', '0700.HK', 'BABA', 'TSM'],
    },
    EMERGING: {
        code: 'EMERGING',
        name: 'Emerging Markets',
        description: 'India, Brazil, South Africa, and other emerging markets',
        region: 'Global',
        mainIndices: ['NIFTY', 'IBOV', 'JALSH'],
        tradingHours: 'Various',
        timezone: 'Various',
        featured_stocks: ['RELIANCE.NS', 'TCS.NS', 'PETR4.SA', 'INFY.NS'],
    },
    NGX: {
        code: 'NGX',
        name: 'Nigerian Stock Exchange',
        description: 'NGX main board and AltBoard',
        region: 'Africa',
        mainIndices: ['NGXINDX', 'NGXPEN', 'NGXFMCG'],
        tradingHours: '10:00 - 14:30 WAT',
        timezone: 'WAT',
        featured_stocks: ['DANGCEM.NG', 'MTNN.NG', 'GTCO.NG', 'ZENITHBANK.NG'],
    },
};

type RequestOptions = {
    method?: 'GET' | 'POST';
    params?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
};

export class StockValuationAPI {
    private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
        const { method = 'GET', params, body } = options;
        const url = new URL(`${API_BASE_URL}${path}`);

        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    url.searchParams.set(key, String(value));
                }
            });
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await fetch(url.toString(), {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                throw new Error(errorText || `Request failed with status ${response.status}`);
            }

            return response.json() as Promise<T>;
        } catch (error: any) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please check your connection and try again.');
            }
            console.error('API Error:', error);
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async getStockInfo(symbol: string): Promise<StockInfo> {
        return this.request<StockInfo>(`/stock/${symbol}`);
    }

    async calculateDCF(params: DCFParams): Promise<DCFResult> {
        return this.request<DCFResult>('/valuation/dcf', { method: 'POST', body: params });
    }

    async getComparableAnalysis(symbol: string, peers?: string[]): Promise<ComparableResult> {
        const peersParam = peers ? peers.join(',') : '';
        return this.request<ComparableResult>(`/valuation/comparable/${symbol}`, {
            params: { peers: peersParam }
        });
    }

    async getTechnicalAnalysis(symbol: string, period: string = '1y'): Promise<TechnicalResult> {
        return this.request<TechnicalResult>(`/analysis/technical/${symbol}`, {
            params: { period }
        });
    }

    async getPriceEpsSeries(symbol: string, period: string = '1y'): Promise<PriceEpsSeries> {
        return this.request<PriceEpsSeries>(`/analysis/price-eps/${symbol}`, {
            params: { period }
        });
    }

    async getFinancialGrowthMetrics(symbol: string, period: string = '1y'): Promise<FinancialGrowthMetrics> {
        return this.request<FinancialGrowthMetrics>(`/analysis/financial-growth/${symbol}`, {
            params: { period }
        });
    }

    async searchStocks(query: string, limit: number = 10): Promise<SearchResponse> {
        return this.request<SearchResponse>(`/search`, {
            params: { query, limit }
        });
    }

    async getComprehensiveAnalysis(symbol: string): Promise<ComprehensiveResult> {
        return this.request<ComprehensiveResult>(`/analysis/comprehensive/${symbol}`);
    }

    async getHealthCheck(): Promise<{ status: string; timestamp: string }> {
        return this.request<{ status: string; timestamp: string }>('/health');
    }

    // New FCF and financial data methods
    async calculateFCFValuation(params: FCFValuationParams): Promise<FCFResult> {
        return this.request<FCFResult>('/valuation/fcf', { method: 'POST', body: params });
    }

    async getFinancialTemplate(symbol: string): Promise<{
        symbol: string;
        template: UserFinancialData;
        description: Record<string, string>;
    }> {
        return this.request(`/financial-template/${symbol}`);
    }

    async runScenarioAnalysis(symbol: string, scenarios: FCFValuationParams[]): Promise<{
        symbol: string;
        scenarios: FCFResult[];
        statistics: {
            avg_valuation: number;
            min_valuation: number;
            max_valuation: number;
            std_valuation: number;
            avg_upside: number;
            min_upside: number;
            max_upside: number;
        };
    }> {
        return this.request(`/analysis/scenario`, {
            method: 'POST',
            params: { symbol },
            body: scenarios,
        });
    }

    async getSensitivityAnalysis(symbol: string, baseGrowth: number = 0.05, baseDiscount: number = 0.10): Promise<{
        symbol: string;
        base_assumptions: { growth_rate: number; discount_rate: number };
        sensitivity_matrix: Array<{
            growth_rate: number;
            discount_rate: number;
            intrinsic_value: number;
            upside_percentage: number;
        }>;
    }> {
        return this.request(`/analysis/sensitivity/${symbol}`, {
            params: { base_growth: baseGrowth, base_discount: baseDiscount }
        });
    }

    async getPortfolio(): Promise<PortfolioResponse> {
        return this.request<PortfolioResponse>('/portfolio');
    }

    async updatePortfolio(payload: { positions: Array<{ symbol: string; shares: number; cost_basis: number }>; cash: number }): Promise<{ status: string; last_updated: string }> {
        return this.request<{ status: string; last_updated: string }>('/portfolio', {
            method: 'PUT',
            body: payload,
        });
    }

    async getNgxMarketSummary(symbols?: string[]): Promise<MarketSummaryResponse> {
        return this.request<MarketSummaryResponse>('/market/ngx/summary', {
            params: { symbols: symbols?.join(',') }
        });
    }

    async getNgxMarketAlerts(symbols?: string[], includePremium: boolean = false): Promise<MarketAlertsResponse> {
        return this.request<MarketAlertsResponse>('/market/ngx/alerts', {
            params: { symbols: symbols?.join(','), include_premium: includePremium }
        });
    }

    async getNgxMarketRankings(symbols?: string[]): Promise<MarketRankingsResponse> {
        return this.request<MarketRankingsResponse>('/market/ngx/rankings', {
            params: { symbols: symbols?.join(',') }
        });
    }

    async getIntrinsicValue(symbol: string): Promise<IntrinsicValueResponse> {
        return this.request<IntrinsicValueResponse>(`/valuation/intrinsic/${symbol}`);
    }

    async getNgxScreener(params: {
        min_price?: number;
        max_price?: number;
        min_change?: number;
        min_volume?: number;
        min_dividend?: number;
        max_pe?: number;
        min_score?: number;
        min_momentum?: number;
        max_volatility?: number;
        sector?: string;
        signal?: string;
    }): Promise<ScreenerResponse> {
        return this.request<ScreenerResponse>('/market/ngx/screener', {
            params,
        });
    }

    // International Market Methods
    async getMarketSummary(market: Market, symbols?: string[]): Promise<MarketSummaryResponse> {
        const marketKey = market.toLowerCase();
        return this.request<MarketSummaryResponse>(`/market/${marketKey}/summary`, {
            params: { symbols: symbols?.join(',') }
        });
    }

    async getMarketAlerts(market: Market, symbols?: string[], includePremium: boolean = false): Promise<MarketAlertsResponse> {
        const marketKey = market.toLowerCase();
        return this.request<MarketAlertsResponse>(`/market/${marketKey}/alerts`, {
            params: { symbols: symbols?.join(','), include_premium: includePremium }
        });
    }

    async getMarketRankings(market: Market, symbols?: string[]): Promise<MarketRankingsResponse> {
        const marketKey = market.toLowerCase();
        return this.request<MarketRankingsResponse>(`/market/${marketKey}/rankings`, {
            params: { symbols: symbols?.join(',') }
        });
    }

    async getMarketScreener(market: Market, params: {
        min_price?: number;
        max_price?: number;
        min_change?: number;
        min_volume?: number;
        min_dividend?: number;
        max_pe?: number;
        min_score?: number;
        min_momentum?: number;
        max_volatility?: number;
        sector?: string;
        signal?: string;
    }): Promise<ScreenerResponse> {
        const marketKey = market.toLowerCase();
        return this.request<ScreenerResponse>(`/market/${marketKey}/screener`, {
            params,
        });
    }

    getMarketInfo(market: Market): MarketInfo {
        return AVAILABLE_MARKETS[market];
    }

    getAllMarkets(): MarketInfo[] {
        return Object.values(AVAILABLE_MARKETS);
    }

    // Smart Strategy
    async getSmartStrategy(symbols?: string[]): Promise<{ stocks: any[]; total: number; last_updated: string }> {
        return this.request<{ stocks: any[]; total: number; last_updated: string }>('/smart-strategy', {
            params: { symbols: symbols?.join(',') }
        });
    }
}

export const stockAPI = new StockValuationAPI();