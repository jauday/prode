import { useEffect, useState } from "react";
import { Match } from "../api";
import { teamNameEs } from "../teamNames";

function format(ms: number): string {
  if (ms <= 0) return "¡ya empieza!";
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${m}m ${pad(s)}s`;
}

export default function CountdownBanner({ match }: { match: Match }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const remaining = new Date(match.kick_off).getTime() - now;
  const homeName = teamNameEs(match.home_team);
  const awayName = teamNameEs(match.away_team);

  return (
    <div style={{
      background: "linear-gradient(135deg, #7c2d12, #b45309)",
      borderRadius: "var(--radius)",
      padding: "0.85rem 1.1rem",
      marginBottom: "1rem",
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
    }}>
      <span style={{ fontSize: "1.4rem" }}>⏰</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.72rem", color: "#fed7aa", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
          Te falta pronosticar
        </div>
        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {homeName} vs {awayName}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: "0.68rem", color: "#fed7aa" }}>cierra en</div>
        <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#fff", fontVariantNumeric: "tabular-nums" }}>
          {format(remaining)}
        </div>
      </div>
    </div>
  );
}
