import os
import yaml
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Any, Dict


class Settings(BaseSettings):
    """Application settings loaded from defaults.yaml with .env overrides."""

    # app
    app_name: str = "UltraBot Web"
    app_version: str = "1.0.0"
    app_secret_key: str = "change-me-in-production"
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    # auth
    auth_username: str = "admin"
    auth_password_hash: str = ""

    # Store full nested config (not a Pydantic field — set in __init__)
    _raw_config: Dict[str, Any] = {}

    model_config = ConfigDict(
        extra="ignore",
        env_file=".env",
        env_file_encoding="utf-8",
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._raw_config = {}
        self._load_yaml()

    def _load_yaml(self):
        """Load defaults.yaml and merge with env overrides."""
        yaml_path = Path(__file__).parent / "defaults.yaml"
        if yaml_path.exists():
            with open(yaml_path, "r") as f:
                self._raw_config = yaml.safe_load(f) or {}
        # Override with env vars
        self._apply_env_overrides()

    def _apply_env_overrides(self):
        """Apply environment variable overrides to both flat and nested config."""
        if os.getenv("SECRET_KEY"):
            self.app_secret_key = os.getenv("SECRET_KEY")
        if os.getenv("APP_PORT"):
            self.app_port = int(os.getenv("APP_PORT"))
        if os.getenv("APP_HOST"):
            self.app_host = os.getenv("APP_HOST")
        if os.getenv("APP_NAME"):
            self.app_name = os.getenv("APP_NAME")

    def get(self, *keys, default=None) -> Any:
        """Get nested config value using dot-path: get('risk', 'max_open_positions')"""
        val = self._raw_config
        for key in keys:
            if isinstance(val, dict) and key in val:
                val = val[key]
            else:
                return default
        return val

    def get_risk_config(self) -> Dict[str, Any]:
        return self._raw_config.get("risk", {})

    def get_capital_config(self) -> Dict[str, Any]:
        return self._raw_config.get("capital", {})

    def get_broker_config(self, name: str) -> Dict[str, Any]:
        brokers = self._raw_config.get("brokers", {})
        return brokers.get(name, {})

    def get_strategy_activation(self, regime: str) -> Dict[str, Any]:
        activation = self._raw_config.get("strategy_activation", {})
        return activation.get(regime, {})

    def get_partial_booking_config(self) -> Dict[str, Any]:
        return self._raw_config.get("partial_booking", {})

    def get_position_sizing_config(self) -> Dict[str, Any]:
        return self._raw_config.get("position_sizing", {})

    def get_fees_config(self) -> Dict[str, Any]:
        return self._raw_config.get("fees", {})

    def get_market_config(self) -> Dict[str, Any]:
        return self._raw_config.get("market", {})

    def get_engine_config(self) -> Dict[str, Any]:
        return self._raw_config.get("engine", {})

    def get_notifications_config(self) -> Dict[str, Any]:
        return self._raw_config.get("notifications", {})

    def get_regime_config(self) -> Dict[str, Any]:
        return self._raw_config.get("regime", {})

    def get_watchlist_config(self) -> Dict[str, Any]:
        return self._raw_config.get("watchlist", {})

    @property
    def secret_key(self) -> str:
        return self.app_secret_key


settings = Settings()
