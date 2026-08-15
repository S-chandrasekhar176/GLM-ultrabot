import logging
from typing import Any, Dict, List, Optional
import httpx

from brokers.base import BaseBroker
from errors.error_types import BrokerError

logger = logging.getLogger(__name__)

_BASE_URL = "https://api-t1.fyers.in/api/v3"


class FyersBroker(BaseBroker):
    """Fyers API v3 broker integration.
    
    Documentation: https://myapi.fyers.in/docsv3
    Requires app_id and access_token.
    """

    def __init__(
        self,
        app_id: str = "",
        access_token: str = "",
        secret_key: str = "",
        pin: str = "",
        account_type: str = "live",
        client_id: str = "",
        config: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(config)
        self.app_id = app_id or client_id or self.config.get("app_id", self.config.get("client_id", ""))
        self.access_token = access_token or self.config.get("access_token", "")
        self.secret_key = secret_key or self.config.get("secret_key", "")
        self.pin = pin or self.config.get("pin", "")
        self.account_type = account_type
        self._client: Optional[httpx.AsyncClient] = None
        self._authenticated = False

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=_BASE_URL,
                timeout=30.0,
                headers=self._headers(),
            )
        return self._client

    def _headers(self) -> Dict[str, str]:
        auth_header = f"{self.app_id}:{self.access_token}" if self.app_id and self.access_token else self.access_token
        return {
            "Authorization": auth_header,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def authenticate(self) -> Dict[str, Any]:
        """Validate Fyers credentials by checking profile/funds."""
        try:
            client = self._get_client()
            response = await client.get("/profile", headers=self._headers())
            
            if response.status_code == 200 and response.json().get("s") == "ok":
                self._authenticated = True
                return {
                    "success": True,
                    "message": "Fyers v3 authentication successful",
                    "data": response.json(),
                }
            
            # Try user_funds endpoint as secondary check
            funds_resp = await client.get("/user_funds", headers=self._headers())
            if funds_resp.status_code == 200 and funds_resp.json().get("s") == "ok":
                self._authenticated = True
                return {
                    "success": True,
                    "message": "Fyers v3 authentication successful",
                    "data": funds_resp.json(),
                }

            return {
                "success": False,
                "message": f"Fyers authentication failed: {response.text}",
            }
        except Exception as exc:
            logger.error("Fyers authentication error: %s", exc, exc_info=True)
            return {
                "success": False,
                "message": f"Fyers connection error: {str(exc)}",
            }

    async def get_ltp(self, symbol: str, exchange: str = "NSE") -> float:
        """Fetch latest LTP from Fyers quotes API."""
        try:
            fyers_sym = f"{exchange}:{symbol}-EQ"
            client = self._get_client()
            response = await client.post("/data/quotes", json={"symbols": fyers_sym}, headers=self._headers())
            if response.status_code == 200:
                data = response.json()
                if data.get("s") == "ok" and data.get("d"):
                    val = data["d"][0].get("v", {}).get("lp", 0.0)
                    if val > 0:
                        return float(val)

            try:
                from feeds.feed_manager import FeedManager
                feed = FeedManager()
                price = await feed.get_latest_price(symbol)
                if price and price > 0:
                    return float(price)
            except Exception:
                pass
            return 0.0
        except Exception as exc:
            logger.warning("Failed to fetch Fyers LTP for %s: %s", symbol, exc)
            return 0.0

    async def get_margin(self) -> Dict[str, float]:
        """Get available margin/funds from Fyers."""
        try:
            client = self._get_client()
            response = await client.get("/user_funds", headers=self._headers())
            if response.status_code == 200:
                data = response.json()
                if data.get("s") == "ok":
                    fund_limit = data.get("fund_limit", [])
                    avail = 100000.0
                    used = 0.0
                    for f in fund_limit:
                        if f.get("title") == "Total Balance":
                            avail = float(f.get("equityAmount", 100000.0))
                        elif f.get("title") == "Utilized Amount":
                            used = float(f.get("equityAmount", 0.0))
                    return {
                        "available": avail,
                        "used": used,
                        "total": avail + used,
                    }
        except Exception as exc:
            logger.warning("Failed to fetch Fyers margin: %s", exc)

        return {"available": 100000.0, "used": 0.0, "total": 100000.0}

    async def place_order(
        self,
        symbol: str,
        exchange: str,
        transaction_type: str,
        quantity: int,
        price: float,
        order_type: str = "MARKET",
        product: str = "MIS",
        segment: str = "EQ",
    ) -> Dict[str, Any]:
        """Place order on Fyers API v3."""
        try:
            client = self._get_client()
            
            # Fyers type: 1 = Limit, 2 = Market
            fyers_type = 2 if order_type == "MARKET" else 1
            # Fyers side: 1 = Buy, -1 = Sell
            fyers_side = 1 if transaction_type.upper() == "BUY" else -1
            fyers_product = "INTRADAY" if product in ("MIS", "INTRADAY") else "CNC"
            fyers_symbol = f"{exchange}:{symbol}-EQ" if segment == "EQ" else f"{exchange}:{symbol}"

            payload = {
                "symbol": fyers_symbol,
                "qty": quantity,
                "type": fyers_type,
                "side": fyers_side,
                "productType": fyers_product,
                "limitPrice": price if fyers_type == 1 else 0,
                "stopPrice": 0,
                "validity": "DAY",
                "disclosedQty": 0,
                "offlineOrder": False,
            }

            response = await client.post("/orders/sync", json=payload, headers=self._headers())
            if response.status_code in (200, 201):
                data = response.json()
                if data.get("s") == "ok":
                    return {
                        "success": True,
                        "order_id": str(data.get("id", "FYERS-ORD-001")),
                        "message": "Order placed successfully on Fyers",
                        "data": data,
                    }
            return {
                "success": False,
                "order_id": None,
                "message": f"Fyers order failed: {response.text}",
            }
        except Exception as exc:
            logger.error("Fyers place_order error: %s", exc, exc_info=True)
            return {
                "success": False,
                "order_id": None,
                "message": f"Fyers place_order error: {str(exc)}",
            }

    async def cancel_order(self, order_id: str) -> Dict[str, Any]:
        """Cancel pending order on Fyers."""
        try:
            client = self._get_client()
            response = await client.delete("/orders/sync", json={"id": order_id}, headers=self._headers())
            if response.status_code == 200 and response.json().get("s") == "ok":
                return {"success": True, "message": f"Order {order_id} cancelled on Fyers"}
            return {"success": False, "message": f"Fyers cancel failed: {response.text}"}
        except Exception as exc:
            return {"success": False, "message": str(exc)}

    async def get_positions(self) -> List[Dict[str, Any]]:
        """Get open positions from Fyers."""
        try:
            client = self._get_client()
            response = await client.get("/positions", headers=self._headers())
            if response.status_code == 200:
                data = response.json()
                if data.get("s") == "ok":
                    pos_list = data.get("netPositions", [])
                    res = []
                    for p in pos_list:
                        qty = int(p.get("netQty", 0))
                        if qty != 0:
                            res.append({
                                "symbol": p.get("symbol", "UNKNOWN"),
                                "quantity": qty,
                                "avg_price": float(p.get("avgPrice", 0.0)),
                                "pnl": float(p.get("pl", 0.0)),
                                "side": "BUY" if qty > 0 else "SELL",
                            })
                    return res
        except Exception as exc:
            logger.warning("Failed to fetch Fyers positions: %s", exc)
        return []

    async def get_order_status(self, order_id: str) -> Dict[str, Any]:
        """Get order status from Fyers."""
        try:
            client = self._get_client()
            response = await client.get("/orders", headers=self._headers())
            if response.status_code == 200:
                data = response.json()
                for o in data.get("orderBook", []):
                    if str(o.get("id")) == str(order_id):
                        return {
                            "status": "COMPLETE" if o.get("status") == 2 else "PENDING",
                            "filled_qty": o.get("filledQty", 0),
                            "avg_price": float(o.get("tradedPrice", 0.0)),
                        }
        except Exception as exc:
            logger.warning("Failed to fetch Fyers order status: %s", exc)
        return {"status": "COMPLETE", "filled_qty": 0, "avg_price": 0.0}

    def get_name(self) -> str:
        return "fyers"
