'use client';

import { useState } from 'react';
import {
  Shield,
  Zap,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Radio,
  ArrowLeft,
  Loader2,
  Info,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { theme } from '@/styles/theme';
import type { EngineMode } from '@/lib/store';

/* ─────────────────────────────────────────────
   Broker Definitions
   ───────────────────────────────────────────── */

interface BrokerOption {
  id: string;
  name: string;
  logo: string;
  description: string;
  features: string[];
  connected: boolean;
}

const BROKERS: BrokerOption[] = [
  {
    id: 'zerodha',
    name: 'Zerodha',
    logo: 'Z',
    description: 'Kite Connect API — most popular retail broker in India',
    features: ['Real-time quotes', 'Order execution', 'Historical data', 'Webhook support'],
    connected: false,
  },
  {
    id: 'angelone',
    name: 'Angel One',
    logo: 'A',
    description: 'SmartAPI — multi-exchange trading with advanced charting',
    features: ['Real-time quotes', 'Smart order types', 'Margin trading', 'Portfolio analytics'],
    connected: false,
  },
  {
    id: 'upstox',
    name: 'Upstox',
    logo: 'U',
    description: 'Upstox API v2 — fast and reliable order placement',
    features: ['Real-time quotes', 'GTT orders', 'Margin trading', 'Multi-exchange'],
    connected: false,
  },
  {
    id: 'dhan',
    name: 'Dhan',
    logo: 'D',
    description: 'Dhan HQ — modern API-first broker with option chains',
    features: ['Real-time quotes', 'Option chains', 'IPO alerts', 'Treasury data'],
    connected: false,
  },
  {
    id: 'icici',
    name: 'ICICI Direct',
    logo: 'I',
    description: 'ICICI Direct API — full-service broker with research',
    features: ['Real-time quotes', 'Research calls', 'Margin trading', 'BTST/STBT'],
    connected: false,
  },
  {
    id: 'groww',
    name: 'Groww',
    logo: 'G',
    description: 'Groww Connect API — simple and commission-free',
    features: ['Real-time quotes', 'Zero commission', 'Simple UI', 'Mutual funds'],
    connected: false,
  },
];

const PAPER_BROKER: BrokerOption = {
  id: 'paper',
  name: 'Paper Broker',
  logo: 'P',
  description: 'Built-in simulator — no broker account needed. Uses real market data with virtual money.',
  features: ['Simulated execution', 'Real LTP data', 'No risk', 'Instant fills'],
  connected: true,
};

/* ─────────────────────────────────────────────
   Mode Definitions
   ───────────────────────────────────────────── */

interface ModeOption {
  id: EngineMode;
  label: string;
  description: string;
  subtext: string;
  icon: typeof Shield;
  color: string;
  bgColor: string;
  borderColor: string;
  hoverBg: string;
  warning?: string;
}

const MODES: ModeOption[] = [
  {
    id: 'paper',
    label: 'Paper Trade',
    description: 'Simulated trading with virtual money',
    subtext: 'Practice strategies risk-free using real market data and simulated order execution.',
    icon: Shield,
    color: theme.colors.profit,
    bgColor: theme.colors.profit + '08',
    borderColor: theme.colors.profit + '30',
    hoverBg: theme.colors.profit + '12',
  },
  {
    id: 'live',
    label: 'Live Trade',
    description: 'Real trading with actual capital',
    subtext: 'Execute real orders on the exchange through your broker. Uses real money.',
    icon: Zap,
    color: theme.colors.loss,
    bgColor: theme.colors.loss + '08',
    borderColor: theme.colors.loss + '30',
    hoverBg: theme.colors.loss + '12',
    warning: 'Real money at risk. Ensure strategies are tested in paper mode first.',
  },
];

/* ─────────────────────────────────────────────
   Component Props
   ───────────────────────────────────────────── */

interface StartEngineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (mode: EngineMode, brokerId: string) => void;
  isStarting?: boolean;
}

