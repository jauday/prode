#!/bin/bash
# Arranca backend y frontend del Prode Mundial 2026

PROJECT="$HOME/repos/dev/worldcuppredictionapp"

echo "🏆 Prode Mundial 2026 — arrancando..."

# Matar procesos previos si quedaron corriendo
pkill -f "uvicorn main:app" 2>/dev/null
pkill -f "vite.*3000" 2>/dev/null
sleep 1

# ── Backend ────────────────────────────────────────────────────────────────────
echo "▶ Backend..."
source "$PROJECT/backend/venv/bin/activate"
cd "$PROJECT/backend"
# La API key se lee de backend/.env (gitignoreado) vía load_dotenv() en main.py
uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/prode-backend.log 2>&1 &
BACKEND_PID=$!

# Esperar a que levante
sleep 3
if curl -s http://localhost:8000/ > /dev/null; then
  echo "  ✓ Backend OK  → http://localhost:8000"
else
  echo "  ✗ Backend falló. Revisá /tmp/prode-backend.log"
  exit 1
fi

# ── Frontend ───────────────────────────────────────────────────────────────────
echo "▶ Frontend..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20 --silent
cd "$PROJECT/frontend"
npm run dev -- --port 3000 --host > /tmp/prode-frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 3
if curl -s http://localhost:3000/ > /dev/null; then
  echo "  ✓ Frontend OK → http://localhost:3000"
  echo "             📱  http://$(ipconfig getifaddr en0):3000  (celu)"
else
  echo "  ✗ Frontend falló. Revisá /tmp/prode-frontend.log"
fi

echo ""
echo "✅ Todo corriendo. Para detener: ./stop.sh"
echo "   Logs: tail -f /tmp/prode-backend.log"
echo ""

# Guardar PIDs para stop.sh
echo "$BACKEND_PID" > /tmp/prode-backend.pid
echo "$FRONTEND_PID" > /tmp/prode-frontend.pid
