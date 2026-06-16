import { useState, useRef, useCallback, useEffect } from "react";
import { Match, api } from "../api";
import { teamNameEs } from "../teamNames";

interface Props {
  match: Match;
  onSaved: () => void;
}

const pad = (n: number) => String(n).padStart(2, "0");
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const STAGE_ES: Record<string, string> = {
  GROUP_STAGE: "Fase de grupos",
  LEAGUE_STAGE: "Fase de liga",
  LAST_16: "Octavos de final",
  ROUND_OF_16: "Octavos de final",
  QUARTER_FINALS: "Cuartos de final",
  SEMI_FINALS: "Semifinales",
  THIRD_PLACE: "Tercer puesto",
  FINAL: "Final",
};

// Estima el minuto de juego a partir del tiempo transcurrido desde el inicio.
function estimatedMinute(kickOff: string): string {
  const elapsed = Math.floor((Date.now() - new Date(kickOff).getTime()) / 60000);
  if (elapsed < 0) return "";
  let gameMin = elapsed;
  if (elapsed > 60) gameMin = elapsed - 15; // descontar entretiempo
  if (gameMin >= 90) return "90+'";
  if (gameMin < 1) return "1'";
  return `${gameMin}'`;
}

function pointsBadge(pts: number) {
  if (pts === 12) return <span className="badge badge-gold">+{pts} pts 🎯</span>;
  if (pts >= 5)   return <span className="badge badge-green">+{pts} pts</span>;
  if (pts >= 2)   return <span className="badge badge-blue">+{pts} pts</span>;
  return <span className="badge badge-blue">{pts} Pts</span>;
}

function isLocked(kickOff: string) {
  return new Date() >= new Date(kickOff);
}

function Flag({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {src
        ? <img src={src} alt={alt} style={{ height: 34, width: 42, objectFit: "contain" }} />
        : <span style={{ fontSize: "1.4rem" }}>🏳</span>}
    </div>
  );
}

function ScoreInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Enter"];
    if (allowed.includes(e.key)) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw === "") { onChange(""); return; }
    onChange(String(Math.min(100, parseInt(raw, 10))));
  };
  return (
    <input
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      onKeyDown={handleKey}
      onChange={handleChange}
      maxLength={3}
      style={{
        width: 48,
        height: 48,
        textAlign: "center",
        fontSize: "1.35rem",
        fontWeight: 700,
        padding: 0,
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--surface2)",
        MozAppearance: "textfield" as any,
      }}
    />
  );
}

