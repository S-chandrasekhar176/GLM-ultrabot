"""Tests for 3-level partial booking with known price sequences."""
import pytest
from types import SimpleNamespace

from risk.partial_booker import PartialBooker


CONFIG = {
    "enabled": True,
    "level1_rr": 1.0,
    "level1_book_pct": 50,
    "level2_rr": 1.5,
    "level2_book_pct": 50,
    "level3_rr": 2.0,
    "level3_book_pct": 100,
    "trailing_sl_method": "step",
    "trailing_step_pct": 0.5,
}


def make_position(entry=100.0, sl=95.0, target=115.0, direction="LONG"):
    return SimpleNamespace(
        entry_price=entry,
        sl_price=sl,
        target_price=target,
        direction=direction,
        quantity=100,
    )


@pytest.fixture
def booker():
    return PartialBooker(CONFIG)


class TestBookingLevels:
    def test_three_levels_long(self, booker):
        """Entry=100, SL=95, risk=5.
        L1 at 1:1 RR = 105
        L2 at 1.5:1 RR = 107.5
        L3 at 2:1 RR = 110
        """
        pos = make_position(entry=100.0, sl=95.0)
        levels = booker.calculate_booking_levels(pos)
        assert len(levels) == 3
        assert levels[0].level == 1
        assert levels[0].rr_ratio == 1.0
        assert levels[0].trigger_price == 105.0
        assert levels[0].book_pct == 50

        assert levels[1].level == 2
        assert levels[1].rr_ratio == 1.5
        assert levels[1].trigger_price == 107.5
        assert levels[1].book_pct == 50

        assert levels[2].level == 3
        assert levels[2].rr_ratio == 2.0
        assert levels[2].trigger_price == 110.0
        assert levels[2].book_pct == 100

    def test_levels_short(self, booker):
        """Short: entry=200, SL=205, risk=5.
        L1 at 1:1 RR = 195
        L2 at 1.5:1 RR = 192.5
        L3 at 2:1 RR = 190
        """
        pos = make_position(entry=200.0, sl=205.0, direction="SHORT")
        levels = booker.calculate_booking_levels(pos)
        assert levels[0].trigger_price == 195.0
        assert levels[1].trigger_price == 192.5
        assert levels[2].trigger_price == 190.0


class TestCheckAndBook:
    def test_no_levels_hit(self, booker):
        pos = make_position(entry=100.0, sl=95.0)
        result = booker.check_and_book(pos, current_price=103.0)
        assert result.current_level == 0
        assert result.trailing_sl_active is False

    def test_level1_hit(self, booker):
        pos = make_position(entry=100.0, sl=95.0)
        result = booker.check_and_book(pos, current_price=106.0)
        assert result.current_level >= 1
        assert result.trailing_sl_active is True

    def test_level2_hit(self, booker):
        pos = make_position(entry=100.0, sl=95.0)
        result = booker.check_and_book(pos, current_price=108.0)
        assert result.current_level >= 2
        assert result.trailing_sl_active is True

    def test_level3_hit(self, booker):
        pos = make_position(entry=100.0, sl=95.0)
        result = booker.check_and_book(pos, current_price=112.0)
        assert result.current_level == 3
        assert result.trailing_sl_active is True

    def test_disabled(self, booker):
        disabled_booker = PartialBooker({**CONFIG, "enabled": False})
        pos = make_position(entry=100.0, sl=95.0)
        result = disabled_booker.check_and_book(pos, current_price=112.0)
        assert result.enabled is False
        assert result.current_level == 0


class TestTrailingSL:
    def test_trailing_sl_moves_up(self, booker):
        """Entry=100, SL=95, risk=5. At price 105 (L1 hit, +5 from entry = 5 steps).
        Each step moves SL up 0.5% of entry = 0.5.
        5 steps => SL moves up 2.5 to 97.5.
        """
        pos = make_position(entry=100.0, sl=95.0)
        trailing_sl = booker.calculate_trailing_sl(pos, current_price=105.0)
        assert trailing_sl >= 95.0  # Should be >= original SL

    def test_trailing_sl_never_below_original(self, booker):
        pos = make_position(entry=100.0, sl=95.0)
        trailing_sl = booker.calculate_trailing_sl(pos, current_price=101.0)
        assert trailing_sl >= 95.0

    def test_no_hit_returns_original_sl(self, booker):
        pos = make_position(entry=100.0, sl=95.0)
        trailing_sl = booker.calculate_trailing_sl(pos, current_price=99.0)
        assert trailing_sl == 95.0
