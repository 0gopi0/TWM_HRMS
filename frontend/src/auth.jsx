import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setAccessToken } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [ready, setReady] = useState(false);

  async function loadMe() {
    const me = await api("/api/v1/me");
    setUser({ ...me.user, employee: me.employee });
    setPermissions(me.permissions || []);
  }

  useEffect(() => {
    (async () => {
      try {
        const data = await api("/api/v1/auth/refresh", { method: "POST" });
        setAccessToken(data.accessToken);
        await loadMe();
      } catch {
        setUser(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const value = useMemo(
    () => ({
      user,
      permissions,
      ready,
      can: (code) => permissions.includes(code),
      async login(email, password) {
        const data = await api("/api/v1/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setAccessToken(data.accessToken);
        await loadMe();
      },
      async logout() {
        await api("/api/v1/auth/logout", { method: "POST" });
        setAccessToken(null);
        setUser(null);
        setPermissions([]);
      },
    }),
    [user, permissions, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
