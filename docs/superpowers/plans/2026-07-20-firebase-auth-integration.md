# Firebase Auth Integration (Frontend Interceptor + Backend Verification) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every request from the Angular frontend to the FastAPI backend carries the user's Firebase ID token, and the backend verifies that token and scopes all measurement data by `user_id`, so one user can never read or delete another user's measurements.

**Architecture:** Frontend gets a functional `HttpInterceptorFn` that attaches `Authorization: Bearer <idToken>` to every request whose URL starts with `environment.apiUrl`. Backend gets a `firebase-admin`-backed FastAPI dependency (`get_current_user`) that verifies that token and yields the Firebase `uid`; every protected router depends on it and threads `user_id` through service → repository → SQL `WHERE` clause, alongside the existing `session_id` filter.

**Tech Stack:** Angular 21 (standalone, `provideHttpClient(withFetch())`), raw `firebase` JS SDK v12 (no `@angular/fire`), FastAPI, SQLAlchemy 2.x ORM (`DeclarativeBase`), PostgreSQL (Neon), `firebase-admin` Python SDK.

## Global Constraints

- Frontend: only the interceptor (plus one small `AuthService` addition it needs) — do not touch guards, routing, or any component.
- Backend: do not modify `app/api/probe.py` or `app/api/system.py` — they must remain public.
- Do not change any response schema (Pydantic response models stay byte-for-byte identical) — the frontend contract must not change.
- Backend work is based on `origin/feature/database` (which already has the SQLAlchemy/Postgres `MeasurementDB` model and DB-backed repository), not `main` — `main` is still 100% in-memory and lacks this entirely.
- `measurements.user_id` is `String, nullable=False, index=True`. Any pre-existing rows lacking `user_id` are treated as orphaned test data and deleted by the migration — this was confirmed with the user, no backfill needed.
- Preserve the existing repository/service/router layering — no new abstractions beyond what's needed to pass `user_id` through.

---

## Part A — Backend (`qos-network-backend`)

### Task 1: Create the working branch from `origin/feature/database`

**Files:**
- None (git only)

- [ ] **Step 1: Fetch and create the branch**

```bash
cd /Users/erickvzh/Desktop/proyecto-QOS/qos-network-backend
git fetch origin
git checkout -b feature/firebase-auth origin/feature/database
```

Expected: branch `feature/firebase-auth` created, tracking history that includes commit `5d19273 feat: postgres con SQLAlchemy y Neon`.

- [ ] **Step 2: Verify the DB-backed repository is present**

```bash
git show HEAD:app/repositories/measurements_repository.py | head -5
```

Expected: first lines import `SessionLocal` and `MeasurementDB` (confirms you're on the right branch, not `main`'s in-memory version).

---

### Task 2: Add `firebase-admin` dependency and the Firebase Admin SDK initializer

**Files:**
- Modify: `qos-network-backend/requirements.txt`
- Create: `qos-network-backend/app/core/firebase_admin.py`
- Create: `qos-network-backend/.env.example`

**Interfaces:**
- Produces: `get_firebase_app() -> firebase_admin.App` — lazily initializes (once) the Firebase Admin app from the `FIREBASE_CREDENTIALS_JSON` env var. Task 3 calls this before verifying tokens.

- [ ] **Step 1: Add the dependency**

Append to `requirements.txt`:

```
firebase-admin
```

- [ ] **Step 2: Install it locally so imports resolve**

```bash
cd /Users/erickvzh/Desktop/proyecto-QOS/qos-network-backend
pip install firebase-admin
```

Expected: installs without errors.

- [ ] **Step 3: Write `app/core/firebase_admin.py`**

```python
import json
import os
from typing import Optional

import firebase_admin
from firebase_admin import credentials

_app: Optional[firebase_admin.App] = None


def get_firebase_app() -> firebase_admin.App:
    global _app

    if _app is not None:
        return _app

    if firebase_admin._apps:
        _app = firebase_admin.get_app()
        return _app

    credentials_json = os.environ.get("FIREBASE_CREDENTIALS_JSON")

    if not credentials_json:
        raise RuntimeError(
            "FIREBASE_CREDENTIALS_JSON no está configurada. "
            "Debe contener el JSON del service account de Firebase."
        )

    service_account_info = json.loads(credentials_json)
    cred = credentials.Certificate(service_account_info)
    _app = firebase_admin.initialize_app(cred)

    return _app
```

- [ ] **Step 4: Document the new env var in `.env.example`**

```
DATABASE_URL=postgresql://user:password@localhost:5432/qos_db
FRONTEND_ORIGINS=http://localhost:4200,http://127.0.0.1:4200
FIREBASE_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}
```

- [ ] **Step 5: Verify it imports cleanly**

```bash
cd /Users/erickvzh/Desktop/proyecto-QOS/qos-network-backend
python -c "from app.core.firebase_admin import get_firebase_app; print('ok')"
```

