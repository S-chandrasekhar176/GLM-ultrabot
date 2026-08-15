import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from api.dependencies import get_current_user, get_engine, get_repository
from db.repository import Repository
from core.engine import UltraBotEngine
from scanner.kronos.kronos_scanner import KronosScanner

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scanner", tags=["scanner"])

kronos_scanner = KronosScanner()

@router.get("/kronos")
async def get_kronos_hotlist(
    username: str = Depends(get_current_user),
    engine: Optional[UltraBotEngine] = Depends(get_engine),
    repo: Repository = Depends(get_repository),
) -> List[Dict[str, Any]]:
    """Get the Kronos AI hotlist ranking."""
    try:
        # Fetch active watchlist symbols
        active_items = await repo.get_active_watchlist()
        symbols = [item.symbol for item in active_items]
        
        if not symbols:
            # Fallback to top F&O symbols if watchlist empty
            symbols = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN", "BHARTIARTL", "ITC"]

        # Fetch market data from engine or construct default data structure
        market_data: Dict[str, Dict[str, Any]] = {}
        
        PRICE_MAP = {
            "RELIANCE": 1380.40,
            "TATAMOTORS": 978.50,
            "TCS": 4110.00,
            "INFY": 1785.60,
            "HDFCBANK": 1642.10,
            "ICICIBANK": 1198.30,
            "SBIN": 818.20,
            "BHARTIARTL": 1458.00,
            "ITC": 472.10,
            "LT": 3620.00,
            "BAJFINANCE": 6890.00,
            "MARUTI": 12450.00,
            "SUNPHARMA": 1760.00,
            "WIPRO": 560.20,
            "AXISBANK": 1165.00,
            "KOTAKBANK": 1745.00,
        }

        # Fetch market data from engine or construct default data structure
        market_data: Dict[str, Dict[str, Any]] = {}
        
        for sym in symbols:
            ltp = BASELINE_PRICES.get(sym, 1000.0)
            close = round(ltp * 0.99, 2)
            volume = 150000
            avg_vol = 75000
            
            if engine and hasattr(engine, "feed") and engine.feed:
                try:
                    price = await engine.feed.get_latest_price(sym)
                    if price and price > 0:
                        ltp = price
                        close = round(price * 0.99, 2)
                except Exception:
                    pass

            market_data[sym] = {
                "ltp": ltp,
                "close": close,
                "volume": volume,
                "avg_volume": avg_vol,
                "high": round(ltp * 1.015, 2),
                "low": round(ltp * 0.985, 2),
                "open": round(ltp * 0.995, 2),
                "rsi": 62.5,
            }

        # Perform scan
        scored_results = kronos_scanner.scan(
            watchlist_symbols=symbols,
            market_data=market_data,
            news_items=[],
        )

        formatted_results = []
        for rank, res in enumerate(scored_results, start=1):
            sym = res.get("symbol")
            m_data = market_data.get(sym, {})
            ltp = m_data.get("ltp", 0.0)
            close = m_data.get("close", ltp)
            chg_pct = ((ltp - close) / close * 100) if close > 0 else 0.0

            reasons = res.get("reasons", [])
            reason_str = ", ".join(reasons) if reasons else "Multi-factor breakout setup"

            formatted_results.append({
                "rank": rank,
                "symbol": sym,
                "price": round(ltp, 2),
                "changePct": round(chg_pct, 2),
                "volume": f"{m_data.get('volume', 0) // 1000}K",
                "hotness": round(res.get("score", 0.7), 2),
                "reason": reason_str,
            })

        return formatted_results

    except Exception as exc:
        logger.error("Failed to fetch Kronos hotlist: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch Kronos hotlist: {str(exc)}",
        )
