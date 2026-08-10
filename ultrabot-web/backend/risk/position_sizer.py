"""Position Sizer with dynamic Kelly-based sizing.

Applies a sequence of adjustments:
  1. Base Kelly fraction (clamped to [kelly_min, kelly_max])
  2. Confidence tier multiplier
  3. Volatility (VIX) tier multiplier
  4. Drawdown tier multiplier
  5. Capital availability cap (90 % of total capital usage)
  6. Minimum position check (>= min_position_size)
  7. Convert to integer quantity using lot size
"""
from typing import Any, Dict, Optional

from models.risk_state import SizingResult
from utils.market_utils import get_lot_size, is_fno_stock


class PositionSizer:
    """Dynamic Kelly-based position sizer."""

    def __init__(self, config: Dict[str, Any], capital_config: Dict[str, Any]):
        self.config = config
        self.capital_config = capital_config

        # Position sizing parameters
        self.kelly_min = float(config.get("kelly_min_fraction", 0.02))
        self.kelly_max = float(config.get("kelly_max_fraction", 0.25))

        # Capital parameters
        self.total_capital = float(capital_config.get("virtual_capital", 100000))
        self.max_capital_usage_pct = float(
            capital_config.get("max_capital_usage_pct", 90)
        )
        self.min_position_size = float(capital_config.get("min_position_size", 5000))
        self.max_per_position_pct = float(
            capital_config.get("max_per_position_pct", 25)
        )

        # Tier configs
        self.confidence_tiers: Dict[str, Dict] = config.get("confidence_tiers", {
            "high": {"min": 0.8, "multiplier": 1.0},
            "medium": {"min": 0.6, "multiplier": 0.8},
            "low": {"min": 0.4, "multiplier": 0.5},
        })
        self.volatility_tiers: Dict[str, Dict] = config.get("volatility_tiers", {
            "calm": {"max_vix": 14, "multiplier": 1.0},
            "normal": {"max_vix": 18, "multiplier": 0.85},
            "nervous": {"max_vix": 22, "multiplier": 0.65},
            "fearful": {"max_vix": 999, "multiplier": 0.4},
        })
        self.drawdown_tiers: Dict[str, Dict] = config.get("drawdown_tiers", {
            "profit": {"min_pct": 0, "multiplier": 1.0},
            "small_loss": {"min_pct": -1, "multiplier": 0.9},
            "mod_loss": {"min_pct": -2, "multiplier": 0.7},
            "big_loss": {"min_pct": -3, "multiplier": 0.4},
        })

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def calculate(self, signal: Any, context: Dict[str, Any]) -> SizingResult:
        """Run the full sizing pipeline and return a SizingResult."""
        confidence = float(getattr(signal, "confidence", 0.5) or 0.5)
        entry_price = float(getattr(signal, "entry_price", 0) or 0)
        sl_price = float(getattr(signal, "sl_price", 0) or 0)
        vix = float(context.get("vix", 15) or 15)
        current_drawdown_pct = float(context.get("current_drawdown_pct", 0) or 0)
        available_capital = float(context.get("available_capital", self.total_capital))

        # 1. Base Kelly fraction
        raw_fraction = self._kelly_fraction(confidence)
        raw_fraction = max(self.kelly_min, min(self.kelly_max, raw_fraction))

        # 2. Confidence adjustment
        conf_tier_name, conf_multiplier = self._confidence_tier(confidence)

        # 3. Volatility adjustment
        vol_tier_name, vol_multiplier = self._volatility_tier(vix)

        # 4. Drawdown adjustment
        dd_tier_name, dd_multiplier = self._drawdown_tier(current_drawdown_pct)

        # Apply multipliers
        adjusted_fraction = raw_fraction * conf_multiplier * vol_multiplier * dd_multiplier

        # 5. Capital availability
        max_usable = self.total_capital * (self.max_capital_usage_pct / 100.0)
        actual_usable = min(available_capital, max_usable)
        position_size = self.total_capital * adjusted_fraction
        position_size = min(position_size, actual_usable)

        # Cap at max_per_position_pct
        max_single = self.total_capital * (self.max_per_position_pct / 100.0)
        position_size = min(position_size, max_single)

        # 6. Min position check
        position_size_pct = (position_size / self.total_capital * 100.0) if self.total_capital > 0 else 0.0

        # Risk amount
        risk_per_unit = abs(entry_price - sl_price) if entry_price > 0 and sl_price > 0 else 0.0

        # 7. Convert to quantity
        quantity, lot_size = self._to_quantity(signal.symbol, position_size, entry_price)

        # Recalculate actual position size based on quantity
        if entry_price > 0 and quantity > 0:
            position_size = entry_price * quantity
            position_size_pct = (position_size / self.total_capital * 100.0) if self.total_capital > 0 else 0.0

        risk_amount = risk_per_unit * quantity
        risk_pct = (risk_amount / self.total_capital * 100.0) if self.total_capital > 0 else 0.0

        notes_parts: list = []
        if position_size < self.min_position_size and entry_price > 0:
            notes_parts.append(
                f"Position size ({position_size:,.0f}) below minimum ({self.min_position_size:,.0f}), set to minimum"
            )
            # Bump to min
            quantity, lot_size = self._to_quantity(
                signal.symbol, self.min_position_size, entry_price
            )
            if entry_price > 0 and quantity > 0:
                position_size = entry_price * quantity
                position_size_pct = (position_size / self.total_capital * 100.0) if self.total_capital > 0 else 0.0
                risk_amount = risk_per_unit * quantity
                risk_pct = (risk_amount / self.total_capital * 100.0) if self.total_capital > 0 else 0.0

        is_equity = not is_fno_stock(signal.symbol)

        return SizingResult(
            method="dynamic_kelly",
            raw_fraction=raw_fraction,
            adjusted_fraction=adjusted_fraction,
            confidence_multiplier=conf_multiplier,
            volatility_multiplier=vol_multiplier,
            drawdown_multiplier=dd_multiplier,
            capital_available=available_capital,
            position_size=position_size,
            position_size_pct=position_size_pct,
            risk_amount=risk_amount,
            risk_pct=risk_pct,
            confidence_tier=conf_tier_name,
            volatility_tier=vol_tier_name,
            drawdown_tier=dd_tier_name,
            quantity=quantity,
            lot_size=lot_size if lot_size > 1 else None,
            is_equity=is_equity,
            notes="; ".join(notes_parts) if notes_parts else None,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _kelly_fraction(confidence: float) -> float:
        """Simplified Kelly: f = confidence * 0.25."""
        return confidence * 0.25

    def _confidence_tier(self, confidence: float) -> tuple:
        """Return (tier_name, multiplier) for the given confidence."""
        # Check tiers from highest to lowest
        best_name = "low"
        best_mult = 0.5
        for name, spec in self.confidence_tiers.items():
            if confidence >= spec["min"]:
                best_name = name
                best_mult = spec["multiplier"]
        # Pick the tier with the highest min that still matches
        best_min = -1.0
        for name, spec in self.confidence_tiers.items():
            if confidence >= spec["min"] and spec["min"] > best_min:
                best_min = spec["min"]
                best_name = name
                best_mult = spec["multiplier"]
        return best_name, best_mult

    def _volatility_tier(self, vix: float) -> tuple:
        """Return (tier_name, multiplier) for the given VIX level."""
        for name, spec in self.volatility_tiers.items():
            if vix <= spec["max_vix"]:
                return name, spec["multiplier"]
        # Fallback: last tier
        last_name = list(self.volatility_tiers.keys())[-1]
        return last_name, self.volatility_tiers[last_name]["multiplier"]

    def _drawdown_tier(self, drawdown_pct: float) -> tuple:
        """Return (tier_name, multiplier) for the given drawdown.

        drawdown_pct is negative when in loss.  The tier with the lowest
        (most negative) min_pct that is still <= drawdown_pct wins.
        """
        best_name = "profit"
        best_mult = 1.0
        best_min = 999.0
        for name, spec in self.drawdown_tiers.items():
            min_pct = spec["min_pct"]
            if drawdown_pct <= 0 and min_pct <= drawdown_pct and min_pct < best_min:
                best_name = name
                best_mult = spec["multiplier"]
                best_min = min_pct
            elif drawdown_pct > 0 and name == "profit":
                best_name = name
                best_mult = spec["multiplier"]
                best_min = min_pct
        return best_name, best_mult

    def _to_quantity(
        self, symbol: str, target_value: float, entry_price: float
    ) -> tuple:
        """Convert a target rupee value to (quantity, lot_size)."""
        lot_size = get_lot_size(symbol)
        if entry_price <= 0:
            return 0, lot_size

        if is_fno_stock(symbol):
            # F&O: round down to whole lots
            lots = int(target_value / (entry_price * lot_size))
            return max(lots * lot_size, 0), lot_size
        else:
            # Equity: any integer quantity
            qty = int(target_value / entry_price)
            return max(qty, 0), 1
