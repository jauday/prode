"""
Fetches World Cup 2026 fixtures and live scores from football-data.org.
Free tier API key: register at https://www.football-data.org/client/register
Competition code for FIFA World Cup 2026: WC (or WC2026 — check after registration)
"""

import httpx
import os
from datetime import datetime, timezone

API_KEY = os.getenv("FOOTBALL_DATA_API_KEY", "")
BASE_URL = "https://api.football-data.org/v4"
COMPETITION = "WC"  # FIFA World Cup
# Matchday 2 group stage starts from here — adjust if needed
MIN_MATCHDAY = 2

HEADERS = {"X-Auth-Token": API_KEY}


async def fetch_matches():
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{BASE_URL}/competitions/{COMPETITION}/matches",
            headers=HEADERS,
        )
        resp.raise_for_status()
        return resp.json().get("matches", [])


def parse_match(m: dict) -> dict:
    # En football-data.org, score.fullTime guarda el marcador corriente:
    # se actualiza en vivo durante el partido y queda como resultado final.
    score = m.get("score", {})
    full = score.get("fullTime") or {}
    home_score = full.get("home")
    away_score = full.get("away")

    home = m.get("homeTeam") or {}
    away = m.get("awayTeam") or {}

    return {
        "external_id": m["id"],
        "stage": m.get("stage", ""),
        "matchday": m.get("matchday"),
        "home_team": home.get("name"),
        "away_team": away.get("name"),
        "home_team_flag": home.get("crest"),
        "away_team_flag": away.get("crest"),
        "kick_off": m["utcDate"],
        "status": m.get("status", "SCHEDULED"),
        "home_score": home_score,
        "away_score": away_score,
    }
