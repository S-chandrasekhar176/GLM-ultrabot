'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronDown,
  FlaskConical,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  BarChart3,
} from 'lucide-react';
import { useEngine, type MarketRegime } from '@/lib/store';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface StrategyParams {
  [key: string]: string | number | boolean;
}

interface Strategy {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'advanced';
  active: boolean;
  winRate: number;
  signals: number;
  trades: number;
  pauseReason?: 'regime_mismatch' | 'manual_pause';
  sparkline: number[];
  params: StrategyParams;
}

// ─────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────

const MOCK_STRATEGIES: Strategy[] = [
  {
    id: 'breakout',
    name: 'Breakout',
    description: 'Identifies price breakouts above key resistance levels with volume confirmation',
    category: 'core',
    active: true,
    winRate: 68.5,
    signals: 5,
    trades: 3,
    sparkline: [62, 65, 60, 67, 70, 64, 72, 68.5],
    params: { lookback: 20, volumeMultiplier: 1.5, atrPeriod: 14, minBreakoutPct: 1.5, timeframe: '5m' },
  },
  {
    id: 'meanreversion',
    name: 'Mean Reversion',
    description: 'Trades overextended moves expecting price to revert to VWAP or moving average',
    category: 'core',
    active: true,
    winRate: 64.2,
    signals: 8,
    trades: 5,
    sparkline: [58, 62, 66, 63, 60, 65, 67, 64.2],
    params: { bbPeriod: 20, bbStdDev: 2.0, rsiPeriod: 14, rsiOversold: 30, rsiOverbought: 70, meanSource: 'VWAP' },
  },
  {
    id: 'momentum',
    name: 'Momentum',
    description: 'Captures strong directional moves using MACD crossover and ADX strength filter',
    category: 'core',
    active: true,
    winRate: 61.8,
    signals: 4,
    trades: 2,
    sparkline: [55, 58, 63, 60, 59, 64, 62, 61.8],
    params: { macdFast: 12, macdSlow: 26, macdSignal: 9, adxPeriod: 14, adxThreshold: 25 },
  },
  {
    id: 'orb',
    name: 'ORB',
    description: 'Opening Range Breakout strategy trading the first 15-min candle range',
    category: 'core',
    active: true,
    winRate: 70.1,
    signals: 3,
    trades: 3,
    sparkline: [66, 68, 71, 69, 72, 67, 74, 70.1],
    params: { rangeMinutes: 15, entryBuffer: 0.2, stopBuffer: 0.3, maxHoldingMin: 120, direction: 'Both' },
  },
  {
    id: 'rsidivergence',
    name: 'RSI Divergence',
    description: 'Detects bullish/bearish divergence between RSI and price for reversal signals',
    category: 'core',
    active: false,
    winRate: 57.3,
    signals: 6,
    trades: 4,
    pauseReason: 'regime_mismatch',
    sparkline: [52, 55, 53, 58, 56, 54, 60, 57.3],
    params: { rsiPeriod: 14, divergenceLookback: 30, minDivergencePct: 0.5, confirmationCandles: 2 },
  },
  {
    id: 'supertrend',
    name: 'Supertrend',
    description: 'Trend-following using Supertrend indicator with ATR-based trailing stops',
    category: 'core',
    active: true,
    winRate: 66.4,
    signals: 7,
    trades: 4,
    sparkline: [60, 63, 61, 65, 68, 64, 70, 66.4],
    params: { atrPeriod: 10, multiplier: 3.0, timeframe: '15m', reentryCooldown: 5 },
  },
  {
    id: 'vwapreversion',
    name: 'VWAP Reversion',
    description: 'Mean reversion to VWAP with standard deviation bands for intraday trades',
    category: 'core',
    active: true,
    winRate: 63.7,
    signals: 9,
    trades: 6,
    sparkline: [58, 61, 60, 64, 62, 66, 63, 63.7],
    params: { sdMultiplier: 2.0, minDistanceSd: 1.5, maxHoldingMin: 90, exitAtVwap: true },
  },
  {
    id: 'gapfill',
    name: 'Gap Fill',
    description: 'Trades gap-down/up openings with statistical probability of gap filling',
    category: 'advanced',
    active: true,
    winRate: 72.8,
    signals: 2,
    trades: 2,
    sparkline: [68, 70, 74, 71, 69, 73, 76, 72.8],
    params: { minGapPct: 0.8, maxGapPct: 3.0, fillTimeLimit: 120, volumeConfirm: true, gapType: 'Both' },
  },
  {
    id: 'sectorrotation',
    name: 'Sector Rotation',
    description: 'Identifies sector strength rotation and picks leading stocks in hot sectors',
    category: 'advanced',
    active: false,
    winRate: 59.4,
    signals: 4,
    trades: 2,
    pauseReason: 'manual_pause',
    sparkline: [54, 57, 55, 60, 58, 62, 56, 59.4],
    params: { sectorLookback: 5, topNSectors: 2, topNStocks: 3, rebalanceMin: 30, minRelativeStrength: 60 },
  },
  {
    id: 'multitimeframe',
    name: 'Multi-Timeframe',
    description: 'Aligns signals across 5m, 15m, and 1h timeframes for high-conviction entries',
    category: 'advanced',
    active: true,
    winRate: 71.2,
    signals: 3,
    trades: 3,
    sparkline: [64, 67, 69, 66, 70, 73, 68, 71.2],
    params: { timeframes: '5m,15m,1h', minAlignment: 2, primaryTf: '15m', signalWeight: 0.7 },
  },
  {
    id: 'orbvolume',
    name: 'ORB Volume',
    description: 'Enhanced ORB with volume profile analysis to predict breakout direction',
    category: 'advanced',
    active: true,
    winRate: 69.5,
    signals: 3,
    trades: 2,
    sparkline: [63, 66, 68, 65, 71, 67, 72, 69.5],
    params: { rangeMinutes: 30, vpMinVolume: 1.8, vpAsymmetry: 0.3, minPocDistance: 0.5 },
  },
  {
    id: 'trendexhaustion',
    name: 'Trend Exhaustion',
    description: 'Identifies exhaustion patterns using volume climaxes and wedge breakdowns',
    category: 'advanced',
    active: false,
    winRate: 55.9,
    signals: 5,
    trades: 3,
    pauseReason: 'regime_mismatch',
    sparkline: [50, 53, 51, 56, 54, 52, 57, 55.9],
    params: { volumeRatio: 2.5, rsiExtreme: 75, wedgePeriod: 20, confirmationBars: 3 },
  },
  {
    id: 'newsmomentum',
    name: 'News Momentum',
    description: 'Trades stocks with strong news sentiment and price gap alignment',
    category: 'advanced',
    active: true,
    winRate: 67.1,
    signals: 6,
    trades: 4,
    sparkline: [61, 64, 66, 63, 68, 65, 70, 67.1],
    params: { sentimentThreshold: 0.7, gapAlignMin: 0.5, maxEntryDelay: 15, stopMultiplier: 1.5 },
  },
  {
    id: 'adaptivesupertrend',
    name: 'Adaptive Supertrend',
    description: 'Dynamic Supertrend with regime-adaptive ATR multiplier and trend strength filter',
    category: 'advanced',
    active: true,
    winRate: 73.6,
    signals: 4,
    trades: 3,
    sparkline: [67, 70, 72, 69, 74, 71, 76, 73.6],
    params: { baseMultiplier: 2.5, volatileMultiplier: 4.0, trendStrengthMin: 0.6, reentryCooldown: 10 },
  },
];

