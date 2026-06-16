from fastapi import APIRouter, Depends
from auth import get_current_user
from database import db

router = APIRouter(prefix="/standings", tags=["standings"])


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
