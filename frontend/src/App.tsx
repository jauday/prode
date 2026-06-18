import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useTheme } from "./hooks/useTheme";
import Login from "./pages/Login";
import Fixtures from "./pages/Fixtures";
import Standings from "./pages/Standings";
import Groups from "./pages/Groups";
import Bracket from "./pages/Bracket";
import AdminPanel from "./pages/admin/AdminPanel";
import ProfileModal from "./components/ProfileModal";

type Tab = "fixtures" | "standings" | "groups" | "bracket" | "admin";

export default function App() {
  const { user, loading, login, setup, logout, updateUser } = useAuth();
  const { theme, toggle } = useTheme();
  const [tab, setTab] = useState<Tab>("fixtures");
  const [showProfile, setShowProfile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            title="Mi cuenta"
            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "0.85rem", padding: "0.35rem 0.5rem", display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text)" }}
          >
            <span style={{ color: "var(--muted)" }}>{user.display_name}</span>
            <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>▾</span>
          </button>

          {menuOpen && (
            <>
              {/* overlay para cerrar al clickear afuera */}
              <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 50,
                background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)", minWidth: 190, overflow: "hidden",
                display: "flex", flexDirection: "column",
              }}>
                <MenuItem onClick={() => { setShowProfile(true); setMenuOpen(false); }}>Editar perfil</MenuItem>
                <MenuItem onClick={toggle}>{theme === "dark" ? "Modo claro" : "Modo noche"}</MenuItem>
                <div style={{ borderTop: "1px solid var(--border)" }} />
                <MenuItem onClick={() => { setMenuOpen(false); logout(); }} danger>Cerrar sesión</MenuItem>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
        {([
          { key: "fixtures", label: "⚽ Partidos" },
          { key: "standings", label: "🏅 Tabla" },
          { key: "groups", label: "🌍 Grupos" },
          { key: "bracket", label: "🏆 Llaves" },
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

      {showProfile && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onUpdated={updateUser}
        />
      )}

      {tab === "fixtures" && <Fixtures currentUserId={user.id} />}
      {tab === "standings" && <Standings />}
      {tab === "groups" && <Groups />}
      {tab === "bracket" && <Bracket />}
      {tab === "admin" && user.is_admin && <AdminPanel />}
    </div>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent", border: "none", cursor: "pointer",
        textAlign: "left", padding: "0.7rem 1rem", fontSize: "0.88rem",
        color: danger ? "var(--red)" : "var(--text)", fontWeight: 600,
        display: "flex", alignItems: "center", gap: "0.5rem", width: "100%",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}
