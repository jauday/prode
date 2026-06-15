import { useState } from "react";
import AdminUsers from "./AdminUsers";
import AdminMatches from "./AdminMatches";
import { api } from "../../api";

type AdminTab = "matches" | "users";

function ResetModal({ onClose }: { onClose: () => void }) {
  const [confirmText, setConfirmText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  const reset = async () => {
    setSaving(true); setError("");
    try {
      const r = await api.admin.resetTournament();
      setResult(r.message);
      setTimeout(onClose, 1800);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "1rem" }}>
      <div className="card" style={{ width: "100%", maxWidth: 400, border: "1px solid var(--red)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ fontWeight: 700, color: "var(--red)" }}>⚠️ Reiniciar torneo</h3>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: "1.2rem" }}>×</button>
        </div>

        {result ? (
          <p style={{ color: "var(--green)", textAlign: "center", padding: "1rem 0" }}>✓ {result}</p>
        ) : (
          <>
            <p style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: "1rem", lineHeight: 1.5 }}>
              Esto borra <strong style={{ color: "var(--text)" }}>todas las predicciones y puntos</strong> de todos los jugadores.
              Los usuarios y partidos quedan intactos. <strong style={{ color: "var(--text)" }}>No se puede deshacer.</strong>
            </p>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "0.4rem" }}>
              Escribí <strong style={{ color: "var(--red)" }}>REINICIAR</strong> para confirmar:
            </p>
            <input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="REINICIAR"
              style={{ marginBottom: "1rem" }}
              autoFocus
            />
            {error && <p style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{error}</p>}
            <button
              onClick={reset}
              disabled={saving || confirmText !== "REINICIAR"}
              style={{
                width: "100%", padding: "0.7rem", borderRadius: "var(--radius)", fontWeight: 700,
                background: confirmText === "REINICIAR" ? "var(--red)" : "var(--surface2)",
                color: "#fff",
                opacity: confirmText === "REINICIAR" ? 1 : 0.5,
              }}
            >
              {saving ? "Reiniciando…" : "Borrar todo y reiniciar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [tab, setTab] = useState<AdminTab>("matches");
  const [showReset, setShowReset] = useState(false);

  const tabBtn = (t: AdminTab, label: string) => (
    <button onClick={() => setTab(t)} style={{
      padding: "0.45rem 1rem",
      borderRadius: 8,
      fontWeight: 600,
      fontSize: "0.85rem",
      cursor: "pointer",
      background: tab === t ? "var(--surface2)" : "transparent",
      border: "1px solid " + (tab === t ? "var(--border)" : "transparent"),
      color: tab === t ? "var(--text)" : "var(--muted)",
    }}>
      {label}
    </button>
  );

  return (
    <div>
      {/* Banner */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a5f, #1d4ed8)",
        borderRadius: "var(--radius)",
        padding: "0.85rem 1.1rem",
        marginBottom: "1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
      }}>
        <span style={{ fontSize: "1.2rem" }}>🛠</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Panel de administración</div>
          <div style={{ fontSize: "0.78rem", color: "#93c5fd" }}>Gestión de jugadores, partidos y resultados</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.25rem", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {tabBtn("matches", "⚽ Partidos")}
          {tabBtn("users", "👥 Jugadores")}
        </div>
        <button onClick={() => setShowReset(true)} style={{
          padding: "0.45rem 0.9rem", borderRadius: 8, fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
          background: "transparent", border: "1px solid var(--red)", color: "var(--red)",
        }}>
          ⚠️ Reiniciar torneo
        </button>
      </div>

      {tab === "matches" ? <AdminMatches /> : <AdminUsers />}

      {showReset && <ResetModal onClose={() => setShowReset(false)} />}
    </div>
  );
}
