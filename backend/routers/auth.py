import logging
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from auth import verify_password, hash_password, create_token, get_current_user
from database import db

router = APIRouter(prefix="/auth", tags=["auth"])
log = logging.getLogger("auth")


@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends()):
    log.info("login attempt: %s", form.username)
    with db() as conn:
        row = conn.execute(
            "SELECT id, username, display_name, password_hash, is_admin, password_set FROM users WHERE username = ?",
            (form.username,),
        ).fetchone()

    if not row or not row["password_set"]:
        log.warning("login failed (user not found or no password): %s", form.username)
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    if not verify_password(form.password, row["password_hash"]):
        log.warning("login failed (wrong password): %s", form.username)
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    log.info("login ok: %s", form.username)
    token = create_token(row["id"], row["username"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": row["id"],
            "username": row["username"],
            "display_name": row["display_name"],
            "is_admin": bool(row["is_admin"]),
        },
    }


class LookupRequest(BaseModel):
    full_name: str


@router.post("/lookup")
def lookup(body: LookupRequest):
    name = body.full_name.strip()
    log.info("lookup: '%s'", name)
    parts = name.split()
    if len(parts) < 2:
        raise HTTPException(status_code=400, detail="Ingresá nombre y apellido")

    with db() as conn:
        # Buscar por first_name + last_name (case insensitive)
        row = conn.execute(
            """SELECT id, username, display_name, password_set
               FROM users
               WHERE LOWER(first_name) = LOWER(?) AND LOWER(last_name) = LOWER(?)""",
            (parts[0], " ".join(parts[1:])),
        ).fetchone()

    if not row:
        log.warning("lookup not found: '%s'", name)
        raise HTTPException(status_code=404, detail="No encontramos ese nombre. Verificá con quien organizó el prode.")

    log.info("lookup ok: '%s' → %s (needs_password=%s)", name, row["username"], not bool(row["password_set"]))
    return {
        "username": row["username"],
        "display_name": row["display_name"],
        "needs_password": not bool(row["password_set"]),
    }


class SetupRequest(BaseModel):
    username: str
    password: str


@router.post("/setup")
def setup_password(body: SetupRequest):
    log.info("setup password: %s", body.username)
    if len(body.password) < 4:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 4 caracteres")

    with db() as conn:
        row = conn.execute(
            "SELECT id, password_set FROM users WHERE username = ?", (body.username,)
        ).fetchone()

        if not row:
            log.warning("setup failed (user not found): %s", body.username)
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        if row["password_set"]:
            log.warning("setup failed (already has password): %s", body.username)
            raise HTTPException(status_code=403, detail="Este usuario ya tiene contraseña configurada")

        conn.execute(
            "UPDATE users SET password_hash = ?, password_set = 1 WHERE username = ?",
            (hash_password(body.password), body.username),
        )
    log.info("setup ok: %s", body.username)

    # Auto-login después de configurar contraseña
    with db() as conn:
        row = conn.execute(
            "SELECT id, username, display_name, is_admin FROM users WHERE username = ?",
            (body.username,),
        ).fetchone()

    token = create_token(row["id"], row["username"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": row["id"],
            "username": row["username"],
            "display_name": row["display_name"],
            "is_admin": bool(row["is_admin"]),
        },
    }


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
def change_password(body: ChangePasswordRequest, current_user=Depends(get_current_user)):
    if len(body.new_password) < 4:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 4 caracteres")

    with db() as conn:
        row = conn.execute(
            "SELECT password_hash FROM users WHERE id = ?", (current_user["id"],)
        ).fetchone()

        if not verify_password(body.current_password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="La contraseña actual es incorrecta")

        conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hash_password(body.new_password), current_user["id"]),
        )

    return {"ok": True}


@router.get("/me")
def me(current_user=Depends(get_current_user)):
    return current_user


class ProfileUpdate(BaseModel):
    first_name: str
    last_name: str
    username: str


@router.patch("/me")
def update_profile(body: ProfileUpdate, current_user=Depends(get_current_user)):
    first = body.first_name.strip()
    last = body.last_name.strip()
    username = body.username.strip().lower()

    if not first or not last:
        raise HTTPException(status_code=400, detail="Nombre y apellido son obligatorios")
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="El usuario debe tener al menos 3 caracteres")
    if " " in username:
        raise HTTPException(status_code=400, detail="El usuario no puede tener espacios")

    display = f"{first} {last}"
    with db() as conn:
        clash = conn.execute(
            "SELECT id FROM users WHERE username = ? AND id <> ?", (username, current_user["id"])
        ).fetchone()
        if clash:
            raise HTTPException(status_code=409, detail="Ese usuario ya está en uso")

        conn.execute(
            "UPDATE users SET first_name = ?, last_name = ?, username = ?, display_name = ? WHERE id = ?",
            (first, last, username, display, current_user["id"]),
        )

    log.info("profile updated: %s -> %s (%s)", current_user["username"], username, display)
    return {
        "id": current_user["id"],
        "username": username,
        "display_name": display,
        "is_admin": current_user["is_admin"],
        "first_name": first,
        "last_name": last,
    }
