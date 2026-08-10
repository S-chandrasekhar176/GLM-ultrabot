import { create } from 'zustand';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type EngineStatus = 'running' | 'stopped' | 'paused';
export type EngineMode = 'paper' | 'live';
export type MarketRegime = 'bull' | 'bear' | 'sideways' | 'volatile';

export interface Opportunity {
  id: string;
  symbol: string;
  type: string;
  direction: 'BUY' | 'SELL';
  entry: number;
  target: number;
  stopLoss: number;
  riskReward: number;
  confidence: number;
  strategy: string;
  timestamp: string;
}

export interface LivePrice {
  symbol: string;
  ltp: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  volume: number;
}

// ─────────────────────────────────────────────
// Auth Slice
// ─────────────────────────────────────────────

interface AuthSlice {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  login: (token: string, username: string) => void;
  logout: () => void;
  hydrate: () => void;
}

function createAuthSlice(): AuthSlice {
  return {
    token: null,
    username: null,
    isAuthenticated: false,

    login(token: string, username: string) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('ultrabot_token', token);
        localStorage.setItem('ultrabot_username', username);
      }
      return { token, username, isAuthenticated: true };
    },

    logout() {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ultrabot_token');
        localStorage.removeItem('ultrabot_username');
      }
      return { token: null, username: null, isAuthenticated: false };
    },

    hydrate() {
      if (typeof window === 'undefined') return {};
      const token = localStorage.getItem('ultrabot_token');
      const username = localStorage.getItem('ultrabot_username');
      return {
        token,
        username,
        isAuthenticated: !!token,
      };
    },
  };
}

// ─────────────────────────────────────────────
// Engine Slice
// ─────────────────────────────────────────────

interface EngineSlice {
  status: EngineStatus;
  mode: EngineMode;
  regime: MarketRegime;
  vix: number;
  niftyValue: number;
  niftyChange: number;
  marketCloseSeconds: number;
  setEngineStatus: (status: EngineStatus) => void;
  setMode: (mode: EngineMode) => void;
  setRegime: (regime: MarketRegime) => void;
  setVix: (vix: number) => void;
  setNifty: (value: number, change: number) => void;
  setMarketCloseSeconds: (seconds: number) => void;
}

function createEngineSlice(): EngineSlice {
  return {
    status: 'stopped',
    mode: 'paper',
    regime: 'sideways',
    vix: 0,
    niftyValue: 0,
    niftyChange: 0,
    marketCloseSeconds: 0,
    setEngineStatus(status) {
      return { status };
    },
    setMode(mode) {
      return { mode };
    },
    setRegime(regime) {
      return { regime };
    },
    setVix(vix) {
      return { vix };
    },
    setNifty(value, change) {
      return { niftyValue: value, niftyChange: change };
    },
    setMarketCloseSeconds(seconds) {
      return { marketCloseSeconds: seconds };
    },
  };
}

// ─────────────────────────────────────────────
// Realtime Slice
// ─────────────────────────────────────────────

interface RealtimeSlice {
  livePrices: Record<string, LivePrice>;
  opportunities: Opportunity[];
  updatePrice: (price: LivePrice) => void;
  updatePrices: (prices: LivePrice[]) => void;
  addOpportunity: (opportunity: Opportunity) => void;
  setOpportunities: (opportunities: Opportunity[]) => void;
  clearOpportunities: () => void;
}

function createRealtimeSlice(): RealtimeSlice {
  return {
    livePrices: {},
    opportunities: [],

    updatePrice(price) {
      const prev = get().realtime.livePrices;
      return {
        livePrices: { ...prev, [price.symbol]: price },
      };
    },

    updatePrices(prices) {
      const prev = get().realtime.livePrices;
      const updated = { ...prev };
      for (const p of prices) {
        updated[p.symbol] = p;
      }
      return { livePrices: updated };
    },

    addOpportunity(opportunity) {
      return { opportunities: [opportunity, ...get().realtime.opportunities] };
    },

    setOpportunities(opportunities) {
      return { opportunities };
    },

    clearOpportunities() {
      return { opportunities: [] };
    },
  };
}

// ─────────────────────────────────────────────
// Sidebar Slice
// ─────────────────────────────────────────────

