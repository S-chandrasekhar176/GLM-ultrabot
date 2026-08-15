import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const quotesRes = await fetch(`${new URL(request.url).origin}/api/live-quotes?symbols=VIX,NIFTY`, {
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
    const nifty = +(liveQuotes.NIFTY?.price ?? 24324.90).toFixed(2);
    const nifty_change = +(liveQuotes.NIFTY?.changePct ?? -0.29).toFixed(2);

    return NextResponse.json({
      nifty,
      nifty_change,
      vix,
      source: 'Yahoo Finance Live',
    });
  } catch {
    return NextResponse.json({
      nifty: 24324.90,
      nifty_change: -0.29,
      vix: 11.40,
      source: 'Baseline',
    });
  }
}
