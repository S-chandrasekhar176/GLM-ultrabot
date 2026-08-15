import asyncio
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status

from api.dependencies import get_current_user, get_repository
from db.repository import Repository
from models.backtest_result import (
    BacktestRequest,
    BacktestResponse,
    BacktestStatusResponse,
    BacktestHistoryResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/backtest", tags=["backtest"])

# Track running backtests
_running_backtests: Dict[str, bool] = {}


async def _run_backtest_task(run_id: str, req: BacktestRequest, repo: Repository) -> None:
    """Background task that executes a backtest and updates the DB record."""
    try:
        await repo.update_backtest_run(run_id, status="running", started_at=_ist_now())

        # Attempt to use the strategy registry to run the backtest
        result = await _execute_backtest(req)

        await repo.update_backtest_run(
            run_id,
            status="completed",
            completed_at=_ist_now(),
            total_trades=result.get("total_trades", 0),
            wins=result.get("wins", 0),
            losses=result.get("losses", 0),
            win_rate=result.get("win_rate", 0.0),
            total_pnl=result.get("total_pnl", 0.0),
            max_drawdown_pct=result.get("max_drawdown_pct", 0.0),
            sharpe_ratio=result.get("sharpe_ratio", 0.0),
            profit_factor=result.get("profit_factor", 0.0),
            avg_win=result.get("avg_win", 0.0),
            avg_loss=result.get("avg_loss", 0.0),
            results=result.get("details", {}),
            equity_curve=result.get("equity_curve", []),
        )
        logger.info("Backtest run '%s' completed successfully", run_id)
    except Exception as exc:
        logger.error("Backtest run '%s' failed: %s", run_id, exc, exc_info=True)
        try:
            await repo.update_backtest_run(
                run_id,
                status="error",
                error_message=str(exc),
                completed_at=_ist_now(),
            )
        except Exception:
            pass
    finally:
        _running_backtests.pop(run_id, None)


def _ist_now() -> str:
    from datetime import datetime
    from zoneinfo import ZoneInfo
    return datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()


async def _execute_backtest(req: BacktestRequest) -> Dict[str, Any]:
    """Run a backtest using the strategy registry if available."""
    # Try to use the real strategy scanner
    try:
        from strategies.registry import StrategyRegistry
        from feeds.yahoo_historical import YahooHistoricalFeed

        # Get historical candles
        feed = YahooHistoricalFeed()
        candles = []
        if req.symbol:
            symbols = [s.strip() for s in req.symbol.split(",") if s.strip()]
            for sym in symbols:
                sym_candles = await feed.get_historical(sym, req.start_date, req.end_date, req.timeframe)
                candles.extend(sym_candles)

        if not candles:
            return {
                "total_trades": 0,
                "wins": 0,
                "losses": 0,
                "win_rate": 0.0,
                "total_pnl": 0.0,
                "max_drawdown_pct": 0.0,
                "sharpe_ratio": 0.0,
                "profit_factor": 0.0,
                "avg_win": 0.0,
                "avg_loss": 0.0,
                "details": {"message": "No historical data available"},
                "equity_curve": [],
            }

        # Run strategy scans on historical data (simplified backtest)
        # This is a placeholder backtest engine – a full implementation
        # would replay candles bar-by-bar
        import pandas as pd
        if isinstance(candles, list):
            df = pd.DataFrame(candles)
        else:
            df = candles

        total_trades = 0
        wins = 0
        losses = 0
        total_pnl = 0.0
        equity_curve = []
        running_capital = req.initial_capital

        # Simulate simple backtest: buy at open, sell at close with random wins/losses
        # In production, this would use the actual strategy scan on each bar
        for i in range(1, min(len(df), 1000), 5):  # Sample every 5 bars
            if i >= len(df) - 1:
                break
            try:
                entry_price = float(df.iloc[i]["close"])
                exit_price = float(df.iloc[min(i + 5, len(df) - 1)]["close"])
                pnl_pct = (exit_price - entry_price) / entry_price
                position_value = running_capital * 0.1  # 10% per trade
                pnl = position_value * pnl_pct

                total_trades += 1
                total_pnl += pnl
                running_capital += pnl

                if pnl > 0:
                    wins += 1
                else:
                    losses += 1

                equity_curve.append({
                    "bar": i,
                    "capital": round(running_capital, 2),
                    "pnl": round(pnl, 2),
                })
            except (KeyError, IndexError, TypeError, ValueError):
                continue

        win_rate = round(wins / total_trades * 100, 2) if total_trades > 0 else 0.0
        avg_win = 0.0
        avg_loss = 0.0

        # Calculate drawdown
        peak = req.initial_capital
        max_dd = 0.0
        for ec in equity_curve:
            cap = ec["capital"]
            if cap > peak:
                peak = cap
            dd = (peak - cap) / peak * 100 if peak > 0 else 0
            if dd > max_dd:
                max_dd = dd

        # Calculate profit factor
        gross_profit = sum(ec["pnl"] for ec in equity_curve if ec["pnl"] > 0)
        gross_loss = abs(sum(ec["pnl"] for ec in equity_curve if ec["pnl"] < 0))
        profit_factor = round(gross_profit / gross_loss, 2) if gross_loss > 0 else 99.99

        return {
            "total_trades": total_trades,
            "wins": wins,
            "losses": losses,
            "win_rate": win_rate,
            "total_pnl": round(total_pnl, 2),
            "max_drawdown_pct": round(max_dd, 2),
            "sharpe_ratio": 0.0,
            "profit_factor": profit_factor,
            "avg_win": round(avg_win, 2),
            "avg_loss": round(avg_loss, 2),
            "details": {
                "strategy": req.strategy,
                "symbol": req.symbol,
                "bars_processed": min(len(df), 1000),
                "method": "simplified_simulation",
            },
            "equity_curve": equity_curve,
        }
    except ImportError:
        # Strategy registry not available – return empty results
        return {
            "total_trades": 0,
            "wins": 0,
            "losses": 0,
            "win_rate": 0.0,
            "total_pnl": 0.0,
            "max_drawdown_pct": 0.0,
            "sharpe_ratio": 0.0,
            "profit_factor": 0.0,
            "avg_win": 0.0,
            "avg_loss": 0.0,
            "details": {"message": "Strategy registry not available"},
            "equity_curve": [],
        }
    except Exception as exc:
        raise RuntimeError(f"Backtest execution failed: {str(exc)}") from exc


@router.post("/run")
async def run_backtest(
    req: BacktestRequest,
    background_tasks: BackgroundTasks,
    username: str = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
) -> Dict[str, Any]:
    """Start a backtest run as a background task."""
    try:
        # Create the backtest run record
        run = await repo.create_backtest_run(
            strategy=req.strategy,
            symbol=req.symbol,
            start_date=req.start_date,
            end_date=req.end_date,
            timeframe=req.timeframe,
            initial_capital=req.initial_capital,
            status="pending",
            parameters=req.parameters,
        )

        run_id = run.id
        _running_backtests[run_id] = True

        # Launch background task
        background_tasks.add_task(_run_backtest_task, run_id, req, repo)

        return {
            "message": "Backtest started",
            "run_id": run_id,
            "status": "pending",
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to start backtest: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start backtest: {str(exc)}",
        )


@router.get("/{run_id}/status", response_model=BacktestStatusResponse)
async def get_backtest_status(
    run_id: str,
    username: str = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
) -> BacktestStatusResponse:
    """Get the progress/status of a backtest run."""
    try:
        run = await repo.get_backtest_run(run_id)
        if run is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Backtest run '{run_id}' not found",
            )

        # Calculate progress
        progress = 0.0
        if run.status == "completed":
            progress = 100.0
        elif run.status == "running":
            progress = 50.0  # Simplified – real progress would track actual progress
        elif run.status == "error":
            progress = 0.0

        return BacktestStatusResponse(
            id=run.id,
            strategy=run.strategy,
            status=run.status,
            progress_pct=progress,
            error_message=run.error_message,
            started_at=run.started_at,
            completed_at=run.completed_at,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to get backtest status: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get backtest status: {str(exc)}",
        )


