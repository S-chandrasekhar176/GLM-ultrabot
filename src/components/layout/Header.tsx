'use client';

import { usePathname } from 'next/navigation';
import { Menu, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { useSidebar, useEngine, type MarketRegime } from '@/lib/store';
import { theme } from '@/styles/theme';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/opportunities': 'Opportunities',
  '/trades': 'Trades',
  '/strategies': 'Strategies',
  '/watchlist': 'Watchlist',
  '/risk': 'Risk Management',
  '/backtest': 'Backtest',
  '/settings': 'Settings',
  '/errors': 'Error Log',
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Prefix match for sub-routes
  const segments = pathname.split('/').filter(Boolean);
  for (let i = segments.length; i >= 1; i--) {
    const prefix = '/' + segments.slice(0, i).join('/');
    if (PAGE_TITLES[prefix]) return PAGE_TITLES[prefix];
  }
  return 'UltraBot';
}

const REGIME_CONFIG: Record<MarketRegime, { label: string; color: string; Icon: typeof TrendingUp }> = {
  bull: { label: 'Bull', color: theme.colors.bull, Icon: TrendingUp },
  bear: { label: 'Bear', color: theme.colors.bear, Icon: TrendingDown },
  sideways: { label: 'Sideways', color: theme.colors.sideways, Icon: Minus },
  volatile: { label: 'Volatile', color: theme.colors.volatile, Icon: Activity },
};

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Market Closed';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatNiftyChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

// ─────────────────────────────────────────────
// Header component
// ─────────────────────────────────────────────

export default function Header() {
  const pathname = usePathname();
  const { mobileOpen, setMobileOpen } = useSidebar();
  const {
    status: engineStatus,
    regime,
    vix,
    niftyValue,
    niftyChange,
    marketCloseSeconds,
  } = useEngine();

  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname]);
  const regimeInfo = REGIME_CONFIG[regime];
  const RegimeIcon = regimeInfo.Icon;

  const [countdown, setCountdown] = useState(marketCloseSeconds);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    setCountdown(marketCloseSeconds);
  }, [marketCloseSeconds]);

  // Tick countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
      setCurrentTime(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const engineColor = useMemo(() => {
    switch (engineStatus) {
      case 'running': return theme.colors.profit;
      case 'stopped': return theme.colors.loss;
      case 'paused': return theme.colors.warning;
    }
  }, [engineStatus]);

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 gap-4"
      style={{
        backgroundColor: theme.colors.surface,
        borderBottom: `1px solid ${theme.colors.border}`,
      }}
    >
      {/* ── Left ── */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          className="md:hidden p-1.5 rounded-md transition-colors duration-150"
          style={{ color: theme.colors.textMuted }}
          onClick={() => setMobileOpen(!mobileOpen)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Menu size={20} />
        </button>

        <h1 className="text-base font-semibold tracking-tight" style={{ color: theme.colors.textPrimary }}>
          {pageTitle}
        </h1>
      </div>

      {/* ── Right — market data badges ── */}
      <div className="flex items-center gap-2 text-xs overflow-x-auto">
        {/* Market Regime */}
        <Badge
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold border-0 rounded-full"
          style={{
            backgroundColor: `${regimeInfo.color}20`,
            color: regimeInfo.color,
          }}
        >
          <RegimeIcon size={12} />
          {regimeInfo.label}
        </Badge>

        {/* Engine Status */}
        <Badge
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold border-0 rounded-full"
          style={{
            backgroundColor: `${engineColor}20`,
            color: engineColor,
          }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: engineColor,
              boxShadow: `0 0 4px ${engineColor}`,
            }}
          />
          {engineStatus.charAt(0).toUpperCase() + engineStatus.slice(1)}
        </Badge>

        {/* VIX */}
        <Badge
          className="px-2.5 py-1 text-[11px] font-semibold border-0 rounded-full"
          style={{
            backgroundColor: theme.colors.surfaceActive,
            color: theme.colors.textMuted,
          }}
        >
          VIX {vix > 0 ? vix.toFixed(1) : '—'}
        </Badge>

        {/* Nifty */}
        <Badge
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold border-0 rounded-full"
          style={{
            backgroundColor: theme.colors.surfaceActive,
            color: niftyChange >= 0 ? theme.colors.profit : theme.colors.loss,
          }}
        >
          NIFTY {niftyValue > 0 ? niftyValue.toFixed(0) : '—'}
          {niftyChange !== 0 && (
            <span className="text-[10px]">
              ({formatNiftyChange(niftyChange)})
            </span>
          )}
        </Badge>

        {/* Market Close Countdown */}
        <Badge
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold border-0 rounded-full"
          style={{
            backgroundColor: theme.colors.surfaceActive,
            color: countdown <= 300 ? theme.colors.warning : theme.colors.textMuted,
          }}
        >
          {formatCountdown(countdown)}
        </Badge>

        {/* Clock */}
        <span
          className="hidden lg:block text-[11px] font-mono tabular-nums"
          style={{ color: theme.colors.textDisabled }}
        >
          {currentTime}
        </span>
      </div>
    </header>
  );
}
