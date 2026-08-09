import logging
from datetime import date
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, status

from api.dependencies import get_current_user, get_engine, get_repository
from db.repository import Repository
from core.engine import UltraBotEngine
from config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("")
async def get_dashboard(
    username: str = Depends(get_current_user),
    engine: UltraBotEngine = Depends(get_engine),
    repo: Repository = Depends(get_repository),
) -> Dict:
    """Return aggregated dashboard data.

    If the engine is running, delegates to engine.get_dashboard_data().
    Otherwise, assembles basic data from the repository.
    """
    try:
        # Try to use engine dashboard if running
        if engine is not None and engine.state.value in ("running", "paused"):
            data = await engine.get_dashboard_data()
            return data
    except Exception as exc:
        logger.warning("Engine dashboard failed, falling back to repo: %s", exc)

    # Fallback: build dashboard from repository
    try:
        # Today's P&L
        pnl_data = await repo.get_todays_pnl()

        # Open positions
        open_positions = await repo.get_open_positions()
        positions_data = []
        total_invested = 0.0
        total_unrealized_pnl = 0.0

        for pos in open_positions:
            entry = pos.entry_price or 0
            current = pos.current_price or pos.entry_price or 0
            qty = pos.quantity or 0
            invested = entry * qty
            unrealized = 0.0
            if pos.direction == "LONG":
                unrealized = (current - entry) * qty
            else:
                unrealized = (entry - current) * qty

            positions_data.append({
                "position_id": pos.id,
                "trade_id": pos.trade_id,
                "symbol": pos.symbol,
                "direction": pos.direction,
                "strategy": pos.strategy,
                "entry_price": entry,
                "current_price": current,
                "quantity": qty,
                "invested_amount": round(invested, 2),
                "unrealized_pnl": round(unrealized, 2),
                "unrealized_pnl_pct": round(unrealized / invested * 100, 2) if invested > 0 else 0,
                "stop_loss": pos.stop_loss,
                "target": pos.target,
            })
            total_invested += invested
            total_unrealized_pnl += unrealized

        # Capital
        capital_config = settings.get_capital_config()
        total_capital = capital_config.get("virtual_capital", 100000)
        capital_available = total_capital - total_invested
        capital_usage_pct = round(total_invested / total_capital * 100, 2) if total_capital > 0 else 0

        # Today's trades
        todays_trades = await repo.get_todays_trades()
        trades_data = []
        for t in todays_trades:
            trades_data.append({
                "trade_id": t.id,
                "symbol": t.symbol,
                "direction": t.direction,
                "strategy": t.strategy,
                "entry_price": t.entry_price,
                "exit_price": t.exit_price,
                "quantity": t.quantity,
                "status": t.status,
                "pnl": t.pnl,
                "net_pnl": t.net_pnl,
                "entry_time": t.entry_time,
                "exit_time": t.exit_time,
            })

        # Watchlist count
        watchlist_count = await repo.get_watchlist_count()

        # Risk summary
        risk_summary = {}
        try:
            if engine is not None and hasattr(engine, "daily_risk"):
                risk_status = await engine.daily_risk.get_daily_risk_status()
                if hasattr(risk_status, "model_dump"):
                    risk_summary = risk_status.model_dump()
                elif isinstance(risk_status, dict):
                    risk_summary = risk_status
        except Exception:
            risk_summary = {"can_take_new_trades": True}

        # Engine state
        engine_state = "stopped"
        engine_mode = None
        session_id = None
        if engine is not None:
            engine_state = engine.state.value
            engine_mode = engine.mode
            session_id = engine.session_id

        return {
            "engine": {
                "state": engine_state,
                "mode": engine_mode,
                "session_id": session_id,
                "uptime_seconds": 0,
                "scans_completed": 0,
                "signals_generated": 0,
                "trades_executed": 0,
                "errors_count": 0,
            },
            "market": {"is_market_open": False, "status": "unknown"},
            "regime": engine.current_regime if engine else "Sideways",
            "vix": engine.vix if engine else 15.0,
            "nifty_price": engine.nifty_price if engine else 0.0,
            "active_strategies": engine.active_strategies if engine else [],
            "capital": {
                "total": total_capital,
                "invested": round(total_invested, 2),
                "available": round(capital_available, 2),
                "usage_pct": capital_usage_pct,
                "unrealized_pnl": round(total_unrealized_pnl, 2),
            },
            "daily_pnl": pnl_data,
            "risk": risk_summary,
            "open_positions": positions_data,
            "open_position_count": len(open_positions),
            "todays_trades": trades_data,
            "pending_opportunities": [],
            "pending_opportunity_count": 0,
            "watchlist_count": watchlist_count,
            "timestamp": date.today().isoformat(),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Dashboard endpoint error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load dashboard: {str(exc)}",
        )
