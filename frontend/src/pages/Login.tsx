import { useState, FormEvent } from "react";
import { api } from "../api";

type Step = "name" | "password" | "setup";

interface Props {
  onLogin: (username: string, password: string) => Promise<void>;
  onSetup: (username: string, password: string) => Promise<void>;
}

export default function Login({ onLogin, onSetup }: Props) {
  const [step, setStep] = useState<Step>("name");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const back = () => {
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

        {/* ── Paso 1: nombre ── */}
        {step === "name" && (
          <form onSubmit={handleLookup} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", textAlign: "center", marginTop: "-1rem" }}>
              Ingresá tu nombre y apellido para entrar
            </p>
            <div>
              <label style={{ fontSize: "0.82rem", color: "var(--muted)", display: "block", marginBottom: "0.4rem" }}>
                Nombre y apellido
              </label>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Ej: Joaquin Auday"
                autoFocus
                required
              />
            </div>
            {error && <ErrorBox msg={error} />}
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Buscando…" : "Continuar →"}
            </button>
          </form>
        )}

        {/* ── Paso 2a: ingresar contraseña ── */}
        {step === "password" && (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <FoundBadge name={displayName} onBack={back} />
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

        {/* ── Paso 2b: crear contraseña (primera vez) ── */}
        {step === "setup" && (
          <form onSubmit={handleSetup} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <FoundBadge name={displayName} onBack={back} />
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
