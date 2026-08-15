'use client';

import { useState, useEffect } from 'react';
import { useRiskStatus, useRiskGates } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Timer,
  AlertTriangle,
  Info,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type RiskStatus = 'normal' | 'caution' | 'stopped';
type GateStatus = 'PASS' | 'FAIL';
type EventSeverity = 'info' | 'warning' | 'critical';

interface RiskLimit {
  label: string;
  current: string;
  limit: string;
  currentNum: number;
  limitNum: number;
  unit: string;
}

interface RiskGate {
  id: string;
  name: string;
  status: GateStatus;
  detail: string;
}

interface RiskEvent {
  time: string;
  type: string;
  gate: string;
  details: string;
  severity: EventSeverity;
}

interface RejectionBreakdown {
  gate: string;
  count: number;
  color: string;
}

// ─────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────

const RISK_LIMITS: RiskLimit[] = [
  { label: 'Daily P&L', current: '₹2,340', limit: '₹3,000', currentNum: 2340, limitNum: 3000, unit: '₹' },
  { label: 'Daily Trades', current: '7', limit: '10', currentNum: 7, limitNum: 10, unit: '' },
  { label: 'Consecutive Losses', current: '2', limit: '5', currentNum: 2, limitNum: 5, unit: '' },
  { label: 'Capital Usage', current: '₹65,000', limit: '₹90,000', currentNum: 65000, limitNum: 90000, unit: '₹' },
];

const RISK_GATES: RiskGate[] = [
  { id: 'G1', name: 'G1: Max Positions', status: 'PASS', detail: '5 open, limit 5' },
  { id: 'G2', name: 'G2: Sector Concentration', status: 'FAIL', detail: 'Banking 2/2 — sector limit reached' },
  { id: 'G3', name: 'G3: Max Position Size', status: 'PASS', detail: 'Max position ₹18,000 < ₹25,000 limit' },
  { id: 'G4', name: 'G4: Max Daily Trades', status: 'PASS', detail: '7 trades today, limit 10' },
  { id: 'G5', name: 'G5: Max Daily Loss', status: 'PASS', detail: '₹2,340 loss < ₹5,000 limit' },
  { id: 'G6', name: 'G6: Correlation Check', status: 'PASS', detail: 'Portfolio correlation 0.42 < 0.6' },
  { id: 'G7', name: 'G7: VIX Filter', status: 'PASS', detail: 'VIX 16.5 < 20 threshold' },
  { id: 'G8', name: 'G8: Time of Day', status: 'PASS', detail: 'Within trading hours (09:15–15:30)' },
  { id: 'G9', name: 'G9: Price Mismatch', status: 'PASS', detail: 'Order price within 0.2% of LTP' },
  { id: 'G10', name: 'G10: Min Confidence', status: 'FAIL', detail: 'Signal confidence 58% < 65% threshold' },
  { id: 'G11', name: 'G11: Max Drawdown', status: 'PASS', detail: 'Current drawdown 3.2% < 8% limit' },
  { id: 'G12', name: 'G12: Margin Check', status: 'PASS', detail: 'Available margin ₹1,25,000 > required ₹72,000' },
  { id: 'G13', name: 'G13: Duplicate Signal', status: 'PASS', detail: 'No duplicate signals detected' },
];

const RISK_EVENTS: RiskEvent[] = [
  { time: '14:32:15', type: 'Gate Rejection', gate: 'G2', details: 'HDFCBANK rejected — Banking sector at max concentration', severity: 'warning' },
  { time: '14:28:07', type: 'Signal Blocked', gate: 'G10', details: 'TATAPOWER signal below 65% confidence threshold', severity: 'warning' },
  { time: '13:45:22', type: 'Limit Alert', gate: 'G5', details: 'Daily loss approaching 50% of max limit (₹2,340/₹5,000)', severity: 'info' },
  { time: '13:12:44', type: 'Consecutive Loss', gate: 'G5', details: '2 consecutive losses detected — monitoring', severity: 'warning' },
  { time: '12:55:30', type: 'Gate Rejection', gate: 'G2', details: 'ICICIBANK rejected — Banking sector at max concentration', severity: 'warning' },
  { time: '11:38:19', type: 'Cool-off Triggered', gate: 'G5', details: 'Auto cool-off after 2 consecutive losses — 15 min pause', severity: 'critical' },
  { time: '10:22:05', type: 'Signal Passed', gate: 'All', details: 'RELIANCE passed all 13 gates — trade executed', severity: 'info' },
  { time: '09:45:11', type: 'VIX Alert', gate: 'G7', details: 'VIX spiked to 18.2 — monitoring closely', severity: 'info' },
];