// ─────────────────────────────────────────────
// Regime Config
// ─────────────────────────────────────────────

const REGIME_CONFIG: Record<MarketRegime, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  bull: { label: 'Bull', color: 'text-ub-profit', bgColor: 'bg-ub-profit/15 border-ub-profit/30', icon: TrendingUp },
  bear: { label: 'Bear', color: 'text-ub-loss', bgColor: 'bg-ub-loss/15 border-ub-loss/30', icon: TrendingDown },
  sideways: { label: 'Sideways', color: 'text-ub-warning', bgColor: 'bg-ub-warning/15 border-ub-warning/30', icon: Minus },
  volatile: { label: 'Volatile', color: 'text-ub-volatile', bgColor: 'bg-ub-volatile/15 border-ub-volatile/30', icon: Zap },
};

// ─────────────────────────────────────────────
// Sparkline Component
// ─────────────────────────────────────────────

function Sparkline({ data, color = '#00d09c' }: { data: number[]; color?: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 28;
  const padding = 2;

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((v - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────
// Strategy Card
// ─────────────────────────────────────────────

function StrategyCard({ strategy, onToggle }: { strategy: Strategy; onToggle: (id: string, enabled: boolean) => void }) {
  const [expanded, setExpanded] = useState(false);

  const winRateColor =
    strategy.winRate >= 65 ? 'text-ub-profit' : strategy.winRate >= 58 ? 'text-ub-warning' : 'text-ub-loss';

  const sparkColor = strategy.active ? (strategy.winRate >= 65 ? '#22c55e' : '#f59e0b') : '#475569';

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <Card
        className={cn(
          'bg-ub-surface border-ub-border transition-all duration-200',
          strategy.active
            ? 'hover:border-ub-accent/40'
            : 'opacity-70 hover:opacity-100',
          expanded && 'border-ub-accent/50',
        )}
      >
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none p-4 pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-ub-text-primary text-sm">{strategy.name}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] px-1.5 py-0',
                      strategy.active
                        ? 'border-ub-profit/40 text-ub-profit bg-ub-profit/10'
                        : 'border-ub-warning/40 text-ub-warning bg-ub-warning/10',
                    )}
                  >
                    {strategy.active ? 'Active' : 'Paused'}
                  </Badge>
                </div>
                <p className="text-xs text-ub-text-muted mt-1 truncate">{strategy.description}</p>
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-ub-text-muted shrink-0 transition-transform duration-200',
                  expanded && 'rotate-180',
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CardContent className="p-4 pt-0">
          {strategy.pauseReason && !strategy.active && (
            <p className="text-[11px] text-ub-warning mb-2">
              ⚠ {strategy.pauseReason === 'regime_mismatch' ? 'Regime mismatch' : 'Manual pause'}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs mb-3">
            <span className={cn('font-medium', winRateColor)}>
              Win Rate: {strategy.winRate}%
            </span>
            <Sparkline data={strategy.sparkline} color={sparkColor} />
          </div>

          <div className="flex items-center gap-4 text-xs text-ub-text-muted mb-3">
            <span>
              Signals: <span className="text-ub-text-primary font-medium">{strategy.signals}</span>{' '}
              | Trades: <span className="text-ub-text-primary font-medium">{strategy.trades}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={strategy.active}
              onCheckedChange={(checked) => onToggle(strategy.id, checked)}
              className="data-[state=checked]:bg-ub-accent"
            />
            <Button variant="outline" size="sm" className="ml-auto h-7 text-xs gap-1 border-ub-border text-ub-text-muted hover:text-ub-accent hover:border-ub-accent/40">
              <FlaskConical className="h-3 w-3" />
              Backtest
            </Button>
          </div>

          <CollapsibleContent>
            <Separator className="my-3 bg-ub-border" />
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-ub-text-muted uppercase tracking-wider mb-2">
                Strategy Parameters
              </p>
              {Object.entries(strategy.params).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-ub-text-muted">{key}</span>
                  <span className="text-ub-text-primary font-mono bg-ub-bg/50 px-1.5 py-0.5 rounded">
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  );
}

// ─────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────

export default function StrategiesPage() {
  const { regime, vix } = useEngine();
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [manualEnabled, setManualEnabled] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    MOCK_STRATEGIES.forEach((s) => { map[s.id] = s.active; });
    return map;
  });
  const [strategies, setStrategies] = useState<Strategy[]>(MOCK_STRATEGIES);

  const regimeConfig = REGIME_CONFIG[regime];
  const RegimeIcon = regimeConfig.icon;

  const confidence = useMemo(() => {
    switch (regime) {
      case 'bull': return 78;
      case 'bear': return 65;
      case 'sideways': return 52;
      case 'volatile': return 41;
    }
  }, [regime]);

  const coreStrategies = useMemo(() => strategies.filter((s) => s.category === 'core'), [strategies]);
  const advancedStrategies = useMemo(() => strategies.filter((s) => s.category === 'advanced'), [strategies]);

  const handleToggle = (id: string, enabled: boolean) => {
    setStrategies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: enabled, pauseReason: enabled ? undefined : 'manual_pause' as const } : s)),
    );
    setManualEnabled((prev) => ({ ...prev, [id]: enabled }));
  };

  const handleManualCheck = (id: string, checked: boolean) => {
    setManualEnabled((prev) => ({ ...prev, [id]: checked }));
    setStrategies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: checked, pauseReason: checked ? undefined : 'manual_pause' as const } : s)),
    );
  };

  return (
    <main className="min-h-screen bg-ub-background p-4 md:p-6 space-y-6">
      {/* ── Market Regime Panel ── */}
      <Card className="bg-ub-surface border-ub-border">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-base font-semibold text-ub-text-primary flex items-center gap-2">
            <Activity className="h-4 w-4 text-ub-accent" />
            Market Regime
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Badge
              variant="outline"
              className={cn('text-xs px-3 py-1 border gap-1.5', regimeConfig.bgColor, regimeConfig.color)}
            >
              <RegimeIcon className="h-3.5 w-3.5" />
              {regimeConfig.label}
            </Badge>

            <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-xs">
              <span className="text-xs text-ub-text-muted">Confidence</span>
              <Progress value={confidence} className="h-2 flex-1" />
              <span className="text-xs font-medium text-ub-text-primary">{confidence}%</span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-ub-text-muted">Auto</span>
              <Switch
                checked={isAutoMode}
                onCheckedChange={setIsAutoMode}
                className="data-[state=checked]:bg-ub-accent"
              />
              <span className="text-xs text-ub-text-muted">Manual</span>
            </div>
          </div>

          {/* VIX display */}
          <div className="flex items-center gap-2 text-xs text-ub-text-muted">
            <BarChart3 className="h-3 w-3" />
            <span>India VIX:</span>
            <span className={cn('font-medium', vix > 20 ? 'text-ub-volatile' : vix > 15 ? 'text-ub-warning' : 'text-ub-profit')}>
              {vix > 0 ? vix.toFixed(1) : '16.5'}
            </span>
          </div>

          {/* Manual mode checklist */}
          {!isAutoMode && (
            <div className="mt-3 p-3 bg-ub-bg rounded-lg border border-ub-border space-y-2">
              <p className="text-xs font-medium text-ub-text-muted uppercase tracking-wider">
                Manual Strategy Selection
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {strategies.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-ub-surface-hover rounded px-2 py-1.5 transition-colors"
                  >
                    <Checkbox
                      checked={manualEnabled[s.id]}
                      onCheckedChange={(checked) => handleManualCheck(s.id, !!checked)}
                      className="data-[state=checked]:bg-ub-accent data-[state=checked]:border-ub-accent"
                    />
                    <span className="text-xs text-ub-text-primary">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Core Strategies ── */}
      <section>
        <h3 className="text-sm font-semibold text-ub-text-primary mb-3 flex items-center gap-2">
          <span className="w-1.5 h-4 rounded-full bg-ub-accent" />
          Core Strategies ({coreStrategies.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coreStrategies.map((s) => (
            <StrategyCard key={s.id} strategy={s} onToggle={handleToggle} />
          ))}
        </div>
      </section>

      {/* ── Advanced Strategies ── */}
      <section>
        <h3 className="text-sm font-semibold text-ub-text-primary mb-3 flex items-center gap-2">
          <span className="w-1.5 h-4 rounded-full bg-ub-volatile" />
          Advanced Strategies ({advancedStrategies.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {advancedStrategies.map((s) => (
            <StrategyCard key={s.id} strategy={s} onToggle={handleToggle} />
          ))}
        </div>
      </section>
    </main>
  );
}