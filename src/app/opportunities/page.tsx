'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  ShieldCheck,
  Timer,
  BarChart3,
  Bell,
  SkipForward,
  AlertTriangle,
  Activity,
  Target,
  Layers,
  Gauge,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type OppStatus = 'pending' | 'confirmed' | 'skipped' | 'expired';
type Direction = 'BUY' | 'SELL';
type NiftyTrend = 'Bullish' | 'Bearish' | 'Sideways';

interface RiskGate {
  name: string;
  passed: boolean;
  detail: string;
}

interface OpportunityData {
  id: string;
  symbol: string;
  direction: Direction;
  strategy: string;
  kronosScore: number;
  entry: number;
  stopLoss: number;
  target: number;
  riskReward: number;
  capitalRequired: number;
  expiryAt: string;
  riskGates: RiskGate[];
  vix: number;
  niftyTrend: NiftyTrend;
  sector: string;
  winRate: number;
  status: OppStatus;
  type: string;
  lotSize: number;
  quantity: number;
  margin: number;
  strike?: string;
  optionExpiry?: string;
  premium?: number;
  createdAt: string;
}

// ─────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────

const MOCK_OPPORTUNITIES: OpportunityData[] = [
  {
    id: 'opp-001',
    symbol: 'RELIANCE',
    direction: 'BUY',
    strategy: 'Momentum Breakout',
    kronosScore: 0.87,
    entry: 2945.50,
    stopLoss: 2910.00,
    target: 3020.00,
    riskReward: 2.0,
    capitalRequired: 147275,
    expiryAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    riskGates: [
      { name: 'Trend Align', passed: true, detail: 'RELIANCE is in a strong uptrend, 20 EMA above 50 EMA, ADX > 25' },
      { name: 'Volume Confirm', passed: true, detail: 'Volume surge 2.3x above 20-day average' },
      { name: 'RSI Check', passed: true, detail: 'RSI at 58.2, not overbought, room for upside' },
      { name: 'VIX Filter', passed: true, detail: 'VIX at 13.2, below 16 threshold, low volatility environment' },
      { name: 'Sector Flow', passed: true, detail: 'Energy sector seeing net positive fund flow of ₹420 Cr' },
      { name: 'Max Drawdown', passed: true, detail: 'Max portfolio drawdown at 3.2%, well within 8% limit' },
      { name: 'Correlation', passed: true, detail: 'Low correlation (0.23) with existing positions' },
      { name: 'Liquidity', passed: true, detail: 'Average daily turnover ₹4,200 Cr, easily fills market order' },
      { name: 'Spread Check', passed: false, detail: 'Bid-ask spread at 0.08%, slightly above 0.05% ideal' },
      { name: 'News Filter', passed: true, detail: 'No negative news events in last 24 hours' },
      { name: 'Time Window', passed: true, detail: 'Within active trading hours (9:30 AM - 2:30 PM)' },
      { name: 'Capital Avail', passed: true, detail: '₹2.8L available, requires ₹1.47L capital' },
      { name: 'Daily Limit', passed: false, detail: 'Already 3 trades today, limit is 5 but risk budget tight' },
    ],
    vix: 13.2,
    niftyTrend: 'Bullish',
    sector: 'Energy',
    winRate: 72.5,
    status: 'pending',
    type: 'EQUITY',
    lotSize: 250,
    quantity: 50,
    margin: 147275,
    createdAt: new Date(Date.now() - 120_000).toISOString(),
  },
  {
    id: 'opp-002',
    symbol: 'INFY',
    direction: 'SELL',
    strategy: 'Mean Reversion',
    kronosScore: 0.74,
    entry: 1872.30,
    stopLoss: 1905.00,
    target: 1810.00,
    riskReward: 1.7,
    capitalRequired: 93615,
    expiryAt: new Date(Date.now() + 8 * 60 * 1000).toISOString(),
    riskGates: [
      { name: 'Trend Align', passed: true, detail: 'INFY showing bearish divergence on RSI, price failing at resistance' },
      { name: 'Volume Confirm', passed: true, detail: 'Selling volume increasing on red candles' },
      { name: 'RSI Check', passed: true, detail: 'RSI at 68.4, approaching overbought zone' },
      { name: 'VIX Filter', passed: true, detail: 'VIX at 13.2, favorable for short positions' },
      { name: 'Sector Flow', passed: false, detail: 'IT sector mixed signals, some buying in large caps' },
      { name: 'Max Drawdown', passed: true, detail: 'Max portfolio drawdown at 3.2%, within limits' },
      { name: 'Correlation', passed: true, detail: 'Negative correlation with energy positions provides hedging' },
      { name: 'Liquidity', passed: true, detail: 'Average daily turnover ₹2,800 Cr' },
      { name: 'Spread Check', passed: true, detail: 'Bid-ask spread at 0.03%, excellent liquidity' },
      { name: 'News Filter', passed: true, detail: 'No significant news, quarterly results already priced in' },
      { name: 'Time Window', passed: true, detail: 'Within active trading hours' },
      { name: 'Capital Avail', passed: true, detail: '₹2.8L available, requires ₹93.6K' },
      { name: 'Daily Limit', passed: true, detail: 'Within daily trade limit and risk budget' },
    ],
    vix: 13.2,
    niftyTrend: 'Bullish',
    sector: 'IT',
    winRate: 65.8,
    status: 'pending',
    type: 'EQUITY',
    lotSize: 300,
    quantity: 50,
    margin: 93615,
    createdAt: new Date(Date.now() - 300_000).toISOString(),
  },
  {
    id: 'opp-003',
    symbol: 'HDFCBANK',
    direction: 'BUY',
    strategy: 'VWAP Bounce',
    kronosScore: 0.91,
    entry: 1685.75,
    stopLoss: 1665.00,
    target: 1735.00,
    riskReward: 2.5,
    capitalRequired: 84288,
    expiryAt: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
    riskGates: [
      { name: 'Trend Align', passed: true, detail: 'HDFCBANK bouncing off VWAP with bullish hammer candle' },
      { name: 'Volume Confirm', passed: true, detail: 'Volume spike 3.1x at VWAP support level' },
      { name: 'RSI Check', passed: true, detail: 'RSI at 45.3, oversold bounce setup' },
      { name: 'VIX Filter', passed: true, detail: 'VIX at 13.2, favorable environment' },
      { name: 'Sector Flow', passed: true, detail: 'Banking sector strong with RBI dovish stance' },
      { name: 'Max Drawdown', passed: true, detail: 'Drawdown at 3.2%, well within limits' },
      { name: 'Correlation', passed: true, detail: 'Moderate correlation (0.41) with financial holdings' },
      { name: 'Liquidity', passed: true, detail: 'Average daily turnover ₹5,100 Cr, highest in NSE' },
      { name: 'Spread Check', passed: true, detail: 'Bid-ask spread at 0.02%, extremely liquid' },
      { name: 'News Filter', passed: true, detail: 'Positive regulatory environment for banks' },
      { name: 'Time Window', passed: true, detail: 'Within active trading hours' },
      { name: 'Capital Avail', passed: true, detail: '₹2.8L available, requires ₹84.3K' },
      { name: 'Daily Limit', passed: true, detail: 'Within all risk and capital limits' },
    ],
    vix: 13.2,
    niftyTrend: 'Bullish',
    sector: 'Banking',
    winRate: 78.2,
    status: 'pending',
    type: 'EQUITY',
    lotSize: 550,
    quantity: 50,
    margin: 84288,
    createdAt: new Date(Date.now() - 60_000).toISOString(),
  },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const INR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const INR_SHORT = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

function getScoreColor(score: number): string {
  if (score >= 0.8) return 'text-ub-profit';
  if (score >= 0.6) return 'text-ub-warning';
  return 'text-ub-loss';
}

function getProgressColor(score: number): string {
  if (score >= 0.8) return 'bg-ub-profit';
  if (score >= 0.6) return 'bg-ub-warning';
  return 'bg-ub-loss';
}

function getWinRateColor(rate: number): string {
  if (rate >= 70) return 'text-ub-profit';
  if (rate >= 55) return 'text-ub-warning';
  return 'text-ub-loss';
}

// ─────────────────────────────────────────────
// TimerCountdown Component
// ─────────────────────────────────────────────

function TimerCountdown({ expiryAt }: { expiryAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiryAt).getTime() - Date.now();
      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('Expired');
        return;
      }
      const mins = Math.floor(diff / 60_000);
      const secs = Math.floor((diff % 60_000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiryAt]);

  return (
    <span
      className={`flex items-center gap-1 text-xs font-mono font-medium ${
        isExpired ? 'text-ub-loss' : timeLeft.includes('0:') || timeLeft.includes('1:') ? 'text-ub-warning' : 'text-ub-text-muted'
      }`}
    >
      <Timer className="h-3 w-3" />
      {timeLeft}
    </span>
  );
}

