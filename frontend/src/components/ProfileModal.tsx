import { useState, FormEvent } from "react";
import { api, CurrentUser } from "../api";
import ChangePasswordModal from "./ChangePasswordModal";

interface Props {
  user: CurrentUser;
  onClose: () => void;
  onUpdated: (u: CurrentUser) => void;
}

const labelStyle: React.CSSProperties = {
  fontSize: "0.8rem", color: "var(--muted)", display: "block", marginBottom: "0.3rem",
};

export default function ProfileModal({ user, onClose, onUpdated }: Props) {
  // Si por algún motivo no hay nombre/apellido guardado, los derivamos del display_name.
  const [dnFirst, ...dnRest] = (user.display_name || "").split(" ");
  const [firstName, setFirstName] = useState(user.first_name || dnFirst || "");
  const [lastName, setLastName] = useState(user.last_name || dnRest.join(" "));
  const [username, setUsername] = useState(user.username);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setSaved(false); setSaving(true);
    try {
      const updated = await api.updateProfile({ first_name: firstName, username });
      onUpdated(updated);
      localStorage.setItem("last_username", updated.username);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 200, padding: "1rem",
      }}>
        <div className="card" style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h3 style={{ fontWeight: 700 }}>Mi cuenta</h3>
            <button className="btn-ghost" onClick={onClose} style={{ fontSize: "1.2rem", padding: "0.2rem 0.5rem" }}>×</button>
          </div>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div>
              <label style={labelStyle}>Nombre</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle}>Apellido</label>
              <input value={lastName} readOnly style={{ opacity: 0.6, cursor: "not-allowed" }} />
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.3rem" }}>
                Para cambiar tu apellido contactá al organizador.
              </p>
            </div>
            <div>
              <label style={labelStyle}>Usuario</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().trim())}
                required
              />
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.3rem" }}>
                Es con el que iniciás sesión. Sin espacios, mínimo 3 caracteres.
              </p>
            </div>

            {error && (
              <div style={{ background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: 8, padding: "0.6rem 0.85rem", fontSize: "0.85rem", color: "#fca5a5" }}>
                {error}
              </div>
            )}
            {saved && (
              <div style={{ color: "var(--green)", fontSize: "0.85rem", textAlign: "center" }}>✓ Cambios guardados</div>
            )}

            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </form>

          {/* Cambiar contraseña */}
          <div style={{ marginTop: "1.1rem", paddingTop: "1.1rem", borderTop: "1px solid var(--border)" }}>
            <button className="btn-secondary" onClick={() => setShowPwd(true)} style={{ width: "100%" }}>
              Cambiar contraseña
            </button>
          </div>
        </div>
      </div>

      {showPwd && <ChangePasswordModal onClose={() => setShowPwd(false)} />}
    </>
  );
}
