"""Gate G3: Max Position Size.

Blocks trades where the estimated position value would exceed the configured
percentage of total capital.
"""
from typing import Any, Dict

from models.risk_state import GateResult


class G3MaxPositionSize:
    """Ensure no single position exceeds a percentage of total capital."""

    def __init__(self, config: Dict[str, Any]):
        self.max_position_pct: float = float(config.get("max_per_position_pct", 25))

    async def check(self, signal: Any, context: Dict[str, Any]) -> GateResult:
        total_capital = context.get("total_capital", 0)
        if total_capital <= 0:
            return GateResult(
                gate_name="G3_MaxPositionSize",
                passed=False,
                message="Total capital is zero or negative, cannot evaluate position size",
                value=0.0,
                threshold=0.0,
                severity="critical",
            )

        # Estimate position value: if we know available capital we use a rough
        # estimate of 1 lot; otherwise use entry_price * 1 as a minimum value proxy.
        # The actual sizing is done by PositionSizer. Here we check the worst case:
        # the signal's entry_price * a single unit, or available_capital, whichever
        # the caller expects. We'll use entry_price as a proxy for per-unit cost
        # and assume at least 1 lot would be traded.
        entry_price = float(getattr(signal, "entry_price", 0) or 0)
        # Use available capital as the would-be position value for this gate
        available_capital = float(context.get("available_capital", 0))
        # The position value is what we'd actually allocate – use min(available, entry*1)
        # but more realistically the caller passes enough info.  We check if even
        # the maximum allowed allocation (max_position_pct of capital) would be
        # exceeded by the available capital commitment.
        max_allowed = total_capital * (self.max_position_pct / 100.0)
        # A trade that would use more than max_allowed of capital fails.
        # We conservatively check available_capital (what we'd deploy) against max_allowed.
        position_value = available_capital if available_capital > 0 else entry_price

        if position_value > max_allowed:
            return GateResult(
                gate_name="G3_MaxPositionSize",
                passed=False,
                message=(
                    f"Position value ₹{position_value:,.0f} exceeds "
                    f"{self.max_position_pct}% of capital (₹{max_allowed:,.0f})"
                ),
                value=position_value,
                threshold=max_allowed,
                severity="warning",
            )

        return GateResult(
            gate_name="G3_MaxPositionSize",
            passed=True,
            message=(
                f"Position value ₹{position_value:,.0f} within "
                f"{self.max_position_pct}% of capital (₹{max_allowed:,.0f})"
            ),
            value=position_value,
            threshold=max_allowed,
            severity="info",
        )
