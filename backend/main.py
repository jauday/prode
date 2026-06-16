import os
import logging
from contextlib import asynccontextmanager

logging.basicConfig(level=logging.INFO, format="%(levelname)s [%(name)s] %(message)s")
from fastapi import FastAPI, HTTPException, Query
from dotenv import load_dotenv
load_dotenv()
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import init_db
from sync import sync_matches
from routers import auth, fixtures, predictions, standings, admin

# Secreto que debe enviar el cron externo para disparar el sync.
CRON_SECRET = os.getenv("CRON_SECRET", "")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Prode Kalunga", lifespan=lifespan)

# CORS: en desarrollo permitimos todo; en producción el frontend se sirve desde
# el mismo origen, así que no hace falta abrirlo.
allowed = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API (todo bajo /api) ────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api")
app.include_router(fixtures.router, prefix="/api")
app.include_router(predictions.router, prefix="/api")
app.include_router(standings.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "Prode Kalunga"}


@app.get("/api/public/settings")
def public_settings():
    """Settings públicos que el frontend necesita sin estar logueado."""
    from database import db
    with db() as conn:
        row = conn.execute("SELECT value FROM settings WHERE key='signup_enabled'").fetchone()
    # Default: habilitado si no hay setting guardado
    signup_enabled = (row["value"] == "true") if row else True
    return {"signup_enabled": signup_enabled}


@app.post("/api/cron/sync")
async def cron_sync(key: str = Query(default="")):
    """
    Endpoint que dispara el cron externo cada ~2 min.
    Sincroniza resultados y recalcula puntos. Protegido con CRON_SECRET para
    que solo el cron pueda llamarlo. Es público (sin login) a propósito.
    """
    if not CRON_SECRET or key != CRON_SECRET:
        raise HTTPException(status_code=403, detail="Clave de cron inválida")
    await sync_matches()
    return {"ok": True}


# ── Frontend estático ────────────────────────────────────────────────────────────
# En producción, el build de React se copia a ./static y se sirve desde acá.
# En desarrollo esta carpeta no existe y se usa el dev server de Vite.
STATIC_DIR = os.getenv("STATIC_DIR", "static")

if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        # Sirve archivos estáticos si existen, sino devuelve index.html (SPA routing)
        candidate = os.path.join(STATIC_DIR, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
