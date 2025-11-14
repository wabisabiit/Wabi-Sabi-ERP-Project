
// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "../styles/auth.css";

// ✅ Import the image from src/assets
import heroImg from "../assets/image.png"; // adjust relative path if this file moves

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErr("");
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate("/dashboard");
    } catch (e) {
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    // Pass the imported image into the CSS var as a url()
    <div className="fx-auth-wrap" style={{ ["--hero-img"]: `url(${heroImg})` }}>
      {/* LEFT: Shopping girl photo */}
      <aside className="fx-hero" aria-hidden="true">
        <div className="fx-hero-overlay" />
      </aside>

      {/* RIGHT: Form card (functionality unchanged) */}
      <main className="fx-card" role="dialog" aria-labelledby="fx-title">
        <button className="fx-close" aria-label="Close">×</button>

        <div className="fx-head">
          <h1 id="fx-title" className="fx-title">
            <span className="fx-title-kicker">WELCOME</span><br />
            WABI SABI SUSTANABILITY LLP.
          </h1>
        </div>

        {err && <div className="fx-alert" role="alert">{err}</div>}

        <form className="fx-form" onSubmit={submit} noValidate>
          <label className="fx-field">
            <span>Email</span>
            <input
              className="fx-input"
              type="text"
              name="username"
              autoComplete="username"
              placeholder="you@company.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>

          <label className="fx-field">
            <span>Enter Password</span>
            <div className="fx-passwrap">
              <input
                className="fx-input"
                type={show ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="fx-ghost"
                onClick={() => setShow((s) => !s)}
                aria-pressed={show}
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <button type="submit" className="fx-btn" disabled={loading}>
            <span>{loading ? "Signing in..." : "Continue"}</span>
            <span className="arrow">→</span>
          </button>
        </form>

        <div className="fx-or"><span>OR</span></div>

        <div className="fx-socials" aria-label="Social sign in (UI only)">
          <button className="fx-social g" type="button" aria-label="Sign in with Google">G</button>
          <button className="fx-social f" type="button" aria-label="Sign in with Facebook">f</button>
          <button className="fx-social a" type="button" aria-label="Sign in with Apple"></button>
        </div>
      </main>
    </div>
  );
}