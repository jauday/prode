from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user
from database import db
from football_api import API_KEY, BASE_URL, COMPETITION, HEADERS
import httpx
import logging


router = APIRouter(prefix="/standings", tags=["standings"])
log = logging.getLogger("standings")

@router.get("/")
def get_standings(current_user=Depends(get_current_user)):
    with db() as conn:
        rows = conn.execute("""
            SELECT
                u.id,
                u.display_name,
                COUNT(p.id) AS predictions_made,
                COALESCE(SUM(p.points), 0) AS total_points,
                SUM(CASE WHEN p.points = 12 THEN 1 ELSE 0 END) AS exact_both,
                SUM(CASE WHEN p.points = 7 THEN 1 ELSE 0 END) AS result_one_exact,
                SUM(CASE WHEN p.points = 5 THEN 1 ELSE 0 END) AS result_only,
                SUM(CASE WHEN p.points = 2 THEN 1 ELSE 0 END) AS one_exact
            FROM users u
            LEFT JOIN predictions p ON p.user_id = u.id
            WHERE u.password_set = 1
            GROUP BY u.id
            ORDER BY total_points DESC, exact_both DESC, result_one_exact DESC
        """).fetchall()

    log.info("standings load: %s", current_user["username"])
    return [dict(r) for r in rows]


@router.get("/groups")
async def get_group_standings(current_user=Depends(get_current_user)):
    if not API_KEY:
        raise HTTPException(status_code=503, detail="API key no configurada")
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{BASE_URL}/competitions/{COMPETITION}/standings",
            headers=HEADERS,
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="No se pudo obtener la tabla de grupos")

    raw = resp.json().get("standings", [])
    groups = []
    for g in raw:
        if g.get("type") != "TOTAL":
            continue
        table = []
        for row in g.get("table", []):
            team = row.get("team", {})
            table.append({
                "position": row["position"],
                "team_name": team.get("name", ""),
                "team_crest": team.get("crest"),
                "played": row["playedGames"],
                "won": row["won"],
                "draw": row["draw"],
                "lost": row["lost"],
                "gf": row["goalsFor"],
                "ga": row["goalsAgainst"],
                "gd": row["goalDifference"],
                "points": row["points"],
            })
        groups.append({
            "group": g.get("group", ""),
            "table": table,
        })
    return groups
