'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldAlert,
  Play,
  Square,
  Clock,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Radio,
  SignalHigh,
  Eye,
  AlertTriangle,
  Power,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDashboard } from '@/hooks/useApi';
import { useEngine } from '@/hooks/useEngine';
import { useEngine as useEngineStore, type MarketRegime } from '@/lib/store';
import StartEngineDialog from '@/components/trading/StartEngineDialog';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Position {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entry: number;
  current: number;
  qty: number;
  pnl: number;
  bookedLevels: number[];
}

interface Trade {
  id: string;
  time: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  pnl: number;
}

interface DashboardData {
  todayPnl: number;
  todayPnlPercent: number;
  activePositions: number;
  longCount: number;
  shortCount: number;
  winRate: number;
  riskUsed: number;
  totalCapital: number;
  capitalUsed: number;
  freeCapital: number;
  dayPnl: number;
  totalPnl: number;
  positions: Position[];
  recentTrades: Trade[];
  engineStatus: string;
  engineMode: string;
  regime: MarketRegime;
  regimeConfidence: number;
  activeStrategies: string[];
  signalsGenerated: number;
  signalsConfirmed: number;
  signalsSkipped: number;
}

// ─────────────────────────────────────────────
// Mock / Fallback Data
// ─────────────────────────────────────────────

const MOCK_DATA: DashboardData = {
  todayPnl: 3_842.5,
  todayPnlPercent: 3.84,
  activePositions: 5,
  longCount: 3,
  shortCount: 2,
  winRate: 72.5,
  riskUsed: 38,
  totalCapital: 1_00_000,
  capitalUsed: 38_000,
  freeCapital: 62_000,
  dayPnl: 3_842.5,
  totalPnl: 18_640.75,
  positions: [
    {
      id: '1',
      symbol: 'NIFTY 24700 CE',
      direction: 'BUY',
      entry: 245.50,
      current: 268.30,
      qty: 50,
      pnl: 1_140.0,
      bookedLevels: [258.0, 262.5],
    },
    {
      id: '2',
      symbol: 'BANKNIFTY 52000 PE',
      direction: 'BUY',
      entry: 180.25,
      current: 195.80,
      qty: 30,
      pnl: 466.5,
      bookedLevels: [],
    },
    {
      id: '3',
      symbol: 'RELIANCE 2950 CE',
      direction: 'SELL',
      entry: 32.40,
      current: 28.90,
      qty: 250,
      pnl: 875.0,
      bookedLevels: [30.5],
    },
    {
      id: '4',
      symbol: 'TCS 3800 PE',
      direction: 'BUY',
      entry: 45.60,
      current: 52.15,
      qty: 150,
      pnl: 982.5,
      bookedLevels: [49.0],
    },
    {
      id: '5',
      symbol: 'HDFCBANK 1650 CE',
      direction: 'SELL',
      entry: 38.75,
      current: 41.20,
      qty: 200,
      pnl: -490.0,
      bookedLevels: [],
    },
  ],
  recentTrades: [
    { id: 't1', time: '14:32:05', symbol: 'NIFTY 24650 CE', direction: 'BUY', pnl: 2_340.0 },
    { id: 't2', time: '13:18:42', symbol: 'BANKNIFTY 52100 PE', direction: 'BUY', pnl: 890.0 },
    { id: 't3', time: '12:45:10', symbol: 'INFY 1800 CE', direction: 'SELL', pnl: -520.0 },
    { id: 't4', time: '11:22:33', symbol: 'WIPRO 520 PE', direction: 'BUY', pnl: 1_150.0 },
    { id: 't5', time: '10:05:18', symbol: 'SBIN 820 CE', direction: 'BUY', pnl: -380.0 },
  ],
  engineStatus: 'running',
  engineMode: 'paper',
  regime: 'bull',
  regimeConfidence: 78,
  activeStrategies: ['Momentum Breakout', 'VWAP Reversion', 'RSI Divergence'],
  signalsGenerated: 24,
  signalsConfirmed: 12,
  signalsSkipped: 8,
};

// ─────────────────────────────────────────────
// Indian Number Formatting
// ─────────────────────────────────────────────

