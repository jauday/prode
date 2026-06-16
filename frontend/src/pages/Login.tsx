import { useState, useEffect, FormEvent } from "react";
import { api } from "../api";

type Step = "choice" | "login" | "name" | "password" | "setup";

interface Props {
  onLogin: (username: string, password: string) => Promise<void>;
  onSetup: (username: string, password: string) => Promise<void>;
}

export default function Login({ onLogin, onSetup }: Props) {
  const [step, setStep] = useState<Step>("choice");
  const [signupEnabled, setSignupEnabled] = useState(true);
  const savedUsername = localStorage.getItem("last_username") ?? "";

  useEffect(() => {
    api.publicSettings()
      .then(s => {
        setSignupEnabled(s.signup_enabled);
        // Si el registro está cerrado, ir directo al login
        if (!s.signup_enabled) setStep("login");
      })
      .catch(() => {}); // si falla, default habilitado
  }, []);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState(savedUsername);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Login directo con usuario + contraseña ──
  const handleDirectLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onLogin(username, password);
      localStorage.setItem("last_username", username);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Lookup por nombre (primera vez) ──
  const handleLookup = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.lookup(fullName);
      setUsername(res.username);
      setDisplayName(res.display_name);
      setStep(res.needs_password ? "setup" : "password");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Login tras lookup ──
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onLogin(username, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Setup contraseña (primera vez) ──
  const handleSetup = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Las contraseñas no coinciden"); return; }
    if (password.length < 4) { setError("Mínimo 4 caracteres"); return; }
    setLoading(true);
    try {
      await onSetup(username, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep("choice");
    setFullName("");
    setUsername("");
    setDisplayName("");
    setPassword("");
    setConfirm("");
    setError("");
  };

  const backToName = () => {
    setStep("name");
    setPassword("");
    setConfirm("");
    setError("");
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "1rem" }}>
      <div className="card" style={{ width: "100%", maxWidth: 380 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "3rem" }}>🏆</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.5rem" }}>Prode Kalunga</h1>
        </div>

        {/* ── Pantalla inicial: elegir modo ── */}
        {step === "choice" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <button
              className="btn-primary"
              onClick={() => { setError(""); setStep("login"); }}
            >
              Iniciar sesión
            </button>
            {signupEnabled && (
              <button
                className="btn-secondary"
                onClick={() => { setError(""); setStep("name"); }}
              >
                Primera vez — crear cuenta
              </button>
            )}
          </div>
        )}

        {/* ── Login directo ── */}
        {step === "login" && (
          <form onSubmit={handleDirectLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.82rem", color: "var(--muted)", display: "block", marginBottom: "0.4rem" }}>
                Usuario
              </label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().trim())}
                placeholder="Ej: mgarcia"
                autoFocus
                required
              />
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.35rem" }}>
                Tu usuario es la inicial de tu nombre + tu apellido (ej: María García → <strong>mgarcia</strong>)
              </p>
            </div>
            <div>
              <label style={{ fontSize: "0.82rem", color: "var(--muted)", display: "block", marginBottom: "0.4rem" }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
                required
              />
            </div>
            {error && <ErrorBox msg={error} />}
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Ingresando…" : "Ingresar"}
            </button>
            <button type="button" onClick={reset} style={linkStyle}>
              ← Volver
            </button>
          </form>
        )}

        {/* ── Primera vez: buscar por nombre ── */}
        {step === "name" && (
          <form onSubmit={handleLookup} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", textAlign: "center", marginTop: "-1rem" }}>
              Ingresá tu nombre y apellido para encontrarte
            </p>
            <div>
              <label style={{ fontSize: "0.82rem", color: "var(--muted)", display: "block", marginBottom: "0.4rem" }}>
                Nombre y apellido
              </label>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Ej: María García"
                autoFocus
                required
              />
            </div>
            {error && <ErrorBox msg={error} />}
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Buscando…" : "Continuar →"}
            </button>
            <button type="button" onClick={reset} style={linkStyle}>
              ← Volver
            </button>
          </form>
        )}

        {/* ── Ingresar contraseña (tras lookup) ── */}
        {step === "password" && (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <FoundBadge name={displayName} onBack={backToName} />
            <div>
              <label style={{ fontSize: "0.82rem", color: "var(--muted)", display: "block", marginBottom: "0.4rem" }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
                autoFocus
                required
              />
            </div>
            {error && <ErrorBox msg={error} />}
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
        )}

        {/* ── Crear contraseña (primera vez) ── */}
        {step === "setup" && (
          <form onSubmit={handleSetup} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <FoundBadge name={displayName} onBack={backToName} />
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", textAlign: "center", marginTop: "-0.25rem" }}>
              Primera vez que entrás — elegí tu contraseña
            </p>
            <div>
              <label style={{ fontSize: "0.82rem", color: "var(--muted)", display: "block", marginBottom: "0.4rem" }}>
                Nueva contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                autoFocus
                required
              />
            </div>
            <div>
              <label style={{ fontSize: "0.82rem", color: "var(--muted)", display: "block", marginBottom: "0.4rem" }}>
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repetí la contraseña"
                required
              />
            </div>
            {error && <ErrorBox msg={error} />}
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Guardando…" : "Crear contraseña y entrar"}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--muted)",
  fontSize: "0.85rem",
  cursor: "pointer",
  textAlign: "center",
  padding: "0.25rem",
};

function FoundBadge({ name, onBack }: { name: string; onBack: () => void }) {
  return (
    <div style={{
      background: "var(--surface2)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "0.6rem 0.85rem",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ color: "var(--green)" }}>✓</span>
        <span style={{ fontWeight: 600, fontSize: "0.92rem" }}>{name}</span>
      </div>
      <button onClick={onBack} style={{
        background: "transparent", border: "none", color: "var(--muted)",
        fontSize: "0.8rem", cursor: "pointer", padding: "0.2rem 0.4rem",
      }}>
        Cambiar
      </button>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      background: "#450a0a", border: "1px solid #7f1d1d",
      borderRadius: 8, padding: "0.65rem 0.85rem",
      fontSize: "0.88rem", color: "#fca5a5",
    }}>
      {msg}
    </div>
  );
}
