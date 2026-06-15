#!/usr/bin/env python3
"""
Carga jugadores en la base de datos.

Uso:
    python seed_users.py

Solo necesitás el nombre y apellido. El username se genera automático:
    inicial del nombre + apellido (todo minúsculas)
    Ejemplo: "Joaquin Auday" → jauday | "Bruno Costabel" → bcostabel

Los jugadores NO tienen contraseña hasta que ellos mismos la crean desde el login.
Para admins, sí se asigna contraseña directamente.

Podés correrlo múltiples veces — usa INSERT OR IGNORE, no duplica.
"""

import os
import sys
from dotenv import load_dotenv
load_dotenv()
from database import init_db, db
from auth import hash_password

# Contraseña inicial del admin: se lee de la variable de entorno ADMIN_PASSWORD
# (definida en backend/.env, que está gitignoreado). Nunca queda en el código.
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")


def make_username(first_name: str, last_name: str) -> str:
    initials = "".join(w[0].lower() for w in first_name.split())
    last = last_name.lower().replace(" ", "")
    return initials + last


# ──────────────────────────────────────────────────────────────────────────────
# EDITÁ ESTA LISTA CON TUS JUGADORES
# Solo nombre y apellido — el username y la contraseña los maneja el sistema
# Para admins: agregá "password" y "is_admin": True
# ──────────────────────────────────────────────────────────────────────────────
USERS = [
    # Admin
    {"first_name": "Joaquin",      "last_name": "Auday",        "password": ADMIN_PASSWORD, "is_admin": True},

    # Jugadores
    {"first_name": "Nicolas",      "last_name": "Perez"},
    {"first_name": "Michael",      "last_name": "Laspiur"},
    {"first_name": "Emanuel",      "last_name": "Keil"},
    {"first_name": "Emanuel",      "last_name": "Schiel"},
    {"first_name": "Bruno",        "last_name": "Costabel"},
    {"first_name": "Marcos",       "last_name": "Scheck"},
    {"first_name": "Luciano",      "last_name": "Scheck"},
    {"first_name": "Marcos",       "last_name": "Starkloff"},
    {"first_name": "Nicolas",      "last_name": "Laspiur"},
    {"first_name": "Agustin",      "last_name": "Kloster"},
    {"first_name": "Ezequiel",     "last_name": "Schlaps"},
    {"first_name": "Natanel",      "last_name": "Schlaps"},
    {"first_name": "Emiliano",     "last_name": "Olivieri"},
    {"first_name": "Juan",         "last_name": "Espir"},
    {"first_name": "Juan Martin",  "last_name": "Bisterfeld"},
    {"first_name": "Walter",       "last_name": "Postemsky"},
    {"first_name": "Francisco",    "last_name": "Gaviot"},
    {"first_name": "Jose Maria",   "last_name": "Diez"},
    {"first_name": "Franco",       "last_name": "Antista"},
    {"first_name": "Matias",       "last_name": "Hours"},
]
# ──────────────────────────────────────────────────────────────────────────────


def seed():
    init_db()
    with db() as conn:
        for u in USERS:
            first = u["first_name"]
            last  = u["last_name"]
            username     = make_username(first, last)
            display_name = f"{first} {last}"
            is_admin     = int(u.get("is_admin", False))
            password     = u.get("password")
            has_password = 1 if password else 0
            pw_hash      = hash_password(password) if password else ""

            conn.execute(
                """
                INSERT OR IGNORE INTO users
                    (username, password_hash, display_name, first_name, last_name, is_admin, password_set)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (username, pw_hash, display_name, first, last, is_admin, has_password),
            )

            admin_tag = " [ADMIN]" if is_admin else ""
            pwd_tag   = " ✓ contraseña asignada" if has_password else " ⏳ pendiente de activación"
            print(f"  ✓ {display_name} → @{username}{admin_tag}{pwd_tag}")

    print(f"\nListo — {len(USERS)} usuario(s) procesados.")


if __name__ == "__main__":
    seed()
