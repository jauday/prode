import { useEffect, useState } from "react";
import { api, Standing } from "../api";
import { useSettings } from "../hooks/useSettings";

export default function Standings() {
  const settings = useSettings();
  const [rows, setRows] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.standings().then(setRows).finally(() => setLoading(false));
    const iv = setInterval(() => api.standings().then(setRows), 60_000);
    return () => clearInterval(iv);
  }, []);

  if (loading) return <div className="spinner" />;

  const medals = ["🥇", "🥈", "🥉"];

  const th = (center = true): React.CSSProperties => ({
    textAlign: center ? "center" : "left",
    padding: "0.5rem 0.75rem",
    borderBottom: "1px solid var(--border)",
    color: "var(--muted)",
    fontSize: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: 600,
    whiteSpace: "nowrap",
  });

  const td = (center = true): React.CSSProperties => ({
    padding: "0.75rem",
    textAlign: center ? "center" : "left",
  });

  return (
    <div>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: "1rem" }}>
        Tabla de posiciones
      </h2>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr>
              <th style={th(false)}>#</th>
              <th style={th(false)}>Jugador</th>
              <th style={th()}>Puntos</th>
              {settings.streak_enabled && <th style={th()}>🔥 Racha</th>}
              <th style={th()}>🎯 Exactas</th>
              <th style={th()}>Predicciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                <td style={{ ...td(false), color: "var(--muted)", fontWeight: 600 }}>
                  {medals[i] ?? i + 1}
                </td>
                <td style={{ ...td(false), fontWeight: 600 }}>{r.display_name}</td>
                <td style={{ ...td(), fontWeight: 800, fontSize: "1.1rem", color: "var(--gold)" }}>
                  {r.total_points}
                </td>
                {settings.streak_enabled && (
                  <td style={{ ...td(), fontWeight: 700 }}>
                    {r.streak >= 2 ? `🔥 ${r.streak}` : r.streak === 1 ? "1" : "—"}
                  </td>
                )}
                <td style={{ ...td(), color: "var(--gold)" }}>
                  {r.exact_both || "—"}
                </td>
                <td style={{ ...td(), color: "var(--muted)" }}>
                  {r.predictions_made}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "1.5rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1rem", fontSize: "0.82rem", color: "var(--muted)" }}>
        <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: "0.4rem" }}>Sistema de puntos</p>
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <li>🎯 <strong>12 pts</strong> — Marcador exacto de ambos equipos</li>
          <li>✅ <strong>7 pts</strong> — Resultado correcto + un marcador exacto</li>
          <li>✔️ <strong>5 pts</strong> — Solo resultado correcto (G/E/P)</li>
          <li>⚽ <strong>2 pts</strong> — Solo un marcador exacto</li>
        </ul>
      </div>
    </div>
  );
}
