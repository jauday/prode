import { useEffect, useState } from "react";
import { api, AdminMatch, AdminPrediction } from "../../api";
import { teamNameEs } from "../../teamNames";

function toLocalDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function statusColor(s: string) {
  if (s === "FINISHED") return "var(--muted)";
  if (s === "IN_PLAY" || s === "PAUSED") return "#fca5a5";
  return "var(--green)";
}

function ScoreModal({ match, onClose, onSaved }: { match: AdminMatch; onClose: () => void; onSaved: () => void }) {
  const [home, setHome] = useState(match.home_score?.toString() ?? "");
  const [away, setAway] = useState(match.away_score?.toString() ?? "");
  const [status, setStatus] = useState(match.status === "SCHEDULED" || match.status === "TIMED" ? "FINISHED" : match.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    const h = parseInt(home), a = parseInt(away);
    if (isNaN(h) || isNaN(a)) { setError("Ingresá marcadores válidos"); return; }
    setSaving(true);
    try {
      await api.admin.setScore(match.id, h, a, status);
      onSaved(); onClose();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
      <div className="card" style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h3 style={{ fontWeight: 700 }}>Cargar resultado</h3>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: "1.2rem" }}>×</button>
        </div>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
          {teamNameEs(match.home_team)} vs {teamNameEs(match.away_team)}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", justifyContent: "center", marginBottom: "1rem" }}>
          <input value={home} onChange={e => setHome(e.target.value.replace(/\D/g, ""))} style={{ width: 64, textAlign: "center", fontSize: "1.5rem", fontWeight: 700 }} maxLength={2} />
          <span style={{ fontWeight: 700, fontSize: "1.2rem", color: "var(--muted)" }}>–</span>
          <input value={away} onChange={e => setAway(e.target.value.replace(/\D/g, ""))} style={{ width: 64, textAlign: "center", fontSize: "1.5rem", fontWeight: 700 }} maxLength={2} />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>Estado</label>
          <select value={status} onChange={e => setStatus(e.target.value)} style={{
            width: "100%", background: "var(--surface2)", border: "1px solid var(--border)",
            borderRadius: 8, color: "var(--text)", padding: "0.55rem 0.75rem", fontSize: "0.9rem",
          }}>
            <option value="IN_PLAY">En juego</option>
            <option value="PAUSED">Descanso</option>
            <option value="FINISHED">Finalizado</option>
          </select>
        </div>

        {error && <p style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{error}</p>}
        <button className="btn-primary" onClick={save} disabled={saving} style={{ width: "100%" }}>
          {saving ? "Guardando…" : "Guardar y recalcular puntos"}
        </button>
      </div>
    </div>
  );
}