// ─────────────────────────────────────────────
// RiskGatesPanel Component
// ─────────────────────────────────────────────

function RiskGatesPanel({ gates }: { gates: RiskGate[] }) {
  const [expandedGate, setExpandedGate] = useState<number | null>(null);
  const passedCount = gates.filter((g) => g.passed).length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="h-3.5 w-3.5 text-ub-text-muted" />
        <span className="text-xs font-medium text-ub-text-muted">
          Risk Gates ({passedCount}/{gates.length})
        </span>
        <div className="ml-auto flex items-center gap-1">
          <span className="text-xs font-semibold text-ub-profit">{passedCount} PASS</span>
          <span className="text-ub-border">|</span>
          <span className="text-xs font-semibold text-ub-loss">{gates.length - passedCount} FAIL</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {gates.map((gate, idx) => (
          <button
            key={gate.name}
            onClick={() => setExpandedGate(expandedGate === idx ? null : idx)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-ub-background/50 border border-ub-border/50 hover:border-ub-border-hover transition-colors text-left"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                gate.passed ? 'bg-ub-profit' : 'bg-ub-loss'
              }`}
            />
            <span className="text-[11px] text-ub-text-muted truncate">{gate.name}</span>
            {expandedGate === idx ? (
              <ChevronUp className="h-2.5 w-2.5 text-ub-text-muted ml-auto flex-shrink-0" />
            ) : (
              <ChevronDown className="h-2.5 w-2.5 text-ub-text-muted ml-auto flex-shrink-0" />
            )}
          </button>
        ))}
      </div>
      <AnimatePresence>
        {expandedGate !== null && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-2.5 rounded-md bg-ub-background/70 border border-ub-border/50">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`h-2 w-2 rounded-full ${
                    gates[expandedGate].passed ? 'bg-ub-profit' : 'bg-ub-loss'
                  }`}
                />
                <span className="text-xs font-medium text-ub-text-primary">
                  {gates[expandedGate].name}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 h-4 ${
                    gates[expandedGate].passed
                      ? 'text-ub-profit border-ub-profit/30'
                      : 'text-ub-loss border-ub-loss/30'
                  }`}
                >
                  {gates[expandedGate].passed ? 'PASS' : 'FAIL'}
                </Badge>
              </div>
              <p className="text-[11px] text-ub-text-muted leading-relaxed">
                {gates[expandedGate].detail}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
// OpportunityCard Component
// ─────────────────────────────────────────────

function OpportunityCard({
  opp,
  onConfirm,
  onSkip,
  isConfirming,
  isSkipping,
}: {
  opp: OpportunityData;
  onConfirm: (id: string) => void;
  onSkip: (id: string) => void;
  isConfirming: boolean;
  isSkipping: boolean;
}) {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [remindDialogOpen, setRemindDialogOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm(opp.id);
    setConfirmDialogOpen(false);
  };

  const handleSkip = () => {
    onSkip(opp.id);
  };

  const handleRemindLater = () => {
    setRemindDialogOpen(false);
    toast.info(`Reminder set for ${opp.symbol}`, {
      description: 'You\'ll be notified again in 15 minutes.',
    });
  };

  const riskPerTrade = Math.abs(opp.entry - opp.stopLoss) * opp.quantity;
  const potentialProfit = Math.abs(opp.target - opp.entry) * opp.quantity;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="bg-ub-surface border-ub-border rounded-lg overflow-hidden hover:border-ub-border-hover transition-colors">
          <CardContent className="p-5 space-y-4">
            {/* Top row: Symbol, Direction, Strategy, Kronos Score, Expiry */}
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-bold text-ub-text-primary tracking-tight">{opp.symbol}</h3>
              <Badge
                className={`text-[11px] font-semibold px-2 py-0.5 ${
                  opp.direction === 'BUY'
                    ? 'bg-ub-profit/15 text-ub-profit border-ub-profit/30 hover:bg-ub-profit/25'
                    : 'bg-ub-loss/15 text-ub-loss border-ub-loss/30 hover:bg-ub-loss/25'
                }`}
                variant="outline"
              >
                {opp.direction === 'BUY' ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {opp.direction}
              </Badge>
              <Badge variant="outline" className="text-[11px] text-ub-text-muted border-ub-border">
                <Zap className="h-3 w-3 mr-1" />
                {opp.strategy}
              </Badge>
              <div className="flex items-center gap-2 ml-auto">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5">
                        <Gauge className="h-3 w-3 text-ub-text-muted" />
                        <span className={`text-xs font-semibold ${getScoreColor(opp.kronosScore)}`}>
                          {(opp.kronosScore * 100).toFixed(0)}%
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Kronos Confidence Score</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="w-16 h-1.5 bg-ub-background rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getProgressColor(opp.kronosScore)}`}
                    style={{ width: `${opp.kronosScore * 100}%` }}
                  />
                </div>
              </div>
              <TimerCountdown expiryAt={opp.expiryAt} />
            </div>

            {/* Price details row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-ub-text-muted mb-0.5">Entry</p>
                <p className="text-sm font-semibold text-ub-text-primary font-mono">{INR(opp.entry)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-ub-text-muted mb-0.5">Stop Loss</p>
                <p className="text-sm font-semibold text-ub-loss font-mono">{INR(opp.stopLoss)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-ub-text-muted mb-0.5">Target</p>
                <p className="text-sm font-semibold text-ub-profit font-mono">{INR(opp.target)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-ub-text-muted mb-0.5">Risk:Reward</p>
                <p className="text-sm font-semibold text-ub-accent font-mono">1:{opp.riskReward.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-ub-text-muted mb-0.5">Capital Required</p>
                <p className="text-sm font-semibold text-ub-text-primary font-mono">{INR_SHORT(opp.capitalRequired)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-ub-text-muted mb-0.5">Qty</p>
                <p className="text-sm font-semibold text-ub-text-primary font-mono">{opp.quantity}</p>
              </div>
            </div>

            <Separator className="bg-ub-border/50" />

            {/* Risk Gates Panel */}
            <RiskGatesPanel gates={opp.riskGates} />

            <Separator className="bg-ub-border/50" />

            {/* Market context + Win rate */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-ub-background/50 border border-ub-border/50">
                <Activity className="h-3 w-3 text-ub-warning" />
                <span className="text-[11px] text-ub-text-muted">VIX</span>
                <span className="text-xs font-semibold text-ub-text-primary font-mono">{opp.vix.toFixed(1)}</span>
              </div>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-ub-background/50 border border-ub-border/50 ${
                  opp.niftyTrend === 'Bullish'
                    ? 'border-ub-profit/30'
                    : opp.niftyTrend === 'Bearish'
                    ? 'border-ub-loss/30'
                    : 'border-ub-warning/30'
                }`}
              >
                {opp.niftyTrend === 'Bullish' ? (
                  <TrendingUp className="h-3 w-3 text-ub-profit" />
                ) : opp.niftyTrend === 'Bearish' ? (
                  <TrendingDown className="h-3 w-3 text-ub-loss" />
                ) : (
                  <Activity className="h-3 w-3 text-ub-warning" />
                )}
                <span className="text-[11px] text-ub-text-muted">Nifty</span>
                <span
                  className={`text-xs font-semibold ${
                    opp.niftyTrend === 'Bullish'
                      ? 'text-ub-profit'
                      : opp.niftyTrend === 'Bearish'
                      ? 'text-ub-loss'
                      : 'text-ub-warning'
                  }`}
                >
                  {opp.niftyTrend}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-ub-background/50 border border-ub-border/50">
                <Layers className="h-3 w-3 text-ub-text-muted" />
                <span className="text-[11px] text-ub-text-muted">Sector</span>
                <span className="text-xs font-semibold text-ub-text-primary">{opp.sector}</span>
              </div>
              <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-ub-background/50 border border-ub-border/50">
                <BarChart3 className="h-3 w-3 text-ub-accent" />
                <span className="text-[11px] text-ub-text-muted">Win Rate</span>
                <span className={`text-xs font-bold ${getWinRateColor(opp.winRate)}`}>
                  {opp.winRate.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                className="bg-ub-profit hover:bg-ub-profit/90 text-white font-semibold text-xs h-9 px-5"
                onClick={() => setConfirmDialogOpen(true)}
                disabled={isConfirming || isSkipping}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                {isConfirming ? 'Confirming...' : 'CONFIRM'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-ub-border text-ub-text-muted hover:text-ub-text-primary hover:border-ub-border-hover font-medium text-xs h-9 px-5"
                onClick={handleSkip}
                disabled={isConfirming || isSkipping}
              >
                <SkipForward className="h-3.5 w-3.5 mr-1.5" />
                {isSkipping ? 'Skipping...' : 'SKIP'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-ub-warning/40 text-ub-warning hover:bg-ub-warning/10 hover:border-ub-warning/60 font-medium text-xs h-9 px-5"
                onClick={() => setRemindDialogOpen(true)}
                disabled={isConfirming || isSkipping}
              >
                <Bell className="h-3.5 w-3.5 mr-1.5" />
                REMIND LATER
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="bg-ub-surface border-ub-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-ub-text-primary">Confirm Opportunity</DialogTitle>
            <DialogDescription className="text-ub-text-muted">
              Review the details before confirming this trade.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-ub-background border border-ub-border/50">
              <span className="text-sm text-ub-text-muted">Symbol</span>
              <span className="text-sm font-bold text-ub-text-primary">{opp.symbol}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-ub-background border border-ub-border/50">
              <span className="text-sm text-ub-text-muted">Direction</span>
              <Badge
                className={`text-[11px] font-semibold ${
                  opp.direction === 'BUY'
                    ? 'bg-ub-profit/15 text-ub-profit border-ub-profit/30'
                    : 'bg-ub-loss/15 text-ub-loss border-ub-loss/30'
                }`}
                variant="outline"
              >
                {opp.direction}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-ub-background border border-ub-border/50">
              <span className="text-sm text-ub-text-muted">Type</span>
              <span className="text-sm font-semibold text-ub-text-primary">{opp.type}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-ub-background border border-ub-border/50">
              <span className="text-sm text-ub-text-muted">Lot Size / Qty</span>
              <span className="text-sm font-semibold text-ub-text-primary">
                {opp.lotSize} / {opp.quantity}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-ub-background border border-ub-border/50">
              <span className="text-sm text-ub-text-muted">Entry Price</span>
              <span className="text-sm font-semibold text-ub-text-primary font-mono">{INR(opp.entry)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-ub-background border border-ub-border/50">
              <span className="text-sm text-ub-text-muted">Stop Loss</span>
              <span className="text-sm font-semibold text-ub-loss font-mono">{INR(opp.stopLoss)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-ub-background border border-ub-border/50">
              <span className="text-sm text-ub-text-muted">Target</span>
              <span className="text-sm font-semibold text-ub-profit font-mono">{INR(opp.target)}</span>
            </div>
            {opp.strike && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-ub-background border border-ub-border/50">
                <span className="text-sm text-ub-text-muted">Strike / Expiry</span>
                <span className="text-sm font-semibold text-ub-text-primary font-mono">
                  {opp.strike} / {opp.optionExpiry}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between p-3 rounded-lg bg-ub-background border border-ub-border/50">
              <span className="text-sm text-ub-text-muted">Risk per Trade</span>
              <span className="text-sm font-semibold text-ub-loss font-mono">{INR(riskPerTrade)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-ub-background border border-ub-border/50">
              <span className="text-sm text-ub-text-muted">Potential Profit</span>
              <span className="text-sm font-semibold text-ub-profit font-mono">{INR(potentialProfit)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-ub-background border border-ub-border/50">
              <span className="text-sm text-ub-text-muted">Margin Required</span>
              <span className="text-sm font-bold text-ub-warning font-mono">{INR(opp.margin)}</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-ub-border text-ub-text-muted hover:text-ub-text-primary"
              onClick={() => setConfirmDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-ub-profit hover:bg-ub-profit/90 text-white font-semibold"
              onClick={handleConfirm}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Confirm Trade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remind Later Dialog */}
      <Dialog open={remindDialogOpen} onOpenChange={setRemindDialogOpen}>
        <DialogContent className="bg-ub-surface border-ub-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-ub-text-primary">Set Reminder</DialogTitle>
            <DialogDescription className="text-ub-text-muted">
              We\'ll notify you about this opportunity again.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-ub-text-primary">
            <span className="font-bold">{opp.symbol}</span> — {opp.strategy}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-ub-border text-ub-text-muted"
              onClick={() => setRemindDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-ub-warning hover:bg-ub-warning/90 text-ub-background font-semibold"
              onClick={handleRemindLater}
            >
              <Bell className="h-4 w-4 mr-1.5" />
              Remind in 15 min
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────
// Loading Skeleton
// ─────────────────────────────────────────────

function OpportunityCardSkeleton() {
  return (
    <Card className="bg-ub-surface border-ub-border rounded-lg">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-28 bg-ub-surface-active" />
          <Skeleton className="h-5 w-14 bg-ub-surface-active" />
          <Skeleton className="h-5 w-32 bg-ub-surface-active" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-4 w-10 bg-ub-surface-active" />
            <Skeleton className="h-1.5 w-16 bg-ub-surface-active" />
          </div>
          <Skeleton className="h-4 w-12 bg-ub-surface-active" />
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-16 bg-ub-surface-active" />
              <Skeleton className="h-4 w-20 bg-ub-surface-active" />
            </div>
          ))}
        </div>
        <Skeleton className="h-px w-full bg-ub-surface-active" />
        <div className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full bg-ub-surface-active" />
          ))}
        </div>
        <Skeleton className="h-px w-full bg-ub-surface-active" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 bg-ub-surface-active" />
          <Skeleton className="h-9 w-20 bg-ub-surface-active" />
          <Skeleton className="h-9 w-32 bg-ub-surface-active" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

type FilterTab = 'all' | 'pending' | 'confirmed' | 'skipped' | 'expired';

export default function OpportunitiesPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [opportunities, setOpportunities] = useState<OpportunityData[]>(MOCK_OPPORTUNITIES);
  const [isLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return opportunities;
    return opportunities.filter((o) => o.status === activeTab);
  }, [opportunities, activeTab]);

  const pendingCount = opportunities.filter((o) => o.status === 'pending').length;

  const handleConfirm = useCallback((id: string) => {
    setIsConfirming(true);
    const opp = opportunities.find((o) => o.id === id);
    // Simulate API call
    setTimeout(() => {
      setOpportunities((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: 'confirmed' as OppStatus } : o))
      );
      setIsConfirming(false);
      toast.success(`${opp?.symbol} confirmed`, {
        description: `${opp?.strategy} trade has been placed successfully.`,
      });
    }, 800);
  }, [opportunities]);

  const handleSkip = useCallback((id: string) => {
    setIsSkipping(true);
    const opp = opportunities.find((o) => o.id === id);
    setTimeout(() => {
      setOpportunities((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: 'skipped' as OppStatus } : o))
      );
      setIsSkipping(false);
      toast.info(`${opp?.symbol} skipped`, {
        description: 'Opportunity has been moved to skipped list.',
      });
    }, 500);
  }, [opportunities]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-ub-accent" />
          <h1 className="text-2xl font-bold text-ub-text-primary">Opportunities</h1>
          {pendingCount > 0 && (
            <Badge className="bg-ub-accent/15 text-ub-accent border-ub-accent/30 font-semibold">
              {pendingCount}
            </Badge>
          )}
        </div>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as FilterTab)}
          className="ml-auto"
        >
          <TabsList className="bg-ub-background border border-ub-border">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-ub-surface-active data-[state=active]:text-ub-text-primary text-ub-text-muted text-xs"
            >
              All ({opportunities.length})
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="data-[state=active]:bg-ub-surface-active data-[state=active]:text-ub-text-primary text-ub-text-muted text-xs"
            >
              Pending ({pendingCount})
            </TabsTrigger>
            <TabsTrigger
              value="confirmed"
              className="data-[state=active]:bg-ub-surface-active data-[state=active]:text-ub-text-primary text-ub-text-muted text-xs"
            >
              Confirmed ({opportunities.filter((o) => o.status === 'confirmed').length})
            </TabsTrigger>
            <TabsTrigger
              value="skipped"
              className="data-[state=active]:bg-ub-surface-active data-[state=active]:text-ub-text-primary text-ub-text-muted text-xs"
            >
              Skipped ({opportunities.filter((o) => o.status === 'skipped').length})
            </TabsTrigger>
            <TabsTrigger
              value="expired"
              className="data-[state=active]:bg-ub-surface-active data-[state=active]:text-ub-text-primary text-ub-text-muted text-xs"
            >
              Expired ({opportunities.filter((o) => o.status === 'expired').length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <OpportunityCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-ub-surface border border-ub-border flex items-center justify-center mb-4">
            <Clock className="h-7 w-7 text-ub-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-ub-text-primary mb-1">No {activeTab === 'all' ? 'pending' : activeTab} opportunities</h3>
          <p className="text-sm text-ub-text-muted max-w-md">
            Engine will push new ones when found. Make sure the engine is running and strategies are enabled.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opp={opp}
                onConfirm={handleConfirm}
                onSkip={handleSkip}
                isConfirming={isConfirming}
                isSkipping={isSkipping}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
