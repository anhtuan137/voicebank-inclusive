# VoiceBank Inclusive — developer entrypoints (§17 BUILD_SPEC)
.DEFAULT_GOAL := help
.PHONY: help install install-web run-voice2text run-mockapi run-web demo \
        infra-up infra-down test lint compose-config

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## Create venv + install Python deps (uv)
	uv venv --python 3.11
	uv pip install -r requirements.txt
	uv pip install pytest==8.3.0 pytest-asyncio==0.23.0 ruff

install-web: ## Install frontend deps (Phase 6)
	cd application/frontend && npm install

run-voice2text: ## Run orchestrator on :18889
	.venv/bin/python -m voice2text.server

run-mockapi: ## Run mock bank core on :18890
	.venv/bin/python -m mockapi.server

run-web: ## Run Next.js frontend on :18891 (Phase 6)
	cd application/frontend && npm run dev

demo: ## Chạy mockapi (:18890) + frontend (:18891) cùng lúc — Ctrl+C tắt cả hai
	@echo "▶ mockapi :18890  +  frontend :18891 — nhấn Ctrl+C để dừng cả hai"
	@trap 'kill 0' EXIT INT TERM; \
	.venv/bin/python -m mockapi.server & \
	( cd application/frontend && npm run dev ) & \
	wait

infra-up: ## Start postgres + minio + mockapi via Docker
	docker compose -f docker/docker-compose.infra.yml --env-file .env up -d

infra-down: ## Stop infra stack
	docker compose -f docker/docker-compose.infra.yml --env-file .env down

test: ## Run Python test suite
	.venv/bin/python -m pytest voice2text/tests mockapi/tests -p no:asyncio

lint: ## Ruff lint
	.venv/bin/ruff check voice2text mockapi

compose-config: ## Validate Docker Compose files
	docker compose -f docker/docker-compose.infra.yml --env-file .env config -q && \
	docker compose -f docker/docker-compose.yml --env-file .env config -q && \
	echo "compose OK"
