import { useState, FormEvent } from "react";
import { api } from "../api";

interface Props { onClose: () => void }

export default function ChangePasswordModal({ onClose }: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext]       = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [done, setDone]       = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (next !== confirm) { setError("Las contraseñas no coinciden"); return; }
    if (next.length < 4)  { setError("Mínimo 4 caracteres"); return; }
    setSaving(true);
    try {
      await api.changePassword(current, next);
      setDone(true);
      setTimeout(onClose, 1500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 200, padding: "1rem",
    }}>
      <div className="card" style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ fontWeight: 700 }}>Cambiar contraseña</h3>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: "1.2rem", padding: "0.2rem 0.5rem" }}>×</button>
        </div>

        {done ? (
          <p style={{ color: "var(--green)", textAlign: "center", padding: "1rem 0" }}>✓ Contraseña actualizada</p>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {[
              { label: "Contraseña actual", value: current, set: setCurrent },
              { label: "Nueva contraseña",  value: next,    set: setNext },
              { label: "Confirmar nueva",   value: confirm, set: setConfirm },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>{label}</label>
                <input type="password" value={value} onChange={e => set(e.target.value)} placeholder="••••••" required />
              </div>
            ))}

            {error && (
              <div style={{ background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: 8, padding: "0.6rem 0.85rem", fontSize: "0.85rem", color: "#fca5a5" }}>
                {error}
              </div>
            )}

            <button className="btn-primary" type="submit" disabled={saving} style={{ marginTop: "0.25rem" }}>
              {saving ? "Guardando…" : "Cambiar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
