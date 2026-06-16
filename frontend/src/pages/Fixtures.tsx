import { useEffect, useState, useCallback, useMemo } from "react";
import { api, Match } from "../api";
import MatchCard from "../components/MatchCard";
import CountdownBanner from "../components/CountdownBanner";
import Podium from "../components/Podium";
import { useSettings } from "../hooks/useSettings";

type FilterMode = "matchday" | "day";

function toLocalDate(isoUtc: string): string {
  return new Date(isoUtc).toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function toDateKey(isoUtc: string): string {
  const d = new Date(isoUtc);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function PageNav({
  label,
  onPrev,
  onNext,
  canPrev,
  canNext,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}) {
  const arrowBtn = (disabled: boolean, onClick: () => void, arrow: string) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        color: disabled ? "var(--border)" : "var(--text)",
        fontSize: "1.1rem",
        width: 38,
        height: 38,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {arrow}
    </button>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "1.1rem" }}>
      {arrowBtn(!canPrev, onPrev, "‹")}
      <span style={{
        flex: 1,
        textAlign: "center",
        fontWeight: 700,
        fontSize: "0.95rem",
        color: "var(--text)",
      }}>
        {label}
      </span>
      {arrowBtn(!canNext, onNext, "›")}
    </div>
  );
}

export default function Fixtures({ currentUserId }: { currentUserId: number }) {
  const settings = useSettings();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("matchday");
  const [mdIndex, setMdIndex] = useState(0);
  const [dayIndex, setDayIndex] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await api.fixtures();
      setMatches(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  const matchdays = useMemo(() =>
    [...new Set(matches.map(m => m.matchday).filter(Boolean) as number[])].sort((a, b) => a - b),
    [matches]);

  const dayKeys = useMemo(() =>
    [...new Set(matches.map(m => toDateKey(m.kick_off)))].sort(),
    [matches]);

  // Próximo partido que todavía no empezó y que el jugador no pronosticó.
  const nextUnpredicted = useMemo(() => {
    const now = Date.now();
    return matches
      .filter(m => new Date(m.kick_off).getTime() > now && m.pred_home === null)
      .sort((a, b) => new Date(a.kick_off).getTime() - new Date(b.kick_off).getTime())[0] ?? null;
  }, [matches]);

  // Default day index to today
  useEffect(() => {
    if (!dayKeys.length) return;
    const todayKey = toDateKey(new Date().toISOString());
    const idx = dayKeys.indexOf(todayKey);
    if (idx !== -1) setDayIndex(idx);
  }, [dayKeys]);

  const filtered = useMemo(() => {
    if (filterMode === "matchday") {
      const md = matchdays[mdIndex];
      return matches.filter(m => m.matchday === md);
    }
    const dk = dayKeys[dayIndex];
    return matches.filter(m => toDateKey(m.kick_off) === dk);
  }, [matches, filterMode, matchdays, dayKeys, mdIndex, dayIndex]);

  const modeTabStyle = (active: boolean): React.CSSProperties => ({
    padding: "0.4rem 1rem",
    borderRadius: 999,
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    border: "1px solid " + (active ? "var(--accent)" : "var(--border)"),
    background: active ? "var(--accent)" : "transparent",
    color: active ? "#fff" : "var(--muted)",
    transition: "all 0.15s",
  });

  if (loading) return <div className="spinner" />;
  if (error) return <p style={{ color: "var(--red)", padding: "1rem" }}>{error}</p>;
  if (!matches.length) return (
    <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
      <p>No hay partidos cargados todavía.</p>
    </div>
  );

  const navLabel = filterMode === "matchday"
    ? `Fase de grupos · Fecha ${matchdays[mdIndex] ?? "—"}`
    : capitalize(toLocalDate((dayKeys[dayIndex] ?? dayKeys[0]) + "T12:00:00"));

  return (
    <div>
      {/* Podio top 3 + tu posición */}
      {settings.podium_enabled && <Podium currentUserId={currentUserId} />}

      {/* Cuenta regresiva al próximo partido sin pronosticar */}
      {settings.countdown_enabled && nextUnpredicted && (
        <CountdownBanner match={nextUnpredicted} />
      )}

      {/* Selector de modo */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button style={modeTabStyle(filterMode === "matchday")} onClick={() => setFilterMode("matchday")}>
          Por fecha
        </button>
        <button style={modeTabStyle(filterMode === "day")} onClick={() => setFilterMode("day")}>
          Por día
        </button>
      </div>

      {/* Navegador con flechas */}
      {filterMode === "matchday" ? (
        <PageNav
          label={navLabel}
          canPrev={mdIndex > 0}
          canNext={mdIndex < matchdays.length - 1}
          onPrev={() => setMdIndex(i => i - 1)}
          onNext={() => setMdIndex(i => i + 1)}
        />
      ) : (
        <PageNav
          label={navLabel}
          canPrev={dayIndex > 0}
          canNext={dayIndex < dayKeys.length - 1}
          onPrev={() => setDayIndex(i => i - 1)}
          onNext={() => setDayIndex(i => i + 1)}
        />
      )}

      {/* Conteo */}
      <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "0.85rem" }}>
        {filtered.length} partido{filtered.length !== 1 ? "s" : ""}
      </p>

      {filtered.length === 0
        ? <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>No hay partidos para esta selección.</p>
        : filtered.map(m => <MatchCard key={m.id} match={m} onSaved={load} />)
      }
    </div>
  );
}
