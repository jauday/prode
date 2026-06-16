"""
Capa de base de datos con dos backends:
  - Local (desarrollo): SQLite en archivo (sqlite3).
  - Producción: Turso (libSQL) si están seteadas TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.

Turso ES SQLite, así que el esquema y todas las queries son idénticas. Lo único que
cambia es el driver. Se normalizan las filas a diccionarios para que el resto del
código use acceso por nombre (row["col"], dict(row)) en ambos casos.
"""

import os
import sqlite3
from contextlib import contextmanager

DB_PATH = os.getenv("DB_PATH", "prode.db")
TURSO_URL = os.getenv("TURSO_DATABASE_URL")
TURSO_TOKEN = os.getenv("TURSO_AUTH_TOKEN")
USE_TURSO = bool(TURSO_URL)


class _Result:
    """Envuelve un cursor y devuelve filas como diccionarios en ambos backends."""

    def __init__(self, cursor):
        self._cursor = cursor
        self._cols = [c[0] for c in cursor.description] if cursor.description else []
        self.lastrowid = getattr(cursor, "lastrowid", None)

    def _row_to_dict(self, row):
        if row is None:
            return None
        return {col: row[i] for i, col in enumerate(self._cols)}

    def fetchone(self):
        return self._row_to_dict(self._cursor.fetchone())

    def fetchall(self):
        return [self._row_to_dict(r) for r in self._cursor.fetchall()]


class _Conn:
    """Conexión uniforme: .execute(sql, params) -> _Result, más commit/rollback/close."""

    def __init__(self, raw):
        self._raw = raw

    def execute(self, sql, params=()):
        cur = self._raw.execute(sql, params)
        return _Result(cur)

    def commit(self):
        self._raw.commit()

    def rollback(self):
        try:
            self._raw.rollback()
        except Exception:
            pass  # algunos backends no soportan rollback explícito

    def close(self):
        self._raw.close()


def get_connection() -> _Conn:
    if USE_TURSO:
        import libsql_experimental as libsql
        raw = libsql.connect(database=TURSO_URL, auth_token=TURSO_TOKEN)
    else:
        raw = sqlite3.connect(DB_PATH)
        raw.execute("PRAGMA journal_mode=WAL")
        raw.execute("PRAGMA foreign_keys=ON")
    return _Conn(raw)


@contextmanager
def db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# Esquema dividido en sentencias individuales (libSQL no soporta executescript).
SCHEMA = [
    """CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        is_admin INTEGER DEFAULT 0
    )""",
    """CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        external_id INTEGER UNIQUE,
        stage TEXT NOT NULL,
        matchday INTEGER,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        home_team_flag TEXT,
        away_team_flag TEXT,
        kick_off TEXT NOT NULL,
        status TEXT DEFAULT 'SCHEDULED',
        home_score INTEGER,
        away_score INTEGER
    )""",
    """CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        match_id INTEGER NOT NULL REFERENCES matches(id),
        home_score INTEGER NOT NULL,
        away_score INTEGER NOT NULL,
        points INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id, match_id)
    )""",
    """CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )""",
]

MIGRATIONS = [
    "ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN first_name TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN last_name TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN password_set INTEGER DEFAULT 1",
]


def init_db():
    with db() as conn:
        for stmt in SCHEMA:
            conn.execute(stmt)
        for migration in MIGRATIONS:
            try:
                conn.execute(migration)
            except Exception:
                pass  # la columna ya existe
