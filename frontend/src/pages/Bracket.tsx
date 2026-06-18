import { useEffect, useState } from "react";
import { api, BracketStage, BracketMatch } from "../api";
import { teamNameEs } from "../teamNames";

const STAGE_LABEL: Record<string, string> = {
  LAST_32:        "16avos",
  LAST_16:        "8vos",
  QUARTER_FINALS: "4tos",
  SEMI_FINALS:    "Semis",
  THIRD_PLACE:    "3er puesto",
  FINAL:          "Final",
};

function TeamRow({ name, crest, score, winner }: {
  name: string | null; crest: string | null;
  score: number | null; winner: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.5rem",
      padding: "0.45rem 0.65rem",
      background: winner ? "rgba(251,191,36,0.08)" : "transparent",
      borderRadius: 6,
    }}>
      {crest
        ? <img src={crest} alt="" style={{ width: 20, height: 20, objectFit: "contain", flexShrink: 0 }} />
        : <div style={{ width: 20, height: 20, borderRadius: 3, background: "var(--surface2)", flexShrink: 0 }} />
      }
      <span style={{
        flex: 1, fontSize: "0.85rem", fontWeight: winner ? 700 : 400,
        color: name ? "var(--text)" : "var(--muted)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {name ? teamNameEs(name) : "Por definir"}
      </span>
      {score !== null && (
        <span style={{ fontWeight: 800, fontSize: "0.95rem", color: winner ? "var(--gold)" : "var(--text)", flexShrink: 0 }}>
          {score}
        </span>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: BracketMatch }) {
  const finished = match.status === "FINISHED";
  const homeWin = finished && match.home_score !== null && match.away_score !== null && match.home_score > match.away_score;
  const awayWin = finished && match.home_score !== null && match.away_score !== null && match.away_score > match.home_score;

  const kickOff = new Date(match.kick_off);
  const dateStr = kickOff.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  const timeStr = kickOff.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="card" style={{ padding: "0.5rem 0.5rem", marginBottom: "0.5rem" }}>
      <TeamRow name={match.home_team} crest={match.home_crest} score={match.home_score} winner={homeWin} />
      <div style={{ height: 1, background: "var(--border)", margin: "0 0.65rem" }} />
      <TeamRow name={match.away_team} crest={match.away_crest} score={match.away_score} winner={awayWin} />
      <div style={{ textAlign: "center", fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.4rem" }}>
        {finished ? "Finalizado" : `${dateStr} · ${timeStr}`}
      </div>
    </div>
  );
}

export default function Bracket() {
  const [stages, setStages] = useState<BracketStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeStage, setActiveStage] = useState<string>("");

  useEffect(() => {
    api.bracket()
      .then(data => {
        setStages(data);
        if (data.length) setActiveStage(data[0].stage);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;
  if (error) return <p style={{ color: "var(--red)", textAlign: "center", marginTop: "2rem" }}>{error}</p>;

  const current = stages.find(s => s.stage === activeStage);

  return (
    <div>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: "1rem" }}>
        Llave eliminatoria
      </h2>

      {/* Stage tabs */}
      <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1.1rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
        {stages.map(s => (
          <button
            key={s.stage}
            onClick={() => setActiveStage(s.stage)}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.82rem",
              whiteSpace: "nowrap",
              flexShrink: 0,
              cursor: "pointer",
              background: activeStage === s.stage ? "var(--accent)" : "var(--surface2)",
              color: activeStage === s.stage ? "#fff" : "var(--muted)",
              border: "1px solid " + (activeStage === s.stage ? "transparent" : "var(--border)"),
            }}
          >
            {STAGE_LABEL[s.stage] ?? s.stage}
          </button>
        ))}
      </div>

      {/* Matches */}
      {current && (
        <div>
          {current.matches.length === 0 ? (
            <p style={{ color: "var(--muted)", textAlign: "center", marginTop: "2rem" }}>
              Los cruces se definirán al terminar la fase de grupos.
            </p>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: current.matches.length >= 4 ? "1fr 1fr" : "1fr",
              gap: "0.5rem",
            }}>
              {current.matches.map(m => <MatchCard key={m.id} match={m} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
