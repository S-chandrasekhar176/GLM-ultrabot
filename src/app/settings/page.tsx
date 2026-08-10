'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Settings,
  Radio,
  ShieldCheck,
  Bell,
  Wallet,
  Cog,
  Plug,
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  TestTube,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface BrokerConfig {
  angelOne: {
    apiKey: string;
    clientCode: string;
    pin: string;
    status: 'Connected' | 'Disconnected';
    tokenExpiry: string;
  };
  shoonya: {
    userId: string;
    password: string;
    vendorCode: string;
    appKey: string;
    status: 'Connected' | 'Disconnected';
  };
}

interface RiskConfig {
  maxOpenPositions: number;
  maxPerSector: number;
  maxDailyTrades: number;
  maxDailyLossPct: number;
  maxConsecutiveLosses: number;
  coolOffMinutes: number;
  maxDrawdownPct: number;
  vixThreshold: number;
  minSignalConfidence: number;
  newTradeWindowStart: string;
  newTradeWindowEnd: string;
  positionSizingMethod: string;
  kellyMinFraction: number;
  kellyMaxFraction: number;
  minPositionSize: number;
  partialBookingEnabled: boolean;
  partialBookingLevel1RR: number;
  partialBookingLevel1Pct: number;
  partialBookingLevel2RR: number;
  partialBookingLevel2Pct: number;
  partialBookingLevel3RR: number;
  partialBookingLevel3Pct: number;
  trailingSLMethod: string;
  trailingStepPct: number;
}

interface NotificationConfig {
  telegramBotToken: string;
  telegramChatId: string;
  alertTradeExecuted: boolean;
  alertPartialBooking: boolean;
  alertStopLoss: boolean;
  alertTargetHit: boolean;
  alertRiskWarning: boolean;
  alertEngineStatus: boolean;
  alertError: boolean;
  alertEODReport: boolean;
  morningBriefingTime: string;
  eodReportTime: string;
}

interface CapitalConfig {
  virtualCapital: number;
  maxCapitalUsagePct: number;
  perPositionMaxPct: number;
  minPositionSize: number;
}

interface GeneralConfig {
  scanIntervalSeconds: number;
  autoStartEngine: boolean;
  autoSquareoffTime: string;
  marketOpen: string;
  marketClose: string;
  premarketStart: string;
  postmarketEnd: string;
}

// ─────────────────────────────────────────────
// Default Values
// ─────────────────────────────────────────────

const defaultBroker: BrokerConfig = {
  angelOne: {
    apiKey: 'ANGEL_API_XXXXXXXXXXXX',
    clientCode: 'DEMO1234',
    pin: '',
    status: 'Disconnected',
    tokenExpiry: '—',
  },
  shoonya: {
    userId: 'SHOONYA_DEMO',
    password: '',
    vendorCode: 'VENDOR_CODE',
    appKey: 'APP_KEY_XXXXX',
    status: 'Disconnected',
  },
};

const defaultRisk: RiskConfig = {
  maxOpenPositions: 5,
  maxPerSector: 2,
  maxDailyTrades: 20,
  maxDailyLossPct: 3,
  maxConsecutiveLosses: 4,
  coolOffMinutes: 30,
  maxDrawdownPct: 10,
  vixThreshold: 25,
  minSignalConfidence: 0.65,
  newTradeWindowStart: '09:20',
  newTradeWindowEnd: '14:30',
  positionSizingMethod: 'Dynamic Kelly',
  kellyMinFraction: 0.25,
  kellyMaxFraction: 0.75,
  minPositionSize: 10000,
  partialBookingEnabled: true,
  partialBookingLevel1RR: 1.5,
  partialBookingLevel1Pct: 30,
  partialBookingLevel2RR: 2.0,
  partialBookingLevel2Pct: 30,
  partialBookingLevel3RR: 3.0,
  partialBookingLevel3Pct: 40,
  trailingSLMethod: 'Fixed Step',
  trailingStepPct: 0.5,
};

