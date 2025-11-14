
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, booting } = useAuth();
  if (booting) return null;       // loader optional
  if (!user) return <Navigate to="/login" replace />;
  return children;
}