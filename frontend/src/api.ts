const BASE = (import.meta as any).env?.VITE_API_URL ?? "/api";

function getToken() {
  return localStorage.getItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.");
  }
  if (res.status === 401 && path !== "/auth/login") {
    // token vencido o inválido → forzar re-login
    localStorage.removeItem("token");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error del servidor" }));
    throw new Error(err.detail ?? "Error del servidor");
  }
  return res.json();
}

export const api = {
  login: async (username: string, password: string) => {
    const body = new URLSearchParams({ username, password });
    let r: Response;
    try {
      r = await fetch(`${BASE}/auth/login`, { method: "POST", body });
    } catch {
      throw new Error("No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.");
    }
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail ?? "Credenciales incorrectas"); }
    return r.json();
  },

  lookup: (full_name: string) =>
    request<{ username: string; display_name: string; needs_password: boolean }>("/auth/lookup", {
      method: "POST",
      body: JSON.stringify({ full_name }),
    }),

  setupPassword: (username: string, password: string) =>
    request<{ access_token: string; token_type: string; user: any }>("/auth/setup", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  me: () => request<CurrentUser>("/auth/me"),

  updateProfile: (data: { first_name: string; username: string }) =>
    request<CurrentUser>("/auth/me", { method: "PATCH", body: JSON.stringify(data) }),

  fixtures: () => request<Match[]>("/fixtures/"),

  predict: (match_id: number, home_score: number, away_score: number) =>
    request("/predictions/", {
      method: "POST",
      body: JSON.stringify({ match_id, home_score, away_score }),
    }),

  standings: () => request<Standing[]>("/standings/"),

  changePassword: (current_password: string, new_password: string) =>
    request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    }),

  admin: {
    // usuarios
    users: () => request<AdminUser[]>("/admin/users"),
    createUser: (data: { username: string; password: string; display_name: string; is_admin: boolean }) =>
      request("/admin/users", { method: "POST", body: JSON.stringify(data) }),
    updateUser: (id: number, data: { display_name?: string; password?: string; is_admin?: boolean }) =>
      request(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deleteUser: (id: number) =>
      request(`/admin/users/${id}`, { method: "DELETE" }),
    resetPassword: (id: number, password: string) =>
      request(`/admin/users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ password }) }),

    // partidos
    matches: () => request<AdminMatch[]>("/admin/matches"),
    setScore: (id: number, home_score: number, away_score: number, status: string) =>
      request(`/admin/matches/${id}/score`, { method: "PATCH", body: JSON.stringify({ home_score, away_score, status }) }),
    deleteMatch: (id: number) =>
      request(`/admin/matches/${id}`, { method: "DELETE" }),

    // predicciones
    predictions: (match_id?: number) =>
      request<AdminPrediction[]>(`/admin/predictions${match_id ? `?match_id=${match_id}` : ""}`),

    // sync
    sync: () => request("/admin/sync", { method: "POST" }),
    recalculate: () => request("/admin/recalculate", { method: "POST" }),
    resetFinishedPredictions: () =>
      request<{ ok: boolean; deleted: number; message: string }>("/admin/reset-finished-predictions", {
        method: "POST",
        body: JSON.stringify({ confirm: "REINICIAR" }),
      }),
    resetPredictions: () =>
      request<{ ok: boolean; deleted: number; message: string }>("/admin/reset-predictions", {
        method: "POST",
        body: JSON.stringify({ confirm: "REINICIAR" }),
      }),
    resetPoints: () =>
      request<{ ok: boolean; updated: number; message: string }>("/admin/reset-points", {
        method: "POST",
        body: JSON.stringify({ confirm: "REINICIAR" }),
      }),

    // settings
    getSettings: () => request<Record<string, string>>("/admin/settings"),
    setSetting: (key: string, value: string) =>
      request(`/admin/settings/${key}`, { method: "PATCH", body: JSON.stringify({ value }) }),
  },

  publicSettings: () =>
    request<Settings>("/public/settings"),
};

export interface CurrentUser {
  id: number;
  username: string;
  display_name: string;
  is_admin: boolean;
  first_name: string;
  last_name: string;
}

export interface Settings {
  signup_enabled: boolean;
  countdown_enabled: boolean;
  streak_enabled: boolean;
  podium_enabled: boolean;
}

export interface Match {
  id: number;
  external_id: number;
  stage: string;
  matchday: number | null;
  group_name: string | null;
  home_team: string;
  away_team: string;
  home_team_flag: string | null;
  away_team_flag: string | null;
  kick_off: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  pred_home: number | null;
  pred_away: number | null;
  points: number | null;
}

export interface AdminUser {
  id: number;
  username: string;
  display_name: string;
  is_admin: number;
  password_set: number;
}

export interface AdminMatch {
  id: number;
  external_id: number | null;
  stage: string;
  matchday: number | null;
  home_team: string;
  away_team: string;
  home_team_flag: string | null;
  away_team_flag: string | null;
  kick_off: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

export interface AdminPrediction {
  id: number;
  display_name: string;
  username: string;
  home_team: string;
  away_team: string;
  kick_off: string;
  status: string;
  real_home: number | null;
  real_away: number | null;
  pred_home: number;
  pred_away: number;
  points: number | null;
}

export interface Standing {
  id: number;
  display_name: string;
  predictions_made: number;
  total_points: number;
  exact_both: number;
  result_one_exact: number;
  result_only: number;
  one_exact: number;
  streak: number;
}
