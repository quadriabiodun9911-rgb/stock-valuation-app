// API Configuration
import Constants from 'expo-constants';
import { getCached, setCache } from '../utils/cache';

const resolveApiBaseUrl = () => {
    const normalize = (value?: string | null) => {
        if (!value) return null;
        return value.replace(/\/$/, '');
    };

    const envUrl = normalize(process.env.EXPO_PUBLIC_API_URL);
    if (envUrl) return envUrl;

    const configuredUrl = normalize((Constants.expoConfig as any)?.extra?.apiUrl);
    if (configuredUrl) return configuredUrl;

    const hostUri =
        Constants.expoConfig?.hostUri ||
        (Constants.expoConfig as any)?.debuggerHost ||
        (Constants as any).manifest?.hostUri ||
        (Constants as any).manifest?.debuggerHost ||
        (Constants as any).manifest2?.extra?.expoClient?.hostUri;
    if (hostUri) {
        const host = hostUri.split(':')[0];
        return `http://${host}:8000`;
    }

    // Last-resort fallback for standalone tester builds.
    return 'https://stock-valuation-app-2.onrender.com';
};

const API_BASE_URL = resolveApiBaseUrl();
const REQUEST_TIMEOUT_MS = 10000;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

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
    trend: {
        direction: string;
        strength: string;
    };
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
    data_quality?: {
        partial: boolean;
        errors: string[];
    };
}

export interface AIRecommendationResult {
    symbol: string;
    action: string;
    confidence: number;
    target_price: number;
    stop_loss: number;
    risk_reward_ratio: number;
    catalysts: string[];
    risks: string[];
}

export interface AssistiveValuationBriefRequest {
    symbol: string;
    analysis?: {
        recommendation?: {
            action?: string;
            confidence?: string;
        };
        valuations?: {
            dcf?: {
                upside?: number;
            };
            comparable?: {
                upside?: number;
            };
        };
        technical_analysis?: {
            rsi?: number;
            support?: number;
            resistance?: number;
        };
    };
    risk_profile?: string;
    time_horizon?: string;
}

export interface AssistiveValuationBriefResponse {
    symbol: string;
    summary: string;
    evidence: string[];
    risks: string[];
    next_actions: string[];
    confidence: string;
    used_ai: boolean;
    disclaimer: string;
}

export interface AssistiveNewsImpactResponse {
    symbol: string;
    summary: string;
    overall_sentiment: 'positive' | 'negative' | 'neutral';
    evidence: string[];
    risks: string[];
    next_actions: string[];
    headlines: string[];
    used_ai: boolean;
    disclaimer: string;
}

export interface AssistiveMetricsResponse {
    total_feedback: number;
    helpful_feedback: number;
    helpfulness_rate: number;
    total_events: number;
    feedback_breakdown: Array<{
        brief_type: string;
        total: number;
        helpful: number;
    }>;
    event_breakdown: Array<{
        event_name: string;
        total: number;
    }>;
}

export interface AssistiveDashboardMetricsResponse {
    window_days: number;
    feedback_by_symbol: Array<{
        symbol: string;
        total: number;
        helpful: number;
    }>;
    feedback_by_day: Array<{
        day: string;
        total: number;
        helpful: number;
    }>;
    events_by_symbol: Array<{
        symbol: string;
        total: number;
    }>;
    events_by_day: Array<{
        day: string;
        total: number;
    }>;
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
    quantity: number;
    purchase_price: number;
    current_value: number;
    return_pct: number;
    capital_gain?: number;
    dividend_income?: number;
    transaction_costs?: number;
    total_return?: number;
    total_return_pct?: number;
    inflation_impact?: number;
    real_return?: number;
    real_return_pct?: number;
    holding_period_years?: number;
}

