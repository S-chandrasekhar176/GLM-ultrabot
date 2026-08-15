from typing import Any, Dict, List, Optional, TYPE_CHECKING

from models.risk_state import GateResult, RiskResult

from risk.gates.g1_max_positions import G1MaxPositions
from risk.gates.g2_sector_concentration import G2SectorConcentration
from risk.gates.g3_max_position_size import G3MaxPositionSize
from risk.gates.g4_max_daily_trades import G4MaxDailyTrades
from risk.gates.g5_max_daily_loss import G5MaxDailyLoss
from risk.gates.g6_correlation_check import G6CorrelationCheck
from risk.gates.g7_vix_filter import G7VIXFilter
from risk.gates.g8_time_of_day import G8TimeOfDay
from risk.gates.g9_price_mismatch import G9PriceMismatch
from risk.gates.g10_min_confidence import G10MinConfidence
from risk.gates.g11_max_drawdown import G11MaxDrawdown
from risk.gates.g12_margin_check import G12MarginCheck
from risk.gates.g13_duplicate_signal import G13DuplicateSignal
from risk.gates.g14_strategy_backtest import G14StrategyBacktest
from risk.gates.g15_volume_liquidity import G15VolumeLiquidity
from risk.gates.g16_multi_timeframe import G16MultiTimeframe

if TYPE_CHECKING:
    from db.repository import Repository


class RiskEngine:
    """Runs all 16 risk gates sequentially, stopping at the first failure.

    Each gate receives the full risk config dict so it can read its own
    parameters.  The ``repository`` is only injected into G13 (duplicate
    signal check) where it is needed.
    """

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.gates: List[Any] = [
            G1MaxPositions(config),
            G2SectorConcentration(config),
            G3MaxPositionSize(config),
            G4MaxDailyTrades(config),
            G5MaxDailyLoss(config),
            G6CorrelationCheck(config),
            G7VIXFilter(config),
            G8TimeOfDay(config),
            G9PriceMismatch(config),
            G10MinConfidence(config),
            G11MaxDrawdown(config),
            G12MarginCheck(config),
            G13DuplicateSignal(config),
            G14StrategyBacktest(config),
            G15VolumeLiquidity(config),
            G16MultiTimeframe(config),
        ]

    def set_repository(self, repo: "Repository") -> None:
        """Inject the repository into gates that need DB access."""
        for gate in self.gates:
            if isinstance(gate, G13DuplicateSignal):
                gate.set_repository(repo)

    async def validate(self, signal: Any, context: Dict[str, Any]) -> RiskResult:
        """Run all gates.  Returns a RiskResult with ``passed=True`` only if
        every gate passes.  Stops on the first failure."""
        results: List[GateResult] = []
        for gate in self.gates:
            result: GateResult = await gate.check(signal, context)
            results.append(result)
            if not result.passed:
                return RiskResult(
                    passed=False,
                    all_gates=results,
                    blocked_by=result.gate_name,
                    block_reason=result.message,
                    severity=result.severity,
                    reduced_size=False,
                    notes=f"Blocked by {result.gate_name}",
                )

        return RiskResult(
            passed=True,
            all_gates=results,
            blocked_by=None,
            block_reason=None,
            severity="info",
            reduced_size=False,
            notes="All 16 gates passed",
        )