export default function MatchCard({ match, onSaved }: Props) {
  const locked = isLocked(match.kick_off);
  const [home, setHome] = useState(match.pred_home?.toString() ?? "");
  const [away, setAway] = useState(match.pred_away?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tick cada 30s para refrescar el minuto estimado en vivo
  const isLive = match.status === "IN_PLAY";
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isLive) return;
    const iv = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(iv);
  }, [isLive]);

  const kickOffDate = new Date(match.kick_off);
  const wd = capitalize(kickOffDate.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", ""));
  const dateLabel = `${wd} ${pad(kickOffDate.getDate())}/${pad(kickOffDate.getMonth() + 1)}, ${kickOffDate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
  const fullDate = capitalize(kickOffDate.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }))
    + " · " + kickOffDate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

  const save = useCallback(async (h: string, a: string) => {
    const hi = parseInt(h, 10);
    const ai = parseInt(a, 10);
    if (isNaN(hi) || isNaN(ai)) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      await api.predict(match.id, hi, ai);
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }, [match.id, onSaved]);

  const scheduleAutoSave = (h: string, a: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(h, a), 800);
  };
  const handleHomeChange = (v: string) => { setHome(v); scheduleAutoSave(v, away); };
  const handleAwayChange = (v: string) => { setAway(v); scheduleAutoSave(home, v); };

  const homeName = teamNameEs(match.home_team);
  const awayName = teamNameEs(match.away_team);
  const hasPred = match.pred_home !== null;
  const hasScore = ["FINISHED", "IN_PLAY", "PAUSED"].includes(match.status);

  // "GROUP_A" → "Grupo A"
  const groupLabel = match.group_name
    ? match.group_name.replace(/^GROUP[_ ]?/i, "Grupo ").replace(/_/g, " ")
    : "";

  // Badge centrado arriba: estado en vivo / puntos / fecha
  const topBadge = (() => {
    if (match.status === "IN_PLAY") return <span className="badge badge-live">{estimatedMinute(match.kick_off)}</span>;
    if (match.status === "PAUSED")  return <span className="badge badge-live">⏸ Entretiempo</span>;
    if (match.status === "FINISHED") {
      return match.points !== null ? pointsBadge(match.points) : <span className="badge badge-gray">Finalizado</span>;
    }
    // SCHEDULED → fecha con borde naranja
    return (
      <span style={{
        border: "1px solid #f59e0b",
        color: "#f59e0b",
        borderRadius: 8,
        padding: "0.35rem 0.8rem",
        fontSize: "0.85rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}>
        {dateLabel}
      </span>
    );
  })();

  return (
    <div className="card" style={{ marginBottom: "0.75rem", position: "relative" }}>
      {/* Header: badge centrado + info arriba a la derecha */}
      <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", minHeight: 32, marginBottom: "0.85rem" }}>
        {topBadge}
        <button
          onClick={() => setShowInfo(v => !v)}
          title="Info del partido"
          style={{
            position: "absolute", right: 0, top: 0,
            background: "transparent", border: "none", cursor: "pointer",
            color: showInfo ? "var(--text)" : "var(--muted)", fontSize: "1.1rem", lineHeight: 1, padding: 2,
          }}
        >
          ⓘ
        </button>
      </div>

      {/* Línea de info desplegable */}
      {showInfo && (
        <div style={{
          textAlign: "center", fontSize: "0.78rem", color: "var(--muted)",
          marginBottom: "0.75rem", paddingBottom: "0.6rem", borderBottom: "1px solid var(--border)",
        }}>
          {STAGE_ES[match.stage] ?? match.stage}
          {groupLabel ? ` · ${groupLabel}` : ""}
          {match.matchday ? ` · Fecha ${match.matchday}` : ""} · {fullDate}
        </div>
      )}

      {/* Fila de equipos: nombre+bandera · marcador/inputs · bandera+nombre */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
        {/* Local: nombre + bandera (bandera hacia adentro) */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.65rem", minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: "0.95rem", textAlign: "right", lineHeight: 1.2 }}>{homeName}</span>
          <Flag src={match.home_team_flag} alt={homeName} />
        </div>

        {/* Centro */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", flexShrink: 0 }}>
          {hasScore ? (
            <span style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: 1, whiteSpace: "nowrap" }}>
              {match.home_score ?? "?"} - {match.away_score ?? "?"}
            </span>
          ) : locked ? (
            <span style={{ color: "var(--muted)", fontWeight: 700, fontSize: "1.1rem" }}>vs</span>
          ) : (
            <>
              <ScoreInput value={home} onChange={handleHomeChange} />
              <ScoreInput value={away} onChange={handleAwayChange} />
            </>
          )}
        </div>

        {/* Visitante: bandera + nombre (bandera hacia adentro) */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "0.65rem", minWidth: 0 }}>
          <Flag src={match.away_team_flag} alt={awayName} />
          <span style={{ fontWeight: 600, fontSize: "0.95rem", lineHeight: 1.2 }}>{awayName}</span>
        </div>
      </div>

      {/* Footer: pronóstico (cerrado) o estado de guardado (abierto) */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: "0.75rem", minHeight: "1.2em" }}>
        {locked ? (
          hasPred ? (
            <span style={{
              background: "var(--surface2)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "0.3rem 0.7rem", fontSize: "0.82rem", color: "var(--muted)",
            }}>
              Tu pronóstico: <strong style={{ color: "var(--text)" }}>{match.pred_home} - {match.pred_away}</strong>
            </span>
          ) : (
            <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>sin pronóstico</span>
          )
        ) : error ? (
          <span style={{ color: "var(--red)", fontSize: "0.78rem" }}>{error}</span>
        ) : (
          <span style={{
            fontSize: "0.75rem",
            color: saved ? "var(--green)" : "var(--muted)",
            opacity: saving || saved ? 1 : 0,
            transition: "opacity 0.2s",
          }}>
            {saving ? "guardando…" : "✓ guardado"}
          </span>
        )}
      </div>
    </div>
  );
}
