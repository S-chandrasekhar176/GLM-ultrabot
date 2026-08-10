import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from api.dependencies import get_current_user, get_repository
from db.repository import Repository
from utils.encryption import encrypt_credentials, decrypt_credentials

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/brokers", tags=["brokers"])


class BrokerCredentialInput(BaseModel):
    """Generic broker credential input."""
    client_id: str
    client_secret: str
    # Angel One specific
    api_key: Optional[str] = None
    # Shoonya specific
    user_id: Optional[str] = None
    password: Optional[str] = None
    totp_secret: Optional[str] = None
    # Optional account type
    account_type: Optional[str] = None
    # Optional pin for Angel One
    pin: Optional[str] = None


class ActiveBrokerRequest(BaseModel):
    broker: str = Field(..., pattern=r"^(paper|angel_one|shoonya)$")


@router.get("")
async def get_broker_status(
    username: str = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
) -> Dict[str, Any]:
    """Get status of all configured brokers."""
    try:
        creds = await repo.get_all_broker_credentials()
        brokers_status = []

        for cred in creds:
            # Check if encrypted credentials exist
            has_credentials = bool(cred.encrypted_credentials and cred.encrypted_credentials.strip())
            extra = {}
            try:
                if has_credentials:
                    extra = decrypt_credentials(cred.encrypted_credentials)
            except Exception:
                pass

            brokers_status.append({
                "broker_name": cred.broker_name,
                "has_credentials": has_credentials,
                "account_type": extra.get("account_type", None),
                "last_updated": cred.updated_at,
            })

        return {
            "brokers": brokers_status,
            "count": len(brokers_status),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to get broker status: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get broker status: {str(exc)}",
        )


@router.post("/angel-one/credentials")
async def save_angel_one_credentials(
    body: BrokerCredentialInput,
    username: str = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
) -> Dict[str, Any]:
    """Save (encrypted) Angel One broker credentials."""
    try:
        cred_data = {
            "client_id": body.client_id,
            "client_secret": body.client_secret,
            "api_key": body.api_key,
            "pin": body.pin,
        }
        encrypted = encrypt_credentials(cred_data)
        await repo.save_broker_credentials(
            broker_name="angel_one",
            encrypted_creds=encrypted,
            extra={"account_type": body.account_type},
        )
        logger.info("Angel One credentials saved/updated")
        return {"message": "Angel One credentials saved successfully"}
    except Exception as exc:
        logger.error("Failed to save Angel One credentials: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save credentials: {str(exc)}",
        )


@router.post("/shoonya/credentials")
async def save_shoonya_credentials(
    body: BrokerCredentialInput,
    username: str = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
) -> Dict[str, Any]:
    """Save (encrypted) Shoonya broker credentials."""
    try:
        cred_data = {
            "user_id": body.user_id or body.client_id,
            "password": body.password or body.client_secret,
            "totp_secret": body.totp_secret,
        }
        encrypted = encrypt_credentials(cred_data)
        await repo.save_broker_credentials(
            broker_name="shoonya",
            encrypted_creds=encrypted,
            extra={"account_type": body.account_type},
        )
        logger.info("Shoonya credentials saved/updated")
        return {"message": "Shoonya credentials saved successfully"}
    except Exception as exc:
        logger.error("Failed to save Shoonya credentials: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save credentials: {str(exc)}",
        )


@router.post("/angel-one/test")
async def test_angel_one(
    username: str = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
) -> Dict[str, Any]:
    """Test Angel One broker connection."""
    try:
        cred_record = await repo.get_broker_credentials("angel_one")
        if cred_record is None or not cred_record.encrypted_credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Angel One credentials not found. Please save credentials first.",
            )

        # Decrypt and attempt a test connection
        cred_data = decrypt_credentials(cred_record.encrypted_credentials)

        try:
            from brokers.angel_one import AngelOneBroker
            broker = AngelOneBroker(
                api_key=cred_data.get("api_key", ""),
                client_id=cred_data.get("client_id", ""),
                client_secret=cred_data.get("client_secret", ""),
                pin=cred_data.get("pin", ""),
            )
            await broker.authenticate()
            connected = True
            message = "Connection successful"
            # Disconnect after test
            if hasattr(broker, "disconnect"):
                await broker.disconnect()
        except Exception as conn_exc:
            connected = False
            message = f"Connection failed: {str(conn_exc)}"
            logger.warning("Angel One test connection failed: %s", conn_exc)

        return {
            "broker": "angel_one",
            "connected": connected,
            "message": message,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Angel One test error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Test failed: {str(exc)}",
        )


@router.post("/shoonya/test")
async def test_shoonya(
    username: str = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
) -> Dict[str, Any]:
    """Test Shoonya broker connection."""
    try:
        cred_record = await repo.get_broker_credentials("shoonya")
        if cred_record is None or not cred_record.encrypted_credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shoonya credentials not found. Please save credentials first.",
            )

        cred_data = decrypt_credentials(cred_record.encrypted_credentials)

        try:
            from brokers.shoonya import ShoonyaBroker
            broker = ShoonyaBroker(
                user_id=cred_data.get("user_id", ""),
                password=cred_data.get("password", ""),
                totp_secret=cred_data.get("totp_secret", ""),
            )
            await broker.authenticate()
            connected = True
            message = "Connection successful"
            if hasattr(broker, "disconnect"):
                await broker.disconnect()
        except Exception as conn_exc:
            connected = False
            message = f"Connection failed: {str(conn_exc)}"
            logger.warning("Shoonya test connection failed: %s", conn_exc)

        return {
            "broker": "shoonya",
            "connected": connected,
            "message": message,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Shoonya test error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Test failed: {str(exc)}",
        )


@router.put("/active")
async def set_active_broker(
    body: ActiveBrokerRequest,
    username: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """Set the active broker for the next engine session."""
    try:
        broker_name = body.broker
        if broker_name not in ("paper", "angel_one", "shoonya"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid broker: {broker_name}. Must be paper, angel_one, or shoonya.",
            )

        # Store in settings for next engine start
        from config.settings import settings
        engine_config = settings._raw_config.setdefault("engine", {})
        engine_config["default_broker"] = broker_name

        return {
            "message": f"Active broker set to '{broker_name}'",
            "active_broker": broker_name,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to set active broker: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set active broker: {str(exc)}",
        )
