"""
Feature flags configurables desde el panel admin (tab "Funciones").

Cada flag tiene un default. El valor real se guarda en la tabla `settings`
(key/value de texto) y sobrescribe el default. Centralizar acá evita
desincronización entre el endpoint público, el admin y el front.
"""

# key -> default (bool)
FEATURE_FLAGS = {
    "signup_enabled": True,      # permitir crear cuenta (lookup por nombre)
    "countdown_enabled": True,   # cuenta regresiva al próximo partido sin pronosticar
    "streak_enabled": True,      # racha de partidos seguidos sumando puntos
    "podium_enabled": True,      # podio top 3 + tu posición en el inicio
}


def resolve_flags(conn) -> dict[str, bool]:
    """Devuelve todos los flags resueltos (default + lo guardado en settings)."""
    rows = conn.execute("SELECT key, value FROM settings").fetchall()
    stored = {r["key"]: r["value"] for r in rows}
    return {
        key: (stored[key] == "true") if key in stored else default
        for key, default in FEATURE_FLAGS.items()
    }
