import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List

from feeds.base import BaseFeed

logger = logging.getLogger(__name__)

# Mapping of candle intervals to yfinance format
_TIMEFRAME_MAP = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "60m",
    "1d": "1d",
    "1w": "1wk",
}

# Yahoo Finance suffix for NSE
_YAHOO_NSE_SUFFIX = ".NS"

# Timeframe duration in minutes for calculating how far back to fetch
_TIMEFRAME_MINUTES = {
    "1m": 1,
    "5m": 5,
    "15m": 15,
    "30m": 30,
    "1h": 60,
    "1d": 1440,
    "1w": 10080,
}


class YahooHistoricalFeed(BaseFeed):
    """Historical data feed using yfinance.

    Fetches OHLCV candle data from Yahoo Finance.
    Not a real-time feed - suitable for historical analysis and as backup.
    """

    def __init__(self):
        self._connected = True  # Yahoo is stateless, always "connected"
        self._cache: Dict[str, Any] = {}

    async def connect(self) -> Dict[str, Any]:
        return {"success": True, "message": "Yahoo feed is stateless, no connection needed"}

    async def disconnect(self) -> Dict[str, Any]:
        self._cache.clear()
        return {"success": True, "message": "Yahoo feed cache cleared"}

    async def subscribe(self, symbols: List[str]) -> Dict[str, Any]:
        return {"success": True, "subscribed": len(symbols), "message": "Yahoo is not real-time, no subscription needed"}

    async def unsubscribe(self, symbols: List[str]) -> Dict[str, Any]:
        return {"success": True, "unsubscribed": len(symbols), "message": "Yahoo is not real-time"}

    async def get_ltp(self, symbol: str) -> float:
        """Return the last close price from recent data."""
        try:
            import yfinance as yf
            yahoo_sym = self._to_yahoo_symbol(symbol)
            ticker = yf.Ticker(yahoo_sym)
            hist = ticker.history(period="1d")
            if hist is not None and len(hist) > 0:
                return round(float(hist["Close"].iloc[-1]), 2)
            return 0.0
        except Exception as e:
            logger.warning("Failed to get LTP for %s from Yahoo: %s", symbol, e)
            return 0.0

    async def get_candles(
        self,
        symbol: str,
        timeframe: str = "5m",
        count: int = 100,
    ) -> List[Dict[str, Any]]:
        """Fetch historical candles from Yahoo Finance.

        Returns list of dicts with timestamp, open, high, low, close, volume.
        """
        try:
            import yfinance as yf

            yahoo_sym = self._to_yahoo_symbol(symbol)
            yf_interval = _TIMEFRAME_MAP.get(timeframe, "5m")
            tf_minutes = _TIMEFRAME_MINUTES.get(timeframe, 5)

            # Calculate period needed
            total_minutes = tf_minutes * count
            if total_minutes <= 1440:
                period = "1d"
            elif total_minutes <= 10080:
                period = "5d"
            elif total_minutes <= 43200:
                period = "1mo"
            elif total_minutes <= 129600:
                period = "3mo"
            else:
                period = "6mo"

            ticker = yf.Ticker(yahoo_sym)
            hist = ticker.history(period=period, interval=yf_interval)

            if hist is None or hist.empty:
                logger.warning("No candle data for %s", symbol)
                return []

            # Take last `count` candles
            hist = hist.tail(count)

            candles = []
            for idx, row in hist.iterrows():
                ts = idx
                if hasattr(ts, "tzinfo") and ts.tzinfo is not None:
                    ts = ts.tz_convert("Asia/Kolkata")
                candles.append({
                    "timestamp": ts.isoformat(),
                    "open": round(float(row["Open"]), 2),
                    "high": round(float(row["High"]), 2),
                    "low": round(float(row["Low"]), 2),
                    "close": round(float(row["Close"]), 2),
                    "volume": int(row["Volume"]),
                })
            return candles
        except Exception as e:
            logger.error("Failed to get candles for %s: %s", symbol, e)
            return []

    def is_connected(self) -> bool:
        return self._connected

    def get_name(self) -> str:
        return "yahoo_historical"

    @staticmethod
    def _to_yahoo_symbol(symbol: str) -> str:
        """Convert NSE symbol to Yahoo Finance format.

        E.g. 'RELIANCE' -> 'RELIANCE.NS'
        """
        if symbol.endswith(".NS"):
            return symbol
        return f"{symbol}{_YAHOO_NSE_SUFFIX}"