const REJECTIONS: RejectionBreakdown[] = [
  { gate: 'G2: Sector', count: 8, color: '#f59e0b' },
  { gate: 'G10: Confidence', count: 5, color: '#a855f7' },
  { gate: 'G5: Max Loss', count: 3, color: '#ef4444' },
  { gate: 'G4: Trades', count: 2, color: '#06b6d4' },
  { gate: 'G13: Duplicate', count: 1, color: '#94a3b8' },
];

const TOTAL_SIGNALS = 87;
const SIGNALS_PASSED = 68;
const SIGNALS_REJECTED = 19;

const TRADE_RESULTS: ('win' | 'loss' | 'pending')[] = [
  'win', 'loss', 'win', 'win', 'loss',
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getLimitBarColor(pct: number): string {
  if (pct < 50) return 'bg-ub-profit';
  if (pct < 80) return 'bg-ub-warning';
  return 'bg-ub-loss';
}

function getOverallStatus(): RiskStatus {
  const pnlPct = (2340 / 5000) * 100;
  const hasCriticalEvent = RISK_EVENTS.some((e) => e.severity === 'critical');
  if (pnlPct > 80 || hasCriticalEvent) return 'stopped';
  if (pnlPct > 50 || RISK_GATES.some((g) => g.status === 'FAIL')) return 'caution';
  return 'normal';
}

function formatINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN');
}

const SEVERITY_CONFIG: Record<EventSeverity, { color: string; bgColor: string; icon: React.ElementType }> = {
  info: { color: 'text-ub-accent', bgColor: 'bg-ub-accent/10 border-ub-accent/30', icon: Info },
  warning: { color: 'text-ub-warning', bgColor: 'bg-ub-warning/10 border-ub-warning/30', icon: AlertTriangle },
  critical: { color: 'text-ub-loss', bgColor: 'bg-ub-loss/10 border-ub-loss/30', icon: XCircle },
};

// ─────────────────────────────────────────────
// Countdown hook
// ─────────────────────────────────────────────