export interface PortfolioSummary {
    total_value: number;
    total_cost: number;
    total_profit: number;
    total_profit_pct: number;
    total_dividends?: number;
    total_transaction_costs?: number;
    total_return?: number;
    total_return_pct?: number;
    total_inflation_impact?: number;
    total_real_profit?: number;
    total_real_profit_pct?: number;
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
    portfolio_value: number;
    total_invested: number;
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

// ── Trade Reasons types ──────────────────────────────────────────
export interface TradeReasonTagsResponse {
    buy_reasons: string[];
    sell_reasons: string[];
    buy?: string[];
    sell?: string[];
}

export interface TradeReasonSubmit {
    symbol: string;
    action: 'buy' | 'sell';
    reasons: string[];
    note?: string;
    confidence?: number;
}

export interface TradeReasonEntry {
    symbol: string;
    action: 'buy' | 'sell';
    reasons: string[];
    note?: string;
    confidence?: number;
    timestamp: string;
}

export interface TradeReasonSummary {
    symbol: string;
    total_submissions: number;
    buy: {
        count: number;
        avg_confidence: number;
        top_reasons: { reason: string; count: number; pct: number }[];
    };
    sell: {
        count: number;
        avg_confidence: number;
        top_reasons: { reason: string; count: number; pct: number }[];
    };
    recent: TradeReasonEntry[];
}

export interface TrendingTradeReason {
    symbol: string;
    buy: number;
    sell: number;
    total: number;
    latest: string;
}

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

export interface ProfileRecommendation {
    symbol: string;
    name: string;
    assetType: 'ETF' | 'Stock';
    riskLevel: 'low' | 'medium' | 'high';
    horizon: 'short' | 'medium' | 'long';
    style: string;
    fitScore: number;
    reasons: string[];
    market: Market | string;
}

export interface ProfileRecommendationsResponse {
    persona: string;
    market: string;
    generatedAt: string;
    recommendations: ProfileRecommendation[];
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
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    params?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    cacheTtlMs?: number;
    disableCache?: boolean;
    retryCount?: number;
};

// ── Financial Upload Types ──────────────────────────────────────

export interface GrowthMetric {
    values: (number | null)[];
    yoy_growth_pct: number[];
    cagr_pct: number | null;
    latest: number | null;
}

export interface DCFUploadResult {
    current_fcf: number;
    implied_growth_rate: number;
    projected_fcf: number[];
    pv_fcf: number[];
    terminal_value: number;
    pv_terminal: number;
    enterprise_value: number;
    equity_value: number;
    intrinsic_value_per_share: number | null;
    shares_outstanding: number;
    total_cash: number;
    total_debt: number;
    assumptions: {
        discount_rate: number;
        terminal_growth_rate: number;
        years_projected: number;
    };
    error?: string;
}

export interface FinancialUploadResult {
    id: number;
    company_name: string;
    symbol: string;
    dcf: DCFUploadResult;
    growth: Record<string, GrowthMetric>;
    periods: string[];
}

export interface FinancialUploadSummary {
    id: number;
    company_name: string;
    symbol: string | null;
    statement_type: string;
    created_at: string;
    has_dcf: boolean;
    has_growth: boolean;
}

export interface FinancialUploadDetail {
    id: number;
    company_name: string;
    symbol: string | null;
    statement_type: string;
    created_at: string;
    data: any;
    dcf: DCFUploadResult | null;
    growth: Record<string, GrowthMetric> | null;
}

export class StockValuationAPI {
    private authToken: string | null = null;

    setAuthToken(token: string | null) {
        this.authToken = token;
    }

    private buildFriendlyErrorMessage(status?: number, path?: string): string {
        if ((status === 401 || status === 403) && path?.includes('/ai-chat')) {
            return 'Please sign in to use AI chat.';
        }

        if (status === 401 || status === 403) {
            return 'Your session expired. Please sign in again.';
        }

        if (status === 429) {
            return 'Service is busy right now. Please try again in a moment.';
        }

        if (status !== undefined && status >= 500) {
            return 'Service is temporarily unavailable. Please try again shortly.';
        }

        if (path?.includes('/ai') || path?.includes('/ai-chat')) {
            return 'AI is temporarily unavailable. You can keep using the rest of the analysis tools.';
        }

        return 'Unable to load fresh data right now. Please try again.';
    }

    private shouldCache(method: string, path: string, disableCache?: boolean): boolean {
        if (disableCache || method !== 'GET') {
            return false;
        }

        return !(
            path.startsWith('/auth') ||
            path.startsWith('/portfolio') ||
            path.startsWith('/referrals') ||
            path.startsWith('/achievements') ||
            path.startsWith('/api/social')
        );
    }

