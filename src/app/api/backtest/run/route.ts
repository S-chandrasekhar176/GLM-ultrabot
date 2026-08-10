import { NextRequest, NextResponse } from 'next/server';

// POST /api/backtest/run — run a backtest
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { strategy, symbols, timeframe, capital } = body;

    if (!strategy || !symbols) {
      return NextResponse.json({ error: 'Strategy and symbols are required' }, { status: 400 });
    }

    // Mock backtest result
    const totalTrades = Math.floor(Math.random() * 80) + 40;
    const winRate = 55 + Math.random() * 20;

    return NextResponse.json({
      id: `bt-${Date.now()}`,
      status: 'completed',
      params: { strategy, symbols, timeframe, capital },
      metrics: {
        totalReturn: Math.round((Math.random() * 30 - 5) * 100) / 100,
        annualizedReturn: Math.round((Math.random() * 40 - 10) * 100) / 100,
        maxDrawdown: Math.round(-(Math.random() * 15 + 5) * 100) / 100,
        sharpe: Math.round((Math.random() * 2 + 0.5) * 100) / 100,
        sortino: Math.round((Math.random() * 2.5 + 0.8) * 100) / 100,
        winRate: Math.round(winRate * 100) / 100,
        profitFactor: Math.round((Math.random() * 1.5 + 0.8) * 100) / 100,
        totalTrades,
        totalFees: Math.round(totalTrades * (Math.random() * 50 + 20)),
        avgTradePnl: Math.round((Math.random() * 2000 - 500)),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