function formatINR(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const parts = abs.toFixed(2).split('.');
  const intPart = parts[0];
  const decPart = parts[1];
  let formatted = '';
  if (intPart.length <= 3) {
    formatted = intPart;
  } else {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  }
  return `₹${sign}${formatted}.${decPart}`;
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// ─────────────────────────────────────────────
// Circular Progress (SVG)
// ─────────────────────────────────────────────

function CircularProgress({ value, size = 64, strokeWidth = 5, color = '#00d09c' }: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#1e293b"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
      <text
        x={size / 2}
        y={size / 2}
        className="fill-ub-text-primary text-xs font-bold"
        textAnchor="middle"
        dominantBaseline="central"
        transform={`rotate(90, ${size / 2}, ${size / 2})`}
      >
        {value.toFixed(0)}%
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────
// Risk Bar Color Helper
// ─────────────────────────────────────────────

function getRiskColor(pct: number): string {
  if (pct < 50) return '#22c55e';
  if (pct <= 80) return '#f59e0b';
  return '#ef4444';
}

function getRiskLabel(pct: number): string {
  if (pct < 50) return 'Low';
  if (pct <= 80) return 'Medium';
  return 'High';
}

// ─────────────────────────────────────────────
// Regime Config
// ─────────────────────────────────────────────

const REGIME_CONFIG: Record<MarketRegime, { label: string; colorClass: string; bgClass: string; borderClass: string }> = {
  bull: {
    label: 'Bull',
    colorClass: 'text-ub-bull',
    bgClass: 'bg-ub-bull/15',
    borderClass: 'border-ub-bull/30',
  },
  bear: {
    label: 'Bear',
    colorClass: 'text-ub-bear',
    bgClass: 'bg-ub-bear/15',
    borderClass: 'border-ub-bear/30',
  },
  sideways: {
    label: 'Sideways',
    colorClass: 'text-ub-sideways',
    bgClass: 'bg-ub-sideways/15',
    borderClass: 'border-ub-sideways/30',
  },
  volatile: {
    label: 'Volatile',
    colorClass: 'text-ub-volatile',
    bgClass: 'bg-ub-volatile/15',
    borderClass: 'border-ub-volatile/30',
  },
};

// ─────────────────────────────────────────────
// Skeleton Loaders
// ─────────────────────────────────────────────

function StatsRowSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="bg-ub-surface border-ub-border rounded-lg">
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-28 bg-ub-border" />
            <Skeleton className="h-8 w-32 bg-ub-border" />
            <Skeleton className="h-3 w-20 bg-ub-border" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MainContentSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 space-y-4">
        <Card className="bg-ub-surface border-ub-border rounded-lg">
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-5 w-32 bg-ub-border" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full bg-ub-border" />
            ))}
          </CardContent>
        </Card>
        <Card className="bg-ub-surface border-ub-border rounded-lg">
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-5 w-36 bg-ub-border" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full bg-ub-border" />
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-ub-surface border-ub-border rounded-lg">
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-28 bg-ub-border" />
              <Skeleton className="h-4 w-20 bg-ub-border" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Market Timer Component
// ─────────────────────────────────────────────