    private buildCacheKey(path: string, url: URL): string {
        return `api:${path}:${url.searchParams.toString() || 'no-params'}`;
    }

    private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
        const {
            method = 'GET',
            params,
            body,
            cacheTtlMs = DEFAULT_CACHE_TTL_MS,
            disableCache = false,
            retryCount = 1,
        } = options;
        const url = new URL(`${API_BASE_URL}${path}`);

        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    url.searchParams.set(key, String(value));
                }
            });
        }

        const cacheKey = this.buildCacheKey(path, url);
        const allowCache = this.shouldCache(method, path, disableCache);

        const executeRequest = async (attempt: number): Promise<T> => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
            const startTime = Date.now();

            try {
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                };
                if (this.authToken) {
                    headers['Authorization'] = `Bearer ${this.authToken}`;
                }

                const response = await fetch(url.toString(), {
                    method,
                    headers,
                    body: body ? JSON.stringify(body) : undefined,
                    signal: controller.signal,
                });

                const durationMs = Date.now() - startTime;
                console.info(`[API] ${method} ${path} -> ${response.status} in ${durationMs}ms`);

                if (!response.ok) {
                    const errorText = await response.text();
                    const transient = method === 'GET' && attempt < retryCount && (response.status === 429 || response.status >= 500);

                    if (transient) {
                        console.warn(`[API] retrying ${method} ${path} after status ${response.status}`);
                        return executeRequest(attempt + 1);
                    }

                    console.error('API Error:', response.status, errorText);
                    throw new Error(this.buildFriendlyErrorMessage(response.status, path));
                }

                const data = await response.json() as T;
                if (allowCache) {
                    await setCache(cacheKey, data, cacheTtlMs);
                }
                return data;
            } catch (error: any) {
                if (error.name === 'AbortError') {
                    if (method === 'GET' && attempt < retryCount) {
                        console.warn(`[API] retrying ${method} ${path} after timeout`);
                        return executeRequest(attempt + 1);
                    }
                    throw new Error('Request timed out. Service may be busy. Please try again.');
                }

                const message = String(error?.message || 'Unknown error');
                const isTransientNetworkError = method === 'GET' && attempt < retryCount && (
                    message.includes('Network request failed') ||
                    message.includes('Load failed') ||
                    message.includes('ERR_ABORTED')
                );

                if (isTransientNetworkError) {
                    console.warn(`[API] retrying ${method} ${path} after network error`);
                    return executeRequest(attempt + 1);
                }

                console.error('API Error:', error);

                if (allowCache) {
                    const cached = await getCached<T>(cacheKey);
                    if (cached !== null) {
                        console.warn(`[API] using cached fallback for ${path}`);
                        return cached;
                    }
                }

                throw error instanceof Error ? error : new Error(this.buildFriendlyErrorMessage(undefined, path));
            } finally {
                clearTimeout(timeoutId);
            }
        };

        return executeRequest(0);
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

    async getPortfolio(params?: { inflationRate?: number; transactionCostRate?: number }): Promise<PortfolioResponse> {
        return this.request<PortfolioResponse>('/portfolio', {
            params: {
                inflation_rate: params?.inflationRate,
                transaction_cost_rate: params?.transactionCostRate,
            },
        });
    }

    async calculateInvestorReturns(params: {
        symbol?: string;
        shares: number;
        purchase_price: number;
        current_price?: number;
        purchase_date?: string;
        total_dividends?: number;
        annual_dividend_per_share?: number;
        inflation_rate_pct?: number;
        transaction_cost_rate_pct?: number;
        fixed_transaction_cost?: number;
        capital_gains_tax_rate_pct?: number;
    }): Promise<any> {
        return this.request<any>('/analysis/investor-returns', {
            method: 'POST',
            body: params,
        });
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

    // ── Trade Reasons (crowd intelligence) ───────────────────────
    async getTradeReasonTags(): Promise<TradeReasonTagsResponse> {
        return this.request<TradeReasonTagsResponse>('/api/trade-reasons/tags');
    }

    async submitTradeReason(body: TradeReasonSubmit): Promise<{ status: string; entry: any }> {
        return this.request<{ status: string; entry: any }>('/api/trade-reasons/submit', {
            method: 'POST',
            body,
        });
    }

    async getTradeReasonSummary(symbol: string): Promise<TradeReasonSummary> {
        return this.request<TradeReasonSummary>(`/api/trade-reasons/summary/${symbol}`);
    }

    async getTradeReasonFeed(limit: number = 30): Promise<{ feed: TradeReasonEntry[] }> {
        return this.request<{ feed: TradeReasonEntry[] }>('/api/trade-reasons/feed', {
            params: { limit },
        });
    }

    async getTrendingTradeReasons(limit: number = 10): Promise<{ trending: TrendingTradeReason[] }> {
        return this.request<{ trending: TrendingTradeReason[] }>('/api/trade-reasons/trending', {
            params: { limit },
        });
    }

    // ── Financial Statements ────────────────────────────────────
    async getFinancialStatements(symbol: string, period: string = 'annual'): Promise<any> {
        return this.request<any>(`/financials/${symbol}`, {
            params: { period },
        });
    }

    // ── Earnings Analysis ───────────────────────────────────────
    async getEarningsAnalysis(symbol: string): Promise<any> {
        return this.request<any>(`/earnings/${symbol}`);
    }

    // ── Valuation History ───────────────────────────────────────
    async getValuationHistory(symbol: string): Promise<any> {
        return this.request<any>(`/valuation-history/${symbol}`);
    }

    // ── Peer Comparison ─────────────────────────────────────────
    async getPeerComparison(symbol: string, peers?: string): Promise<any> {
        return this.request<any>(`/peer-compare/${symbol}`, {
            params: peers ? { peers } : {},
        });
    }

    // ── Dividend Analysis ───────────────────────────────────────
    async getDividendAnalysis(symbol: string): Promise<any> {
        return this.request<any>(`/dividends/${symbol}`);
    }

    // ── Goal Planner ────────────────────────────────────────────
    async calculateGoalPlan(params: {
        targetAmount: number;
        currentSavings: number;
        monthlyContribution: number;
        annualReturn: number;
        years: number;
        inflationRate?: number;
        mode?: 'long_term' | '12_week';
        weeks?: number;
        weeklyContribution?: number;
    }): Promise<any> {
        return this.request<any>('/goal-planner', { method: 'POST', body: params });
    }

    // ── DCA Calculator ──────────────────────────────────────────
    async getDCAAnalysis(symbol: string, monthlyAmount?: number, years?: number): Promise<any> {
        const params: any = {};
        if (monthlyAmount) params.monthly_amount = monthlyAmount;
        if (years) params.years = years;
        return this.request<any>(`/dca/${symbol}`, { params });
    }

    // ── Economic Dashboard ──────────────────────────────────────
    async getEconomicDashboard(): Promise<any> {
        return this.request<any>('/economic-dashboard');
    }

    // ── Economic Impact ─────────────────────────────────────────
    async getEconomicImpact(symbol: string): Promise<any> {
        return this.request<any>(`/economic-impact/${symbol}`);
    }

    // ── News Impact Analysis ────────────────────────────────────
    async getNewsImpact(symbol: string): Promise<any> {
        return this.request<any>(`/news-impact/${symbol}`);
    }

    // ── Transactions ────────────────────────────────────────────
    async getTransactions(symbol?: string): Promise<any> {
        const params: any = {};
        if (symbol) params.symbol = symbol;
        return this.request<any>('/transactions', { params });
    }

    async addTransaction(data: {
        symbol: string;
        action: string;
        shares: number;
        price: number;
        date?: string;
        notes?: string;
    }): Promise<any> {
        return this.request<any>('/transactions', { method: 'POST', body: data });
    }

    async deleteTransaction(id: number): Promise<any> {
        return this.request<any>(`/transactions/${id}`, { method: 'DELETE' });
    }

    // ── Auth ────────────────────────────────────────────────────
    async login(email: string, password: string): Promise<any> {
        return this.request<any>('/auth/login', { method: 'POST', body: { email, password } });
    }

    async register(email: string, username: string, password: string): Promise<any> {
        return this.request<any>('/auth/register', { method: 'POST', body: { email, username, password } });
    }

    async getMe(): Promise<any> {
        return this.request<any>('/auth/me');
    }

    async registerPushToken(token: string): Promise<any> {
        return this.request<any>('/auth/push-token', { method: 'POST', body: { token } });
    }

    // ── Social Feed ─────────────────────────────────────────────
    async createPost(content: string, symbol?: string): Promise<any> {
        return this.request<any>('/api/social/posts', {
            method: 'POST', body: { content, symbol: symbol || undefined },
        });
    }

    async getSocialFeed(limit: number = 50, offset: number = 0): Promise<{ posts: any[] }> {
        return this.request<{ posts: any[] }>('/api/social/feed', { params: { limit, offset } });
    }

    async getPost(postId: number): Promise<any> {
        return this.request<any>(`/api/social/posts/${postId}`);
    }

    async deletePost(postId: number): Promise<any> {
        return this.request<any>(`/api/social/posts/${postId}`, { method: 'DELETE' });
    }

    async toggleLike(postId: number): Promise<{ liked: boolean; like_count: number }> {
        return this.request<{ liked: boolean; like_count: number }>(`/api/social/posts/${postId}/like`, { method: 'POST' });
    }

    async getComments(postId: number): Promise<{ comments: any[] }> {
        return this.request<{ comments: any[] }>(`/api/social/posts/${postId}/comments`);
    }

    async addComment(postId: number, content: string): Promise<any> {
        return this.request<any>(`/api/social/posts/${postId}/comments`, {
            method: 'POST', body: { content },
        });
    }

    // ── Friends ─────────────────────────────────────────────────
    async getFriends(): Promise<{ friends: any[] }> {
        return this.request<{ friends: any[] }>('/api/social/friends');
    }

    async getFriendRequests(): Promise<{ requests: any[] }> {
        return this.request<{ requests: any[] }>('/api/social/friends/requests');
    }

    async sendFriendRequest(userId: number): Promise<any> {
        return this.request<any>(`/api/social/friends/${userId}`, { method: 'POST' });
    }

    async respondFriendRequest(requestId: number, accept: boolean): Promise<any> {
        return this.request<any>(`/api/social/friends/requests/${requestId}`, {
            method: 'PUT', body: { accept },
        });
    }

    async searchUsers(query: string): Promise<{ users: any[] }> {
        return this.request<{ users: any[] }>('/api/social/users/search', { params: { q: query } });
    }

    // ── Chat ────────────────────────────────────────────────────
    async getConversations(): Promise<{ conversations: any[] }> {
        return this.request<{ conversations: any[] }>('/api/social/chat/conversations');
    }

    async getMessages(otherUserId: number, limit: number = 50, offset: number = 0): Promise<{ messages: any[] }> {
        return this.request<{ messages: any[] }>(`/api/social/chat/${otherUserId}`, { params: { limit, offset } });
    }

    async sendChatMessage(receiverId: number, content: string): Promise<any> {
        return this.request<any>(`/api/social/chat/${receiverId}`, {
            method: 'POST', body: { content },
        });
    }

    // ── Financial Statement Upload & Analysis ─────────────────────

    async uploadFinancialStatement(
        fileUri: string,
        fileName: string,
        companyName: string,
        symbol: string = '',
        discountRate: number = 0.10,
        terminalGrowthRate: number = 0.03,
    ): Promise<FinancialUploadResult> {
        const formData = new FormData();
        formData.append('file', {
            uri: fileUri,
            name: fileName,
            type: 'text/csv',
        } as any);
        formData.append('company_name', companyName);
        formData.append('symbol', symbol);
        formData.append('discount_rate', String(discountRate));
        formData.append('terminal_growth_rate', String(terminalGrowthRate));

        const url = `${API_BASE_URL}/financial-upload`;
        const headers: Record<string, string> = {};
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: formData,
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || `Upload failed with status ${response.status}`);
        }
        return response.json() as Promise<FinancialUploadResult>;
    }

    async getFinancialUploads(): Promise<{ uploads: FinancialUploadSummary[] }> {
        return this.request<{ uploads: FinancialUploadSummary[] }>('/financial-uploads');
    }

    async getFinancialUploadDetail(uploadId: number): Promise<FinancialUploadDetail> {
        return this.request<FinancialUploadDetail>(`/financial-uploads/${uploadId}`);
    }

    async deleteFinancialUpload(uploadId: number): Promise<{ message: string }> {
        return this.request<{ message: string }>(`/financial-uploads/${uploadId}`, { method: 'DELETE' });
    }

    // ── Achievements ──
    async getAchievements(): Promise<any> {
        return this.request<any>('/achievements');
    }

    // ── Daily Briefing ──
    async getDailyBriefing(): Promise<any> {
        return this.request<any>('/daily-briefing');
    }

    // ── Earnings Calendar ──
    async getEarningsCalendar(days: number = 14): Promise<any> {
        return this.request<any>('/earnings-calendar', { params: { days: String(days) } });
    }

    // ── Stock Recommendations ──
    async getRecommendations(): Promise<any> {
        return this.request<any>('/recommendations');
    }

    async getProfileRecommendations(params: {
        market: Market;
        limit?: number;
        persona?: string;
        riskTolerance?: string;
        primaryGoal?: string;
        timeHorizon?: string;
    }): Promise<ProfileRecommendationsResponse> {
        return this.request<ProfileRecommendationsResponse>('/recommendations/profile', {
            params: {
                market: params.market,
                limit: params.limit ?? 4,
                persona: params.persona,
                riskTolerance: params.riskTolerance,
                primaryGoal: params.primaryGoal,
                timeHorizon: params.timeHorizon,
            },
        });
    }

    // ── AI Chat ──
    async sendAIChat(message: string, symbol?: string): Promise<any> {
        return this.request<any>('/ai-chat', {
            method: 'POST',
            body: { message, symbol },
        });
    }

    // ── AI Recommendation ──
    async getAIRecommendation(symbol: string, period: string = '1y'): Promise<AIRecommendationResult> {
        return this.request<AIRecommendationResult>('/api/ai/recommendation', {
            method: 'POST',
            body: { symbol, period },
        });
    }

    async getAssistiveValuationBrief(
        payload: AssistiveValuationBriefRequest,
    ): Promise<AssistiveValuationBriefResponse> {
        return this.request<AssistiveValuationBriefResponse>('/api/assistive/valuation-brief', {
            method: 'POST',
            body: payload,
        });
    }

    async getAssistiveNewsImpact(symbol: string, limit: number = 6): Promise<AssistiveNewsImpactResponse> {
        return this.request<AssistiveNewsImpactResponse>('/api/assistive/news-impact', {
            method: 'POST',
            body: { symbol, limit },
        });
    }

    async submitAssistiveFeedback(payload: {
        symbol?: string;
        brief_type: string;
        helpful: boolean;
        comment?: string;
    }): Promise<any> {
        return this.request<any>('/api/assistive/feedback', {
            method: 'POST',
            body: payload,
        });
    }

    async trackAssistiveEvent(payload: {
        event_name: string;
        symbol?: string;
        metadata?: Record<string, any>;
    }): Promise<any> {
        return this.request<any>('/api/assistive/event', {
            method: 'POST',
            body: payload,
        });
    }

    async getAssistiveMetrics(): Promise<AssistiveMetricsResponse> {
        return this.request<AssistiveMetricsResponse>('/api/assistive/metrics');
    }

    async getAssistiveDashboardMetrics(
        days: number = 30,
    ): Promise<AssistiveDashboardMetricsResponse> {
        return this.request<AssistiveDashboardMetricsResponse>(
            '/api/assistive/metrics/dashboard',
            { params: { days } },
        );
    }

    // ── Options Calculator ──
    async calculateOptions(params: {
        symbol: string;
        option_type: string;
        strike_price: number;
        premium: number;
        contracts: number;
        expiry_days: number;
    }): Promise<any> {
        return this.request<any>('/options-calculator', { method: 'POST', body: params });
    }

    // ── Referral System ──
    async getReferralCode(): Promise<any> {
        return this.request<any>('/referrals/my-code');
    }

    async redeemReferral(code: string): Promise<any> {
        return this.request<any>('/referrals/redeem', { method: 'POST', body: { code } });
    }
}

export const stockAPI = new StockValuationAPI();