import { useEffect, useState } from "react";
import { api, AdminUser } from "../../api";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: "1rem",
    }}>
      <div className="card" style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ fontWeight: 700 }}>{title}</h3>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: "1.2rem", padding: "0.2rem 0.5rem" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "0.85rem" }}>
      <label style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>{label}</label>
      {children}
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [resetting, setResetting] = useState<AdminUser | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState("");
  const [form, setForm] = useState({ username: "", password: "", display_name: "", is_admin: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => api.admin.users().then(setUsers).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ username: "", password: "", display_name: "", is_admin: false });
    setError("");
    setShowCreate(true);
  };

  const openEdit = (u: AdminUser) => {
    setForm({ username: u.username, password: "", display_name: u.display_name, is_admin: !!u.is_admin });
    setError("");
    setEditing(u);
  };

  const save = async () => {
    setSaving(true); setError("");
    try {
      if (editing) {
        const patch: any = { display_name: form.display_name, is_admin: form.is_admin };
        if (form.password) patch.password = form.password;
        await api.admin.updateUser(editing.id, patch);
      } else {
        if (!form.username || !form.password || !form.display_name) throw new Error("Completá todos los campos");
        await api.admin.createUser(form);
      }
      setShowCreate(false); setEditing(null);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (u: AdminUser) => {
    if (!confirm(`¿Eliminar a ${u.display_name}? Se borran sus predicciones también.`)) return;
    await api.admin.deleteUser(u.id);
    load();
  };

  const openReset = (u: AdminUser) => {
    setResetting(u);
    setResetPwd("");
    setResetError("");
  };

  const saveReset = async () => {
    if (resetPwd.length < 4) { setResetError("Mínimo 4 caracteres"); return; }
    setResetSaving(true); setResetError("");
    try {
      await api.admin.resetPassword(resetting!.id, resetPwd);
      setResetting(null);
    } catch (e: any) {
      setResetError(e.message);
    } finally {
      setResetSaving(false);
    }
  };

  const modalOpen = showCreate || !!editing;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ fontWeight: 700 }}>Jugadores ({users.length})</h3>
        <button className="btn-primary" onClick={openCreate} style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}>
          + Nuevo
        </button>
      </div>

      {loading ? <div className="spinner" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {users.map(u => (
            <div key={u.id} className="card" style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1rem" }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{u.display_name}</span>
                <span style={{ color: "var(--muted)", fontSize: "0.82rem", marginLeft: "0.5rem" }}>@{u.username}</span>
                {!!u.is_admin && <span className="badge badge-gold" style={{ marginLeft: "0.5rem" }}>Admin</span>}
              </div>
              <button className="btn-ghost" onClick={() => openEdit(u)} style={{ fontSize: "0.82rem" }}>Editar</button>
              <button onClick={() => openReset(u)} style={{
                background: "transparent", color: "var(--muted)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "0.3rem 0.65rem", fontSize: "0.82rem",
              }}>🔑</button>
              <button onClick={() => del(u)} style={{
                background: "transparent", color: "var(--red)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "0.3rem 0.65rem", fontSize: "0.82rem",
              }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {resetting && (
        <Modal title={`Resetear contraseña — ${resetting.display_name}`} onClose={() => setResetting(null)}>
          <Field label="Nueva contraseña">
            <input
              type="password"
              value={resetPwd}
              onChange={e => setResetPwd(e.target.value)}
              placeholder="Mínimo 4 caracteres"
              autoFocus
            />
          </Field>
          {resetError && <p style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{resetError}</p>}
          <button className="btn-primary" onClick={saveReset} disabled={resetSaving} style={{ width: "100%" }}>
            {resetSaving ? "Guardando…" : "Resetear contraseña"}
          </button>
        </Modal>
      )}

      {modalOpen && (
        <Modal title={editing ? "Editar jugador" : "Nuevo jugador"} onClose={() => { setShowCreate(false); setEditing(null); }}>
          {!editing && (
            <Field label="Username">
              <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="sin espacios, minúsculas" />
            </Field>
          )}
          <Field label="Nombre visible">
            <input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} placeholder="Nombre en la tabla" />
          </Field>
          <Field label={editing ? "Nueva contraseña (dejá vacío para no cambiar)" : "Contraseña"}>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••" />
          </Field>
          <Field label="">
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input type="checkbox" checked={form.is_admin} onChange={e => setForm(f => ({ ...f, is_admin: e.target.checked }))} />
              <span style={{ fontSize: "0.9rem" }}>Es administrador</span>
            </label>
          </Field>
          {error && <p style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{error}</p>}
          <button className="btn-primary" onClick={save} disabled={saving} style={{ width: "100%" }}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </Modal>
      )}
    </div>
  );
}
