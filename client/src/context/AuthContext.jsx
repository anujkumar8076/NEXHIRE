import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("nx_token");
    if (!token) { setLoading(false); return; }
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    api.get("/auth/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => { localStorage.removeItem("nx_token"); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("nx_token", data.token);
    api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (form) => {
    const { data } = await api.post("/auth/register", form);
    localStorage.setItem("nx_token", data.token);
    api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("nx_token");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => setUser((p) => ({ ...p, ...patch })), []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
};
