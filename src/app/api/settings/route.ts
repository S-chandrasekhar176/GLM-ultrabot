import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Global settings cache
let cachedSettings: Record<string, any> = {
  app_name: 'GLM UltraBot',
  version: '1.0.0',
  config: {
    capital: {
      virtual_capital: 1000000,
      max_capital_usage_pct: 75,
      min_position_size: 5000,
      max_per_position_pct: 10,
    },
    engine: {
      scan_interval_seconds: 60,
      auto_start: true,
      auto_squareoff_time: '15:15',
    },
    market: {
      nse_open: '09:15',
      nse_close: '15:30',
      pre_market_start: '09:00',
      post_market_end: '16:00',
    },
    notifications: {
      telegram_bot_token: '',
      telegram_chat_id: '',
      morning_briefing_time: '08:45',
      eod_report_time: '16:00',
    },
    risk: {
      max_open_positions: 5,
      max_daily_trades: 15,
      max_daily_loss_pct: 2.0,
      max_consecutive_losses: 3,
      cooloff_minutes: 30,
      max_drawdown_pct: 5.0,
      vix_high_threshold: 22.0,
      min_signal_confidence: 0.75,
    },
  },
};

export async function GET() {
  return NextResponse.json({
    success: true,
    ...cachedSettings,
  });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (body) {
      if (body.capital) {
        cachedSettings.config.capital = {
          ...cachedSettings.config.capital,
          ...body.capital,
        };
      }
      if (body.engine) {
        cachedSettings.config.engine = {
          ...cachedSettings.config.engine,
          ...body.engine,
        };
      }
      if (body.market) {
        cachedSettings.config.market = {
          ...cachedSettings.config.market,
          ...body.market,
        };
      }
      if (body.notifications) {
        cachedSettings.config.notifications = {
          ...cachedSettings.config.notifications,
          ...body.notifications,
        };
      }
      if (body.risk) {
        cachedSettings.config.risk = {
          ...cachedSettings.config.risk,
          ...body.risk,
        };
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      config: cachedSettings.config,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return PUT(request);
}
