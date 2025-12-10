// src/test-utils.jsx
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import { AuthProvider } from "./auth/AuthContext";

// Wrap UI with Router + AuthProvider so components work in tests
export function renderWithProviders(ui) {
  return render(
    <BrowserRouter>
      <AuthProvider>{ui}</AuthProvider>
    </BrowserRouter>
  );
}
