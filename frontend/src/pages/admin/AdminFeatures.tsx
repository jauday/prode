import { useEffect, useState } from "react";
import { api, Settings } from "../../api";
import { refreshSettings } from "../../hooks/useSettings";

interface FeatureMeta {
  key: keyof Settings;
  label: string;
  desc: string;
}

const FEATURES: FeatureMeta[] = [
  {
    key: "signup_enabled",
    label: "Crear cuenta",
    desc: "Permite que nuevos jugadores se registren buscando su nombre. Si está apagado, en la pantalla inicial solo aparece “Iniciar sesión”.",
  },
  {
    key: "countdown_enabled",
    label: "Cuenta regresiva",
    desc: "Muestra arriba de los partidos un aviso con el tiempo que falta para el próximo partido que el jugador todavía no pronosticó.",
  },
  {
    key: "streak_enabled",
    label: "Racha 🔥",
    desc: "Agrega una columna en la tabla con cuántos partidos seguidos viene sumando puntos cada jugador.",
  },
  {
    key: "podium_enabled",
    label: "Podio 🏆",
    desc: "Muestra en el inicio el podio con los 3 primeros y, abajo, la posición y los puntos del jugador.",
  },
];

function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      style={{
        width: 48,
        height: 28,
        borderRadius: 999,
        border: "none",
        cursor: disabled ? "wait" : "pointer",
        background: on ? "var(--green, #22c55e)" : "var(--surface2)",
        position: "relative",
        flexShrink: 0,
        transition: "background 0.2s",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{
        position: "absolute",
        top: 3,
        left: on ? 23 : 3,
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: "#fff",
        transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }} />
    </button>
  );
}

export default function AdminFeatures() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api.admin.getSettings()
      .then(s => setSettings(s as unknown as Settings))
      .catch(() => {});
  }, []);

  const toggle = async (key: keyof Settings) => {
    if (!settings) return;
    const next = !settings[key];
    setBusy(key);
    try {
      await api.admin.setSetting(key, next ? "true" : "false");
      const updated = { ...settings, [key]: next };
      setSettings(updated);
      refreshSettings(); // notifica al resto de la app (Fixtures, Standings, Login)
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (!settings) return <div className="spinner" />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.25rem" }}>
        Prendé o apagá funciones de la app. Los cambios se aplican al instante para todos.
      </p>
      {FEATURES.map(f => (
        <div key={f.key} className="card" style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "1rem",
          padding: "1rem",
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.25rem" }}>
              {f.label}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.45 }}>
              {f.desc}
            </div>
          </div>
          <Toggle on={settings[f.key]} onClick={() => toggle(f.key)} disabled={busy === f.key} />
        </div>
      ))}
    </div>
  );
}
