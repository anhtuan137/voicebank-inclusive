"""FastAPI app for the mock bank core (mockapi).

Các endpoint:
  GET  /health                          — health check
  GET  /api/v1/dashboard/*              — dashboard data (JSON hoặc Postgres)
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Tự load .env từ root project (2 cấp trên thư mục mockapi/)
load_dotenv(Path(__file__).parent.parent / ".env", override=False)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from mockapi.routers.dashboard import router as dashboard_router

DB_SOURCE = os.getenv("DB_SOURCE", "json")
FEATURE_DEMO = os.getenv("FEATURE_DEMO", "false").lower() in {"1", "true", "yes"}

# Origins được phép gọi API (Next.js frontend + dashboard)
_CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "FRONTEND_CORS_ORIGINS",
        "http://localhost:18891,http://localhost:3000",
    ).split(",")
    if o.strip()
]

app = FastAPI(
    title="VoiceBank Inclusive — Mock Bank Core",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard_router)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "mockapi",
        "db_source": DB_SOURCE,
    }


def main() -> None:
    import uvicorn

    uvicorn.run(
        "mockapi.server:app",
        host="0.0.0.0",
        port=int(os.getenv("MOCKAPI_PORT", "18890")),
        reload=True,
    )


if __name__ == "__main__":
    main()
