import { NextResponse } from 'next/server';

// GET /api/backtest — get backtest results or history
export async function GET() {
  return NextResponse.json({
    results: [],
    history: [],
  });
}
