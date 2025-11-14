
import React, { createContext, useContext, useEffect, useState } from "react";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
  // seed demo user once if not present
  if (!localStorage.getItem("demo_user")) {
    localStorage.setItem(
      "demo_user",
      JSON.stringify({ username: "ishikagupta", email: "ishikagupta@example.com" })
    );
  }

  const u = localStorage.getItem("demo_user");
  if (u) setUser(JSON.parse(u));
  setBooting(false);
}, []);

  const login = async (username /*, password */) => {
    const u = JSON.parse(localStorage.getItem("demo_user") || "null");
    if (!u || u.username !== username) throw new Error("Invalid credentials");
    setUser(u);
  };

  const register = async ({ username, email }) => {
    localStorage.setItem("demo_user", JSON.stringify({ username, email }));
  };

  const logout = async () => setUser(null);

  return (
    <Ctx.Provider value={{ user, booting, login, logout, register }}>
      {children}
    </Ctx.Provider>
  );
}