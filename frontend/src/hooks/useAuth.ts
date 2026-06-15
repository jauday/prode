import { useState, useEffect } from "react";
import { api } from "../api";

interface User { id: number; username: string; display_name: string; is_admin: boolean }

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    api.me()
      .then(setUser)
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const data = await api.login(username, password);
    localStorage.setItem("token", data.access_token);
    setUser(data.user);
  };

  const setup = async (username: string, password: string) => {
    const data = await api.setupPassword(username, password);
    localStorage.setItem("token", data.access_token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return { user, loading, login, setup, logout };
}
