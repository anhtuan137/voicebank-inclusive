"""Central configuration for the orchestrator (§16 BUILD_SPEC).

All secrets/endpoints come from environment variables; container env overrides
`.env`. No secret is ever hardcoded (§3.2). Business constants here MUST match
§7 of the BUILD_SPEC.
"""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    # --- Provider selection -------------------------------------------------
    stt_provider: str = "smoke"
    tts_provider: str = "smoke"
    nlu_provider: str = "smoke"

    # --- Ports --------------------------------------------------------------
    voice2text_port: int = 18889
    mockapi_port: int = 18890
    web_port: int = 18891

    # --- Service wiring -----------------------------------------------------
    banking_backend_base_url: str = "http://localhost:18890"
    mockapi_base_url: str = "http://localhost:18890"
    audio_backend_base_url: str = "http://localhost:18889"

    # --- Idle / agent behaviour --------------------------------------------
    idle_timeout_secs: int = 20
    max_idle_reprompts: int = 2
    agent_available_start: int = 8
    agent_available_end: int = 22

    # --- Business constants (must match §7) --------------------------------
    transfer_kyc_threshold: int = 10_000_000
    transfer_daily_kyc_threshold: int = 20_000_000
    max_auth_attempts: int = 5
    lock_minutes: int = 15
    otp_ttl_minutes: int = 5

    # --- Persistence --------------------------------------------------------
    db_source: str = "json"
    database_url: str = ""

    # --- Logging ------------------------------------------------------------
    log_level: str = "INFO"

    # --- Frontend / CORS ----------------------------------------------------
    frontend_cors_origins: str = "http://localhost:18891"

    # --- Feature flags ------------------------------------------------------
    feature_demo: bool = False

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.frontend_cors_origins.split(",") if o.strip()]


settings = Settings()