Expected: prints `ok` (the function isn't called yet, so the missing env var doesn't matter here).

- [ ] **Step 6: Commit**

```bash
git add requirements.txt app/core/firebase_admin.py .env.example
git commit -m "feat: add firebase-admin SDK initializer"
```

---

### Task 3: Add `get_current_user` FastAPI dependency, with a test

**Files:**
- Create: `qos-network-backend/app/core/auth.py`
- Create: `qos-network-backend/tests/test_auth.py`

**Interfaces:**
- Consumes: `get_firebase_app()` from Task 2.
- Produces: `get_current_user(authorization: str | None = Header(default=None)) -> str` — raises `HTTPException(401)` on missing/malformed/invalid token, otherwise returns the Firebase `uid`. Task 7 wires this into every protected router via `Depends(get_current_user)`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_auth.py
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.core.auth import get_current_user


def test_get_current_user_returns_uid_for_valid_token():
    with patch("app.core.auth.get_firebase_app"), \
         patch("app.core.auth.firebase_auth.verify_id_token", return_value={"uid": "abc123"}):
        uid = get_current_user(authorization="Bearer valid-token")

    assert uid == "abc123"


def test_get_current_user_rejects_missing_header():
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(authorization=None)

    assert exc_info.value.status_code == 401


def test_get_current_user_rejects_malformed_header():
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(authorization="NotBearer sometoken")

    assert exc_info.value.status_code == 401


def test_get_current_user_rejects_invalid_token():
    with patch("app.core.auth.get_firebase_app"), \
         patch("app.core.auth.firebase_auth.verify_id_token", side_effect=ValueError("bad token")):
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(authorization="Bearer bad-token")

    assert exc_info.value.status_code == 401
```

- [ ] **Step 2: Run it to verify it fails (module doesn't exist yet)**

```bash
cd /Users/erickvzh/Desktop/proyecto-QOS/qos-network-backend
pip install pytest  # only if not already installed
pytest tests/test_auth.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'app.core.auth'`.

- [ ] **Step 3: Write `app/core/auth.py`**

```python
from typing import Optional

from fastapi import Header, HTTPException
from firebase_admin import auth as firebase_auth

from app.core.firebase_admin import get_firebase_app


def get_current_user(authorization: Optional[str] = Header(default=None)) -> str:
    if authorization is None:
        raise HTTPException(status_code=401, detail="Falta el header Authorization.")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="El header Authorization debe usar el esquema Bearer.")

    get_firebase_app()

    token = authorization.removeprefix("Bearer ").strip()

    try:
        decoded_token = firebase_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token de autenticación inválido o expirado.")

    return decoded_token["uid"]
```

- [ ] **Step 4: Run the test again to verify it passes**

```bash
pytest tests/test_auth.py -v
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/core/auth.py tests/test_auth.py
git commit -m "feat: add get_current_user Firebase token verification dependency"
```

---

### Task 4: Add `user_id` to `MeasurementDB` and a safe, idempotent migration

**Files:**
- Modify: `qos-network-backend/app/models/future_database_models.py`
- Modify: `qos-network-backend/app/core/database.py`
- Modify: `qos-network-backend/app/main.py`

**Interfaces:**
- Produces: `MeasurementDB.user_id` column; `ensure_user_id_column()` in `app/core/database.py`, called from the FastAPI `lifespan` in `app/main.py` right after `create_tables()`.

- [ ] **Step 1: Add the column to the model**

In `app/models/future_database_models.py`, add `user_id` to `MeasurementDB` (after `session_id`, matching its style):

```python
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

class MeasurementDB(Base):
    __tablename__ = "measurements"

    id                     = Column(Integer,  primary_key=True, autoincrement=True)
    session_id             = Column(String,   nullable=False, index=True)
    user_id                = Column(String,   nullable=False, index=True)
    latency_ms             = Column(Float,    nullable=False)
    jitter_ms              = Column(Float,    nullable=False)
    download_mbps          = Column(Float,    nullable=False)
    upload_mbps            = Column(Float,    nullable=True)
    failed_requests        = Column(Integer,  nullable=False, default=0)
    total_requests         = Column(Integer,  nullable=False)
    packet_loss_pct        = Column(Float,    nullable=False)
    measurement_duration_s = Column(Float,    nullable=False)
    device_type            = Column(String,   nullable=True)
    network_type           = Column(String,   nullable=True)
    client_timestamp       = Column(DateTime, nullable=True)
    server_timestamp       = Column(DateTime, nullable=False, default=datetime.utcnow)
```

- [ ] **Step 2: Add the migration function to `app/core/database.py`**

```python
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from app.core.config import get_settings
from app.models.future_database_models import Base

_settings = get_settings()

