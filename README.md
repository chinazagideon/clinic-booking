# Clinic Booking API

Modular Monolith FastAPI implementation for the Clinic Booking API (`contract/openapi.json`).

## Architecture Overview

- **Presentation Layer (`src/api/`)**: FastAPI routers (`POST /reset`, `GET /slots`, `POST /bookings`, `GET /bookings`, `GET /bookings/{id}`, `DELETE /bookings/{id}`) with global `X-API-Key` security.
- **Business Logic Layer (`src/services/`)**:
  - `SlotService`: Slot reset and availability queries.
  - `BookingService`: Validation, concurrency control, cursor pagination, and lifecycle management.
  - `IdempotencyService`: Redis-backed request deduplication and payload hash comparison (Level 4).
  - `RateLimiterService`: Redis Sorted Set (ZSET) sliding-window rate limiter per email (Level 5).
- **Data Access Layer (`src/repositories/`)**: Async SQLAlchemy repositories with row-level locking (`SELECT ... FOR UPDATE`) and partial unique indexing (`WHERE status = 'confirmed'`).
- **Core Infrastructure (`src/core/`)**: Centralized exception handling (`{"error": "<message>"}`), `pydantic-settings` config, async database engine, and Redis client.

## Quick Start

### 1. Start Infrastructure (PostgreSQL & Redis)

```bash
docker compose up -d
```

### 2. Install Dependencies via `uv`

```bash
uv sync
```

### 3. Run the API Server

```bash
uv run uvicorn src.main:app --reload --port 8000
```

### 4. Run Automated Tests (Levels 1–5)

```bash
uv run pytest -v
```
