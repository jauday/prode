import { useEffect, useState } from "react";
import { api, Standing } from "../api";

interface Props {
  currentUserId: number;
}

const MEDALS = ["🥇", "🥈", "🥉"];

function Step({ standing, place }: { standing: Standing; place: number }) {
  // Alturas del pedestal: 1° más alto
  const height = place === 0 ? 64 : place === 1 ? 46 : 34;
  const accent = place === 0 ? "var(--gold)" : "var(--border)";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", minWidth: 0 }}>
      <div style={{ fontSize: place === 0 ? "1.8rem" : "1.5rem", lineHeight: 1 }}>{MEDALS[place]}</div>
      <div style={{
        fontWeight: 700, fontSize: "0.85rem", textAlign: "center", lineHeight: 1.15,
        maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        width: "100%",
      }}>
        {standing.display_name}
      </div>
      <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--gold)" }}>
        {standing.total_points}
        <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--muted)" }}> pts</span>
      </div>
      <div style={{
        width: "100%", height, borderRadius: "8px 8px 0 0",
        background: "var(--surface2)", borderTop: `3px solid ${accent}`,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        color: "var(--muted)", fontWeight: 800, fontSize: "0.8rem", paddingTop: "0.25rem",
      }}>
        {place + 1}°
      </div>
    </div>
  );
}

export default function Podium({ currentUserId }: Props) {
  const [rows, setRows] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.standings().then(setRows).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading || rows.length === 0) return null;

  // Hasta que alguien sume puntos no tiene sentido mostrar el podio (arranque del torneo).
  if (rows.every(r => r.total_points === 0)) return null;

  const top3 = rows.slice(0, 3);
  const myIndex = rows.findIndex(r => r.id === currentUserId);
  const me = myIndex >= 0 ? rows[myIndex] : null;
  const inPodium = myIndex >= 0 && myIndex < 3;

  // Orden visual: 2° · 1° · 3° (podio clásico)
  const order = top3.length === 3 ? [1, 0, 2] : top3.map((_, i) => i);

  return (
    <div className="card" style={{ marginBottom: "1rem", padding: "1rem 1rem 0" }}>
      <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, textAlign: "center", marginBottom: "0.75rem" }}>
        🏆 Podio
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
        {order.map(i => <Step key={top3[i].id} standing={top3[i]} place={i} />)}
      </div>

      {/* Tu posición */}
      {me && (
        <div style={{
          margin: "0 -1rem", marginTop: "0.85rem",
          padding: "0.7rem 1rem",
          borderTop: "1px solid var(--border)",
          background: inPodium ? "transparent" : "var(--surface2)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderRadius: "0 0 var(--radius) var(--radius)",
        }}>
          <span style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 600 }}>
            {inPodium ? "¡Estás en el podio! 🎉" : "Tu posición"}
          </span>
          <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>
            #{myIndex + 1}
            <span style={{ color: "var(--gold)" }}> · {me.total_points} pts</span>
          </span>
        </div>
      )}
    </div>
  );
}
