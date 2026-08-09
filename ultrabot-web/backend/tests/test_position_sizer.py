import pytest
from types import SimpleNamespace

from risk.position_sizer import PositionSizer


SIZING_CONFIG = {
    "kelly_min_fraction": 0.02,
    "kelly_max_fraction": 0.25,
    "confidence_tiers": {
        "high": {"min": 0.8, "multiplier": 1.0},
        "medium": {"min": 0.6, "multiplier": 0.8},
        "low": {"min": 0.4, "multiplier": 0.5},
    },
    "volatility_tiers": {
        "calm": {"max_vix": 14, "multiplier": 1.0},
        "normal": {"max_vix": 18, "multiplier": 0.85},
        "nervous": {"max_vix": 22, "multiplier": 0.65},
        "fearful": {"max_vix": 999, "multiplier": 0.4},
    },
    "drawdown_tiers": {
        "profit": {"min_pct": 0, "multiplier": 1.0},
        "small_loss": {"min_pct": -1, "multiplier": 0.9},
        "mod_loss": {"min_pct": -2, "multiplier": 0.7},
        "big_loss": {"min_pct": -3, "multiplier": 0.4},
    },
}

CAPITAL_CONFIG = {
    "virtual_capital": 100000,
    "max_capital_usage_pct": 90,
    "min_position_size": 5000,
    "max_per_position_pct": 25,
}


def make_signal(symbol="UNKNOWN", confidence=0.8, entry_price=400.0, sl_price=390.0):
    return SimpleNamespace(
        symbol=symbol,
        confidence=confidence,
        entry_price=entry_price,
        sl_price=sl_price,
    )


class TestPositionSizerBasic:
    @pytest.fixture
    def sizer(self):
        return PositionSizer(SIZING_CONFIG, CAPITAL_CONFIG)

    def test_returns_sizing_result(self, sizer):
        signal = make_signal()
        # Use positive drawdown to get profit tier (multiplier 1.0)
        ctx = {"vix": 15.0, "current_drawdown_pct": 1.0, "available_capital": 100000.0}
        result = sizer.calculate(signal, ctx)
        assert result.method == "dynamic_kelly"
        assert result.quantity > 0
        assert result.position_size > 0

    def test_high_confidence_gives_more(self, sizer):
        high_signal = make_signal(confidence=0.9)
        low_signal = make_signal(confidence=0.5)
        ctx = {"vix": 15.0, "current_drawdown_pct": 1.0, "available_capital": 100000.0}
        high_result = sizer.calculate(high_signal, ctx)
        low_result = sizer.calculate(low_signal, ctx)
        assert high_result.quantity >= low_result.quantity

    def test_high_vix_reduces_size(self, sizer):
        signal = make_signal(confidence=0.8)
        calm_ctx = {"vix": 12.0, "current_drawdown_pct": 1.0, "available_capital": 100000.0}
        fearful_ctx = {"vix": 25.0, "current_drawdown_pct": 1.0, "available_capital": 100000.0}
        calm_result = sizer.calculate(signal, calm_ctx)
        fearful_result = sizer.calculate(signal, fearful_ctx)
        assert calm_result.quantity >= fearful_result.quantity

    def test_drawdown_reduces_size(self, sizer):
        signal = make_signal(confidence=0.8)
        profit_ctx = {"vix": 15.0, "current_drawdown_pct": 1.0, "available_capital": 100000.0}
        # Use -0.5 to stay in small_loss tier (min_pct=-1)
        loss_ctx = {"vix": 15.0, "current_drawdown_pct": -0.5, "available_capital": 100000.0}
        profit_result = sizer.calculate(signal, profit_ctx)
        loss_result = sizer.calculate(signal, loss_ctx)
        assert profit_result.quantity >= loss_result.quantity

    def test_fno_uses_lot_size(self, sizer):
        # BPCL lot_size=900, entry=400 => lot_value=360000 – too large for our capital.
        # So we test that the lot_size attribute is correctly detected.
        signal = make_signal(symbol="BPCL")
        ctx = {"vix": 15.0, "current_drawdown_pct": 1.0, "available_capital": 100000.0}
        result = sizer.calculate(signal, ctx)
        assert result.lot_size == 900
        assert result.is_equity is False

    def test_equity_any_quantity(self, sizer):
        # Default UNKNOWN is non-F&O, so any integer quantity
        signal = make_signal(symbol="UNKNOWN")
        ctx = {"vix": 15.0, "current_drawdown_pct": 1.0, "available_capital": 100000.0}
        result = sizer.calculate(signal, ctx)
        assert result.is_equity is True
        assert result.lot_size is None
        # For equity, quantity should be > 0 with reasonable price
        assert result.quantity > 0

    def test_confidence_tier_labels(self, sizer):
        signal_high = make_signal(confidence=0.85)
        signal_low = make_signal(confidence=0.45)
        ctx = {"vix": 15.0, "current_drawdown_pct": 1.0, "available_capital": 100000.0}
        high = sizer.calculate(signal_high, ctx)
        low = sizer.calculate(signal_low, ctx)
        assert high.confidence_tier == "high"
        assert low.confidence_tier == "low"

    def test_volatility_tier_labels(self, sizer):
        signal = make_signal()
        calm_ctx = {"vix": 12.0, "current_drawdown_pct": 1.0, "available_capital": 100000.0}
        nervous_ctx = {"vix": 20.0, "current_drawdown_pct": 1.0, "available_capital": 100000.0}
        calm = sizer.calculate(signal, calm_ctx)
        nervous = sizer.calculate(signal, nervous_ctx)
        assert calm.volatility_tier == "calm"
        assert nervous.volatility_tier == "nervous"

    def test_capital_cap(self, sizer):
        """Position should not exceed max_capital_usage_pct of total capital."""
        signal = make_signal(confidence=0.95)
        ctx = {"vix": 12.0, "current_drawdown_pct": 1.0, "available_capital": 100000.0}
        result = sizer.calculate(signal, ctx)
        max_allowed = 100000 * (90 / 100.0)
        assert result.position_size <= max_allowed + 1  # +1 for rounding
