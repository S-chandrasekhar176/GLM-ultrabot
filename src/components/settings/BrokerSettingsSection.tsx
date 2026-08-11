'use client';

import { useState, useCallback } from 'react';
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
import { toast } from 'sonner';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  TestTube,
  Trash2,
  Shield,
  Zap,
  Info,
} from 'lucide-react';
import { useStore, BROKER_LIST, BROKER_FIELDS, type BrokerCredentialFields } from '@/lib/store';
import { theme } from '@/styles/theme';

/* ─────────────────────────────────────────────
   Broker Card Component
   ───────────────────────────────────────────── */

function BrokerCredentialCard({ brokerId }: { brokerId: string }) {
  const credentials = useStore((s) => s.brokers.credentials[brokerId] || {});
  const saveCreds = useStore((s) => s.brokers.saveBrokerCredentials);
  const clearCreds = useStore((s) => s.brokers.clearBrokerCredentials);

  const brokerMeta = BROKER_LIST.find((b) => b.id === brokerId);
  const fields = BROKER_FIELDS[brokerId] || [];
  const isConfigured = useStore((s) => s.brokers.isBrokerConfigured(brokerId));
  const needsCreds = brokerMeta?.needsCredentials ?? true;

  const [localCreds, setLocalCreds] = useState<BrokerCredentialFields>(credentials);
  const [testing, setTesting] = useState(false);
  const hasChanges = JSON.stringify(localCreds) !== JSON.stringify(credentials);

  const handleSave = useCallback(() => {
    saveCreds(brokerId, localCreds);
    toast.success(`${brokerMeta?.name || brokerId} credentials saved`);
  }, [brokerId, localCreds, saveCreds, brokerMeta?.name]);

  const handleClear = useCallback(() => {
    clearCreds(brokerId);
    setLocalCreds({});
    toast.success(`${brokerMeta?.name || brokerId} credentials cleared`);
  }, [brokerId, clearCreds, brokerMeta?.name]);

  const handleTest = useCallback(() => {
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      toast.success(`${brokerMeta?.name} connection test successful (demo)`);
    }, 1500);
  }, [brokerMeta?.name]);

  const updateField = (key: string, value: string) => {
    setLocalCreds((prev) => ({ ...prev, [key]: value }));
  };

  // No credentials needed (Paper Broker / Yahoo Finance)
  if (!needsCreds) {
    return (
      <Card className="bg-ub-surface border-ub-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center font-bold text-sm"
                style={{ backgroundColor: theme.colors.profit + '15', color: theme.colors.profit, border: '1px solid ' + theme.colors.profit + '30' }}
              >
                {brokerMeta?.name?.[0] || '?'}
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-ub-text-primary">
                  {brokerMeta?.name || brokerId}
                </CardTitle>
                <p className="text-[11px] text-ub-text-disabled mt-0.5">
                  {brokerId === 'paper'
                    ? 'Built-in simulator — no configuration needed. Uses virtual money with simulated or real data.'
                    : 'Free market data from Yahoo Finance. No API key required.'}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="border-ub-profit/40 text-ub-profit bg-ub-profit/10 text-[10px] font-semibold"
            >
              <CheckCircle2 size={11} className="mr-1" />
              Always Ready
            </Badge>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-ub-surface border-ub-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center font-bold text-sm"
              style={{
                backgroundColor: isConfigured ? theme.colors.profit + '15' : theme.colors.surfaceActive,
                color: isConfigured ? theme.colors.profit : theme.colors.textMuted,
                border: '1px solid ' + (isConfigured ? theme.colors.profit + '30' : theme.colors.border),
              }}
            >
              {brokerMeta?.name?.[0] || '?'}
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-ub-text-primary">
                {brokerMeta?.name || brokerId}
              </CardTitle>
              <p className="text-[11px] text-ub-text-disabled mt-0.5">
                Fill in your API credentials below. They are saved locally on your device.
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold ${
              isConfigured
                ? 'border-ub-profit/40 text-ub-profit bg-ub-profit/10'
                : 'border-ub-text-disabled/40 text-ub-text-disabled bg-ub-text-disabled/10'
            }`}
          >
            {isConfigured ? (
              <><CheckCircle2 size={11} className="mr-1" /> Configured</>
            ) : (
              <><XCircle size={11} className="mr-1" /> Not Configured</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label className="text-ub-text-muted text-sm">{field.label}</Label>
              <Input
                type={field.type || 'text'}
                value={localCreds[field.key] || ''}
                onChange={(e) => updateField(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="bg-ub-background border-ub-border text-ub-text-primary"
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Button
            onClick={handleClear}
            variant="ghost"
            className="text-ub-text-disabled hover:text-ub-loss hover:bg-ub-loss/10 text-xs"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Clear
          </Button>
          <div className="flex gap-2">
            <Button
              onClick={handleTest}
              disabled={testing || !isConfigured}
              variant="outline"
              className="border-ub-accent/40 text-ub-accent hover:bg-ub-accent/10 hover:text-ub-accent text-xs"
            >
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <TestTube className="h-3.5 w-3.5 mr-1.5" />}
              Test
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
              className="bg-ub-accent hover:bg-ub-accent-hover text-ub-background font-semibold text-xs"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────
   Main Section
   ───────────────────────────────────────────── */

export default function BrokerSettingsSection() {
  const paperBrokers = BROKER_LIST.filter((b) => b.category === 'paper');
  const liveBrokers = BROKER_LIST.filter((b) => b.category === 'live');

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div
        className="flex items-start gap-3 px-4 py-3 rounded-lg"
        style={{ backgroundColor: theme.colors.info + '08', border: '1px solid ' + theme.colors.info + '20' }}
      >
        <Info size={16} className="shrink-0 mt-0.5" style={{ color: theme.colors.info }} />
        <div>
          <p className="text-xs font-semibold" style={{ color: theme.colors.textPrimary }}>
            Broker Credentials
          </p>
          <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: theme.colors.textMuted }}>
            Your API credentials are stored locally on your device (encrypted in production). Configure at least one broker to use with the trading engine. Paper Broker and Yahoo Finance work without any credentials.
          </p>
        </div>
      </div>

      {/* Paper Mode Data Sources */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield size={15} style={{ color: theme.colors.profit }} />
          <h3 className="text-sm font-semibold text-ub-text-primary">Paper Trade Data Sources</h3>
          <Badge className="text-[9px] px-1.5 py-0 bg-ub-profit/10 text-ub-profit border-ub-profit/20 font-medium">
            No credentials needed
          </Badge>
        </div>
        <div className="space-y-3">
          {paperBrokers.map((b) => (
            <BrokerCredentialCard key={b.id} brokerId={b.id} />
          ))}
        </div>
      </div>

      <Separator className="bg-ub-border" />

      {/* Live Brokers */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap size={15} style={{ color: theme.colors.loss }} />
          <h3 className="text-sm font-semibold text-ub-text-primary">Live Trade Brokers</h3>
          <Badge className="text-[9px] px-1.5 py-0 bg-ub-loss/10 text-ub-loss border-ub-loss/20 font-medium">
            Credentials required
          </Badge>
        </div>
        <div className="space-y-3">
          {liveBrokers.map((b) => (
            <BrokerCredentialCard key={b.id} brokerId={b.id} />
          ))}
        </div>
      </div>
    </div>
  );
}