function useCountdown(initialSeconds: number, active: boolean) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (!active) return;
    if (seconds <= 0) return;
    const timer = setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [active, seconds]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return { seconds, display: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}` };
}

// ─────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────

export default function RiskDashboardPage() {
  const { data: statusData } = useRiskStatus();
  const { data: gatesData } = useRiskGates();

  const status = (statusData as any) || {};
  const gates = (gatesData as any) || { gates: {}, limits: {} };

  const RISK_LIMITS: RiskLimit[] = [
    { 
      label: 'Daily P&L', 
      current: '₹' + (status.net_pnl || 0), 
      limit: '₹' + (gates.limits?.max_daily_loss_pct || 3000), 
      currentNum: Math.abs(status.net_pnl || 0), 
      limitNum: 3000, 
      unit: '₹' 
    },
    { 
      label: 'Daily Trades', 
      current: String(status.total_trades || 0), 
      limit: String(gates.limits?.max_daily_trades || 10), 
      currentNum: status.total_trades || 0, 
      limitNum: gates.limits?.max_daily_trades || 10, 
      unit: '' 
    },
    { 
      label: 'Consecutive Losses', 
      current: String(status.consecutive_losses || 0), 
      limit: String(gates.limits?.max_consecutive_losses || 3), 
      currentNum: status.consecutive_losses || 0, 
      limitNum: gates.limits?.max_consecutive_losses || 3, 
      unit: '' 
    },
    { 
      label: 'Capital Usage', 
      current: '₹' + (status.capital_in_use || 0), 
      limit: '₹100000', 
      currentNum: status.capital_in_use || 0, 
      limitNum: 100000, 
      unit: '₹' 
    },
  ];

  const RISK_GATES: RiskGate[] = Object.values(gates.gates || {}).map((g: any, i: number) => ({
    id: 'G' + (i + 1),
    name: g.name,
    status: g.last_passed === false ? 'FAIL' : 'PASS',
    detail: g.last_result?.reason || 'OK'
  }));

  const RISK_EVENTS: RiskEvent[] = [];
  const REJECTIONS: RejectionBreakdown[] = [];
  const SIGNALS_REJECTED = 0;
  const TOTAL_SIGNALS = status.total_trades || 1;

  const getOverallStatus = () => {
    if (status.in_cooloff) return 'stopped';
    if (!status.can_take_new_trades) return 'stopped';
    if (status.consecutive_losses > 0 || status.net_pnl < 0) return 'caution';
    return 'normal';
  };

  const overallStatus = getOverallStatus();
  const cooloffActive = overallStatus === 'stopped';
  const { display: countdownDisplay } = useCountdown(847, cooloffActive);

  const statusConfig = {
    normal: { label: 'Normal', color: 'text-ub-profit', bgColor: 'bg-ub-profit/10 border-ub-profit/30', icon: ShieldCheck },
    caution: { label: 'Caution', color: 'text-ub-warning', bgColor: 'bg-ub-warning/10 border-ub-warning/30', icon: ShieldAlert },
    stopped: { label: 'Stopped', color: 'text-ub-loss', bgColor: 'bg-ub-loss/10 border-ub-loss/30', icon: ShieldOff },
  }[overallStatus];

  const StatusIcon = statusConfig.icon;
  const rejectionRate = ((SIGNALS_REJECTED / TOTAL_SIGNALS) * 100).toFixed(1);
  const maxRejectionCount = Math.max(...REJECTIONS.map((r) => r.count));

  return (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left Column (60%) ── */}
        <div className="lg:col-span-3 space-y-6">
          {/* Daily Risk Status */}
          <Card className="bg-ub-surface border-ub-border">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-ub-text-primary flex items-center gap-2">
                  <Shield className="h-4 w-4 text-ub-accent" />
                  Daily Risk Status
                </CardTitle>
                <Badge variant="outline" className={cn('text-xs px-2.5 py-0.5 border gap-1.5', statusConfig.bgColor, statusConfig.color)}>
                  <StatusIcon className="h-3 w-3" />
                  {statusConfig.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              {RISK_LIMITS.map((item) => {
                const pct = Math.round((item.currentNum / item.limitNum) * 100);
                return (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ub-text-muted">{item.label}</span>
                      <span className="text-ub-text-primary font-mono">
                        {item.unit === '₹' ? `${item.current} / ${item.limit}` : `${item.current} / ${item.limit}`}
                      </span>
                    </div>
                    <div className="relative h-2 w-full bg-ub-border/50 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', getLimitBarColor(pct))}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Risk Gates */}
          <Card className="bg-ub-surface border-ub-border">
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-sm font-semibold text-ub-text-primary flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-ub-accent" />
                Risk Gates — Last Scan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="max-h-96 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {RISK_GATES.map((gate) => (
                  <div
                    key={gate.id}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-md transition-colors',
                      gate.status === 'FAIL' ? 'bg-ub-loss/5' : 'hover:bg-ub-surface-hover',
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-ub-text-muted w-5 shrink-0">{gate.id}</span>
                      <span className="text-xs text-ub-text-primary truncate">{gate.name.replace(gate.id + ': ', '')}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[11px] text-ub-text-muted hidden sm:block max-w-[200px] truncate">{gate.detail}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] px-1.5 py-0 border shrink-0',
                          gate.status === 'PASS'
                            ? 'border-ub-profit/30 text-ub-profit bg-ub-profit/10'
                            : 'border-ub-loss/30 text-ub-loss bg-ub-loss/10',
                        )}
                      >
                        {gate.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Risk Events Log */}
          <Card className="bg-ub-surface border-ub-border">
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-sm font-semibold text-ub-text-primary flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-ub-accent" />
                Today&apos;s Risk Events
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow className="border-ub-border hover:bg-transparent">
                      <TableHead className="text-ub-text-muted text-xs w-20">Time</TableHead>
                      <TableHead className="text-ub-text-muted text-xs">Event Type</TableHead>
                      <TableHead className="text-ub-text-muted text-xs w-14">Gate</TableHead>
                      <TableHead className="text-ub-text-muted text-xs hidden sm:table-cell">Details</TableHead>
                      <TableHead className="text-ub-text-muted text-xs w-20">Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {RISK_EVENTS.map((event, idx) => {
                      const sev = SEVERITY_CONFIG[event.severity];
                      const SevIcon = sev.icon;
                      return (
                        <TableRow key={idx} className="border-ub-border/50 hover:bg-ub-surface-hover">
                          <TableCell className="text-ub-text-muted text-xs font-mono">{event.time}</TableCell>
                          <TableCell className="text-ub-text-primary text-xs font-medium">{event.type}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-ub-border text-ub-text-muted">
                              {event.gate}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-ub-text-muted text-xs hidden sm:table-cell max-w-[250px] truncate">
                            {event.details}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border gap-1', sev.bgColor, sev.color)}>
                              <SevIcon className="h-2.5 w-2.5" />
                              {event.severity}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* ── Right Column (40%) ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Risk Summary */}
          <Card className="bg-ub-surface border-ub-border">
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-sm font-semibold text-ub-text-primary flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-ub-accent" />
                Risk Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-ub-bg rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-ub-text-primary">{TOTAL_SIGNALS}</p>
                  <p className="text-[11px] text-ub-text-muted mt-0.5">Signals Scanned</p>
                </div>
                <div className="bg-ub-bg rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-ub-profit">{SIGNALS_PASSED}</p>
                  <p className="text-[11px] text-ub-text-muted mt-0.5">Passed All Gates</p>
                </div>
                <div className="bg-ub-bg rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-ub-loss">{SIGNALS_REJECTED}</p>
                  <p className="text-[11px] text-ub-text-muted mt-0.5">Rejected</p>
                </div>
                <div className="bg-ub-bg rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-ub-warning">{rejectionRate}%</p>
                  <p className="text-[11px] text-ub-text-muted mt-0.5">Rejection Rate</p>
                </div>
              </div>

              <Separator className="bg-ub-border" />

              {/* Rejection breakdown bar chart */}
              <div>
                <p className="text-[11px] font-medium text-ub-text-muted uppercase tracking-wider mb-3">
                  Rejections by Gate
                </p>
                <div className="space-y-2">
                  {REJECTIONS.map((r) => (
                    <div key={r.gate} className="flex items-center gap-2">
                      <span className="text-[11px] text-ub-text-muted w-24 shrink-0 truncate">{r.gate}</span>
                      <div className="flex-1 h-4 bg-ub-bg rounded overflow-hidden">
                        <div
                          className="h-full rounded transition-all"
                          style={{
                            width: `${(r.count / maxRejectionCount) * 100}%`,
                            backgroundColor: r.color,
                            minWidth: r.count > 0 ? '4px' : '0',
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-ub-text-primary font-mono w-5 text-right">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cool-off Status */}
          <Card className="bg-ub-surface border-ub-border">
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-sm font-semibold text-ub-text-primary flex items-center gap-2">
                <Timer className="h-4 w-4 text-ub-accent" />
                Cool-off Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ub-text-muted">Status</span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs px-2.5 py-0.5 border',
                    cooloffActive
                      ? 'border-ub-loss/30 text-ub-loss bg-ub-loss/10'
                      : 'border-ub-profit/30 text-ub-profit bg-ub-profit/10',
                  )}
                >
                  {cooloffActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {cooloffActive && (
                <>
                  <div className="bg-ub-loss/5 border border-ub-loss/20 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ub-text-muted">Remaining Time</span>
                      <span className="text-lg font-mono font-bold text-ub-loss">{countdownDisplay}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ub-text-muted">Reason</span>
                      <span className="text-xs text-ub-text-primary">Consecutive loss limit breached</span>
                    </div>
                  </div>
                </>
              )}

              {/* Consecutive Loss Tracker */}
              <div>
                <p className="text-[11px] font-medium text-ub-text-muted uppercase tracking-wider mb-3">
                  Trade Results (Recent)
                </p>
                <div className="flex items-center gap-2">
                  {TRADE_RESULTS.map((result, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border',
                        result === 'win' && 'bg-ub-profit/15 border-ub-profit/40 text-ub-profit',
                        result === 'loss' && 'bg-ub-loss/15 border-ub-loss/40 text-ub-loss',
                        result === 'pending' && 'bg-ub-border/30 border-ub-border text-ub-text-muted',
                      )}
                    >
                      {result === 'win' ? 'W' : result === 'loss' ? 'L' : '–'}
                    </div>
                  ))}
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={`empty-${idx}`}
                      className="w-8 h-8 rounded-full border border-dashed border-ub-border/50 flex items-center justify-center text-[10px] text-ub-text-muted/30"
                    >
                      –
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-ub-text-muted mt-2">
                  <span className="text-ub-loss font-medium">2 losses</span> in last 5 trades — 3 more trigger cool-off
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
