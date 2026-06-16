from collections import defaultdict
from fastapi import APIRouter, Depends
from auth import get_current_user
from database import db

router = APIRouter(prefix="/standings", tags=["standings"])


def _compute_streaks(conn) -> dict[int, int]:
    """
    Racha actual de cada usuario: cantidad de partidos finalizados (que el usuario
    pronosticó), en orden cronológico, contados desde el más reciente hacia atrás
    mientras haya sumado puntos (>0). Se corta en el primer 0.
    """
    rows = conn.execute("""
        SELECT p.user_id, p.points
        FROM predictions p
        JOIN matches m ON m.id = p.match_id
        WHERE m.status = 'FINISHED' AND p.points IS NOT NULL
        ORDER BY m.kick_off ASC
    """).fetchall()

    by_user: dict[int, list[int]] = defaultdict(list)
    for r in rows:
        by_user[r["user_id"]].append(r["points"] or 0)

    streaks: dict[int, int] = {}
    for uid, pts in by_user.items():
        s = 0
        for p in reversed(pts):
            if p > 0:
                s += 1
            else:
                break
        streaks[uid] = s
    return streaks


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

        streaks = _compute_streaks(conn)

    result = []
    for r in rows:
        d = dict(r)
        d["streak"] = streaks.get(r["id"], 0)
        result.append(d)
    return result
