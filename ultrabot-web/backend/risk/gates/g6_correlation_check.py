"""Gate G6: Correlation Check.

Uses sector as a correlation proxy. If too many positions are already in the
same sector as the incoming signal, the trade is blocked.
"""
from typing import Any, Dict

from models.risk_state import GateResult
from utils.market_utils import get_stock_sector


class G6CorrelationCheck:
    """Block trades when correlated (same-sector) exposure is too high."""

    def __init__(self, config: Dict[str, Any]):
        self.max_correlated: int = config.get("max_per_sector", 2)

    async def check(self, signal: Any, context: Dict[str, Any]) -> GateResult:
        sector = get_stock_sector(signal.symbol)
        positions_by_sector: Dict[str, int] = context.get("positions_by_sector", {})
        current_count = positions_by_sector.get(sector, 0)

        if current_count >= self.max_correlated:
            return GateResult(
                gate_name="G6_CorrelationCheck",
                passed=False,
                message=(
                    f"{current_count} correlated positions in '{sector}', "
                    f"limit is {self.max_correlated}"
                ),
                value=float(current_count),
                threshold=float(self.max_correlated),
                severity="warning",
            )

        return GateResult(
            gate_name="G6_CorrelationCheck",
            passed=True,
            message=(
                f"{current_count} correlated positions in '{sector}', "
                f"limit is {self.max_correlated}"
            ),
            value=float(current_count),
            threshold=float(self.max_correlated),
            severity="info",
        )
