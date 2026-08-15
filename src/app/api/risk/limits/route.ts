import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let cachedRiskLimits = {
  max_open_positions: 5,
  max_daily_trades: 15,
  max_daily_loss_pct: 2.0,
  max_consecutive_losses: 3,
  cooloff_minutes: 30,
  max_drawdown_pct: 5.0,
  vix_high_threshold: 22.0,
  min_signal_confidence: 0.75,
  max_sector_concentration_pct: 20,
  max_position_size_pct: 10,
};

export async function GET() {
  return NextResponse.json({
    success: true,
    data: cachedRiskLimits,
  });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (body && typeof body === 'object') {
      cachedRiskLimits = {
        ...cachedRiskLimits,
        ...body,
      };
    }
    return NextResponse.json({
      success: true,
      message: 'Risk limits updated successfully',
      data: cachedRiskLimits,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update risk limits' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return PUT(request);
}
