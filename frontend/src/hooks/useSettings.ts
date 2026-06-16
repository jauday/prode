import { useState, useEffect } from "react";
import { api, Settings } from "../api";

const DEFAULTS: Settings = {
  signup_enabled: true,
  countdown_enabled: true,
  streak_enabled: true,
  podium_enabled: true,
};

// Cache a nivel módulo: se busca una sola vez y se comparte entre componentes.
let cache: Settings | null = null;
const listeners = new Set<(s: Settings) => void>();

function broadcast(s: Settings) {
  cache = s;
  listeners.forEach(l => l(s));
}

/** Refresca los settings desde el backend y notifica a todos los suscriptores. */
export function refreshSettings(): Promise<void> {
  return api.publicSettings()
    .then(s => broadcast({ ...DEFAULTS, ...s }))
    .catch(() => {});
}

export function useSettings(): Settings {
  const [settings, setSettings] = useState<Settings>(cache ?? DEFAULTS);

  useEffect(() => {
    listeners.add(setSettings);
    if (cache) setSettings(cache);
    else refreshSettings();
    return () => { listeners.delete(setSettings); };
  }, []);

  return settings;
}