engine = create_engine(
    _settings.database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables() -> None:
    Base.metadata.create_all(bind=engine)

def ensure_user_id_column() -> None:
    """
    Migración idempotente para bases ya desplegadas: si la tabla measurements
    existe pero fue creada antes de que el modelo tuviera user_id, la agrega.
    Filas previas sin user_id no tienen dueño y se descartan (decisión confirmada
    con el usuario: no hay datos de producción que preservar).
    """
    inspector = inspect(engine)

    if "measurements" not in inspector.get_table_names():
        return

    existing_columns = {col["name"] for col in inspector.get_columns("measurements")}

    if "user_id" in existing_columns:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE measurements ADD COLUMN user_id VARCHAR"))
        connection.execute(text("DELETE FROM measurements WHERE user_id IS NULL"))
        connection.execute(text("ALTER TABLE measurements ALTER COLUMN user_id SET NOT NULL"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_measurements_user_id ON measurements (user_id)"))
```

- [ ] **Step 3: Wire it into the startup lifespan in `app/main.py`**

Change:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield
```

to:

```python
from app.core.database import create_tables, ensure_user_id_column

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    ensure_user_id_column()
    yield
```

(Adjust the existing `from app.core.database import create_tables` import line to include `ensure_user_id_column` instead of adding a duplicate import line.)

- [ ] **Step 4: Verify the module imports and the model has the column**

```bash
cd /Users/erickvzh/Desktop/proyecto-QOS/qos-network-backend
python -c "from app.models.future_database_models import MeasurementDB; print('user_id' in MeasurementDB.__table__.columns.keys())"
```

Expected: prints `True`.

- [ ] **Step 5: Commit**

```bash
git add app/models/future_database_models.py app/core/database.py app/main.py
git commit -m "feat: add user_id column to MeasurementDB with idempotent migration"
```

---

### Task 5: Filter `measurements_repository` by `user_id`, with a test

**Files:**
- Modify: `qos-network-backend/app/repositories/measurements_repository.py`
- Create: `qos-network-backend/tests/test_measurements_repository.py`

**Interfaces:**
- Produces: `get_latest(session_id, user_id)`, `get_history(session_id, user_id)`, `count(session_id, user_id)`, `exists(session_id, user_id)`, `clear_session(session_id, user_id)` — all now require `user_id` and filter on it. `save(session_id, measurement)` is unchanged (the `measurement` dict already carries `user_id`, supplied by Task 6). `clear_all` and `get_all_session_ids` are unchanged (out of scope — not user-facing, not mentioned in the spec).

- [ ] **Step 1: Write the failing test**

This test uses a temporary in-memory SQLite database (via monkeypatch) instead of the real Postgres/Neon database, so it can run without any DB credentials — it only exercises the filtering logic, not Postgres-specific SQL.

```python
# tests/test_measurements_repository.py
from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.future_database_models import Base
import app.repositories.measurements_repository as repo_module


@pytest.fixture
def repo(monkeypatch):
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    test_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    monkeypatch.setattr(repo_module, "SessionLocal", test_session_local)

    return repo_module.MeasurementsRepository()


def _measurement(session_id: str, user_id: str) -> dict:
    return {
        "session_id": session_id,
        "user_id": user_id,
        "latency_ms": 10.0,
        "jitter_ms": 1.0,
        "download_mbps": 50.0,
        "upload_mbps": 10.0,
        "failed_requests": 0,
        "total_requests": 10,
        "packet_loss_pct": 0.0,
        "measurement_duration_s": 5.0,
        "device_type": "desktop",
        "network_type": "wifi",
        "client_timestamp": datetime.now(timezone.utc),
        "server_timestamp": datetime.now(timezone.utc),
    }


def test_same_session_id_different_users_are_isolated(repo):
    repo.save(session_id="shared-session", measurement=_measurement("shared-session", "user-a"))
    repo.save(session_id="shared-session", measurement=_measurement("shared-session", "user-b"))

    history_a = repo.get_history("shared-session", "user-a")
    history_b = repo.get_history("shared-session", "user-b")

    assert len(history_a) == 1
    assert len(history_b) == 1
    assert history_a[0]["user_id"] == "user-a"
    assert history_b[0]["user_id"] == "user-b"


def test_get_latest_scoped_by_user(repo):
    repo.save(session_id="s1", measurement=_measurement("s1", "user-a"))

    assert repo.get_latest("s1", "user-a") is not None
    assert repo.get_latest("s1", "user-b") is None


def test_count_and_exists_scoped_by_user(repo):
    repo.save(session_id="s1", measurement=_measurement("s1", "user-a"))

    assert repo.count("s1", "user-a") == 1
    assert repo.count("s1", "user-b") == 0
    assert repo.exists("s1", "user-a") is True
    assert repo.exists("s1", "user-b") is False


def test_clear_session_only_deletes_requesting_users_rows(repo):
    repo.save(session_id="s1", measurement=_measurement("s1", "user-a"))
    repo.save(session_id="s1", measurement=_measurement("s1", "user-b"))

    deleted = repo.clear_session("s1", "user-a")

    assert deleted is True
    assert repo.exists("s1", "user-a") is False
    assert repo.exists("s1", "user-b") is True
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /Users/erickvzh/Desktop/proyecto-QOS/qos-network-backend
pytest tests/test_measurements_repository.py -v
```

Expected: FAIL — `TypeError: get_history() takes 2 positional arguments but 3 were given` (current signature only takes `session_id`).

- [ ] **Step 3: Update `app/repositories/measurements_repository.py`**

```python
from typing import List, Optional
from app.core.database import SessionLocal
from app.models.future_database_models import MeasurementDB


class MeasurementsRepository:

    def save(self, session_id: str, measurement: dict) -> dict:
        with SessionLocal() as db:
            db.add(MeasurementDB(**measurement))
            db.commit()
        return measurement

    def get_latest(self, session_id: str, user_id: str) -> Optional[dict]:
        with SessionLocal() as db:
            row = (
                db.query(MeasurementDB)
                .filter(
                    MeasurementDB.session_id == session_id,
                    MeasurementDB.user_id == user_id,
                )
                .order_by(MeasurementDB.id.desc())
                .first()
            )
            return self._to_dict(row) if row else None

    def get_history(self, session_id: str, user_id: str) -> List[dict]:
        with SessionLocal() as db:
            rows = (
                db.query(MeasurementDB)
                .filter(
                    MeasurementDB.session_id == session_id,
                    MeasurementDB.user_id == user_id,
                )
                .order_by(MeasurementDB.id.asc())
                .all()
            )
            return [self._to_dict(r) for r in rows]

    def count(self, session_id: str, user_id: str) -> int:
        with SessionLocal() as db:
            return (
                db.query(MeasurementDB)
                .filter(
                    MeasurementDB.session_id == session_id,
                    MeasurementDB.user_id == user_id,
                )
                .count()
            )

    def exists(self, session_id: str, user_id: str) -> bool:
        with SessionLocal() as db:
            return (
                db.query(MeasurementDB.id)
                .filter(
                    MeasurementDB.session_id == session_id,
                    MeasurementDB.user_id == user_id,
                )
                .first()
                is not None
            )

    def clear_session(self, session_id: str, user_id: str) -> bool:
        with SessionLocal() as db:
            deleted = (
                db.query(MeasurementDB)
                .filter(
                    MeasurementDB.session_id == session_id,
                    MeasurementDB.user_id == user_id,
                )
                .delete()
            )
            db.commit()
            return deleted > 0

    def clear_all(self) -> None:
        with SessionLocal() as db:
            db.query(MeasurementDB).delete()
            db.commit()

    def get_all_session_ids(self) -> List[str]:
        with SessionLocal() as db:
            return [r[0] for r in db.query(MeasurementDB.session_id).distinct().all()]

    @staticmethod
    def _to_dict(row: MeasurementDB) -> dict:
        return {c.name: getattr(row, c.name) for c in row.__table__.columns}


measurements_repository = MeasurementsRepository()
```

- [ ] **Step 4: Run the tests again to verify they pass**

```bash
pytest tests/test_measurements_repository.py -v
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/repositories/measurements_repository.py tests/test_measurements_repository.py
git commit -m "feat: scope measurements_repository queries by user_id"
```

---

### Task 6: Thread `user_id` through the service layer

**Files:**
- Modify: `qos-network-backend/app/services/measurement_service.py`
- Modify: `qos-network-backend/app/services/metrics_service.py`
- Modify: `qos-network-backend/app/services/statistics_service.py`
- Modify: `qos-network-backend/app/services/queue_service.py`
- Modify: `qos-network-backend/app/services/ai_recommendation_service.py`

**Interfaces:**
- Consumes: the `user_id`-scoped repository methods from Task 5.
- Produces: `measurement_service.ingest_measurement(measurement, user_id)`, `.has_measurements(session_id, user_id)`, `.clear_session(session_id, user_id)`; `metrics_service.get_live_metrics(session_id, user_id)`, `.get_metrics_history(session_id, user_id)`; `statistics_service.get_statistics(session_id, user_id)`; `queue_service.get_realtime_queue_metrics(session_id, user_id)`; `ai_recommendation_service.generate_recommendations(session_id, user_id)`. Task 7's routers call these with `user_id=user` from `Depends(get_current_user)`.

- [ ] **Step 1: Update `app/services/measurement_service.py`**

```python
from datetime import datetime, timezone

from app.repositories.measurements_repository import measurements_repository
from app.schemas.measurement import MeasurementCreate, MeasurementResponse


class MeasurementService:

    def ingest_measurement(self, measurement: MeasurementCreate, user_id: str) -> MeasurementResponse:
        if measurement.failed_requests > measurement.total_requests:
            raise ValueError("failed_requests no puede ser mayor que total_requests")

        packet_loss_pct = round(
            (measurement.failed_requests / measurement.total_requests) * 100,
            4
        )

        server_timestamp = datetime.now(timezone.utc)

        measurement_data = {
            "session_id": measurement.session_id,
            "user_id": user_id,
            "latency_ms": measurement.latency_ms,
            "jitter_ms": measurement.jitter_ms,
            "download_mbps": measurement.download_mbps,
            "upload_mbps": measurement.upload_mbps,
            "failed_requests": measurement.failed_requests,
            "total_requests": measurement.total_requests,
            "packet_loss_pct": packet_loss_pct,
            "measurement_duration_s": measurement.measurement_duration_s,
            "client_timestamp": measurement.client_timestamp,
            "server_timestamp": server_timestamp,
            "device_type": measurement.device_type,
            "network_type": measurement.network_type,
        }

        measurements_repository.save(
            session_id=measurement.session_id,
            measurement=measurement_data
        )

        return MeasurementResponse(
            session_id=measurement.session_id,
            latency_ms=measurement.latency_ms,
            jitter_ms=measurement.jitter_ms,
            download_mbps=measurement.download_mbps,
            upload_mbps=measurement.upload_mbps,
            failed_requests=measurement.failed_requests,
            total_requests=measurement.total_requests,
            packet_loss_pct=packet_loss_pct,
            measurement_duration_s=measurement.measurement_duration_s,
            server_timestamp=server_timestamp
        )

    def has_measurements(self, session_id: str, user_id: str) -> bool:
        return measurements_repository.exists(session_id, user_id)

    def clear_session(self, session_id: str, user_id: str) -> bool:
        return measurements_repository.clear_session(session_id, user_id)


measurement_service = MeasurementService()
```

- [ ] **Step 2: Update `app/services/metrics_service.py`**

```python
from typing import Optional
from app.repositories.measurements_repository import measurements_repository
from app.schemas.metrics import (
    LiveMetricsResponse,
    MetricHistoryPoint,
    MetricsHistoryResponse,
)


class MetricsService:

    def get_live_metrics(self, session_id: str, user_id: str) -> Optional[LiveMetricsResponse]:
        latest = measurements_repository.get_latest(session_id, user_id)

        if latest is None:
            return None

        return LiveMetricsResponse(
            session_id=session_id,
            latency_ms=latest["latency_ms"],
            jitter_ms=latest["jitter_ms"],
            download_mbps=latest["download_mbps"],
            upload_mbps=latest.get("upload_mbps"),
            packet_loss_pct=latest["packet_loss_pct"],
            failed_requests=latest["failed_requests"],
            total_requests=latest["total_requests"],
            measurement_duration_s=latest["measurement_duration_s"],
            last_updated=latest["server_timestamp"]
        )

    def get_metrics_history(self, session_id: str, user_id: str) -> MetricsHistoryResponse:
        history = measurements_repository.get_history(session_id, user_id)

        points = [
            MetricHistoryPoint(
                timestamp=item["server_timestamp"],
                latency_ms=item["latency_ms"],
                jitter_ms=item["jitter_ms"],
                download_mbps=item["download_mbps"],
                upload_mbps=item.get("upload_mbps"),
                packet_loss_pct=item["packet_loss_pct"],
                failed_requests=item["failed_requests"],
                total_requests=item["total_requests"],
            )
            for item in history
        ]

        return MetricsHistoryResponse(
            session_id=session_id,
            points=points,
            total_points=len(points)
        )


metrics_service = MetricsService()
```

- [ ] **Step 3: Update `app/services/statistics_service.py`**

Change only the method signature and its call into the repository (leave every other method — `_calculate_basic_stats`, `_calculate_lambda_rate`, `_calculate_trend`, `_build_histogram`, `_build_analysis_message` — untouched):

```python
    def get_statistics(self, session_id: str, user_id: str) -> Optional[StatisticsResponse]:
        history = measurements_repository.get_history(session_id, user_id)

        if not history:
            return None
        # ... rest of method body unchanged ...
```

- [ ] **Step 4: Update `app/services/queue_service.py`**

Change only the method signature and its call into `statistics_service` (leave every private `_estimate_*`/`_get_stability_status`/`_build_queue_message` method untouched):

```python
    def get_realtime_queue_metrics(self, session_id: str, user_id: str) -> Optional[QueueRealtimeResponse]:
        stats = statistics_service.get_statistics(session_id, user_id)

        if stats is None:
            return None
        # ... rest of method body unchanged ...
```

- [ ] **Step 5: Update `app/services/ai_recommendation_service.py`**

Change only the method signature and its two calls into `statistics_service`/`queue_service` (leave `_build_generic_recommendations` and `_build_summary` untouched; `recommendations_repository.save(...)` call stays as-is, keyed only by `session_id` — out of scope):

```python
    def generate_recommendations(self, session_id: str, user_id: str) -> Optional[RecommendationResponse]:
        stats = statistics_service.get_statistics(session_id, user_id)
        queue_metrics = queue_service.get_realtime_queue_metrics(session_id, user_id)

        if stats is None or queue_metrics is None:
            return None
        # ... rest of method body unchanged ...
```

- [ ] **Step 6: Verify everything still imports (no syntax errors, no broken references)**

```bash
cd /Users/erickvzh/Desktop/proyecto-QOS/qos-network-backend
python -c "
from app.services.measurement_service import measurement_service
from app.services.metrics_service import metrics_service
from app.services.statistics_service import statistics_service
from app.services.queue_service import queue_service
from app.services.ai_recommendation_service import ai_recommendation_service
print('ok')
"
```

Expected: prints `ok`.

- [ ] **Step 7: Commit**

```bash
git add app/services/measurement_service.py app/services/metrics_service.py app/services/statistics_service.py app/services/queue_service.py app/services/ai_recommendation_service.py
git commit -m "feat: thread user_id through the service layer"
```

---

### Task 7: Protect the routers with `Depends(get_current_user)`

**Files:**
- Modify: `qos-network-backend/app/api/measurements.py`
- Modify: `qos-network-backend/app/api/metrics.py`
- Modify: `qos-network-backend/app/api/statistics.py`
- Modify: `qos-network-backend/app/api/queue.py`
- Modify: `qos-network-backend/app/api/recommendations.py`

Do **not** touch `app/api/probe.py` or `app/api/system.py`.

**Interfaces:**
- Consumes: `get_current_user` from Task 3, the `user_id`-accepting service methods from Task 6.

- [ ] **Step 1: Update `app/api/measurements.py`**

```python
from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.schemas.measurement import MeasurementCreate, MeasurementResponse
from app.services.measurement_service import measurement_service

router = APIRouter(
    prefix="/measurements",
    tags=["Measurements"]
)


@router.post("/ingest", response_model=MeasurementResponse)
def ingest_measurement(measurement: MeasurementCreate, user: str = Depends(get_current_user)):
    """
    Recibe una medición real generada desde Angular.
    """
    try:
        return measurement_service.ingest_measurement(measurement, user_id=user)

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )


@router.delete("/{session_id}")
def clear_measurements(session_id: str, user: str = Depends(get_current_user)):
    """
    Limpia las mediciones de una sesión del usuario autenticado.
    """
    deleted = measurement_service.clear_session(session_id, user_id=user)

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="No existen mediciones para la sesión indicada."
        )

    return {
        "status": "deleted",
        "session_id": session_id
    }
```

- [ ] **Step 2: Update `app/api/metrics.py`**

```python
from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.schemas.metrics import LiveMetricsResponse, MetricsHistoryResponse
from app.services.metrics_service import metrics_service

router = APIRouter(
    prefix="/metrics",
    tags=["Metrics"]
)


@router.get("/live/{session_id}", response_model=LiveMetricsResponse)
def get_live_metrics(session_id: str, user: str = Depends(get_current_user)):
    """
    Devuelve la última medición registrada para una sesión del usuario autenticado.
    """
    metrics = metrics_service.get_live_metrics(session_id, user_id=user)

    if metrics is None:
        raise HTTPException(
            status_code=404,
            detail="No existen métricas para la sesión indicada."
        )

    return metrics


@router.get("/history/{session_id}", response_model=MetricsHistoryResponse)
def get_metrics_history(session_id: str, user: str = Depends(get_current_user)):
    """
    Devuelve el historial de mediciones de una sesión del usuario autenticado.
    """
    history = metrics_service.get_metrics_history(session_id, user_id=user)

    if history.total_points == 0:
        raise HTTPException(
            status_code=404,
            detail="No existe historial para la sesión indicada."
        )

    return history
```

- [ ] **Step 3: Update `app/api/statistics.py`**

```python
from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.schemas.statistics import StatisticsResponse
from app.services.statistics_service import statistics_service

router = APIRouter(
    prefix="/statistics",
    tags=["Statistics"]
)


@router.get("/{session_id}", response_model=StatisticsResponse)
def get_statistics(session_id: str, user: str = Depends(get_current_user)):
    """
    Calcula estadísticas usando las mediciones del usuario autenticado.
    """
    statistics_result = statistics_service.get_statistics(session_id, user_id=user)

    if statistics_result is None:
        raise HTTPException(
            status_code=404,
            detail="No existen suficientes mediciones para calcular estadísticas."
        )

    return statistics_result
```

- [ ] **Step 4: Update `app/api/queue.py`**

```python
from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.schemas.queue import QueueRealtimeResponse
from app.services.queue_service import queue_service

router = APIRouter(
    prefix="/queue",
    tags=["Queue"]
)


@router.get("/realtime/{session_id}", response_model=QueueRealtimeResponse)
def get_realtime_queue(session_id: str, user: str = Depends(get_current_user)):
    """
    Calcula métricas de teoría de colas M/M/1 para el usuario autenticado.
    """
    queue_result = queue_service.get_realtime_queue_metrics(session_id, user_id=user)

    if queue_result is None:
        raise HTTPException(
            status_code=404,
            detail="No existen datos suficientes para calcular el modelo de colas."
        )

    return queue_result
```

- [ ] **Step 5: Update `app/api/recommendations.py`**

```python
from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.schemas.recommendation import RecommendationResponse
from app.services.ai_recommendation_service import ai_recommendation_service

router = APIRouter(
    prefix="/recommendations",
    tags=["Recommendations"]
)


@router.get("/{session_id}", response_model=RecommendationResponse)
def get_recommendations(session_id: str, user: str = Depends(get_current_user)):
    """
    Genera recomendaciones basadas en las métricas del usuario autenticado.
    """
    recommendation_result = ai_recommendation_service.generate_recommendations(session_id, user_id=user)

    if recommendation_result is None:
        raise HTTPException(
            status_code=404,
            detail="No existen datos suficientes para generar recomendaciones."
        )

    return recommendation_result
```

- [ ] **Step 6: Verify the app boots (imports resolve, routes register)**

```bash
cd /Users/erickvzh/Desktop/proyecto-QOS/qos-network-backend
python -c "
import os
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ['FIREBASE_CREDENTIALS_JSON'] = '{}'
from app.main import app
print(sorted(r.path for r in app.routes))
"
```

Expected: prints the full route list including `/measurements/ingest`, `/measurements/{session_id}`, `/metrics/live/{session_id}`, etc., with no import errors. (`ensure_user_id_column` won't actually run here — this just checks the app assembles; full DB behavior is verified in Task 8.)

- [ ] **Step 7: Commit**

```bash
git add app/api/measurements.py app/api/metrics.py app/api/statistics.py app/api/queue.py app/api/recommendations.py
git commit -m "feat: protect measurement/metrics/statistics/queue/recommendations endpoints with Firebase auth"
```

---

### Task 8: Backend end-to-end manual verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full backend test suite**

```bash
cd /Users/erickvzh/Desktop/proyecto-QOS/qos-network-backend
pytest -v
```

Expected: all tests pass, including the new `test_auth.py` and `test_measurements_repository.py`, plus the pre-existing `test_capture.py`/`test_interface.py`/`test_pyshark_interface.py`.

- [ ] **Step 2: Set up local env vars for a live run**

You need a real Firebase service account JSON (Firebase Console → Project Settings → Service Accounts → Generate new private key) and a reachable Postgres URL (the existing Neon dev DB, or a local Postgres).

```bash
cd /Users/erickvzh/Desktop/proyecto-QOS/qos-network-backend
cat > .env <<'EOF'
DATABASE_URL=<your Postgres URL>
FRONTEND_ORIGINS=http://localhost:4200,http://127.0.0.1:4200
FIREBASE_CREDENTIALS_JSON=<paste the full service account JSON as one line>
EOF
```

- [ ] **Step 3: Start the server**

```bash
uvicorn app.main:app --reload
```

Expected: starts cleanly, logs show `create_tables()`/`ensure_user_id_column()` ran without errors.

- [ ] **Step 4: Confirm a request with no token is rejected**

```bash
curl -i -X POST http://localhost:8000/measurements/ingest \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test-1","latency_ms":10,"jitter_ms":1,"download_mbps":50,"total_requests":10,"failed_requests":0,"measurement_duration_s":5}'
```

Expected: `HTTP/1.1 401 Unauthorized`.

- [ ] **Step 5: Confirm a request with a valid Firebase ID token succeeds**

Get a real ID token by logging into the deployed/local frontend (browser DevTools → Application → the token is retrievable via `firebase.auth().currentUser.getIdToken()` in the console, or log it temporarily from `AuthService.getIdToken()` while testing Task 10/11), then:

```bash
curl -i -X POST http://localhost:8000/measurements/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <paste ID token>" \
  -d '{"session_id":"test-1","latency_ms":10,"jitter_ms":1,"download_mbps":50,"total_requests":10,"failed_requests":0,"measurement_duration_s":5}'
```

Expected: `HTTP/1.1 200 OK` with the measurement echoed back, unchanged schema.

- [ ] **Step 6: Confirm cross-user isolation**

Repeat Step 5 with an ID token from a **different** Firebase account, same `session_id: "test-1"`, then:

```bash
curl -i http://localhost:8000/metrics/history/test-1 -H "Authorization: Bearer <second user's token>"
```

Expected: `404` (or empty history) — the second user cannot see the first user's `test-1` data, confirming `user_id` isolation works end to end.

---

## Part B — Frontend (`qos-network-dashboard`)

### Task 9: Add `getIdToken()` to `AuthService`

**Files:**
- Modify: `qos-network-dashboard/src/app/services/auth.service.ts`

**Interfaces:**
- Produces: `AuthService.getIdToken(forceRefresh?: boolean): Promise<string | null>` — resolves to the current Firebase user's ID token, or `null` if there's no signed-in user or we're on the server (SSR). Task 10's interceptor calls this.

- [ ] **Step 1: Add the method**

In `src/app/services/auth.service.ts`, add this method to the `AuthService` class (after `logout()`, before `translateError`):

```ts
  async getIdToken(forceRefresh = false): Promise<string | null> {
    if (!this.isBrowser) {
      return null;
    }

    const auth = await this.getAuthInstance();
    const user = auth.currentUser;

    if (!user) {
      return null;
    }

    return user.getIdToken(forceRefresh);
  }
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/erickvzh/Desktop/proyecto-QOS/qos-network-dashboard
npx tsc --noEmit -p tsconfig.app.json
```

Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/services/auth.service.ts
git commit -m "feat: add getIdToken to AuthService"
```

---

### Task 10: Create the auth interceptor and register it

**Files:**
- Create: `qos-network-dashboard/src/app/interceptors/auth.interceptor.ts`
- Modify: `qos-network-dashboard/src/app/app.config.ts`

**Interfaces:**
- Consumes: `AuthService.getIdToken()` from Task 9, `environment.apiUrl` from `src/environments/environment.ts`.

- [ ] **Step 1: Write `src/app/interceptors/auth.interceptor.ts`**

```ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const authService = inject(AuthService);

  return from(authService.getIdToken()).pipe(
    switchMap((token) => {
      if (!token) {
        return next(req);
      }

      const authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });

      return next(authReq);
    })
  );
};
```

- [ ] **Step 2: Register it in `src/app/app.config.ts`**

Change:

```ts
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),
    provideCharts(withDefaultRegisterables()),
    provideHttpClient(withFetch())
  ]
};
```

to:

```ts
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),
    provideCharts(withDefaultRegisterables()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor]))
  ]
};
```

- [ ] **Step 3: Verify it compiles**

```bash
cd /Users/erickvzh/Desktop/proyecto-QOS/qos-network-dashboard
npx tsc --noEmit -p tsconfig.app.json
```

Expected: no new type errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/interceptors/auth.interceptor.ts src/app/app.config.ts
git commit -m "feat: attach Firebase ID token to backend requests via HTTP interceptor"
```

