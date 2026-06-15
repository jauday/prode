import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useTheme } from "./hooks/useTheme";
import Login from "./pages/Login";
import Fixtures from "./pages/Fixtures";
import Standings from "./pages/Standings";
import AdminPanel from "./pages/admin/AdminPanel";
import ChangePasswordModal from "./components/ChangePasswordModal";

type Tab = "fixtures" | "standings" | "admin";

export default function App() {
  const { user, loading, login, setup, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [tab, setTab] = useState<Tab>("fixtures");
  const [showChangePwd, setShowChangePwd] = useState(false);

  if (loading) return <div className="spinner" style={{ marginTop: "40vh" }} />;
  if (!user) return <Login onLogin={login} onSetup={setup} />;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 1rem 5rem" }}>
      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 0", borderBottom: "1px solid var(--border)", marginBottom: "1.25rem",
        position: "sticky", top: 0, background: "var(--bg)", zIndex: 10,
      }}>
        <span style={{ fontSize: "1.1rem", fontWeight: 700 }}>🏆 Prode Kalunga</span>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {/* Theme toggle */}
          <button
            onClick={toggle}
            title={theme === "dark" ? "Modo día" : "Modo noche"}
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              width: 34,
              height: 34,
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text)",
            }}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{user.display_name}</span>

          <button
            className="btn-ghost"
            onClick={() => setShowChangePwd(true)}
            title="Cambiar contraseña"
            style={{ fontSize: "0.8rem", padding: "0.35rem 0.6rem" }}
          >
            🔑
          </button>

          <button
            className="btn-ghost"
            onClick={logout}
            style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
          >
            Salir
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
        {([
          { key: "fixtures", label: "⚽ Partidos" },
          { key: "standings", label: "🏅 Tabla" },
          ...(user.is_admin ? [{ key: "admin", label: "🛠 Admin" }] : []),
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius)",
              fontWeight: 600,
              fontSize: "0.9rem",
              background: tab === key ? "var(--accent)" : "var(--surface2)",
              color: tab === key ? "#fff" : "var(--muted)",
              border: "1px solid " + (tab === key ? "transparent" : "var(--border)"),
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}

      {tab === "fixtures" && <Fixtures />}
      {tab === "standings" && <Standings />}
      {tab === "admin" && user.is_admin && <AdminPanel />}
    </div>
  );
}