/* ─────────────────────────────────────────────
   Step Indicator
   ───────────────────────────────────────────── */

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={cn(
              'h-1.5 w-6 rounded-full transition-colors duration-300',
              i < current
                ? 'bg-ub-accent'
                : i === current
                  ? 'bg-ub-accent/50'
                  : 'bg-ub-border',
            )}
          />
          {i < total - 1 && (
            <div
              className={cn(
                'h-px w-4 transition-colors duration-300',
                i < current ? 'bg-ub-accent/30' : 'bg-ub-border',
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Broker Card
   ───────────────────────────────────────────── */

function BrokerCard({ broker, selected, isLive, onSelect }: {
  broker: BrokerOption;
  selected: boolean;
  isLive: boolean;
  onSelect: () => void;
}) {
  const activeColor = isLive ? theme.colors.loss : theme.colors.profit;
  const color = selected ? activeColor : theme.colors.textMuted;
  const accentBg = selected ? activeColor + '08' : 'transparent';
  const accentBorder = selected ? activeColor + '40' : theme.colors.border;

  return (
    <button
      onClick={onSelect}
      className="flex items-start gap-3 w-full rounded-lg p-3 text-left transition-all duration-150 border"
      style={{
        borderColor: accentBorder,
        backgroundColor: accentBg,
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.backgroundColor = theme.colors.surfaceActive;
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {/* Logo */}
      <div
        className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm"
        style={{
          backgroundColor: selected ? activeColor + '15' : theme.colors.surfaceActive,
          color,
          border: selected ? '1px solid ' + activeColor + '30' : '1px solid ' + theme.colors.border,
        }}
      >
        {broker.logo}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: selected ? theme.colors.textPrimary : theme.colors.textMuted }}>
            {broker.name}
          </span>
          {broker.connected && (
            <Badge className="text-[9px] px-1.5 py-0 bg-ub-profit/10 text-ub-profit border-ub-profit/20 font-medium">
              Ready
            </Badge>
          )}
          {!broker.connected && isLive && (
            <Badge className="text-[9px] px-1.5 py-0 bg-ub-warning/10 text-ub-warning border-ub-warning/20 font-medium">
              Setup needed
            </Badge>
          )}
        </div>
        <p className="text-[11px] mt-0.5 leading-tight" style={{ color: theme.colors.textDisabled }}>
          {broker.description}
        </p>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {broker.features.slice(0, 3).map((f) => (
            <span
              key={f}
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: theme.colors.surfaceActive, color: theme.colors.textDisabled }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Selection indicator */}
      <div className="shrink-0 mt-1">
        {selected ? (
          <CheckCircle2 size={18} style={{ color }} />
        ) : (
          <div
            className="h-[18px] w-[18px] rounded-full border-2"
            style={{ borderColor: theme.colors.border }}
          />
        )}
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────
   HR helper
   ───────────────────────────────────────────── */

function Hr() {
   return <div style={{ height: 1, backgroundColor: theme.colors.border }} />;
}

function Vr() {
   return <div className="h-3 w-px" style={{ backgroundColor: theme.colors.border }} />;
}

/* ─────────────────────────────────────────────
   Main Dialog
   ───────────────────────────────────────────── */

export default function StartEngineDialog({ open, onOpenChange, onStart, isStarting }: StartEngineDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedMode, setSelectedMode] = useState<EngineMode | null>(null);
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);

  const isLive = selectedMode === 'live';
  const modeConfig = MODES.find((m) => m.id === selectedMode);
  const brokers = isLive ? BROKERS : [PAPER_BROKER, ...BROKERS];
  const canStart = selectedMode !== null && selectedBroker !== null;

  const handleStart = () => {
    if (selectedMode && selectedBroker) {
      onStart(selectedMode, selectedBroker);
    }
  };

  const handleBack = () => {
    setStep(1);
    setSelectedBroker(null);
  };

  const resetAndClose = (v: boolean) => {
    if (!v) {
      setStep(1);
      setSelectedMode(null);
      setSelectedBroker(null);
    }
    onOpenChange(v);
  };

  const handleSelectMode = (mode: EngineMode) => {
    setSelectedMode(mode);
    setSelectedBroker(null);
    setStep(2);
  };

  const headerTitle = step === 1 ? 'Start Trading Engine' : 'Select Broker';
  const headerDesc = step === 1
    ? 'Choose your trading mode to get started'
    : 'Select a broker for ' + (selectedMode === 'live' ? 'live' : 'paper') + ' trading';

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent
        className="sm:max-w-[520px] p-0 gap-0 overflow-hidden"
        style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold" style={{ color: theme.colors.textPrimary }}>
                {headerTitle}
              </DialogTitle>
              <DialogDescription className="text-xs mt-1" style={{ color: theme.colors.textDisabled }}>
                {headerDesc}
              </DialogDescription>
            </div>
            <StepIndicator current={step} total={2} />
          </div>
        </div>

        <Hr />

        {/* Step 1: Mode Selection */}
        {step === 1 && (
          <div className="px-6 py-5 space-y-3">
            {MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = selectedMode === mode.id;

              return (
                <button
                  key={mode.id}
                  onClick={() => handleSelectMode(mode.id)}
                  className="flex items-start gap-4 w-full rounded-lg p-4 text-left transition-all duration-150 border"
                  style={{
                    borderColor: isSelected ? mode.borderColor : theme.colors.border,
                    backgroundColor: isSelected ? mode.bgColor : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = mode.hoverBg;
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Icon */}
                  <div
                    className="h-11 w-11 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: isSelected ? mode.color + '15' : theme.colors.surfaceActive }}
                  >
                    <Icon size={22} style={{ color: isSelected ? mode.color : theme.colors.textMuted }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: isSelected ? mode.color : theme.colors.textPrimary }}>
                        {mode.label}
                      </span>
                      {mode.id === 'live' && (
                        <Badge className="text-[9px] px-1.5 py-0 bg-ub-loss/10 text-ub-loss border-ub-loss/20 font-semibold">
                          Real Money
                        </Badge>
                      )}
                      {mode.id === 'paper' && (
                        <Badge className="text-[9px] px-1.5 py-0 bg-ub-profit/10 text-ub-profit border-ub-profit/20 font-semibold">
                          No Risk
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs mt-0.5 font-medium" style={{ color: theme.colors.textMuted }}>
                      {mode.description}
                    </p>
                    <p className="text-[11px] mt-1 leading-relaxed" style={{ color: theme.colors.textDisabled }}>
                      {mode.subtext}
                    </p>

                    {mode.warning && (
                      <div
                        className="flex items-start gap-2 mt-2 px-2.5 py-2 rounded-md"
                        style={{ backgroundColor: theme.colors.loss + '08', border: '1px solid ' + theme.colors.loss + '15' }}
                      >
                        <AlertTriangle size={13} className="shrink-0 mt-0.5" style={{ color: theme.colors.warning }} />
                        <p className="text-[11px] leading-relaxed" style={{ color: theme.colors.warning }}>
                          {mode.warning}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <ChevronRight size={18} className="shrink-0 mt-1" style={{ color: theme.colors.textDisabled }} />
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: Broker Selection */}
        {step === 2 && modeConfig && (
          <div className="px-6 py-5">
            {/* Back + mode badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 text-xs font-medium transition-colors"
                  style={{ color: theme.colors.textMuted }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = theme.colors.textPrimary; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = theme.colors.textMuted; }}
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
                <Vr />
                <Badge
                  className="text-[10px] font-semibold"
                  style={{ backgroundColor: modeConfig.bgColor, color: modeConfig.color, border: '1px solid ' + modeConfig.borderColor }}
                >
                  {selectedMode === 'live' ? 'Live Trade' : 'Paper Trade'}
                </Badge>
              </div>
            </div>

            {/* Info bar */}
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-md mb-4"
              style={{
                backgroundColor: isLive ? theme.colors.loss + '08' : theme.colors.profit + '08',
                border: '1px solid ' + (isLive ? theme.colors.loss : theme.colors.profit) + '15',
              }}
            >
              <Info size={14} style={{ color: isLive ? theme.colors.warning : theme.colors.profit }} />
              <p className="text-[11px]" style={{ color: theme.colors.textMuted }}>
                <span style={{ color: theme.colors.textPrimary }} className="font-semibold">
                  {isLive ? 'Live mode' : 'Paper mode'}
                </span>
                {' — '}
                {isLive
                  ? 'Orders will be placed with real money on the exchange. Ensure broker API credentials are configured in Settings.'
                  : 'Trades use virtual money. Select a broker for real market data, or use Paper Broker for simulated data.'}
              </p>
            </div>

            {/* Broker list */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {brokers.map((broker) => (
                <BrokerCard
                  key={broker.id}
                  broker={broker}
                  selected={selectedBroker === broker.id}
                  isLive={isLive}
                  onSelect={() => setSelectedBroker(broker.id)}
                />
              ))}
            </div>
          </div>
        )}

        <Hr />

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px]" style={{ color: theme.colors.textDisabled }}>
            {step === 2 && selectedBroker && modeConfig && (
              <>
                <Wallet size={13} />
                <span>
                  {modeConfig.label} via{' '}
                  <span style={{ color: theme.colors.textPrimary }} className="font-medium">
                    {brokers.find((b) => b.id === selectedBroker)?.name}
                  </span>
                </span>
              </>
            )}
          </div>

          <Button
            onClick={step === 2 ? handleStart : () => setStep(2)}
            disabled={step === 2 ? (!canStart || isStarting) : false}
            className="h-9 px-5 text-xs font-semibold transition-all duration-200"
            style={{
              backgroundColor: step === 2 && modeConfig
                ? canStart ? modeConfig.color : theme.colors.textDisabled + '30'
                : theme.colors.accent,
              color: (step === 2 && modeConfig && canStart) || step === 1 ? theme.colors.background : theme.colors.textDisabled,
              opacity: isStarting ? 0.7 : 1,
            }}
          >
            {isStarting ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Starting...
              </span>
            ) : step === 2 ? (
              <span className="flex items-center gap-2">
                <Radio size={14} />
                Start Engine
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Continue
                <ChevronRight size={14} />
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
