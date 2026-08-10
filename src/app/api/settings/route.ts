import { NextRequest, NextResponse } from 'next/server';

// GET /api/settings — get current settings
export async function GET() {
  return NextResponse.json({
    tradingMode: 'paper',
    brokers: {
      angelOne: { status: 'Disconnected' },
      shoonya: { status: 'Disconnected' },
    },
    risk: {
      maxOpenPositions: 5,
      maxPerSector: 2,
      maxDailyTrades: 20,
      maxDailyLossPct: 3,
      maxConsecutiveLosses: 4,
      coolOffMinutes: 30,
      maxDrawdownPct: 10,
    },
    notifications: {
      telegramEnabled: true,
      alertTypes: ['trade_executed', 'partial_booking', 'stop_loss', 'target_hit'],
    },
    capital: {
      virtualCapital: 500000,
      maxCapitalUsagePct: 80,
      perPositionMaxPct: 20,
    },
    general: {
      scanIntervalSeconds: 30,
      autoStartEngine: true,
      autoSquareoffTime: '15:15',
    },
  });
}

// PUT /api/settings — update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({ success: true, updated: body });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
