import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from auth import get_current_user
from database import db

router = APIRouter(prefix="/predictions", tags=["predictions"])
log = logging.getLogger("predictions")


class PredictionIn(BaseModel):
    match_id: int
    home_score: int
    away_score: int


@router.post("/")
def upsert_prediction(payload: PredictionIn, current_user=Depends(get_current_user)):
    with db() as conn:
        match = conn.execute(
            "SELECT kick_off, status FROM matches WHERE id = ?", (payload.match_id,)
        ).fetchone()

    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    kick_off = datetime.fromisoformat(match["kick_off"]).replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) >= kick_off:
        raise HTTPException(status_code=403, detail="El partido ya comenzó, no podés modificar tu predicción")

    with db() as conn:
        conn.execute("""
            INSERT INTO predictions (user_id, match_id, home_score, away_score, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'))
            ON CONFLICT(user_id, match_id) DO UPDATE SET
                home_score = excluded.home_score,
                away_score = excluded.away_score,
                updated_at = datetime('now')
        """, (current_user["id"], payload.match_id, payload.home_score, payload.away_score))

    log.info("prediction saved: user=%s match=%d score=%d-%d",
             current_user["username"], payload.match_id, payload.home_score, payload.away_score)
    return {"ok": True}


@router.get("/")
def my_predictions(current_user=Depends(get_current_user)):
    with db() as conn:
        rows = conn.execute("""
            SELECT p.*, m.home_team, m.away_team, m.kick_off, m.status,
                   m.home_score AS real_home, m.away_score AS real_away
            FROM predictions p
            JOIN matches m ON m.id = p.match_id
            WHERE p.user_id = ?
            ORDER BY m.kick_off ASC
        """, (current_user["id"],)).fetchall()
    return [dict(r) for r in rows]