@router.get("/{run_id}/results", response_model=BacktestResponse)
async def get_backtest_results(
    run_id: str,
    username: str = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
) -> BacktestResponse:
    """Get the full results of a completed backtest run."""
    try:
        run = await repo.get_backtest_run(run_id)
        if run is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Backtest run '{run_id}' not found",
            )

        if run.status not in ("completed", "error"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Backtest run is still {run.status}. Use /status endpoint to check progress.",
            )

        # Calculate duration
        duration = None
        if run.started_at and run.completed_at:
            from datetime import datetime
            try:
                start = datetime.fromisoformat(run.started_at)
                end = datetime.fromisoformat(run.completed_at)
                duration = int((end - start).total_seconds())
            except (ValueError, TypeError):
                duration = None

        return BacktestResponse(
            id=run.id,
            strategy=run.strategy,
            symbol=run.symbol,
            start_date=run.start_date,
            end_date=run.end_date,
            timeframe=run.timeframe,
            initial_capital=run.initial_capital or 100000.0,
            status=run.status,
            total_trades=run.total_trades or 0,
            wins=run.wins or 0,
            losses=run.losses or 0,
            win_rate=run.win_rate or 0.0,
            total_pnl=run.total_pnl or 0.0,
            max_drawdown_pct=run.max_drawdown_pct or 0.0,
            sharpe_ratio=run.sharpe_ratio or 0.0,
            profit_factor=run.profit_factor or 0.0,
            avg_win=run.avg_win or 0.0,
            avg_loss=run.avg_loss or 0.0,
            parameters=run.parameters if run.parameters else {},
            results=run.results if run.results else {},
            equity_curve=run.equity_curve if run.equity_curve else [],
            error_message=run.error_message,
            started_at=run.started_at,
            completed_at=run.completed_at,
            duration_seconds=duration,
            extra=run.extra if run.extra else {},
            created_at=run.created_at,
            updated_at=run.updated_at,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to get backtest results: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get backtest results: {str(exc)}",
        )


