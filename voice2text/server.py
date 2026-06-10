"""FastAPI app for the orchestrator (voice2text) — Phase 0 skeleton.

Exposes health/metadata only at this phase. WebSocket `/ws/bot`, verification
registry, flows and VNPT adapters land in Phase 2+ per §18.
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from voice2text.config import settings

app = FastAPI(title="VoiceBank Inclusive — Orchestrator", version="0.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "voice2text"}


@app.get("/info")
def info() -> dict:
    return {
        "service": "voice2text",
        "version": app.version,
        "providers": {
            "stt": settings.stt_provider,
            "tts": settings.tts_provider,
            "nlu": settings.nlu_provider,
        },
        "feature_demo": settings.feature_demo,
    }


def main() -> None:
    import uvicorn

    uvicorn.run(
        "voice2text.server:app",
        host="0.0.0.0",
        port=settings.voice2text_port,
        reload=False,
    )


if __name__ == "__main__":
    main()
