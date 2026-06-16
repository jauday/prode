from fastapi import APIRouter, Depends
from auth import get_current_user
from database import db

router = APIRouter(prefix="/fixtures", tags=["fixtures"])


@router.get("/")
def get_fixtures(current_user=Depends(get_current_user)):
    with db() as conn:
        rows = conn.execute("""
            SELECT
                m.id, m.external_id, m.stage, m.matchday, m.group_name,
                m.home_team, m.away_team, m.home_team_flag, m.away_team_flag,
                m.kick_off, m.status, m.home_score, m.away_score,
                p.home_score AS pred_home, p.away_score AS pred_away, p.points
            FROM matches m
            LEFT JOIN predictions p
                ON p.match_id = m.id AND p.user_id = ?
            ORDER BY m.kick_off ASC
        """, (current_user["id"],)).fetchall()

    return [dict(r) for r in rows]