const defaultNotifications: NotificationConfig = {
  telegramBotToken: '7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  telegramChatId: '-1001234567890',
  alertTradeExecuted: true,
  alertPartialBooking: true,
  alertStopLoss: true,
  alertTargetHit: true,
  alertRiskWarning: true,
  alertEngineStatus: false,
  alertError: true,
  alertEODReport: true,
  morningBriefingTime: '08:45',
  eodReportTime: '15:45',
};

const defaultCapital: CapitalConfig = {
  virtualCapital: 500000,
  maxCapitalUsagePct: 80,
  perPositionMaxPct: 20,
  minPositionSize: 10000,
};

const defaultGeneral: GeneralConfig = {
  scanIntervalSeconds: 30,
  autoStartEngine: true,
  autoSquareoffTime: '15:15',
  marketOpen: '09:15',
  marketClose: '15:30',
  premarketStart: '09:00',
  postmarketEnd: '15:45',
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function SettingsPage() {
  const [tradingMode, setTradingMode] = useState<'paper' | 'live'>('paper');
  const [broker, setBroker] = useState<BrokerConfig>(defaultBroker);
  const [risk, setRisk] = useState<RiskConfig>(defaultRisk);
  const [notifications, setNotifications] = useState<NotificationConfig>(defaultNotifications);
  const [capital, setCapital] = useState<CapitalConfig>(defaultCapital);
  const [general, setGeneral] = useState<GeneralConfig>(defaultGeneral);

  // Testing connection states
  const [testingAngel, setTestingAngel] = useState(false);
  const [testingShoonya, setTestingShoonya] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);

  const handleTestAngel = useCallback(() => {
    setTestingAngel(true);
    setTimeout(() => {
      setBroker((p) => ({
        ...p,
        angelOne: { ...p.angelOne, status: 'Connected', tokenExpiry: '2025-08-17 09:15 IST' },
      }));
      setTestingAngel(false);
      toast.success('Angel One connection successful');
    }, 1500);
  }, []);

  const handleTestShoonya = useCallback(() => {
    setTestingShoonya(true);
    setTimeout(() => {
      setBroker((p) => ({
        ...p,
        shoonya: { ...p.shoonya, status: 'Connected' },
      }));
      setTestingShoonya(false);
      toast.success('Shoonya connection successful');
    }, 1500);
  }, []);

  const handleTestTelegram = useCallback(() => {
    setTestingTelegram(true);
    setTimeout(() => {
      setTestingTelegram(false);
      toast.success('Telegram test notification sent');
    }, 1500);
  }, []);

  const handleSave = useCallback((section: string) => {
    toast.success(`${section} settings saved successfully`);
  }, []);

  // Helper for number input updates
  const updateRisk = (key: keyof RiskConfig, value: number | string | boolean) => {
    setRisk((p) => ({ ...p, [key]: value }));
  };

  const updateNotifications = (key: keyof NotificationConfig, value: boolean | string) => {
    setNotifications((p) => ({ ...p, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-ub-accent/10 flex items-center justify-center">
          <Settings className="h-5 w-5 text-ub-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ub-text-primary">Settings</h1>
          <p className="text-sm text-ub-text-muted">Configure brokers, risk parameters, notifications, and more</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="brokers" className="space-y-6">
        <TabsList className="bg-ub-surface border border-ub-border p-1 h-auto flex-wrap gap-1">
          <TabsTrigger
            value="brokers"
            className="data-[state=active]:bg-ub-accent/15 data-[state=active]:text-ub-accent text-ub-text-muted text-sm px-4 py-2 rounded-md"
          >
            <Plug className="h-4 w-4 mr-1.5" />
            Brokers
          </TabsTrigger>
          <TabsTrigger
            value="risk"
            className="data-[state=active]:bg-ub-accent/15 data-[state=active]:text-ub-accent text-ub-text-muted text-sm px-4 py-2 rounded-md"
          >
            <ShieldCheck className="h-4 w-4 mr-1.5" />
            Risk Parameters
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="data-[state=active]:bg-ub-accent/15 data-[state=active]:text-ub-accent text-ub-text-muted text-sm px-4 py-2 rounded-md"
          >
            <Bell className="h-4 w-4 mr-1.5" />
            Notifications
          </TabsTrigger>
          <TabsTrigger
            value="capital"
            className="data-[state=active]:bg-ub-accent/15 data-[state=active]:text-ub-accent text-ub-text-muted text-sm px-4 py-2 rounded-md"
          >
            <Wallet className="h-4 w-4 mr-1.5" />
            Capital
          </TabsTrigger>
          <TabsTrigger
            value="general"
            className="data-[state=active]:bg-ub-accent/15 data-[state=active]:text-ub-accent text-ub-text-muted text-sm px-4 py-2 rounded-md"
          >
            <Cog className="h-4 w-4 mr-1.5" />
            General
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════ */}
        {/* Tab: Brokers                             */}
        {/* ═══════════════════════════════════════ */}
        <TabsContent value="brokers" className="space-y-6">
          {/* Trading Mode */}
          <Card className="bg-ub-surface border-ub-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-ub-text-primary flex items-center gap-2">
                <Radio className="h-4 w-4 text-ub-accent" />
                Trading Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <button
                  onClick={() => setTradingMode('paper')}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    tradingMode === 'paper'
                      ? 'border-ub-accent bg-ub-accent/10'
                      : 'border-ub-border bg-ub-background hover:border-ub-border-hover'
                  }`}
                >
                  <p className="text-sm font-semibold" style={{ color: tradingMode === 'paper' ? '#00d09c' : '#94a3b8' }}>
                    Paper Trading
                  </p>
                  <p className="text-xs text-ub-text-muted mt-1">Simulated trades</p>
                </button>
                <button
                  onClick={() => setTradingMode('live')}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    tradingMode === 'live'
                      ? 'border-ub-accent bg-ub-accent/10'
                      : 'border-ub-border bg-ub-background hover:border-ub-border-hover'
                  }`}
                >
                  <p className="text-sm font-semibold" style={{ color: tradingMode === 'live' ? '#00d09c' : '#94a3b8' }}>
                    Live Trading
                  </p>
                  <p className="text-xs text-ub-text-muted mt-1">Real orders</p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Angel One */}
          <Card className="bg-ub-surface border-ub-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-ub-text-primary">Angel One</CardTitle>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold ${
                    broker.angelOne.status === 'Connected'
                      ? 'border-ub-profit/40 text-ub-profit bg-ub-profit/10'
                      : 'border-ub-loss/40 text-ub-loss bg-ub-loss/10'
                  }`}
                >
                  <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${
                    broker.angelOne.status === 'Connected' ? 'bg-ub-profit' : 'bg-ub-loss'
                  }`} />
                  {broker.angelOne.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">API Key</Label>
                  <Input
                    value={broker.angelOne.apiKey}
                    onChange={(e) => setBroker((p) => ({ ...p, angelOne: { ...p.angelOne, apiKey: e.target.value } }))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Client Code</Label>
                  <Input
                    value={broker.angelOne.clientCode}
                    onChange={(e) => setBroker((p) => ({ ...p, angelOne: { ...p.angelOne, clientCode: e.target.value } }))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">PIN</Label>
                  <Input
                    type="password"
                    value={broker.angelOne.pin}
                    onChange={(e) => setBroker((p) => ({ ...p, angelOne: { ...p.angelOne, pin: e.target.value } }))}
                    placeholder="••••"
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Token Expiry</Label>
                  <div className="flex items-center h-10 px-3 rounded-md bg-ub-background border border-ub-border">
                    <span className="text-sm text-ub-text-muted">{broker.angelOne.tokenExpiry}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleTestAngel}
                  disabled={testingAngel}
                  variant="outline"
                  className="border-ub-accent/40 text-ub-accent hover:bg-ub-accent/10 hover:text-ub-accent"
                >
                  {testingAngel ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Shoonya */}
          <Card className="bg-ub-surface border-ub-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-ub-text-primary">Shoonya</CardTitle>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold ${
                    broker.shoonya.status === 'Connected'
                      ? 'border-ub-profit/40 text-ub-profit bg-ub-profit/10'
                      : 'border-ub-loss/40 text-ub-loss bg-ub-loss/10'
                  }`}
                >
                  <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${
                    broker.shoonya.status === 'Connected' ? 'bg-ub-profit' : 'bg-ub-loss'
                  }`} />
                  {broker.shoonya.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">User ID</Label>
                  <Input
                    value={broker.shoonya.userId}
                    onChange={(e) => setBroker((p) => ({ ...p, shoonya: { ...p.shoonya, userId: e.target.value } }))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Password</Label>
                  <Input
                    type="password"
                    value={broker.shoonya.password}
                    onChange={(e) => setBroker((p) => ({ ...p, shoonya: { ...p.shoonya, password: e.target.value } }))}
                    placeholder="••••••••"
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Vendor Code</Label>
                  <Input
                    value={broker.shoonya.vendorCode}
                    onChange={(e) => setBroker((p) => ({ ...p, shoonya: { ...p.shoonya, vendorCode: e.target.value } }))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">App Key</Label>
                  <Input
                    value={broker.shoonya.appKey}
                    onChange={(e) => setBroker((p) => ({ ...p, shoonya: { ...p.shoonya, appKey: e.target.value } }))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleTestShoonya}
                  disabled={testingShoonya}
                  variant="outline"
                  className="border-ub-accent/40 text-ub-accent hover:bg-ub-accent/10 hover:text-ub-accent"
                >
                  {testingShoonya ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => handleSave('Brokers')} className="bg-ub-accent hover:bg-ub-accent-hover text-ub-background font-semibold">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════ */}
        {/* Tab: Risk Parameters                    */}
        {/* ═══════════════════════════════════════ */}
        <TabsContent value="risk" className="space-y-6">
          {/* Position Limits */}
          <Card className="bg-ub-surface border-ub-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-ub-text-primary">Position Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Max Open Positions</Label>
                  <Input
                    type="number"
                    value={risk.maxOpenPositions}
                    onChange={(e) => updateRisk('maxOpenPositions', Number(e.target.value))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Max Per Sector</Label>
                  <Input
                    type="number"
                    value={risk.maxPerSector}
                    onChange={(e) => updateRisk('maxPerSector', Number(e.target.value))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Max Daily Trades</Label>
                  <Input
                    type="number"
                    value={risk.maxDailyTrades}
                    onChange={(e) => updateRisk('maxDailyTrades', Number(e.target.value))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loss Limits */}
          <Card className="bg-ub-surface border-ub-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-ub-text-primary">Loss Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Max Daily Loss (%)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={risk.maxDailyLossPct}
                    onChange={(e) => updateRisk('maxDailyLossPct', Number(e.target.value))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Max Consecutive Losses</Label>
                  <Input
                    type="number"
                    value={risk.maxConsecutiveLosses}
                    onChange={(e) => updateRisk('maxConsecutiveLosses', Number(e.target.value))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Cool-off Minutes</Label>
                  <Input
                    type="number"
                    value={risk.coolOffMinutes}
                    onChange={(e) => updateRisk('coolOffMinutes', Number(e.target.value))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Max Drawdown (%)</Label>
                  <Input
                    type="number"
                    value={risk.maxDrawdownPct}
                    onChange={(e) => updateRisk('maxDrawdownPct', Number(e.target.value))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trade Filters */}
          <Card className="bg-ub-surface border-ub-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-ub-text-primary">Trade Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">VIX Threshold</Label>
                  <Input
                    type="number"
                    value={risk.vixThreshold}
                    onChange={(e) => updateRisk('vixThreshold', Number(e.target.value))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Min Signal Confidence</Label>
                  <Input
                    type="number"
                    step="0.05"
                    value={risk.minSignalConfidence}
                    onChange={(e) => updateRisk('minSignalConfidence', Number(e.target.value))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">New Trade Window Start</Label>
                  <Input
                    type="time"
                    value={risk.newTradeWindowStart}
                    onChange={(e) => updateRisk('newTradeWindowStart', e.target.value)}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">New Trade Window End</Label>
                  <Input
                    type="time"
                    value={risk.newTradeWindowEnd}
                    onChange={(e) => updateRisk('newTradeWindowEnd', e.target.value)}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Position Sizing */}
          <Card className="bg-ub-surface border-ub-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-ub-text-primary">Position Sizing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Method</Label>
                  <Select
                    value={risk.positionSizingMethod}
                    onValueChange={(v) => updateRisk('positionSizingMethod', v)}
                  >
                    <SelectTrigger className="bg-ub-background border-ub-border text-ub-text-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-ub-surface border-ub-border">
                      <SelectItem value="Dynamic Kelly" className="text-ub-text-primary">Dynamic Kelly</SelectItem>
                      <SelectItem value="Fixed" className="text-ub-text-primary">Fixed</SelectItem>
                      <SelectItem value="Risk Percent" className="text-ub-text-primary">Risk Percent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Kelly Min Fraction</Label>
                  <Input
                    type="number"
                    step="0.05"
                    value={risk.kellyMinFraction}
                    onChange={(e) => updateRisk('kellyMinFraction', Number(e.target.value))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Kelly Max Fraction</Label>
                  <Input
                    type="number"
                    step="0.05"
                    value={risk.kellyMaxFraction}
                    onChange={(e) => updateRisk('kellyMaxFraction', Number(e.target.value))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Min Position Size (₹)</Label>
                  <Input
                    type="number"
                    value={risk.minPositionSize}
                    onChange={(e) => updateRisk('minPositionSize', Number(e.target.value))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Partial Booking */}
          <Card className="bg-ub-surface border-ub-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-ub-text-primary">Partial Booking</CardTitle>
                <Switch
                  checked={risk.partialBookingEnabled}
                  onCheckedChange={(v) => updateRisk('partialBookingEnabled', v)}
                  className="data-[state=checked]:bg-ub-accent"
                />
              </div>
            </CardHeader>
            <CardContent className={risk.partialBookingEnabled ? '' : 'opacity-50 pointer-events-none'}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Level 1 — RR Ratio</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={risk.partialBookingLevel1RR}
                    onChange={(e) => updateRisk('partialBookingLevel1RR', Number(e.target.value))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                  <Label className="text-ub-text-muted text-sm">Book %</Label>
                  <Input
                    type="number"
                    value={risk.partialBookingLevel1Pct}
                    onChange={(e) => updateRisk('partialBookingLevel1Pct', Number(e.target.value))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Level 2 — RR Ratio</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={risk.partialBookingLevel2RR}
                    onChange={(e) => updateRisk('partialBookingLevel2RR', Number(e.target.value))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                  <Label className="text-ub-text-muted text-sm">Book %</Label>
                  <Input
                    type="number"
                    value={risk.partialBookingLevel2Pct}
                    onChange={(e) => updateRisk('partialBookingLevel2Pct', Number(e.target.value))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Level 3 — RR Ratio</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={risk.partialBookingLevel3RR}
                    onChange={(e) => updateRisk('partialBookingLevel3RR', Number(e.target.value))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                  <Label className="text-ub-text-muted text-sm">Book %</Label>
                  <Input
                    type="number"
                    value={risk.partialBookingLevel3Pct}
                    onChange={(e) => updateRisk('partialBookingLevel3Pct', Number(e.target.value))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
              </div>
              <Separator className="my-4 bg-ub-border" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Trailing SL Method</Label>
                  <Select
                    value={risk.trailingSLMethod}
                    onValueChange={(v) => updateRisk('trailingSLMethod', v)}
                  >
                    <SelectTrigger className="bg-ub-background border-ub-border text-ub-text-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-ub-surface border-ub-border">
                      <SelectItem value="Fixed Step" className="text-ub-text-primary">Fixed Step</SelectItem>
                      <SelectItem value="ATR Based" className="text-ub-text-primary">ATR Based</SelectItem>
                      <SelectItem value="Percentage" className="text-ub-text-primary">Percentage</SelectItem>
                      <SelectItem value="Swing High/Low" className="text-ub-text-primary">Swing High/Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Trailing Step (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={risk.trailingStepPct}
                    onChange={(e) => updateRisk('trailingStepPct', Number(e.target.value))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => handleSave('Risk Parameters')} className="bg-ub-accent hover:bg-ub-accent-hover text-ub-background font-semibold">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════ */}
        {/* Tab: Notifications                      */}
        {/* ═══════════════════════════════════════ */}
        <TabsContent value="notifications" className="space-y-6">
          {/* Telegram */}
          <Card className="bg-ub-surface border-ub-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-ub-text-primary flex items-center gap-2">
                <span className="text-lg">📨</span>
                Telegram
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Bot Token</Label>
                  <Input
                    value={notifications.telegramBotToken}
                    onChange={(e) => updateNotifications('telegramBotToken', e.target.value)}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Chat ID</Label>
                  <Input
                    value={notifications.telegramChatId}
                    onChange={(e) => updateNotifications('telegramChatId', e.target.value)}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleTestTelegram}
                  disabled={testingTelegram}
                  variant="outline"
                  className="border-ub-accent/40 text-ub-accent hover:bg-ub-accent/10 hover:text-ub-accent"
                >
                  {testingTelegram ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  Test Notification
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Alert Types */}
          <Card className="bg-ub-surface border-ub-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-ub-text-primary">Alert Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {[
                  { key: 'alertTradeExecuted' as const, label: 'Trade Executed' },
                  { key: 'alertPartialBooking' as const, label: 'Partial Booking' },
                  { key: 'alertStopLoss' as const, label: 'Stop Loss Hit' },
                  { key: 'alertTargetHit' as const, label: 'Target Hit' },
                  { key: 'alertRiskWarning' as const, label: 'Risk Limit Warning' },
                  { key: 'alertEngineStatus' as const, label: 'Engine Status Change' },
                  { key: 'alertError' as const, label: 'Error Alert' },
                  { key: 'alertEODReport' as const, label: 'EOD Report' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-1">
                    <Label className="text-sm text-ub-text-primary cursor-pointer">{item.label}</Label>
                    <Switch
                      checked={notifications[item.key] as boolean}
                      onCheckedChange={(v) => updateNotifications(item.key, v)}
                      className="data-[state=checked]:bg-ub-accent"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card className="bg-ub-surface border-ub-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-ub-text-primary">Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Morning Briefing Time</Label>
                  <Input
                    type="time"
                    value={notifications.morningBriefingTime}
                    onChange={(e) => updateNotifications('morningBriefingTime', e.target.value)}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">EOD Report Time</Label>
                  <Input
                    type="time"
                    value={notifications.eodReportTime}
                    onChange={(e) => updateNotifications('eodReportTime', e.target.value)}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => handleSave('Notifications')} className="bg-ub-accent hover:bg-ub-accent-hover text-ub-background font-semibold">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════ */}
        {/* Tab: Capital                             */}
        {/* ═══════════════════════════════════════ */}
        <TabsContent value="capital" className="space-y-6">
          <Card className="bg-ub-surface border-ub-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-ub-text-primary flex items-center gap-2">
                <Wallet className="h-4 w-4 text-ub-accent" />
                Capital Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Virtual Capital (₹)</Label>
                  <Input
                    type="number"
                    value={capital.virtualCapital}
                    onChange={(e) => setCapital((p) => ({ ...p, virtualCapital: Number(e.target.value) }))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Min Position Size (₹)</Label>
                  <Input
                    type="number"
                    value={capital.minPositionSize}
                    onChange={(e) => setCapital((p) => ({ ...p, minPositionSize: Number(e.target.value) }))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
              </div>

              {/* Max Capital Usage Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-ub-text-muted text-sm">Max Capital Usage</Label>
                  <span className="text-sm font-semibold text-ub-accent">{capital.maxCapitalUsagePct}%</span>
                </div>
                <div className="relative">
                  <div className="w-full h-2 bg-ub-background rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ub-accent rounded-full transition-all duration-200"
                      style={{ width: `${capital.maxCapitalUsagePct}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={capital.maxCapitalUsagePct}
                    onChange={(e) => setCapital((p) => ({ ...p, maxCapitalUsagePct: Number(e.target.value) }))}
                    className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer"
                  />
                </div>
                <div className="flex justify-between text-xs text-ub-text-disabled">
                  <span>10%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Per-Position Max Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-ub-text-muted text-sm">Per-Position Max</Label>
                  <span className="text-sm font-semibold text-ub-accent">{capital.perPositionMaxPct}%</span>
                </div>
                <div className="relative">
                  <div className="w-full h-2 bg-ub-background rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ub-warning rounded-full transition-all duration-200"
                      style={{ width: `${capital.perPositionMaxPct * 5}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={capital.perPositionMaxPct}
                    onChange={(e) => setCapital((p) => ({ ...p, perPositionMaxPct: Number(e.target.value) }))}
                    className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer"
                  />
                </div>
                <div className="flex justify-between text-xs text-ub-text-disabled">
                  <span>5%</span>
                  <span>50%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => handleSave('Capital')} className="bg-ub-accent hover:bg-ub-accent-hover text-ub-background font-semibold">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════ */}
        {/* Tab: General                            */}
        {/* ═══════════════════════════════════════ */}
        <TabsContent value="general" className="space-y-6">
          {/* Engine Settings */}
          <Card className="bg-ub-surface border-ub-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-ub-text-primary flex items-center gap-2">
                <Cog className="h-4 w-4 text-ub-accent" />
                Engine Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Scan Interval (seconds)</Label>
                  <Input
                    type="number"
                    value={general.scanIntervalSeconds}
                    onChange={(e) => setGeneral((p) => ({ ...p, scanIntervalSeconds: Number(e.target.value) }))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Auto Square-off Time</Label>
                  <Input
                    type="time"
                    value={general.autoSquareoffTime}
                    onChange={(e) => setGeneral((p) => ({ ...p, autoSquareoffTime: e.target.value }))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <Label className="text-sm text-ub-text-primary">Auto-start Engine on Market Open</Label>
                <Switch
                  checked={general.autoStartEngine}
                  onCheckedChange={(v) => setGeneral((p) => ({ ...p, autoStartEngine: v }))}
                  className="data-[state=checked]:bg-ub-accent"
                />
              </div>
            </CardContent>
          </Card>

          {/* Market Hours */}
          <Card className="bg-ub-surface border-ub-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-ub-text-primary">Market Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Market Open</Label>
                  <Input
                    type="time"
                    value={general.marketOpen}
                    onChange={(e) => setGeneral((p) => ({ ...p, marketOpen: e.target.value }))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Market Close</Label>
                  <Input
                    type="time"
                    value={general.marketClose}
                    onChange={(e) => setGeneral((p) => ({ ...p, marketClose: e.target.value }))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Pre-market Start</Label>
                  <Input
                    type="time"
                    value={general.premarketStart}
                    onChange={(e) => setGeneral((p) => ({ ...p, premarketStart: e.target.value }))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-ub-text-muted text-sm">Post-market End</Label>
                  <Input
                    type="time"
                    value={general.postmarketEnd}
                    onChange={(e) => setGeneral((p) => ({ ...p, postmarketEnd: e.target.value }))}
                    className="bg-ub-background border-ub-border text-ub-text-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => handleSave('General')} className="bg-ub-accent hover:bg-ub-accent-hover text-ub-background font-semibold">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
