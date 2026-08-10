import json
import logging
from typing import Any, Dict, List, Optional

import httpx

from brokers.base import BaseBroker
from brokers.token_manager import TokenManager
from errors.error_types import BrokerError, ConnectionLostError, TokenExpiredError

logger = logging.getLogger(__name__)

# Angel One SmartAPI endpoints
_BASE_URL = "https://apiconnect.angelone.in"
_LOGIN_URL = f"{_BASE_URL}/rest/auth/angelbroking/user/v1/loginByPassword"
_REFRESH_URL = f"{_BASE_URL}/rest/auth/angelbroking/jwt/v1/generateTokens"
_QUOTE_URL = f"{_BASE_URL}/rest/secure/angelbroking/marketData/v1/quote"
_MARGIN_URL = f"{_BASE_URL}/rest/secure/angelbroking/user/v1/getRms"
_ORDER_URL = f"{_BASE_URL}/rest/secure/angelbroking/order/v1/placeOrder"
_CANCEL_URL = f"{_BASE_URL}/rest/secure/angelbroking/order/v1/cancelOrder"
_ORDER_STATUS_URL = f"{_BASE_URL}/rest/secure/angelbroking/order/v1/orderDetails"
_POSITIONS_URL = f"{_BASE_URL}/rest/secure/angelbroking/position/v1/book"

# Symbol token mapping (sample, should be loaded from instrument dump)
_TOKEN_MAP: Dict[str, str] = {}


