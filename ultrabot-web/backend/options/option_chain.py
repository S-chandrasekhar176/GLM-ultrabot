"""Option chain fetcher using yfinance.

Retrieves option chain data for NSE stocks/indexes.
"""
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import yfinance as yf

logger = logging.getLogger(__name__)

# NSE suffix for yfinance
_NSE_SUFFIX = ".NS"

# Default expiry look-ahead (days)
_DEFAULT_EXPIRY_LOOKAHEAD = 45


class OptionChainFetcher:
    """Fetch option chain data using yfinance.

    Usage::
        fetcher = OptionChainFetcher()
        chain = await fetcher.fetch_option_chain("RELIANCE", "2025-01-30")
    """

    def __init__(self, proxy: Optional[str] = None):
        self.proxy = proxy

    async def fetch_option_chain(
        self,
        symbol: str,
        expiry_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Fetch the option chain for a given symbol and expiry.

        Args:
            symbol: NSE symbol (e.g. "RELIANCE", "NIFTY").
            expiry_date: Optional expiry date string (YYYY-MM-DD).
                If None, the nearest weekly/monthly expiry is used.

        Returns:
            Dict with keys:
                - symbol: str
                - expiry: str
                - spot_price: float
                - calls: list of call option dicts
                - puts: list of put option dicts
                - atm_strike: float
        """
        ticker_symbol = self._to_ticker(symbol)
        ticker = yf.Ticker(ticker_symbol)

        try:
            # Get current price
            info = ticker.fast_info
            spot_price = float(getattr(info, "lastPrice", 0) or getattr(info, "previousClose", 0))
        except Exception:
            try:
                hist = ticker.history(period="1d")
                spot_price = float(hist["Close"].iloc[-1]) if not hist.empty else 0.0
            except Exception as exc:
                logger.error("Failed to get spot price for %s: %s", symbol, exc)
                return self._empty_chain(symbol, expiry_date or "")

        if spot_price <= 0:
            return self._empty_chain(symbol, expiry_date or "")

        # Resolve expiry
        resolved_expiry = self._resolve_expiry(ticker, expiry_date)
        if not resolved_expiry:
            return self._empty_chain(symbol, expiry_date or "")

        # Fetch option chain
        try:
            opt_chain = ticker.option_chain(resolved_expiry)
        except Exception as exc:
            logger.error("Failed to fetch option chain for %s %s: %s", symbol, resolved_expiry, exc)
            return {
                "symbol": symbol,
                "expiry": resolved_expiry,
                "spot_price": spot_price,
                "calls": [],
                "puts": [],
                "atm_strike": self._round_to_strike(spot_price),
            }

        calls_df = opt_chain.calls
        puts_df = opt_chain.puts

        # Convert DataFrames to list of dicts
        calls = self._df_to_list(calls_df)
        puts = self._df_to_list(puts_df)

        # Compute ATM strike (closest to spot)
        all_strikes = sorted(
            set(float(c.get("strike", 0)) for c in calls) | set(float(p.get("strike", 0)) for p in puts)
        )
        atm_strike = self._find_atm(all_strikes, spot_price)

        return {
            "symbol": symbol,
            "expiry": resolved_expiry,
            "spot_price": spot_price,
            "calls": calls,
            "puts": puts,
            "atm_strike": atm_strike,
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _resolve_expiry(self, ticker, requested_date: Optional[str]) -> Optional[str]:
        """Resolve the expiry date to use."""
        if requested_date:
            return requested_date

        # Get available expiries and pick the nearest
        try:
            expiries = ticker.options
            if not expiries:
                return None

            # Find the nearest expiry within look-ahead window
            cutoff = datetime.now() + timedelta(days=_DEFAULT_EXPIRY_LOOKAHEAD)
            for exp in expiries:
                exp_dt = datetime.strptime(exp, "%Y-%m-%d")
                if exp_dt >= datetime.now() and exp_dt <= cutoff:
                    return exp

            # Fall back to the first available
            return expiries[0] if expiries else None
        except Exception:
            return None

    @staticmethod
    def _find_atm(strikes: List[float], spot: float) -> float:
        """Find the strike closest to the spot price."""
        if not strikes:
            return round(spot, 0)
        return min(strikes, key=lambda s: abs(s - spot))

    @staticmethod
    def _round_to_strike(price: float, step: float = 10.0) -> float:
        """Round a price to the nearest typical strike step."""
        return round(price / step) * step

    @staticmethod
    def _to_ticker(symbol: str) -> str:
        """Convert NSE symbol to yfinance ticker."""
        symbol_upper = symbol.upper()
        if symbol_upper in ("NIFTY", "NIFTY50", "NIFTY 50"):
            return "^NSEI"
        if symbol_upper in ("BANKNIFTY", "BANK NIFTY"):
            return "^NSEBANK"
        return f"{symbol_upper}{_NSE_SUFFIX}"

    @staticmethod
    def _df_to_list(df) -> List[Dict[str, Any]]:
        """Convert a pandas DataFrame to a list of dicts, handling NaN."""
        if df is None or df.empty:
            return []
        result = []
        for _, row in df.iterrows():
            item = {}
            for col in df.columns:
                val = row[col]
                if val != val:  # NaN check
                    item[col] = 0.0
                else:
                    item[col] = val
            result.append(item)
        return result

    @staticmethod
    def _empty_chain(symbol: str, expiry: str) -> Dict[str, Any]:
        return {
            "symbol": symbol,
            "expiry": expiry,
            "spot_price": 0.0,
            "calls": [],
            "puts": [],
            "atm_strike": 0.0,
        }
