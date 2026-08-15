"""Build and merge watchlists from multiple sources.

Combines symbols from news, technical scanner, and Kronos scanner
into a final deduplicated, scored watchlist.
"""
import logging
from typing import Any, Dict, List, Optional, Set

from utils.market_utils import is_fno_stock, get_all_fno_symbols

logger = logging.getLogger(__name__)

# Score multipliers per source
_SOURCE_MULTIPLIERS = {
    "news_high": 1.0,
    "news_medium": 0.7,
    "news_low": 0.4,
    "technical_high": 0.9,
    "technical_medium": 0.6,
    "technical_low": 0.3,
    "kronos": 1.0,
    "manual": 0.5,
}

# Minimum confidence to include
_MIN_CONFIDENCE = 0.3


class WatchlistBuilder:
    """Build watchlists from news, technical, and Kronos scanner results.

    Merges and deduplicates symbols, combining scores from multiple
    sources into a final ranked watchlist.
    """

    def __init__(self, max_watchlist_size: int = 40, min_confidence: float = _MIN_CONFIDENCE):
        self.max_watchlist_size = max_watchlist_size
        self.min_confidence = min_confidence
        self._fno_set: Optional[Set[str]] = None

    def _get_fno_set(self) -> Set[str]:
        if self._fno_set is None:
            self._fno_set = set(get_all_fno_symbols())
        return self._fno_set

    def build_from_news(self, news_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract symbols from news items.

        Args:
            news_items: List of news item dicts with 'symbols', 'impact_level', 'sentiment'.

        Returns:
            List of {symbol, source, score, reason} dicts.
        """
        results = []
        fno_set = self._get_fno_set()
        seen = set()

        for item in news_items:
            impact = item.get("impact_level", "low").lower()
            sentiment = item.get("sentiment", "neutral").lower()
            headline = item.get("headline", "")
            symbols = item.get("symbols", [])

            if isinstance(symbols, str):
                symbols = [symbols]

            for sym in symbols:
                sym_upper = sym.upper()
                if sym_upper in seen:
                    continue
                # Only include F&O stocks
                if fno_set and sym_upper not in fno_set:
                    continue
                seen.add(sym_upper)

                # Calculate score
                base_key = f"news_{impact}"
                base_score = _SOURCE_MULTIPLIERS.get(base_key, 0.3)
                if sentiment == "positive":
                    base_score *= 1.1
                elif sentiment == "negative":
                    base_score *= 0.7
                base_score = min(base_score, 1.0)

                if base_score < self.min_confidence:
                    continue

                results.append({
                    "symbol": sym_upper,
                    "source": "news",
                    "score": round(base_score, 3),
                    "reason": headline[:80],
                    "impact_level": impact,
                    "sentiment": sentiment,
                })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results

    def build_from_technical(self, technical_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Convert technical scanner results to watchlist additions.

        Args:
            technical_results: List from TechnicalScanner.scan().

        Returns:
            List of {symbol, source, score, reason} dicts.
        """
        results = []
        seen = set()

        for item in technical_results:
            symbol = item.get("symbol", "").upper()
            if symbol in seen:
                continue
            seen.add(symbol)

            confidence = item.get("confidence", 0)
            setup_type = item.get("setup_type", "")
            details = item.get("details", {})

            if confidence < self.min_confidence:
                continue

            # Use confidence directly as score, capped
            score = min(confidence, 1.0)

            reason = setup_type.replace("_", " ").title()
            if "distance_pct" in details:
                reason += f" ({details['distance_pct']:.1f}% away)"
            elif "volume_ratio" in details:
                reason += f" ({details['volume_ratio']:.1f}x vol)"

            results.append({
                "symbol": symbol,
                "source": "technical",
                "score": round(score, 3),
                "reason": reason,
                "setup_type": setup_type,
                "confidence": confidence,
            })

        return results

    def merge_lists(
        self,
        news_list: Optional[List[Dict[str, Any]]] = None,
        technical_list: Optional[List[Dict[str, Any]]] = None,
        kronos_list: Optional[List[Dict[str, Any]]] = None,
        existing_watchlist: Optional[List[Dict[str, Any]]] = None,
    ) -> List[Dict[str, Any]]:
        """Merge multiple source lists into a final scored watchlist.

        Symbols appearing in multiple sources get a score boost.
        Deduplication is done by symbol.

        Args:
            news_list: Symbols from news scanning.
            technical_list: Symbols from technical scanning.
            kronos_list: Symbols from Kronos scanning (with 'score' field).
            existing_watchlist: Current watchlist to preserve.

        Returns:
            Final deduplicated, scored watchlist sorted by score (desc).
        """
        news_list = news_list or []
        technical_list = technical_list or []
        kronos_list = kronos_list or []
        existing_watchlist = existing_watchlist or []

        # Accumulate scores per symbol
        symbol_scores: Dict[str, Dict[str, Any]] = {}

        # Process existing watchlist
        for item in existing_watchlist:
            sym = item.get("symbol", "").upper()
            if sym:
                symbol_scores.setdefault(sym, {
                    "symbol": sym,
                    "score": 0.0,
                    "sources": [],
                    "reasons": [],
                    "is_existing": True,
                })
                symbol_scores[sym]["score"] += item.get("score", 0.3)
                symbol_scores[sym]["sources"].append("existing")
                reason = item.get("reason", "")
                if reason:
                    symbol_scores[sym]["reasons"].append(reason)

        # Process news list
        for item in news_list:
            sym = item.get("symbol", "").upper()
            if not sym:
                continue
            symbol_scores.setdefault(sym, {
                "symbol": sym,
                "score": 0.0,
                "sources": [],
                "reasons": [],
                "is_existing": False,
            })
            news_score = item.get("score", 0.5)
            if "news" not in symbol_scores[sym]["sources"]:
                symbol_scores[sym]["score"] += news_score
                symbol_scores[sym]["sources"].append("news")
                reason = item.get("reason", "")
                if reason:
                    symbol_scores[sym]["reasons"].append(f"[News] {reason}")
                # Add bias info
                sentiment = item.get("sentiment", "")
                if sentiment:
                    bias = "BUY" if sentiment == "positive" else ("SELL" if sentiment == "negative" else "")
                    symbol_scores[sym]["bias"] = bias

        # Process technical list
        for item in technical_list:
            sym = item.get("symbol", "").upper()
            if not sym:
                continue
            symbol_scores.setdefault(sym, {
                "symbol": sym,
                "score": 0.0,
                "sources": [],
                "reasons": [],
                "is_existing": False,
            })
            tech_score = item.get("score", 0.5)
            if "technical" not in symbol_scores[sym]["sources"]:
                symbol_scores[sym]["score"] += tech_score
                symbol_scores[sym]["sources"].append("technical")
                reason = item.get("reason", "")
                if reason:
                    symbol_scores[sym]["reasons"].append(f"[Tech] {reason}")

        # Process kronos list
        for item in kronos_list:
            sym = item.get("symbol", "").upper()
            if not sym:
                continue
            symbol_scores.setdefault(sym, {
                "symbol": sym,
                "score": 0.0,
                "sources": [],
                "reasons": [],
                "is_existing": False,
            })
            kronos_score = item.get("score", 0)
            if "kronos" not in symbol_scores[sym]["sources"]:
                symbol_scores[sym]["score"] += kronos_score * 0.5
                symbol_scores[sym]["sources"].append("kronos")
                reasons = item.get("reasons", [])
                for r in reasons:
                    symbol_scores[sym]["reasons"].append(f"[Kronos] {r}")

        # Multi-source boost
        final_list = []
        for sym, data in symbol_scores.items():
            source_count = len([s for s in data["sources"] if s != "existing"])
            score = data["score"]

            # Boost for appearing in multiple sources
            if source_count >= 3:
                score *= 1.3
            elif source_count >= 2:
                score *= 1.15

            score = min(score, 1.0)

            if score < self.min_confidence:
                continue

            final_list.append({
                "symbol": sym,
                "score": round(score, 3),
                "sources": data["sources"],
                "reasons": data["reasons"][:3],  # Top 3 reasons
                "source_count": source_count,
                "is_existing": data.get("is_existing", False),
                "bias": data.get("bias", ""),
            })

        final_list.sort(key=lambda x: (x["score"], x["source_count"]), reverse=True)
        return final_list[:self.max_watchlist_size]
