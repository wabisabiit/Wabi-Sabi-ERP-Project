// src/auth/RoleRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

function normalizeRole(user) {
  if (!user) return null;
  if (user.is_superuser || user.role === "ADMIN") return "ADMIN";
  if (user.role === "MANAGER") return "MANAGER";
  return "STAFF";
}

export default function RoleRoute({ allowed = [], children }) {
  const { user, booting } = useAuth();

  if (booting) return null; // show nothing while checking session

  if (!user) return <Navigate to="/login" replace />;

  const role = normalizeRole(user);

  if (!allowed.includes(role)) {
    // Manager: push back to POS
    if (role === "MANAGER") return <Navigate to="/new" replace />;
    // Staff/others
    return <Navigate to="/login" replace />;
  }

  return children;
}
