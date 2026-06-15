# ── Stage 1: build del frontend ──────────────────────────────────────────────
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ── Stage 2: backend + frontend estático ─────────────────────────────────────
FROM python:3.11-slim
WORKDIR /app

# Dependencias del backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Código del backend
COPY backend/ ./

# Frontend compilado → carpeta static que sirve FastAPI
COPY --from=frontend /app/frontend/dist ./static

ENV STATIC_DIR=static

# Render (y otros) inyectan el puerto en $PORT. Default 8080 para correr local.
EXPOSE 8080
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
