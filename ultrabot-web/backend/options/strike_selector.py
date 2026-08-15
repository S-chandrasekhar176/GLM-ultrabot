"""Select the optimal option strike for a given trade direction.

Uses the spot price and dynamic instrument-specific strike step rules to pick
an ATM or slightly OTM strike with appropriate lot size.
"""
import logging
from typing import Any, Dict, Optional

from utils.market_utils import get_lot_size, get_stock_info

logger = logging.getLogger(__name__)

# Typical NSE index/stock strike steps
_DEFAULT_STRIKE_STEP = 10.0


class StrikeSelector:
    """Select an option strike for entry.

    Selection logic:
    1. Find the accurate dynamic strike step (50 for Nifty, 100 for BankNifty, price-band for stocks).
    2. Find the ATM strike closest to the spot.
    3. For LONG: pick ATM or 1-2 strikes OTM CE (lower premium).
    4. For SHORT: pick ATM or 1-2 strikes OTM PE.
    5. Adjust offset based on VIX.
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
            symbol: NSE symbol (e.g. "RELIANCE", "NIFTY", "BANKNIFTY").
            direction: "LONG" or "SHORT".
            entry_price: Current spot price of the underlying.
            sl: Stop-loss price on the underlying.
            target: Target price on the underlying.
            vix: India VIX value for volatility adjustment.

        Returns:
            Dict with: strike, option_type, lot_size, strike_step,
            premium_estimate, risk_reward_ratio, atm_strike, selection_reason.
        """
        if entry_price <= 0:
            return self._empty_result(symbol, "Invalid entry price")

        # Determine dynamic strike step based on instrument and price
        strike_step = self._get_strike_step(symbol, entry_price)

        # Determine ATM strike
        atm_strike = round(entry_price / strike_step) * strike_step

        # Determine option type based on direction
        direction_upper = direction.upper()
        if direction_upper in ("LONG", "BUY"):
            option_type = "CE"
            offset = self._compute_offset(vix, direction_upper, strike_step)
            selected_strike = atm_strike + offset
        elif direction_upper in ("SHORT", "SELL"):
            option_type = "PE"
            offset = self._compute_offset(vix, direction_upper, strike_step)
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
            steps_otm = round(abs(offset / strike_step))
            reason = f"{steps_otm} strike{'s' if steps_otm != 1 else ''} OTM"

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
    def _compute_offset(vix: float, direction: str, strike_step: float) -> float:
        """Compute how many strike steps OTM to go based on VIX."""
        if vix < 12:
            offset_steps = 2
        elif vix < 16:
            offset_steps = 1
        elif vix < 22:
            offset_steps = 0
        else:
            offset_steps = 0

        return float(offset_steps * strike_step)

    def _get_strike_step(self, symbol: str, price: float = 0.0) -> float:
        """Get accurate NSE strike step for indices and equities."""
        sym_clean = symbol.upper().replace(" ", "").replace("_", "")
        if "BANKNIFTY" in sym_clean or "SENSEX" in sym_clean:
            return 100.0
        if "NIFTY" in sym_clean or "FINNIFTY" in sym_clean:
            return 50.0
        
        # Stock price band strike steps
        if price > 10000:
            return 100.0
        elif price > 4000:
            return 50.0
        elif price > 1500:
            return 20.0
        elif price > 500:
            return 10.0
        elif price > 200:
            return 5.0
        elif price > 0:
            return 2.5
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
