import { useState, useRef, useCallback, useEffect } from "react";
import { Match, api } from "../api";
import { teamNameEs } from "../teamNames";

interface Props {
  match: Match;
  onSaved: () => void;
}

// Estima el minuto de juego a partir del tiempo transcurrido desde el inicio.
// La API free no da el minuto real, así que es aproximado: descuenta ~15 min
// de entretiempo en el segundo tiempo y topa en 90'.
function estimatedMinute(kickOff: string): string {
  const elapsed = Math.floor((Date.now() - new Date(kickOff).getTime()) / 60000);
  if (elapsed < 0) return "";
  let gameMin = elapsed;
  if (elapsed > 60) gameMin = elapsed - 15; // descontar entretiempo
  if (gameMin >= 90) return "90+'";
  if (gameMin < 1) return "1'";
  return `${gameMin}'`;
}

function statusBadge(status: string, kickOff: string) {
  if (status === "FINISHED") return <span className="badge badge-gray">Finalizado</span>;
  if (status === "PAUSED")   return <span className="badge badge-live">⏸ Entretiempo</span>;
  if (status === "IN_PLAY")  return <span className="badge badge-live">{estimatedMinute(kickOff)}</span>;
  return null;
}

function pointsBadge(pts: number | null) {
  if (pts === null) return null;
  if (pts === 12)  return <span className="badge badge-gold">+{pts} pts 🎯</span>;
  if (pts >= 5)    return <span className="badge badge-green">+{pts} pts</span>;
  if (pts >= 2)    return <span className="badge badge-blue">+{pts} pts</span>;
  return <span className="badge badge-gray">0 pts</span>;
}

function isLocked(kickOff: string) {
  return new Date() >= new Date(kickOff);
}

function ScoreInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, arrows, enter
    const allowed = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Enter"];
    if (allowed.includes(e.key)) return;
    // Block non-digits
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw === "") { onChange(""); return; }
    const n = Math.min(100, parseInt(raw, 10));
    onChange(String(n));
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
        width: 56,
        textAlign: "center",
        fontSize: "1.3rem",
        fontWeight: 700,
        padding: "0.4rem 0.25rem",
        // hide spinners
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tick cada 30s para que el minuto estimado avance en partidos en vivo
  const isLive = match.status === "IN_PLAY";
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isLive) return;
    const iv = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(iv);
  }, [isLive]);

  const kickOffDate = new Date(match.kick_off);
  const dateStr = kickOffDate.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
  const timeStr  = kickOffDate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

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

  const handleHomeChange = (v: string) => {
    setHome(v);
    scheduleAutoSave(v, away);
  };
  const handleAwayChange = (v: string) => {
    setAway(v);
    scheduleAutoSave(home, v);
  };

  const homeName = teamNameEs(match.home_team);
  const awayName = teamNameEs(match.away_team);
  const hasPred  = match.pred_home !== null;

  const hasScore = ["FINISHED", "IN_PLAY", "PAUSED"].includes(match.status);

  // Locked pero todavía no empezó (ventana entre kick_off y IN_PLAY)
  const lockedPending = locked && match.status === "SCHEDULED";

  return (
    <div className="card" style={{
      marginBottom: "0.75rem",
      opacity: locked ? 0.82 : 1,
      borderColor: lockedPending && !hasPred ? "var(--red, #ef4444)" : undefined,
    }}>
      {/* Header: fecha + badges */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{dateStr} · {timeStr}</span>
          {locked && <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>🔒</span>}
        </div>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          {statusBadge(match.status, match.kick_off)}
          {pointsBadge(match.points)}
        </div>
      </div>

      {/* Grilla: nombre · bandera · [score + predicción] · bandera · nombre */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 32px minmax(80px, auto) 32px 1fr",
        gap: "0.5rem",
        alignItems: "center",
      }}>
        {/* Nombre local */}
        <span style={{ textAlign: "right", fontWeight: 600, fontSize: "0.92rem", lineHeight: 1.2 }}>
          {homeName}
        </span>

        {/* Bandera local */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          {match.home_team_flag
            ? <img src={match.home_team_flag} alt={homeName} style={{ height: 26, width: 32, objectFit: "contain" }} />
            : <span style={{ fontSize: "1.1rem" }}>🏳</span>}
        </div>

        {/* Columna central: marcador + predicción apilados y centrados */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
          {/* Marcador oficial o "vs" */}
          {hasScore ? (
            <span style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: 2 }}>
              {match.home_score ?? "?"}&nbsp;–&nbsp;{match.away_score ?? "?"}
            </span>
          ) : (
            <span style={{ color: "var(--muted)", fontWeight: 600, fontSize: "0.95rem" }}>vs</span>
          )}

          {/* Predicción */}
          {locked ? (
            hasPred ? (
              <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                pred: <strong style={{ color: "var(--text)" }}>{match.pred_home}–{match.pred_away}</strong>
              </span>
            ) : (
              <span style={{ fontSize: "0.75rem", color: "var(--red, #ef4444)", fontWeight: 600 }}>
                sin pronóstico
              </span>
            )
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                tu predicción
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <ScoreInput value={home} onChange={handleHomeChange} />
                <span style={{ color: "var(--muted)", fontWeight: 700 }}>–</span>
                <ScoreInput value={away} onChange={handleAwayChange} />
              </div>
              <span style={{
                fontSize: "0.72rem",
                color: saved ? "var(--green)" : saving ? "var(--muted)" : "transparent",
                height: "1em",
                transition: "color 0.2s",
              }}>
                {saving ? "guardando…" : "✓ guardado"}
              </span>
              {error && <p style={{ color: "var(--red)", fontSize: "0.75rem", margin: 0 }}>{error}</p>}
            </div>
          )}
        </div>

        {/* Bandera visitante */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          {match.away_team_flag
            ? <img src={match.away_team_flag} alt={awayName} style={{ height: 26, width: 32, objectFit: "contain" }} />
            : <span style={{ fontSize: "1.1rem" }}>🏳</span>}
        </div>

        {/* Nombre visitante */}
        <span style={{ fontWeight: 600, fontSize: "0.92rem", lineHeight: 1.2 }}>
          {awayName}
        </span>
      </div>
    </div>
  );
}