---

### Task 11: Frontend end-to-end manual verification

**Files:** none (verification only)

- [ ] **Step 1: Point the frontend at the local backend**

Temporarily set `apiUrl: 'http://localhost:8000'` in `src/environments/environment.ts` (or run the backend from Task 8 already pointed at by the deployed `apiUrl` — either works, just make sure they match).

- [ ] **Step 2: Start the dev server**

```bash
cd /Users/erickvzh/Desktop/proyecto-QOS/qos-network-dashboard
ng serve
```

- [ ] **Step 3: Verify the token is attached in the browser**

1. Open `http://localhost:4200`, log in via `/login`.
2. Navigate to `/dashboard` and start a measurement (triggers `NetworkApiService.ingestMeasurement`).
3. Open DevTools → Network tab, find the `POST /measurements/ingest` request.
4. Confirm the request headers include `Authorization: Bearer eyJ...`.

Expected: header present, request succeeds (`200`), dashboard shows live metrics as before — no visible behavior change other than the header.

- [ ] **Step 4: Verify public (unauthenticated) requests are unaffected**

1. Log out, go to `/` (home, public route).
2. If home triggers `ping()` (probe/health check), confirm in DevTools that the request still succeeds with no `Authorization` header attached (since `getIdToken()` returns `null` when logged out) and the backend's `probe.py` doesn't require one anyway.

Expected: no errors, no broken public flows.

- [ ] **Step 5: Revert the temporary `apiUrl` override from Step 1** if you changed it, so it points back to the deployed backend.

---

## Deployment note (not a task — read before merging)

Once both branches are ready: the backend's `feature/firebase-auth` branch needs to be merged to `main` and deployed to Render with two new env vars set (`FIREBASE_CREDENTIALS_JSON`, and whatever `DATABASE_URL` Render/Neon already uses — carried over from `feature/database`). Until that env var is set on Render, the deployed backend will fail at first request to `get_current_user` with a `RuntimeError` from `get_firebase_app()` — this is expected until the real deployment config is updated, and is outside the scope of this plan (infrastructure/secrets configuration is the user's call, not something to automate here).
