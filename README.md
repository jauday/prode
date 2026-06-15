# Prode Mundial 2026

## Estructura
```
backend/   → FastAPI + SQLite
frontend/  → React + Vite
```

---

## Backend — setup inicial

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### API key de resultados en vivo
1. Registrate gratis en https://www.football-data.org/client/register
2. Copiá tu API key
3. Creá el archivo `.env` en `/backend`:
   ```
   FOOTBALL_DATA_API_KEY=tu_key_aqui
   ```

### Cargar usuarios

Abrí `backend/seed_users.py` y editá la lista `USERS`:
```python
USERS = [
    {"username": "maria",   "password": "pass123", "display_name": "María"},
    {"username": "pedro",   "password": "pass123", "display_name": "Pedro"},
    # ...
]
```
Luego correlo:
```bash
python seed_users.py
```
Podés correrlo múltiples veces sin duplicar. Para cambiar la contraseña de alguien, simplemente cambiá el valor y volvé a correr.

### Arrancar el backend
```bash
uvicorn main:app --reload
# Corre en http://localhost:8000
```

---

## Frontend — setup

```bash
cd frontend
npm install
npm run dev
# Corre en http://localhost:3000
```

---

## Sistema de puntos

| Puntos | Condición |
|--------|-----------|
| 12 | Marcador exacto de ambos equipos |
| 7  | Resultado correcto + un marcador exacto |
| 5  | Solo resultado correcto (G/E/P) |
| 2  | Solo un marcador exacto |
| 0  | Nada |

---

## Deploy (gratis)

Render (free) + Turso + cron. El backend sirve también el frontend (un solo
servicio). Guía paso a paso en **[DEPLOY.md](DEPLOY.md)**.

## Correr local

```bash
./start.sh   # backend :8000 + frontend :3000 (usa SQLite local)
./stop.sh
```
