from typing import Dict, Any, Optional, List


class RegimeDetector:
    """Classifies the current market regime based on Nifty, VIX, and breadth data."""

    def classify(
        self,
        nifty_price: float,
        nifty_day_change_pct: float,
        nifty_5day_change_pct: float,
        vix: float,
        ad_ratio: float,
        sector_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Classify the current market regime.

        Args:
            nifty_price: Current Nifty 50 index price.
            nifty_day_change_pct: Nifty percentage change today.
            nifty_5day_change_pct: Nifty percentage change over 5 days.
            vix: India VIX value.
            ad_ratio: Advance/Decline ratio.
            sector_data: Optional dict of sector-level data.

        Returns:
            {"regime": str, "confidence": float, "details": dict}
        """
        details: Dict[str, Any] = {
            "nifty_price": nifty_price,
            "nifty_day_change_pct": nifty_day_change_pct,
            "nifty_5day_change_pct": nifty_5day_change_pct,
            "vix": vix,
            "ad_ratio": ad_ratio,
        }

        # Bull conditions
        bull_conditions = 0
        bull_total = 4
        if nifty_day_change_pct > 0.3:
            bull_conditions += 1
        if nifty_5day_change_pct > 1.0:
            bull_conditions += 1
        if ad_ratio > 1.5:
            bull_conditions += 1
        if vix < 18:
            bull_conditions += 1

        # Bear conditions
        bear_conditions = 0
        bear_total = 4
        if nifty_day_change_pct < -0.3:
            bear_conditions += 1
        if nifty_5day_change_pct < -1.0:
            bear_conditions += 1
        if ad_ratio < 0.67:
            bear_conditions += 1
        if vix > 18:
            bear_conditions += 1

        # Volatile conditions
        volatile_conditions = 0
        volatile_total = 2
        if vix > 22:
            volatile_conditions += 1
        if abs(nifty_day_change_pct) > 0.5:
            volatile_conditions += 1

        # Sideways conditions
        sideways_conditions = 0
        sideways_total = 2
        if -0.3 <= nifty_day_change_pct <= 0.3:
            sideways_conditions += 1
        if 12 <= vix <= 18:
            sideways_conditions += 1

        # Determine regime by highest confidence score
        scores: Dict[str, float] = {}
        if bull_total > 0:
            scores["Bull"] = bull_conditions / bull_total
        if bear_total > 0:
            scores["Bear"] = bear_conditions / bear_total
        if volatile_total > 0:
            scores["Volatile"] = volatile_conditions / volatile_total
        if sideways_total > 0:
            scores["Sideways"] = sideways_conditions / sideways_total

        # Pick regime with highest score
        regime = max(scores, key=scores.get)
        confidence = scores[regime]

        # If Volatile wins, give it priority when VIX is very high
        if vix > 25 and scores.get("Volatile", 0) >= 0.5:
            regime = "Volatile"
            confidence = scores.get("Volatile", confidence)

        details["bull_score"] = scores.get("Bull", 0.0)
        details["bear_score"] = scores.get("Bear", 0.0)
        details["volatile_score"] = scores.get("Volatile", 0.0)
        details["sideways_score"] = scores.get("Sideways", 0.0)
        details["bull_conditions_met"] = bull_conditions
        details["bear_conditions_met"] = bear_conditions

        if sector_data:
            details["sector_data"] = sector_data

        return {
            "regime": regime,
            "confidence": confidence,
            "details": details,
        }
