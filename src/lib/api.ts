import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// ─────────────────────────────────────────────
// Axios instance
// ─────────────────────────────────────────────

const API_BASE_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
    : 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
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

export async function login(username: string, password: string): ApiResponse<{ token: string; username: string }> {
  const { data } = await api.post('/api/auth/login', { username, password });
  return data;
}

// ─────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────

export async function getDashboard(): ApiResponse {
  const { data } = await api.get('/api/dashboard');
  return data;
}

// ─────────────────────────────────────────────
// Opportunities
// ─────────────────────────────────────────────

export async function getOpportunities(): ApiResponse {
  const { data } = await api.get('/api/opportunities');
  return data;
}

export async function confirmOpportunity(id: string): ApiResponse {
  const { data } = await api.post(`/api/opportunities/${id}/confirm`);
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

export async function closePosition(id: string): ApiResponse {
  const { data } = await api.post(`/api/positions/${id}/close`);
  return data;
}

// ─────────────────────────────────────────────
// Strategies
// ─────────────────────────────────────────────

export async function getStrategies(): ApiResponse {
  const { data } = await api.get('/api/strategies');
  return data;
}

export async function toggleStrategy(id: string, enabled: boolean): ApiResponse {
  const { data } = await api.patch(`/api/strategies/${id}`, { enabled });
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

export async function startEngine(): ApiResponse {
  const { data } = await api.post('/api/engine/start');
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

export async function getBacktestResults(): ApiResponse {
  const { data } = await api.get('/api/backtest');
  return data;
}

export async function runBacktest(params: Record<string, unknown>): ApiResponse {
  const { data } = await api.post('/api/backtest/run', params);
  return data;
}

export default api;