function MarketTimer() {
  const [now, setNow] = useState(() => new Date());
  const engine = useEngineStore();

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(interval);
  }, []);

  const istString = now.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const marketCloseSeconds = engine.marketCloseSeconds;
  const hours = Math.floor(marketCloseSeconds / 3600);
  const minutes = Math.floor((marketCloseSeconds % 3600) / 60);
  const seconds = Math.floor(marketCloseSeconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  const timeToClose = marketCloseSeconds > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : 'Market Closed';

  const isUrgent = marketCloseSeconds > 0 && marketCloseSeconds < 1800;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-ub-text-muted" />
        <span className="text-lg font-mono font-bold text-ub-text-primary tracking-wider">
          {istString}
        </span>
        <Badge variant="outline" className="text-[10px] font-medium border-ub-border text-ub-text-muted">
          IST
        </Badge>
      </div>
      <Separator className="bg-ub-border" />
      <div className="flex items-center justify-between">
        <span className="text-xs text-ub-text-muted">Time to Close</span>
        <span className={`text-sm font-mono font-semibold ${isUrgent ? 'text-ub-warning' : 'text-ub-text-primary'}`}>
          {timeToClose}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Stat Card Component
// ─────────────────────────────────────────────

function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="bg-ub-surface border-ub-border rounded-lg">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-ub-text-muted uppercase tracking-wider mb-2">
          {title}
        </p>
        {children}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Dashboard Section Card
// ─────────────────────────────────────────────

function SectionCard({ title, icon: Icon, children, className = '' }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`bg-ub-surface border-ub-border rounded-lg ${className}`}>
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-ub-text-primary flex items-center gap-2">
          <Icon className="h-4 w-4 text-ub-accent" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {children}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────

export default function DashboardPage() {
  const { data: apiData, isLoading } = useDashboard();
  const engine = useEngine();
  const engineStore = useEngineStore();

  // Merge API data with store state, fall back to mock
  const data: DashboardData = useMemo(() => {
    const raw = apiData as Record<string, unknown> | undefined;
    if (!raw || !raw.todayPnl) return MOCK_DATA;
    return {
      todayPnl: (raw.todayPnl as number) ?? MOCK_DATA.todayPnl,
      todayPnlPercent: (raw.todayPnlPercent as number) ?? MOCK_DATA.todayPnlPercent,
      activePositions: (raw.activePositions as number) ?? MOCK_DATA.activePositions,
      longCount: (raw.longCount as number) ?? MOCK_DATA.longCount,
      shortCount: (raw.shortCount as number) ?? MOCK_DATA.shortCount,
      winRate: (raw.winRate as number) ?? MOCK_DATA.winRate,
      riskUsed: (raw.riskUsed as number) ?? MOCK_DATA.riskUsed,
      totalCapital: (raw.totalCapital as number) ?? MOCK_DATA.totalCapital,
      capitalUsed: (raw.capitalUsed as number) ?? MOCK_DATA.capitalUsed,
      freeCapital: (raw.freeCapital as number) ?? MOCK_DATA.freeCapital,
      dayPnl: (raw.dayPnl as number) ?? MOCK_DATA.dayPnl,
      totalPnl: (raw.totalPnl as number) ?? MOCK_DATA.totalPnl,
      positions: (Array.isArray(raw.positions) && raw.positions.length > 0 ? raw.positions : MOCK_DATA.positions) as Position[],
      recentTrades: (Array.isArray(raw.recentTrades) && raw.recentTrades.length > 0 ? raw.recentTrades : MOCK_DATA.recentTrades) as Trade[],
      engineStatus: (raw.engineStatus as string) ?? engineStore.status ?? MOCK_DATA.engineStatus,
      engineMode: (raw.engineMode as string) ?? engineStore.mode ?? MOCK_DATA.engineMode,
      regime: (raw.regime as MarketRegime) ?? engineStore.regime ?? MOCK_DATA.regime,
      regimeConfidence: (raw.regimeConfidence as number) ?? MOCK_DATA.regimeConfidence,
      activeStrategies: (Array.isArray(raw.activeStrategies) && raw.activeStrategies.length > 0 ? raw.activeStrategies : MOCK_DATA.activeStrategies) as string[],
      signalsGenerated: (raw.signalsGenerated as number) ?? MOCK_DATA.signalsGenerated,
      signalsConfirmed: (raw.signalsConfirmed as number) ?? MOCK_DATA.signalsConfirmed,
      signalsSkipped: (raw.signalsSkipped as number) ?? MOCK_DATA.signalsSkipped,
    };
  }, [apiData, engineStore.status, engineStore.mode, engineStore.regime]);

  const pnlIsPositive = data.todayPnl >= 0;
  const pnlColor = data.todayPnl > 0 ? 'text-ub-profit' : data.todayPnl < 0 ? 'text-ub-loss' : 'text-ub-text-muted';
  const riskColor = getRiskColor(data.riskUsed);
  const capitalUsedPct = data.totalCapital > 0 ? (data.capitalUsed / data.totalCapital) * 100 : 0;

  const engineStatus = (engineStore.status || data.engineStatus || 'stopped') as 'running' | 'stopped' | 'paused';
  const engineMode = (engineStore.mode || data.engineMode || 'paper') as 'paper' | 'live';
  const regime = (engineStore.regime || data.regime || 'sideways') as MarketRegime;
  const regimeConf = data.regimeConfidence;
  const regimeCfg = REGIME_CONFIG[regime];

  const [engineDialogOpen, setEngineDialogOpen] = useState(false);

  const handleStartStop = useCallback(() => {
    if (engineStatus === 'running' || engineStatus === 'paused') {
      engine.stop();
    } else {
      setEngineDialogOpen(true);
    }
  }, [engineStatus, engine]);

  const handleEngineStart = useCallback((_mode: 'paper' | 'live', _brokerId: string) => {
    engine.start();
    setEngineDialogOpen(false);
  }, [engine]);

  return (
    <TooltipProvider delayDuration={300}>
        {isLoading ? (
          <div className="space-y-4">
            <StatsRowSkeleton />
            <MainContentSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* ────────────────────────────────────────
                SECTION 1: TOP STATS ROW
            ──────────────────────────────────────── */}

            {/* Card 1: Today's P&L */}
            <StatCard title="Today's P&L">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${pnlIsPositive ? 'bg-ub-profit/10' : 'bg-ub-loss/10'}`}>
                  {pnlIsPositive ? (
                    <TrendingUp className="h-5 w-5 text-ub-profit" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-ub-loss" />
                  )}
                </div>
                <div>
                  <p className={`text-xl font-bold font-mono ${pnlColor}`}>
                    {formatINR(data.todayPnl)}
                  </p>
                  <p className={`text-xs font-medium ${pnlColor}`}>
                    {formatPercent(data.todayPnlPercent)}
                  </p>
                </div>
              </div>
            </StatCard>

            {/* Card 2: Active Positions */}
            <StatCard title="Active Positions">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-ub-accent/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-ub-accent" />
                </div>
                <div>
                  <p className="text-xl font-bold text-ub-text-primary font-mono">
                    {data.activePositions}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-ub-profit font-medium">
                      {data.longCount} Long
                    </span>
                    <span className="text-ub-border">|</span>
                    <span className="text-xs text-ub-loss font-medium">
                      {data.shortCount} Short
                    </span>
                  </div>
                </div>
              </div>
            </StatCard>

            {/* Card 3: Day Win Rate */}
            <StatCard title="Day Win Rate">
              <div className="flex items-center gap-4">
                <CircularProgress
                  value={data.winRate}
                  size={68}
                  strokeWidth={5}
                  color={data.winRate >= 60 ? '#22c55e' : data.winRate >= 40 ? '#f59e0b' : '#ef4444'}
                />
                <div className="flex flex-col">
                  <span className="text-xs text-ub-text-muted">Trades Won</span>
                  <span className={`text-sm font-semibold ${data.winRate >= 60 ? 'text-ub-profit' : data.winRate >= 40 ? 'text-ub-warning' : 'text-ub-loss'}`}>
                    {data.winRate >= 60 ? 'Good' : data.winRate >= 40 ? 'Average' : 'Poor'}
                  </span>
                </div>
              </div>
            </StatCard>

            {/* Card 4: Risk Used */}
            <StatCard title="Risk Used">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className={`h-5 w-5`} style={{ color: riskColor }} />
                    <span className="text-xl font-bold font-mono" style={{ color: riskColor }}>
                      {data.riskUsed}%
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold"
                    style={{
                      color: riskColor,
                      borderColor: riskColor + '40',
                      backgroundColor: riskColor + '15',
                    }}
                  >
                    {getRiskLabel(data.riskUsed)}
                  </Badge>
                </div>
                <div className="h-2 w-full rounded-full bg-ub-border overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(data.riskUsed, 100)}%`,
                      backgroundColor: riskColor,
                    }}
                  />
                </div>
                <p className="text-[11px] text-ub-text-muted">
                  {data.riskUsed < 50
                    ? 'Healthy risk utilization'
                    : data.riskUsed <= 80
                      ? 'Approaching limit — exercise caution'
                      : 'High risk — consider reducing exposure'}
                </p>
              </div>
            </StatCard>

            {/* ────────────────────────────────────────
                SECTION 2: MAIN CONTENT — LEFT (3/5)
            ──────────────────────────────────────── */}

            {/* Capital Panel */}
            <SectionCard title="Capital Overview" icon={BarChart3} className="md:col-span-1 xl:col-span-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-[11px] text-ub-text-muted uppercase tracking-wider">Total Capital</p>
                  <p className="text-sm font-bold text-ub-text-primary font-mono mt-0.5">
                    {formatINR(data.totalCapital)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-ub-text-muted uppercase tracking-wider">Capital Used</p>
                  <p className="text-sm font-bold text-ub-warning font-mono mt-0.5">
                    {formatINR(data.capitalUsed)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-ub-text-muted uppercase tracking-wider">Free Capital</p>
                  <p className="text-sm font-bold text-ub-profit font-mono mt-0.5">
                    {formatINR(data.freeCapital)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-ub-text-muted uppercase tracking-wider">Day P&L</p>
                  <p className={`text-sm font-bold font-mono mt-0.5 ${data.dayPnl >= 0 ? 'text-ub-profit' : 'text-ub-loss'}`}>
                    {formatINR(data.dayPnl)}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ub-text-muted">Capital Utilization</span>
                  <span className="text-ub-text-primary font-medium font-mono">{capitalUsedPct.toFixed(1)}%</span>
                </div>
                <Progress
                  value={capitalUsedPct}
                  className="h-2 bg-ub-border [&>div]:bg-ub-accent"
                />
              </div>
              <Separator className="my-3 bg-ub-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-ub-text-muted">Total P&L (All Time)</span>
                <span className={`text-base font-bold font-mono ${data.totalPnl >= 0 ? 'text-ub-profit' : 'text-ub-loss'}`}>
                  {formatINR(data.totalPnl)}
                </span>
              </div>
            </SectionCard>

            {/* ────────────────────────────────────────
                SECTION 2: MAIN CONTENT — RIGHT (2/5)
            ──────────────────────────────────────── */}

            {/* Engine Status */}
            <SectionCard title="Engine Status" icon={Zap} className="xl:col-span-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        engineStatus === 'running'
                          ? 'bg-ub-profit animate-pulse'
                          : engineStatus === 'paused'
                            ? 'bg-ub-warning'
                            : 'bg-ub-loss'
                      }`}
                    />
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold ${
                        engineStatus === 'running'
                          ? 'border-ub-profit/30 text-ub-profit bg-ub-profit/10'
                          : engineStatus === 'paused'
                            ? 'border-ub-warning/30 text-ub-warning bg-ub-warning/10'
                            : 'border-ub-loss/30 text-ub-loss bg-ub-loss/10'
                      }`}
                    >
                      {engineStatus.charAt(0).toUpperCase() + engineStatus.slice(1)}
                    </Badge>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold ${
                      engineMode === 'live'
                        ? 'border-ub-loss/30 text-ub-loss bg-ub-loss/10'
                        : 'border-ub-accent/30 text-ub-accent bg-ub-accent/10'
                    }`}
                  >
                    {engineMode === 'live' ? '🔴 ' : '🟢 '}
                    {engineMode.charAt(0).toUpperCase() + engineMode.slice(1)}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={engineStatus === 'running'}
                        onClick={() => setEngineDialogOpen(true)}
                        className={`flex-1 h-9 text-xs font-semibold border-ub-border ${
                          engineStatus !== 'running'
                            ? 'hover:bg-ub-profit/15 hover:text-ub-profit hover:border-ub-profit/40 text-ub-text-muted'
                            : 'opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <Power className="h-3.5 w-3.5 mr-1.5" />
                        Start Engine
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-ub-surface border-ub-border text-ub-text-primary text-xs">
                      Choose mode & broker to start
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={engineStatus === 'stopped'}
                        onClick={() => engine.stop()}
                        className={`flex-1 h-9 text-xs font-semibold border-ub-border ${
                          engineStatus !== 'stopped'
                            ? 'hover:bg-ub-loss/15 hover:text-ub-loss hover:border-ub-loss/40 text-ub-text-muted'
                            : 'opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <Square className="h-3.5 w-3.5 mr-1.5" />
                        Stop
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-ub-surface border-ub-border text-ub-text-primary text-xs">
                      Stop the trading engine
                    </TooltipContent>
                  </Tooltip>
                </div>
                {(engine.isStarting || engine.isStopping) && (
                  <p className="text-[11px] text-ub-text-muted animate-pulse">
                    {engine.isStarting ? 'Starting engine...' : 'Stopping engine...'}
                  </p>
                )}
              </div>
            </SectionCard>

            {/* Open Positions Table */}
            <SectionCard title="Open Positions" icon={Activity} className="md:col-span-1 xl:col-span-3">
              <ScrollArea className="max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-ub-border hover:bg-transparent">
                      <TableHead className="text-[11px] text-ub-text-muted font-semibold uppercase tracking-wider h-8">Symbol</TableHead>
                      <TableHead className="text-[11px] text-ub-text-muted font-semibold uppercase tracking-wider h-8 text-center">Dir</TableHead>
                      <TableHead className="text-[11px] text-ub-text-muted font-semibold uppercase tracking-wider h-8 text-right">Entry</TableHead>
                      <TableHead className="text-[11px] text-ub-text-muted font-semibold uppercase tracking-wider h-8 text-right">Current</TableHead>
                      <TableHead className="text-[11px] text-ub-text-muted font-semibold uppercase tracking-wider h-8 text-center">Qty</TableHead>
                      <TableHead className="text-[11px] text-ub-text-muted font-semibold uppercase tracking-wider h-8 text-right">P&L</TableHead>
                      <TableHead className="text-[11px] text-ub-text-muted font-semibold uppercase tracking-wider h-8 text-center hidden sm:table-cell">Booked</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.positions.map((pos) => {
                      const pnlPositive = pos.pnl >= 0;
                      return (
                        <TableRow key={pos.id} className="border-ub-border hover:bg-ub-surface-hover transition-colors">
                          <TableCell className="text-xs font-semibold text-ub-text-primary py-2.5">
                            {pos.symbol}
                          </TableCell>
                          <TableCell className="py-2.5 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                pos.direction === 'BUY'
                                  ? 'border-ub-profit/30 text-ub-profit bg-ub-profit/10'
                                  : 'border-ub-loss/30 text-ub-loss bg-ub-loss/10'
                              }`}
                            >
                              {pos.direction === 'BUY' ? (
                                <ArrowUpRight className="h-3 w-3 mr-0.5" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3 mr-0.5" />
                              )}
                              {pos.direction}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-ub-text-muted py-2.5 text-right">
                            {pos.entry.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-ub-text-primary py-2.5 text-right">
                            {pos.current.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-ub-text-primary py-2.5 text-center">
                            {pos.qty}
                          </TableCell>
                          <TableCell className={`text-xs font-mono font-semibold py-2.5 text-right ${
                            pnlPositive ? 'text-ub-profit' : 'text-ub-loss'
                          }`}>
                            {pnlPositive ? '+' : ''}{formatINR(pos.pnl)}
                          </TableCell>
                          <TableCell className="py-2.5 text-center hidden sm:table-cell">
                            {pos.bookedLevels.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {pos.bookedLevels.map((level, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="text-[9px] font-mono border-ub-accent/30 text-ub-accent bg-ub-accent/5"
                                  >
                                    {level.toFixed(1)}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-ub-text-muted">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
              {data.positions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-ub-text-muted">
                  <Activity className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs">No open positions</p>
                </div>
              )}
            </SectionCard>

            {/* Market Regime */}
            <SectionCard title="Market Regime" icon={Radio} className="xl:col-span-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={`text-xs font-bold px-3 py-1 ${regimeCfg.colorClass} ${regimeCfg.bgClass} ${regimeCfg.borderClass}`}
                  >
                    {regime === 'bull' && <TrendingUp className="h-3.5 w-3.5 mr-1" />}
                    {regime === 'bear' && <TrendingDown className="h-3.5 w-3.5 mr-1" />}
                    {regime === 'sideways' && <BarChart3 className="h-3.5 w-3.5 mr-1" />}
                    {regime === 'volatile' && <AlertTriangle className="h-3.5 w-3.5 mr-1" />}
                    {regimeCfg.label} Market
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-ub-text-muted">Confidence</span>
                    <span className="text-xs font-mono font-bold text-ub-text-primary">{regimeConf}%</span>
                  </div>
                </div>
                <Progress
                  value={regimeConf}
                  className="h-1.5 bg-ub-border"
                  style={{ '--progress-color': regimeCfg.colorClass.includes('profit') ? '#22c55e' : regimeCfg.colorClass.includes('loss') ? '#ef4444' : regimeCfg.colorClass.includes('volatile') ? '#a855f7' : '#f59e0b' } as React.CSSProperties}
                />
                <Separator className="bg-ub-border" />
                <div>
                  <p className="text-[11px] text-ub-text-muted mb-2">Active Strategies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.activeStrategies.map((strategy, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-[10px] font-medium border-ub-accent/20 text-ub-accent bg-ub-accent/5"
                      >
                        {strategy}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Quick Signals */}
            <SectionCard title="Quick Signals" icon={SignalHigh} className="xl:col-span-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 rounded-lg bg-ub-background/50">
                  <p className="text-lg font-bold font-mono text-ub-accent">{data.signalsGenerated}</p>
                  <p className="text-[10px] text-ub-text-muted mt-0.5">Generated</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-ub-background/50">
                  <p className="text-lg font-bold font-mono text-ub-profit">{data.signalsConfirmed}</p>
                  <p className="text-[10px] text-ub-text-muted mt-0.5">Confirmed</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-ub-background/50">
                  <p className="text-lg font-bold font-mono text-ub-warning">{data.signalsSkipped}</p>
                  <p className="text-[10px] text-ub-text-muted mt-0.5">Skipped</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-ub-text-muted">
                <SignalHigh className="h-3 w-3" />
                <span>
                  {data.signalsGenerated > 0
                    ? `${((data.signalsConfirmed / data.signalsGenerated) * 100).toFixed(0)}% confirmation rate`
                    : 'No signals today'}
                </span>
              </div>
            </SectionCard>

            {/* Market Timer */}
            <SectionCard title="Market Timer" icon={Clock} className="xl:col-span-2">
              <MarketTimer />
            </SectionCard>

            {/* ────────────────────────────────────────
                SECTION 3: RECENT TRADES
            ──────────────────────────────────────── */}

            {/* Recent Trades - spans full width */}
            <SectionCard title="Recent Trades" icon={Eye} className="md:col-span-2 xl:col-span-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-ub-border hover:bg-transparent">
                    <TableHead className="text-[11px] text-ub-text-muted font-semibold uppercase tracking-wider h-8">Time</TableHead>
                    <TableHead className="text-[11px] text-ub-text-muted font-semibold uppercase tracking-wider h-8">Symbol</TableHead>
                    <TableHead className="text-[11px] text-ub-text-muted font-semibold uppercase tracking-wider h-8 text-center">Direction</TableHead>
                    <TableHead className="text-[11px] text-ub-text-muted font-semibold uppercase tracking-wider h-8 text-right">P&L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentTrades.slice(0, 5).map((trade) => {
                    const isProfit = trade.pnl >= 0;
                    return (
                      <TableRow key={trade.id} className="border-ub-border hover:bg-ub-surface-hover transition-colors">
                        <TableCell className="text-xs font-mono text-ub-text-muted py-2.5">
                          {trade.time}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-ub-text-primary py-2.5">
                          {trade.symbol}
                        </TableCell>
                        <TableCell className="py-2.5 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              trade.direction === 'BUY'
                                ? 'border-ub-profit/30 text-ub-profit bg-ub-profit/10'
                                : 'border-ub-loss/30 text-ub-loss bg-ub-loss/10'
                            }`}
                          >
                            {trade.direction}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-xs font-mono font-semibold py-2.5 text-right ${
                          isProfit ? 'text-ub-profit' : 'text-ub-loss'
                        }`}>
                          {isProfit ? '+' : ''}{formatINR(trade.pnl)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {data.recentTrades.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 text-ub-text-muted">
                  <Eye className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs">No trades today</p>
                </div>
              )}
              <div className="mt-3 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-ub-accent hover:text-ub-accent-hover hover:bg-ub-accent/10 h-7"
                >
                  View All Trades
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </SectionCard>
          </div>
        )}

      <StartEngineDialog
        open={engineDialogOpen}
        onOpenChange={setEngineDialogOpen}
        onStart={handleEngineStart}
        isStarting={engine.isStarting}
      />
    </TooltipProvider>
  );
}