export interface SidebarSlice {
  collapsed: boolean;
  mobileOpen: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
  setMobileOpen: (open: boolean) => void;
}

function createSidebarSlice(): SidebarSlice {
  return {
    collapsed: false,
    mobileOpen: false,
    toggle() {
      return { collapsed: !get().sidebar.collapsed };
    },
    setCollapsed(collapsed) {
      return { collapsed };
    },
    setMobileOpen(mobileOpen) {
      return { mobileOpen };
    },
  };
}

// ─────────────────────────────────────────────
// Combined Store
// ─────────────────────────────────────────────

interface StoreState {
  auth: AuthSlice;
  engine: EngineSlice;
  realtime: RealtimeSlice;
  sidebar: SidebarSlice;
  // Actions that need cross-slice access
  login: (token: string, username: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useStore = create<StoreState>((...args) => {
  const [set, get] = args as [typeof args[0], typeof args[1]];

  const authSlice = createAuthSlice();
  const engineSlice = createEngineSlice();
  const realtimeSlice = createRealtimeSlice();
  const sidebarSlice = createSidebarSlice();

  return {
    auth: {
      ...authSlice,
      login(token: string, username: string) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('ultrabot_token', token);
          localStorage.setItem('ultrabot_username', username);
        }
        set({ auth: { ...get().auth, token, username, isAuthenticated: true } });
      },
      logout() {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('ultrabot_token');
          localStorage.removeItem('ultrabot_username');
        }
        set({ auth: { token: null, username: null, isAuthenticated: false } });
      },
      hydrate() {
        if (typeof window === 'undefined') return;
        const token = localStorage.getItem('ultrabot_token');
        const username = localStorage.getItem('ultrabot_username');
        set({
          auth: { token, username, isAuthenticated: !!token },
        });
      },
    },
    engine: {
      ...engineSlice,
      setEngineStatus(status) {
        set({ engine: { ...get().engine, status } });
      },
      setMode(mode) {
        set({ engine: { ...get().engine, mode } });
      },
      setRegime(regime) {
        set({ engine: { ...get().engine, regime } });
      },
      setVix(vix) {
        set({ engine: { ...get().engine, vix } });
      },
      setNifty(value, change) {
        set({ engine: { ...get().engine, niftyValue: value, niftyChange: change } });
      },
      setMarketCloseSeconds(seconds) {
        set({ engine: { ...get().engine, marketCloseSeconds: seconds } });
      },
    },
    realtime: {
      ...realtimeSlice,
      updatePrice(price) {
        set({
          realtime: {
            ...get().realtime,
            livePrices: { ...get().realtime.livePrices, [price.symbol]: price },
          },
        });
      },
      updatePrices(prices) {
        const updated = { ...get().realtime.livePrices };
        for (const p of prices) {
          updated[p.symbol] = p;
        }
        set({ realtime: { ...get().realtime, livePrices: updated } });
      },
      addOpportunity(opportunity) {
        set({
          realtime: {
            ...get().realtime,
            opportunities: [opportunity, ...get().realtime.opportunities],
          },
        });
      },
      setOpportunities(opportunities) {
        set({ realtime: { ...get().realtime, opportunities } });
      },
      clearOpportunities() {
        set({ realtime: { ...get().realtime, opportunities: [] } });
      },
    },
    sidebar: {
      ...sidebarSlice,
      toggle() {
        set({ sidebar: { ...get().sidebar, collapsed: !get().sidebar.collapsed } });
      },
      setCollapsed(collapsed) {
        set({ sidebar: { ...get().sidebar, collapsed } });
      },
      setMobileOpen(mobileOpen) {
        set({ sidebar: { ...get().sidebar, mobileOpen } });
      },
    },
    // Top-level convenience proxies
    login(token: string, username: string) {
      get().auth.login(token, username);
    },
    logout() {
      get().auth.logout();
    },
    hydrate() {
      get().auth.hydrate();
    },
  };
});

// Selectors
export const useAuth = () => useStore((s) => s.auth);
export const useEngine = () => useStore((s) => s.engine);
export const useRealtime = () => useStore((s) => s.realtime);
export const useSidebar = () => useStore((s) => s.sidebar);
