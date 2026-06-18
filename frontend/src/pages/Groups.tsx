import { useEffect, useState } from "react";
import { api, GroupStanding } from "../api";
import { teamNameEs } from "../teamNames";

function GroupTable({ group }: { group: GroupStanding }) {
  const label = group.group.replace(/^Group /i, "Grupo ");

  const th: React.CSSProperties = {
    padding: "0.4rem 0.5rem",
    color: "var(--muted)",
    fontSize: "0.7rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "center",
    borderBottom: "1px solid var(--border)",
    whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    padding: "0.55rem 0.5rem",
    textAlign: "center",
    fontSize: "0.85rem",
  };

  return (
    <div className="card" style={{ padding: "0.85rem 0.75rem", marginBottom: "0.85rem" }}>
      <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.6rem", color: "var(--gold)" }}>
        {label}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left", paddingLeft: "0.25rem" }}>#</th>
              <th style={{ ...th, textAlign: "left" }}>Equipo</th>
              <th style={th}>PJ</th>
              <th style={th}>G</th>
              <th style={th}>E</th>
              <th style={th}>P</th>
              <th style={th}>DG</th>
              <th style={{ ...th, color: "var(--gold)", fontWeight: 800 }}>Pts</th>
            </tr>
          </thead>
          <tbody>
            {group.table.map((row, i) => (
              <tr key={row.team_name} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                <td style={{ ...td, color: "var(--muted)", fontWeight: 600, paddingLeft: "0.25rem" }}>
                  {row.position}
                </td>
                <td style={{ ...td, textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {row.team_crest && (
                      <img src={row.team_crest} alt={row.team_name} style={{ width: 20, height: 20, objectFit: "contain", flexShrink: 0 }} />
                    )}
                    <span style={{ fontWeight: row.position <= 2 ? 700 : 400, fontSize: "0.82rem", lineHeight: 1.2 }}>
                      {teamNameEs(row.team_name)}
                    </span>
                  </div>
                </td>
                <td style={{ ...td, color: "var(--muted)" }}>{row.played}</td>
                <td style={td}>{row.won}</td>
                <td style={td}>{row.draw}</td>
                <td style={td}>{row.lost}</td>
                <td style={{ ...td, color: row.gd > 0 ? "var(--green)" : row.gd < 0 ? "var(--red)" : "var(--muted)" }}>
                  {row.gd > 0 ? `+${row.gd}` : row.gd}
                </td>
                <td style={{ ...td, fontWeight: 800, fontSize: "0.95rem", color: "var(--gold)" }}>
                  {row.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: "0.5rem", fontSize: "0.7rem", color: "var(--muted)" }}>
        Los dos primeros clasifican directamente · Los mejores terceros también avanzan
      </div>
    </div>
  );
}

export default function Groups() {
  const [groups, setGroups] = useState<GroupStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.groupStandings()
      .then(setGroups)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;
  if (error) return <p style={{ color: "var(--red)", textAlign: "center", marginTop: "2rem" }}>{error}</p>;

  return (
    <div>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: "1rem" }}>
        Tabla de grupos
      </h2>
      {groups.map(g => <GroupTable key={g.group} group={g} />)}
    </div>
  );
}