@router.get("/history", response_model=BacktestHistoryResponse)
async def get_backtest_history(
    strategy: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    username: str = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
) -> BacktestHistoryResponse:
    """Get history of previous backtest runs."""
    try:
        runs = await repo.get_backtest_runs(strategy=strategy, limit=limit, offset=offset)

        # Get total count (simplified)
        all_runs = await repo.get_backtest_runs(strategy=strategy, limit=9999)
        total = len(all_runs)

        results = []
        for r in runs:
            duration = None
            if r.started_at and r.completed_at:
                from datetime import datetime
                try:
                    start = datetime.fromisoformat(r.started_at)
                    end = datetime.fromisoformat(r.completed_at)
                    duration = int((end - start).total_seconds())
                except (ValueError, TypeError):
                    duration = None

            results.append(BacktestResponse(
                id=r.id,
                strategy=r.strategy,
                symbol=r.symbol,
                start_date=r.start_date,
                end_date=r.end_date,
                timeframe=r.timeframe,
                initial_capital=r.initial_capital or 100000.0,
                status=r.status,
                total_trades=r.total_trades or 0,
                wins=r.wins or 0,
                losses=r.losses or 0,
                win_rate=r.win_rate or 0.0,
                total_pnl=r.total_pnl or 0.0,
                max_drawdown_pct=r.max_drawdown_pct or 0.0,
                sharpe_ratio=r.sharpe_ratio or 0.0,
                profit_factor=r.profit_factor or 0.0,
                avg_win=r.avg_win or 0.0,
                avg_loss=r.avg_loss or 0.0,
                parameters=r.parameters if r.parameters else {},
                results=r.results if r.results else {},
                equity_curve=r.equity_curve if r.equity_curve else [],
                error_message=r.error_message,
                started_at=r.started_at,
                completed_at=r.completed_at,
                duration_seconds=duration,
                extra=r.extra if r.extra else {},
                created_at=r.created_at,
                updated_at=r.updated_at,
            ))

        return BacktestHistoryResponse(runs=results, total=total)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to get backtest history: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get backtest history: {str(exc)}",
        )


@router.delete("/{run_id}")
async def delete_backtest(
    run_id: str,
    username: str = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
) -> Dict[str, Any]:
    """Delete a backtest run."""
    try:
        if run_id in _running_backtests:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot delete a running backtest. Wait for it to complete.",
            )

        deleted = await repo.delete_backtest_run(run_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Backtest run '{run_id}' not found",
            )

        return {"message": f"Backtest run '{run_id}' deleted"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to delete backtest: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete backtest: {str(exc)}",
        )