class AngelOneBroker(BaseBroker):
    """Angel One SmartAPI broker integration.

    Uses httpx for HTTP calls to Angel One's REST API.
    Requires api_key, client_code, and pin for authentication.
    """

    def __init__(
        self,
        api_key: str = "",
        client_code: str = "",
        pin: str = "",
        jwt_token: str = "",
        refresh_token: str = "",
        feed_token: str = "",
        token_manager: Optional[TokenManager] = None,
    ):
        self.api_key = api_key
        self.client_code = client_code
        self.pin = pin
        self.jwt_token = jwt_token
        self.refresh_token = refresh_token
        self.feed_token = feed_token
        self.token_manager = token_manager or TokenManager()
        self._client: Optional[httpx.AsyncClient] = None
        self._authenticated = False

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
            "Authorization": f"Bearer {self.jwt_token}",
            "X-ClientCode": self.client_code,
            "X-FeedToken": self.feed_token,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def authenticate(self) -> Dict[str, Any]:
        try:
            client = self._get_client()
            payload = {
                "clientcode": self.client_code,
                "password": self.pin,
            }
            headers = {
                "X-ClientPublicIP": "127.0.0.1",
                "X-PrivateKey": self.api_key,
                "Content-Type": "application/json",
            }
            response = await client.post(_LOGIN_URL, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

            if data.get("status") is True:
                self.jwt_token = data["data"].get("jwtToken", "")
                self.refresh_token = data["data"].get("refreshToken", "")
                self.feed_token = data["data"].get("feedToken", "")
                self._authenticated = True

                self.token_manager.store_token(
                    broker_name="angel_one",
                    access_token=self.jwt_token,
                    refresh_token=self.refresh_token,
                    extra={"feed_token": self.feed_token},
                )

                logger.info("Angel One authentication successful for client %s", self.client_code)
                return {"success": True, "message": "Authenticated with Angel One"}
            else:
                msg = data.get("message", "Login failed")
                logger.error("Angel One auth failed: %s", msg)
                return {"success": False, "message": msg}

        except httpx.HTTPStatusError as e:
            logger.error("Angel One auth HTTP error: %s", e)
            return {"success": False, "message": f"HTTP error: {e.response.status_code}"}
        except httpx.RequestError as e:
            logger.error("Angel One auth connection error: %s", e)
            raise ConnectionLostError(broker="angel_one", what_happened=str(e)) from e
        except Exception as e:
            logger.error("Angel One auth unexpected error: %s", e)
            return {"success": False, "message": str(e)}

    async def _refresh_if_needed(self) -> bool:
        if self.token_manager.is_expired("angel_one"):
            if self.refresh_token:
                try:
                    client = self._get_client()
                    payload = {
                        "refreshToken": self.refresh_token,
                    }
                    headers = {
                        "X-ClientPublicIP": "127.0.0.1",
                        "X-PrivateKey": self.api_key,
                        "Content-Type": "application/json",
                    }
                    response = await client.post(_REFRESH_URL, json=payload, headers=headers)
                    response.raise_for_status()
                    data = response.json()
                    if data.get("status") is True:
                        self.jwt_token = data["data"].get("jwtToken", "")
                        self.feed_token = data["data"].get("feedToken", "")
                        self.token_manager.store_token(
                            broker_name="angel_one",
                            access_token=self.jwt_token,
                            refresh_token=self.refresh_token,
                            extra={"feed_token": self.feed_token},
                        )
                        return True
                except Exception as e:
                    logger.error("Token refresh failed: %s", e)
                    raise TokenExpiredError(broker="angel_one") from e
            else:
                raise TokenExpiredError(broker="angel_one")
        return False

    async def get_ltp(self, symbol: str, exchange: str = "NSE") -> float:
        await self._refresh_if_needed()
        try:
            client = self._get_client()
            mode = "" if exchange == "NSE" else exchange
            payload = {
                "mode": mode,
                "exchangeTokens": _TOKEN_MAP.get(symbol, []),
            }
            response = await client.post(
                _QUOTE_URL, json=payload, headers=self._auth_headers()
            )
            response.raise_for_status()
            data = response.json()
            if data.get("status") is True and data.get("data", []):
                for item in data["data"]:
                    if item.get("symbol") == symbol:
                        ltp_str = item.get("ltp", "0")
                        return float(ltp_str)
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
            response = await client.get(_MARGIN_URL, headers=self._auth_headers())
            response.raise_for_status()
            data = response.json()
            if data.get("status") is True:
                rms = data.get("data", {})
                return {
                    "total": float(rms.get("net", 0)),
                    "available": float(rms.get("availablecash", 0)),
                    "used": float(rms.get("utilisedmargin", 0)),
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
            variety = "NORMAL"
            product_code = product
            order_type_code = "MARKET" if order_type.upper() == "MARKET" else "LIMIT"
            transaction_type_code = "BUY" if transaction_type.upper() == "BUY" else "SELL"

            # Map product to Angel One codes
            ao_product_map = {"MIS": "MIS", "CNC": "CNC", "NRML": "NRML"}
            product_code = ao_product_map.get(product, "MIS")

            token = _TOKEN_MAP.get(symbol, "")

            payload = {
                "variety": variety,
                "tradingsymbol": symbol,
                "symboltoken": token,
                "transactiontype": transaction_type_code,
                "exchange": exchange,
                "ordertype": order_type_code,
                "producttype": product_code,
                "duration": "DAY",
                "price": str(price) if order_type.upper() == "LIMIT" else "0",
                "squareoff": "0",
                "stoploss": "0",
                "quantity": str(quantity),
            }

            response = await client.post(
                _ORDER_URL, json=payload, headers=self._auth_headers()
            )
            response.raise_for_status()
            data = response.json()

            if data.get("status") is True:
                order_id = data.get("data", {}).get("orderid", "")
                return {
                    "success": True,
                    "order_id": order_id,
                    "message": f"Order placed: {transaction_type_code} {quantity} {symbol}",
                }
            else:
                return {
                    "success": False,
                    "order_id": None,
                    "message": data.get("message", "Order placement failed"),
                }
        except Exception as e:
            logger.error("Failed to place order for %s: %s", symbol, e)
            return {"success": False, "order_id": None, "message": str(e)}

    async def cancel_order(self, order_id: str) -> Dict[str, Any]:
        await self._refresh_if_needed()
        try:
            client = self._get_client()
            payload = {
                "variety": "NORMAL",
                "orderid": order_id,
            }
            response = await client.post(
                _CANCEL_URL, json=payload, headers=self._auth_headers()
            )
            response.raise_for_status()
            data = response.json()
            if data.get("status") is True:
                return {"success": True, "message": f"Order {order_id} cancelled"}
            return {"success": False, "message": data.get("message", "Cancel failed")}
        except Exception as e:
            logger.error("Failed to cancel order %s: %s", order_id, e)
            return {"success": False, "message": str(e)}

    async def get_positions(self) -> List[Dict[str, Any]]:
        await self._refresh_if_needed()
        try:
            client = self._get_client()
            response = await client.get(
                _POSITIONS_URL, headers=self._auth_headers()
            )
            response.raise_for_status()
            data = response.json()
            if data.get("status") is True:
                positions = []
                for item in data.get("data", []):
                    positions.append({
                        "symbol": item.get("tradingsymbol", ""),
                        "exchange": item.get("exchange", ""),
                        "quantity": int(item.get("netqty", 0)),
                        "avg_price": float(item.get("avgprc", 0)),
                        "pnl": float(item.get("pnl", 0)),
                        "side": "LONG" if int(item.get("netqty", 0)) > 0 else "SHORT",
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
            payload = {
                "variety": "NORMAL",
                "orderid": order_id,
            }
            response = await client.post(
                _ORDER_STATUS_URL, json=payload, headers=self._auth_headers()
            )
            response.raise_for_status()
            data = response.json()
            if data.get("status") is True:
                order_data = data.get("data", {})
                return {
                    "success": True,
                    "order_id": order_id,
                    "status": order_data.get("status", "UNKNOWN"),
                    "filled_qty": int(order_data.get("filledquantity", 0)),
                    "filled_price": float(order_data.get("avgprc", 0)),
                    "symbol": order_data.get("tradingsymbol", ""),
                    "transaction_type": order_data.get("transactiontype", ""),
                }
            return {"success": False, "message": data.get("message", "Failed to get order status")}
        except Exception as e:
            logger.error("Failed to get order status for %s: %s", order_id, e)
            return {"success": False, "message": str(e)}

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    def get_name(self) -> str:
        return "angel_one"
