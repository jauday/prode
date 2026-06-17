from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import require_admin
from database import db
from sync import sync_matches, recalculate_points
import asyncio

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Usuarios ──────────────────────────────────────────────────────────────────

@router.get("/users")
def list_users(admin=Depends(require_admin)):
    with db() as conn:
        rows = conn.execute(
            "SELECT id, username, display_name, is_admin, password_set FROM users ORDER BY id"
        ).fetchall()
    return [dict(r) for r in rows]


class UserCreate(BaseModel):
    username: str
    password: str
    display_name: str
    is_admin: bool = False


@router.post("/users")
def create_user(payload: UserCreate, admin=Depends(require_admin)):
    from auth import hash_password
    try:
        with db() as conn:
            conn.execute(
                "INSERT INTO users (username, password_hash, display_name, is_admin) VALUES (?,?,?,?)",
                (payload.username, hash_password(payload.password), payload.display_name, int(payload.is_admin)),
            )
    except Exception:
        raise HTTPException(status_code=409, detail="El usuario ya existe")
    return {"ok": True}


class UserUpdate(BaseModel):
    display_name: str | None = None
    password: str | None = None
    is_admin: bool | None = None


@router.patch("/users/{user_id}")
def update_user(user_id: int, payload: UserUpdate, admin=Depends(require_admin)):
    from auth import hash_password
    with db() as conn:
        if payload.display_name is not None:
            conn.execute("UPDATE users SET display_name=? WHERE id=?", (payload.display_name, user_id))
        if payload.password is not None:
            conn.execute("UPDATE users SET password_hash=? WHERE id=?", (hash_password(payload.password), user_id))
        if payload.is_admin is not None:
            conn.execute("UPDATE users SET is_admin=? WHERE id=?", (int(payload.is_admin), user_id))
    return {"ok": True}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, admin=Depends(require_admin)):
    with db() as conn:
        conn.execute("DELETE FROM predictions WHERE user_id=?", (user_id,))
        conn.execute("DELETE FROM users WHERE id=?", (user_id,))
    return {"ok": True}


class ResetPasswordRequest(BaseModel):
    password: str


@router.post("/users/{user_id}/reset-password")
def reset_password(user_id: int, payload: ResetPasswordRequest, admin=Depends(require_admin)):
    from auth import hash_password
    if len(payload.password) < 4:
        raise HTTPException(status_code=400, detail="Mínimo 4 caracteres")
    with db() as conn:
        conn.execute(
            "UPDATE users SET password_hash = ?, password_set = 1 WHERE id = ?",
            (hash_password(payload.password), user_id),
        )
    return {"ok": True}


# ── Partidos ──────────────────────────────────────────────────────────────────

@router.get("/matches")
def list_matches(admin=Depends(require_admin)):
    with db() as conn:
        rows = conn.execute("SELECT * FROM matches ORDER BY kick_off").fetchall()
    return [dict(r) for r in rows]


class MatchCreate(BaseModel):
    stage: str
    matchday: int | None = None
    home_team: str
    away_team: str
    kick_off: str  # ISO format: "2026-06-15T18:00:00Z"
    home_team_flag: str | None = None
    away_team_flag: str | None = None


@router.post("/matches")
def create_match(payload: MatchCreate, admin=Depends(require_admin)):
    with db() as conn:
        cur = conn.execute(
            """INSERT INTO matches
               (stage, matchday, home_team, away_team, kick_off, home_team_flag, away_team_flag, status)
               VALUES (?,?,?,?,?,?,?,'SCHEDULED')""",
            (payload.stage, payload.matchday, payload.home_team, payload.away_team,
             payload.kick_off, payload.home_team_flag, payload.away_team_flag),
        )
    return {"ok": True, "id": cur.lastrowid}


class ScoreUpdate(BaseModel):
    home_score: int
    away_score: int
    status: str = "FINISHED"  # FINISHED | IN_PLAY | SCHEDULED


@router.patch("/matches/{match_id}/score")
def set_score(match_id: int, payload: ScoreUpdate, admin=Depends(require_admin)):
    with db() as conn:
        rows = conn.execute("SELECT id FROM matches WHERE id=?", (match_id,)).fetchone()
        if not rows:
            raise HTTPException(status_code=404, detail="Partido no encontrado")
        conn.execute(
            "UPDATE matches SET home_score=?, away_score=?, status=? WHERE id=?",
            (payload.home_score, payload.away_score, payload.status, match_id),
        )
    recalculate_points()
    return {"ok": True}


@router.delete("/matches/{match_id}")
def delete_match(match_id: int, admin=Depends(require_admin)):
    with db() as conn:
        conn.execute("DELETE FROM predictions WHERE match_id=?", (match_id,))
        conn.execute("DELETE FROM matches WHERE id=?", (match_id,))
    return {"ok": True}


# ── Predicciones ──────────────────────────────────────────────────────────────

@router.get("/predictions")
def all_predictions(match_id: int | None = None, admin=Depends(require_admin)):
    query = """
        SELECT p.id, u.display_name, u.username, m.home_team, m.away_team,
               m.kick_off, m.status, m.home_score AS real_home, m.away_score AS real_away,
               p.home_score AS pred_home, p.away_score AS pred_away, p.points
        FROM predictions p
        JOIN users u ON u.id = p.user_id
        JOIN matches m ON m.id = p.match_id
    """
    params: tuple = ()
    if match_id:
        query += " WHERE p.match_id = ?"
        params = (match_id,)
    query += " ORDER BY m.kick_off, u.display_name"

    with db() as conn:
        rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


# ── Sync manual ───────────────────────────────────────────────────────────────

@router.post("/sync")
async def manual_sync(admin=Depends(require_admin)):
    await sync_matches()
    return {"ok": True, "message": "Sync completado"}


@router.post("/recalculate")
def manual_recalculate(admin=Depends(require_admin)):
    recalculate_points()
    return {"ok": True, "message": "Puntos recalculados"}


# ── Settings ──────────────────────────────────────────────────────────────────

@router.get("/settings")
def get_settings(admin=Depends(require_admin)):
    from feature_flags import resolve_flags
    with db() as conn:
        return resolve_flags(conn)


class SettingUpdate(BaseModel):
    value: str


@router.patch("/settings/{key}")
def update_setting(key: str, payload: SettingUpdate, admin=Depends(require_admin)):
    from feature_flags import FEATURE_FLAGS
    if key not in FEATURE_FLAGS:
        raise HTTPException(status_code=400, detail="Setting desconocido")
    with db() as conn:
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, payload.value),
        )
    return {"ok": True}


# ── Reiniciar torneo ──────────────────────────────────────────────────────────

class ResetTournament(BaseModel):
    confirm: str  # debe ser "REINICIAR" para evitar accidentes


@router.post("/reset-tournament")
def reset_tournament(payload: ResetTournament, admin=Depends(require_admin)):
    """Borra TODAS las predicciones y puntos. Usuarios y partidos quedan intactos."""
    if payload.confirm != "REINICIAR":
        raise HTTPException(status_code=400, detail="Confirmación inválida")
    with db() as conn:
        deleted = conn.execute("SELECT COUNT(*) AS c FROM predictions").fetchone()["c"]
        conn.execute("DELETE FROM predictions")
    return {"ok": True, "deleted": deleted, "message": f"{deleted} predicciones borradas"}
