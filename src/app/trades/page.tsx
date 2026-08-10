'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowUpDown,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
  RotateCcw,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Wifi,
  Target,
  Pencil,
  XCircle,
  Scissors,
  Search,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Direction = 'BUY' | 'SELL';

interface BookedLevel {
  level: number;
  achieved: boolean;
}

interface Position {
  id: string;
  symbol: string;
  direction: Direction;
  entry: number;
  current: number;
  quantity: number;
  remainingQty: number;
  stopLoss: number;
  target: number;
  unrealizedPnl: number;
  bookedLevels: BookedLevel[];
  strategy: string;
}

interface HistoricalTrade {
  id: string;
  time: string;
  symbol: string;
  direction: Direction;
  strategy: string;
  entry: number;
  exit: number;
  quantity: number;
  grossPnl: number;
  fees: number;
  netPnl: number;
  duration: string;
  exitReason: string;
}

// ─────────────────────────────────────────────
// Strategy List
// ─────────────────────────────────────────────

const STRATEGIES = [
  'All Strategies',
  'Momentum Breakout',
  'Mean Reversion',
  'VWAP Bounce',
  'Supertrend Follow',
  'RSI Divergence',
  'Gap Fill',
  'Opening Range',
  'Volume Profile',
  'Support Resistance',
  'EMA Crossover',
  'Bollinger Squeeze',
  'Ichimoku Cloud',
  'Order Block',
  'Fibonacci Retrace',
];

// ─────────────────────────────────────────────
// Mock Data — Positions
// ─────────────────────────────────────────────

const MOCK_POSITIONS: Position[] = [
  {
    id: 'pos-001',
    symbol: 'RELIANCE',
    direction: 'BUY',
    entry: 2932.50,
    current: 2958.75,
    quantity: 50,
    remainingQty: 50,
    stopLoss: 2908.00,
    target: 3020.00,
    unrealizedPnl: 1312.50,
    bookedLevels: [
      { level: 2950, achieved: true },
      { level: 2980, achieved: false },
    ],
    strategy: 'Momentum Breakout',
  },
  {
    id: 'pos-002',
    symbol: 'INFY',
    direction: 'SELL',
    entry: 1878.30,
    current: 1864.15,
    quantity: 75,
    remainingQty: 75,
    stopLoss: 1910.00,
    target: 1820.00,
    unrealizedPnl: 1061.25,
    bookedLevels: [
      { level: 1855, achieved: false },
      { level: 1835, achieved: false },
    ],
    strategy: 'Mean Reversion',
  },
  {
    id: 'pos-003',
    symbol: 'HDFCBANK',
    direction: 'BUY',
    entry: 1688.00,
    current: 1679.45,
    quantity: 100,
    remainingQty: 100,
    stopLoss: 1665.00,
    target: 1735.00,
    unrealizedPnl: -855.00,
    bookedLevels: [
      { level: 1710, achieved: false },
      { level: 1725, achieved: false },
    ],
    strategy: 'VWAP Bounce',
  },
  {
    id: 'pos-004',
    symbol: 'TCS',
    direction: 'BUY',
    entry: 4125.00,
    current: 4168.50,
    quantity: 25,
    remainingQty: 25,
    stopLoss: 4080.00,
    target: 4250.00,
    unrealizedPnl: 1087.50,
    bookedLevels: [
      { level: 4180, achieved: false },
      { level: 4220, achieved: false },
    ],
    strategy: 'Supertrend Follow',
  },
  {
    id: 'pos-005',
    symbol: 'ICICIBANK',
    direction: 'BUY',
    entry: 1274.80,
    current: 1268.35,
    quantity: 150,
    remainingQty: 100,
    stopLoss: 1255.00,
    target: 1320.00,
    unrealizedPnl: -967.50,
    bookedLevels: [
      { level: 1295, achieved: true },
      { level: 1310, achieved: false },
    ],
    strategy: 'Opening Range',
  },
];

// ─────────────────────────────────────────────
// Mock Data — Trade History
// ─────────────────────────────────────────────

