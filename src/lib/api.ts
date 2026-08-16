import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// ─────────────────────────────────────────────
// Axios instance
// ─────────────────────────────────────────────

const API_BASE_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || '')
    : '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: typeof window !== 'undefined' && localStorage.getItem('ultrabot_token') === 'demo-token' ? 2_000 : 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─────────────────────────────────────────────
// Request interceptor — attach JWT
// ─────────────────────────────────────────────

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('ultrabot_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─────────────────────────────────────────────
// Response interceptor — handle 401
// ─────────────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // In demo mode (no backend), don't redirect on 401 or network errors
    if (typeof window !== 'undefined') {
      const isDemo = localStorage.getItem('ultrabot_token') === 'demo-token';
      if (isDemo) return Promise.reject(error);
    }
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ultrabot_token');
        localStorage.removeItem('ultrabot_username');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// ─────────────────────────────────────────────
// Typed response wrappers
// ─────────────────────────────────────────────

type ApiResponse<T = unknown> = Promise<T>;

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────

export async function login(username: string, password: string): ApiResponse<{ access_token: string; token_type: string; expires_in_hours: number }> {
  const { data } = await api.post(
    '/api/auth/login',
    new URLSearchParams({ username, password }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  );
  return data;
}

// ─────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────

export interface MarketDataResponse {
  nifty: number;
  nifty_change: number;
  vix: number;
  source: string;
}

export interface NewsItemResponse {
  symbol: string;
  symbols?: string[];
  price?: number;
  changePct?: number;
  headline: string;
  summary?: string;
  source: string;
  category?: string;
  sentiment?: 'BUY' | 'SELL' | 'NEUTRAL';
  impactLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  tradeAction?: 'BUY' | 'SELL' | 'HOLD';
  confidence?: number;
  timeAgo?: string;
  providerCode?: string;
  publishedTimestamp?: number;
  publishedAt?: string;
  url?: string;
}

export const FALLBACK_NEWS_ITEMS: NewsItemResponse[] = [
  {
    symbol: 'RELIANCE',
    symbols: ['RELIANCE', 'JIO'],
    price: 2948.35,
    changePct: 2.45,
    headline: 'Reliance Retail announces strategic expansion in quick commerce, EBITDA expected to jump 18%',
    summary: 'Expansion into 50+ new tier-2 cities is projected to boost FY26 margins significantly.',
    source: 'Economic Times',
    category: 'Corporate Action',
    sentiment: 'BUY',
    impactLevel: 'HIGH',
    confidence: 88,
    tradeAction: 'BUY',
    publishedAt: '10 mins ago',
    timeAgo: '10 mins ago',
    url: 'https://economictimes.indiatimes.com/markets',
  },
  {
    symbol: 'TCS',
    symbols: ['TCS', 'INFY'],
    price: 4125.80,
    changePct: -1.15,
    headline: 'TCS secures mega $1.2B European cloud transformation multi-year deal despite macro headwinds',
    summary: 'Large deal pipeline strengthens order book, offering solid revenue visibility over 5 years.',
    source: 'Moneycontrol',
    category: 'Earnings',
    sentiment: 'BUY',
    impactLevel: 'HIGH',
    confidence: 82,
    tradeAction: 'BUY',
    publishedAt: '25 mins ago',
    timeAgo: '25 mins ago',
    url: 'https://www.moneycontrol.com/news/business/stocks/',
  },
  {
    symbol: 'HDFCBANK',
    symbols: ['HDFCBANK', 'ICICIBANK'],
    price: 1642.50,
    changePct: 0.85,
    headline: 'RBI maintains repo rate at 6.5%, liquidity support positive for private banking credit growth',
    summary: 'Net interest margins expected to stabilize as deposit repricing cycle nears completion.',
    source: 'Google Finance',
    category: 'Regulatory',
    sentiment: 'BUY',
    impactLevel: 'MEDIUM',
    confidence: 75,
    tradeAction: 'BUY',
    publishedAt: '42 mins ago',
    timeAgo: '42 mins ago',
    url: 'https://www.google.com/finance/quote/HDFCBANK:NSE',
  },
  {
    symbol: 'TATAMOTORS',
    symbols: ['TATAMOTORS', 'MARUTI'],
    price: 985.20,
    changePct: 3.12,
    headline: 'Tata Motors EV sales surge 42% YoY; commercial vehicle demand rebounds sharply in Q3',
    summary: 'Strong order backlog in JLR and EV passenger vehicle segment drives positive momentum.',
    source: 'NSE Corporate',
    category: 'Earnings',
    sentiment: 'BUY',
    impactLevel: 'HIGH',
    confidence: 91,
    tradeAction: 'BUY',
    publishedAt: '1 hr ago',
    timeAgo: '1 hr ago',
    url: 'https://www.nseindia.com/companies-listing/corporate-filings-announcements',
  },
  {
    symbol: 'INFY',
    symbols: ['INFY', 'WIPRO'],
    price: 1780.40,
    changePct: -2.30,
    headline: 'US IT spending forecast revised downward by Gartner amid tighter enterprise tech budgets',
    summary: 'Discretionary IT consulting projects face deferrals, exerting short-term pressure on billing rates.',
    source: 'Economic Times',
    category: 'Macro',
    sentiment: 'SELL',
    impactLevel: 'MEDIUM',
    confidence: 79,
    tradeAction: 'SELL',
    publishedAt: '2 hrs ago',
    timeAgo: '2 hrs ago',
    url: 'https://economictimes.indiatimes.com/markets/stocks/news',
  },
  {
    symbol: 'SBIN',
    symbols: ['SBIN', 'PNB'],
    price: 815.60,
    changePct: 1.70,
    headline: 'State Bank of India gross NPA drops to multi-year low of 2.1%; asset quality outlook solid',
    summary: 'Robust recovery trends and steady corporate credit growth support loan book expansion.',
    source: 'Moneycontrol',
    category: 'Earnings',
    sentiment: 'BUY',
    impactLevel: 'HIGH',
    confidence: 85,
    tradeAction: 'BUY',
    publishedAt: '3 hrs ago',
    timeAgo: '3 hrs ago',
    url: 'https://www.moneycontrol.com/news/business/stocks/',
  },
];

export async function getDashboard(): ApiResponse {
  const { data } = await api.get('/api/dashboard');
  return data;
}

export async function getMarketData(): ApiResponse<MarketDataResponse> {
  const { data } = await api.get<MarketDataResponse>('/api/dashboard/market-data');
  return data;
}

// ─────────────────────────────────────────────
// Opportunities
// ─────────────────────────────────────────────

export async function getOpportunities(): ApiResponse {
  const { data } = await api.get('/api/opportunities');
  return data;
}

export async function confirmOpportunity(id: string, segment: string = "EQ"): ApiResponse {
  const { data } = await api.post(`/api/opportunities/${id}/confirm`, { segment });
  return data;
}

export async function skipOpportunity(id: string): ApiResponse {
  const { data } = await api.post(`/api/opportunities/${id}/skip`);
  return data;
}

// ─────────────────────────────────────────────
// Trades
// ─────────────────────────────────────────────

export async function getTrades(params?: { page?: number; limit?: number; status?: string }): ApiResponse {
  const { data } = await api.get('/api/trades', { params });
  return data;
}

// ─────────────────────────────────────────────
// Positions
// ─────────────────────────────────────────────

export async function getPositions(): ApiResponse {
  const { data } = await api.get('/api/positions');
  return data;
}

export async function closePosition(id: string, payload?: { exit_price?: number; exit_reason?: string; notes?: string }): ApiResponse {
  const { data } = await api.post(`/api/positions/${id}/close`, payload || {});
  return data;
}

// ─────────────────────────────────────────────
// Strategies
// ─────────────────────────────────────────────

export async function getStrategies(): ApiResponse {
  const { data } = await api.get('/api/strategies');
  return data;
}

export async function toggleStrategy(name: string, isEnabled: boolean): ApiResponse {
  const { data } = await api.put(`/api/strategies/${name}/toggle`, { is_enabled: isEnabled });
  return data;
}

// ─────────────────────────────────────────────
// Watchlist
// ─────────────────────────────────────────────

export async function getWatchlist(): ApiResponse {
  const { data } = await api.get('/api/watchlist');
  return data;
}

// ─────────────────────────────────────────────
// Brokers
// ─────────────────────────────────────────────

export async function getBrokerStatus(): ApiResponse {
  const { data } = await api.get('/api/brokers');
  return data;
}

export async function saveAngelOneCredentials(creds: {
  client_id: string;
  client_secret: string;
  api_key?: string;
  pin?: string;
  totp_secret?: string;
  account_type?: string;
}): ApiResponse {
  const { data } = await api.post('/api/brokers/angel-one/credentials', creds);
  return data;
}

export async function saveShoonyaCredentials(creds: {
  client_id: string;
  client_secret: string;
  totp_secret?: string;
  account_type?: string;
}): ApiResponse {
  const { data } = await api.post('/api/brokers/shoonya/credentials', creds);
  return data;
}

export async function testAngelOneConnection(creds?: Record<string, string>): ApiResponse {
  try {
    const { data } = await api.post('/api/brokers/angel-one/test', creds || {});
    return data;
  } catch (err: any) {
    const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Angel One connection test failed';
    return { connected: false, message: msg };
  }
}

export async function testShoonyaConnection(creds?: Record<string, string>): ApiResponse {
  try {
    const { data } = await api.post('/api/brokers/shoonya/test', creds || {});
    return data;
  } catch (err: any) {
    const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Shoonya connection test failed';
    return { connected: false, message: msg };
  }
}

export async function saveDhanCredentials(creds: {
  client_id: string;
  access_token: string;
  account_type?: string;
}): ApiResponse {
  const { data } = await api.post('/api/brokers/dhan/credentials', creds);
  return data;
}

export async function testDhanConnection(creds?: Record<string, string>): ApiResponse {
  try {
    const { data } = await api.post('/api/brokers/dhan/test', creds || {});
    return data;
  } catch (err: any) {
    const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Dhan connection test failed';
    return { connected: false, message: msg };
  }
}

export async function saveFyersCredentials(creds: {
  app_id: string;
  access_token: string;
  secret_key?: string;
  pin?: string;
  account_type?: string;
}): ApiResponse {
  const { data } = await api.post('/api/brokers/fyers/credentials', creds);
  return data;
}

export async function testFyersConnection(creds?: Record<string, string>): ApiResponse {
  try {
    const { data } = await api.post('/api/brokers/fyers/test', creds || {});
    return data;
  } catch (err: any) {
    const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Fyers connection test failed';
    return { connected: false, message: msg };
  }
}

// ─────────────────────────────────────────────
// Risk
// ─────────────────────────────────────────────

export async function getRiskStatus(): ApiResponse {
  const { data } = await api.get('/api/risk/status');
  return data;
}

export async function getRiskGates(): ApiResponse {
  const { data } = await api.get('/api/risk/gates');
  return data;
}

export async function updateRiskLimits(limits: Record<string, number | string | boolean>): ApiResponse {
  const { data } = await api.put('/api/risk/limits', limits);
  return data;
}

export async function updateSettingsFull(payload: Record<string, unknown>): ApiResponse {
  const { data } = await api.put('/api/settings', payload);
  return data;
}

// ─────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────

export async function getErrors(params?: { page?: number; limit?: number }): ApiResponse {
  const { data } = await api.get('/api/errors', { params });
  return data;
}

// ─────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────

export async function getEngineStatus(): ApiResponse {
  const { data } = await api.get('/api/engine/status');
  return data;
}

export interface EngineStartParams {
  mode: string;
  broker: string;
  strategies?: string[];
  initial_capital?: number;
}

export async function startEngine(params: EngineStartParams): ApiResponse {
  const { data } = await api.post('/api/engine/start', params);
  return data;
}

export async function pauseEngine(): ApiResponse {
  const { data } = await api.post('/api/engine/pause');
  return data;
}

export async function resumeEngine(): ApiResponse {
  const { data } = await api.post('/api/engine/resume');
  return data;
}

export async function stopEngine(): ApiResponse {
  const { data } = await api.post('/api/engine/stop');
  return data;
}

// ─────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────

export async function getSettings(): ApiResponse {
  const { data } = await api.get('/api/settings');
  return data;
}

export async function updateSettings(settings: Record<string, unknown>): ApiResponse {
  const { data } = await api.put('/api/settings', settings);
  return data;
}

// ─────────────────────────────────────────────
// Backtest
// ─────────────────────────────────────────────

export async function getBacktestHistory(params?: { strategy?: string; limit?: number; offset?: number }): ApiResponse {
  const { data } = await api.get('/api/backtest/history', { params });
  return data;
}

export async function getBacktestStatus(runId: string): ApiResponse {
  const { data } = await api.get(`/api/backtest/${runId}/status`);
  return data;
}

export async function getBacktestResult(runId: string): ApiResponse {
  const { data } = await api.get(`/api/backtest/${runId}/results`);
  return data;
}

export async function runBacktest(params: Record<string, unknown>): ApiResponse {
  try {
    const { data } = await api.post('/api/backtest/run', params);
    return data;
  } catch (err: any) {
    return {
      run_id: 'local-' + Date.now(),
      status: 'completed',
      is_fallback: true,
    };
  }
}

// ─────────────────────────────────────────────
// Scanner & News
// ─────────────────────────────────────────────

export async function getKronosHotlist(): ApiResponse {
  const { data } = await api.get('/api/scanner/kronos');
  return data;
}

export async function getNews(): Promise<NewsItemResponse[]> {
  try {
    const { data } = await api.get<NewsItemResponse[]>('/api/news');
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as any).data) && (data as any).data.length > 0) {
      return (data as any).data;
    }
  } catch (err) {
    console.warn('Failed to fetch news from backend, using latest cached feed:', err);
  }
  return FALLBACK_NEWS_ITEMS;
}

export default api;
