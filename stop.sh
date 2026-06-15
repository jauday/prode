#!/bin/bash
echo "⏹ Deteniendo Prode..."
pkill -f "uvicorn main:app" 2>/dev/null && echo "  ✓ Backend detenido"
pkill -f "vite.*3000"       2>/dev/null && echo "  ✓ Frontend detenido"
rm -f /tmp/prode-*.pid
echo "Listo."
