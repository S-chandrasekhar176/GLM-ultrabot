import sys
content = open('src/app/risk/page.tsx', 'r', encoding='utf-8').read()

import_stmt = "import { useRiskStatus, useRiskGates } from '@/hooks/useApi';\n"
if 'useRiskStatus' not in content:
    idx = content.find('import { Card,')
    content = content[:idx] + import_stmt + content[idx:]

# Remove Mock Data section
start_idx = content.find('// ─────────────────────────────────────────────\n// Mock Data\n// ─────────────────────────────────────────────')
end_idx = content.find('// ─────────────────────────────────────────────\n// Helper Functions\n// ─────────────────────────────────────────────', start_idx)
if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]

# Replace state inside RiskDashboardPage
old_init = '''export default function RiskDashboardPage() {
  const overallStatus = getOverallStatus();
  const cooloffActive = overallStatus === 'stopped';
  const { display: countdownDisplay } = useCountdown(847, cooloffActive);'''

new_init = '''export default function RiskDashboardPage() {
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
  const { display: countdownDisplay } = useCountdown(847, cooloffActive);'''

content = content.replace(old_init, new_init)

# Remove the old getOverallStatus logic which was top-level
old_getoverall = '''// ─────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────

function getOverallStatus(): RiskStatus {
  if (RISK_LIMITS.some((l) => l.currentNum >= l.limitNum)) return 'stopped';
  if (RISK_LIMITS.some((l) => l.currentNum >= l.limitNum * 0.8)) return 'caution';
  return 'normal';
}'''

content = content.replace(old_getoverall, '// ─────────────────────────────────────────────\n// Helper Functions\n// ─────────────────────────────────────────────')

open('src/app/risk/page.tsx', 'w', encoding='utf-8').write(content)
print('Updated risk page successfully')