const MOCK_TRADES: HistoricalTrade[] = [
  {
    id: 'trd-001',
    time: '2025-01-15T14:32:00',
    symbol: 'RELIANCE',
    direction: 'BUY',
    strategy: 'Momentum Breakout',
    entry: 2890.00,
    exit: 2948.50,
    quantity: 50,
    grossPnl: 2925.00,
    fees: 72.50,
    netPnl: 2852.50,
    duration: '2h 15m',
    exitReason: 'Target Hit',
  },
  {
    id: 'trd-002',
    time: '2025-01-15T11:20:00',
    symbol: 'BAJFINANCE',
    direction: 'SELL',
    strategy: 'Mean Reversion',
    entry: 7245.00,
    exit: 7310.00,
    quantity: 15,
    grossPnl: -975.00,
    fees: 43.50,
    netPnl: -1018.50,
    duration: '1h 45m',
    exitReason: 'Stop Loss',
  },
  {
    id: 'trd-003',
    time: '2025-01-14T15:10:00',
    symbol: 'TCS',
    direction: 'BUY',
    strategy: 'VWAP Bounce',
    entry: 4080.00,
    exit: 4135.00,
    quantity: 25,
    grossPnl: 1375.00,
    fees: 41.25,
    netPnl: 1333.75,
    duration: '3h 30m',
    exitReason: 'Target Hit',
  },
  {
    id: 'trd-004',
    time: '2025-01-14T13:45:00',
    symbol: 'HDFCBANK',
    direction: 'BUY',
    strategy: 'Support Resistance',
    entry: 1650.00,
    exit: 1678.00,
    quantity: 100,
    grossPnl: 2800.00,
    fees: 83.00,
    netPnl: 2717.00,
    duration: '2h 5m',
    exitReason: 'Target Hit',
  },
  {
    id: 'trd-005',
    time: '2025-01-14T10:15:00',
    symbol: 'INFY',
    direction: 'SELL',
    strategy: 'RSI Divergence',
    entry: 1912.00,
    exit: 1878.50,
    quantity: 75,
    grossPnl: 2512.50,
    fees: 71.40,
    netPnl: 2441.10,
    duration: '4h 10m',
    exitReason: 'Target Hit',
  },
  {
    id: 'trd-006',
    time: '2025-01-13T14:55:00',
    symbol: 'SBIN',
    direction: 'BUY',
    strategy: 'Gap Fill',
    entry: 812.50,
    exit: 798.00,
    quantity: 200,
    grossPnl: -2900.00,
    fees: 129.00,
    netPnl: -3029.00,
    duration: '5h 40m',
    exitReason: 'Stop Loss',
  },
  {
    id: 'trd-007',
    time: '2025-01-13T11:30:00',
    symbol: 'WIPRO',
    direction: 'BUY',
    strategy: 'EMA Crossover',
    entry: 582.00,
    exit: 601.50,
    quantity: 150,
    grossPnl: 2925.00,
    fees: 88.15,
    netPnl: 2836.85,
    duration: '2h 50m',
    exitReason: 'Target Hit',
  },
  {
    id: 'trd-008',
    time: '2025-01-13T09:45:00',
    symbol: 'ADANIENT',
    direction: 'SELL',
    strategy: 'Bollinger Squeeze',
    entry: 3210.00,
    exit: 3150.00,
    quantity: 30,
    grossPnl: 1800.00,
    fees: 57.90,
    netPnl: 1742.10,
    duration: '3h 15m',
    exitReason: 'Target Hit',
  },
  {
    id: 'trd-009',
    time: '2025-01-12T14:20:00',
    symbol: 'MARUTI',
    direction: 'BUY',
    strategy: 'Volume Profile',
    entry: 12450.00,
    exit: 12380.00,
    quantity: 10,
    grossPnl: -700.00,
    fees: 37.25,
    netPnl: -737.25,
    duration: '1h 30m',
    exitReason: 'Stop Loss',
  },
  {
    id: 'trd-010',
    time: '2025-01-12T12:00:00',
    symbol: 'KOTAKBANK',
    direction: 'BUY',
    strategy: 'Opening Range',
    entry: 1872.00,
    exit: 1915.00,
    quantity: 50,
    grossPnl: 2150.00,
    fees: 69.65,
    netPnl: 2080.35,
    duration: '3h 45m',
    exitReason: 'Target Hit',
  },
  {
    id: 'trd-011',
    time: '2025-01-12T10:30:00',
    symbol: 'LT',
    direction: 'SELL',
    strategy: 'Ichimoku Cloud',
    entry: 3650.00,
    exit: 3690.00,
    quantity: 20,
    grossPnl: -800.00,
    fees: 29.40,
    netPnl: -829.40,
    duration: '2h 20m',
    exitReason: 'Stop Loss',
  },
  {
    id: 'trd-012',
    time: '2025-01-11T15:00:00',
    symbol: 'HCLTECH',
    direction: 'BUY',
    strategy: 'Fibonacci Retrace',
    entry: 1825.00,
    exit: 1872.00,
    quantity: 60,
    grossPnl: 2820.00,
    fees: 81.90,
    netPnl: 2738.10,
    duration: '4h 25m',
    exitReason: 'Target Hit',
  },
  {
    id: 'trd-013',
    time: '2025-01-11T13:15:00',
    symbol: 'AXISBANK',
    direction: 'BUY',
    strategy: 'Order Block',
    entry: 1190.00,
    exit: 1178.00,
    quantity: 125,
    grossPnl: -1500.00,
    fees: 59.65,
    netPnl: -1559.65,
    duration: '1h 55m',
    exitReason: 'Stop Loss',
  },
  {
    id: 'trd-014',
    time: '2025-01-11T10:00:00',
    symbol: 'SUNPHARMA',
    direction: 'BUY',
    strategy: 'Momentum Breakout',
    entry: 1720.00,
    exit: 1768.00,
    quantity: 40,
    grossPnl: 1920.00,
    fees: 59.76,
    netPnl: 1860.24,
    duration: '3h 10m',
    exitReason: 'Target Hit',
  },
  {
    id: 'trd-015',
    time: '2025-01-10T14:40:00',
    symbol: 'TITAN',
    direction: 'SELL',
    strategy: 'Mean Reversion',
    entry: 3780.00,
    exit: 3720.00,
    quantity: 15,
    grossPnl: 900.00,
    fees: 28.50,
    netPnl: 871.50,
    duration: '2h 35m',
    exitReason: 'Target Hit',
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

// ─────────────────────────────────────────────
// Positions Tab Component
// ─────────────────────────────────────────────

function PositionsTab() {
  const [positions, setPositions] = useState<Position[]>(MOCK_POSITIONS);
  const [closeDialogId, setCloseDialogId] = useState<string | null>(null);
  const [modifyDialog, setModifyDialog] = useState<{
    open: boolean;
    id: string;
    field: 'stopLoss' | 'target';
  }>({ open: false, id: '', field: 'stopLoss' });
  const [modifyValue, setModifyValue] = useState('');
  const [partialDialog, setPartialDialog] = useState<{
    open: boolean;
    id: string;
  }>({ open: false, id: '' });
  const [partialQty, setPartialQty] = useState('');

  const totalUnrealizedPnl = useMemo(
    () => positions.reduce((sum, p) => sum + p.unrealizedPnl, 0),
    [positions]
  );

  const totalInvested = useMemo(
    () => positions.reduce((sum, p) => sum + p.entry * p.quantity, 0),
    [positions]
  );

  const handleClosePosition = (id: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
    setCloseDialogId(null);
    const pos = positions.find((p) => p.id === id);
    toast.success(`${pos?.symbol} position closed`, {
      description: `P&L: ${INR(pos?.unrealizedPnl ?? 0)}`,
    });
  };

  const handleModify = () => {
    const val = parseFloat(modifyValue);
    if (isNaN(val) || val <= 0) return;
    setPositions((prev) =>
      prev.map((p) =>
        p.id === modifyDialog.id
          ? { ...p, [modifyDialog.field]: val }
          : p
      )
    );
    const pos = positions.find((p) => p.id === modifyDialog.id);
    toast.success(`${pos?.symbol} ${modifyDialog.field === 'stopLoss' ? 'SL' : 'Target'} updated`, {
      description: `New ${modifyDialog.field === 'stopLoss' ? 'Stop Loss' : 'Target'}: ${INR(val)}`,
    });
    setModifyDialog({ open: false, id: '', field: 'stopLoss' });
    setModifyValue('');
  };

  const handlePartialClose = () => {
    const qty = parseInt(partialQty, 10);
    if (isNaN(qty) || qty <= 0) return;
    setPositions((prev) =>
      prev.map((p) =>
        p.id === partialDialog.id
          ? {
              ...p,
              remainingQty: Math.max(0, p.remainingQty - qty),
              quantity: p.quantity,
            }
          : p
      )
    );
    const pos = positions.find((p) => p.id === partialDialog.id);
    toast.success(`Partial close on ${pos?.symbol}`, {
      description: `${qty} shares closed, ${Math.max(0, (pos?.remainingQty ?? 0) - qty)} remaining.`,
    });
    setPartialDialog({ open: false, id: '' });
    setPartialQty('');
  };

  const openModify = (id: string, field: 'stopLoss' | 'target') => {
    const pos = positions.find((p) => p.id === id);
 setModifyValue(pos ? String(pos[field]) : '');
    setModifyDialog({ open: true, id, field });
  };

  const openPartial = (id: string) => {
    const pos = positions.find((p) => p.id === id);
    setPartialQty(pos ? String(pos.remainingQty) : '');
    setPartialDialog({ open: true, id });
  };

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-ub-surface border-ub-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-ub-accent/10 flex items-center justify-center">
              <ArrowLeftRight className="h-4.5 w-4.5 text-ub-accent" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-ub-text-muted">Total Positions</p>
              <p className="text-xl font-bold text-ub-text-primary">{positions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-ub-surface border-ub-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div
              className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                totalUnrealizedPnl >= 0 ? 'bg-ub-profit/10' : 'bg-ub-loss/10'
              }`}
            >
              {totalUnrealizedPnl >= 0 ? (
                <TrendingUp className="h-4.5 w-4.5 text-ub-profit" />
              ) : (
                <TrendingDown className="h-4.5 w-4.5 text-ub-loss" />
              )}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-ub-text-muted">Unrealized P&L</p>
              <p
                className={`text-xl font-bold ${
                  totalUnrealizedPnl >= 0 ? 'text-ub-profit' : 'text-ub-loss'
                }`}
              >
                {INR(totalUnrealizedPnl)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-ub-surface border-ub-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-ub-warning/10 flex items-center justify-center">
              <Target className="h-4.5 w-4.5 text-ub-warning" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-ub-text-muted">Total Invested</p>
              <p className="text-xl font-bold text-ub-text-primary">{INR_SHORT(totalInvested)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* WS Hint */}
      <div className="flex items-center gap-2 text-xs text-ub-text-muted">
        <Wifi className="h-3 w-3 text-ub-accent" />
        <span>Prices update in real-time via WebSocket</span>
      </div>

      {/* Positions Table */}
      {positions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-ub-surface border border-ub-border flex items-center justify-center mb-4">
            <ArrowLeftRight className="h-7 w-7 text-ub-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-ub-text-primary mb-1">No open positions</h3>
          <p className="text-sm text-ub-text-muted">
            Your confirmed trades will appear here once executed.
          </p>
        </div>
      ) : (
        <Card className="bg-ub-surface border-ub-border">
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow className="border-ub-border hover:bg-transparent">
                  <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider">Symbol</TableHead>
                  <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider">Dir</TableHead>
                  <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider text-right">Entry</TableHead>
                  <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider text-right">Current</TableHead>
                  <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider text-right">Qty</TableHead>
                  <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider text-right">Remain</TableHead>
                  <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider text-right">SL</TableHead>
                  <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider text-right">Target</TableHead>
                  <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider text-right">P&L</TableHead>
                  <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider">Booked</TableHead>
                  <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((pos) => (
                  <TableRow
                    key={pos.id}
                    className="border-ub-border/50 hover:bg-ub-surface-hover transition-colors"
                  >
                    <TableCell className="font-bold text-ub-text-primary">{pos.symbol}</TableCell>
                    <TableCell>
                      <Badge
                        className={`text-[10px] font-semibold px-1.5 py-0 h-5 ${
                          pos.direction === 'BUY'
                            ? 'bg-ub-profit/15 text-ub-profit border-ub-profit/30'
                            : 'bg-ub-loss/15 text-ub-loss border-ub-loss/30'
                        }`}
                        variant="outline"
                      >
                        {pos.direction}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-ub-text-primary">
                      {INR(pos.entry)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-ub-accent">
                      {INR(pos.current)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-ub-text-primary">
                      {pos.quantity}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-ub-text-muted">
                      {pos.remainingQty}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-ub-loss">
                      {INR(pos.stopLoss)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-ub-profit">
                      {INR(pos.target)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-sm font-semibold ${
                        pos.unrealizedPnl >= 0 ? 'text-ub-profit' : 'text-ub-loss'
                      }`}
                    >
                      {pos.unrealizedPnl >= 0 ? '+' : ''}
                      {INR(pos.unrealizedPnl)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {pos.bookedLevels.map((bl, idx) => (
                          <span
                            key={idx}
                            className={`text-[10px] font-mono font-medium ${
                              bl.achieved ? 'text-ub-profit' : 'text-ub-text-muted'
                            }`}
                          >
                            L{idx + 1}
                            {bl.achieved ? <Check className="inline h-2.5 w-2.5 ml-0.5" /> : null}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-ub-text-muted hover:text-ub-text-primary"
                          >
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-ub-surface border-ub-border" align="end">
                          <DropdownMenuItem
                            className="text-ub-text-primary focus:bg-ub-surface-hover focus:text-ub-text-primary"
                            onClick={() => openModify(pos.id, 'stopLoss')}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            Modify SL
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-ub-text-primary focus:bg-ub-surface-hover focus:text-ub-text-primary"
                            onClick={() => openModify(pos.id, 'target')}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            Modify Target
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-ub-border" />
                          <DropdownMenuItem
                            className="text-ub-text-primary focus:bg-ub-surface-hover focus:text-ub-text-primary"
                            onClick={() => openPartial(pos.id)}
                          >
                            <Scissors className="h-3.5 w-3.5 mr-2" />
                            Close Partial
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-ub-loss focus:bg-ub-loss/10 focus:text-ub-loss"
                            onClick={() => setCloseDialogId(pos.id)}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-2" />
                            Close Position
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* Close Position Alert Dialog */}
      <AlertDialog open={!!closeDialogId} onOpenChange={(open) => !open && setCloseDialogId(null)}>
        <AlertDialogContent className="bg-ub-surface border-ub-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-ub-text-primary">Close Position?</AlertDialogTitle>
            <AlertDialogDescription className="text-ub-text-muted">
              Are you sure you want to close your{' '}
              <span className="text-ub-text-primary font-semibold">
                {positions.find((p) => p.id === closeDialogId)?.symbol}
              </span>{' '}
              position? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <div className="flex justify-between p-2 rounded bg-ub-background border border-ub-border/50 text-sm">
              <span className="text-ub-text-muted">Unrealized P&L</span>
              <span
                className={`font-semibold font-mono ${
                  (positions.find((p) => p.id === closeDialogId)?.unrealizedPnl ?? 0) >= 0
                    ? 'text-ub-profit'
                    : 'text-ub-loss'
                }`}
              >
                {INR(positions.find((p) => p.id === closeDialogId)?.unrealizedPnl ?? 0)}
              </span>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-ub-border text-ub-text-muted hover:text-ub-text-primary">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-ub-loss hover:bg-ub-loss/90 text-white"
              onClick={() => closeDialogId && handleClosePosition(closeDialogId)}
            >
              Close Position
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modify SL/Target Dialog */}
      <Dialog
        open={modifyDialog.open}
        onOpenChange={(open) => !open && setModifyDialog({ ...modifyDialog, open: false })}
      >
        <DialogContent className="bg-ub-surface border-ub-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-ub-text-primary">
              Modify {modifyDialog.field === 'stopLoss' ? 'Stop Loss' : 'Target'}
            </DialogTitle>
            <DialogDescription className="text-ub-text-muted">
              Update the {modifyDialog.field === 'stopLoss' ? 'stop loss' : 'target'} for{' '}
              <span className="text-ub-text-primary font-semibold">
                {positions.find((p) => p.id === modifyDialog.id)?.symbol}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              type="number"
              step="0.05"
              value={modifyValue}
              onChange={(e) => setModifyValue(e.target.value)}
              className="bg-ub-background border-ub-border text-ub-text-primary font-mono"
              placeholder="Enter new value"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-ub-border text-ub-text-muted"
              onClick={() => setModifyDialog({ ...modifyDialog, open: false })}
            >
              Cancel
            </Button>
            <Button
              className="bg-ub-accent hover:bg-ub-accent-hover text-ub-background font-semibold"
              onClick={handleModify}
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partial Close Dialog */}
      <Dialog
        open={partialDialog.open}
        onOpenChange={(open) => !open && setPartialDialog({ ...partialDialog, open: false })}
      >
        <DialogContent className="bg-ub-surface border-ub-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-ub-text-primary">Close Partial</DialogTitle>
            <DialogDescription className="text-ub-text-muted">
              Partially close{' '}
              <span className="text-ub-text-primary font-semibold">
                {positions.find((p) => p.id === partialDialog.id)?.symbol}
              </span>{' '}
              position.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-ub-text-muted">Remaining Quantity</span>
              <span className="text-ub-text-primary font-mono">
                {positions.find((p) => p.id === partialDialog.id)?.remainingQty ?? 0}
              </span>
            </div>
            <Input
              type="number"
              value={partialQty}
              onChange={(e) => setPartialQty(e.target.value)}
              className="bg-ub-background border-ub-border text-ub-text-primary font-mono"
              placeholder="Quantity to close"
              max={positions.find((p) => p.id === partialDialog.id)?.remainingQty ?? 0}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-ub-border text-ub-text-muted"
              onClick={() => setPartialDialog({ ...partialDialog, open: false })}
            >
              Cancel
            </Button>
            <Button
              className="bg-ub-warning hover:bg-ub-warning/90 text-ub-background font-semibold"
              onClick={handlePartialClose}
            >
              <Scissors className="h-4 w-4 mr-1.5" />
              Close Partial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// Trade History Tab Component
// ─────────────────────────────────────────────

const ITEMS_PER_PAGE = 20;

type ResultFilter = 'all' | 'win' | 'loss';

function HistoryTab() {
  const [trades, setTrades] = useState<HistoricalTrade[]>(MOCK_TRADES);
  const [isLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [strategyFilter, setStrategyFilter] = useState('All Strategies');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');

  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (new Date(t.time) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(t.time) > to) return false;
      }
      if (strategyFilter !== 'All Strategies' && t.strategy !== strategyFilter) return false;
      if (symbolFilter && !t.symbol.toLowerCase().includes(symbolFilter.toLowerCase())) return false;
      if (resultFilter === 'win' && t.netPnl < 0) return false;
      if (resultFilter === 'loss' && t.netPnl >= 0) return false;
      return true;
    });
  }, [trades, dateFrom, dateTo, strategyFilter, symbolFilter, resultFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTrades.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedTrades = useMemo(
    () => filteredTrades.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE),
    [filteredTrades, safePage]
  );

  const totals = useMemo(() => {
    const totalTrades = filteredTrades.length;
    const totalPnl = filteredTrades.reduce((sum, t) => sum + t.netPnl, 0);
    const wins = filteredTrades.filter((t) => t.netPnl > 0).length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    return { totalTrades, totalPnl, winRate };
  }, [filteredTrades]);

  const handleApplyFilters = () => {
    setPage(1);
    toast.success('Filters applied', {
      description: `${filteredTrades.length} trades match your criteria.`,
    });
  };

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setStrategyFilter('All Strategies');
    setSymbolFilter('');
    setResultFilter('all');
    setPage(1);
    toast.info('Filters reset');
  };

  const handleExportCSV = useCallback(() => {
    const headers = ['Time', 'Symbol', 'Direction', 'Strategy', 'Entry', 'Exit', 'Qty', 'Gross P&L', 'Fees', 'Net P&L', 'Duration', 'Exit Reason'];
    const rows = filteredTrades.map((t) => [
      format(parseISO(t.time), 'yyyy-MM-dd HH:mm'),
      t.symbol,
      t.direction,
      t.strategy,
      t.entry.toFixed(2),
      t.exit.toFixed(2),
      t.quantity,
      t.grossPnl.toFixed(2),
      t.fees.toFixed(2),
      t.netPnl.toFixed(2),
      t.duration,
      t.exitReason,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ultrabot-trades-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported', {
      description: `${filteredTrades.length} trades exported.`,
    });
  }, [filteredTrades]);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <Card className="bg-ub-surface border-ub-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-ub-text-muted" />
            <span className="text-sm font-semibold text-ub-text-primary">Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-ub-text-muted">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-ub-background border-ub-border text-ub-text-primary text-sm h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-ub-text-muted">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-ub-background border-ub-border text-ub-text-primary text-sm h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-ub-text-muted">Strategy</label>
              <Select value={strategyFilter} onValueChange={setStrategyFilter}>
                <SelectTrigger className="bg-ub-background border-ub-border text-ub-text-primary text-sm h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-ub-surface border-ub-border">
                  {STRATEGIES.map((s) => (
                    <SelectItem key={s} value={s} className="text-ub-text-primary focus:bg-ub-surface-hover focus:text-ub-text-primary">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-ub-text-muted">Symbol</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ub-text-muted" />
                <Input
                  type="text"
                  placeholder="Search symbol..."
                  value={symbolFilter}
                  onChange={(e) => setSymbolFilter(e.target.value)}
                  className="bg-ub-background border-ub-border text-ub-text-primary text-sm h-9 pl-8"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-ub-text-muted">Result</label>
              <Select value={resultFilter} onValueChange={(v) => setResultFilter(v as ResultFilter)}>
                <SelectTrigger className="bg-ub-background border-ub-border text-ub-text-primary text-sm h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-ub-surface border-ub-border">
                  <SelectItem value="all" className="text-ub-text-primary focus:bg-ub-surface-hover focus:text-ub-text-primary">
                    All
                  </SelectItem>
                  <SelectItem value="win" className="text-ub-profit focus:bg-ub-surface-hover focus:text-ub-profit">
                    Win
                  </SelectItem>
                  <SelectItem value="loss" className="text-ub-loss focus:bg-ub-surface-hover focus:text-ub-loss">
                    Loss
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              className="bg-ub-accent hover:bg-ub-accent-hover text-ub-background font-semibold text-xs h-8 px-4"
              onClick={handleApplyFilters}
            >
              Apply
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-ub-border text-ub-text-muted hover:text-ub-text-primary text-xs h-8 px-4"
              onClick={handleResetFilters}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Trade Table */}
      {isLoading ? (
        <Card className="bg-ub-surface border-ub-border">
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                {Array.from({ length: 10 }).map((_, j) => (
                  <Skeleton key={j} className="h-5 flex-1 bg-ub-surface-active" />
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : filteredTrades.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-ub-surface border border-ub-border flex items-center justify-center mb-4">
            <Search className="h-7 w-7 text-ub-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-ub-text-primary mb-1">No trades yet</h3>
          <p className="text-sm text-ub-text-muted">
            {symbolFilter || dateFrom || dateTo || strategyFilter !== 'All Strategies'
              ? 'No trades match your filters. Try adjusting them.'
              : 'Your completed trades will appear here.'}
          </p>
        </div>
      ) : (
        <>
          <Card className="bg-ub-surface border-ub-border">
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-ub-border hover:bg-transparent">
                    <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider">Time</TableHead>
                    <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider">Symbol</TableHead>
                    <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider">Dir</TableHead>
                    <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider">Strategy</TableHead>
                    <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider text-right">Entry</TableHead>
                    <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider text-right">Exit</TableHead>
                    <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider text-right">Qty</TableHead>
                    <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider text-right">Gross P&L</TableHead>
                    <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider text-right">Fees</TableHead>
                    <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider text-right">Net P&L</TableHead>
                    <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider">Duration</TableHead>
                    <TableHead className="text-ub-text-muted text-[11px] uppercase tracking-wider">Exit Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTrades.map((trade) => (
                    <TableRow
                      key={trade.id}
                      className="border-ub-border/50 hover:bg-ub-surface-hover transition-colors"
                    >
                      <TableCell className="text-xs text-ub-text-muted font-mono whitespace-nowrap">
                        {format(parseISO(trade.time), 'dd MMM HH:mm')}
                      </TableCell>
                      <TableCell className="font-bold text-ub-text-primary text-sm">
                        {trade.symbol}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] font-semibold px-1.5 py-0 h-5 ${
                            trade.direction === 'BUY'
                              ? 'bg-ub-profit/15 text-ub-profit border-ub-profit/30'
                              : 'bg-ub-loss/15 text-ub-loss border-ub-loss/30'
                          }`}
                          variant="outline"
                        >
                          {trade.direction}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-ub-text-muted">{trade.strategy}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-ub-text-primary">
                        {INR(trade.entry)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-ub-text-primary">
                        {INR(trade.exit)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-ub-text-muted">
                        {trade.quantity}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-sm ${
                          trade.grossPnl >= 0 ? 'text-ub-profit' : 'text-ub-loss'
                        }`}
                      >
                        {trade.grossPnl >= 0 ? '+' : ''}
                        {INR(trade.grossPnl)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-ub-text-muted">
                        {INR(trade.fees)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-sm font-bold ${
                          trade.netPnl >= 0 ? 'text-ub-profit' : 'text-ub-loss'
                        }`}
                      >
                        {trade.netPnl >= 0 ? '+' : ''}
                        {INR(trade.netPnl)}
                      </TableCell>
                      <TableCell className="text-xs text-ub-text-muted whitespace-nowrap">
                        {trade.duration}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] px-1.5 py-0 h-5 ${
                            trade.exitReason === 'Target Hit'
                              ? 'bg-ub-profit/15 text-ub-profit border-ub-profit/30'
                              : 'bg-ub-loss/15 text-ub-loss border-ub-loss/30'
                          }`}
                          variant="outline"
                        >
                          {trade.exitReason}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>

          {/* Footer: Summary + Pagination + Export */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="text-ub-text-muted">
                Total Trades:{' '}
                <span className="font-semibold text-ub-text-primary">{totals.totalTrades}</span>
              </div>
              <Separator orientation="vertical" className="h-4 bg-ub-border" />
              <div className="text-ub-text-muted">
                Total P&L:{' '}
                <span
                  className={`font-bold ${
                    totals.totalPnl >= 0 ? 'text-ub-profit' : 'text-ub-loss'
                  }`}
                >
                  {totals.totalPnl >= 0 ? '+' : ''}
                  {INR(totals.totalPnl)}
                </span>
              </div>
              <Separator orientation="vertical" className="h-4 bg-ub-border" />
              <div className="text-ub-text-muted">
                Win Rate:{' '}
                <span
                  className={`font-bold ${
                    totals.winRate >= 50 ? 'text-ub-profit' : 'text-ub-loss'
                  }`}
                >
                  {totals.winRate.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-ub-border text-ub-text-muted hover:text-ub-text-primary text-xs h-8"
                onClick={handleExportCSV}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export CSV
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-ub-border text-ub-text-muted hover:text-ub-text-primary h-8 w-8 p-0"
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                  disabled={safePage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-ub-text-muted px-2">
                  {safePage} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-ub-border text-ub-text-muted hover:text-ub-text-primary h-8 w-8 p-0"
                  onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function TradesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ArrowLeftRight className="h-6 w-6 text-ub-accent" />
        <h1 className="text-2xl font-bold text-ub-text-primary">Trades</h1>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="positions" className="w-full">
        <TabsList className="bg-ub-background border border-ub-border">
          <TabsTrigger
            value="positions"
            className="data-[state=active]:bg-ub-surface-active data-[state=active]:text-ub-text-primary text-ub-text-muted text-sm"
          >
            Open Positions
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="data-[state=active]:bg-ub-surface-active data-[state=active]:text-ub-text-primary text-ub-text-muted text-sm"
          >
            Trade History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="mt-4">
          <PositionsTab />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
