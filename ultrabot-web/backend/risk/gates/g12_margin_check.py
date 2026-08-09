"""Gate G12: Margin Check.

Blocks trades when the required margin for the proposed position
exceeds the available margin/capital.
"""
from typing import Any, Dict, Optional

from models.risk_state import GateResult
from utils.market_utils import get_lot_size


class G12MarginCheck:
    """Ensure sufficient margin is available for the new position."""

    def __init__(self, config: Dict[str, Any]):
        self.max_capital_usage_pct: float = float(
            config.get("max_capital_usage_pct", 90)
        )

    async def check(self, signal: Any, context: Dict[str, Any]) -> GateResult:
        available_margin = float(context.get("available_capital", 0))
        entry_price = float(getattr(signal, "entry_price", 0) or 0)
        total_capital = float(context.get("total_capital", 0))

        if entry_price <= 0:
            return GateResult(
                gate_name="G12_MarginCheck",
                passed=False,
                message="Signal entry_price is zero or negative, cannot calculate margin",
                severity="critical",
            )

        if total_capital <= 0:
            return GateResult(
                gate_name="G12_MarginCheck",
                passed=False,
                message="Total capital is zero, cannot evaluate margin",
                severity="critical",
            )

        # Estimate quantity: use lot_size for F&O, else 1
        lot_size = get_lot_size(signal.symbol)
        estimated_qty = lot_size

        required_margin = entry_price * estimated_qty
        max_allowed_margin = total_capital * (self.max_capital_usage_pct / 100.0)

        if required_margin > available_margin:
            return GateResult(
                gate_name="G12_MarginCheck",
                passed=False,
                message=(
                    f"Required margin (\u20b9{required_margin:,.0f}) exceeds "
                    f"available (\u20b9{available_margin:,.0f})"
                ),
                value=required_margin,
                threshold=available_margin,
                severity="critical",
            )

        return GateResult(
            gate_name="G12_MarginCheck",
            passed=True,
            message=(
                f"Required margin (\u20b9{required_margin:,.0f}) within "
                f"available (\u20b9{available_margin:,.0f}), "
                f"max usage (\u20b9{max_allowed_margin:,.0f})"
            ),
            value=required_margin,
            threshold=available_margin,
            severity="info",
        )
