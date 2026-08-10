"""Select the optimal option strike for a given trade direction.

Uses the spot price and a set of selection rules to pick an ATM or
slightly OTM strike with appropriate lot size.
"""
import logging
from typing import Any, Dict, Optional

from utils.market_utils import get_lot_size, get_stock_info

logger = logging.getLogger(__name__)

# Typical NSE index/stock strike steps
_DEFAULT_STRIKE_STEP = 10.0
_INDEX_STRIKE_STEP = 50.0

# Symbols that use index-style strikes
_INDEX_SYMBOLS = {"NIFTY", "NIFTY50", "NIFTY 50", "BANKNIFTY", "BANK NIFTY", "FINNIFTY"}


class StrikeSelector:
    """Select an option strike for entry.

    Selection logic:
    1. Find the ATM strike closest to the spot.
    2. For LONG: pick ATM or 1-2 strikes OTM (lower premium).
    3. For SHORT: pick ATM or 1-2 strikes OTM.
    4. Adjust based on VIX – higher VIX = pick closer to ATM.
    """

    def __init__(self, lot_size_override: Optional[Dict[str, int]] = None):
        self._lot_size_override = lot_size_override or {}

    def select_strike(
        self,
        symbol: str,
        direction: str,
        entry_price: float,
        sl: float,
        target: float,
        vix: float = 15.0,
    ) -> Dict[str, Any]:
        """Select the optimal strike for a trade.

        Args:
            symbol: NSE symbol (e.g. "RELIANCE").
            direction: "LONG" or "SHORT".
            entry_price: Current spot price of the underlying.
            sl: Stop-loss price on the underlying.
            target: Target price on the underlying.
            vix: India VIX value for volatility adjustment.

        Returns:
            Dict with: strike, option_type, lot_size, strike_step,
            premium_estimate, risk_reward_ratio, selection_reason.
        """
        if entry_price <= 0:
            return self._empty_result(symbol, "Invalid entry price")

        # Determine strike step
        strike_step = self._get_strike_step(symbol)

        # Determine ATM strike
        atm_strike = round(entry_price / strike_step) * strike_step

        # Determine option type based on direction
        direction_upper = direction.upper()
        if direction_upper == "LONG":
            option_type = "CE"
            offset = self._compute_offset(vix, direction_upper)
            selected_strike = atm_strike + offset
        elif direction_upper == "SHORT":
            option_type = "PE"
            offset = self._compute_offset(vix, direction_upper)
            selected_strike = atm_strike - offset
        else:
            return self._empty_result(symbol, f"Unknown direction: {direction}")

        # Lot size
        lot_size = self._get_lot_size(symbol)

        # Premium estimate (approximate: 0.5-2% of spot for ATM options)
        distance_from_atm = abs(selected_strike - atm_strike)
        base_premium = entry_price * 0.012  # ~1.2% of spot for ATM
        otm_penalty = distance_from_atm * 0.002  # ~0.2% per strike step OTM
        vix_multiplier = max(0.8, vix / 15.0)  # Higher VIX = higher premium
        premium_estimate = max(1.0, (base_premium - otm_penalty) * vix_multiplier)
        premium_estimate = round(premium_estimate, 2)

        # Risk-reward ratio
        sl_distance = abs(entry_price - sl) if sl > 0 else 0
        target_distance = abs(target - entry_price) if target > 0 else 0
        risk_reward = round(target_distance / sl_distance, 2) if sl_distance > 0 else 0.0

        # Selection reason
        if abs(selected_strike - atm_strike) < 0.01:
            reason = "ATM strike selected"
        else:
            reason = f"{abs(offset / strike_step):.0f} strike{'s' if abs(offset / strike_step) != 1 else ''} OTM"

        return {
            "strike": selected_strike,
            "option_type": option_type,
            "lot_size": lot_size,
            "strike_step": strike_step,
            "premium_estimate": premium_estimate,
            "risk_reward_ratio": risk_reward,
            "atm_strike": atm_strike,
            "selection_reason": reason,
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _compute_offset(vix: float, direction: str) -> float:
        """Compute how many strike steps OTM to go.

        Higher VIX -> stay closer to ATM (smaller offset).
        Lower VIX -> can go further OTM for cheaper premium.
        """
        if vix < 12:
            offset_steps = 2
        elif vix < 16:
            offset_steps = 1
        elif vix < 22:
            offset_steps = 0
        else:
            offset_steps = 0

        # Determine if this is an index or stock for step size
        # Use a generic step; caller will adjust
        return offset_steps * _DEFAULT_STRIKE_STEP

    def _get_strike_step(self, symbol: str) -> float:
        """Get the appropriate strike step for the symbol."""
        if symbol.upper() in _INDEX_SYMBOLS:
            return _INDEX_STRIKE_STEP
        # Use price to determine step
        stock_info = get_stock_info(symbol)
        if stock_info:
            # For now, use the default. In production, lookup from exchange.
            return _DEFAULT_STRIKE_STEP
        return _DEFAULT_STRIKE_STEP

    def _get_lot_size(self, symbol: str) -> int:
        """Get lot size, using override if available."""
        if symbol in self._lot_size_override:
            return self._lot_size_override[symbol]
        return get_lot_size(symbol)

    @staticmethod
    def _empty_result(symbol: str, reason: str) -> Dict[str, Any]:
        return {
            "strike": 0.0,
            "option_type": "",
            "lot_size": 0,
            "strike_step": 0.0,
            "premium_estimate": 0.0,
            "risk_reward_ratio": 0.0,
            "atm_strike": 0.0,
            "selection_reason": reason,
        }
