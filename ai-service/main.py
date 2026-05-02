import inspect
import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
ENGINE_DIR = ARTIFACTS_DIR / "backend"

if str(ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(ENGINE_DIR))

try:
    from health_alert_engine import load_artifacts, predict_risk_and_alert
except ImportError as exc:
    load_artifacts = None
    predict_risk_and_alert = None
    IMPORT_ERROR = exc
else:
    IMPORT_ERROR = None


app = FastAPI(title="EXIR AI Service", version="1.0.0")
ai_artifacts: Optional[Any] = None
startup_error: Optional[str] = None


class VitalsPayload(BaseModel):
    patient_id: str
    timestamp: str
    heart_rate: float = Field(..., ge=0)
    spo2: float = Field(..., ge=0, le=100)
    temperature: float


def _load_artifacts_once() -> Any:
    if load_artifacts is None:
        raise RuntimeError(
            "Could not import health_alert_engine.py from ai-service/artifacts/backend"
        ) from IMPORT_ERROR

    previous_cwd = Path.cwd()
    os.chdir(ARTIFACTS_DIR)
    try:
        try:
            return load_artifacts(ARTIFACTS_DIR)
        except TypeError:
            return load_artifacts()
    finally:
        os.chdir(previous_cwd)


def _call_predict(payload: Dict[str, Any]) -> Any:
    if predict_risk_and_alert is None:
        raise RuntimeError("predict_risk_and_alert is unavailable")

    signature = inspect.signature(predict_risk_and_alert)
    parameter_count = len(signature.parameters)

    if parameter_count >= 2:
        try:
            return predict_risk_and_alert(payload, ai_artifacts)
        except TypeError:
            return predict_risk_and_alert(ai_artifacts, payload)

    return predict_risk_and_alert(payload)


@app.on_event("startup")
def startup_event() -> None:
    global ai_artifacts, startup_error
    try:
        ai_artifacts = _load_artifacts_once()
        startup_error = None
    except Exception as exc:
        ai_artifacts = None
        startup_error = str(exc)
        print(f"AI artifacts failed to load: {exc}")


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "service": "exir-ai-service",
        "artifactsLoaded": ai_artifacts is not None,
        "startupError": startup_error,
    }


@app.post("/ai/predict")
def predict(payload: VitalsPayload) -> Any:
    if ai_artifacts is None:
        raise HTTPException(status_code=503, detail="AI artifacts are not loaded")

    try:
        return _call_predict(payload.dict())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI prediction failed: {exc}") from exc
