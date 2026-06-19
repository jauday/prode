"""
Background job: syncs fixtures and live scores from football-data.org.
El fetch HTTP es async (no bloquea el event loop). La escritura a Turso es sync
y corre en el MISMO thread del event loop: libsql_experimental ata el stream
Hrana al runtime del thread donde se creó, así que usar la conexión desde un
worker thread (asyncio.to_thread) la rompe con "stream not found". El resto de la
app escribe desde el thread principal sin problemas, así que el sync hace lo mismo.
"""

from database import db
from football_api import fetch_matches, parse_match
from scoring import calculate_points


def _write_matches_to_db(matches):
    """Escribe los partidos en la DB de forma síncrona (en el thread principal).

    Usa UNA sola conexión para todo el batch. Abrir una conexión por partido
    (decenas en ráfaga) hace que Turso invalide el stream Hrana del lado del
    servidor y el commit explote con "stream not found".
    """
    skipped = 0
    written = 0
    # Filtrar partidos de eliminación con equipos todavía sin definir.
    # Se insertarán solos cuando la API tenga los clasificados.
    parsed_matches = []
    for m in matches:
        parsed = parse_match(m)
        if not parsed["home_team"] or not parsed["away_team"]:
            skipped += 1
            continue
        parsed_matches.append(parsed)

    with db() as conn:
        for parsed in parsed_matches:
            conn.execute("""
                INSERT INTO matches
                    (external_id, stage, matchday, group_name, home_team, away_team,
                     home_team_flag, away_team_flag, kick_off, status, home_score, away_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(external_id) DO UPDATE SET
                    status = excluded.status,
                    home_score = excluded.home_score,
                    away_score = excluded.away_score,
                    home_team = excluded.home_team,
                    away_team = excluded.away_team,
                    home_team_flag = excluded.home_team_flag,
                    away_team_flag = excluded.away_team_flag,
                    kick_off = excluded.kick_off,
                    stage = excluded.stage,
                    matchday = excluded.matchday,
                    group_name = excluded.group_name
            """, (
                parsed["external_id"], parsed["stage"], parsed["matchday"], parsed["group_name"],
                parsed["home_team"], parsed["away_team"],
                parsed["home_team_flag"], parsed["away_team_flag"],
                parsed["kick_off"], parsed["status"],
                parsed["home_score"], parsed["away_score"],
            ))
            written += 1

    recalculate_points()
    print(f"[sync] Synced {written} matches ({skipped} sin equipos definidos, omitidos)")


async def sync_matches():
    try:
        matches = await fetch_matches()
    except Exception as e:
        print(f"[sync] Error fetching matches: {e}")
        return

    # Escritura en el thread principal (ver nota del módulo). Un reintento por si
    # el stream Hrana expiró: _write_matches_to_db abre una conexión nueva cada vez.
    for attempt in range(2):
        try:
            _write_matches_to_db(matches)
            return
        except ValueError as e:
            if "stream not found" in str(e) and attempt == 0:
                print("[sync] stream Hrana expirado, reintentando con conexión nueva...")
                continue
            print(f"[sync] Error escribiendo partidos: {e}")
            return


def recalculate_points():
    with db() as conn:
        finished = conn.execute("""
            SELECT id, home_score, away_score FROM matches
            WHERE status = 'FINISHED' AND home_score IS NOT NULL
        """).fetchall()

        for match in finished:
            preds = conn.execute(
                "SELECT id, home_score, away_score FROM predictions WHERE match_id = ?",
                (match["id"],),
            ).fetchall()

            for pred in preds:
                pts = calculate_points(
                    pred["home_score"], pred["away_score"],
                    match["home_score"], match["away_score"],
                )
                conn.execute(
                    "UPDATE predictions SET points = ? WHERE id = ?",
                    (pts, pred["id"]),
                )
