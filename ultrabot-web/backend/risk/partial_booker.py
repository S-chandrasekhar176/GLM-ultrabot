"""Standard 4-Stage Profit Booking and Dynamic Trailing Stop-Loss Engine.

Lifecycle:
  Stage 1 (Breakeven Defense):  1:1.0 RR -> Trail SL to Entry Price (Zero-Risk Trade, 0% exited)
  Stage 2 (Scale Out 25%):      1:1.5 RR -> Book 25% of quantity, Trail SL to Entry + 0.5R
  Stage 3 (Scale Out 50%):      1:2.5 RR -> Book 50% of remaining (37.5% of orig), Trail SL to Entry + 1.5R
  Stage 4 (Trend Runner 25%):   1:3.5+ RR -> Let final 25-37.5% ride with ATR / Supertrend trailing stop
"""
from typing import Any, Dict, List, Optional
from models.risk_state import BookingLevels, BookingResult


class PartialBooker:
    """Manages 4-stage profit booking levels and trailing stop-loss."""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        cfg = config or {}
        self.enabled: bool = cfg.get("enabled", True)
        # Stage 1: Breakeven Defense
        self.l1_rr: float = float(cfg.get("level1_rr", 1.0))
        self.l1_book_pct: float = float(cfg.get("level1_book_pct", 0.0))
        # Stage 2: Scale Out 25%
        self.l2_rr: float = float(cfg.get("level2_rr", 1.5))
        self.l2_book_pct: float = float(cfg.get("level2_book_pct", 25.0))
        # Stage 3: Scale Out 50%
        self.l3_rr: float = float(cfg.get("level3_rr", 2.5))
        self.l3_book_pct: float = float(cfg.get("level3_book_pct", 50.0))
        # Stage 4: Trend Runner Target
        self.l4_rr: float = float(cfg.get("level4_rr", 3.5))
        self.l4_book_pct: float = float(cfg.get("level4_book_pct", 100.0))

        self.trailing_method: str = cfg.get("trailing_sl_method", "step")
        self.trailing_step_pct: float = float(cfg.get("trailing_step_pct", 0.5))

    def calculate_booking_levels(self, position: Any) -> List[BookingLevels]:
        """Return the 4 standard booking levels for a position."""
        entry = float(getattr(position, "entry_price", 0) or 0)
        sl = float(getattr(position, "sl_price", 0) or 0)
        direction = str(getattr(position, "direction", "LONG")).upper()

        risk = abs(entry - sl) if entry > 0 and sl > 0 else 1.0

        if direction in ("SHORT", "SELL"):
            l1_trigger = entry - self.l1_rr * risk
            l2_trigger = entry - self.l2_rr * risk
            l3_trigger = entry - self.l3_rr * risk
            l4_trigger = entry - self.l4_rr * risk
        else:
            l1_trigger = entry + self.l1_rr * risk
            l2_trigger = entry + self.l2_rr * risk
            l3_trigger = entry + self.l3_rr * risk
            l4_trigger = entry + self.l4_rr * risk

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
            BookingLevels(
                level=4,
                rr_ratio=self.l4_rr,
                book_pct=self.l4_book_pct,
                trigger_price=round(l4_trigger, 2),
            ),
        ]
        return levels

    def check_and_book(self, position: Any, current_price: float) -> BookingResult:
        """Determine the current 4-stage booking level and active trailing SL."""
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
            if self._price_hit_trigger(current_price, lvl.trigger_price, position):
                current_level = lvl.level

        trailing_active = current_level >= 1
        current_trailing_sl: Optional[float] = None
        if trailing_active:
            current_trailing_sl = self.calculate_trailing_sl(position, current_price)

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
        """Calculate trailing Stop-Loss based on the active stage."""
        entry = float(getattr(position, "entry_price", 0) or 0)
        original_sl = float(getattr(position, "sl_price", 0) or 0)
        direction = str(getattr(position, "direction", "LONG")).upper()
        risk = abs(entry - original_sl) if entry > 0 and original_sl > 0 else 1.0

        levels = self.calculate_booking_levels(position)
        hit_levels = [
            lvl for lvl in levels
            if self._price_hit_trigger(current_price, lvl.trigger_price, position)
        ]

        if not hit_levels:
            return original_sl

        max_level_hit = max(lvl.level for lvl in hit_levels)

        # Stage 1: Breakeven defense -> Lock SL at Entry
        if max_level_hit == 1:
            return round(entry, 2)

        # Stage 2: Scale Out 25% -> Lock SL at Entry + 0.5R
        elif max_level_hit == 2:
            if direction in ("SHORT", "SELL"):
                return round(entry - 0.5 * risk, 2)
            return round(entry + 0.5 * risk, 2)

        # Stage 3: Scale Out 50% -> Lock SL at Entry + 1.5R
        elif max_level_hit == 3:
            if direction in ("SHORT", "SELL"):
                return round(entry - 1.5 * risk, 2)
            return round(entry + 1.5 * risk, 2)

        # Stage 4: Trend Runner -> Lock SL at Entry + 2.5R (or ATR step)
        else:
            if direction in ("SHORT", "SELL"):
                return round(entry - 2.5 * risk, 2)
            return round(entry + 2.5 * risk, 2)

    def _price_hit_trigger(self, current_price: float, trigger_price: float, position: Any) -> bool:
        """Check if current_price has reached or crossed trigger_price."""
        direction = str(getattr(position, "direction", "LONG")).upper()
        if direction in ("SHORT", "SELL"):
            return current_price <= trigger_price
        return current_price >= trigger_price