function PredictionsModal({ match, onClose }: { match: AdminMatch; onClose: () => void }) {
  const [preds, setPreds] = useState<AdminPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.predictions(match.id).then(setPreds).finally(() => setLoading(false));
  }, [match.id]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
      <div className="card" style={{ width: "100%", maxWidth: 480, maxHeight: "80vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h3 style={{ fontWeight: 700 }}>Predicciones</h3>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: "1.2rem" }}>×</button>
        </div>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
          {teamNameEs(match.home_team)} vs {teamNameEs(match.away_team)}
          {match.home_score !== null && <strong style={{ color: "var(--text)", marginLeft: 8 }}>{match.home_score}–{match.away_score}</strong>}
        </p>

        {loading ? <div className="spinner" /> : preds.length === 0 ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "1rem" }}>Nadie cargó predicción para este partido.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                <th style={{ textAlign: "left", padding: "0.4rem 0.5rem", borderBottom: "1px solid var(--border)" }}>Jugador</th>
                <th style={{ textAlign: "center", padding: "0.4rem 0.5rem", borderBottom: "1px solid var(--border)" }}>Pred.</th>
                <th style={{ textAlign: "center", padding: "0.4rem 0.5rem", borderBottom: "1px solid var(--border)" }}>Pts</th>
              </tr>
            </thead>
            <tbody>
              {preds.sort((a, b) => (b.points ?? -1) - (a.points ?? -1)).map(p => (
                <tr key={p.id}>
                  <td style={{ padding: "0.5rem" }}>{p.display_name}</td>
                  <td style={{ padding: "0.5rem", textAlign: "center", fontWeight: 700 }}>{p.pred_home}–{p.pred_away}</td>
                  <td style={{ padding: "0.5rem", textAlign: "center" }}>
                    {p.points === null ? <span style={{ color: "var(--muted)" }}>—</span>
                      : p.points === 12 ? <span className="badge badge-gold">{p.points}</span>
                      : p.points >= 5   ? <span className="badge badge-green">{p.points}</span>
                      : p.points >= 2   ? <span className="badge badge-blue">{p.points}</span>
                      : <span className="badge badge-gray">0</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function AdminMatches() {
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [scoreMatch, setScoreMatch] = useState<AdminMatch | null>(null);
  const [predsMatch, setPredsMatch] = useState<AdminMatch | null>(null);
  const [filterMd, setFilterMd] = useState<number | "all">("all");

  const load = () => api.admin.matches().then(setMatches).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const sync = async () => {
    setSyncing(true);
    try { await api.admin.sync(); await load(); }
    finally { setSyncing(false); }
  };

  const matchdays = [...new Set(matches.map(m => m.matchday).filter(Boolean) as number[])].sort((a, b) => a - b);
  const visible = filterMd === "all" ? matches : matches.filter(m => m.matchday === filterMd);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h3 style={{ fontWeight: 700 }}>Partidos ({matches.length})</h3>
        <button onClick={sync} disabled={syncing} style={{
          background: "var(--surface2)", border: "1px solid var(--border)",
          borderRadius: 8, color: "var(--text)", padding: "0.45rem 0.9rem", fontSize: "0.82rem", fontWeight: 600,
        }}>
          {syncing ? "Sincronizando…" : "↻ Sincronizar API"}
        </button>
      </div>

      {/* Filtro por fecha */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {[{ label: "Todos", val: "all" as const }, ...matchdays.map(md => ({ label: `Fecha ${md}`, val: md }))].map(opt => (
          <button key={opt.val} onClick={() => setFilterMd(opt.val)} style={{
            padding: "0.3rem 0.75rem", borderRadius: 999, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
            border: "1px solid " + (filterMd === opt.val ? "var(--accent)" : "var(--border)"),
            background: filterMd === opt.val ? "var(--accent)" : "transparent",
            color: filterMd === opt.val ? "#fff" : "var(--muted)",
          }}>
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? <div className="spinner" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {visible.map(m => (
            <div key={m.id} className="card" style={{ padding: "0.85rem 1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>
                    {teamNameEs(m.home_team)} <span style={{ color: "var(--muted)" }}>vs</span> {teamNameEs(m.away_team)}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                    {toLocalDate(m.kick_off)} · <span style={{ color: statusColor(m.status) }}>{m.status}</span>
                    {m.home_score !== null && <strong style={{ color: "var(--text)", marginLeft: 6 }}>{m.home_score}–{m.away_score}</strong>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                  <button onClick={() => setPredsMatch(m)} style={{
                    background: "transparent", border: "1px solid var(--border)", borderRadius: 8,
                    color: "var(--muted)", padding: "0.3rem 0.6rem", fontSize: "0.78rem",
                  }}>
                    👁 Preds
                  </button>
                  <button onClick={() => setScoreMatch(m)} style={{
                    background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8,
                    color: "var(--text)", padding: "0.3rem 0.6rem", fontSize: "0.78rem", fontWeight: 600,
                  }}>
                    ✏️ Score
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {scoreMatch && <ScoreModal match={scoreMatch} onClose={() => setScoreMatch(null)} onSaved={load} />}
      {predsMatch && <PredictionsModal match={predsMatch} onClose={() => setPredsMatch(null)} />}
    </div>
  );
}
