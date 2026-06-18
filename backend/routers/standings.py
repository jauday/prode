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


# Bracket oficial del WC 2026 (Round of 32, Matches 73-88)
# Fuente: reglamento FIFA / Wikipedia 2026 FIFA World Cup knockout stage
BRACKET_R32 = [
    {"match": 73, "home": ("2", "A"), "away": ("2", "B")},
    {"match": 74, "home": ("1", "E"), "away": ("3", ["A","B","C","D","F"])},
    {"match": 75, "home": ("1", "F"), "away": ("2", "C")},
    {"match": 76, "home": ("1", "C"), "away": ("2", "F")},
    {"match": 77, "home": ("1", "I"), "away": ("3", ["C","D","F","G","H"])},
    {"match": 78, "home": ("2", "E"), "away": ("2", "I")},
    {"match": 79, "home": ("1", "A"), "away": ("3", ["C","E","F","H","I"])},
    {"match": 80, "home": ("1", "L"), "away": ("3", ["E","H","I","J","K"])},
    {"match": 81, "home": ("1", "D"), "away": ("3", ["B","E","F","I","J"])},
    {"match": 82, "home": ("1", "G"), "away": ("3", ["A","E","H","I","J"])},
    {"match": 83, "home": ("2", "K"), "away": ("2", "L")},
    {"match": 84, "home": ("1", "H"), "away": ("2", "J")},
    {"match": 85, "home": ("1", "B"), "away": ("3", ["E","F","G","I","J"])},
    {"match": 86, "home": ("1", "J"), "away": ("2", "H")},
    {"match": 87, "home": ("1", "K"), "away": ("3", ["D","E","I","J","L"])},
    {"match": 88, "home": ("2", "D"), "away": ("2", "G")},
]

STAGE_ORDER = ["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "THIRD_PLACE", "FINAL"]

@router.get("/bracket")
async def get_bracket(current_user=Depends(get_current_user)):
    if not API_KEY:
        raise HTTPException(status_code=503, detail="API key no configurada")
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{BASE_URL}/competitions/{COMPETITION}/matches",
            headers=HEADERS,
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="No se pudo obtener el bracket")

    all_matches = resp.json().get("matches", [])
    knockout = [m for m in all_matches if m.get("stage") in STAGE_ORDER]

    def parse(m):
        score = m.get("score", {})
        ft = score.get("fullTime") or {}
        home = m.get("homeTeam") or {}
        away = m.get("awayTeam") or {}
        return {
            "id": m["id"],
            "stage": m["stage"],
            "home_team": home.get("name"),
            "home_crest": home.get("crest"),
            "away_team": away.get("name"),
            "away_crest": away.get("crest"),
            "home_score": ft.get("home"),
            "away_score": ft.get("away"),
            "status": m.get("status"),
            "kick_off": m.get("utcDate"),
        }

    by_stage = {s: [] for s in STAGE_ORDER}
    for m in knockout:
        by_stage[m["stage"]].append(parse(m))

    return [
        {"stage": s, "matches": sorted(by_stage[s], key=lambda x: x["kick_off"] or "")}
        for s in STAGE_ORDER
        if by_stage[s]
    ]


@router.get("/bracket-projection")
async def get_bracket_projection(current_user=Depends(get_current_user)):
    """Proyecta los 16avos usando el cuadro oficial de FIFA + standings actuales."""
    if not API_KEY:
        raise HTTPException(status_code=503, detail="API key no configurada")

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{BASE_URL}/competitions/{COMPETITION}/standings",
            headers=HEADERS,
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="No se pudo obtener los standings")

    # Construir mapa: letra de grupo → [1ro, 2do, 3ro]
    groups: dict[str, list] = {}
    for g in resp.json().get("standings", []):
        if g.get("type") != "TOTAL":
            continue
        letter = g["group"].replace("Group ", "").strip()
        table = []
        for row in g["table"]:
            team = row.get("team", {})
            table.append({
                "name": team.get("name"),
                "crest": team.get("crest"),
                "points": row["points"],
                "played": row["playedGames"],
            })
        groups[letter] = table  # ya viene ordenado por posición

    def slot(pos: str, group):
        """Resuelve un slot del bracket. pos='1'/'2'/'3', group=letra o lista."""
        if pos == "3":
            # Slot condicional: depende de cuáles 3ros clasifiquen
            candidates = ", ".join(group)
            return {"label": f"Mejor 3° (Grp {candidates})", "name": None, "crest": None}
        idx = int(pos) - 1
        letter = group
        if letter not in groups or idx >= len(groups[letter]):
            return {"label": f"{pos}° Grupo {letter}", "name": None, "crest": None}
        team = groups[letter][idx]
        label = f"{pos}° Grupo {letter}"
        return {"label": label, "name": team["name"], "crest": team["crest"], "points": team["points"], "played": team["played"]}

    result = []
    for m in BRACKET_R32:
        home = slot(*m["home"])
        away = slot(*m["away"])
        result.append({"match": m["match"], "home": home, "away": away})
    return result
