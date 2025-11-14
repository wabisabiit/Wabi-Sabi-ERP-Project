// src/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { apiLogin, apiLogout, apiMe } from "../api/client";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  // On app load, ask backend "who am I?"
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const me = await apiMe();    // GET /api/auth/me/
        if (!cancelled) setUser(me);
      } catch (e) {
        // 401 = not logged in -> ignore
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (username, password) => {
    const u = await apiLogin({ username, password }); // POST /api/auth/login/
    setUser(u);
    return u;
  };

  const logout = async () => {
    try {
      await apiLogout(); // POST /api/auth/logout/
    } catch {
      // even if backend fails, clear frontend state
    }
    setUser(null);
  };

  // register is optional now (you create employees from backend form)
  const register = async () => {
    throw new Error("Registration is managed from the Employee screen.");
  };

  return (
    <Ctx.Provider value={{ user, booting, login, logout, register }}>
      {children}
    </Ctx.Provider>
  );
}
