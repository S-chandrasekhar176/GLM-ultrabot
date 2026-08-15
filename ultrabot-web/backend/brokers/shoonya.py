import hashlib
import json
import logging
from typing import Any, Dict, List, Optional

import httpx

from brokers.base import BaseBroker
from brokers.token_manager import TokenManager
from errors.error_types import BrokerError, ConnectionLostError, TokenExpiredError

logger = logging.getLogger(__name__)

# Shoonya Noren REST API endpoints
_BASE_URL = "https://api.shoonya.com/NorenWClientTP"
_LOGIN_URL = f"{_BASE_URL}/QuickAuth"
_QUOTE_URL = f"{_BASE_URL}/GetQuotes"
_MARGIN_URL = f"{_BASE_URL}/Limits"
_ORDER_URL = f"{_BASE_URL}/PlaceOrder"
_CANCEL_URL = f"{_BASE_URL}/CancelOrder"
_ORDER_STATUS_URL = f"{_BASE_URL}/OrderBook"
_POSITIONS_URL = f"{_BASE_URL}/PositionBook"
_HOLDINGS_URL = f"{_BASE_URL}/Holdings"


class ShoonyaBroker(BaseBroker):
    """Shoonya (Noren) broker integration.

    Uses httpx for HTTP calls to Shoonya's Noren REST API.
    Requires user_id, password, vendor_code, and app_key for authentication.
    """

    def __init__(
        self,
        user_id: str = "",
        password: str = "",
        vendor_code: str = "",
        app_key: str = "",
        token_manager: Optional[TokenManager] = None,
    ):
        self.user_id = user_id
        self.password = password
        self.vendor_code = vendor_code
        self.app_key = app_key
        self.token_manager = token_manager or TokenManager()
        self._client: Optional[httpx.AsyncClient] = None
        self._authenticated = False
        self._session_token: str = ""

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=_BASE_URL,
                timeout=30.0,
                headers={"Content-Type": "application/json", "Accept": "application/json"},
            )
        return self._client

    def _auth_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self._session_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    @staticmethod
    def _sha256(data: str) -> str:
        return hashlib.sha256(data.encode("utf-8")).hexdigest()

    async def authenticate(self) -> Dict[str, Any]:
        try:
            client = self._get_client()
            password_hash = self._sha256(self.password)
            payload = {
                "uid": self.user_id,
                "pwd": password_hash,
                "factor2": password_hash,
                "vc": self.vendor_code,
                "appkey": self.app_key,
                "deviceType": "WEB",
            }

            # Shoonya uses form-encoded data
            response = await client.post(_LOGIN_URL, data=payload)
            response.raise_for_status()
            data = response.json()

            if data.get("stat") == "Ok":
                self._session_token = data.get("susertoken", "")
                self._authenticated = True

                self.token_manager.store_token(
                    broker_name="shoonya",
                    access_token=self._session_token,
                    refresh_token="",
                    extra={
                        "actid": data.get("actid", self.user_id),
                        "ls": data.get("ls", ""),
                    },
                )

                logger.info("Shoonya authentication successful for user %s", self.user_id)
                return {"success": True, "message": "Authenticated with Shoonya"}
            else:
                msg = data.get("emsg", "Login failed")
                logger.error("Shoonya auth failed: %s", msg)
                return {"success": False, "message": msg}

        except httpx.HTTPStatusError as e:
            logger.error("Shoonya auth HTTP error: %s", e)
            return {"success": False, "message": f"HTTP error: {e.response.status_code}"}
        except httpx.RequestError as e:
            logger.error("Shoonya auth connection error: %s", e)
            raise ConnectionLostError(broker="shoonya", what_happened=str(e)) from e
        except Exception as e:
            logger.error("Shoonya auth unexpected error: %s", e)
            return {"success": False, "message": str(e)}

    async def _refresh_if_needed(self) -> bool:
        if self.token_manager.is_expired("shoonya"):
            result = await self.authenticate()
            return result.get("success", False)
        return False

    async def get_ltp(self, symbol: str, exchange: str = "NSE") -> float:
        await self._refresh_if_needed()
        try:
            client = self._get_client()
            payload = {
                "uid": self.user_id,
                "token": f"{exchange}|{symbol}",
            }
            response = await client.post(_QUOTE_URL, data=payload, headers=self._auth_headers())
            response.raise_for_status()
            data = response.json()

            if data.get("stat") == "Ok":
                lp_str = data.get("lp", "0")
                if lp_str:
                    return float(lp_str)
            return 0.0
        except TokenExpiredError:
            raise
        except Exception as e:
            logger.warning("Failed to get LTP for %s: %s", symbol, e)
            return 0.0

    async def get_margin(self) -> Dict[str, float]:
        await self._refresh_if_needed()
        try:
            client = self._get_client()
            payload = {"uid": self.user_id}
            response = await client.post(_MARGIN_URL, data=payload, headers=self._auth_headers())
            response.raise_for_status()
            data = response.json()

            if data.get("stat") == "Ok":
                return {
                    "total": float(data.get("eqmargin", {}).get("net", 0)),
                    "available": float(data.get("eqmargin", {}).get("availablecash", 0)),
                    "used": float(data.get("eqmargin", {}).get("utilisedmargin", 0)),
                }
            return {"total": 0.0, "available": 0.0, "used": 0.0}
        except Exception as e:
            logger.error("Failed to get margin: %s", e)
            return {"total": 0.0, "available": 0.0, "used": 0.0}

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
        await self._refresh_if_needed()
        try:
            client = self._get_client()

            # Shoonya transaction type codes
            tx_type = "B" if transaction_type.upper() == "BUY" else "S"
            prctyp = "MKT" if order_type.upper() == "MARKET" else "LMT"

            # Shoonya product codes
            shoonya_product = {"MIS": "I", "CNC": "C", "NRML": "M"}
            prod_code = shoonya_product.get(product, "I")

            payload = {
                "uid": self.user_id,
                "actid": self.user_id,
                "exch": exchange,
                "tsym": symbol,
                "qty": str(quantity),
                "prc": "0" if order_type.upper() == "MARKET" else str(price),
                "prctyp": prctyp,
                "ret": "DAY",
                "trantype": tx_type,
                "prd": prod_code,
            }

            response = await client.post(_ORDER_URL, data=payload, headers=self._auth_headers())
            response.raise_for_status()
            data = response.json()

            if data.get("stat") == "Ok":
                order_id = data.get("norenordno", "")
                return {
                    "success": True,
                    "order_id": order_id,
                    "message": f"Order placed: {transaction_type} {quantity} {symbol}",
                }
            else:
                return {
                    "success": False,
                    "order_id": None,
                    "message": data.get("emsg", "Order placement failed"),
                }
        except Exception as e:
            logger.error("Failed to place order for %s: %s", symbol, e)
            return {"success": False, "order_id": None, "message": str(e)}

    async def cancel_order(self, order_id: str) -> Dict[str, Any]:
        await self._refresh_if_needed()
        try:
            client = self._get_client()
            payload = {
                "uid": self.user_id,
                "norenordno": order_id,
            }
            response = await client.post(_CANCEL_URL, data=payload, headers=self._auth_headers())
            response.raise_for_status()
            data = response.json()

            if data.get("stat") == "Ok":
                return {"success": True, "message": f"Order {order_id} cancelled"}
            return {"success": False, "message": data.get("emsg", "Cancel failed")}
        except Exception as e:
            logger.error("Failed to cancel order %s: %s", order_id, e)
            return {"success": False, "message": str(e)}

    async def get_positions(self) -> List[Dict[str, Any]]:
        await self._refresh_if_needed()
        try:
            client = self._get_client()
            payload = {"uid": self.user_id, "actid": self.user_id}
            response = await client.post(_POSITIONS_URL, data=payload, headers=self._auth_headers())
            response.raise_for_status()
            data = response.json()

            if data.get("stat") == "Ok":
                positions = []
                for item in data.get("poslist", []):
                    net_qty = int(item.get("netqty", "0"))
                    if net_qty == 0:
                        continue
                    positions.append({
                        "symbol": item.get("tsym", ""),
                        "exchange": item.get("exch", ""),
                        "quantity": abs(net_qty),
                        "avg_price": float(item.get("avgprc", 0)),
                        "pnl": float(item.get("pnl", 0)),
                        "side": "LONG" if net_qty > 0 else "SHORT",
                    })
                return positions
            return []
        except Exception as e:
            logger.error("Failed to get positions: %s", e)
            return []

    async def get_order_status(self, order_id: str) -> Dict[str, Any]:
        await self._refresh_if_needed()
        try:
            client = self._get_client()
            payload = {"uid": self.user_id, "norenordno": order_id}
            response = await client.post(_ORDER_STATUS_URL, data=payload, headers=self._auth_headers())
            response.raise_for_status()
            data = response.json()

            if data.get("stat") == "Ok":
                orders = data.get("ordlist", [])
                if orders:
                    order = orders[0]
                    return {
                        "success": True,
                        "order_id": order_id,
                        "status": order.get("status", "UNKNOWN"),
                        "filled_qty": int(order.get("fillshares", "0")),
                        "filled_price": float(order.get("avgprc", "0")),
                        "symbol": order.get("tsym", ""),
                        "transaction_type": "BUY" if order.get("trantype", "") == "B" else "SELL",
                    }
            return {"success": False, "message": "Order not found"}
        except Exception as e:
            logger.error("Failed to get order status for %s: %s", order_id, e)
            return {"success": False, "message": str(e)}

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    def get_name(self) -> str:
        return "shoonya"
