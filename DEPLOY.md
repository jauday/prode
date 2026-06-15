# Deploy: Render (free) + Turso + cron

Arquitectura final, 100% gratis y sin depender de tu compu:

- **Render (free)** corre un único servicio Docker que sirve el frontend + la API.
- **Turso** es la base de datos (SQLite en la nube, persistente).
- **cron-job.org** le pega cada 2 min a `/api/cron/sync` → actualiza resultados y
  recalcula puntos, y de paso mantiene despierto el servicio.

---

## 1. Crear la base en Turso

**Desde la web (sin instalar nada — recomendado):**

1. https://turso.tech → **Sign up** (entrá con GitHub).
2. **Create Database** → nombre `prode-kalunga` → región **São Paulo (gru)**.
3. Copiá el **Database URL** (`libsql://…`) → es `TURSO_DATABASE_URL`.
4. **Create Token** → copialo → es `TURSO_AUTH_TOKEN`.

Guardá esos dos valores, los vas a pegar en Render. (No hace falta CLI ni brew.)

> Opcional, si querés la CLI para la terminal: `curl -sSfL https://get.tur.so/install.sh | bash`

---

## 2. Cargar los jugadores en la base de Turso

Desde tu compu, corriendo el seed apuntado a Turso (se siembra la base de producción):

```bash
cd backend && source venv/bin/activate
TURSO_DATABASE_URL="libsql://...tu-url..." \
TURSO_AUTH_TOKEN="...tu-token..." \
python seed_users.py
```

(Usa la misma lista de 21 jugadores. El admin toma la contraseña de `ADMIN_PASSWORD` de tu `.env`.)

---

## 3. Subir el código a GitHub

```bash
cd ~/repos/dev/worldcuppredictionapp
git init && git add . && git commit -m "Prode Kalunga"
# Crear un repo en github.com y:
git remote add origin git@github.com:TU_USUARIO/prode-kalunga.git
git push -u origin main
```

> El `.gitignore` ya evita subir `.env`, la `.db` y `node_modules`. Verificá que el
> push no incluya secretos.

---

## 4. Crear el servicio en Render

1. Entrá a https://render.com → **New → Blueprint** → conectá tu repo.
2. Render detecta `render.yaml` y crea el servicio web (plan free, Docker).
3. En **Environment**, cargá las variables marcadas (las demás se autogeneran):
   - `TURSO_DATABASE_URL` → el de Turso
   - `TURSO_AUTH_TOKEN` → el de Turso
   - `FOOTBALL_DATA_API_KEY` → tu key de football-data.org
   - `ADMIN_PASSWORD` → la contraseña del admin
   - `CRON_SECRET` → inventá una cadena larga (ej: `openssl rand -hex 16`)
4. **Deploy**. Te queda una URL tipo `https://prode-kalunga.onrender.com`.

---

## 5. Configurar el cron (lo no negociable: resultados + puntos)

En https://cron-job.org (gratis):

1. Crear cuenta → **Create cronjob**
2. URL: `https://prode-kalunga.onrender.com/api/cron/sync?key=TU_CRON_SECRET`
3. Método: **POST**
4. Schedule: **cada 2 minutos**

Eso dispara `sync_matches()` cada 2 min: trae resultados en vivo, marca finalizados
y **recalcula los puntos** de los partidos terminados. Además mantiene despierto a
Render para que el vivo no se corte.

> Tip: durante los partidos podés bajarlo a cada 1 min; entre días, subirlo a 10 min.

---

## Acceder a la base de datos (chequeos)

Lo más simple: la **consola SQL** en la web de Turso (en la página de tu base).
Escribís SQL directo, sin instalar nada:

```sql
SELECT username, display_name FROM users;
SELECT * FROM predictions LIMIT 10;
```

> Si instalaste la CLI: `turso db shell prode-kalunga`

---

## Reiniciar el torneo (jueves, para jugar en serio)

Entrá como admin (`jauday`) → **🛠 Admin → ⚠️ Reiniciar torneo** → escribí `REINICIAR`.
Borra predicciones y puntos; usuarios y partidos quedan intactos.

---

## Actualizar el código

```bash
git push      # Render redeploya solo. La base (Turso) no se toca.
```
