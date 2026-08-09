"""Partial Booker with step-based trailing stop-loss.

For a LONG position:
  L1  at 1:1 RR  - book 50 % of quantity
  L2  at 1.5:1 RR - book 50 % of remaining quantity
  L3  at 2:1 RR  - book 100 % of remaining quantity

Trailing SL (step method): every +1 % from the last SL level, move SL up
0.5 %.  SL never moves down.

For a SELL (SHORT) position the logic is inverted.
"""
from typing import Any, Dict, List, Optional

from models.risk_state import BookingLevels, BookingResult


class PartialBooker:
    """Manages partial booking levels and trailing stop-loss."""

    def __init__(self, config: Dict[str, Any]):
        self.enabled: bool = config.get("enabled", True)
        self.l1_rr: float = float(config.get("level1_rr", 1.0))
        self.l1_book_pct: float = float(config.get("level1_book_pct", 50))
        self.l2_rr: float = float(config.get("level2_rr", 1.5))
        self.l2_book_pct: float = float(config.get("level2_book_pct", 50))
        self.l3_rr: float = float(config.get("level3_rr", 2.0))
        self.l3_book_pct: float = float(config.get("level3_book_pct", 100))
        self.trailing_method: str = config.get("trailing_sl_method", "step")
        self.trailing_step_pct: float = float(config.get("trailing_step_pct", 0.5))

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def calculate_booking_levels(self, position: Any) -> List[BookingLevels]:
        """Return the three booking levels for a position.

        Expected ``position`` attributes: entry_price, sl_price, target_price,
        direction, quantity.
        """
        entry = float(getattr(position, "entry_price", 0) or 0)
        sl = float(getattr(position, "sl_price", 0) or 0)
        target = float(getattr(position, "target_price", 0) or 0)
        direction = str(getattr(position, "direction", "LONG")).upper()

        risk = abs(entry - sl) if entry > 0 and sl > 0 else 1.0

        if direction == "SHORT":
            l1_trigger = entry - self.l1_rr * risk
            l2_trigger = entry - self.l2_rr * risk
            l3_trigger = entry - self.l3_rr * risk
        else:
            l1_trigger = entry + self.l1_rr * risk
            l2_trigger = entry + self.l2_rr * risk
            l3_trigger = entry + self.l3_rr * risk

        levels: List[BookingLevels] = [
            BookingLevels(
                level=1,
                rr_ratio=self.l1_rr,
                book_pct=self.l1_book_pct,
                trigger_price=round(l1_trigger, 2),
            ),
            BookingLevels(
                level=2,
                rr_ratio=self.l2_rr,
                book_pct=self.l2_book_pct,
                trigger_price=round(l2_trigger, 2),
            ),
            BookingLevels(
                level=3,
                rr_ratio=self.l3_rr,
                book_pct=self.l3_book_pct,
                trigger_price=round(l3_trigger, 2),
            ),
        ]
        return levels

    def check_and_book(
        self, position: Any, current_price: float
    ) -> BookingResult:
        """Determine the next booking action given the current market price.

        Returns a BookingResult with the current level and whether trailing
        SL should be active.
        """
        if not self.enabled:
            return BookingResult(
                enabled=False,
                current_level=0,
                levels=[],
                trailing_sl_active=False,
            )

        levels = self.calculate_booking_levels(position)
        current_level = 0

        for lvl in levels:
            if self._price_hit_trigger(
                current_price, lvl.trigger_price, position
            ):
                current_level = lvl.level

        trailing_active = current_level >= 1
        current_trailing_sl: Optional[float] = None
        if trailing_active:
            current_trailing_sl = self.calculate_trailing_sl(
                position, current_price
            )

        return BookingResult(
            enabled=True,
            current_level=current_level,
            levels=levels,
            trailing_sl_active=trailing_active,
            current_trailing_sl=current_trailing_sl,
            trailing_method=self.trailing_method,
            trailing_step_pct=self.trailing_step_pct,
        )

    def calculate_trailing_sl(self, position: Any, current_price: float) -> float:
        """Step-method trailing SL.

        LONG:  for every +1 % move from the last SL, move SL up 0.5 %.
               SL never decreases.
        SHORT: for every +1 % downward move from the last SL, move SL down 0.5 %.
               SL never increases.

        The initial SL is the position's original sl_price.  If no levels have
        been booked yet we return the original SL unchanged.
        """
        entry = float(getattr(position, "entry_price", 0) or 0)
        original_sl = float(getattr(position, "sl_price", 0) or 0)
        direction = str(getattr(position, "direction", "LONG")).upper()

        # The effective "last SL" - we derive it from the highest/lowest
        # level trigger that has been hit.
        levels = self.calculate_booking_levels(position)
        hit_levels = [
            lvl for lvl in levels
            if self._price_hit_trigger(current_price, lvl.trigger_price, position)
        ]

        if not hit_levels:
            return original_sl

        # Use the most aggressive trigger hit as the reference
        if direction == "SHORT":
            best_trigger = min(lvl.trigger_price for lvl in hit_levels)
        else:
            best_trigger = max(lvl.trigger_price for lvl in hit_levels)

        # Calculate trailing steps from the entry-based reference.
        # Each step = 1% of entry price.
        step_size = entry * (1.0 / 100.0)  # 1%
        sl_shift = entry * (self.trailing_step_pct / 100.0)  # 0.5%

        if direction == "SHORT":
            # Price moved DOWN.  SL should also move DOWN (never up).
            downward_move = entry - best_trigger
            steps = int(downward_move / step_size) if step_size > 0 else 0
            new_sl = entry - (steps * sl_shift)
            # SL should never be higher than the original (for SHORT, higher = worse)
            # For SHORT positions, SL is ABOVE entry; we want it lower.
            # The original SL is the upper bound.
            return round(min(new_sl, original_sl), 2)
        else:
            # LONG: price moved UP.  SL should also move UP (never down).
            upward_move = best_trigger - entry
            steps = int(upward_move / step_size) if step_size > 0 else 0
            new_sl = entry + (steps * sl_shift)
            # SL should never be lower than the original
            return round(max(new_sl, original_sl), 2)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _price_hit_trigger(
        self, current_price: float, trigger_price: float, position: Any
    ) -> bool:
        """Check if current_price has reached trigger_price in the trade direction."""
        direction = str(getattr(position, "direction", "LONG")).upper()
        if direction == "SHORT":
            return current_price <= trigger_price
        return current_price >= trigger_price
