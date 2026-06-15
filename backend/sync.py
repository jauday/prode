"""
Background job: syncs fixtures and live scores from football-data.org.
Runs every 60s during live matches, every 5min otherwise.
"""

import asyncio
from database import db
from football_api import fetch_matches, parse_match
from scoring import calculate_points


async def sync_matches():
    try:
        matches = await fetch_matches()
    except Exception as e:
        print(f"[sync] Error fetching matches: {e}")
        return

    skipped = 0
    for m in matches:
        parsed = parse_match(m)
        # Saltear partidos de eliminación con equipos todavía sin definir.
        # Se insertarán solos cuando la API tenga los clasificados.
        if not parsed["home_team"] or not parsed["away_team"]:
            skipped += 1
            continue
        with db() as conn:
            conn.execute("""
                INSERT INTO matches
                    (external_id, stage, matchday, home_team, away_team,
                     home_team_flag, away_team_flag, kick_off, status, home_score, away_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    matchday = excluded.matchday
            """, (
                parsed["external_id"], parsed["stage"], parsed["matchday"],
                parsed["home_team"], parsed["away_team"],
                parsed["home_team_flag"], parsed["away_team_flag"],
                parsed["kick_off"], parsed["status"],
                parsed["home_score"], parsed["away_score"],
            ))

    recalculate_points()
    print(f"[sync] Synced {len(matches) - skipped} matches ({skipped} sin equipos definidos, omitidos)")


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
