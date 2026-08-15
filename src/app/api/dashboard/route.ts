import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    // Fetch live market quotes for VIX and NIFTY
    const quotesRes = await fetch(`${new URL(request.url).origin}/api/live-quotes?symbols=VIX,NIFTY,BANKNIFTY`, {
      cache: 'no-store',
    });

    let liveQuotes: Record<string, any> = {};
    if (quotesRes.ok) {
      const json = await quotesRes.json();
      if (json.success && json.data) {
        liveQuotes = json.data;
      }
    }

    const vix = +(liveQuotes.VIX?.price ?? liveQuotes.INDIAVIX?.price ?? 11.40).toFixed(2);
    const niftyPrice = +(liveQuotes.NIFTY?.price ?? 24324.90).toFixed(2);
    const niftyChange = +(liveQuotes.NIFTY?.changePct ?? -0.29).toFixed(2);

    // Calculate Market Regime
    let regime: 'bull' | 'bear' | 'sideways' | 'volatile' = 'sideways';
    let regimeConfidence = 78;
    if (vix > 20) {
      regime = 'volatile';
      regimeConfidence = 85;
    } else if (niftyChange > 0.4) {
      regime = 'bull';
      regimeConfidence = 82;
    } else if (niftyChange < -0.4) {
      regime = 'bear';
      regimeConfidence = 80;
    } else {
      regime = 'sideways';
      regimeConfidence = 76;
    }

    // Time to market close
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
    const closeTime = new Date(istTime);
    closeTime.setHours(15, 30, 0, 0);
    const diffSec = Math.max(0, Math.floor((closeTime.getTime() - istTime.getTime()) / 1000));

    return NextResponse.json({
      success: true,
      vix,
      nifty_price: niftyPrice,
      nifty_change: niftyChange,
      regime,
      regime_confidence: regimeConfidence,
      market: {
        status: diffSec > 0 ? 'OPEN' : 'CLOSED',
        time_to_close_seconds: diffSec,
      },
      total_capital: 1000000.0,
      totalCapital: 1000000.0,
      active_strategies: ['VWAP Breakout', 'Mean Reversion', 'Supertrend', 'ORB Volume', 'Momentum'],
      activeStrategies: ['VWAP Breakout', 'Mean Reversion', 'Supertrend', 'ORB Volume', 'Momentum'],
      engine_status: 'running',
      engineStatus: 'running',
      engine_mode: 'paper',
      engineMode: 'paper',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch dashboard data',
        vix: 11.40,
        nifty_price: 24324.90,
        nifty_change: -0.29,
        regime: 'sideways',
        regime_confidence: 78,
        total_capital: 1000000.0,
      },
      { status: 200 }
    );
  }
}
